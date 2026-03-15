import { features } from "@/config/features"
import { aiDefaults } from "@/config/ai"
import { SYSTEM_PROMPTS, buildSystemPrompt } from "@/config/prompts"
import { createChat, getChatById } from "@/lib/db/queries/chats"
import { getUserPreferences } from "@/lib/db/queries/users"
import { getExpertById } from "@/lib/db/queries/experts"
import { getModelById, getModels } from "@/config/models"
import { discoverSkills, getSkillContent } from "@/lib/ai/skills/discovery"
import { renderTemplate } from "@/lib/ai/skills/template"
import type { SkillMetadata } from "@/lib/ai/skills/discovery"

export interface ChatContext {
  resolvedChatId: string
  isNewChat: boolean
  expert: Awaited<ReturnType<typeof getExpertById>> | null
  systemPrompt: string
  finalModelId: string
  effectiveTemperature: number
  skills: SkillMetadata[]
  quicktaskPrompt: string | null
}

interface ResolveContextParams {
  userId: string
  requestChatId?: string
  requestExpertId?: string
  requestModelId?: string
  quicktaskSlug?: string
  quicktaskData?: Record<string, string>
}

/**
 * Resolve all context needed for a chat request:
 * Chat/Expert/Model/Skills resolution, system prompt assembly.
 * Returns ChatContext on success, or a Response on validation failure.
 */
export async function resolveContext(params: ResolveContextParams): Promise<ChatContext | Response> {
  const { userId, requestChatId, requestExpertId, requestModelId, quicktaskSlug, quicktaskData } = params

  const modelId = requestModelId ?? aiDefaults.model

  // Phase A: Parallelize independent queries (chat lookup, user prefs, skills, models cache warm-up)
  const [existingChat, userPrefs, allSkills] = await Promise.all([
    requestChatId ? getChatById(requestChatId) : null,
    getUserPreferences(userId),
    discoverSkills(),
    getModels(), // Warm model cache from DB for sync getModelById() calls below
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

    const newChat = await createChat(userId, {
      modelId,
      expertId: expert?.id,
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

  // Build system prompt with expert persona, quicktask, and skills
  const systemPrompt = buildSystemPrompt({
    expert: expert ? {
      systemPrompt: expert.systemPrompt,
      skillSlugs: expert.skillSlugs as string[],
    } : undefined,
    skills: quicktaskPrompt ? undefined : skills,
    quicktask: quicktaskPrompt,
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
  }
}

/** Re-export for use in persist.ts */
export { SYSTEM_PROMPTS }
