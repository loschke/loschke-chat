import { gateway } from "ai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import { resolveCustomModel } from "./custom-providers"

/**
 * LLM routing mode — controls how model IDs are resolved to provider instances.
 *
 * - "gateway"  → Vercel AI Gateway (default, SaaS deployment)
 * - "direct"   → Direct provider SDKs based on modelId prefix (EU/Local deployment)
 * - "litellm"  → OpenAI-compatible proxy (self-hosted LLM gateway)
 */
export type LlmRoutingMode = "gateway" | "direct" | "litellm"

const routingMode = (process.env.LLM_ROUTING ?? "gateway") as LlmRoutingMode

/**
 * Resolve a model instance from a modelId string.
 *
 * Resolution order (first non-null wins):
 * 1. Custom providers (Ionos, Ollama — always checked, regardless of routing mode)
 * 2. Direct provider SDKs (only in "direct" mode — Mistral, Google, Anthropic, OpenAI)
 * 3. LiteLLM proxy (only in "litellm" mode)
 * 4. Vercel AI Gateway (only in "gateway" mode — the default)
 *
 * In "direct" mode without a matching provider, throws an error.
 * In "gateway" mode, unknown prefixes fall through to the gateway.
 */
export function resolveModel(modelId: string) {
  // 1. Custom providers always take priority (Ionos, Ollama, etc.)
  const customModel = resolveCustomModel(modelId)
  if (customModel) return customModel

  // 2. Route based on LLM_ROUTING mode
  if (routingMode === "direct") {
    return resolveDirectProvider(modelId)
  }

  if (routingMode === "litellm") {
    return resolveLiteLlm(modelId)
  }

  // Default: Vercel AI Gateway
  return gateway(modelId)
}

/**
 * Direct provider resolution — extracts provider from modelId prefix
 * and instantiates the corresponding SDK.
 *
 * Providers are lazy-imported at module level on first use to keep startup fast
 * while remaining synchronous at call time.
 */
function resolveDirectProvider(modelId: string) {
  const slashIndex = modelId.indexOf("/")
  if (slashIndex === -1) {
    throw new Error(`[model-resolver] Invalid modelId "${modelId}" — expected "provider/model" format`)
  }

  const prefix = modelId.substring(0, slashIndex)
  const bareModelId = modelId.substring(slashIndex + 1)

  switch (prefix) {
    case "mistral": {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { mistral } = require("@ai-sdk/mistral")
      return mistral(bareModelId)
    }
    case "anthropic": {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createAnthropic } = require("@ai-sdk/anthropic")
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) throw new Error("[model-resolver] ANTHROPIC_API_KEY not set for direct routing")
      return createAnthropic({ apiKey })(bareModelId)
    }
    case "google": {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { google } = require("@ai-sdk/google")
      return google(bareModelId)
    }
    default:
      throw new Error(
        `[model-resolver] Unknown provider prefix "${prefix}" in direct routing mode. ` +
        `Supported: mistral, anthropic, google. ` +
        `For OpenAI-compatible providers (Ionos, Ollama), register them in custom-providers.ts`
      )
  }
}

/**
 * LiteLLM proxy — routes all models through a self-hosted OpenAI-compatible endpoint.
 * Requires LITELLM_BASE_URL (default: http://localhost:4000/v1).
 */
function resolveLiteLlm(modelId: string) {
  const baseURL = process.env.LITELLM_BASE_URL ?? "http://localhost:4000/v1"
  const apiKey = process.env.LITELLM_API_KEY ?? "sk-litellm"

  const provider = createOpenAICompatible({
    name: "litellm",
    baseURL,
    apiKey,
  })

  // Pass full modelId — LiteLLM handles provider routing via its own config
  return provider(modelId)
}

/** Check if we're using gateway routing (default SaaS mode) */
export function isGatewayRouting(): boolean {
  return routingMode === "gateway"
}

/** Get the current routing mode for logging/debugging */
export function getRoutingMode(): LlmRoutingMode {
  return routingMode
}
