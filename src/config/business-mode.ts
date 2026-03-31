export const businessModeConfig = {
  enabled: process.env.NEXT_PUBLIC_BUSINESS_MODE === "true",
  privacyNoticeUrl: process.env.BUSINESS_MODE_PRIVACY_URL ?? null,

  /** PII detection mode: "regex" (local, fast) or future "ai" */
  piiDetectionMode: (process.env.BUSINESS_MODE_PII_DETECTION ?? "regex") as "regex",

  /** EU-compliant model (e.g. "mistral-large-latest") — Mistral, Paris */
  euModelId: process.env.BUSINESS_MODE_EU_MODEL ?? null,

  /** DE-compliant model via IONOS (e.g. "ionos/meta-llama/Llama-3.3-70B-Instruct") — Frankfurt */
  deModelId: process.env.BUSINESS_MODE_DE_MODEL ?? null,

  /** Local model ID for self-hosted inference (e.g. "llama3.1") — Ollama */
  localModelId: process.env.BUSINESS_MODE_LOCAL_MODEL ?? null,

  /** Local provider URL (OpenAI-compatible, e.g. "http://localhost:11434/v1") */
  localProviderUrl: process.env.BUSINESS_MODE_LOCAL_URL ?? null,

  /** SafeChat default route: "eu", "de", or "local" */
  safeChatRoute: (process.env.BUSINESS_MODE_SAFE_CHAT_ROUTE ?? "eu") as "eu" | "de" | "local",

  /** SafeChat display label */
  safeChatLabel: process.env.BUSINESS_MODE_SAFE_CHAT_LABEL ?? "SafeChat",
} as const
