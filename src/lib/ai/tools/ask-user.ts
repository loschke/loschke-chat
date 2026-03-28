import { tool } from "ai"
import { z } from "zod"
import type { ToolRegistration } from "./registry"

/**
 * ask_user tool — pauses the stream and presents structured questions to the user.
 * No `execute` function: the stream pauses, the client renders the questions,
 * and the user's response is sent back via `addToolResult`.
 */
export const askUserTool = tool({
  description:
    "Ask the user structured questions when you need clarification or input to proceed. " +
    "Use this when the user's request is ambiguous, when you need to choose between options, " +
    "or when gathering specific requirements before creating content.",
  inputSchema: z.object({
    questions: z
      .array(
        z.object({
          question: z.string().describe("The question to ask the user"),
          type: z
            .enum(["single_select", "multi_select", "free_text"])
            .describe("Question type: single_select (radio), multi_select (checkboxes), free_text (textarea)"),
          options: z
            .array(z.string())
            .min(2)
            .max(6)
            .optional()
            .describe("Options for single_select or multi_select (required for those types)"),
        })
      )
      .min(1)
      .max(3)
      .describe("List of questions to ask (max 3)"),
  }),
})

export const registration: ToolRegistration = {
  name: "ask_user",
  label: "Rückfrage",
  icon: "MessageCircle",
  category: "core",
  customRenderer: true,
}
