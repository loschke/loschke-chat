import { z } from "zod"

import { requireAuth } from "@/lib/api-guards"
import { getChatById, getChatWithMessages, deleteChat, updateChatTitle, toggleChatPin, updateChatModel } from "@/lib/db/queries/chats"

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

  const { chatId } = await params
  const url = new URL(req.url)
  const limit = parseInt(url.searchParams.get("limit") ?? "0", 10)
  const offset = parseInt(url.searchParams.get("offset") ?? "0", 10)

  const chat = await getChatWithMessages(chatId)

  if (!chat || chat.userId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  // Apply pagination if limit is specified
  if (limit > 0) {
    const totalMessages = chat.messages.length
    const start = Math.max(0, totalMessages - offset - limit)
    const end = totalMessages - offset
    const paginatedMessages = chat.messages.slice(Math.max(0, start), Math.max(0, end))
    return Response.json({
      ...chat,
      messages: paginatedMessages,
      hasMore: start > 0,
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

  const { chatId } = await params

  // Verify ownership
  const chat = await getChatById(chatId)
  if (!chat || chat.userId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = patchChatSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (parsed.data.title !== undefined) {
    await updateChatTitle(chatId, parsed.data.title)
  }

  if (parsed.data.isPinned !== undefined) {
    await toggleChatPin(chatId, parsed.data.isPinned)
  }

  if (parsed.data.modelId !== undefined) {
    await updateChatModel(chatId, parsed.data.modelId)
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

  const { chatId } = await params
  await deleteChat(chatId, user.id)

  return Response.json({ success: true })
}
