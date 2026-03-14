import { requireAdmin } from "@/lib/admin-guard"
import { getDb } from "@/lib/db"
import { experts } from "@/lib/db/schema/experts"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { asc } from "drizzle-orm"

/** GET /api/admin/export/experts — Bulk export all experts as JSON */
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

    return Response.json(allExperts)
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }
}
