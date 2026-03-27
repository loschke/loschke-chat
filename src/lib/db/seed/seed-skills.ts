import fs from "node:fs"
import path from "node:path"
import { parseSkillMarkdown } from "@/lib/ai/skills/parser"
import { upsertSkillBySlug } from "@/lib/db/queries/skills"

/**
 * Seed skills from seeds/skills/*.md into database.
 * Idempotent via upsertSkillBySlug.
 */
export async function seedSkills() {
  const dir = path.join(process.cwd(), "seeds", "skills")

  if (!fs.existsSync(dir)) {
    console.log("  No seeds/skills/ directory found, skipping.")
    return
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"))
  let count = 0

  // ⚡ Bolt Performance Optimization: Replace sequential for...of loop with concurrent Promise.all
  // Expected impact: Faster database seeding by executing skill upserts concurrently.
  await Promise.all(
    files.map(async (file) => {
      try {
        const raw = fs.readFileSync(path.join(dir, file), "utf-8")
        const parsed = parseSkillMarkdown(raw)
        if (!parsed) {
          console.log(`  - ${file}: Skipped (missing required fields)`)
          return
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
        console.log(`  + ${parsed.name} (${parsed.slug}) -> ${result.id}`)
        count++
      } catch (err) {
        console.error(`  x ${file}:`, err instanceof Error ? err.message : err)
      }
    }),
  )

  console.log(`Seeded ${count} skills.`)
}
