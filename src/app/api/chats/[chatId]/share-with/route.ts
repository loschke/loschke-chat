import { requireAuth } from "@/lib/api-guards"
import { getChatById } from "@/lib/db/queries/chats"
import { shareChatWithUser, getChatShareRecipients } from "@/lib/db/queries/chat-shares"
import { getUserByEmail } from "@/lib/db/queries/users"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { shareChatSchema } from "@/lib/validations/sharing"

/** GET: List all recipients of a shared chat. Owner-only. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

  const { chatId } = await params
  const chat = await getChatById(chatId)
  if (!chat || chat.userId !== user.id) {
    return Response.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  const recipients = await getChatShareRecipients(chatId, user.id)
  return Response.json(recipients)
}

/** POST: Share a chat with another user by email. Owner-only. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

  const { chatId } = await params
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

  const parsed = shareChatSchema.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Ungültige Anfrage"
    return Response.json({ error: firstError }, { status: 400 })
  }

  const targetUser = await getUserByEmail(parsed.data.email)
  if (!targetUser) {
    return Response.json({ error: "Nutzer nicht gefunden" }, { status: 404 })
  }

  if (targetUser.authSub === user.id) {
    return Response.json({ error: "Du kannst Chats nicht mit dir selbst teilen" }, { status: 400 })
  }

  const share = await shareChatWithUser(chatId, user.id, targetUser.authSub)

  return Response.json({
    id: share.id,
    sharedWithId: share.sharedWithId,
    name: targetUser.name,
    email: targetUser.email,
    createdAt: share.createdAt,
  }, { status: 201 })
}
