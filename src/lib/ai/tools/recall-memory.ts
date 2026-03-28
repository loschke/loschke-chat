import { tool } from "ai"
import { z } from "zod"

import { searchMemories } from "@/lib/memory"
import type { ToolRegistration } from "./registry"

/**
 * Factory: creates the recall_memory tool bound to a specific userId.
 * Allows the AI to explicitly search long-term memory mid-conversation.
 */
export function createRecallMemoryTool(userId: string) {
  return tool({
    description:
      "Durchsuche das Langzeitgedächtnis nach gespeicherten Informationen über den Nutzer. " +
      "Nutze dies wenn der User fragt was du über ihn weißt, oder wenn du mitten im Gespräch " +
      "zusätzlichen Kontext zu einem neuen Thema brauchst, das beim Chat-Start nicht abgedeckt wurde.",
    inputSchema: z.object({
      query: z
        .string()
        .min(2)
        .max(500)
        .describe("Suchbegriff oder Frage, z.B. 'Welche Programmiersprachen bevorzugt der User?' oder 'Projekt X'"),
    }),
    execute: async ({ query }) => {
      const memories = await searchMemories(userId, query, 10)

      if (memories.length === 0) {
        return { found: false, memories: [] }
      }

      return {
        found: true,
        memories: memories.map((m) => ({
          text: m.memory,
          score: m.score,
        })),
      }
    },
  })
}

export const registration: ToolRegistration = {
  name: "recall_memory",
  label: "Erinnerung abrufen",
  icon: "Brain",
  category: "memory",
  customRenderer: false,
}
