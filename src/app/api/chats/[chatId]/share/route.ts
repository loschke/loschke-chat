import { requireAuth } from "@/lib/api-guards"
import { getChatById } from "@/lib/db/queries/chats"
import { createShare, deleteShare, getShareByChatId } from "@/lib/db/queries/shared-chats"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"

/** Create or retrieve a share link for a chat. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

  const { chatId } = await params

  // Verify ownership
  const chat = await getChatById(chatId, user.id)
  if (!chat) {
    return Response.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  const token = await createShare(chatId, user.id)
  return Response.json({ token, url: `/share/${token}` })
}

/** Revoke a share link. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

  const { chatId } = await params

  // Verify ownership
  const chat = await getChatById(chatId, user.id)
  if (!chat) {
    return Response.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  await deleteShare(chatId, user.id)
  return Response.json({ success: true })
}

/** Check if a chat is shared. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const { chatId } = await params

  const share = await getShareByChatId(chatId, user.id)
  if (!share) {
    return Response.json({ shared: false })
  }

  return Response.json({ shared: true, token: share.token, url: `/share/${share.token}` })
}
