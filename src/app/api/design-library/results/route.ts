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
  const category = searchParams.get("category")
  const formulaId = searchParams.get("formulaId")
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 1), 50)
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0)

  try {
    const conditions: string[] = ["1=1"]
    const params: unknown[] = []
    let paramIndex = 1

    if (q.length >= 2) {
      const searchTerm = `%${q}%`
      conditions.push(`(
        "promptText" ILIKE $${paramIndex}
        OR "promptTextDe" ILIKE $${paramIndex}
        OR category ILIKE $${paramIndex}
        OR tags->'de' @> $${paramIndex + 1}::jsonb
        OR tags->'en' @> $${paramIndex + 2}::jsonb
      )`)
      params.push(searchTerm, JSON.stringify([q]), JSON.stringify([q]))
      paramIndex += 3
    }

    if (category) {
      conditions.push(`category = $${paramIndex}`)
      params.push(category)
      paramIndex++
    }

    if (formulaId) {
      conditions.push(`"formulaId" = $${paramIndex}`)
      params.push(formulaId)
      paramIndex++
    }

    params.push(limit, offset)

    const sql = `
      SELECT id, "promptText", "promptTextDe", "previewUrl",
             "imageModel", category, tags, "formulaId"
      FROM image_formula_results
      WHERE ${conditions.join(" AND ")}
      ORDER BY category
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    const results = await queryDesignLibrary(sql, params)

    return new Response(JSON.stringify({ results, query: q }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
      },
    })
  } catch (err) {
    console.error("[design-library/results] Query failed:", err)
    return Response.json({ error: "Design-Library nicht erreichbar" }, { status: 502 })
  }
}
