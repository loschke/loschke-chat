import { streamText, stepCountIs, type JSONValue } from "ai"
import type { UIMessage } from "ai"

import { requireAuth } from "@/lib/api-guards"
import { features } from "@/config/features"
import { chatConfig } from "@/config/chat"
import { MAX_MESSAGE_LENGTH, MAX_BODY_SIZE } from "@/lib/constants"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { parseBody } from "@/lib/schemas"
import { getModelById, getModelCapabilities } from "@/config/models"

import { chatBodySchema, type MessagePart } from "./schema"
import { resolveContext } from "./resolve-context"
import { buildModelMessages } from "./build-messages"
import { buildTools } from "./build-tools"
import { createOnFinish } from "./persist"
import { createAnthropic, forwardAnthropicContainerIdFromLastStep } from "@ai-sdk/anthropic"
import { buildSkillsConfig, isAnthropicModel } from "@/lib/ai/anthropic-skills"
import { resolvePrivacyModel } from "@/lib/ai/privacy-provider"
import { resolveModel } from "@/lib/ai/model-resolver"
import { businessModeConfig } from "@/config/business-mode"
import { logConsent } from "@/lib/db/queries/consent"

export const maxDuration = 800

const ALLOWED_MIME_TYPES = new Set(
  chatConfig.upload.accept.split(",").map((t) => t.trim())
)

export async function POST(req: Request) {
  if (!features.chat.enabled) {
    return Response.json({ error: "Chat ist deaktiviert" }, { status: 404 })
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
    return Response.json({ error: "Anfrage zu groß" }, { status: 413 })
  }

  let rawBody: string
  try {
    rawBody = await req.text()
  } catch {
    return Response.json({ error: "Ungültige Anfrage" }, { status: 400 })
  }

  if (rawBody.length > MAX_BODY_SIZE) {
    return Response.json({ error: "Anfrage zu groß" }, { status: 413 })
  }

  let raw: unknown
  try {
    raw = JSON.parse(rawBody)
  } catch {
    return Response.json({ error: "Ungültiges JSON" }, { status: 400 })
  }

  const parsed = parseBody(chatBodySchema, raw)
  if (!parsed.success) return parsed.response

  const { messages, chatId: requestChatId, modelId: requestModelId, expertId: requestExpertId, quicktaskSlug, quicktaskData, projectId: requestProjectId, privacyRoute: requestPrivacyRoute, wrapupType, wrapupContext, wrapupFormat } = parsed.data

  // Pre-flight credit balance check
  if (features.credits.enabled) {
    const { getCreditBalance } = await import("@/lib/db/queries/credits")
    const balance = await getCreditBalance(user.id)
    if (balance <= 0) {
      return Response.json(
        { error: "Dein Credit-Guthaben ist aufgebraucht. Bitte wende dich an den Administrator." },
        { status: 402 }
      )
    }
  }

  // Validate last user message length
  const lastMessage = messages[messages.length - 1]
  if (lastMessage?.role === "user") {
    const textParts =
      lastMessage.parts
        ?.filter((part: MessagePart) => part.type === "text")
        .map((part: MessagePart) => part.text || "")
        .join("") ?? ""
    if (textParts.length > MAX_MESSAGE_LENGTH) {
      return Response.json({ error: "Nachricht zu lang" }, { status: 400 })
    }
  }

  // Validate file MIME types across ALL messages (not just the last one)
  // Client sends full history — malicious clients could inject bad file parts in earlier messages
  for (const msg of messages) {
    const fileParts = msg.parts?.filter(
      (part: MessagePart) => part.type === "file"
    )
    if (fileParts) {
      for (const filePart of fileParts) {
        if (filePart.mediaType && !ALLOWED_MIME_TYPES.has(filePart.mediaType.toLowerCase())) {
          return Response.json({ error: "Dateityp nicht erlaubt" }, { status: 400 })
        }
      }
    }
  }

  // Privacy routing decision: needed early so the SafeChat image guard can run
  // BEFORE buildModelMessages (avoids unnecessary R2 reads on rejected requests).
  const effectivePrivacyRoute = (requestPrivacyRoute && features.businessMode.enabled)
    ? requestPrivacyRoute
    : undefined

  // SafeChat server-side guard: images cannot be processed safely in privacy mode.
  // Privacy models may or may not support vision; we conservatively block all images here.
  // Documents pass through and are extracted to text by build-messages.
  if (effectivePrivacyRoute) {
    const hasImage = messages.some((msg) =>
      msg.parts?.some(
        (part: MessagePart) =>
          part.type === "file" &&
          typeof part.mediaType === "string" &&
          part.mediaType.toLowerCase().startsWith("image/")
      )
    )
    if (hasImage) {
      return Response.json(
        { error: "Bilder können im sicheren Modus nicht verarbeitet werden. Entferne das Bild oder wechsle den Modus." },
        { status: 400 }
      )
    }
  }

  // Strip server-only fields from the LAST user message to prevent content injection.
  // `extracted`/`extractedText` are set by persist.ts — the current (last) message is from the
  // client and must not carry these fields. History messages from DB may legitimately have them.
  const lastMsg = messages[messages.length - 1]
  if (lastMsg?.parts) {
    for (const part of lastMsg.parts) {
      const p = part as Record<string, unknown>
      delete p.extracted
      delete p.extractedText
    }
  }

  // Resolve chat context (chat, expert, model, skills, system prompt)
  const context = await resolveContext({
    userId: user.id,
    requestChatId,
    requestExpertId,
    requestModelId,
    requestProjectId,
    quicktaskSlug,
    quicktaskData,
    wrapupType,
    wrapupContext,
    wrapupFormat,
    messages,
  })

  // resolveContext returns Response on validation failure
  if (context instanceof Response) return context

  const { resolvedChatId, isNewChat, expert, existingExpertId, systemPrompt, finalModelId, effectiveTemperature, skills, quicktaskPrompt, projectId, projectName, mcpServerIds, allowedTools, memoriesLoaded, memories, userMemoryEnabled, userSuggestedRepliesEnabled } = context

  // Build model messages
  const modelMessages = await buildModelMessages(
    messages as UIMessage[],
    systemPrompt,
    finalModelId,
  )

  // Privacy routing: resolve provider model (effectivePrivacyRoute already determined above)
  const privacyModel = effectivePrivacyRoute
    ? resolvePrivacyModel(effectivePrivacyRoute)
    : null

  if (effectivePrivacyRoute && !privacyModel) {
    return Response.json(
      { error: "Privacy-Modell nicht verfügbar. Bitte Konfiguration prüfen." },
      { status: 400 }
    )
  }

  // Log privacy-route usage for audit trail (fire-and-forget)
  if (effectivePrivacyRoute) {
    logConsent({
      userId: user.id,
      chatId: resolvedChatId,
      consentType: "privacy_route",
      decision: effectivePrivacyRoute === "eu" ? "rerouted_eu"
        : effectivePrivacyRoute === "de" ? "rerouted_de"
        : "rerouted_local",
      routedModel: (effectivePrivacyRoute === "eu" ? businessModeConfig.euModelId
        : effectivePrivacyRoute === "de" ? businessModeConfig.deModelId
        : businessModeConfig.localModelId) ?? undefined,
    }).catch((err) => {
      console.error("[consent] Privacy-route audit log failed:", err)
    })
  }

  const usePrivacyModel = !!privacyModel

  // Extract uploaded images only when image generation is active (avoids O(n) base64 encoding per request)
  const imageGenEnabled = features.imageGeneration.enabled && !effectivePrivacyRoute
  const uploadedImages = imageGenEnabled ? extractUploadedImages(messages as Array<{ role: string; parts?: MessagePart[] }>) : undefined

  // Build tools (async — may connect MCP servers)
  const { tools, mcpHandle } = await buildTools({
    chatId: resolvedChatId,
    userId: user.id,
    skills,
    hasQuicktask: !!quicktaskPrompt,
    modelId: effectivePrivacyRoute ? "" : finalModelId,
    memoryEnabled: userMemoryEnabled,
    mcpEnabled: features.mcp.enabled,
    expertMcpServerIds: mcpServerIds,
    expertAllowedTools: allowedTools,
    imageGenerationEnabled: imageGenEnabled,
    uploadedImages,
  })

  // Effective model ID for DB/metadata
  const effectiveModelId = usePrivacyModel
    ? (effectivePrivacyRoute === "eu" ? `mistral/${businessModeConfig.euModelId}` : `local/${businessModeConfig.localModelId}`)
    : finalModelId

  // Display model name for UI
  const displayModelName = usePrivacyModel
    ? (effectivePrivacyRoute === "eu" ? `EU: ${businessModeConfig.euModelId}`
      : effectivePrivacyRoute === "de" ? `DE: ${businessModeConfig.deModelId}`
      : `Lokal: ${businessModeConfig.localModelId}`)
    : (getModelById(finalModelId)?.name ?? finalModelId.split("/").pop())

  // Anthropic-specific: skills config + higher step count for Code Execution
  const isAnthropic = isAnthropicModel(finalModelId) && !privacyModel
  // Reasoning support is now driven by the model's capability flag, not provider hardcoding.
  // Anthropic-Sonnet/Opus → reasoning=true, Anthropic-Haiku → reasoning=false in seed data.
  const supportsThinking = !privacyModel && getModelCapabilities(finalModelId).reasoning
  const skillsConfig = isAnthropic ? buildSkillsConfig(finalModelId) : undefined

  // Skills require direct Anthropic provider (gateway doesn't forward container.skills)
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY
  const useDirectAnthropicProvider = skillsConfig && anthropicApiKey
  const anthropicModel = useDirectAnthropicProvider
    ? createAnthropic({ apiKey: anthropicApiKey })(finalModelId.replace("anthropic/", ""))
    : null

  if (skillsConfig && !anthropicApiKey) {
    console.warn("[skills] ANTHROPIC_API_KEY not set — skills disabled, falling back to gateway")
  }
  if (useDirectAnthropicProvider) {
    console.log("[skills] Direct Anthropic provider active, skills:", JSON.stringify(skillsConfig))
  }

  const modelMaxOutputTokens = getModelById(finalModelId)?.maxOutputTokens ?? chatConfig.maxTokens

  const result = streamText({
    model: privacyModel ?? anthropicModel ?? resolveModel(finalModelId),
    messages: modelMessages,
    maxOutputTokens: Math.min(chatConfig.maxTokens, modelMaxOutputTokens),
    stopWhen: stepCountIs(useDirectAnthropicProvider ? 8 : 5),
    temperature: effectiveTemperature,
    ...(isAnthropic && {
      providerOptions: {
        anthropic: {
          ...(supportsThinking && {
            thinking: { type: "adaptive" },
            effort: "low",
          }),
          ...(useDirectAnthropicProvider && {
            container: { skills: skillsConfig },
          }),
        } as unknown as Record<string, JSONValue>,
      },
      ...(useDirectAnthropicProvider && {
        prepareStep: forwardAnthropicContainerIdFromLastStep,
      }),
    }),
    tools,
    onFinish: createOnFinish({
      resolvedChatId,
      isNewChat,
      userId: user.id,
      finalModelId: effectiveModelId,
      expert,
      existingExpertId,
      messages,
      mcpHandle,
      userSuggestedRepliesEnabled,
    }),
  })

  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: true,
    messageMetadata: ({ part }) => {
      if (part.type === "start") {
        return {
          chatId: resolvedChatId,
          modelId: effectiveModelId,
          modelName: displayModelName,
          ...(expert && { expertId: expert.id, expertName: expert.name }),
          ...(projectId && { projectId, projectName }),
          ...(memoriesLoaded > 0 && { memories }),
          ...(effectivePrivacyRoute && { privacyRoute: effectivePrivacyRoute }),
        }
      }
    },
  })
}

const MAX_UPLOADED_IMAGES = 8

/** Extract image file parts from user messages. AI SDK 5+: data in .url, legacy: in .data */
function extractUploadedImages(messages: Array<{ role: string; parts?: MessagePart[] }>) {
  const result: { data: string; mediaType: string }[] = []
  for (const msg of messages) {
    if (msg.role !== "user") continue
    for (const part of msg.parts ?? []) {
      if (result.length >= MAX_UPLOADED_IMAGES) break
      if (part.type !== "file" || !part.mediaType?.startsWith("image/")) continue

      let data: string | undefined
      if (typeof part.url === "string" && part.url.startsWith("data:")) {
        data = part.url
      } else if (part.data instanceof Uint8Array) {
        data = `data:${part.mediaType};base64,${Buffer.from(part.data).toString("base64")}`
      } else if (typeof part.data === "string" && part.data) {
        data = part.data.startsWith("data:") ? part.data : `data:${part.mediaType};base64,${part.data}`
      }

      if (data) result.push({ data, mediaType: part.mediaType })
    }
  }
  return result.length > 0 ? result : undefined
}
