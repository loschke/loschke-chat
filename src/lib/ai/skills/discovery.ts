import { getActiveSkills, getActiveQuicktasks, getSkillBySlug } from "@/lib/db/queries/skills"

export interface SkillField {
  key: string
  label: string
  type: "text" | "textarea" | "select"
  required?: boolean
  placeholder?: string
  options?: string[]
}

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
}

/** Cache with TTL for discovered skills */
let cachedSkills: SkillMetadata[] | null = null
let cachedQuicktasks: SkillMetadata[] | null = null
let cacheTimestamp = 0
const CACHE_TTL = 60_000 // 60 seconds

function isCacheValid(): boolean {
  return Date.now() - cacheTimestamp < CACHE_TTL
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
  if (cachedSkills && isCacheValid()) return cachedSkills

  try {
    const rows = await getActiveSkills()
    cachedSkills = rows.map(mapToMetadata)
    cachedQuicktasks = null // invalidate derived cache
    cacheTimestamp = Date.now()
    return cachedSkills
  } catch {
    // Table may not exist yet (before db:push)
    return []
  }
}

/**
 * Get the content of a specific skill by slug.
 * Returns the markdown content, or null if not found.
 */
export async function getSkillContent(slug: string): Promise<string | null> {
  const skill = await getSkillBySlug(slug)
  if (!skill || !skill.isActive) return null
  return skill.content
}

/**
 * Discover only quicktask skills (mode === "quicktask").
 */
export async function discoverQuicktasks(): Promise<SkillMetadata[]> {
  if (cachedQuicktasks && isCacheValid()) return cachedQuicktasks

  try {
    const rows = await getActiveQuicktasks()
    cachedQuicktasks = rows.map(mapToMetadata)
    return cachedQuicktasks
  } catch {
    return []
  }
}

/** Clear the skill cache (after admin mutations) */
export function clearSkillCache(): void {
  cachedSkills = null
  cachedQuicktasks = null
  cacheTimestamp = 0
}
