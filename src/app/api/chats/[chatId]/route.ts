import { z } from "zod"

import { requireAuth } from "@/lib/api-guards"
import { getChatById, getChatWithMessages, getMessageCount, deleteChat, updateChatTitle, toggleChatPin, updateChatModel } from "@/lib/db/queries/chats"
import { getModelById } from "@/config/models"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"

const patchChatSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  isPinned: z.boolean().optional(),
  modelId: z.string().min(1).max(100).optional(),
})

export async function GET(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const { chatId } = await params
  const url = new URL(req.url)
  const rawLimit = url.searchParams.get("limit")
  const rawOffset = url.searchParams.get("offset")

  let limit = 0
  let offset = 0

  if (rawLimit !== null) {
    limit = parseInt(rawLimit, 10)
    if (isNaN(limit) || limit < 0 || limit > 200) {
      return Response.json({ error: "Ungültiger Limit-Wert (0-200)" }, { status: 400 })
    }
  }

  if (rawOffset !== null) {
    offset = parseInt(rawOffset, 10)
    if (isNaN(offset) || offset < 0) {
      return Response.json({ error: "Ungültiger Offset-Wert (>= 0)" }, { status: 400 })
    }
  }

  const paginationOptions = limit > 0 ? { limit, offset } : undefined
  const chat = await getChatWithMessages(chatId, paginationOptions)

  if (!chat || chat.userId !== user.id) {
    return Response.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  // Include pagination metadata when limit is specified
  if (limit > 0) {
    const totalMessages = await getMessageCount(chatId)
    return Response.json({
      ...chat,
      hasMore: offset + limit < totalMessages,
      totalMessages,
    })
  }

  return Response.json(chat)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const { chatId } = await params

  // Verify ownership
  const chat = await getChatById(chatId)
  if (!chat || chat.userId !== user.id) {
    return Response.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Ungültiges JSON" }, { status: 400 })
  }

  const parsed = patchChatSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Ungültige Anfrage" }, { status: 400 })
  }

  if (parsed.data.title !== undefined) {
    await updateChatTitle(chatId, user.id, parsed.data.title)
  }

  if (parsed.data.isPinned !== undefined) {
    await toggleChatPin(chatId, user.id, parsed.data.isPinned)
  }

  if (parsed.data.modelId !== undefined) {
    if (!getModelById(parsed.data.modelId)) {
      return Response.json({ error: "Ungültiges Modell" }, { status: 400 })
    }
    await updateChatModel(chatId, user.id, parsed.data.modelId)
  }

  return Response.json({ success: true })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const { chatId } = await params
  await deleteChat(chatId, user.id)

  return Response.json({ success: true })
}
