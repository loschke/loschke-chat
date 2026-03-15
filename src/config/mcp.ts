/**
 * MCP Server Registry — DB-backed with ENV fallback.
 *
 * Resolution chain: DB → ENV (MCP_SERVERS_CONFIG) → empty array
 * Uses 60s TTL cache to avoid excessive DB queries.
 */

export interface MCPServerConfig {
  /** Unique ID, used as prefix for tool names (e.g. "github" → "github__list_repos") */
  id: string
  /** Display name for logging */
  name: string
  /** SSE/HTTP endpoint URL. Can reference env vars via ${VAR} syntax */
  url: string
  /** Transport type */
  transport: "sse" | "http"
  /** Env var that gates this server. Server is only active if this var is set */
  envVar?: string
  /** Auth headers. Values support ${VAR} syntax for env var interpolation */
  headers?: Record<string, string>
  /** Tool allowlist. undefined = all tools, string[] = only these tools */
  enabledTools?: string[]
}

// --- Cache ---
let cachedServers: MCPServerConfig[] | null = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 60_000

/** Clear MCP server cache (call after admin mutations) */
export function clearMcpServerCache() {
  cachedServers = null
  cacheTimestamp = 0
}

/** Resolve ${VAR} placeholders in a string using process.env */
export function resolveEnvVars(value: string): string {
  return value.replace(/\$\{(\w+)\}/g, (_, name) => process.env[name] ?? "")
}

/** Resolve all header values */
export function resolveHeaders(
  headers?: Record<string, string>
): Record<string, string> | undefined {
  if (!headers) return undefined
  const resolved: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    resolved[key] = resolveEnvVars(value)
  }
  return resolved
}

/** Map a DB row to MCPServerConfig */
function dbRowToConfig(row: {
  serverId: string
  name: string
  url: string
  transport: string
  envVar: string | null
  headers: Record<string, string> | null
  enabledTools: string[] | null
}): MCPServerConfig {
  return {
    id: row.serverId,
    name: row.name,
    url: row.url,
    transport: (row.transport as "sse" | "http") ?? "sse",
    envVar: row.envVar ?? undefined,
    headers: row.headers ?? undefined,
    enabledTools: row.enabledTools ?? undefined,
  }
}

/** Parse MCP servers from ENV (sync fallback when DB is unavailable) */
function parseServersFromEnv(): MCPServerConfig[] {
  const envConfig = process.env.MCP_SERVERS_CONFIG
  if (!envConfig) return []
  try {
    const raw = JSON.parse(envConfig)
    if (Array.isArray(raw)) {
      return raw.map((s) => ({
        id: s.serverId ?? s.id,
        name: s.name,
        url: s.url,
        transport: s.transport ?? "sse",
        envVar: s.envVar,
        headers: s.headers,
        enabledTools: s.enabledTools,
      }))
    }
  } catch (e) {
    console.error("Failed to parse MCP_SERVERS_CONFIG:", e)
  }
  return []
}

/**
 * Get all active MCP servers. Async with DB-backed resolution.
 * Fallback chain: DB → ENV (MCP_SERVERS_CONFIG) → empty array
 */
export async function getMcpServers(): Promise<MCPServerConfig[]> {
  const now = Date.now()
  if (cachedServers && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedServers
  }

  try {
    const { getActiveMcpServers } = await import("@/lib/db/queries/mcp-servers")
    const dbServers = await getActiveMcpServers()
    if (dbServers.length > 0) {
      cachedServers = dbServers.map(dbRowToConfig)
      cacheTimestamp = now
      return cachedServers
    }
  } catch {
    // DB not available — fall through to ENV
  }

  cachedServers = parseServersFromEnv()
  cacheTimestamp = now
  return cachedServers
}

/**
 * Get active MCP servers filtered for a specific expert.
 * Applies envVar gate and expert mcpServerIds filter.
 * Resolves ${VAR} placeholders in URLs.
 */
export async function getActiveMCPServersForExpert(
  mcpServerIds?: string[]
): Promise<MCPServerConfig[]> {
  const servers = await getMcpServers()

  return servers
    .filter((server) => {
      // Check env var gate
      if (server.envVar && !process.env[server.envVar]) return false
      // Check expert restriction (if expert has mcpServerIds set, only those)
      if (mcpServerIds && mcpServerIds.length > 0 && !mcpServerIds.includes(server.id)) return false
      return true
    })
    .map((server) => ({
      ...server,
      url: resolveEnvVars(server.url),
    }))
}
