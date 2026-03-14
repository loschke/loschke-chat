import fs from "node:fs"
import path from "node:path"
import { parseSkillMarkdown } from "@/lib/ai/skills/parser"
import { upsertSkillBySlug } from "@/lib/db/queries/skills"

/**
 * Seed: imports skills from filesystem (skills/SKILL.md) into database.
 * Idempotent via upsertSkillBySlug.
 */
export async function seedSkills() {
  const skillsDir = path.join(process.cwd(), "skills")

  if (!fs.existsSync(skillsDir)) {
    console.log("No skills/ directory found, skipping skill seeding.")
    return
  }

  const entries = fs.readdirSync(skillsDir, { withFileTypes: true })
  let count = 0

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const skillFile = path.join(skillsDir, entry.name, "SKILL.md")
    if (!fs.existsSync(skillFile)) continue

    try {
      const raw = fs.readFileSync(skillFile, "utf-8")
      const parsed = parseSkillMarkdown(raw)
      if (!parsed) {
        console.log("  - " + entry.name + ": Skipped (missing required fields)")
        continue
      }

      const result = await upsertSkillBySlug({
        slug: parsed.slug,
        name: parsed.name,
        description: parsed.description,
        content: parsed.content,
        mode: parsed.mode,
        category: parsed.category,
        icon: parsed.icon,
        fields: parsed.fields,
        outputAsArtifact: parsed.outputAsArtifact,
        temperature: parsed.temperature,
        modelId: parsed.modelId,
      })
      console.log("  + " + parsed.name + " (" + parsed.slug + ") -> " + result.id)
      count++
    } catch (err) {
      console.error("  x " + entry.name + ":", err instanceof Error ? err.message : err)
    }
  }

  console.log("Seeded " + count + " skills.")
}
