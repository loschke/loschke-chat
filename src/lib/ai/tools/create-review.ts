import { tool } from "ai"
import { z } from "zod"
import { createArtifact } from "@/lib/db/queries/artifacts"
import type { ToolRegistration } from "./registry"

/**
 * create_review tool — creates a markdown artifact in review mode.
 * The markdown content is split by ## headings in the renderer.
 * Each section gets feedback controls (approve/change/question/remove + comment).
 *
 * Review is now a MODE of the markdown artifact, not a separate type.
 * This saves tokens (no JSON wrapper) and preserves the .md document character.
 */
export function createReviewTool(chatId: string) {
  return tool({
    description:
      "Create a structured document for section-by-section review. " +
      "Use this when you generate concepts, strategies, blog posts, plans, or any longer structured content " +
      "that the user should review and give feedback on before finalizing. " +
      "Write the content as Markdown with ## headings to define reviewable sections. " +
      "Each ## section becomes a separate review block where the user can approve, request changes, ask questions, or remove it. " +
      "Before creating the review, write a brief intro explaining what you've created.",
    inputSchema: z.object({
      title: z.string().max(200).describe("Title of the document being reviewed"),
      content: z.string().min(1).max(500_000).describe("Full markdown content with ## headings as section boundaries"),
    }),
    execute: async ({ title, content }) => {
      const artifact = await createArtifact({
        chatId,
        type: "markdown",
        title,
        content,
      })

      return {
        artifactId: artifact.id,
        title: artifact.title,
        type: "markdown",
        version: artifact.version,
        reviewMode: true,
      }
    },
  })
}

export const registration: ToolRegistration = {
  name: "create_review",
  label: "Review",
  icon: "ClipboardCheck",
  category: "core",
  customRenderer: true,
}
