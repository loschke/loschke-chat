import { z } from "zod"
import { requireAdmin } from "@/lib/admin-guard"
import { features } from "@/config/features"
import { grantCredits, getUsersWithBalances } from "@/lib/db/queries/credits"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"

const grantSchema = z.object({
  authSub: z.string().min(1),
  amount: z.number().int().positive().max(10_000_000),
  description: z.string().max(200).optional(),
})

export async function GET() {
  if (!features.credits.enabled) {
    return Response.json({ error: "Credits sind deaktiviert" }, { status: 404 })
  }

  let admin: { userId: string }
  try {
    admin = await requireAdmin()
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }

  const rateCheck = checkRateLimit(admin.userId, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const users = await getUsersWithBalances()
  return Response.json({ users })
}

export async function POST(req: Request) {
  if (!features.credits.enabled) {
    return Response.json({ error: "Credits sind deaktiviert" }, { status: 404 })
  }

  let admin: { userId: string }
  try {
    admin = await requireAdmin()
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }

  const rateCheck = checkRateLimit(admin.userId, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Ungültiges JSON" }, { status: 400 })
  }

  const parsed = grantSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Ungültige Daten", details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { authSub, amount, description } = parsed.data
  const result = await grantCredits(authSub, amount, description)

  return Response.json({ success: true, newBalance: result.newBalance })
}
