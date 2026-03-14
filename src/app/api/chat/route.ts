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

  const { messages, chatId: requestChatId, modelId: requestModelId, expertId: requestExpertId, quicktaskSlug, quicktaskData } = parsed.data

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
    quicktaskSlug,
    quicktaskData,
  })

  // resolveContext returns Response on validation failure
  if (context instanceof Response) return context

  const { resolvedChatId, isNewChat, expert, systemPrompt, finalModelId, effectiveTemperature, skills, quicktaskPrompt } = context

  // Build model messages
  const modelMessages = await buildModelMessages(
    messages as UIMessage[],
    systemPrompt,
    finalModelId,
  )

  // Build tools
  const tools = buildTools({
    chatId: resolvedChatId,
    skills,
    hasQuicktask: !!quicktaskPrompt,
  })

  const result = streamText({
    model: gateway(finalModelId),
    messages: modelMessages,
    maxOutputTokens: chatConfig.maxTokens,
    stopWhen: stepCountIs(5),
    temperature: effectiveTemperature,
    tools,
    onFinish: createOnFinish({
      resolvedChatId,
      isNewChat,
      userId: user.id,
      finalModelId,
      expert,
      messages,
    }),
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
