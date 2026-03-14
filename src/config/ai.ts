import { getDefaultModel, getModelById } from "./models"

/**
 * Shared AI defaults used by both chat and assistant configs.
 *
 * Note: `model` is now a sync getter that uses the ENV/cache fallback.
 * For full DB resolution, use `getDefaultModel()` directly in async contexts.
 */
export const aiDefaults = {
  get model() {
    // Sync path: use getModelById cache or ENV fallback
    const defaultId = process.env.DEFAULT_MODEL_ID
    if (defaultId) {
      const m = getModelById(defaultId)
      if (m) return m.id
    }
    // Fallback to hardcoded default
    return "anthropic/claude-sonnet-4-6"
  },
  temperature: 0.7,
} as const

/**
 * Async version — resolves default model from DB when available.
 */
export async function getDefaultModelId(): Promise<string> {
  const model = await getDefaultModel()
  return model.id
}
