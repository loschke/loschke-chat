import { streamText, convertToModelMessages, gateway, generateText } from "ai"
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
import { getCustomInstructions } from "@/lib/db/queries/users"
import { getModelById } from "@/config/models"
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

  const { messages, chatId: requestChatId, modelId: requestModelId } = parsed.data

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
  let chatId = requestChatId
  let isNewChat = false

  if (chatId) {
    const existingChat = await getChatById(chatId)
    if (!existingChat || existingChat.userId !== user.id) {
      return new Response("Chat not found", { status: 404 })
    }
  } else {
    const newChat = await createChat(user.id, { modelId })
    chatId = newChat.id
    isNewChat = true
  }

  // Load user custom instructions and build system prompt
  const customInstructions = await getCustomInstructions(user.id)
  const systemPrompt = buildSystemPrompt({ customInstructions })

  let modelMessages = fixFilePartsForGateway(
    await convertToModelMessages(messages as import("ai").UIMessage[])
  )

  // Add system message with cache control for Anthropic
  modelMessages = [
    {
      role: "system" as const,
      content: systemPrompt,
    },
    ...modelMessages,
  ]
  modelMessages = addSystemCacheControl(modelMessages, modelId)

  // Web tools
  const tools = {
    web_search: anthropic.tools.webSearch_20250305({ maxUses: 5 }),
    web_fetch: anthropic.tools.webFetch_20250910({ maxUses: 3 }),
  }

  const result = streamText({
    model: gateway(modelId),
    messages: modelMessages,
    maxOutputTokens: chatConfig.maxTokens,
    temperature: aiDefaults.temperature,
    tools,
    onFinish: async ({ response, totalUsage, steps }) => {
      try {
        // Save user message (last one)
        const userMsg = messages[messages.length - 1]
        if (userMsg?.role === "user") {
          await saveMessages([
            {
              chatId: chatId!,
              role: "user",
              parts: userMsg.parts ?? [{ type: "text", text: typeof userMsg.content === "string" ? userMsg.content : "" }],
            },
          ])
        }

        // Save assistant response
        const assistantParts = response.messages
          .filter((m) => m.role === "assistant")
          .flatMap((m) =>
            Array.isArray(m.content)
              ? m.content
                  .filter((c) => c.type === "text")
                  .map((c) => ({ type: "text" as const, text: c.text }))
              : []
          )

        if (assistantParts.length > 0) {
          const savedMessages = await saveMessages([
            {
              chatId: chatId!,
              role: "assistant",
              parts: assistantParts,
              metadata: { modelId, finishReason: response.messages[response.messages.length - 1] ? "stop" : undefined },
            },
          ])

          // Log complete token usage from totalUsage (sum across all steps)
          if (totalUsage) {
            await logUsage({
              userId: user.id,
              chatId: chatId!,
              messageId: savedMessages[0]?.id,
              modelId,
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
                await updateChatTitle(chatId!, title)
              }
            } catch {
              // Title generation is non-critical
            }
          }
        }

        // Touch chat to update timestamp
        await touchChat(chatId!)
      } catch (error) {
        console.error("Failed to persist chat data:", error)
      }
    },
  })

  return result.toUIMessageStreamResponse({
    sendSources: true,
    messageMetadata: ({ part }) => {
      // Send chatId on message start so client can navigate for new chats
      if (part.type === "start") {
        return { chatId }
      }
    },
  })
}
