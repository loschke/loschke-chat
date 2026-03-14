/**
 * Model Registry — DB-backed with ENV fallback.
 *
 * Models are grouped by purpose categories, not by provider.
 * A model can belong to multiple categories.
 * Each model has a region flag for privacy-aware selection.
 *
 * Resolution chain: DB → ENV (MODELS_CONFIG) → FALLBACK_MODELS
 * Uses 60s TTL cache to avoid excessive DB queries.
 */

import { z } from "zod"
import { modelCategoryEnum } from "@/lib/validations/model"

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
  inputPrice?: { per1m?: number }
  outputPrice?: { per1m?: number }
}

const modelConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  provider: z.string().min(1),
  categories: z.array(modelCategoryEnum).min(1),
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

// --- Cache ---
let cachedModels: ModelConfig[] | null = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 60_000

/** Clear model cache (call after admin mutations) */
export function clearModelCache() {
  cachedModels = null
  cacheTimestamp = 0
}

/** Parse models from ENV (sync fallback when DB is unavailable) */
function parseModelsFromEnv(): ModelConfig[] {
  const envConfig = process.env.MODELS_CONFIG
  if (envConfig) {
    try {
      const raw = JSON.parse(envConfig)
      const result = modelsConfigSchema.safeParse(raw)
      if (result.success) {
        return result.data
      }
      console.warn("MODELS_CONFIG validation failed, using fallback:", result.error.flatten().fieldErrors)
    } catch (e) {
      console.error("Failed to parse MODELS_CONFIG:", e)
    }
  }
  return FALLBACK_MODELS
}

/**
 * Map a DB model row to ModelConfig.
 */
function dbRowToModelConfig(row: {
  modelId: string
  name: string
  provider: string
  categories: string[]
  region: string
  contextWindow: number
  maxOutputTokens: number
  isDefault: boolean
  capabilities: { vision?: boolean; fileInput?: boolean } | null
  inputPrice: { per1m?: number } | null
  outputPrice: { per1m?: number } | null
}): ModelConfig {
  return {
    id: row.modelId,
    name: row.name,
    provider: row.provider,
    categories: row.categories as ModelCategory[],
    region: row.region as "eu" | "us",
    contextWindow: row.contextWindow,
    maxOutputTokens: row.maxOutputTokens,
    isDefault: row.isDefault,
    capabilities: row.capabilities ?? undefined,
    inputPrice: row.inputPrice ?? undefined,
    outputPrice: row.outputPrice ?? undefined,
  }
}

/**
 * Get all active models. Async with DB-backed resolution.
 * Fallback chain: DB → ENV → FALLBACK_MODELS
 */
export async function getModels(): Promise<ModelConfig[]> {
  const now = Date.now()
  if (cachedModels && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedModels
  }

  try {
    const { getActiveModels } = await import("@/lib/db/queries/models")
    const dbModels = await getActiveModels()
    if (dbModels.length > 0) {
      cachedModels = dbModels.map(dbRowToModelConfig)
      cacheTimestamp = now
      return cachedModels
    }
  } catch {
    // DB not available — fall through to ENV
  }

  cachedModels = parseModelsFromEnv()
  cacheTimestamp = now
  return cachedModels
}

/**
 * Synchronous model lookup — uses cache if warm, ENV fallback if cold.
 * Prefer the async getModels() in async contexts.
 */
export function getModelById(id: string): ModelConfig | undefined {
  // Use cache if warm
  if (cachedModels && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedModels.find((m) => m.id === id)
  }
  // Sync fallback for cold cache (ENV-based)
  return parseModelsFromEnv().find((m) => m.id === id)
}

export async function getDefaultModel(): Promise<ModelConfig> {
  const models = await getModels()

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

export async function getModelsByCategory(): Promise<{ category: ModelCategory; label: string; models: ModelConfig[] }[]> {
  const models = await getModels()
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
 */
export async function getPublicModels(): Promise<ModelConfig[]> {
  return getModels()
}
