/**
 * Model markdown parser.
 * Extracts frontmatter metadata from seed markdown files.
 */

import matter from "gray-matter"
import { z } from "zod"
import { modelCategoryEnum } from "@/lib/validations/model"
import type { CreateModelInput } from "@/lib/db/queries/models"

const modelFrontmatterSchema = z.object({
  name: z.string().min(1),
  modelId: z.string().min(1),
  provider: z.string().min(1),
  categories: z.array(modelCategoryEnum).min(1),
  region: z.enum(["eu", "us"]),
  contextWindow: z.number().int().positive(),
  maxOutputTokens: z.number().int().positive(),
  isDefault: z.boolean().optional(),
  capabilities: z.object({
    vision: z.boolean().optional(),
    pdfInput: z.enum(["native", "extract", "none"]).optional(),
    reasoning: z.boolean().optional(),
    tools: z.boolean().optional(),
  }).optional(),
  inputPrice: z.object({
    per1m: z.number().optional(),
  }).optional(),
  outputPrice: z.object({
    per1m: z.number().optional(),
  }).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
})

export function parseModelMarkdown(raw: string): CreateModelInput | null {
  try {
    const { data } = matter(raw, {
      engines: {
        js: () => ({}),
      },
    })

    const result = modelFrontmatterSchema.safeParse(data)
    if (!result.success) return null

    const fm = result.data
    return {
      modelId: fm.modelId,
      name: fm.name,
      provider: fm.provider,
      categories: fm.categories,
      region: fm.region,
      contextWindow: fm.contextWindow,
      maxOutputTokens: fm.maxOutputTokens,
      isDefault: fm.isDefault ?? false,
      capabilities: fm.capabilities ?? null,
      inputPrice: fm.inputPrice ?? null,
      outputPrice: fm.outputPrice ?? null,
      isActive: fm.isActive ?? true,
      sortOrder: fm.sortOrder ?? 0,
    }
  } catch {
    return null
  }
}
