import { tool } from "ai"
import { z } from "zod"
import type { ToolRegistration } from "./registry"

/**
 * content_alternatives tool — pauses the stream and presents switchable content variants.
 * No `execute` function: the stream pauses, the client renders tabs with alternatives,
 * and the user's selection is sent back via `addToolResult`.
 *
 * Pattern: identical to ask_user (no execute, addToolResult back-channel).
 */
export const contentAlternativesTool = tool({
  description:
    "Present 2-5 content alternatives for the user to choose from. " +
    "Use this when you've generated multiple variants (e.g. headlines, text versions, approaches) " +
    "and want the user to pick their preferred option before continuing. " +
    "Each alternative should be meaningfully different, not just minor wording changes.",
  inputSchema: z.object({
    prompt: z
      .string()
      .max(300)
      .optional()
      .describe("Optional instruction displayed above the alternatives"),
    alternatives: z
      .array(
        z.object({
          label: z.string().max(100).describe("Short label for this variant (e.g. 'Variante A: Sachlich')"),
          content: z.string().min(1).max(50_000).describe("Full content in Markdown"),
        })
      )
      .min(2)
      .max(5)
      .describe("Content alternatives to present"),
  }),
})

export const registration: ToolRegistration = {
  name: "content_alternatives",
  label: "Varianten",
  icon: "Layers",
  category: "core",
  customRenderer: true,
}
