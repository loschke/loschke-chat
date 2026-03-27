import { requireAuth } from "@/lib/api-guards"
import { getArtifactsByUserId } from "@/lib/db/queries/artifacts"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { DEEP_RESEARCH_TAG } from "@/lib/ai/deep-research"

const ALLOWED_TYPES = new Set(["markdown", "html", "code", "quiz", "review", "image"])
const ALLOWED_TAGS = new Set([DEEP_RESEARCH_TAG])

export async function GET(request: Request) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const rateCheck = checkRateLimit(auth.user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "24", 10) || 24, 1), 100)
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0)
  const type = searchParams.get("type") ?? undefined
  const metadataTag = searchParams.get("tag") ?? undefined

  if (type && !ALLOWED_TYPES.has(type)) {
    return Response.json({ error: "Invalid type filter" }, { status: 400 })
  }

  if (metadataTag && !ALLOWED_TAGS.has(metadataTag)) {
    return Response.json({ error: "Invalid tag filter" }, { status: 400 })
  }

  const result = await getArtifactsByUserId(auth.user.id, { limit, offset, type, metadataTag })
  return Response.json(result, {
    headers: { "Cache-Control": "private, max-age=10" },
  })
}
