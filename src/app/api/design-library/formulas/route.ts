import { requireAuth } from "@/lib/api-guards"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { features } from "@/config/features"
import { queryDesignLibrary } from "@/lib/db/design-library"

export async function GET(request: Request) {
  if (!features.designLibrary.enabled) {
    return Response.json({ error: "Design-Library ist nicht aktiviert" }, { status: 404 })
  }

  const auth = await requireAuth()
  if (auth.error) return auth.error

  const rateCheck = checkRateLimit(auth.user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get("q") ?? "").slice(0, 200)
  const usageType = searchParams.get("usageType")
  const mediumType = searchParams.get("mediumType")
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 1), 100)
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0)

  try {
    const conditions: string[] = [`status = 'Fertig'`]
    const params: unknown[] = []
    let paramIndex = 1

    if (q.length >= 2) {
      const searchTerm = `%${q}%`
      conditions.push(`(
        name->>'de' ILIKE $${paramIndex}
        OR name->>'en' ILIKE $${paramIndex}
        OR "templateText" ILIKE $${paramIndex}
        OR tags->'de' @> $${paramIndex + 1}::jsonb
        OR tags->'en' @> $${paramIndex + 2}::jsonb
      )`)
      params.push(searchTerm, JSON.stringify([q]), JSON.stringify([q]))
      paramIndex += 3
    }

    if (usageType) {
      conditions.push(`"usageType" = $${paramIndex}`)
      params.push(usageType)
      paramIndex++
    }

    if (mediumType) {
      conditions.push(`"mediumType" = $${paramIndex}`)
      params.push(mediumType)
      paramIndex++
    }

    params.push(limit, offset)

    const sql = `
      SELECT
        id, name, "templateText", variables, legend,
        "usageType", "mediumType", tags, "previewUrl",
        (SELECT COUNT(*)::int FROM image_formula_results r WHERE r."formulaId" = f.id) AS "exampleCount"
      FROM image_prompt_formulas f
      WHERE ${conditions.join(" AND ")}
      ORDER BY name->>'de'
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    const formulas = await queryDesignLibrary(sql, params)

    return new Response(JSON.stringify({ formulas, query: q }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
      },
    })
  } catch (err) {
    console.error("[design-library/formulas] Query failed:", err)
    return Response.json({ error: "Design-Library nicht erreichbar" }, { status: 502 })
  }
}
