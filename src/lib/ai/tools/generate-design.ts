/**
 * generate_design tool — UI design generation via Google Stitch.
 *
 * Uses callTool + deepFind instead of SDK domain API because
 * project.generate() has fragile response parsing that crashes
 * on unexpected response shapes (known SDK 0.0.3 issue).
 */

import { tool } from "ai"
import { z } from "zod"
import { stitch } from "@google/stitch-sdk"
import { createArtifact } from "@/lib/db/queries/artifacts"
import { deepFind, isAllowedStitchUrl } from "./stitch-utils"
import type { ToolRegistration } from "./registry"

/** Stitch metadata stored on artifacts for iteration support */
export interface StitchMetadata {
  stitchProjectId: string
  stitchScreenId: string
}

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
      "Write prompts in English for best results. Be specific about layout, sections, and content.",
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

      const project = await stitch.createProject(title)
      const projectId = project.id
      console.log("[generate_design] Project created:", projectId)

      const raw = await stitch.callTool("generate_screen_from_text", {
        projectId,
        prompt: enrichedPrompt,
        deviceType: deviceType ?? "DESKTOP",
        modelId: "GEMINI_3_FLASH",
      })

      // Extract screen ID and HTML URL via deep search (Stitch response shape varies)
      let screenId: string | null = null
      let htmlUrl: string | null = null

      const downloadUrl = deepFind(raw, "downloadUrl")
      if (typeof downloadUrl === "string") htmlUrl = downloadUrl

      const foundId = deepFind(raw, "screenId") ?? deepFind(raw, "id")
      if (typeof foundId === "string") screenId = foundId

      if (!screenId) {
        const name = deepFind(raw, "name")
        if (typeof name === "string" && name.includes("/screens/")) {
          screenId = name.split("/screens/")[1]
        }
      }

      // Fallback: fetch HTML via get_screen if not in generate response
      if (!htmlUrl && screenId) {
        const screenRaw = await stitch.callTool("get_screen", {
          projectId, screenId,
          name: `projects/${projectId}/screens/${screenId}`,
        }) as Record<string, unknown>
        const foundUrl = deepFind(screenRaw, "downloadUrl")
        if (typeof foundUrl === "string") htmlUrl = foundUrl
      }

      if (!screenId || !htmlUrl) {
        throw new Error(
          `Design-Generierung fehlgeschlagen: screenId=${screenId ?? "null"}, htmlUrl=${htmlUrl ? "found" : "null"}. Bitte Server-Logs pruefen.`
        )
      }

      if (!isAllowedStitchUrl(htmlUrl)) {
        throw new Error("Stitch download URL rejected: unexpected domain.")
      }

      const htmlResponse = await fetch(htmlUrl, { signal: AbortSignal.timeout(30000) })
      if (!htmlResponse.ok) {
        throw new Error(`Failed to download Stitch HTML: ${htmlResponse.status}`)
      }
      const htmlContent = await htmlResponse.text()

      const metadata: StitchMetadata = { stitchProjectId: projectId, stitchScreenId: screenId }
      const artifact = await createArtifact({
        chatId,
        type: "html",
        title,
        content: htmlContent,
        metadata: { ...metadata },
      })

      return {
        artifactId: artifact.id,
        title,
        type: "html" as const,
        version: 1,
      }
    },
  })
}

export const registration: ToolRegistration = {
  name: "generate_design",
  label: "Design generieren",
  icon: "Paintbrush",
  category: "media",
  customRenderer: true,
}
