import { tool } from "ai"
import { z } from "zod"
import { createArtifact } from "@/lib/db/queries/artifacts"
import type { QuizDefinition } from "@/types/quiz"
import type { ToolRegistration } from "./registry"

/**
 * create_quiz tool — creates an interactive quiz as an artifact.
 * Factory pattern: binds chatId at registration time (like createArtifactTool).
 *
 * The quiz JSON is stored as artifact content (type: "quiz").
 * After the user completes the quiz, results are PATCHed into the artifact
 * and a summary message is sent to the chat for model evaluation.
 */
export function createQuizTool(chatId: string) {
  return tool({
    description:
      "Create an interactive quiz with questions and answers. " +
      "Use this to test the user's understanding of a topic, verify knowledge, or create learning exercises. " +
      "The quiz appears in the side panel where the user can answer questions interactively. " +
      "After submission, you'll receive the results and can give feedback. " +
      "Before creating the quiz, write a brief introduction explaining the topic and purpose.",
    inputSchema: z.object({
      title: z.string().max(200).describe("Quiz title"),
      description: z.string().max(500).optional().describe("Brief description shown at the top of the quiz"),
      questions: z
        .array(
          z.object({
            type: z
              .enum(["single_choice", "multiple_choice", "free_text"])
              .describe("single_choice: one correct answer, multiple_choice: multiple correct, free_text: open answer"),
            question: z.string().max(1000).describe("The question text"),
            options: z
              .array(z.string().max(500))
              .min(2)
              .max(8)
              .optional()
              .describe("Answer options (required for single_choice and multiple_choice)"),
            correctAnswer: z
              .union([z.number(), z.array(z.number())])
              .optional()
              .describe("Correct option index (0-based) for single_choice, or array of indices for multiple_choice"),
            explanation: z
              .string()
              .max(1000)
              .optional()
              .describe("Explanation shown after the question is answered"),
          })
        )
        .min(1)
        .max(20)
        .describe("Quiz questions"),
    }),
    execute: async ({ title, description, questions }) => {
      const quizDef: QuizDefinition = {
        title,
        description,
        questions: questions.map((q, i) => ({
          id: `q${i + 1}`,
          ...q,
        })),
      }

      const artifact = await createArtifact({
        chatId,
        type: "quiz",
        title,
        content: JSON.stringify(quizDef),
      })

      return {
        artifactId: artifact.id,
        title: artifact.title,
        type: "quiz",
        version: artifact.version,
        questionCount: questions.length,
      }
    },
  })
}

export const registration: ToolRegistration = {
  name: "create_quiz",
  label: "Quiz",
  icon: "HelpCircle",
  category: "core",
  customRenderer: true,
}
