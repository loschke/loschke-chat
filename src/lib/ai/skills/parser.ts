/**
 * Shared SKILL.md parser.
 * Extracts frontmatter metadata and markdown content from raw SKILL.md files.
 * Used by: seed script, admin import API, filesystem discovery fallback.
 */

import matter from "gray-matter"
import type { SkillField } from "./discovery"

export interface ParsedSkill {
  slug: string
  name: string
  description: string
  content: string
  mode: "skill" | "quicktask"
  category?: string
  icon?: string
  fields?: SkillField[]
  outputAsArtifact: boolean
  temperature?: number
  modelId?: string
}

/**
 * Parse a raw SKILL.md string (frontmatter + markdown content).
 * Returns null if required fields (name, slug, description) are missing.
 */
export function parseSkillMarkdown(raw: string): ParsedSkill | null {
  try {
    const { data, content } = matter(raw)

    if (!data.name || !data.slug || !data.description) return null

    return {
      slug: String(data.slug),
      name: String(data.name),
      description: String(data.description),
      content: content.trim(),
      mode: data.mode === "quicktask" ? "quicktask" : "skill",
      category: data.category ? String(data.category) : undefined,
      icon: data.icon ? String(data.icon) : undefined,
      fields: Array.isArray(data.fields) ? data.fields : undefined,
      outputAsArtifact: data.outputAsArtifact === true,
      temperature: typeof data.temperature === "number" ? data.temperature : undefined,
      modelId: data.modelId ? String(data.modelId) : undefined,
    }
  } catch {
    return null
  }
}

/**
 * Serialize a ParsedSkill back to SKILL.md format (frontmatter + content).
 */
export function serializeSkillMarkdown(skill: ParsedSkill): string {
  const frontmatter: Record<string, unknown> = {
    name: skill.name,
    slug: skill.slug,
    description: skill.description,
    mode: skill.mode,
  }

  if (skill.category) frontmatter.category = skill.category
  if (skill.icon) frontmatter.icon = skill.icon
  if (skill.outputAsArtifact) frontmatter.outputAsArtifact = true
  if (skill.temperature !== undefined) frontmatter.temperature = skill.temperature
  if (skill.modelId) frontmatter.modelId = skill.modelId
  if (skill.fields && skill.fields.length > 0) frontmatter.fields = skill.fields

  return matter.stringify(skill.content, frontmatter)
}
