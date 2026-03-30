/**
 * Central credit configuration.
 *
 * All credit-related settings in one place. ENV variables override defaults
 * for instance-specific pricing (e.g. per Vercel project).
 *
 * Scale: 100 credits/dollar → 1 credit = 1 cent.
 */

function envInt(key: string, fallback: number): number {
  return parseInt(process.env[key] ?? String(fallback), 10)
}

export const creditConfig = {
  /** Credits per US Dollar. 100 = 1 Credit = 1 Cent. */
  creditsPerDollar: envInt("CREDITS_PER_DOLLAR", 100),

  /** Fallback model pricing (per 1M tokens) when model has no config */
  fallbackInputPrice: parseFloat(process.env.FALLBACK_INPUT_PRICE ?? "1.0"),
  fallbackOutputPrice: parseFloat(process.env.FALLBACK_OUTPUT_PRICE ?? "5.0"),

  /** Cache discount factor (0.9 = cached tokens cost 10% of normal) */
  cacheDiscount: 0.9,

  /** Flat-rate tool costs in credits */
  toolCosts: {
    imageGeneration: envInt("IMAGE_GENERATION_CREDITS", 8),
    deepResearch: envInt("DEEP_RESEARCH_CREDITS", 400),
    youtubeSearch: envInt("YOUTUBE_SEARCH_CREDITS", 1),
    youtubeAnalyze: envInt("YOUTUBE_ANALYZE_CREDITS", 5),
    tts: envInt("TTS_CREDITS", 3),
    branding: envInt("BRANDING_CREDITS", 1),
    stitchGeneration: envInt("STITCH_GENERATION_CREDITS", 5),
    stitchEdit: envInt("STITCH_EDIT_CREDITS", 3),
    googleSearch: envInt("GOOGLE_SEARCH_CREDITS", 1),
  },

  /** Display thresholds for balance color coding */
  display: {
    greenAbove: 100, // > 1,00€
    amberAbove: 20, // > 0,20€
  },

  /** Admin constraints */
  admin: {
    maxGrant: 10_000, // max 100€ pro Grant
  },
} as const
