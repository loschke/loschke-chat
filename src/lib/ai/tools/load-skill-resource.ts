import { tool } from "ai"
import { z } from "zod"

import { getSkillBySlug } from "@/lib/db/queries/skills"
import { getResourcesByFilenames } from "@/lib/db/queries/skill-resources"
import type { ToolRegistration } from "./registry"

/**
 * Tool: load_skill_resource
 * Loads specific resource files for a skill after load_skill returned a manifest.
 */
export function createLoadSkillResourceTool() {
  return tool({
    description:
      "Load specific resource files for a skill. Use after load_skill returns a resource manifest. " +
      "Load files as described in the skill's SKILL.md instructions.",
    inputSchema: z.object({
      skill: z.string().describe("The skill slug (e.g. 'carousel-factory')"),
      filenames: z
        .array(z.string())
        .min(1)
        .max(5)
        .describe("Filenames from the resource manifest (max 5 at once)"),
    }),
    execute: async ({ skill, filenames }) => {
      const skillRow = await getSkillBySlug(skill)
      if (!skillRow) {
        return { error: `Skill "${skill}" nicht gefunden.` }
      }

      const resources = await getResourcesByFilenames(skillRow.id, filenames)
      if (resources.length === 0) {
        return { error: `Keine Ressourcen gefunden für: ${filenames.join(", ")}` }
      }

      return {
        skill,
        files: resources.map((r) => ({
          filename: r.filename,
          content: r.content,
        })),
      }
    },
  })
}

export const registration: ToolRegistration = {
  name: "load_skill_resource",
  label: "Skill-Ressource laden",
  icon: "FileText",
  category: "skill",
  customRenderer: false,
}
