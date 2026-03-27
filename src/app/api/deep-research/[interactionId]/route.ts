/**
 * GET /api/deep-research/[interactionId] — Poll research status
 */

import { requireAuth } from "@/lib/api-guards"
import { features } from "@/config/features"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { getResearchStatus, INTERACTION_ID_REGEX, verifyInteractionOwner } from "@/lib/ai/deep-research"

export const runtime = "nodejs"
export const maxDuration = 30

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ interactionId: string }> }
) {
  if (!features.deepResearch.enabled) {
    return new Response("Deep Research is disabled", { status: 404 })
  }

  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const { interactionId } = await params

  if (!INTERACTION_ID_REGEX.test(interactionId)) {
    return Response.json({ error: "Ungueltige Interaction-ID" }, { status: 400 })
  }

  if (!verifyInteractionOwner(interactionId, user.id)) {
    return Response.json({ error: "Zugriff verweigert" }, { status: 403 })
  }

  try {
    const status = await getResearchStatus(interactionId)
    return Response.json(status)
  } catch (err) {
    console.error("[deep-research] Status check failed:", err instanceof Error ? err.message : err)
    return Response.json(
      { error: "Status konnte nicht abgefragt werden" },
      { status: 502 }
    )
  }
}
