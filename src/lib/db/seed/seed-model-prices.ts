/**
 * Seed model prices into DB.
 * Run via: npx tsx src/lib/db/seed/seed-model-prices.ts
 *
 * Prices as of March 2026 from provider pricing pages.
 * Gateway model IDs (provider/model-name format).
 */

import { eq } from "drizzle-orm"

// Model pricing data: gateway modelId → input/output per 1M tokens in USD
const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  // Anthropic
  "anthropic/claude-opus-4-6":           { input: 15.00, output: 75.00 },
  "anthropic/claude-sonnet-4-6":         { input: 3.00,  output: 15.00 },
  "anthropic/claude-haiku-4-5":          { input: 0.80,  output: 4.00 },
  "anthropic/claude-sonnet-4-20250514":  { input: 3.00,  output: 15.00 },
  "anthropic/claude-haiku-3-5-20241022": { input: 0.80,  output: 4.00 },

  // Google
  "google/gemini-2.5-pro":              { input: 1.25,  output: 10.00 },
  "google/gemini-2.5-flash":            { input: 0.15,  output: 0.60 },
  "google/gemini-2.0-flash":            { input: 0.10,  output: 0.40 },
  "google/gemini-flash-1.5":            { input: 0.075, output: 0.30 },
  "google/gemini-pro-1.5":              { input: 1.25,  output: 5.00 },
  "google/gemini-3.1-pro-preview":      { input: 1.25,  output: 10.00 },
  "google/gemini-3-flash":              { input: 0.15,  output: 0.60 },

  // OpenAI
  "openai/gpt-4o":                      { input: 2.50,  output: 10.00 },
  "openai/gpt-4o-mini":                 { input: 0.15,  output: 0.60 },
  "openai/gpt-4.1":                     { input: 2.00,  output: 8.00 },
  "openai/gpt-4.1-mini":               { input: 0.40,  output: 1.60 },
  "openai/gpt-4.1-nano":               { input: 0.10,  output: 0.40 },
  "openai/o1":                          { input: 15.00, output: 60.00 },
  "openai/o1-mini":                     { input: 1.10,  output: 4.40 },
  "openai/o3":                          { input: 10.00, output: 40.00 },
  "openai/o3-mini":                     { input: 1.10,  output: 4.40 },
  "openai/o4-mini":                     { input: 1.10,  output: 4.40 },
  "openai/gpt-5.1-instant":             { input: 0.40,  output: 1.60 },

  // Mistral
  "mistral/mistral-large-3":            { input: 2.00,  output: 6.00 },
  "mistral/mistral-large-latest":       { input: 2.00,  output: 6.00 },
  "mistral/mistral-medium-latest":      { input: 0.40,  output: 2.00 },
  "mistral/mistral-small-latest":       { input: 0.10,  output: 0.30 },
  "mistral/codestral-latest":           { input: 0.30,  output: 0.90 },

  // xAI
  "xai/grok-3":                         { input: 3.00,  output: 15.00 },
  "xai/grok-3-mini":                    { input: 0.30,  output: 0.50 },

  // DeepSeek
  "deepseek/deepseek-chat":             { input: 0.27,  output: 1.10 },
  "deepseek/deepseek-reasoner":         { input: 0.55,  output: 2.19 },
}

async function main() {
  const { getDb } = await import("@/lib/db")
  const { models } = await import("@/lib/db/schema/models")

  const db = getDb()
  const allModels = await db.select().from(models)

  let updated = 0
  let skipped = 0

  for (const model of allModels) {
    const prices = MODEL_PRICES[model.modelId]
    if (!prices) {
      console.log(`  ? ${model.modelId} — kein Preis bekannt, uebersprungen`)
      skipped++
      continue
    }

    await db
      .update(models)
      .set({
        inputPrice: { per1m: prices.input },
        outputPrice: { per1m: prices.output },
        updatedAt: new Date(),
      })
      .where(eq(models.id, model.id))

    console.log(`  ✓ ${model.name} (${model.modelId}) → $${prices.input}/$${prices.output} per 1M`)
    updated++
  }

  console.log(`\n${updated} aktualisiert, ${skipped} uebersprungen`)
  process.exit(0)
}

main().catch((err) => {
  console.error("Fehler:", err)
  process.exit(1)
})
