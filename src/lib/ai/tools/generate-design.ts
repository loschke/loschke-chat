/**
 * generate_design tool — UI design generation via Google Stitch.
 *
 * Fire-and-forget: creates a Stitch project, kicks off generation
 * in the background, and returns a direct link to the project.
 * The user views the result in Stitch's web interface.
 */

import { tool } from "ai"
import { z } from "zod"
import { stitch } from "@google/stitch-sdk"
import { fireAndForget } from "@/lib/errors"
import type { ToolRegistration } from "./registry"

const STITCH_BASE_URL = "https://stitch.withgoogle.com/projects"

/**
 * Factory: creates a generate_design tool scoped to a chat + user.
 */
export function generateDesignTool(chatId: string, userId: string) {
  return tool({
    description:
      "Generate a production-quality UI design from a text description using Google Stitch. " +
      "Use this for landing pages, dashboards, app screens, settings pages, and any visual UI design. " +
      "Stitch produces high-quality HTML with Tailwind CSS — much better than writing HTML manually. " +
      "For simple code snippets or non-visual content, use create_artifact instead. " +
      "Write prompts in English for best results. Be specific about layout, sections, and content. " +
      "The design is generated in Stitch's background and can be viewed via the returned link.",
    inputSchema: z.object({
      prompt: z.string().min(3).max(8000).describe(
        "Detailed description of the UI design to generate. Include layout structure, sections, content, and style preferences. Write in English. Be as detailed as possible — Stitch produces better results with specific descriptions."
      ),
      title: z.string().max(200).describe("Short title for the generated design"),
      style: z.string().max(200).optional().describe(
        "Style hint, e.g. 'dark mode SaaS dashboard', 'minimal portfolio', 'colorful landing page'"
      ),
      colorScheme: z.string().max(200).optional().describe(
        "Color scheme, e.g. 'blue and white', 'dark with purple accents', 'warm earth tones'"
      ),
      deviceType: z.enum(["DESKTOP", "MOBILE", "TABLET"]).optional().describe(
        "Target device type. Defaults to DESKTOP."
      ),
    }),
    execute: async ({ prompt, title, style, colorScheme, deviceType }) => {
      // Pre-check credits before calling Stitch API
      const { deductToolCredits, calculateStitchGenerationCredits } = await import("@/lib/credits")
      const creditError = await deductToolCredits(userId, calculateStitchGenerationCredits(), {
        chatId, description: "Design-Generierung (Stitch)", toolName: "generate_design",
      })
      if (creditError) {
        return { error: creditError }
      }

      let enrichedPrompt = prompt
      if (style) enrichedPrompt += `\nStyle: ${style}`
      if (colorScheme) enrichedPrompt += `\nColor scheme: ${colorScheme}`

      // Create project (fast, ~2s)
      const project = await stitch.createProject(title)
      const projectId = project.id
      console.log("[generate_design] Project created:", projectId)

      // Fire-and-forget: generation runs on Google's servers
      fireAndForget("generate_design", () =>
        stitch.callTool("generate_screen_from_text", {
          projectId,
          prompt: enrichedPrompt,
          deviceType: deviceType ?? "DESKTOP",
          modelId: "GEMINI_3_FLASH",
        })
      )

      return {
        projectId,
        title,
        stitchUrl: `${STITCH_BASE_URL}/${projectId}`,
        message: "Design-Generierung in Stitch gestartet. Der Entwurf wird im Hintergrund erstellt.",
      }
    },
  })
}

export const registration: ToolRegistration = {
  name: "generate_design",
  label: "Design generieren",
  icon: "Paintbrush",
  category: "media",
  customRenderer: false,
}
