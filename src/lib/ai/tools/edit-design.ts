/**
 * edit_design tool — iterates on an existing Stitch-generated design.
 * Same callTool + deepFind approach as generate-design.ts.
 */

import { tool } from "ai"
import { z } from "zod"
import { stitch } from "@google/stitch-sdk"
import { getArtifactByIdForUser, updateArtifactContent } from "@/lib/db/queries/artifacts"
import type { StitchMetadata } from "./generate-design"
import { deepFind, isAllowedStitchUrl } from "./stitch-utils"
import type { ToolRegistration } from "./registry"

/**
 * Factory: creates an edit_design tool scoped to a chat + user.
 */
export function editDesignTool(chatId: string, userId: string) {
  return tool({
    description:
      "Edit or iterate on an existing Stitch-generated design. " +
      "Use this when the user wants to modify, refine, or update a previously generated UI design. " +
      "You MUST provide the artifactId of the design to edit. " +
      "Describe only the changes, not the entire design. " +
      "Examples: 'Make the header larger', 'Change colors to dark mode', 'Add a pricing section'. " +
      "Write prompts in English for best results.",
    inputSchema: z.object({
      artifactId: z.string().describe(
        "ID of the existing design artifact to edit. Must be a Stitch-generated html artifact."
      ),
      prompt: z.string().min(3).max(4000).describe(
        "Description of the changes to make. Describe ONLY the changes, not the whole design. Write in English."
      ),
      deviceType: z.enum(["DESKTOP", "MOBILE", "TABLET"]).optional().describe(
        "Target device type for the edited design. Defaults to original device type."
      ),
    }),
    execute: async ({ artifactId, prompt, deviceType }) => {
      // 1. Load existing artifact with metadata
      const existing = await getArtifactByIdForUser(artifactId, userId)
      if (!existing) {
        return { error: "Design-Artifact nicht gefunden oder kein Zugriff." }
      }
      if (existing.type !== "html") {
        return { error: "Nur HTML-Designs koennen mit edit_design bearbeitet werden." }
      }

      const metadata = existing.metadata as StitchMetadata | null
      if (!metadata?.stitchProjectId || !metadata?.stitchScreenId) {
        return { error: "Dieses Artifact hat keine Stitch-Metadaten. Nur mit generate_design erstellte Designs koennen iteriert werden." }
      }

      // Pre-check credits before calling Stitch API
      const { deductToolCredits, calculateStitchEditCredits } = await import("@/lib/credits")
      const creditError = await deductToolCredits(userId, calculateStitchEditCredits(), {
        chatId, description: "Design-Iteration (Stitch)", toolName: "edit_design",
      })
      if (creditError) {
        return { error: creditError }
      }

      const { stitchProjectId: projectId, stitchScreenId: originalScreenId } = metadata

      // 2. Edit via callTool (bypasses fragile SDK response parsing)
      console.log("[edit_design] Editing screen", originalScreenId, "in project", projectId)
      const raw = await stitch.callTool("edit_screens", {
        projectId,
        selectedScreenIds: [originalScreenId],
        prompt,
        deviceType,
        modelId: "GEMINI_3_FLASH",
      })

      console.log("[edit_design] Raw response keys:", Object.keys(raw as object))

      // 3. Extract screen ID and HTML URL via deep search
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

      // Make sure we got a NEW screen, not the original
      if (screenId === originalScreenId) {
        console.warn("[edit_design] Got same screenId as original, looking for another...")
        screenId = null
      }

      console.log("[edit_design] Extracted screenId:", screenId, "htmlUrl:", htmlUrl ? "found" : "not found")

      if (!screenId) {
        throw new Error("Design-Iteration fehlgeschlagen: Neuer Screen konnte nicht identifiziert werden.")
      }

      // 4. Fetch HTML if not in edit response
      if (!htmlUrl) {
        console.log("[edit_design] Fetching HTML via get_screen...")
        const screenRaw = await stitch.callTool("get_screen", {
          projectId, screenId,
          name: `projects/${projectId}/screens/${screenId}`,
        }) as Record<string, unknown>
        const foundUrl = deepFind(screenRaw, "downloadUrl")
        if (typeof foundUrl === "string") htmlUrl = foundUrl
      }

      if (!htmlUrl) {
        throw new Error("Design-Iteration fehlgeschlagen: HTML-URL nicht verfuegbar.")
      }

      // 5. Download HTML
      if (!isAllowedStitchUrl(htmlUrl)) {
        throw new Error("Stitch download URL rejected: unexpected domain.")
      }

      const htmlResponse = await fetch(htmlUrl, { signal: AbortSignal.timeout(30000) })
      if (!htmlResponse.ok) {
        throw new Error(`Failed to download edited Stitch HTML: ${htmlResponse.status}`)
      }
      let htmlContent = await htmlResponse.text()

      // 6. Update artifact
      const newMetadata: StitchMetadata = {
        stitchProjectId: projectId,
        stitchScreenId: screenId,
      }

      const updated = await updateArtifactContent(
        artifactId,
        userId,
        htmlContent,
        existing.version,
        { ...newMetadata }
      )

      return {
        artifactId,
        title: existing.title,
        type: "html" as const,
        version: updated?.version ?? existing.version + 1,
      }
    },
  })
}

export const registration: ToolRegistration = {
  name: "edit_design",
  label: "Design bearbeiten",
  icon: "PenTool",
  category: "media",
  customRenderer: true,
}
