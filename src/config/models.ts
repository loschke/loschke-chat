/**
 * Model Registry — Konfiguration via ENV, kein Deployment nötig.
 *
 * Modelle werden nach Zweck-Kategorien gruppiert,
 * nicht nach Provider. Ein Model kann mehreren Kategorien
 * angehören. Jedes Model hat eine Region-Flagge
 * für datenschutzbewusste Auswahl.
 */

import { z } from "zod"

export type ModelCategory =
  | "enterprise"
  | "allrounder"
  | "creative"
  | "coding"
  | "analysis"
  | "fast"

export interface ModelCapabilities {
  vision?: boolean
  fileInput?: boolean
}

export interface ModelConfig {
  id: string
  name: string
  provider: string
  categories: ModelCategory[]
  region: "eu" | "us"
  contextWindow: number
  maxOutputTokens: number
  isDefault: boolean
  capabilities?: ModelCapabilities
}

const modelConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  provider: z.string().min(1),
  categories: z.array(z.enum(["enterprise", "allrounder", "creative", "coding", "analysis", "fast"])).min(1),
  region: z.enum(["eu", "us"]),
  contextWindow: z.number().int().positive(),
  maxOutputTokens: z.number().int().positive(),
  isDefault: z.boolean(),
  capabilities: z.object({
    vision: z.boolean().optional(),
    fileInput: z.boolean().optional(),
  }).optional(),
})

const modelsConfigSchema = z.array(modelConfigSchema).min(1)

export const CATEGORY_LABELS: Record<ModelCategory, string> = {
  enterprise: "Enterprise",
  allrounder: "Allrounder",
  creative: "Kreatives Schreiben",
  coding: "Coding",
  analysis: "Analyse",
  fast: "Schnell & Günstig",
}

/** Category display order */
const CATEGORY_ORDER: ModelCategory[] = [
  "enterprise",
  "allrounder",
  "coding",
  "creative",
  "analysis",
  "fast",
]

const FALLBACK_MODELS: ModelConfig[] = [
  {
    id: "anthropic/claude-sonnet-4-6",
    name: "Claude Sonnet 4",
    provider: "Anthropic",
    categories: ["allrounder"],
    region: "eu",
    contextWindow: 200000,
    maxOutputTokens: 16384,
    isDefault: true,
  },
]

let cachedModels: ModelConfig[] | null = null

function parseModels(): ModelConfig[] {
  if (cachedModels) return cachedModels

  const envConfig = process.env.MODELS_CONFIG
  if (envConfig) {
    try {
      const raw = JSON.parse(envConfig)
      const result = modelsConfigSchema.safeParse(raw)
      if (result.success) {
        cachedModels = result.data
        return result.data
      }
      console.warn("MODELS_CONFIG validation failed, using fallback:", result.error.flatten().fieldErrors)
    } catch (e) {
      console.error("Failed to parse MODELS_CONFIG:", e)
    }
  }

  cachedModels = FALLBACK_MODELS
  return FALLBACK_MODELS
}

export function getModels(): ModelConfig[] {
  return parseModels()
}

export function getModelById(id: string): ModelConfig | undefined {
  return getModels().find((m) => m.id === id)
}

export function getDefaultModel(): ModelConfig {
  const models = getModels()

  // Check DEFAULT_MODEL_ID env override
  const defaultId = process.env.DEFAULT_MODEL_ID
  if (defaultId) {
    const model = models.find((m) => m.id === defaultId)
    if (model) return model
  }

  // Check isDefault flag
  const defaultModel = models.find((m) => m.isDefault)
  if (defaultModel) return defaultModel

  // Fallback to first model
  return models[0]
}

export function getModelsByCategory(): { category: ModelCategory; label: string; models: ModelConfig[] }[] {
  const models = getModels()
  const grouped = new Map<ModelCategory, ModelConfig[]>()

  for (const model of models) {
    for (const cat of model.categories) {
      const list = grouped.get(cat) ?? []
      list.push(model)
      grouped.set(cat, list)
    }
  }

  return CATEGORY_ORDER
    .filter((cat) => grouped.has(cat))
    .map((cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      models: grouped.get(cat)!,
    }))
}

export function getModelContextWindow(id: string): number {
  return getModelById(id)?.contextWindow ?? 200000
}

/**
 * Check if a model supports vision (image/file input).
 * Defaults to true for backwards compatibility.
 */
export function modelSupportsVision(id: string): boolean {
  const model = getModelById(id)
  return model?.capabilities?.vision !== false
}

/**
 * Public model info for client-side usage.
 * ModelConfig contains no sensitive data, so no separate type needed.
 */
export function getPublicModels(): ModelConfig[] {
  return getModels()
}
