import { requireAdmin } from "@/lib/admin-guard"
import { checkBodySize } from "@/lib/api-guards"
import { getAllMcpServers, upsertMcpServerByServerId } from "@/lib/db/queries/mcp-servers"
import { importMcpServersSchema } from "@/lib/validations/mcp-server"
import { clearMcpServerCache } from "@/config/mcp"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"

/** GET /api/admin/mcp-servers — All MCP servers including inactive */
export async function GET() {
  try {
    const admin = await requireAdmin()
    const rateCheck = checkRateLimit(admin.userId, RATE_LIMITS.api)
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

    const servers = await getAllMcpServers()
    return Response.json(servers)
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }
}

/** POST /api/admin/mcp-servers — Import MCP servers (JSON array) */
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin()
    const rateCheck = checkRateLimit(admin.userId, RATE_LIMITS.api)
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

    const sizeError = checkBodySize(req)
    if (sizeError) return sizeError

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "Ungültiges JSON" }, { status: 400 })
    }

    const parsed = importMcpServersSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Anfrage" }, { status: 400 })
    }

    // ⚡ Bolt: Optimize bulk I/O by replacing sequential for...of loop with Promise.all
    const importResults = await Promise.all(
      parsed.data.map((server) => upsertMcpServerByServerId(server))
    )
    const results = importResults.map((result) => ({
      serverId: result.serverId,
      name: result.name,
      id: result.id,
    }))

    clearMcpServerCache()

    return Response.json({ imported: results.length, servers: results }, { status: 201 })
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }
}
