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
