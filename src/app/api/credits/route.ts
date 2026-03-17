import { requireAuth } from "@/lib/api-guards"
import { features } from "@/config/features"
import { getCreditBalance, getCreditTransactions, getCreditUsageByChat } from "@/lib/db/queries/credits"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"

export async function GET(req: Request) {
  if (!features.credits.enabled) {
    return Response.json({ error: "Credits sind deaktiviert" }, { status: 404 })
  }

  const auth = await requireAuth()
  if (auth.error) return auth.error

  const rateCheck = checkRateLimit(auth.user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const url = new URL(req.url)
  const chatId = url.searchParams.get("chatId")

  // Chat-specific credit usage query
  if (chatId) {
    if (!/^[a-zA-Z0-9_-]{1,20}$/.test(chatId)) {
      return Response.json({ error: "Ungueltige chatId" }, { status: 400 })
    }
    const chatCredits = await getCreditUsageByChat(chatId, auth.user.id)
    return Response.json({ chatCredits })
  }

  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 100)
  const offset = Math.max(parseInt(url.searchParams.get("offset") ?? "0", 10), 0)

  const [balance, transactions] = await Promise.all([
    getCreditBalance(auth.user.id),
    getCreditTransactions(auth.user.id, limit, offset),
  ])

  return Response.json({ balance, transactions })
}
