import { tool } from "ai"
import { z } from "zod"

import type { SkillMetadata } from "@/lib/ai/skills/discovery"
import { getSkillBySlug } from "@/lib/db/queries/skills"
import { getResourceManifest } from "@/lib/db/queries/skill-resources"
import type { ToolRegistration } from "./registry"

/**
 * Factory: creates the load_skill tool with access to available skills.
 * The skill name is validated against the discovered skills list (no path traversal possible).
 */
export function createLoadSkillTool(availableSkills: SkillMetadata[]) {
  const skillNames = availableSkills.map((s) => s.slug)

  return tool({
    description:
      "Load specialized instructions for a skill. Use when a request benefits from procedural expertise. " +
      `Available skills: ${availableSkills.map((s) => `${s.slug} (${s.name})`).join(", ")}`,
    inputSchema: z.object({
      name: z.string().describe("The slug of the skill to load"),
    }),
    execute: async ({ name }) => {
      if (!skillNames.includes(name)) {
        return { error: `Skill "${name}" not found. Available: ${skillNames.join(", ")}` }
      }

      const skillRow = await getSkillBySlug(name)
      if (!skillRow || !skillRow.isActive) {
        return { error: `Skill "${name}" could not be loaded` }
      }

      // Check if this skill has resources
      const skillMeta = availableSkills.find((s) => s.slug === name)
      if (skillMeta?.hasResources) {
        const manifest = await getResourceManifest(skillRow.id)
        if (manifest.length > 0) {
          return {
            skill: name,
            content: skillRow.content,
            resources: manifest.map((r) => ({
              filename: r.filename,
              category: r.category,
            })),
            hint: "Nutze load_skill_resource um Dateien zu laden. Das SKILL.md beschreibt, wann welche Ressourcen relevant sind.",
          }
        }
      }

      return { skill: name, content: skillRow.content }
    },
  })
}

export const registration: ToolRegistration = {
  name: "load_skill",
  label: "Skill laden",
  icon: "BookOpen",
  category: "skill",
  customRenderer: false,
}
