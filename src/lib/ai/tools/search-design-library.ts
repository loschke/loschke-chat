/**
 * search_design_library tool — searches the external Design-Library
 * for prompt formulas and example images.
 *
 * customRenderer: false — shows as ToolStatus text output.
 * The visual exploration happens on /design-library, this tool
 * is for chat-based search across all experts.
 */

import { tool } from "ai"
import { z } from "zod"
import { queryDesignLibrary } from "@/lib/db/design-library"
import { getErrorMessage } from "@/lib/errors"
import type { ToolRegistration } from "./registry"

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function searchDesignLibraryTool(_chatId: string, _userId: string) {
  return tool({
    description:
      "Search the Design-Library for prompt formulas (proven templates for image generation) or example images. " +
      "Use type 'formulas' to find prompt templates, 'results' to browse example images, or 'both'. " +
      "Search in both German and English for best results. " +
      "Available usageTypes: Art, Assets, Konzept & Prototyping, Marketing Materialien, Real Life, Scrollstopper/Ads & Abstraktes, Stock Fotografie. " +
      "Available mediumTypes: Fotografie, Hintergruende, Illustration, Stock, UX/UI, Variable.",
    inputSchema: z.object({
      query: z.string().min(2).max(200).describe("Search query in German or English"),
      type: z.enum(["formulas", "results", "both"]).default("both"),
      usageType: z.string().optional(),
      mediumType: z.string().optional(),
      category: z.string().optional(),
      limit: z.number().min(1).max(20).default(8),
    }),
    execute: async ({ query, type, usageType, mediumType, category, limit }) => {
      try {
        const result: {
          query: string
          formulas?: FormulaResult[]
          results?: ImageResult[]
        } = { query }

        if (type === "formulas" || type === "both") {
          result.formulas = await searchFormulas(query, usageType, mediumType, limit)
        }
        if (type === "results" || type === "both") {
          result.results = await searchResults(query, category, limit)
        }

        return result
      } catch (err) {
        console.error("[search_design_library] Error:", getErrorMessage(err))
        return { query, error: "Design-Library ist momentan nicht erreichbar" }
      }
    },
  })
}

interface FormulaResult {
  id: string
  name: string
  templateText: string
  usageType: string
  mediumType: string
  exampleCount: number
}

interface ImageResult {
  id: string
  promptText: string
  category: string
  previewUrl: string
  formulaId: string
  imageModel: string
}

async function searchFormulas(query: string, usageType?: string, mediumType?: string, limit = 8): Promise<FormulaResult[]> {
  const conditions: string[] = [`status = 'Fertig'`]
  const params: unknown[] = []
  let idx = 1

  if (query.length >= 2) {
    const term = `%${query}%`
    conditions.push(`(name->>'de' ILIKE $${idx} OR name->>'en' ILIKE $${idx} OR "templateText" ILIKE $${idx} OR tags->'de' @> $${idx + 1}::jsonb OR tags->'en' @> $${idx + 2}::jsonb)`)
    params.push(term, JSON.stringify([query]), JSON.stringify([query]))
    idx += 3
  }
  if (usageType) { conditions.push(`"usageType" = $${idx}`); params.push(usageType); idx++ }
  if (mediumType) { conditions.push(`"mediumType" = $${idx}`); params.push(mediumType); idx++ }
  params.push(limit)

  const rows = await queryDesignLibrary<{
    id: string; name: { de: string; en: string }; templateText: string
    usageType: string; mediumType: string; exampleCount: number
  }>(`
    SELECT f.id, f.name, f."templateText", f."usageType", f."mediumType",
      (SELECT COUNT(*)::int FROM image_formula_results r WHERE r."formulaId" = f.id) AS "exampleCount"
    FROM image_prompt_formulas f WHERE ${conditions.join(" AND ")}
    ORDER BY name->>'de' LIMIT $${idx}
  `, params)

  return rows.map((r) => ({
    id: r.id, name: r.name?.de ?? r.name?.en ?? "Unbenannt",
    templateText: r.templateText, usageType: r.usageType,
    mediumType: r.mediumType, exampleCount: r.exampleCount,
  }))
}

async function searchResults(query: string, category?: string, limit = 8): Promise<ImageResult[]> {
  const conditions: string[] = ["1=1"]
  const params: unknown[] = []
  let idx = 1

  if (query.length >= 2) {
    const term = `%${query}%`
    conditions.push(`("promptText" ILIKE $${idx} OR "promptTextDe" ILIKE $${idx} OR category ILIKE $${idx} OR tags->'de' @> $${idx + 1}::jsonb OR tags->'en' @> $${idx + 2}::jsonb)`)
    params.push(term, JSON.stringify([query]), JSON.stringify([query]))
    idx += 3
  }
  if (category) { conditions.push(`category = $${idx}`); params.push(category); idx++ }
  params.push(limit)

  const rows = await queryDesignLibrary<{
    id: string; promptText: string; promptTextDe: string | null
    category: string; previewUrl: string; formulaId: string; imageModel: string
  }>(`
    SELECT id, "promptText", "promptTextDe", category, "previewUrl", "formulaId", "imageModel"
    FROM image_formula_results WHERE ${conditions.join(" AND ")}
    ORDER BY category LIMIT $${idx}
  `, params)

  return rows.map((r) => ({
    id: r.id, promptText: r.promptTextDe ?? r.promptText,
    category: r.category, previewUrl: r.previewUrl,
    formulaId: r.formulaId, imageModel: r.imageModel,
  }))
}

export const registration: ToolRegistration = {
  name: "search_design_library",
  label: "Design Library",
  icon: "Palette",
  category: "media",
  customRenderer: false,
}
