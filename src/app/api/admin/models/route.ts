import { requireAdmin } from "@/lib/admin-guard"
import { checkBodySize } from "@/lib/api-guards"
import { getAllModels, upsertModelByModelId } from "@/lib/db/queries/models"
import { importModelsSchema } from "@/lib/validations/model"
import { clearModelCache } from "@/config/models"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"

/** GET /api/admin/models — All models including inactive */
export async function GET() {
  try {
    const admin = await requireAdmin()
    const rateCheck = checkRateLimit(admin.userId, RATE_LIMITS.api)
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

    const models = await getAllModels()
    return Response.json(models)
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }
}

/** POST /api/admin/models — Import models (JSON array) */
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin()
    const rateCheck = checkRateLimit(admin.userId, RATE_LIMITS.api)
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

    const sizeError = checkBodySize(req)
    if (sizeError) return sizeError

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "Ungültiges JSON" }, { status: 400 })
    }

    const parsed = importModelsSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Anfrage" }, { status: 400 })
    }

    // ⚡ Bolt: Optimize bulk I/O by replacing sequential for...of loop with Promise.all
    const importResults = await Promise.all(
      parsed.data.map((model) => upsertModelByModelId(model))
    )
    const results = importResults.map((result) => ({
      modelId: result.modelId,
      name: result.name,
      id: result.id,
    }))

    clearModelCache()

    return Response.json({ imported: results.length, models: results }, { status: 201 })
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }
}
