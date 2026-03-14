/**
 * Idempotent seed script for default experts and skills.
 * Run with: pnpm db:seed
 */

import { upsertExpertBySlug } from "@/lib/db/queries/experts"
import { DEFAULT_EXPERTS } from "./default-experts"
import { seedSkills } from "./seed-skills"
import { seedModels } from "./seed-models"

async function main() {
  console.log("Seeding default experts...")

  for (const expert of DEFAULT_EXPERTS) {
    try {
      const result = await upsertExpertBySlug(expert)
      console.log(`  ✓ ${expert.name} (${expert.slug}) → ${result.id}`)
    } catch (err) {
      console.error(`  ✗ ${expert.name} (${expert.slug}):`, err instanceof Error ? err.message : err)
    }
  }

  console.log("\nSeeding skills from filesystem...")
  await seedSkills()

  console.log("\nSeeding models...")
  await seedModels()

  console.log("\nDone.")
  process.exit(0)
}

main().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
