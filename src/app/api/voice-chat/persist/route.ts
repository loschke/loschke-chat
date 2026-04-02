import { after } from "next/server"
import { generateText, gateway } from "ai"

import { requireAuth } from "@/lib/api-guards"
import { features } from "@/config/features"
import { aiDefaults } from "@/config/ai"
import { getChatById, updateChatTitle, touchChat } from "@/lib/db/queries/chats"
import { saveMessages } from "@/lib/db/queries/messages"
import { logUsage } from "@/lib/db/queries/usage"
import { deductCredits } from "@/lib/db/queries/credits"
import { SYSTEM_PROMPTS } from "@/config/prompts"
import {
  validateAndConsumeSession,
  calculateVoiceChatCredits,
  VOICE_CHAT_MODEL,
} from "@/lib/ai/voice-chat"

interface TranscriptEntry {
  role: "user" | "assistant"
  text: string
  timestamp: number
}

interface PersistBody {
  chatId: string
  sessionId: string
  transcript: TranscriptEntry[]
  durationSeconds: number
}

export async function POST(request: Request) {
  // Auth
  const auth = await requireAuth()
  if ("error" in auth) return auth.error
  const { user } = auth

  // Feature check
  if (!features.voiceChat.enabled) {
    return Response.json({ error: "Voice Chat ist nicht aktiviert" }, { status: 403 })
  }

  // Parse + validate body
  const body = await request.json().catch(() => null) as PersistBody | null
  if (!body?.chatId || !body?.sessionId || !Array.isArray(body?.transcript) || typeof body?.durationSeconds !== "number") {
    return Response.json({ error: "Ungültiger Request" }, { status: 400 })
  }

  // Validate chatId format
  if (!/^[a-zA-Z0-9_-]{1,20}$/.test(body.chatId)) {
    return Response.json({ error: "Ungültige Chat-ID" }, { status: 400 })
  }

  // Validate session
  if (!validateAndConsumeSession(body.sessionId, user.id, body.chatId)) {
    return Response.json({ error: "Ungültige oder abgelaufene Session" }, { status: 403 })
  }

  // Validate chat ownership
  const chat = await getChatById(body.chatId, user.id)
  if (!chat) {
    return Response.json({ error: "Chat nicht gefunden" }, { status: 404 })
  }

  // Filter and limit transcript
  const transcript = body.transcript
    .filter((e) => e.role === "user" || e.role === "assistant")
    .filter((e) => typeof e.text === "string" && e.text.trim().length > 0)
    .slice(0, 500) // max 500 entries
    .map((e) => ({ ...e, text: e.text.slice(0, 5000) })) // max 5000 chars per entry

  if (transcript.length === 0) {
    return Response.json({ error: "Leeres Transcript" }, { status: 400 })
  }

  const durationSeconds = Math.min(Math.max(0, body.durationSeconds), 3600) // cap at 1h

  try {
    // Save transcript as messages with sequential timestamps
    // to preserve conversation order (batch insert gets same createdAt otherwise)
    const messages = transcript.map((entry, index) => ({
      chatId: body.chatId,
      role: entry.role,
      parts: [{ type: "text" as const, text: entry.text }],
      metadata: { source: "voice-chat" as const, timestamp: entry.timestamp },
      createdAt: new Date(entry.timestamp || (Date.now() + index)),
    }))

    await saveMessages(messages)

    // Log usage (duration-based, no token counts)
    await logUsage({
      userId: user.id,
      chatId: body.chatId,
      modelId: VOICE_CHAT_MODEL,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      stepCount: transcript.length,
    })

    // Touch chat for sorting
    await touchChat(body.chatId)

    // Deduct credits
    let creditsDeducted = 0
    if (features.credits.enabled) {
      creditsDeducted = calculateVoiceChatCredits(durationSeconds)
      await deductCredits(user.id, creditsDeducted, {
        chatId: body.chatId,
        description: `Voice Chat (${Math.ceil(durationSeconds / 60)} Min)`,
        requireSufficientBalance: false, // post-hoc, session already happened
      })
    }

    // Fire-and-forget: title generation for new chats
    const isNewChat = chat.title === "Voice Chat"
    if (isNewChat && transcript.length > 0) {
      const firstUserText = transcript.find((e) => e.role === "user")?.text
      if (firstUserText) {
        after(async () => {
          try {
            const titleResult = await generateText({
              model: gateway(aiDefaults.model),
              system: SYSTEM_PROMPTS.titleGeneration,
              prompt: firstUserText.slice(0, 500),
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
              await updateChatTitle(body.chatId, user.id, title)
            }
          } catch (err) {
            console.error("[VoiceChat] Title generation failed:", err)
          }
        })
      }
    }

    return Response.json({ success: true, creditsDeducted, messagesCount: transcript.length })
  } catch (error) {
    console.error("[VoiceChat] Persist failed:", error)
    return Response.json({ error: "Fehler beim Speichern der Session" }, { status: 500 })
  }
}
