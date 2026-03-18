import { requireAuth } from "@/lib/api-guards"
import { getMessageMetadata } from "@/lib/db/queries/messages"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ chatId: string; messageId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const rateCheck = checkRateLimit(auth.user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const { messageId } = await params

  if (!messageId || messageId.length > 20) {
    return Response.json({ error: "Ungültige Message-ID" }, { status: 400 })
  }

  const metadata = await getMessageMetadata(messageId, auth.user.id)

  return Response.json({ metadata: metadata ?? {} })
}
