import { z } from "zod"
import { features } from "@/config/features"
import { requireAuth } from "@/lib/api-guards"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { logConsent } from "@/lib/db/queries/consent"

const bodySchema = z.object({
  consentType: z.enum(["pii_detected", "file_upload", "privacy_route"]),
  decision: z.enum(["accepted", "rejected", "redacted", "rerouted_eu", "rerouted_local"]),
  chatId: z.string().optional(),
  fileMetadata: z.unknown().optional(),
  piiFindings: z.unknown().optional(),
  routedModel: z.string().optional(),
  messagePreview: z.string().max(200).optional(),
})

export async function POST(req: Request) {
  if (!features.businessMode.enabled) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const auth = await requireAuth()
  if (auth.error) return auth.error

  const rl = checkRateLimit(`bm-consent:${auth.user.id}`, RATE_LIMITS.api)
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

  // Fire-and-forget — don't block response on DB write
  logConsent({
    userId: auth.user.id,
    ...parsed.data,
  }).catch((err) => {
    console.error("[consent] Logging failed:", err)
  })

  return Response.json({ ok: true })
}
