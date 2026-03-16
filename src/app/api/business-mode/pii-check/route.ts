import { z } from "zod"
import { features } from "@/config/features"
import { requireAuth } from "@/lib/api-guards"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { detectPii } from "@/lib/pii"

const bodySchema = z.object({
  text: z.string().max(50000),
})

export async function POST(req: Request) {
  if (!features.businessMode.enabled) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const auth = await requireAuth()
  if (auth.error) return auth.error

  const rl = checkRateLimit(`bm-pii:${auth.user.id}`, RATE_LIMITS.chat)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 })
  }

  const result = detectPii(parsed.data.text)
  return Response.json(result)
}
