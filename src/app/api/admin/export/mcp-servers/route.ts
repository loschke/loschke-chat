import { requireAdmin } from "@/lib/admin-guard"
import { getAllMcpServers } from "@/lib/db/queries/mcp-servers"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"

/** GET /api/admin/export/mcp-servers — Bulk export all MCP servers as JSON */
export async function GET() {
  try {
    const admin = await requireAdmin()
    const rateCheck = checkRateLimit(admin.userId, RATE_LIMITS.api)
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

    const servers = await getAllMcpServers()

    // Map to import-compatible format
    const exportData = servers.map((s) => ({
      serverId: s.serverId,
      name: s.name,
      description: s.description,
      url: s.url,
      transport: s.transport,
      headers: s.headers,
      envVar: s.envVar,
      enabledTools: s.enabledTools,
      isActive: s.isActive,
      sortOrder: s.sortOrder,
    }))

    return Response.json(exportData)
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }
}
