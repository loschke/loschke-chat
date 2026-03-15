import { features } from "@/config/features"
import { createArtifactTool } from "@/lib/ai/tools/create-artifact"
import { askUserTool } from "@/lib/ai/tools/ask-user"
import { webSearchTool } from "@/lib/ai/tools/web-search"
import { webFetchTool } from "@/lib/ai/tools/web-fetch"
import { createLoadSkillTool } from "@/lib/ai/tools/load-skill"
import { createSaveMemoryTool } from "@/lib/ai/tools/save-memory"
import type { SkillMetadata } from "@/lib/ai/skills/discovery"
import type { MCPHandle } from "@/lib/mcp"

interface BuildToolsParams {
  chatId: string
  userId: string
  skills: SkillMetadata[]
  hasQuicktask: boolean
  searchEnabled?: boolean
  memoryEnabled?: boolean
  mcpEnabled?: boolean
  expertMcpServerIds?: string[]
  expertAllowedTools?: string[]
}

interface BuildToolsResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: Record<string, any>
  mcpHandle: MCPHandle | null
}

/**
 * Build the tool registry for a chat request.
 * Includes built-in tools and optionally MCP tools.
 */
export async function buildTools(params: BuildToolsParams): Promise<BuildToolsResult> {
  const { chatId, userId, skills, hasQuicktask, searchEnabled, memoryEnabled, mcpEnabled, expertMcpServerIds, expertAllowedTools } = params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: Record<string, any> = {
    create_artifact: createArtifactTool(chatId),
    ask_user: askUserTool,
  }

  if (searchEnabled ?? features.search.enabled) {
    tools.web_search = webSearchTool
    tools.web_fetch = webFetchTool
  }

  // Add save_memory tool if memory is enabled for this user
  if (memoryEnabled && features.memory.enabled) {
    tools.save_memory = createSaveMemoryTool(userId)
  }

  // Add load_skill tool if skills are available (skip for quicktasks — self-contained)
  if (skills.length > 0 && !hasQuicktask) {
    tools.load_skill = createLoadSkillTool(skills)
  }

  // MCP tools
  let mcpHandle: MCPHandle | null = null

  // Reserved built-in tool names — MCP tools must not override these
  const RESERVED_TOOLS = new Set(Object.keys(tools))

  if (mcpEnabled && features.mcp.enabled) {
    try {
      const { getActiveMCPServersForExpert } = await import("@/config/mcp")
      const { connectMCPServers } = await import("@/lib/mcp")

      const servers = await getActiveMCPServersForExpert(expertMcpServerIds)

      if (servers.length > 0) {
        mcpHandle = await connectMCPServers(servers)

        // Merge MCP tools, applying collision guard and allowedTools filter
        for (const [name, tool] of Object.entries(mcpHandle.tools)) {
          // Block MCP tools that collide with built-in tool names
          if (RESERVED_TOOLS.has(name)) {
            console.warn(`[MCP] Blocked tool "${name}" — reserved built-in name`)
            continue
          }
          if (expertAllowedTools && expertAllowedTools.length > 0) {
            if (!expertAllowedTools.includes(name)) continue
          }
          tools[name] = tool
        }
      }
    } catch (error) {
      console.warn("[MCP] Failed to connect MCP servers:", error instanceof Error ? error.message : error)
    }
  }

  return { tools, mcpHandle }
}
