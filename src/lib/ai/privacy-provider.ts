import { mistral } from "@ai-sdk/mistral"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import { businessModeConfig } from "@/config/business-mode"
import { resolveCustomModel } from "./custom-providers"

/**
 * Resolve an alternative model for privacy routing.
 * Returns null if the requested route is not configured — caller should fall back to default.
 */
export function resolvePrivacyModel(privacyRoute: "eu" | "de" | "local") {
  try {
    if (privacyRoute === "eu" && businessModeConfig.euModelId) {
      // Strip provider prefix if present (e.g. "mistral/mistral-large-latest" → "mistral-large-latest")
      const modelId = businessModeConfig.euModelId.replace(/^mistral\//, "")
      return mistral(modelId)
    }

    if (privacyRoute === "de" && businessModeConfig.deModelId) {
      // IONOS via custom provider registry (already registered in custom-providers.ts)
      return resolveCustomModel(businessModeConfig.deModelId)
    }

    if (
      privacyRoute === "local" &&
      businessModeConfig.localModelId &&
      businessModeConfig.localProviderUrl
    ) {
      const provider = createOpenAICompatible({
        name: "local-llm",
        baseURL: businessModeConfig.localProviderUrl,
      })
      return provider(businessModeConfig.localModelId)
    }
  } catch (error) {
    console.error("[privacy-provider] Failed to resolve privacy model:", error)
    return null
  }

  return null
}
