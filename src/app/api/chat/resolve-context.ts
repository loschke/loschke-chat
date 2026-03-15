import { features } from "@/config/features"
import { aiDefaults } from "@/config/ai"
import { SYSTEM_PROMPTS, buildSystemPrompt } from "@/config/prompts"
import { createChat, getChatById } from "@/lib/db/queries/chats"
import { getUserPreferences } from "@/lib/db/queries/users"
import { getExpertById } from "@/lib/db/queries/experts"
import { getProjectById } from "@/lib/db/queries/projects"
import { getModelById, getModels } from "@/config/models"
import { discoverSkills, getSkillContent } from "@/lib/ai/skills/discovery"
import { renderTemplate } from "@/lib/ai/skills/template"
import { searchMemories, formatMemoriesForPrompt } from "@/lib/memory"
import type { SkillMetadata } from "@/lib/ai/skills/discovery"
import type { MemoryEntry } from "@/lib/memory"

export interface ChatContext {
  resolvedChatId: string
  isNewChat: boolean
  expert: Awaited<ReturnType<typeof getExpertById>> | null
  systemPrompt: string
  finalModelId: string
  effectiveTemperature: number
  skills: SkillMetadata[]
  quicktaskPrompt: string | null
  projectId: string | null
  projectName: string | null
  mcpServerIds: string[]
  allowedTools: string[]
  memoriesLoaded: number
  memories: Array<{ text: string; score?: number }>
  userMemoryEnabled: boolean
}

interface ResolveContextParams {
  userId: string
  requestChatId?: string
  requestExpertId?: string
  requestModelId?: string
  requestProjectId?: string
  quicktaskSlug?: string
  quicktaskData?: Record<string, string>
  messages?: Array<{ role: string; parts?: Array<{ type: string; text?: string }> }>
}

/**
 * Resolve all context needed for a chat request:
 * Chat/Expert/Model/Skills resolution, system prompt assembly.
 * Returns ChatContext on success, or a Response on validation failure.
 */
/** Extract last user message text for memory search query, truncated to 500 chars */
function extractSearchQuery(params: ResolveContextParams): string {
  if (!params.messages?.length) return ""
  for (let i = params.messages.length - 1; i >= 0; i--) {
    const msg = params.messages[i]
    if (msg.role !== "user") continue
    const text = msg.parts
      ?.filter((p) => p.type === "text" && p.text)
      .map((p) => p.text!)
      .join(" ") ?? ""
    if (text.trim()) return text.slice(0, 500)
  }
  return ""
}

export async function resolveContext(params: ResolveContextParams): Promise<ChatContext | Response> {
  const { userId, requestChatId, requestExpertId, requestModelId, requestProjectId, quicktaskSlug, quicktaskData } = params

  const modelId = requestModelId ?? aiDefaults.model

  // Phase A: Parallelize independent queries (chat lookup, user prefs, skills, models + MCP cache warm-up + memory search)
  const mcpCacheWarmup = features.mcp.enabled
    ? import("@/config/mcp").then((m) => m.getMcpServers()).catch(() => [])
    : Promise.resolve([])

  const [existingChat, userPrefs, allSkills] = await Promise.all([
    requestChatId ? getChatById(requestChatId) : null,
    getUserPreferences(userId),
    discoverSkills(),
    getModels(), // Warm model cache from DB for sync getModelById() calls below
    mcpCacheWarmup, // Warm MCP cache in parallel
  ])

  // Validate model ID against registry (cache now warm)
  if (!getModelById(modelId)) {
    return Response.json({ error: "Ungültiges Modell" }, { status: 400 })
  }

  const customInstructions = userPrefs.customInstructions
  const skills = allSkills.filter((s) => s.mode === "skill")

  // Resolve or create chat + load expert (depends on chat result)
  let isNewChat = false
  let resolvedChatId: string
  let expert: Awaited<ReturnType<typeof getExpertById>> | null = null

  // Resolve project early (needed for createChat and defaultExpertId)
  let project: Awaited<ReturnType<typeof getProjectById>> | null = null
  const effectiveProjectId = requestProjectId ?? existingChat?.projectId ?? null
  if (effectiveProjectId) {
    project = await getProjectById(effectiveProjectId)
    if (project && project.userId !== userId) {
      project = null
    }
  }

  if (requestChatId) {
    if (!existingChat || existingChat.userId !== userId) {
      return Response.json({ error: "Chat nicht gefunden" }, { status: 404 })
    }
    resolvedChatId = requestChatId

    // Phase B: Load expert (depends on chat result)
    const expertId = requestExpertId ?? existingChat.expertId
    if (expertId) {
      expert = await getExpertById(expertId)
      if (expert && expert.userId !== null && expert.userId !== userId) {
        expert = null
      }
    }
  } else {
    // Validate expertId if provided
    if (requestExpertId) {
      expert = await getExpertById(requestExpertId)
      if (!expert || (expert.userId !== null && expert.userId !== userId)) {
        return Response.json({ error: "Expert nicht gefunden" }, { status: 400 })
      }
    }

    // Use project's defaultExpertId if no expert selected
    if (!expert && project?.defaultExpertId) {
      expert = await getExpertById(project.defaultExpertId)
      if (expert && expert.userId !== null && expert.userId !== userId) {
        expert = null
      }
    }

    const newChat = await createChat(userId, {
      modelId,
      expertId: expert?.id,
      projectId: project?.id,
    })
    resolvedChatId = newChat.id
    isNewChat = true
  }

  // Resolve quicktask if provided
  let quicktaskPrompt: string | null = null
  let quicktaskMeta: { modelId?: string; temperature?: number } | null = null

  if (quicktaskSlug) {
    const quicktask = allSkills.find((s) => s.slug === quicktaskSlug && s.mode === "quicktask")
    if (quicktask) {
      const content = await getSkillContent(quicktaskSlug)
      if (content) {
        quicktaskPrompt = renderTemplate(content, quicktaskData ?? {})
        if (quicktask.outputAsArtifact) {
          quicktaskPrompt += "\n\nWICHTIG: Erstelle das Ergebnis als Artifact mit dem `create_artifact` Tool."
        }
        quicktaskMeta = {
          modelId: quicktask.modelId,
          temperature: quicktask.temperature,
        }
      }
    }
  }

  // Memory search: only on new chats + user opt-in + instance feature enabled
  let memories: MemoryEntry[] = []
  if (isNewChat && features.memory.enabled && userPrefs.memoryEnabled) {
    const searchQuery = extractSearchQuery(params)
    if (searchQuery) {
      memories = await Promise.race([
        searchMemories(userId, searchQuery),
        new Promise<MemoryEntry[]>((resolve) => setTimeout(() => resolve([]), 3000)),
      ]).catch(() => [] as MemoryEntry[])
    }
  }

  const memoryContext = memories.length > 0
    ? formatMemoriesForPrompt(memories)
    : null

  const systemPrompt = buildSystemPrompt({
    expert: expert ? {
      systemPrompt: expert.systemPrompt,
      skillSlugs: expert.skillSlugs as string[],
    } : undefined,
    skills: quicktaskPrompt ? undefined : skills,
    quicktask: quicktaskPrompt,
    memoryContext,
    projectInstructions: project?.instructions,
    customInstructions,
    webToolsEnabled: features.search.enabled,
  })

  // Model resolution chain: quicktask > expert > user default > system default
  const resolvedModelId = quicktaskMeta?.modelId
    ?? expert?.modelPreference
    ?? userPrefs.defaultModelId
    ?? modelId

  // Temperature resolution: quicktask > expert > system default
  const effectiveTemperature = quicktaskMeta?.temperature
    ?? (expert?.temperature as number | null)
    ?? aiDefaults.temperature

  // Validate resolved model, fall through chain on invalid
  let finalModelId = modelId
  if (getModelById(resolvedModelId)) {
    finalModelId = resolvedModelId
  } else if (expert?.modelPreference && getModelById(expert.modelPreference)) {
    finalModelId = expert.modelPreference
  } else if (userPrefs.defaultModelId && getModelById(userPrefs.defaultModelId)) {
    finalModelId = userPrefs.defaultModelId
  }

  return {
    resolvedChatId,
    isNewChat,
    expert,
    systemPrompt,
    finalModelId,
    effectiveTemperature,
    skills,
    quicktaskPrompt,
    projectId: project?.id ?? null,
    projectName: project?.name ?? null,
    mcpServerIds: (expert?.mcpServerIds as string[]) ?? [],
    allowedTools: (expert?.allowedTools as string[]) ?? [],
    memoriesLoaded: memories.length,
    memories: memories.map((m) => ({
      text: m.memory,
      score: m.score,
    })),
    userMemoryEnabled: userPrefs.memoryEnabled,
  }
}

/** Re-export for use in persist.ts */
export { SYSTEM_PROMPTS }
