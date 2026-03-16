import { mistral } from "@ai-sdk/mistral"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import { businessModeConfig } from "@/config/business-mode"

/**
 * Resolve an alternative model for privacy routing.
 * Returns null if the requested route is not configured — caller should fall back to default.
 */
export function resolvePrivacyModel(privacyRoute: "eu" | "local") {
  try {
    if (privacyRoute === "eu" && businessModeConfig.euModelId) {
      // Strip provider prefix if present (e.g. "mistral/mistral-large-latest" → "mistral-large-latest")
      const modelId = businessModeConfig.euModelId.replace(/^mistral\//, "")
      return mistral(modelId)
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
