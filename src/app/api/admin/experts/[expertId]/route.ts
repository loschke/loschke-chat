import { eq } from "drizzle-orm"
import { requireAdmin } from "@/lib/admin-guard"
import { getExpertById } from "@/lib/db/queries/experts"
import { getDb } from "@/lib/db"
import { experts } from "@/lib/db/schema/experts"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { updateExpertSchema } from "@/lib/validations/expert"
import type { UpdateExpertInput } from "@/types/expert"

const ID_PATTERN = /^[a-zA-Z0-9_-]{1,21}$/

interface RouteParams {
  params: Promise<{ expertId: string }>
}

/** GET /api/admin/experts/[expertId] — Expert with all fields */
export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const admin = await requireAdmin()
    const rateCheck = checkRateLimit(admin.userId, RATE_LIMITS.api)
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

    const { expertId } = await params
    if (!ID_PATTERN.test(expertId)) {
      return Response.json({ error: "Ungültige Expert-ID" }, { status: 400 })
    }

    const expert = await getExpertById(expertId)
    if (!expert) {
      return Response.json({ error: "Expert nicht gefunden" }, { status: 404 })
    }

    return Response.json({ ...expert, isGlobal: expert.userId === null })
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }
}

/** PUT /api/admin/experts/[expertId] — Replace expert completely (JSON) */
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const admin = await requireAdmin()
    const rateCheck = checkRateLimit(admin.userId, RATE_LIMITS.api)
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

    const { expertId } = await params
    if (!ID_PATTERN.test(expertId)) {
      return Response.json({ error: "Ungültige Expert-ID" }, { status: 400 })
    }

    const existing = await getExpertById(expertId)
    if (!existing) {
      return Response.json({ error: "Expert nicht gefunden" }, { status: 404 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "Ungültiges JSON" }, { status: 400 })
    }

    const parsed = updateExpertSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({
        error: parsed.error.issues[0]?.message ?? "Ungültige Anfrage",
        issues: parsed.error.issues,
      }, { status: 400 })
    }

    // Admin can update any expert (including global ones)
    const updated = await updateExpertAdmin(expertId, parsed.data)
    if (!updated) {
      return Response.json({ error: "Aktualisierung fehlgeschlagen" }, { status: 500 })
    }

    return Response.json({ ...updated, isGlobal: updated.userId === null })
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }
}

/** PATCH /api/admin/experts/[expertId] — Update individual fields */
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const admin = await requireAdmin()
    const rateCheck = checkRateLimit(admin.userId, RATE_LIMITS.api)
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

    const { expertId } = await params
    if (!ID_PATTERN.test(expertId)) {
      return Response.json({ error: "Ungültige Expert-ID" }, { status: 400 })
    }

    const existing = await getExpertById(expertId)
    if (!existing) {
      return Response.json({ error: "Expert nicht gefunden" }, { status: 404 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "Ungültiges JSON" }, { status: 400 })
    }

    const parsed = updateExpertSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({
        error: parsed.error.issues[0]?.message ?? "Ungültige Anfrage",
      }, { status: 400 })
    }

    const updated = await updateExpertAdmin(expertId, parsed.data)
    if (!updated) {
      return Response.json({ error: "Aktualisierung fehlgeschlagen" }, { status: 500 })
    }

    return Response.json({ ...updated, isGlobal: updated.userId === null })
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }
}

/** DELETE /api/admin/experts/[expertId] — Delete any expert */
export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const admin = await requireAdmin()
    const rateCheck = checkRateLimit(admin.userId, RATE_LIMITS.api)
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

    const { expertId } = await params
    if (!ID_PATTERN.test(expertId)) {
      return Response.json({ error: "Ungültige Expert-ID" }, { status: 400 })
    }

    const existing = await getExpertById(expertId)
    if (!existing) {
      return Response.json({ error: "Expert nicht gefunden" }, { status: 404 })
    }

    const deleted = await deleteExpertAdmin(expertId)
    if (!deleted) {
      return Response.json({ error: "Löschen fehlgeschlagen" }, { status: 500 })
    }

    return Response.json({ deleted: true, slug: deleted.slug })
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }
}

// Admin-specific update/delete (no userId scoping)
async function updateExpertAdmin(id: string, data: UpdateExpertInput) {
  const db = getDb()
  const [updated] = await db
    .update(experts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(experts.id, id))
    .returning()
  return updated ?? null
}

async function deleteExpertAdmin(id: string) {
  const db = getDb()
  const [deleted] = await db
    .delete(experts)
    .where(eq(experts.id, id))
    .returning()
  return deleted ?? null
}
