/**
 * Lessons-Helper für den GenAI-Tutor.
 *
 * Liest den vom Sync-Skript erzeugten Index `src/data/lessons.json` ein,
 * stellt eine lokale Suche bereit und exportiert die Schemas, die das
 * Sync-Skript zur Validierung nutzt.
 *
 * Single Source of Truth bleibt `lernen-diy` — der Sync-Skript-Lauf
 * (`pnpm sync:lessons`) extrahiert dort die Lesson-Metadaten und schreibt
 * sie hier rein, damit build-jetzt zur Runtime keine Cross-Repo- oder
 * HTTP-Abhängigkeit hat.
 */

import { z } from "zod"

export const DISCIPLINES = [
  "ai-essentials",
  "ai-coding",
  "ai-media",
  "ai-automation",
  "ai-tools",
  "ai-strategy",
  "ai-transformation",
] as const

export const LEVELS = ["einsteiger", "fortgeschritten", "profi"] as const

export const DISCIPLINE_LABELS: Record<(typeof DISCIPLINES)[number], string> = {
  "ai-essentials": "KI verstehen & prompten",
  "ai-coding": "Programmieren mit KI",
  "ai-media": "Bilder & Videos erstellen",
  "ai-automation": "Agenten & Automatisierung",
  "ai-tools": "Das richtige Tool finden",
  "ai-strategy": "KI strategisch einsetzen",
  "ai-transformation": "Teams für KI befähigen",
}

export const LEVEL_LABELS: Record<(typeof LEVELS)[number], string> = {
  einsteiger: "Einsteiger",
  fortgeschritten: "Fortgeschritten",
  profi: "Profi",
}

export const LessonTeaserSchema = z.object({
  slug: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  discipline: z.enum(DISCIPLINES),
  level: z.enum(LEVELS),
  duration: z.number(),
  tags: z.array(z.string()),
  cover: z.string(),
  url: z.string(),
  updated: z.string(),
})

export type LessonTeaser = z.infer<typeof LessonTeaserSchema>

export const LessonIndexSchema = z.object({
  generatedAt: z.string(),
  count: z.number(),
  items: z.array(LessonTeaserSchema),
})

export type LessonIndex = z.infer<typeof LessonIndexSchema>

let cachedIndex: LessonIndex | null = null

/**
 * Lädt den Lesson-Index. Beim ersten Aufruf wird das JSON geladen und
 * gegen das Schema validiert. Spätere Aufrufe geben die Module-Cache zurück.
 *
 * Wenn `src/data/lessons.json` fehlt (z.B. weil Sync-Skript noch nicht lief),
 * wird ein leerer Index zurückgegeben — der Tutor fällt dann sauber weg.
 */
export async function loadLessonIndex(): Promise<LessonIndex> {
  if (cachedIndex) return cachedIndex
  try {
    const data = (await import("@/data/lessons.json")).default
    const parsed = LessonIndexSchema.safeParse(data)
    if (!parsed.success) {
      console.warn("[lessons] Schema-Validierung fehlgeschlagen:", parsed.error.message)
      cachedIndex = { generatedAt: new Date(0).toISOString(), count: 0, items: [] }
      return cachedIndex
    }
    cachedIndex = parsed.data
    return cachedIndex
  } catch {
    cachedIndex = { generatedAt: new Date(0).toISOString(), count: 0, items: [] }
    return cachedIndex
  }
}

export interface SearchLessonsParams {
  query?: string
  discipline?: (typeof DISCIPLINES)[number]
  level?: (typeof LEVELS)[number]
  tags?: string[]
  limit?: number
}

interface ScoredLesson {
  lesson: LessonTeaser
  score: number
}

const STOPWORDS = new Set([
  "und", "oder", "der", "die", "das", "ein", "eine", "einer", "eines", "einem", "einen",
  "ist", "sind", "war", "waren", "werden", "wird", "wurde", "wurden", "kann", "koennen", "können",
  "soll", "sollte", "sollten", "muss", "muessen", "müssen", "habe", "hat", "haben", "hatte", "hatten",
  "ich", "du", "er", "sie", "es", "wir", "ihr", "mein", "dein", "sein", "ihr", "unser", "euer",
  "mit", "ohne", "fuer", "für", "gegen", "auf", "in", "aus", "zu", "von", "bei", "nach", "vor", "ueber", "über", "unter",
  "wie", "was", "wer", "wo", "wann", "warum", "welche", "welcher", "welches",
  "the", "and", "or", "of", "in", "on", "at", "to", "for", "with", "by", "from", "is", "are", "was", "were",
])

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2 && !STOPWORDS.has(t))
}

/**
 * Lokale Lesson-Suche. Bei ~20 Lessons reicht eine simple gewichtete Match-Heuristik
 * (Tag-Overlap > Title > Summary). Kein Vector-Search nötig.
 */
export async function searchLessons(params: SearchLessonsParams): Promise<LessonTeaser[]> {
  const index = await loadLessonIndex()
  if (index.items.length === 0) return []

  const limit = Math.min(Math.max(params.limit ?? 3, 1), 6)
  const queryTokens = params.query ? tokenize(params.query) : []
  const filterTags = (params.tags ?? []).map((t) => t.toLowerCase())

  const scored: ScoredLesson[] = index.items.flatMap((lesson) => {
    if (params.discipline && lesson.discipline !== params.discipline) return []
    if (params.level && lesson.level !== params.level) return []

    const tagSet = new Set(lesson.tags.map((t) => t.toLowerCase()))
    const titleTokens = tokenize(lesson.title)
    const summaryTokens = lesson.summary ? tokenize(lesson.summary) : []

    let score = 0

    if (filterTags.length > 0) {
      const overlap = filterTags.filter((t) => tagSet.has(t)).length
      if (overlap === 0) return []
      score += overlap * 5
    }

    if (queryTokens.length > 0) {
      let queryHits = 0
      for (const qt of queryTokens) {
        if (tagSet.has(qt)) {
          score += 4
          queryHits++
          continue
        }
        if (titleTokens.includes(qt)) {
          score += 3
          queryHits++
          continue
        }
        if (summaryTokens.includes(qt)) {
          score += 1
          queryHits++
        }
      }
      if (queryHits === 0 && filterTags.length === 0) return []
    }

    if (queryTokens.length === 0 && filterTags.length === 0 && !params.discipline && !params.level) {
      // Keine Filter angegeben → Reihenfolge nach Discipline-Order, neueste zuerst
      score = 1
    }

    return [{ lesson, score }]
  })

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return b.lesson.updated.localeCompare(a.lesson.updated)
  })

  return scored.slice(0, limit).map((s) => s.lesson)
}

/** Nur für Tests / Sync-Skript: erlaubt das Cache-Reset. */
export function resetLessonCache(): void {
  cachedIndex = null
}
