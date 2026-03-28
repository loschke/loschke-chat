import fs from "node:fs"
import path from "node:path"
import { parseSkillMarkdown } from "@/lib/ai/skills/parser"
import { upsertSkillBySlug } from "@/lib/db/queries/skills"
import { upsertResources, deleteResourcesBySkillId } from "@/lib/db/queries/skill-resources"
import { getErrorMessage } from "@/lib/errors"

/** Binary file extensions to skip when collecting resources */
const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".zip", ".tar", ".gz", ".bz2",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".pptx",
  ".mp3", ".mp4", ".wav", ".avi", ".mov",
  ".exe", ".dll", ".so", ".dylib",
])

function isBinaryFile(filename: string): boolean {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase()
  return BINARY_EXTENSIONS.has(ext)
}

/**
 * Derive resource category from relative file path prefix.
 */
function deriveCategory(relativePath: string): string {
  if (relativePath.startsWith("shared/")) return "shared"
  if (relativePath.startsWith("specs/")) return "spec"
  if (relativePath.startsWith("templates/")) return "template"
  if (relativePath.startsWith("references/")) return "reference"
  if (relativePath.startsWith("examples/")) return "example"
  return "other"
}

/**
 * Recursively collect all files in a directory, returning paths relative to baseDir.
 */
function collectFiles(dir: string, baseDir: string): string[] {
  const results: string[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath, baseDir))
    } else if (entry.isFile()) {
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, "/")
      results.push(relativePath)
    }
  }

  return results
}

/**
 * Seed skills from markdown files and skill directories into database.
 * Standalone .md files are parsed directly. Directories containing a SKILL.md
 * also have their resource files seeded.
 * Idempotent via upsertSkillBySlug.
 */
export async function seedSkills() {
  const dir = path.join(process.cwd(), "seeds", "skills")

  if (!fs.existsSync(dir)) {
    console.log("  No seeds/skills/ directory found, skipping.")
    return
  }

  let count = 0

  // Phase 1: Process standalone .md files (existing behavior)
  const mdFiles = fs.readdirSync(dir).filter((f) => f.endsWith(".md"))

  for (const file of mdFiles) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), "utf-8")
      const parsed = parseSkillMarkdown(raw)
      if (!parsed) {
        console.log(`  - ${file}: Skipped (missing required fields)`)
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
      console.log(`  + ${parsed.name} (${parsed.slug}) -> ${result.id}`)
      count++
    } catch (err) {
      console.error(`  x ${file}:`, getErrorMessage(err))
    }
  }

  // Phase 2: Process directories with SKILL.md + resources
  const dirEntries = fs.readdirSync(dir, { withFileTypes: true })
  const skillDirs = dirEntries.filter((e) => e.isDirectory())

  for (const skillDir of skillDirs) {
    const skillDirPath = path.join(dir, skillDir.name)
    const skillMdPath = path.join(skillDirPath, "SKILL.md")

    if (!fs.existsSync(skillMdPath)) {
      // Also check case-insensitive
      const altName = fs.readdirSync(skillDirPath).find(
        (f) => f.toLowerCase() === "skill.md"
      )
      if (!altName) continue
      // Use the actual filename
      const altPath = path.join(skillDirPath, altName)
      await seedSkillDirectory(skillDirPath, altPath, skillDir.name)
      count++
      continue
    }

    try {
      await seedSkillDirectory(skillDirPath, skillMdPath, skillDir.name)
      count++
    } catch (err) {
      console.error(`  x ${skillDir.name}/:`, getErrorMessage(err))
    }
  }

  console.log(`Seeded ${count} skills.`)
}

/**
 * Seed a single skill directory: parse SKILL.md, upsert skill, and seed resources.
 */
async function seedSkillDirectory(
  skillDirPath: string,
  skillMdPath: string,
  dirName: string
) {
  const raw = fs.readFileSync(skillMdPath, "utf-8")
  const parsed = parseSkillMarkdown(raw)
  if (!parsed) {
    console.log(`  - ${dirName}/: Skipped (missing required fields in SKILL.md)`)
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

  // Collect resource files
  const allFiles = collectFiles(skillDirPath, skillDirPath)
  const resources: Array<{ filename: string; content: string; category: string; sortOrder: number }> = []
  let sortIndex = 0

  for (const relativePath of allFiles) {
    // Skip SKILL.md itself
    if (relativePath.toLowerCase() === "skill.md") continue
    // Skip binary files
    if (isBinaryFile(relativePath)) continue
    // Skip hidden files
    if (relativePath.startsWith(".") || relativePath.includes("/.")) continue

    try {
      const content = fs.readFileSync(path.join(skillDirPath, relativePath), "utf-8")
      resources.push({
        filename: relativePath,
        content,
        category: deriveCategory(relativePath),
        sortOrder: sortIndex++,
      })
    } catch {
      // Skip files that can't be read as UTF-8
      continue
    }
  }

  if (resources.length > 0) {
    await deleteResourcesBySkillId(result.id)
    await upsertResources(result.id, resources)
  }

  const resourceInfo = resources.length > 0 ? ` with ${resources.length} resources` : ""
  console.log(`  + ${parsed.name} (${parsed.slug}) -> ${result.id}${resourceInfo}`)
}
