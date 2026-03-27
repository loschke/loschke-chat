import fs from "node:fs"
import path from "node:path"
import { upsertModelByModelId } from "@/lib/db/queries/models"
import { parseModelMarkdown } from "./parse-model-markdown"

/**
 * Seed models from seeds/models/*.md into database.
 * Falls back to seeds/ files only (ENV override removed).
 * Idempotent via upsertModelByModelId.
 */
export async function seedModels() {
  const dir = path.join(process.cwd(), "seeds", "models")

  if (!fs.existsSync(dir)) {
    console.log("  No seeds/models/ directory found, skipping.")
    return
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"))
  let count = 0

  // ⚡ Bolt Performance Optimization: Replace sequential for...of loop with concurrent Promise.all
  // Expected impact: Faster database seeding by executing model upserts concurrently.
  await Promise.all(
    files.map(async (file) => {
      try {
        const raw = fs.readFileSync(path.join(dir, file), "utf-8")
        const parsed = parseModelMarkdown(raw)
        if (!parsed) {
          console.log(`  - ${file}: Skipped (missing required fields)`)
          return
        }

        const result = await upsertModelByModelId(parsed)
        console.log(`  + ${parsed.name} (${parsed.modelId}) -> ${result.id}`)
        count++
      } catch (err) {
        console.error(`  x ${file}:`, err instanceof Error ? err.message : err)
      }
    }),
  )

  console.log(`Seeded ${count} models.`)
}
