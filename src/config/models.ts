/**
 * Model Registry — Konfiguration via ENV, kein Deployment nötig.
 *
 * Modelle werden nach Zweck-Kategorien gruppiert,
 * nicht nach Provider. Ein Model kann mehreren Kategorien
 * angehören. Jedes Model hat eine Region-Flagge
 * für datenschutzbewusste Auswahl.
 */

export type ModelCategory =
  | "enterprise"
  | "allrounder"
  | "creative"
  | "coding"
  | "analysis"
  | "fast"

export interface ModelConfig {
  id: string
  name: string
  provider: string
  categories: ModelCategory[]
  region: "eu" | "us"
  contextWindow: number
  maxOutputTokens: number
  isDefault: boolean
}

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
      const parsed = JSON.parse(envConfig) as ModelConfig[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedModels = parsed
        return parsed
      }
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
 * Public model info for client-side usage (no sensitive data).
 */
export interface PublicModelConfig {
  id: string
  name: string
  provider: string
  categories: ModelCategory[]
  region: "eu" | "us"
  contextWindow: number
  maxOutputTokens: number
  isDefault: boolean
}

export function getPublicModels(): PublicModelConfig[] {
  return getModels()
}
