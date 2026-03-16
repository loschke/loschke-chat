import { requireAuth } from "@/lib/api-guards"
import { features } from "@/config/features"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { listMemories, deleteAllMemories } from "@/lib/memory"

export async function GET(req: Request) {
  if (!features.memory.enabled) {
    return Response.json({ error: "Memory ist deaktiviert" }, { status: 404 })
  }

  const auth = await requireAuth()
  if (auth.error) return auth.error

  const rateCheck = checkRateLimit(auth.user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  try {
    const memories = await listMemories(auth.user.id)

    // Export mode: return as JSON download
    const url = new URL(req.url)
    if (url.searchParams.get("export") === "true") {
      return new Response(JSON.stringify(memories, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="memories-export-${new Date().toISOString().slice(0, 10)}.json"`,
        },
      })
    }

    return Response.json({ memories })
  } catch (error) {
    console.error("[memory] List failed:", error instanceof Error ? error.message : error)
    return Response.json({ error: "Memory-Service nicht erreichbar" }, { status: 503 })
  }
}

/**
 * DELETE /api/user/memories — Delete ALL memories for the user (DSGVO bulk delete)
 */
export async function DELETE() {
  if (!features.memory.enabled) {
    return Response.json({ error: "Memory ist deaktiviert" }, { status: 404 })
  }

  const auth = await requireAuth()
  if (auth.error) return auth.error

  const rateCheck = checkRateLimit(auth.user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  try {
    await deleteAllMemories(auth.user.id)
    return Response.json({ ok: true })
  } catch (error) {
    console.error("[memory] Delete all failed:", error instanceof Error ? error.message : error)
    return Response.json({ error: "Memory-Service nicht erreichbar" }, { status: 503 })
  }
}
