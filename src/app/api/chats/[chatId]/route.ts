import { z } from "zod"

import { requireAuth } from "@/lib/api-guards"
import { getChatById, getChatWithMessages, deleteChat, updateChatTitle } from "@/lib/db/queries/chats"

const patchChatSchema = z.object({
  title: z.string().min(1).max(200).optional(),
})

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const { chatId } = await params
  const chat = await getChatWithMessages(chatId)

  if (!chat || chat.userId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 })
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

  if (parsed.data.title) {
    await updateChatTitle(chatId, parsed.data.title)
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
