import { tool } from "ai"
import { z } from "zod"

import { saveMemory } from "@/lib/memory"
import type { ToolRegistration } from "./registry"

/**
 * Factory: creates the save_memory tool bound to a specific userId.
 * Allows the AI to explicitly save important information to long-term memory.
 */
export function createSaveMemoryTool(userId: string) {
  return tool({
    description:
      "Speichere eine wichtige Information über den Nutzer im Langzeitgedächtnis. " +
      "Nutze dies wenn der User explizit darum bittet sich etwas zu merken, " +
      "oder wenn du eine wichtige persönliche Präferenz erkennst. " +
      "Formuliere die Information klar und präzise.",
    inputSchema: z.object({
      memory: z
        .string()
        .transform((s) => s.trim())
        .pipe(z.string().min(3).max(2000))
        .describe("Die zu merkende Information, klar und präzise formuliert"),
    }),
    execute: async ({ memory }) => {
      await saveMemory(userId, memory)
      return { saved: true, memory }
    },
  })
}

export const registration: ToolRegistration = {
  name: "save_memory",
  label: "Erinnerung speichern",
  icon: "Bookmark",
  category: "memory",
  customRenderer: false,
}
