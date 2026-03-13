import fs from "node:fs"
import path from "node:path"
import matter from "gray-matter"

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
  path: string
  mode: "skill" | "quicktask"
  category?: string
  icon?: string
  fields?: SkillField[]
  outputAsArtifact?: boolean
  temperature?: number
  modelId?: string
}

/** Module-level cache for discovered skills */
let cachedSkills: SkillMetadata[] | null = null

/**
 * Discover all available skills by scanning the `skills/` directory.
 * Results are cached at module level (per server process).
 */
export function discoverSkills(): SkillMetadata[] {
  if (cachedSkills) return cachedSkills

  const skillsDir = path.join(process.cwd(), "skills")

  if (!fs.existsSync(skillsDir)) {
    cachedSkills = []
    return cachedSkills
  }

  const entries = fs.readdirSync(skillsDir, { withFileTypes: true })
  const skills: SkillMetadata[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const skillFile = path.join(skillsDir, entry.name, "SKILL.md")
    if (!fs.existsSync(skillFile)) continue

    try {
      const raw = fs.readFileSync(skillFile, "utf-8")
      const { data } = matter(raw)

      if (!data.name || !data.slug || !data.description) continue

      skills.push({
        slug: String(data.slug),
        name: String(data.name),
        description: String(data.description),
        path: skillFile,
        mode: data.mode === "quicktask" ? "quicktask" : "skill",
        category: data.category ? String(data.category) : undefined,
        icon: data.icon ? String(data.icon) : undefined,
        fields: Array.isArray(data.fields) ? data.fields : undefined,
        outputAsArtifact: data.outputAsArtifact === true,
        temperature: typeof data.temperature === "number" ? data.temperature : undefined,
        modelId: data.modelId ? String(data.modelId) : undefined,
      })
    } catch {
      // Skip malformed skill files
    }
  }

  cachedSkills = skills
  return cachedSkills
}

/**
 * Get the content of a specific skill by slug.
 * Returns the markdown content without frontmatter, or null if not found.
 */
export function getSkillContent(slug: string): string | null {
  const skills = discoverSkills()
  const skill = skills.find((s) => s.slug === slug)
  if (!skill) return null

  try {
    const raw = fs.readFileSync(skill.path, "utf-8")
    const { content } = matter(raw)
    return content.trim()
  } catch {
    return null
  }
}

/**
 * Discover only quicktask skills (mode === "quicktask").
 */
export function discoverQuicktasks(): SkillMetadata[] {
  return discoverSkills().filter((s) => s.mode === "quicktask")
}

/** Clear the skill cache (useful for development/testing) */
export function clearSkillCache(): void {
  cachedSkills = null
}
