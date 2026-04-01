import { requireAuth } from "@/lib/api-guards"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { features } from "@/config/features"
import { queryDesignLibrary } from "@/lib/db/design-library"

export async function GET() {
  if (!features.designLibrary.enabled) {
    return Response.json({ error: "Design-Library ist nicht aktiviert" }, { status: 404 })
  }

  const auth = await requireAuth()
  if (auth.error) return auth.error

  const rateCheck = checkRateLimit(auth.user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

  try {
    const [usageTypes, mediumTypes, counts] = await Promise.all([
      queryDesignLibrary(
        `SELECT DISTINCT "usageType" FROM image_prompt_formulas
         WHERE status = 'Fertig' AND "usageType" IS NOT NULL
         ORDER BY "usageType"`
      ),
      queryDesignLibrary(
        `SELECT DISTINCT "mediumType" FROM image_prompt_formulas
         WHERE status = 'Fertig' AND "mediumType" IS NOT NULL
         ORDER BY "mediumType"`
      ),
      queryDesignLibrary(
        `SELECT
           (SELECT COUNT(*)::int FROM image_prompt_formulas WHERE status = 'Fertig') AS "formulaCount",
           (SELECT COUNT(*)::int FROM image_formula_results) AS "resultCount"`
      ),
    ])

    return new Response(JSON.stringify({
      usageTypes: usageTypes.map((r) => r.usageType),
      mediumTypes: mediumTypes.map((r) => r.mediumType),
      formulaCount: (counts[0] as Record<string, unknown>)?.formulaCount ?? 0,
      resultCount: (counts[0] as Record<string, unknown>)?.resultCount ?? 0,
    }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
      },
    })
  } catch (err) {
    console.error("[design-library/meta] Query failed:", err)
    return Response.json({ error: "Design-Library nicht erreichbar" }, { status: 502 })
  }
}
