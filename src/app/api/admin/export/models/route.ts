import { requireAdmin } from "@/lib/admin-guard"
import { getAllModels } from "@/lib/db/queries/models"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"

/** GET /api/admin/export/models — Bulk export all models as JSON */
export async function GET() {
  try {
    const admin = await requireAdmin()
    const rateCheck = checkRateLimit(admin.userId, RATE_LIMITS.api)
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

    const models = await getAllModels()

    // Map to import-compatible format (modelId as top-level field)
    const exportData = models.map((m) => ({
      modelId: m.modelId,
      name: m.name,
      provider: m.provider,
      categories: m.categories,
      region: m.region,
      contextWindow: m.contextWindow,
      maxOutputTokens: m.maxOutputTokens,
      isDefault: m.isDefault,
      capabilities: m.capabilities,
      inputPrice: m.inputPrice,
      outputPrice: m.outputPrice,
      isActive: m.isActive,
      sortOrder: m.sortOrder,
    }))

    return Response.json(exportData)
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }
}
