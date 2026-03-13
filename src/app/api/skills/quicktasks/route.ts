import { requireAuth } from "@/lib/api-guards"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { discoverQuicktasks } from "@/lib/ai/skills/discovery"

export async function GET() {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const rateCheck = checkRateLimit(auth.user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const quicktasks = discoverQuicktasks().map((q) => ({
    slug: q.slug,
    name: q.name,
    description: q.description,
    category: q.category ?? null,
    icon: q.icon ?? null,
    fields: q.fields ?? [],
    outputAsArtifact: q.outputAsArtifact ?? false,
  }))

  return Response.json(quicktasks)
}
