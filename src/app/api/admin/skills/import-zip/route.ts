import { requireAdmin } from "@/lib/admin-guard"
import { parseSkillMarkdown } from "@/lib/ai/skills/parser"
import { upsertSkillBySlug, getSkillBySlug } from "@/lib/db/queries/skills"
import { upsertResources, deleteResourcesBySkillId } from "@/lib/db/queries/skill-resources"
import { clearSkillCache } from "@/lib/ai/skills/discovery"
import { getErrorMessage } from "@/lib/errors"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { unzipSync } from "fflate"

/** Binary file extensions to skip when importing resources */
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
 * Derive resource category from file path prefix.
 * shared/ → "shared", specs/ → "spec", templates/ → "template", etc.
 */
function deriveCategory(filename: string): string {
  if (filename.startsWith("shared/")) return "shared"
  if (filename.startsWith("specs/")) return "spec"
  if (filename.startsWith("templates/")) return "template"
  if (filename.startsWith("references/")) return "reference"
  if (filename.startsWith("examples/")) return "example"
  return "other"
}

/**
 * Detect and strip nested root directory from ZIP entries.
 * Many ZIP files contain a single top-level directory (e.g., carousel-factory/).
 * If SKILL.md is not at root but exists inside exactly one top-level dir, strip that prefix.
 */
function normalizeEntries(entries: Record<string, Uint8Array>): Record<string, Uint8Array> {
  const filenames = Object.keys(entries)

  // Check if SKILL.md exists at root (case-insensitive)
  const hasRootSkillMd = filenames.some(
    (f) => f.toLowerCase() === "skill.md"
  )
  if (hasRootSkillMd) return entries

  // Find top-level directories
  const topLevelDirs = new Set<string>()
  for (const f of filenames) {
    const slashIdx = f.indexOf("/")
    if (slashIdx > 0) {
      topLevelDirs.add(f.slice(0, slashIdx + 1))
    }
  }

  // If exactly one top-level directory, check if it contains SKILL.md
  if (topLevelDirs.size === 1) {
    const prefix = [...topLevelDirs][0]
    const hasNestedSkillMd = filenames.some(
      (f) => f.toLowerCase() === `${prefix.toLowerCase()}skill.md`
    )
    if (hasNestedSkillMd) {
      // Strip the prefix from all entries
      const normalized: Record<string, Uint8Array> = {}
      for (const [key, value] of Object.entries(entries)) {
        if (key.startsWith(prefix)) {
          normalized[key.slice(prefix.length)] = value
        }
        // Drop entries not under the prefix (unlikely but safe)
      }
      return normalized
    }
  }

  return entries
}

/** POST /api/admin/skills/import-zip — Import a skill from a ZIP file */
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin()
    const rateCheck = checkRateLimit(admin.userId, RATE_LIMITS.api)
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

    // Read form data
    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      return Response.json({ error: "Ungueltige FormData" }, { status: 400 })
    }

    const file = formData.get("file")
    if (!file || !(file instanceof File)) {
      return Response.json({ error: "Kein ZIP-File im 'file'-Feld gefunden" }, { status: 400 })
    }

    // Validate file type
    const isZip = file.name.endsWith(".zip") || file.type === "application/zip" || file.type === "application/x-zip-compressed"
    if (!isZip) {
      return Response.json({ error: "Nur ZIP-Dateien werden unterstuetzt" }, { status: 400 })
    }

    // Size limit: 10 MB
    if (file.size > 10 * 1024 * 1024) {
      return Response.json({ error: "ZIP-Datei darf maximal 10 MB gross sein" }, { status: 400 })
    }

    // Decompress
    const arrayBuffer = await file.arrayBuffer()
    let entries: Record<string, Uint8Array>
    try {
      entries = unzipSync(new Uint8Array(arrayBuffer))
    } catch {
      return Response.json({ error: "ZIP-Datei konnte nicht entpackt werden" }, { status: 400 })
    }

    // Guard: zip bomb / excessive entry count
    const totalDecompressedSize = Object.values(entries).reduce((sum, v) => sum + v.length, 0)
    if (totalDecompressedSize > 50 * 1024 * 1024) {
      return Response.json({ error: "Entpackte Daten zu gross (max 50 MB)" }, { status: 400 })
    }
    if (Object.keys(entries).length > 500) {
      return Response.json({ error: "Zu viele Dateien im ZIP (max 500)" }, { status: 400 })
    }

    // Normalize nested root
    entries = normalizeEntries(entries)

    // Find SKILL.md (case-insensitive)
    const skillMdKey = Object.keys(entries).find(
      (f) => f.toLowerCase() === "skill.md"
    )
    if (!skillMdKey) {
      return Response.json(
        { error: "Keine SKILL.md im ZIP gefunden. Die Datei muss im Root oder in genau einem Unterordner liegen." },
        { status: 400 }
      )
    }

    // Parse SKILL.md
    const decoder = new TextDecoder("utf-8")
    const skillMdContent = decoder.decode(entries[skillMdKey])
    const parsed = parseSkillMarkdown(skillMdContent)
    if (!parsed) {
      return Response.json(
        { error: "Ungueltiges SKILL.md-Format. Pflichtfelder: name, slug, description im Frontmatter." },
        { status: 400 }
      )
    }

    // Upsert skill
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
    const resources: Array<{ filename: string; content: string; category: string; sortOrder: number }> = []
    let sortIndex = 0

    for (const [filename, data] of Object.entries(entries)) {
      // Skip SKILL.md itself
      if (filename.toLowerCase() === "skill.md") continue
      // Skip directories (entries ending with /)
      if (filename.endsWith("/")) continue
      // Guard: path traversal (zip slip)
      if (filename.includes("..") || filename.startsWith("/") || filename.startsWith("\\")) continue
      // Skip binary files
      if (isBinaryFile(filename)) continue
      // Skip hidden files
      if (filename.startsWith(".") || filename.includes("/.")) continue

      try {
        const content = decoder.decode(data)
        resources.push({
          filename,
          content,
          category: deriveCategory(filename),
          sortOrder: sortIndex++,
        })
      } catch {
        // Skip files that can't be decoded as UTF-8
        continue
      }
    }

    // Delete existing resources and upsert new ones
    if (resources.length > 0) {
      await deleteResourcesBySkillId(result.id)
      await upsertResources(result.id, resources)
    }

    clearSkillCache()

    return Response.json({
      id: result.id,
      slug: result.slug,
      name: result.name,
      resourceCount: resources.length,
    }, { status: 201 })
  } catch (err) {
    if (err instanceof Response) return err
    console.error("[import-zip]", getErrorMessage(err))
    return Response.json({ error: "Import fehlgeschlagen" }, { status: 500 })
  }
}
