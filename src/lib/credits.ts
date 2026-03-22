/**
 * Credit calculation from token usage and model pricing.
 *
 * Formula:
 *   creditCost = max(1, ceil(
 *     (inputTokens * inputPrice + outputTokens * outputPrice
 *      + reasoningTokens * outputPrice - cachedInputTokens * inputPrice * CACHE_DISCOUNT)
 *     / 1_000_000 * CREDITS_PER_DOLLAR
 *   ))
 */

import { getModelById } from "@/config/models"

const CREDITS_PER_DOLLAR = parseInt(process.env.CREDITS_PER_DOLLAR ?? "100000", 10)
const FALLBACK_INPUT_PRICE = parseFloat(process.env.FALLBACK_INPUT_PRICE ?? "1.0")
const FALLBACK_OUTPUT_PRICE = parseFloat(process.env.FALLBACK_OUTPUT_PRICE ?? "5.0")
const CACHE_DISCOUNT = 0.9

export interface CreditCalculationInput {
  modelId: string
  inputTokens: number
  outputTokens: number
  reasoningTokens?: number
  cachedInputTokens?: number
}

/**
 * Format credit balance for display (e.g. 1.2M, 15k, 1,2k, 500).
 */
export function formatCredits(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")}M`
  if (n >= 10_000) return `${Math.round(n / 1_000)}k`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(".", ",")}k`
  return n.toLocaleString("de-DE")
}

/**
 * Get Tailwind color class for credit balance indicator.
 */
export function getBalanceColorClass(balance: number): string {
  if (balance > 10_000) return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
  if (balance > 1_000) return "bg-amber-500/15 text-amber-600 dark:text-amber-400"
  return "bg-red-500/15 text-red-600 dark:text-red-400"
}

/** Flat credit cost for image generation (not token-based). */
const IMAGE_GENERATION_CREDITS = parseInt(process.env.IMAGE_GENERATION_CREDITS ?? "8000", 10)

export function calculateImageCredits(): number {
  return IMAGE_GENERATION_CREDITS
}

export function calculateCredits(input: CreditCalculationInput): number {
  const model = getModelById(input.modelId)
  const inputPrice = model?.inputPrice?.per1m ?? FALLBACK_INPUT_PRICE
  const outputPrice = model?.outputPrice?.per1m ?? FALLBACK_OUTPUT_PRICE

  const rawCost =
    input.inputTokens * inputPrice
    + input.outputTokens * outputPrice
    + (input.reasoningTokens ?? 0) * outputPrice
    - (input.cachedInputTokens ?? 0) * inputPrice * CACHE_DISCOUNT

  const credits = Math.ceil((rawCost / 1_000_000) * CREDITS_PER_DOLLAR)
  return Math.max(1, credits)
}
