/**
 * deep_research tool — starts an async deep research task via Gemini.
 *
 * The tool returns immediately with an interactionId. The client polls
 * /api/deep-research/[interactionId] for progress and creates an artifact
 * on completion.
 */

import { tool } from "ai"
import { z } from "zod"
import { startDeepResearch, registerInteractionOwner } from "@/lib/ai/deep-research"
import { getErrorMessage } from "@/lib/errors"
import type { ToolRegistration } from "./registry"

/**
 * Factory: creates a deep_research tool scoped to a chat + user.
 */
export function deepResearchTool(chatId: string, userId: string) {
  return tool({
    description:
      "Start a comprehensive deep research task for complex, multi-faceted questions. " +
      "Use this when the user needs a detailed analysis, comparison study, market research, " +
      "or literature review that requires synthesizing many sources. " +
      "NOT for simple factual lookups (use web_search instead). " +
      "Deep Research takes 5-12 minutes and costs ~50,000 credits. " +
      "CRITICAL: You MUST use ask_user to get explicit confirmation from the user BEFORE calling this tool.",
    inputSchema: z.object({
      query: z.string().min(10).max(2000).describe(
        "Detailed research question. The more specific, the better the results."
      ),
      focusAreas: z.array(z.string()).max(5).optional().describe(
        "Optional focus areas for the report, e.g. ['pricing', 'market share', 'technology']"
      ),
      outputFormat: z.enum(["report", "summary", "comparison"]).optional().describe(
        "report: detailed report with sections. summary: concise overview. comparison: comparison tables."
      ),
    }),
    execute: async ({ query, focusAreas, outputFormat }) => {
      // 1. Build format instructions from optional params
      const formatParts: string[] = []
      if (outputFormat === "report") {
        formatParts.push("Format the output as a detailed report with clear sections, an executive summary, and data tables where appropriate.")
      } else if (outputFormat === "summary") {
        formatParts.push("Format the output as a concise summary with key findings and bullet points.")
      } else if (outputFormat === "comparison") {
        formatParts.push("Format the output as a comparison with tables comparing key dimensions across subjects.")
      }
      if (focusAreas && focusAreas.length > 0) {
        formatParts.push(`Focus areas: ${focusAreas.join(", ")}`)
      }

      const fullQuery = formatParts.length > 0
        ? `${query}\n\n${formatParts.join("\n")}`
        : query

      // 2. Start the research first — only deduct credits after Google accepts the task
      let interactionId: string
      try {
        const result = await startDeepResearch({ query: fullQuery })
        interactionId = result.interactionId
      } catch (err) {
        console.error("[deep_research] Failed to start:", getErrorMessage(err))
        return {
          error: "Deep Research konnte nicht gestartet werden. Bitte versuche es spaeter erneut.",
        }
      }

      // 3. Deduct credits after successful start (Google charges regardless from here)
      const { deductToolCredits, calculateDeepResearchCredits } = await import("@/lib/credits")
      const creditError = await deductToolCredits(userId, calculateDeepResearchCredits(), {
        chatId, description: "Deep Research", toolName: "deep_research",
      })
      if (creditError) {
        // Research already started at Google — log but don't block the user
        console.warn("[deep_research] Credit deduction failed after start:", creditError)
      }

      registerInteractionOwner(interactionId, userId)

      return {
        interactionId,
        status: "in_progress" as const,
        chatId,
        query,
        message: "Deep Research gestartet. Der Bericht wird in 5-12 Minuten fertig. Du kannst in der Zwischenzeit andere Chats nutzen.",
      }
    },
  })
}

export const registration: ToolRegistration = {
  name: "deep_research",
  label: "Deep Research",
  icon: "FlaskConical",
  category: "search",
  customRenderer: true,
  privacySensitive: true,
}
