import { requireAdmin } from "@/lib/admin-guard"
import { getModelByPk, updateModel, deleteModel } from "@/lib/db/queries/models"
import { updateModelSchema } from "@/lib/validations/model"
import { clearModelCache } from "@/config/models"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"

const ID_PATTERN = /^[a-zA-Z0-9_-]{1,21}$/

/** GET /api/admin/models/[modelId] — Get single model by DB ID */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ modelId: string }> }
) {
  try {
    const admin = await requireAdmin()
    const rateCheck = checkRateLimit(admin.userId, RATE_LIMITS.api)
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

    const { modelId } = await params
    if (!ID_PATTERN.test(modelId)) {
      return Response.json({ error: "Ungültige Model-ID" }, { status: 400 })
    }

    const model = await getModelByPk(modelId)
    if (!model) {
      return Response.json({ error: "Model nicht gefunden" }, { status: 404 })
    }

    return Response.json(model)
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }
}

/** PATCH /api/admin/models/[modelId] — Update model fields */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ modelId: string }> }
) {
  try {
    const admin = await requireAdmin()
    const rateCheck = checkRateLimit(admin.userId, RATE_LIMITS.api)
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

    const { modelId } = await params
    if (!ID_PATTERN.test(modelId)) {
      return Response.json({ error: "Ungültige Model-ID" }, { status: 400 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "Ungültiges JSON" }, { status: 400 })
    }

    const parsed = updateModelSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Anfrage" }, { status: 400 })
    }

    const updated = await updateModel(modelId, parsed.data)
    if (!updated) {
      return Response.json({ error: "Model nicht gefunden" }, { status: 404 })
    }

    clearModelCache()
    return Response.json(updated)
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }
}

/** PUT /api/admin/models/[modelId] — Full model update */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ modelId: string }> }
) {
  return PATCH(req, { params })
}

/** DELETE /api/admin/models/[modelId] — Delete model */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ modelId: string }> }
) {
  try {
    const admin = await requireAdmin()
    const rateCheck = checkRateLimit(admin.userId, RATE_LIMITS.api)
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

    const { modelId } = await params
    if (!ID_PATTERN.test(modelId)) {
      return Response.json({ error: "Ungültige Model-ID" }, { status: 400 })
    }

    const deleted = await deleteModel(modelId)
    if (!deleted) {
      return Response.json({ error: "Model nicht gefunden" }, { status: 404 })
    }

    clearModelCache()
    return Response.json({ success: true })
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }
}
