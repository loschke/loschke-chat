export const businessModeConfig = {
  enabled: process.env.NEXT_PUBLIC_BUSINESS_MODE === "true",
  privacyNoticeUrl: process.env.BUSINESS_MODE_PRIVACY_URL ?? null,

  /** PII detection mode: "regex" (local, fast) or future "ai" */
  piiDetectionMode: (process.env.BUSINESS_MODE_PII_DETECTION ?? "regex") as "regex",

  /** EU-compliant model (e.g. "mistral-large-latest") */
  euModelId: process.env.BUSINESS_MODE_EU_MODEL ?? null,

  /** Local model ID for self-hosted inference (e.g. "llama3.1") */
  localModelId: process.env.BUSINESS_MODE_LOCAL_MODEL ?? null,

  /** Local provider URL (OpenAI-compatible, e.g. "http://localhost:11434/v1") */
  localProviderUrl: process.env.BUSINESS_MODE_LOCAL_URL ?? null,
} as const
