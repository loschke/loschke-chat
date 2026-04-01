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
    const formulas = await queryDesignLibrary(
      `SELECT id, name, "templateText", variables, legend,
              "usageType", "mediumType", tags, "previewUrl", creator
       FROM image_prompt_formulas
       WHERE id = $1 AND status = 'Fertig'`,
      [id]
    )

    if (formulas.length === 0) {
      return Response.json({ error: "Formel nicht gefunden" }, { status: 404 })
    }

    const examples = await queryDesignLibrary(
      `SELECT id, "promptText", "promptTextDe", "previewUrl", "imageModel", category, tags
       FROM image_formula_results
       WHERE "formulaId" = $1
       ORDER BY category
       LIMIT 20`,
      [id]
    )

    return new Response(JSON.stringify({ formula: formulas[0], examples }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
      },
    })
  } catch (err) {
    console.error("[design-library/formulas/[id]] Query failed:", err)
    return Response.json({ error: "Design-Library nicht erreichbar" }, { status: 502 })
  }
}
