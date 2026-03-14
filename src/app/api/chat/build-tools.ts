import { features } from "@/config/features"
import { createArtifactTool } from "@/lib/ai/tools/create-artifact"
import { askUserTool } from "@/lib/ai/tools/ask-user"
import { webSearchTool } from "@/lib/ai/tools/web-search"
import { webFetchTool } from "@/lib/ai/tools/web-fetch"
import { createLoadSkillTool } from "@/lib/ai/tools/load-skill"
import type { SkillMetadata } from "@/lib/ai/skills/discovery"

interface BuildToolsParams {
  chatId: string
  skills: SkillMetadata[]
  hasQuicktask: boolean
  searchEnabled?: boolean
}

/**
 * Build the tool registry for a chat request.
 */
// AI SDK tool registry uses dynamic shapes — no common Tool interface available
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildTools(params: BuildToolsParams): Record<string, any> {
  const { chatId, skills, hasQuicktask, searchEnabled } = params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: Record<string, any> = {
    create_artifact: createArtifactTool(chatId),
    ask_user: askUserTool,
  }

  if (searchEnabled ?? features.search.enabled) {
    tools.web_search = webSearchTool
    tools.web_fetch = webFetchTool
  }

  // Add load_skill tool if skills are available (skip for quicktasks — self-contained)
  if (skills.length > 0 && !hasQuicktask) {
    tools.load_skill = createLoadSkillTool(skills)
  }

  return tools
}
