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

  const hasEuModel = !!businessModeConfig.euModelId
  const hasDeModel = !!businessModeConfig.deModelId
  const hasLocalModel = !!(businessModeConfig.localModelId && businessModeConfig.localProviderUrl)
  const hasAnySecureModel = hasEuModel || hasDeModel || hasLocalModel

  return Response.json({
    enabled: true,
    options: {
      redaction: true,
      euModel: hasEuModel,
      deModel: hasDeModel,
      localModel: hasLocalModel,
    },
    // SafeChat: automatically available when at least one secure model is configured
    safeChat: hasAnySecureModel ? {
      route: businessModeConfig.safeChatRoute,
      label: businessModeConfig.safeChatLabel,
      hasLocalModel: hasLocalModel,
    } : undefined,
  })
}
