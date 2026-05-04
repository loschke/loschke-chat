/**
 * Sync-Skript: lernen-diy-Lessons → src/data/lessons.json
 *
 * Liest alle JSON-Lessons aus dem Schwester-Repo `../lernen-diy/src/content/lessons/`,
 * filtert auf published + public, mappt auf das schlanke Teaser-Schema, validiert
 * mit Zod und schreibt das Ergebnis als `src/data/lessons.json` raus.
 *
 * Aufruf: `pnpm sync:lessons`
 *
 * Fehlerverhalten: Bei Schema-Verstoss wird der Slug genannt und der Sync bricht ab.
 * `lessons.json` bleibt im letzten guten Stand. Manueller Diff-Review ist Absicht.
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  DISCIPLINES,
  LEVELS,
  LessonIndexSchema,
  type LessonTeaser,
} from "../src/lib/ai/lessons"

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..")
const LESSONS_SRC = path.resolve(REPO_ROOT, "..", "lernen-diy", "src", "content", "lessons")
const OUTPUT_PATH = path.resolve(REPO_ROOT, "src", "data", "lessons.json")
const OUTPUT_DIR = path.dirname(OUTPUT_PATH)

const PUBLIC_BASE = "https://lernen.diy"

interface RawLessonMeta {
  slug?: string
  title?: string
  discipline?: string
  duration?: number
  tags?: string[]
  status?: string
  access?: string
  brand?: string
  level?: string
  cover?: string
  created?: string
  updated?: string
}

interface RawLessonStep {
  title?: string
  desc?: string
  subtitle?: string
  blocks?: Array<{ type?: string; content?: string; text?: string }>
}

interface RawLesson {
  meta?: RawLessonMeta
  steps?: RawLessonStep[]
  context?: { systemPrompt?: string }
}

function fail(message: string): never {
  console.error(`[sync-lessons] ${message}`)
  process.exit(1)
}

function ensureAbsoluteUrl(rel: string | undefined, kind: "cover" | "url"): string {
  if (!rel) {
    if (kind === "cover") return ""
    return ""
  }
  if (/^https?:\/\//i.test(rel)) return rel
  if (rel.startsWith("/")) return `${PUBLIC_BASE}${rel}`
  return `${PUBLIC_BASE}/${rel}`
}

/**
 * Bestmögliche Summary aus den Lesson-Daten extrahieren.
 * Reihenfolge: erstes Step-Subtitle → erster text-Block → context.systemPrompt erste Zeile → null
 */
function deriveSummary(raw: RawLesson): string | null {
  const firstStep = raw.steps?.[0]
  if (firstStep?.subtitle && firstStep.subtitle.trim().length > 0) {
    return firstStep.subtitle.trim()
  }
  const firstTextBlock = firstStep?.blocks?.find((b) => b.type === "text" && b.content)
  if (firstTextBlock?.content) {
    const text = firstTextBlock.content.trim()
    return text.length > 240 ? text.slice(0, 237) + "…" : text
  }
  const sp = raw.context?.systemPrompt?.trim()
  if (sp) {
    const firstLine = sp.split(/\r?\n/).find((l) => l.trim().length > 0)
    if (firstLine) return firstLine.length > 240 ? firstLine.slice(0, 237) + "…" : firstLine
  }
  return null
}

function mapLesson(raw: RawLesson, fileName: string): LessonTeaser | null {
  const meta = raw.meta
  if (!meta) {
    fail(`Datei ${fileName} hat kein meta-Objekt`)
  }
  if (meta.status !== "published") return null
  if (meta.access && meta.access !== "public") return null

  if (!meta.slug) fail(`Datei ${fileName}: meta.slug fehlt`)
  if (!meta.title) fail(`Datei ${fileName}: meta.title fehlt`)
  if (!meta.discipline) fail(`Datei ${fileName}: meta.discipline fehlt`)
  if (!DISCIPLINES.includes(meta.discipline as (typeof DISCIPLINES)[number])) {
    fail(`Datei ${fileName}: unbekannte discipline '${meta.discipline}'`)
  }
  if (typeof meta.duration !== "number") fail(`Datei ${fileName}: meta.duration fehlt oder kein number`)

  const level = (meta.level && LEVELS.includes(meta.level as (typeof LEVELS)[number]) ? meta.level : "einsteiger") as (typeof LEVELS)[number]

  const teaser: LessonTeaser = {
    slug: meta.slug,
    title: meta.title,
    summary: deriveSummary(raw),
    discipline: meta.discipline as (typeof DISCIPLINES)[number],
    level,
    duration: meta.duration,
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    cover: ensureAbsoluteUrl(meta.cover, "cover"),
    url: `${PUBLIC_BASE}/lessons/${meta.slug}`,
    updated: meta.updated ?? meta.created ?? new Date().toISOString().slice(0, 10),
  }

  return teaser
}

function main(): void {
  if (!fs.existsSync(LESSONS_SRC)) {
    fail(`Lesson-Quelle nicht gefunden: ${LESSONS_SRC}\nIst lernen-diy als Schwester-Repo unter ../lernen-diy ausgecheckt?`)
  }

  const files = fs.readdirSync(LESSONS_SRC).filter((f) => f.endsWith(".json") && !f.startsWith("_"))
  if (files.length === 0) {
    fail(`Keine Lesson-Dateien in ${LESSONS_SRC} gefunden`)
  }

  const lessons: LessonTeaser[] = []
  let skippedDraft = 0
  let skippedAccess = 0

  for (const fileName of files) {
    const fullPath = path.join(LESSONS_SRC, fileName)
    const text = fs.readFileSync(fullPath, "utf8")
    let raw: RawLesson
    try {
      raw = JSON.parse(text) as RawLesson
    } catch (err) {
      fail(`JSON-Parse-Fehler in ${fileName}: ${(err as Error).message}`)
    }

    if (raw.meta?.status !== "published") {
      skippedDraft++
      continue
    }
    if (raw.meta?.access && raw.meta.access !== "public") {
      skippedAccess++
      continue
    }

    const teaser = mapLesson(raw, fileName)
    if (teaser) lessons.push(teaser)
  }

  // Sortierung: Discipline-Reihenfolge, dann Title alphabetisch — gibt dem Default-Output eine stabile Reihenfolge
  const disciplineOrder = new Map(DISCIPLINES.map((d, i) => [d, i]))
  lessons.sort((a, b) => {
    const da = disciplineOrder.get(a.discipline) ?? 99
    const db = disciplineOrder.get(b.discipline) ?? 99
    if (da !== db) return da - db
    return a.title.localeCompare(b.title, "de")
  })

  const index = {
    generatedAt: new Date().toISOString(),
    count: lessons.length,
    items: lessons,
  }

  // Validierung als Selbsttest: muss durch dasselbe Schema gehen, das das Tool nutzt
  const parsed = LessonIndexSchema.safeParse(index)
  if (!parsed.success) {
    fail(`Schema-Validierung fehlgeschlagen: ${parsed.error.message}`)
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(parsed.data, null, 2) + "\n", "utf8")

  console.log(`[sync-lessons] ${lessons.length} Lessons synchronisiert → ${path.relative(REPO_ROOT, OUTPUT_PATH)}`)
  if (skippedDraft > 0) console.log(`[sync-lessons]   ${skippedDraft} draft-Lessons übersprungen`)
  if (skippedAccess > 0) console.log(`[sync-lessons]   ${skippedAccess} non-public Lessons übersprungen`)
}

main()
