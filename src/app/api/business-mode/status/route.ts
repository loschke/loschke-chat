import { features } from "@/config/features"
import { businessModeConfig } from "@/config/business-mode"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"

export async function GET(req: Request) {
  if (!features.businessMode.enabled) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  // Rate limit by IP (public endpoint, no auth)
  const ip = req.headers.get("x-forwarded-for") ?? "unknown"
  const rl = checkRateLimit(`bm-status:${ip}`, RATE_LIMITS.api)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs)

  return Response.json({
    enabled: true,
    options: {
      redaction: true,
      euModel: !!businessModeConfig.euModelId,
      localModel: !!(businessModeConfig.localModelId && businessModeConfig.localProviderUrl),
    },
  })
}
