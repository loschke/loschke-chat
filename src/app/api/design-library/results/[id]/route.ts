import { requireAuth } from "@/lib/api-guards"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { features } from "@/config/features"
import { queryDesignLibrary } from "@/lib/db/design-library"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!features.designLibrary.enabled) {
    return Response.json({ error: "Design-Library ist nicht aktiviert" }, { status: 404 })
  }

  const auth = await requireAuth()
  if (auth.error) return auth.error

  const rateCheck = checkRateLimit(auth.user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

  const { id } = await params
  if (id.length > 50) return Response.json({ error: "Ungueltige ID" }, { status: 400 })

  try {
    const results = await queryDesignLibrary(
      `SELECT r.id, r."promptText", r."promptTextDe", r."previewUrl",
              r."imageModel", r.category, r.tags, r."formulaId",
              f.name AS "formulaName", f."templateText" AS "formulaTemplate"
       FROM image_formula_results r
       LEFT JOIN image_prompt_formulas f ON f.id = r."formulaId"
       WHERE r.id = $1`,
      [id]
    )

    if (results.length === 0) {
      return Response.json({ error: "Ergebnis nicht gefunden" }, { status: 404 })
    }

    return new Response(JSON.stringify({ result: results[0] }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
      },
    })
  } catch (err) {
    console.error("[design-library/results/[id]] Query failed:", err)
    return Response.json({ error: "Design-Library nicht erreichbar" }, { status: 502 })
  }
}
