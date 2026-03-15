import { requireAdmin } from "@/lib/admin-guard"
import { getMcpServerById, updateMcpServer, deleteMcpServer } from "@/lib/db/queries/mcp-servers"
import { updateMcpServerSchema } from "@/lib/validations/mcp-server"
import { clearMcpServerCache } from "@/config/mcp"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"

const ID_PATTERN = /^[a-zA-Z0-9_-]{1,21}$/

/** GET /api/admin/mcp-servers/[id] — Get single MCP server by DB ID */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    const rateCheck = checkRateLimit(admin.userId, RATE_LIMITS.api)
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

    const { id } = await params
    if (!ID_PATTERN.test(id)) {
      return Response.json({ error: "Ungültige Server-ID" }, { status: 400 })
    }

    const server = await getMcpServerById(id)
    if (!server) {
      return Response.json({ error: "MCP-Server nicht gefunden" }, { status: 404 })
    }

    return Response.json(server)
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }
}

/** PATCH /api/admin/mcp-servers/[id] — Update MCP server fields */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    const rateCheck = checkRateLimit(admin.userId, RATE_LIMITS.api)
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

    const { id } = await params
    if (!ID_PATTERN.test(id)) {
      return Response.json({ error: "Ungültige Server-ID" }, { status: 400 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "Ungültiges JSON" }, { status: 400 })
    }

    const parsed = updateMcpServerSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Anfrage" }, { status: 400 })
    }

    const updated = await updateMcpServer(id, parsed.data)
    if (!updated) {
      return Response.json({ error: "MCP-Server nicht gefunden" }, { status: 404 })
    }

    clearMcpServerCache()
    return Response.json(updated)
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }
}

/** PUT /api/admin/mcp-servers/[id] — Full MCP server update */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return PATCH(req, { params })
}

/** DELETE /api/admin/mcp-servers/[id] — Delete MCP server */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    const rateCheck = checkRateLimit(admin.userId, RATE_LIMITS.api)
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

    const { id } = await params
    if (!ID_PATTERN.test(id)) {
      return Response.json({ error: "Ungültige Server-ID" }, { status: 400 })
    }

    const deleted = await deleteMcpServer(id)
    if (!deleted) {
      return Response.json({ error: "MCP-Server nicht gefunden" }, { status: 404 })
    }

    clearMcpServerCache()
    return Response.json({ success: true })
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }
}
