import { getActiveSkills, getActiveQuicktasks, getSkillBySlug, getSkillsForUser, getQuicktasksForUser } from "@/lib/db/queries/skills"
import { skillResources } from "@/lib/db/schema/skill-resources"
import { getDb } from "@/lib/db"
import { features } from "@/config/features"
import type { SkillFieldSchema as SkillField } from "@/lib/db/schema/skills"

export type { SkillField }

export interface SkillMetadata {
  slug: string
  name: string
  description: string
  mode: "skill" | "quicktask"
  category?: string
  icon?: string
  fields?: SkillField[]
  outputAsArtifact?: boolean
  temperature?: number
  modelId?: string
  hasResources?: boolean
}

/** Cache with TTL for discovered skills */
let cachedSkills: SkillMetadata[] | null = null
let cachedQuicktasks: SkillMetadata[] | null = null
let skillsCacheTimestamp = 0
let quicktasksCacheTimestamp = 0
const CACHE_TTL = 60_000 // 60 seconds

function isSkillsCacheValid(): boolean {
  return Date.now() - skillsCacheTimestamp < CACHE_TTL
}

function isQuicktasksCacheValid(): boolean {
  return Date.now() - quicktasksCacheTimestamp < CACHE_TTL
}

function mapToMetadata(row: Awaited<ReturnType<typeof getActiveSkills>>[number]): SkillMetadata {
  return {
    slug: row.slug,
    name: row.name,
    description: row.description,
    mode: row.mode as "skill" | "quicktask",
    category: row.category ?? undefined,
    icon: row.icon ?? undefined,
    fields: (row.fields as SkillField[] | null) ?? undefined,
    outputAsArtifact: row.outputAsArtifact,
    temperature: (row.temperature as number | null) ?? undefined,
    modelId: row.modelId ?? undefined,
  }
}

/**
 * Discover all available skills from DB.
 * Results are cached with 60s TTL.
 * Returns empty array if skills table doesn't exist yet.
 */
export async function discoverSkills(): Promise<SkillMetadata[]> {
  if (cachedSkills && isSkillsCacheValid()) return cachedSkills

  try {
    const [rows, resourceRows] = await Promise.all([
      getActiveSkills(),
      getDb()
        .selectDistinct({ skillId: skillResources.skillId })
        .from(skillResources),
    ])
    const skillIdsWithResources = new Set(resourceRows.map((r) => r.skillId))
    cachedSkills = rows.map((row) => ({
      ...mapToMetadata(row),
      hasResources: skillIdsWithResources.has(row.id),
    }))
    cachedQuicktasks = null // invalidate derived cache
    skillsCacheTimestamp = Date.now()
    return cachedSkills
  } catch {
    // Table may not exist yet (before db:push)
    return []
  }
}

/**
 * Get the content of a specific skill by slug.
 * If userId provided, checks user-owned first, then public, then global.
 */
export async function getSkillContent(slug: string, userId?: string): Promise<string | null> {
  const skill = await getSkillBySlug(slug, userId)
  if (!skill || !skill.isActive) return null
  return skill.content
}

/**
 * Discover only quicktask skills (mode === "quicktask").
 */
export async function discoverQuicktasks(): Promise<SkillMetadata[]> {
  if (cachedQuicktasks && isQuicktasksCacheValid()) return cachedQuicktasks

  try {
    const rows = await getActiveQuicktasks()
    cachedQuicktasks = rows.map(mapToMetadata)
    quicktasksCacheTimestamp = Date.now()
    return cachedQuicktasks
  } catch {
    return []
  }
}

/**
 * Discover skills for a specific user: cached globals + fresh user-owned + public user-skills.
 * De-duplicates by slug (user-owned wins over public, public wins over global).
 * When userSkills feature is disabled, returns only global skills.
 */
export async function discoverSkillsForUser(userId: string): Promise<SkillMetadata[]> {
  if (!features.userSkills.enabled) return discoverSkills()

  try {
    const [globalSkills, userSkills] = await Promise.all([
      discoverSkills(), // cached globals
      getSkillsForUser(userId), // fresh: own + public user-skills
    ])

    // User skills take priority over globals on slug collision
    const slugMap = new Map<string, SkillMetadata>()
    for (const s of globalSkills) {
      slugMap.set(s.slug, s)
    }
    for (const row of userSkills) {
      // User's own skill always wins over global; public user-skill also wins over global
      slugMap.set(row.slug, mapToMetadata(row))
    }

    return Array.from(slugMap.values())
  } catch {
    return discoverSkills()
  }
}

/**
 * Discover quicktasks for a specific user: cached globals + fresh user quicktasks.
 * When userSkills feature is disabled, returns only global quicktasks.
 */
export async function discoverQuicktasksForUser(userId: string): Promise<SkillMetadata[]> {
  if (!features.userSkills.enabled) return discoverQuicktasks()

  try {
    const [globalQuicktasks, userQuicktasks] = await Promise.all([
      discoverQuicktasks(), // cached globals
      getQuicktasksForUser(userId), // fresh: own + public
    ])

    const slugMap = new Map<string, SkillMetadata>()
    for (const s of globalQuicktasks) {
      slugMap.set(s.slug, s)
    }
    for (const row of userQuicktasks) {
      slugMap.set(row.slug, mapToMetadata(row))
    }

    return Array.from(slugMap.values())
  } catch {
    return discoverQuicktasks()
  }
}

/** Clear the skill cache (after admin mutations) */
export function clearSkillCache(): void {
  cachedSkills = null
  cachedQuicktasks = null
  skillsCacheTimestamp = 0
  quicktasksCacheTimestamp = 0
}
