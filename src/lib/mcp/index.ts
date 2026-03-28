import { createMCPClient } from "@ai-sdk/mcp"

import type { MCPServerConfig } from "@/config/mcp"
import { resolveHeaders } from "@/config/mcp"
import { isAllowedUrl } from "@/lib/url-validation"
import { getErrorMessage } from "@/lib/errors"

const CONNECTION_TIMEOUT = 5000
const CLOSE_TIMEOUT = 5000

export interface MCPHandle {
  /** Merged tools from all connected servers, prefixed with server ID */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: Record<string, any>
  /** Close all connections */
  close: () => Promise<void>
}

/** Connect to a single MCP server and return its tools (prefixed) */
async function connectServer(
  config: MCPServerConfig
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ tools: Record<string, any>; close: () => Promise<void> } | null> {
  try {
    // SSRF protection: validate resolved URL against blocklist
    if (!isAllowedUrl(config.url)) {
      console.warn(`[MCP] Blocked connection to ${config.id}: URL not allowed`)
      return null
    }

    const client = await Promise.race([
      createMCPClient({
        transport: {
          type: config.transport ?? "sse",
          url: config.url,
          headers: resolveHeaders(config.headers),
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`MCP timeout: ${config.id}`)),
          CONNECTION_TIMEOUT
        )
      ),
    ])

    const tools = await client.tools()

    // Prefix tool names to avoid collisions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prefixed: Record<string, any> = {}
    for (const [name, tool] of Object.entries(tools)) {
      // Apply enabledTools filter if set
      if (config.enabledTools && !config.enabledTools.includes(name)) continue
      prefixed[`${config.id}__${name}`] = tool
    }

    return {
      tools: prefixed,
      close: () => client.close(),
    }
  } catch (error) {
    // Redacted: never log resolved headers/URLs (may contain secrets)
    console.warn(
      `[MCP] Failed to connect to ${config.id}:`,
      getErrorMessage(error)
    )
    return null
  }
}

/** Connect to multiple MCP servers in parallel, merge their tools */
export async function connectMCPServers(
  configs: MCPServerConfig[]
): Promise<MCPHandle> {
  if (configs.length === 0) {
    return { tools: {}, close: async () => {} }
  }

  const results = await Promise.all(configs.map(connectServer))
  const connected = results.filter(
    (r): r is NonNullable<typeof r> => r !== null
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mergedTools: Record<string, any> = {}
  for (const result of connected) {
    Object.assign(mergedTools, result.tools)
  }

  return {
    tools: mergedTools,
    close: async () => {
      // Timeout on close to prevent hanging connections
      await Promise.allSettled(
        connected.map((r) =>
          Promise.race([
            r.close(),
            new Promise<void>((resolve) => setTimeout(resolve, CLOSE_TIMEOUT)),
          ])
        )
      )
    },
  }
}
