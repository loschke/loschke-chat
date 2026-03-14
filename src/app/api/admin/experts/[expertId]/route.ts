import { z } from "zod"
import { requireAdmin } from "@/lib/admin-guard"
import { getExpertById, updateExpert, deleteExpert } from "@/lib/db/queries/experts"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"

interface RouteParams {
  params: Promise<{ expertId: string }>
}

const updateExpertSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().min(2).max(500).optional(),
  icon: z.string().max(50).nullable().optional(),
  systemPrompt: z.string().min(10).max(50000).optional(),
  skillSlugs: z.array(z.string()).max(20).optional(),
  modelPreference: z.string().max(100).nullable().optional(),
  temperature: z.number().min(0).max(2).nullable().optional(),
  allowedTools: z.array(z.string()).max(50).optional(),
  mcpServerIds: z.array(z.string()).max(20).optional(),
  isPublic: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
})

/** GET /api/admin/experts/[expertId] — Expert with all fields */
export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const admin = await requireAdmin()
    const rateCheck = checkRateLimit(admin.userId, RATE_LIMITS.api)
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

    const { expertId } = await params
    const expert = await getExpertById(expertId)
    if (!expert) {
      return Response.json({ error: "Not found" }, { status: 404 })
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
    const existing = await getExpertById(expertId)
    if (!existing) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = updateExpertSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({
        error: parsed.error.issues[0]?.message ?? "Invalid request",
        issues: parsed.error.issues,
      }, { status: 400 })
    }

    // Admin can update any expert (including global ones)
    const updated = await updateExpertAdmin(expertId, parsed.data)
    if (!updated) {
      return Response.json({ error: "Update failed" }, { status: 500 })
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
    const existing = await getExpertById(expertId)
    if (!existing) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = updateExpertSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({
        error: parsed.error.issues[0]?.message ?? "Invalid request",
      }, { status: 400 })
    }

    const updated = await updateExpertAdmin(expertId, parsed.data)
    if (!updated) {
      return Response.json({ error: "Update failed" }, { status: 500 })
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
    const existing = await getExpertById(expertId)
    if (!existing) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    const deleted = await deleteExpertAdmin(expertId)
    if (!deleted) {
      return Response.json({ error: "Delete failed" }, { status: 500 })
    }

    return Response.json({ deleted: true, slug: deleted.slug })
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }
}

// Admin-specific update/delete (no userId scoping)
import { eq } from "drizzle-orm"
import { getDb } from "@/lib/db"
import { experts } from "@/lib/db/schema/experts"
import type { UpdateExpertInput } from "@/types/expert"

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
