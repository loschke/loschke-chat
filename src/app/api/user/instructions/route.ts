import { z } from "zod"

import { requireAuth } from "@/lib/api-guards"
import { features } from "@/config/features"
import { getUserPreferences, updateCustomInstructions, updateDefaultModelId, updateMemoryEnabled, clearUserPrefsCache } from "@/lib/db/queries/users"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"

const MAX_INSTRUCTIONS_LENGTH = 2000

const updateSchema = z.object({
  instructions: z.string().max(MAX_INSTRUCTIONS_LENGTH).nullable().optional(),
  defaultModelId: z.string().max(100).nullable().optional(),
  memoryEnabled: z.boolean().optional(),
})

export async function GET() {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const rateCheck = checkRateLimit(auth.user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const prefs = await getUserPreferences(auth.user.id)

  let creditsBalance: number | undefined
  if (features.credits.enabled) {
    const { getCreditBalance } = await import("@/lib/db/queries/credits")
    creditsBalance = await getCreditBalance(auth.user.id)
  }

  return Response.json({
    instructions: prefs.customInstructions,
    defaultModelId: prefs.defaultModelId,
    memoryEnabled: prefs.memoryEnabled,
    memoryAvailable: features.memory.enabled,
    creditsBalance,
    creditsEnabled: features.credits.enabled,
  })
}

export async function PUT(req: Request) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const rateCheck = checkRateLimit(auth.user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (parsed.data.instructions !== undefined) {
    await updateCustomInstructions(auth.user.id, parsed.data.instructions)
  }
  if (parsed.data.defaultModelId !== undefined) {
    await updateDefaultModelId(auth.user.id, parsed.data.defaultModelId)
  }
  if (parsed.data.memoryEnabled !== undefined) {
    await updateMemoryEnabled(auth.user.id, parsed.data.memoryEnabled)
  }

  // Invalidate user preferences cache after mutation
  clearUserPrefsCache(auth.user.id)

  return Response.json({ success: true })
}
