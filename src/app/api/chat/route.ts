import { streamText, gateway, stepCountIs } from "ai"
import type { UIMessage } from "ai"

import { requireAuth } from "@/lib/api-guards"
import { features } from "@/config/features"
import { chatConfig } from "@/config/chat"
import { MAX_MESSAGE_LENGTH, MAX_BODY_SIZE } from "@/lib/constants"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { parseBody } from "@/lib/schemas"
import { getModelById } from "@/config/models"

import { chatBodySchema, type MessagePart } from "./schema"
import { resolveContext } from "./resolve-context"
import { buildModelMessages } from "./build-messages"
import { buildTools } from "./build-tools"
import { createOnFinish } from "./persist"
import { resolvePrivacyModel } from "@/lib/ai/privacy-provider"
import { businessModeConfig } from "@/config/business-mode"
import { logConsent } from "@/lib/db/queries/consent"

export const maxDuration = 120

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

  const { messages, chatId: requestChatId, modelId: requestModelId, expertId: requestExpertId, quicktaskSlug, quicktaskData, projectId: requestProjectId, privacyRoute: requestPrivacyRoute } = parsed.data

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
        if (filePart.mediaType && !ALLOWED_MIME_TYPES.has(filePart.mediaType)) {
          return Response.json({ error: "Dateityp nicht erlaubt" }, { status: 400 })
        }
      }
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
    messages,
  })

  // resolveContext returns Response on validation failure
  if (context instanceof Response) return context

  const { resolvedChatId, isNewChat, expert, systemPrompt, finalModelId, effectiveTemperature, skills, quicktaskPrompt, projectId, projectName, mcpServerIds, allowedTools, memoriesLoaded, memories, userMemoryEnabled } = context

  // Build model messages
  const modelMessages = await buildModelMessages(
    messages as UIMessage[],
    systemPrompt,
    finalModelId,
  )

  // Build tools (async — may connect MCP servers)
  const { tools, mcpHandle } = await buildTools({
    chatId: resolvedChatId,
    userId: user.id,
    skills,
    hasQuicktask: !!quicktaskPrompt,
    memoryEnabled: userMemoryEnabled,
    mcpEnabled: features.mcp.enabled,
    expertMcpServerIds: mcpServerIds,
    expertAllowedTools: allowedTools,
  })

  // Privacy routing: only honor privacyRoute when business mode is enabled
  const effectivePrivacyRoute = (requestPrivacyRoute && features.businessMode.enabled)
    ? requestPrivacyRoute
    : undefined
  const privacyModel = effectivePrivacyRoute
    ? resolvePrivacyModel(effectivePrivacyRoute)
    : null

  if (effectivePrivacyRoute && !privacyModel) {
    mcpHandle?.close()
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
      decision: effectivePrivacyRoute === "eu" ? "rerouted_eu" : "rerouted_local",
      routedModel: (effectivePrivacyRoute === "eu" ? businessModeConfig.euModelId : businessModeConfig.localModelId) ?? undefined,
    }).catch((err) => {
      console.error("[consent] Privacy-route audit log failed:", err)
    })
  }

  const usePrivacyModel = !!privacyModel

  // Effective model ID for DB/metadata
  const effectiveModelId = usePrivacyModel
    ? (effectivePrivacyRoute === "eu" ? `mistral/${businessModeConfig.euModelId}` : `local/${businessModeConfig.localModelId}`)
    : finalModelId

  // Display model name for UI
  const displayModelName = usePrivacyModel
    ? (effectivePrivacyRoute === "eu" ? `EU: ${businessModeConfig.euModelId}` : `Lokal: ${businessModeConfig.localModelId}`)
    : (getModelById(finalModelId)?.name ?? finalModelId.split("/").pop())

  const result = streamText({
    model: privacyModel ?? gateway(finalModelId),
    messages: modelMessages,
    maxOutputTokens: chatConfig.maxTokens,
    stopWhen: stepCountIs(5),
    temperature: effectiveTemperature,
    tools,
    onFinish: createOnFinish({
      resolvedChatId,
      isNewChat,
      userId: user.id,
      finalModelId: effectiveModelId,
      expert,
      messages,
      mcpHandle,
      userMemoryEnabled,
    }),
  })

  return result.toUIMessageStreamResponse({
    sendSources: true,
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
