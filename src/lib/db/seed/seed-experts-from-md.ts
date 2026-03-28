import fs from "node:fs"
import path from "node:path"
import { upsertExpertBySlug } from "@/lib/db/queries/experts"
import { parseExpertMarkdown } from "./parse-expert-markdown"
import { getErrorMessage } from "@/lib/errors"

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

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), "utf-8")
      const parsed = parseExpertMarkdown(raw)
      if (!parsed) {
        console.log(`  - ${file}: Skipped (missing required fields)`)
        continue
      }

      const result = await upsertExpertBySlug(parsed)
      console.log(`  + ${parsed.name} (${parsed.slug}) -> ${result.id}`)
      count++
    } catch (err) {
      console.error(`  x ${file}:`, getErrorMessage(err))
    }
  }

  console.log(`Seeded ${count} experts.`)
}
