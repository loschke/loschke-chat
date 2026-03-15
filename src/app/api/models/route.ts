import { requireAuth } from "@/lib/api-guards"
import { getModels, CATEGORY_LABELS, type ModelCategory, type ModelConfig } from "@/config/models"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"

const CATEGORY_ORDER: ModelCategory[] = [
  "enterprise", "allrounder", "coding", "creative", "analysis", "fast",
]

export async function GET() {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const rateCheck = checkRateLimit(auth.user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  // Single getModels() call — derive groups locally
  const models = await getModels()

  const grouped = new Map<ModelCategory, ModelConfig[]>()
  for (const model of models) {
    for (const cat of model.categories) {
      const list = grouped.get(cat) ?? []
      list.push(model)
      grouped.set(cat, list)
    }
  }
  const groups = CATEGORY_ORDER
    .filter((cat) => grouped.has(cat))
    .map((cat) => ({ category: cat, label: CATEGORY_LABELS[cat], models: grouped.get(cat)! }))

  return new Response(JSON.stringify({ models, groups }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
    },
  })
}
