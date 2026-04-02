import { requireAuth } from "@/lib/api-guards"
import { features } from "@/config/features"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { getCreditBalance } from "@/lib/db/queries/credits"
import { createChat, getChatById } from "@/lib/db/queries/chats"
import { getProjectById } from "@/lib/db/queries/projects"
import { getProjectDocumentsForPrompt } from "@/lib/db/queries/project-documents"
import { canAccessProject } from "@/lib/db/queries/access"
import { nanoid } from "nanoid"
import {
  generateEphemeralToken,
  registerSession,
  buildVoiceSystemPrompt,
  VOICE_CHAT_MODEL,
  VOICE_CHAT_DEFAULT_VOICE,
  VOICE_CHAT_MAX_DURATION,
  calculateVoiceChatCredits,
} from "@/lib/ai/voice-chat"
import { brand } from "@/config/brand"

export async function POST(request: Request) {
  // Auth
  const auth = await requireAuth()
  if ("error" in auth) return auth.error
  const { user } = auth

  // Feature check
  if (!features.voiceChat.enabled) {
    return Response.json({ error: "Voice Chat ist nicht aktiviert" }, { status: 403 })
  }

  // Rate limit
  const rateCheck = checkRateLimit(`voice:${user.id}`, RATE_LIMITS.voiceChat)
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

  // Credit check (minimum for 1 minute)
  if (features.credits.enabled) {
    const balance = await getCreditBalance(user.id)
    const minCredits = calculateVoiceChatCredits(60)
    if (balance < minCredits) {
      return Response.json(
        { error: "Nicht genügend Credits für Voice Chat", balance, required: minCredits },
        { status: 402 }
      )
    }
  }

  try {
    // Parse body
    const body = await request.json().catch(() => ({})) as { chatId?: string; projectId?: string }

    // Resolve or create chat
    let chatId = body.chatId
    if (chatId) {
      if (!/^[a-zA-Z0-9_-]{1,20}$/.test(chatId)) {
        return Response.json({ error: "Ungültige Chat-ID" }, { status: 400 })
      }
      const chat = await getChatById(chatId, user.id)
      if (!chat) {
        return Response.json({ error: "Chat nicht gefunden" }, { status: 404 })
      }
    } else {
      const chat = await createChat(user.id, {
        title: "Voice Chat",
        metadata: { source: "voice-chat" },
        projectId: body.projectId ?? undefined,
      })
      chatId = chat.id
    }

    // Resolve project context (if projectId provided)
    let projectName: string | undefined
    let projectInstructions: string | null = null
    let projectDocuments: Array<{ title: string; content: string }> = []

    if (body.projectId) {
      if (!/^[a-zA-Z0-9_-]{1,20}$/.test(body.projectId)) {
        return Response.json({ error: "Ungültige Projekt-ID" }, { status: 400 })
      }
      const hasAccess = await canAccessProject(body.projectId, user.id)
      if (hasAccess) {
        const project = await getProjectById(body.projectId)
        if (project) {
          projectName = project.name
          projectInstructions = project.instructions
          projectDocuments = await getProjectDocumentsForPrompt(body.projectId)
        }
      }
    }

    // Generate ephemeral token
    const { token, expiresAt } = await generateEphemeralToken()

    // Register session for persist validation
    const sessionId = nanoid(16)
    registerSession(sessionId, user.id, chatId)

    return Response.json({
      token,
      expiresAt,
      sessionId,
      chatId,
      voice: VOICE_CHAT_DEFAULT_VOICE,
      model: VOICE_CHAT_MODEL,
      systemPrompt: buildVoiceSystemPrompt({
        brandName: brand.name,
        projectName,
        projectInstructions,
        projectDocuments,
      }),
      maxDuration: VOICE_CHAT_MAX_DURATION,
      projectName: projectName ?? null,
    })
  } catch (error) {
    console.error("[VoiceChat] Token generation failed:", error)
    return Response.json(
      { error: "Voice Chat konnte nicht gestartet werden" },
      { status: 500 }
    )
  }
}
