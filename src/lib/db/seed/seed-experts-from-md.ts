import fs from "node:fs"
import path from "node:path"
import { upsertExpertBySlug } from "@/lib/db/queries/experts"
import { parseExpertMarkdown } from "./parse-expert-markdown"

/**
 * Seed experts from seeds/experts/*.md into database.
 * Idempotent via upsertExpertBySlug.
 */
export async function seedExperts() {
  const dir = path.join(process.cwd(), "seeds", "experts")

  if (!fs.existsSync(dir)) {
    console.log("  No seeds/experts/ directory found, skipping.")
    return
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"))
  let count = 0

  // ⚡ Bolt Performance Optimization: Replace sequential for...of loop with concurrent Promise.all
  // Expected impact: Faster database seeding by executing expert upserts concurrently.
  await Promise.all(
    files.map(async (file) => {
      try {
        const raw = fs.readFileSync(path.join(dir, file), "utf-8")
        const parsed = parseExpertMarkdown(raw)
        if (!parsed) {
          console.log(`  - ${file}: Skipped (missing required fields)`)
          return
        }

        const result = await upsertExpertBySlug(parsed)
        console.log(`  + ${parsed.name} (${parsed.slug}) -> ${result.id}`)
        count++
      } catch (err) {
        console.error(`  x ${file}:`, err instanceof Error ? err.message : err)
      }
    }),
  )

  console.log(`Seeded ${count} experts.`)
}
