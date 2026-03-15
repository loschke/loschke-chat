import { z } from "zod"
import { upsertMcpServerByServerId } from "@/lib/db/queries/mcp-servers"
import type { CreateMcpServerInput } from "@/lib/db/queries/mcp-servers"

const mcpServerConfigSchema = z.object({
  serverId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  url: z.string().min(1),
  transport: z.enum(["sse", "http"]).default("sse"),
  headers: z.record(z.string(), z.string()).optional(),
  envVar: z.string().optional(),
  enabledTools: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
})

/**
 * Seed MCP servers from MCP_SERVERS_CONFIG ENV into DB.
 * Does nothing if ENV is not set.
 */
export async function seedMcpServers() {
  const envConfig = process.env.MCP_SERVERS_CONFIG
  if (!envConfig) {
    console.log("  ⊘ MCP_SERVERS_CONFIG not set, skipping MCP server seed")
    return
  }

  let serversToSeed: CreateMcpServerInput[] = []

  try {
    const raw = JSON.parse(envConfig)
    const result = z.array(mcpServerConfigSchema).min(1).safeParse(raw)
    if (result.success) {
      serversToSeed = result.data.map((s, i) => ({
        serverId: s.serverId,
        name: s.name,
        description: s.description,
        url: s.url,
        transport: s.transport,
        headers: s.headers,
        envVar: s.envVar,
        enabledTools: s.enabledTools,
        isActive: s.isActive,
        sortOrder: s.sortOrder ?? i,
      }))
    } else {
      console.warn("MCP_SERVERS_CONFIG validation failed:", result.error.flatten().fieldErrors)
      return
    }
  } catch (e) {
    console.error("Failed to parse MCP_SERVERS_CONFIG:", e)
    return
  }

  for (const server of serversToSeed) {
    try {
      const result = await upsertMcpServerByServerId(server)
      console.log(`  ✓ ${server.name} (${server.serverId}) → ${result.id}`)
    } catch (err) {
      console.error(`  ✗ ${server.name} (${server.serverId}):`, err instanceof Error ? err.message : err)
    }
  }
}
