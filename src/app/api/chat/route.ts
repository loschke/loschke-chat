import { streamText, convertToModelMessages, gateway, generateText, stepCountIs } from "ai"
import type { ModelMessage } from "ai"
import { anthropic } from "@ai-sdk/anthropic"

import { requireAuth } from "@/lib/api-guards"
import { features } from "@/config/features"
import { aiDefaults } from "@/config/ai"
import { chatConfig } from "@/config/chat"
import { SYSTEM_PROMPTS, buildSystemPrompt } from "@/config/prompts"
import { MAX_MESSAGE_LENGTH, MAX_BODY_SIZE } from "@/lib/constants"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { parseBody } from "@/lib/schemas"
import { createChat, getChatById, updateChatTitle, touchChat } from "@/lib/db/queries/chats"
import { saveMessages } from "@/lib/db/queries/messages"
import { logUsage } from "@/lib/db/queries/usage"
import { getUserPreferences } from "@/lib/db/queries/users"
import { getExpertById } from "@/lib/db/queries/experts"
import { getModelById } from "@/config/models"
import { createArtifactTool } from "@/lib/ai/tools/create-artifact"
import { createArtifact } from "@/lib/db/queries/artifacts"
import { parseFakeArtifactCall } from "@/lib/ai/tools/parse-fake-artifact"
import { createLoadSkillTool } from "@/lib/ai/tools/load-skill"
import { askUserTool } from "@/lib/ai/tools/ask-user"
import { discoverSkills, getSkillContent } from "@/lib/ai/skills/discovery"
import { renderTemplate } from "@/lib/ai/skills/template"
import { chatBodySchema, type MessagePart } from "./schema"

/**
 * Convert data-URL strings in file parts to Uint8Array so the AI Gateway's
 * `maybeEncodeFileParts` can re-encode them as proper data-URLs.
 */
function fixFilePartsForGateway(messages: ModelMessage[]): ModelMessage[] {
  for (const msg of messages) {
    if (!Array.isArray(msg.content)) continue
    for (let i = 0; i < msg.content.length; i++) {
      const part = msg.content[i]
      if (
        part.type === "file" &&
        typeof part.data === "string" &&
        part.data.startsWith("data:")
      ) {
        const commaIdx = part.data.indexOf(",")
        if (commaIdx !== -1) {
          const base64 = part.data.slice(commaIdx + 1)
          msg.content[i] = { ...part, data: Buffer.from(base64, "base64") }
        }
      }
    }
  }
  return messages
}

/**
 * Add Anthropic cache control to system message for prompt caching.
 * Only applies to Anthropic models (detected by model ID prefix).
 */
function addSystemCacheControl(messages: ModelMessage[], modelId: string): ModelMessage[] {
  if (!modelId.startsWith("anthropic/")) return messages

  return messages.map((msg, index) => {
    if (index === 0 && msg.role === "system") {
      return {
        ...msg,
        providerOptions: {
          ...msg.providerOptions,
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      }
    }
    return msg
  })
}

export const maxDuration = 120

const ALLOWED_MIME_TYPES = new Set(
  chatConfig.upload.accept.split(",").map((t) => t.trim())
)

export async function POST(req: Request) {
  if (!features.chat.enabled) {
    return new Response("Chat is disabled", { status: 404 })
  }

  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.chat)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const contentLength = req.headers.get("content-length")
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return new Response("Request too large", { status: 413 })
  }

  let rawBody: string
  try {
    rawBody = await req.text()
  } catch {
    return new Response("Invalid request body", { status: 400 })
  }

  if (rawBody.length > MAX_BODY_SIZE) {
    return new Response("Request too large", { status: 413 })
  }

  let raw: unknown
  try {
    raw = JSON.parse(rawBody)
  } catch {
    return new Response("Invalid JSON", { status: 400 })
  }

  const parsed = parseBody(chatBodySchema, raw)
  if (!parsed.success) return parsed.response

  const { messages, chatId: requestChatId, modelId: requestModelId, expertId: requestExpertId, quicktaskSlug, quicktaskData } = parsed.data

  // Validate last user message
  const lastMessage = messages[messages.length - 1]
  if (lastMessage?.role === "user") {
    const textParts =
      lastMessage.parts
        ?.filter((part: MessagePart) => part.type === "text")
        .map((part: MessagePart) => part.text || "")
        .join("") ?? ""
    if (textParts.length > MAX_MESSAGE_LENGTH) {
      return new Response("Message too long", { status: 400 })
    }

    const fileParts = lastMessage.parts?.filter(
      (part: MessagePart) => part.type === "file"
    )
    if (fileParts) {
      for (const filePart of fileParts) {
        if (filePart.mediaType && !ALLOWED_MIME_TYPES.has(filePart.mediaType)) {
          return new Response("File type not allowed", { status: 400 })
        }
      }
    }
  }

  const modelId = requestModelId ?? aiDefaults.model

  // Validate model ID against registry
  if (!getModelById(modelId)) {
    return Response.json({ error: "Invalid model" }, { status: 400 })
  }

  // Resolve or create chat
  let isNewChat = false
  let resolvedChatId: string

  // Resolve expert: from request (new chat) or from existing chat
  let expert: Awaited<ReturnType<typeof getExpertById>> | null = null

  if (requestChatId) {
    const existingChat = await getChatById(requestChatId)
    if (!existingChat || existingChat.userId !== user.id) {
      return new Response("Chat not found", { status: 404 })
    }
    resolvedChatId = requestChatId

    // Load expert from existing chat if not provided in request
    if (requestExpertId) {
      expert = await getExpertById(requestExpertId)
    } else if (existingChat.expertId) {
      expert = await getExpertById(existingChat.expertId)
    }
  } else {
    // Validate expertId if provided
    if (requestExpertId) {
      expert = await getExpertById(requestExpertId)
      if (!expert) {
        return Response.json({ error: "Expert not found" }, { status: 400 })
      }
    }

    const newChat = await createChat(user.id, {
      modelId,
      expertId: expert?.id,
    })
    resolvedChatId = newChat.id
    isNewChat = true
  }

  // Load user preferences and discover skills (exclude quicktasks from skill listing)
  const userPrefs = await getUserPreferences(user.id)
  const customInstructions = userPrefs.customInstructions
  const allSkills = discoverSkills()
  const skills = allSkills.filter((s) => s.mode === "skill")

  // Resolve quicktask if provided
  let quicktaskPrompt: string | null = null
  let quicktaskMeta: { modelId?: string; temperature?: number } | null = null

  if (quicktaskSlug) {
    const quicktask = allSkills.find((s) => s.slug === quicktaskSlug && s.mode === "quicktask")
    if (quicktask) {
      const content = getSkillContent(quicktaskSlug)
      if (content) {
        quicktaskPrompt = renderTemplate(content, quicktaskData ?? {})
        if (quicktask.outputAsArtifact) {
          quicktaskPrompt += "\n\nWICHTIG: Erstelle das Ergebnis als Artifact mit dem `create_artifact` Tool."
        }
        quicktaskMeta = {
          modelId: quicktask.modelId,
          temperature: quicktask.temperature,
        }
      }
    }
  }

  // Build system prompt with expert persona, quicktask, and skills
  const systemPrompt = buildSystemPrompt({
    expert: expert ? {
      systemPrompt: expert.systemPrompt,
      skillSlugs: expert.skillSlugs as string[],
    } : undefined,
    skills: quicktaskPrompt ? undefined : skills,
    quicktask: quicktaskPrompt,
    customInstructions,
  })

  // Model resolution chain: quicktask > expert > user default > system default
  const resolvedModelId = quicktaskMeta?.modelId
    ?? expert?.modelPreference
    ?? userPrefs.defaultModelId
    ?? modelId

  // Temperature resolution: quicktask > expert > system default
  const effectiveTemperature = quicktaskMeta?.temperature
    ?? (expert?.temperature as number | null)
    ?? aiDefaults.temperature

  // Validate resolved model, fall through chain on invalid
  let finalModelId = modelId
  if (getModelById(resolvedModelId)) {
    finalModelId = resolvedModelId
  } else if (expert?.modelPreference && getModelById(expert.modelPreference)) {
    finalModelId = expert.modelPreference
  } else if (userPrefs.defaultModelId && getModelById(userPrefs.defaultModelId)) {
    finalModelId = userPrefs.defaultModelId
  }

  // Filter out non-standard parts (source-url etc.) before conversion.
  // Keep text, image, file, tool-invocation, step-start, and typed tool parts (tool-*).
  // - Typed tool parts (e.g. "tool-create_artifact") preserve tool call/result history
  // - step-start parts are CRITICAL: convertToModelMessages uses them to split multi-step
  //   responses into separate model messages, ensuring correct tool_use → tool_result pairing
  const ALLOWED_PART_TYPES = new Set(["text", "image", "file", "tool-invocation", "step-start"])
  const cleanedMessages = (messages as import("ai").UIMessage[]).map((msg) => ({
    ...msg,
    parts: msg.parts?.filter((part) =>
      ALLOWED_PART_TYPES.has(part.type) || part.type.startsWith("tool-")
    ),
  }))

  let modelMessages = fixFilePartsForGateway(
    await convertToModelMessages(cleanedMessages)
  )

  // Add system message with cache control for Anthropic
  modelMessages = [
    {
      role: "system" as const,
      content: systemPrompt,
    },
    ...modelMessages,
  ]
  modelMessages = addSystemCacheControl(modelMessages, finalModelId)

  // Tools
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: Record<string, any> = {
    web_search: anthropic.tools.webSearch_20250305({ maxUses: 5 }),
    web_fetch: anthropic.tools.webFetch_20250910({ maxUses: 3 }),
    create_artifact: createArtifactTool(resolvedChatId),
    ask_user: askUserTool,
  }

  // Add load_skill tool if skills are available (skip for quicktasks — self-contained)
  if (skills.length > 0 && !quicktaskPrompt) {
    tools.load_skill = createLoadSkillTool(skills)
  }

  const result = streamText({
    model: gateway(finalModelId),
    messages: modelMessages,
    maxOutputTokens: chatConfig.maxTokens,
    stopWhen: stepCountIs(5),
    temperature: effectiveTemperature,
    tools,
    onFinish: async ({ response, totalUsage, steps }) => {
      try {
        // Save user message (last one)
        const userMsg = messages[messages.length - 1]
        if (userMsg?.role === "user") {
          await saveMessages([
            {
              chatId: resolvedChatId,
              role: "user",
              parts: userMsg.parts ?? [{ type: "text", text: typeof userMsg.content === "string" ? userMsg.content : "" }],
            },
          ])
        }

        // Save assistant response with step boundaries preserved.
        // response.messages contains the full multi-step conversation:
        //   [assistant(text+tool-call), tool(tool-result), assistant(continuation)]
        // We save ALL roles in order with step-start markers between steps so that
        // mapSavedPartsToUI → convertToModelMessages can reconstruct proper
        // tool_use → tool_result pairing on chat reload.
        const assistantParts: Array<Record<string, unknown>> = []
        let prevRole: string | null = null

        for (const m of response.messages) {
          if (!Array.isArray(m.content)) continue

          // Insert step-start marker when transitioning from tool→assistant
          // (marks the boundary between multi-step tool interactions)
          if (m.role === "assistant" && prevRole === "tool") {
            assistantParts.push({ type: "step-start" })
          }
          prevRole = m.role

          if (m.role === "assistant") {
            for (const c of m.content) {
              if (c.type === "text") {
                assistantParts.push({ type: "text", text: c.text })
              } else if (c.type === "tool-call") {
                assistantParts.push({
                  type: "tool-call",
                  toolCallId: c.toolCallId,
                  toolName: c.toolName,
                  args: c.input,
                })
              } else if (c.type === "tool-result") {
                // Provider-executed tool results (e.g. web_search) embedded in assistant
                const tr = c as { type: string; toolCallId: string; toolName: string; output: unknown }
                assistantParts.push({
                  type: "tool-result",
                  toolCallId: tr.toolCallId,
                  toolName: tr.toolName,
                  result: tr.output,
                })
              }
            }
          } else if (m.role === "tool") {
            // Tool results from user-defined tools (create_artifact, load_skill)
            for (const c of m.content) {
              if (c.type === "tool-result") {
                const tr = c as { type: string; toolCallId: string; toolName: string; output: unknown }
                assistantParts.push({
                  type: "tool-result",
                  toolCallId: tr.toolCallId,
                  toolName: tr.toolName,
                  result: tr.output,
                })
              }
            }
          }
        }

        // Detect fake artifact tool calls in text (models that can't do tool calling)
        const fullText = assistantParts
          .filter((p) => p.type === "text")
          .map((p) => p.text as string)
          .join("")
        const fakeArtifact = parseFakeArtifactCall(fullText)
        if (fakeArtifact) {
          try {
            // Create artifact in DB
            const artifact = await createArtifact({
              chatId: resolvedChatId,
              type: fakeArtifact.type,
              title: fakeArtifact.title,
              content: fakeArtifact.content,
              language: fakeArtifact.language,
            })

            // Replace text parts: remove JSON, keep surrounding text
            const cleanText = [fakeArtifact.textBefore, fakeArtifact.textAfter].filter(Boolean).join("\n\n")
            // Remove all text parts and replace with clean text + tool-call + tool-result
            const nonTextParts = assistantParts.filter((p) => p.type !== "text")
            assistantParts.length = 0
            if (cleanText) {
              assistantParts.push({ type: "text", text: cleanText })
            }
            const fakeToolCallId = `fake-${artifact.id}`
            assistantParts.push({
              type: "tool-call",
              toolCallId: fakeToolCallId,
              toolName: "create_artifact",
              args: {
                type: fakeArtifact.type,
                title: fakeArtifact.title,
                content: fakeArtifact.content,
                language: fakeArtifact.language,
              },
            })
            assistantParts.push({
              type: "tool-result",
              toolCallId: fakeToolCallId,
              toolName: "create_artifact",
              result: {
                artifactId: artifact.id,
                title: artifact.title,
                type: artifact.type,
                version: artifact.version,
              },
            })
            assistantParts.push(...nonTextParts)
          } catch (err) {
            console.error("Failed to create artifact from fake tool call:", err instanceof Error ? err.message : "Unknown")
            // Continue with original text parts — message still gets saved
          }
        }

        if (assistantParts.length > 0) {
          const savedMessages = await saveMessages([
            {
              chatId: resolvedChatId,
              role: "assistant",
              parts: assistantParts,
              metadata: {
                modelId: finalModelId,
                modelName: getModelById(finalModelId)?.name ?? finalModelId.split("/").pop(),
                finishReason: response.messages[response.messages.length - 1] ? "stop" : undefined,
                ...(expert && { expertId: expert.id, expertName: expert.name }),
                ...(totalUsage && {
                  inputTokens: totalUsage.inputTokens ?? 0,
                  outputTokens: totalUsage.outputTokens ?? 0,
                  totalTokens: totalUsage.totalTokens ?? (totalUsage.inputTokens ?? 0) + (totalUsage.outputTokens ?? 0),
                }),
              },
            },
          ])

          // Log complete token usage from totalUsage (sum across all steps)
          if (totalUsage) {
            await logUsage({
              userId: user.id,
              chatId: resolvedChatId,
              messageId: savedMessages[0]?.id,
              modelId: finalModelId,
              inputTokens: totalUsage.inputTokens ?? 0,
              outputTokens: totalUsage.outputTokens ?? 0,
              totalTokens: totalUsage.totalTokens ?? (totalUsage.inputTokens ?? 0) + (totalUsage.outputTokens ?? 0),
              reasoningTokens: totalUsage.reasoningTokens ?? undefined,
              cachedInputTokens: totalUsage.cachedInputTokens ?? undefined,
              // AI SDK LanguageModelUsage doesn't expose inputTokenDetails yet — cast to access cache metrics
              cacheReadTokens: (totalUsage as Record<string, unknown> & { inputTokenDetails?: { cacheReadTokens?: number } }).inputTokenDetails?.cacheReadTokens ?? undefined,
              cacheWriteTokens: (totalUsage as Record<string, unknown> & { inputTokenDetails?: { cacheWriteTokens?: number } }).inputTokenDetails?.cacheWriteTokens ?? undefined,
              stepCount: steps?.length ?? 1,
            })
          }
        }

        // Auto-generate title for new chats
        if (isNewChat && userMsg?.role === "user") {
          const userText = userMsg.parts
            ?.filter((p: { type: string }) => p.type === "text")
            .map((p: { text?: string }) => p.text || "")
            .join("") ?? ""

          if (userText.length > 0) {
            try {
              const titleResult = await generateText({
                model: gateway(aiDefaults.model),
                system: SYSTEM_PROMPTS.titleGeneration,
                prompt: userText.slice(0, 500),
                maxOutputTokens: 30,
                temperature: 0.3,
              })
              const title = titleResult.text
                .trim()
                .replace(/^[#*_>"'\s]+/, "")
                .replace(/["']+$/, "")
                .trim()
                .slice(0, 80)
              if (title) {
                await updateChatTitle(resolvedChatId, user.id, title)
              }
            } catch {
              // Title generation is non-critical
            }
          }
        }

        // Touch chat to update timestamp
        await touchChat(resolvedChatId, user.id)
      } catch (error) {
        console.error("Failed to persist chat data:", error instanceof Error ? error.message : "Unknown error")
      }
    },
  })

  return result.toUIMessageStreamResponse({
    sendSources: true,
    messageMetadata: ({ part }) => {
      if (part.type === "start") {
        return {
          chatId: resolvedChatId,
          modelId: finalModelId,
          modelName: getModelById(finalModelId)?.name ?? finalModelId.split("/").pop(),
          ...(expert && { expertId: expert.id, expertName: expert.name }),
        }
      }
    },
  })
}
