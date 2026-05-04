import { features } from "@/config/features"
import { createArtifactTool } from "@/lib/ai/tools/create-artifact"
import { readArtifactTool } from "@/lib/ai/tools/read-artifact"
import { createQuizTool } from "@/lib/ai/tools/create-quiz"
import { createReviewTool } from "@/lib/ai/tools/create-review"
import { askUserTool } from "@/lib/ai/tools/ask-user"
import { contentAlternativesTool } from "@/lib/ai/tools/content-alternatives"
import { webSearchTool } from "@/lib/ai/tools/web-search"
import { webFetchTool } from "@/lib/ai/tools/web-fetch"
import { createLoadSkillTool } from "@/lib/ai/tools/load-skill"
import { createLoadSkillResourceTool } from "@/lib/ai/tools/load-skill-resource"
import { createSaveMemoryTool } from "@/lib/ai/tools/save-memory"
import { createRecallMemoryTool } from "@/lib/ai/tools/recall-memory"
import { suggestMemoryTool } from "@/lib/ai/tools/suggest-memory"
import { generateImageTool, type UploadedImage } from "@/lib/ai/tools/generate-image"
import { youtubeSearchTool } from "@/lib/ai/tools/youtube-search"
import { youtubeAnalyzeTool } from "@/lib/ai/tools/youtube-analyze"
import { lessonsSearchTool } from "@/lib/ai/tools/lessons-search"
import { textToSpeechTool } from "@/lib/ai/tools/text-to-speech"
import { extractBrandingTool } from "@/lib/ai/tools/extract-branding"
import { generateDesignTool } from "@/lib/ai/tools/generate-design"
import { deepResearchTool } from "@/lib/ai/tools/deep-research"
import { googleSearchTool } from "@/lib/ai/tools/google-search"
import { searchDesignLibraryTool } from "@/lib/ai/tools/search-design-library"
import { anthropic as anthropicProvider } from "@ai-sdk/anthropic"
import { isAnthropicModel } from "@/lib/ai/anthropic-skills"
import type { SkillMetadata } from "@/lib/ai/skills/discovery"
import { getErrorMessage } from "@/lib/errors"
import type { MCPHandle } from "@/lib/mcp"

interface BuildToolsParams {
  chatId: string
  userId: string
  skills: SkillMetadata[]
  hasQuicktask: boolean
  /** Model ID to enable model-specific tools (e.g. Anthropic code execution) */
  modelId: string
  searchEnabled?: boolean
  memoryEnabled?: boolean
  mcpEnabled?: boolean
  expertMcpServerIds?: string[]
  expertAllowedTools?: string[]
  /** Disable image generation when privacy routing is active (routes through Google API) */
  imageGenerationEnabled?: boolean
  /** Uploaded images from the current user message (for image combining) */
  uploadedImages?: UploadedImage[]
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
  const { chatId, userId, skills, hasQuicktask, modelId, searchEnabled, memoryEnabled, mcpEnabled, expertMcpServerIds, expertAllowedTools, imageGenerationEnabled, uploadedImages } = params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: Record<string, any> = {
    create_artifact: createArtifactTool(chatId),
    read_artifact: readArtifactTool(chatId),
    create_quiz: createQuizTool(chatId),
    create_review: createReviewTool(chatId),
    ask_user: askUserTool,
    content_alternatives: contentAlternativesTool,
  }

  if (searchEnabled ?? features.search.enabled) {
    tools.web_search = webSearchTool
    tools.web_fetch = webFetchTool
  }

  // Add memory tools if memory is enabled for this user
  if (memoryEnabled && features.memory.enabled) {
    tools.save_memory = createSaveMemoryTool(userId)
    tools.recall_memory = createRecallMemoryTool(userId)
    tools.suggest_memory = suggestMemoryTool
  }

  // Add image generation tools if enabled and no privacy routing
  if ((imageGenerationEnabled ?? features.imageGeneration.enabled)) {
    tools.generate_image = generateImageTool(chatId, userId, uploadedImages)
  }

  // Add YouTube tools if enabled
  if (features.youtube.enabled) {
    tools.youtube_search = youtubeSearchTool(chatId, userId)
  }
  // GenAI-Tutor: lernen.diy-Lessons als Teaser-Cards
  if (features.lessons.enabled) {
    tools.lessons_search = lessonsSearchTool()
  }
  // YouTube Analyze uses Gemini multimodal (same key as image generation)
  if (features.imageGeneration.enabled) {
    tools.youtube_analyze = youtubeAnalyzeTool(chatId, userId)
  }
  if (features.tts.enabled) {
    tools.text_to_speech = textToSpeechTool(chatId, userId)
  }
  if (features.branding.enabled) {
    tools.extract_branding = extractBrandingTool(chatId, userId)
  }
  if (features.stitch.enabled) {
    tools.generate_design = generateDesignTool(chatId, userId)
  }

  // Add design library search tool if enabled
  if (features.designLibrary.enabled) {
    tools.search_design_library = searchDesignLibraryTool(chatId, userId)
  }

  // Add deep research tool if enabled and no privacy routing
  if (features.deepResearch.enabled && (imageGenerationEnabled ?? true)) {
    tools.deep_research = deepResearchTool(chatId, userId)
  }

  // Add Google Search grounding tool if enabled and no privacy routing
  if (features.googleSearch.enabled && (imageGenerationEnabled ?? true)) {
    tools.google_search = googleSearchTool(chatId, userId)
  }

  // Add Anthropic Code Execution tool (required for Agent Skills: PPTX, XLSX, DOCX, PDF)
  if (isAnthropicModel(modelId) && features.anthropicSkills.enabled) {
    tools.code_execution = anthropicProvider.tools.codeExecution_20260120()
  }

  // Add load_skill tool if skills are available (skip for quicktasks — self-contained)
  if (skills.length > 0 && !hasQuicktask) {
    tools.load_skill = createLoadSkillTool(skills, userId)
    if (skills.some((s) => s.hasResources)) {
      tools.load_skill_resource = createLoadSkillResourceTool()
    }
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
      console.warn("[MCP] Failed to connect MCP servers:", getErrorMessage(error))
    }
  }

  return { tools, mcpHandle }
}
