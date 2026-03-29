import { requireAdmin } from "@/lib/admin-guard"
import { getDb } from "@/lib/db"
import { experts } from "@/lib/db/schema/experts"
import { upsertExpertBySlug } from "@/lib/db/queries/experts"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { asc } from "drizzle-orm"
import { createExpertAdminSchema } from "@/lib/validations/expert"

/** GET /api/admin/experts — All experts (including global + inactive) */
export async function GET() {
  try {
    const admin = await requireAdmin()
    const rateCheck = checkRateLimit(admin.userId, RATE_LIMITS.api)
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

    const db = getDb()
    const allExperts = await db
      .select()
      .from(experts)
      .orderBy(asc(experts.sortOrder), asc(experts.name))

    return Response.json(allExperts.map((e) => ({
      ...e,
      isGlobal: e.userId === null,
    })))
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }
}

/** POST /api/admin/experts — Import expert (JSON, upsert by slug) */
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin()
    const rateCheck = checkRateLimit(admin.userId, RATE_LIMITS.api)
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "Ungültiges JSON" }, { status: 400 })
    }

    const parsed = createExpertAdminSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({
        error: parsed.error.issues[0]?.message ?? "Ungültige Anfrage",
        issues: parsed.error.issues,
      }, { status: 400 })
    }

    const result = await upsertExpertBySlug(parsed.data)
    return Response.json({
      id: result.id,
      slug: result.slug,
      name: result.name,
    }, { status: 201 })
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }
}
