export const businessModeConfig = {
  enabled: process.env.NEXT_PUBLIC_BUSINESS_MODE === "true",
  privacyNoticeUrl: process.env.BUSINESS_MODE_PRIVACY_URL ?? null,
  euModelId: process.env.BUSINESS_MODE_EU_MODEL ?? null,
} as const
