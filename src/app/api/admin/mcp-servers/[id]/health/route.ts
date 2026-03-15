import { requireAdmin } from "@/lib/admin-guard"
import { getMcpServerById } from "@/lib/db/queries/mcp-servers"
import { resolveEnvVars, resolveHeaders } from "@/config/mcp"
import { isAllowedUrl } from "@/lib/url-validation"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"

const ID_PATTERN = /^[a-zA-Z0-9_-]{1,21}$/
const HEALTH_TIMEOUT = 5000

/** POST /api/admin/mcp-servers/[id]/health — Check MCP server connectivity */
export async function POST(
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

    // Check env var gate
    if (server.envVar && !process.env[server.envVar]) {
      return Response.json({
        status: "error",
        message: `Env-Variable "${server.envVar}" ist nicht gesetzt`,
      })
    }

    const resolvedUrl = resolveEnvVars(server.url)

    // SSRF protection
    if (!isAllowedUrl(resolvedUrl)) {
      return Response.json({
        status: "error",
        message: "URL nicht erlaubt (interne Adresse blockiert)",
      })
    }

    const { createMCPClient } = await import("@ai-sdk/mcp")
    const resolvedHeaderValues = resolveHeaders(server.headers ?? undefined)
    const transport = server.transport === "http" ? "http" as const : "sse" as const

    try {
      const client = await Promise.race([
        createMCPClient({
          transport: {
            type: transport,
            url: resolvedUrl,
            headers: resolvedHeaderValues,
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout (5s)")), HEALTH_TIMEOUT)
        ),
      ])

      const tools = await client.tools()
      const toolNames = Object.keys(tools)

      await client.close()

      return Response.json({
        status: "ok",
        toolCount: toolNames.length,
        tools: toolNames,
      })
    } catch (error) {
      return Response.json({
        status: "error",
        message: error instanceof Error ? error.message : "Verbindung fehlgeschlagen",
      })
    }
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }
}
