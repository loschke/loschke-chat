/**
 * Shared SKILL.md parser.
 * Extracts frontmatter metadata and markdown content from raw SKILL.md files.
 * Used by: seed script, admin import API, filesystem discovery fallback.
 */

import matter from "gray-matter"
import { z } from "zod"
import type { SkillField } from "./discovery"
import type { SkillFieldSchema } from "@/lib/db/schema/skills"

const skillFieldSchema = z.object({
  key: z.string().min(1).max(50),
  label: z.string().min(1).max(100),
  type: z.enum(["text", "textarea", "select"]),
  required: z.boolean().optional(),
  placeholder: z.string().max(200).optional(),
  options: z.array(z.string().max(100)).max(20).optional(),
})

const skillFieldsSchema = z.array(skillFieldSchema).max(20)

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
    const { data, content } = matter(raw, {
      engines: {
        // Only allow YAML, disable JS engine to prevent code execution via ---js frontmatter
        js: () => ({}),
      },
    })

    if (!data.name || !data.slug || !data.description) return null

    const slug = String(data.slug)
    const name = String(data.name)
    const description = String(data.description)

    // Validate slug format: kebab-case, 2-80 chars
    if (!/^[a-z0-9][a-z0-9-]{0,78}[a-z0-9]$/.test(slug) && !/^[a-z0-9]{1,2}$/.test(slug)) return null

    // Validate name and description length
    if (name.length < 2 || name.length > 100) return null
    if (description.length < 5 || description.length > 500) return null

    return {
      slug,
      name,
      description,
      content: content.trim(),
      mode: data.mode === "quicktask" ? "quicktask" : "skill",
      category: data.category ? String(data.category) : undefined,
      icon: data.icon ? String(data.icon) : undefined,
      fields: Array.isArray(data.fields) ? (skillFieldsSchema.safeParse(data.fields).data ?? undefined) : undefined,
      outputAsArtifact: data.outputAsArtifact === true,
      temperature: typeof data.temperature === "number" ? data.temperature : undefined,
      modelId: data.modelId ? String(data.modelId) : undefined,
    }
  } catch {
    return null
  }
}

/** Convert a DB skill row to a ParsedSkill for serialization */
export function dbRowToParsedSkill(row: {
  slug: string
  name: string
  description: string
  content: string
  mode: string
  category: string | null
  icon: string | null
  fields: unknown
  outputAsArtifact: boolean
  temperature: unknown
  modelId: string | null
}): ParsedSkill {
  return {
    slug: row.slug,
    name: row.name,
    description: row.description,
    content: row.content,
    mode: row.mode as "skill" | "quicktask",
    category: row.category ?? undefined,
    icon: row.icon ?? undefined,
    fields: (row.fields as SkillFieldSchema[] | null) ?? undefined,
    outputAsArtifact: row.outputAsArtifact,
    temperature: (row.temperature as number | null) ?? undefined,
    modelId: row.modelId ?? undefined,
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
