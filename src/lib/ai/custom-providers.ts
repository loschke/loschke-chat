import { createOpenAICompatible } from "@ai-sdk/openai-compatible"

interface CustomProviderConfig {
  name: string
  baseURL: string
  apiKeyEnvVar: string
}

/**
 * Registry for OpenAI-compatible providers not supported by Vercel AI Gateway.
 * To add a new provider: add an entry here + set the ENV var.
 */
const CUSTOM_PROVIDERS: Record<string, CustomProviderConfig> = {
  ionos: {
    name: "ionos",
    baseURL: "https://openai.inference.de-txl.ionos.com/v1",
    apiKeyEnvVar: "IONOS_API_TOKEN",
  },
}

/**
 * Resolve a custom (non-gateway) model from a prefixed modelId.
 * Returns an AI SDK model instance, or null if the prefix is unknown / key missing.
 *
 * Model IDs may contain nested slashes (e.g. "ionos/meta-llama/Llama-3.3-70B-Instruct").
 * Only the first slash separates the provider prefix from the bare model ID.
 */
export function resolveCustomModel(modelId: string) {
  const slashIndex = modelId.indexOf("/")
  if (slashIndex === -1) return null

  const prefix = modelId.substring(0, slashIndex)
  const config = CUSTOM_PROVIDERS[prefix]
  if (!config) return null

  const apiKey = process.env[config.apiKeyEnvVar]
  if (!apiKey) {
    console.warn(`[custom-provider] ${config.apiKeyEnvVar} not set, skipping ${prefix} provider`)
    return null
  }

  const provider = createOpenAICompatible({
    name: config.name,
    baseURL: config.baseURL,
    apiKey,
  })

  const bareModelId = modelId.substring(slashIndex + 1)
  return provider(bareModelId)
}
