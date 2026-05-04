/**
 * lessons_search tool — durchsucht den lokal gespiegelten Index der lernen.diy-Lessons
 * und liefert Teaser-Daten für die Lesson-Cards im Chat.
 *
 * Datenquelle: `src/data/lessons.json` (vom Sync-Skript erzeugt).
 * Quelle der Wahrheit: `lernen-diy/src/content/lessons/`. Pflege via `pnpm sync:lessons`.
 */

import { tool } from "ai"
import { z } from "zod"

import { DISCIPLINES, LEVELS, searchLessons } from "@/lib/ai/lessons"
import type { ToolRegistration } from "./registry"

export function lessonsSearchTool() {
  return tool({
    description:
      "Durchsuche die GenAI-Lessons auf lernen.diy und liefere thematisch passende Teaser zurück. " +
      "Nutze dieses Tool, wenn der User Fragen zu generativer KI stellt (Prompting, Bildmodelle, Agenten, KI-Strategie, KI-Tools, KI-Compliance, KI-Transformation) " +
      "und du ihm zusätzlich zur eigenen Antwort einen vertiefenden Lernabsprung anbieten willst. " +
      "Maximal eine Suche pro Turn. Ergebnisse werden im Chat als anklickbare Lesson-Cards gerendert.",
    inputSchema: z.object({
      query: z.string().min(2).max(300).optional().describe(
        "Freitext-Suche, idealerweise das Kernthema der User-Frage in deutsch (z.B. 'Prompting Grundlagen', 'Bilder generieren')"
      ),
      discipline: z.enum(DISCIPLINES).optional().describe(
        "Disziplin-Filter. ai-essentials = Prompting/Grundlagen, ai-coding = Programmieren mit KI, ai-media = Bilder/Videos, ai-automation = Agenten/Workflows, ai-tools = Tool-Vergleiche, ai-strategy = Strategie/ROI, ai-transformation = Teams/Change"
      ),
      level: z.enum(LEVELS).optional().describe(
        "Schwierigkeitsgrad. Default: kein Filter."
      ),
      limit: z.number().int().min(1).max(6).optional().describe(
        "Anzahl Treffer (1–6, Default 3)"
      ),
    }),
    execute: async ({ query, discipline, level, limit }) => {
      const lessons = await searchLessons({ query, discipline, level, limit })
      return {
        query: query ?? "",
        discipline: discipline ?? null,
        level: level ?? null,
        resultCount: lessons.length,
        lessons,
      }
    },
  })
}

export const registration: ToolRegistration = {
  name: "lessons_search",
  label: "Lessons-Suche",
  icon: "GraduationCap",
  category: "search",
  customRenderer: true,
}
