import { tool } from "ai"
import { z } from "zod"

import { getSkillContent, type SkillMetadata } from "@/lib/ai/skills/discovery"

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

      const content = getSkillContent(name)
      if (!content) {
        return { error: `Skill "${name}" could not be loaded` }
      }

      return { skill: name, content }
    },
  })
}
