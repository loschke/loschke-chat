import { z } from "zod"
import { upsertModelByModelId } from "@/lib/db/queries/models"
import type { CreateModelInput } from "@/lib/db/queries/models"
import { modelCategoryEnum } from "@/lib/validations/model"

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

const FALLBACK_MODELS: CreateModelInput[] = [
  {
    modelId: "anthropic/claude-sonnet-4-6",
    name: "Claude Sonnet 4",
    provider: "Anthropic",
    categories: ["allrounder"],
    region: "eu",
    contextWindow: 200000,
    maxOutputTokens: 16384,
    isDefault: true,
  },
]

/**
 * Seed models from MODELS_CONFIG ENV into DB.
 * Falls back to a minimal default model if ENV is not set.
 */
export async function seedModels() {
  let modelsToSeed: CreateModelInput[] = FALLBACK_MODELS

  const envConfig = process.env.MODELS_CONFIG
  if (envConfig) {
    try {
      const raw = JSON.parse(envConfig)
      const result = z.array(modelConfigSchema).min(1).safeParse(raw)
      if (result.success) {
        modelsToSeed = result.data.map((m, i) => ({
          modelId: m.id,
          name: m.name,
          provider: m.provider,
          categories: m.categories,
          region: m.region,
          contextWindow: m.contextWindow,
          maxOutputTokens: m.maxOutputTokens,
          isDefault: m.isDefault,
          capabilities: m.capabilities,
          sortOrder: i,
        }))
      } else {
        console.warn("MODELS_CONFIG validation failed, using fallback:", result.error.flatten().fieldErrors)
      }
    } catch (e) {
      console.error("Failed to parse MODELS_CONFIG:", e)
    }
  }

  for (const model of modelsToSeed) {
    try {
      const result = await upsertModelByModelId(model)
      console.log(`  ✓ ${model.name} (${model.modelId}) → ${result.id}`)
    } catch (err) {
      console.error(`  ✗ ${model.name} (${model.modelId}):`, err instanceof Error ? err.message : err)
    }
  }
}
