import { tool } from "ai"
import { z } from "zod"

import { createArtifact } from "@/lib/db/queries/artifacts"
import { isAllowedUrl } from "@/lib/url-validation"
import { webBranding } from "@/lib/web"

/**
 * Factory: creates the extract_branding tool bound to chatId and userId.
 * Extracts branding profile (colors, typography, components, personality)
 * from a website via Firecrawl's branding endpoint and saves as JSON artifact.
 */
export function extractBrandingTool(chatId: string, userId: string) {
  return tool({
    description:
      "Extract the visual branding and design system from a website URL. " +
      "Returns a structured brand profile with colors, typography, spacing, " +
      "components, logos, and brand personality. Creates a JSON artifact with the results. " +
      "Use this for brand audits, competitor analysis, or design system extraction.",
    inputSchema: z.object({
      url: z.string().url().describe("The website URL to extract branding from"),
      title: z.string().max(200).optional().describe(
        "Title for the branding artifact. Defaults to 'Branding: {domain}'"
      ),
    }),
    execute: async ({ url, title }) => {
      if (!isAllowedUrl(url)) {
        return { error: "URL nicht erlaubt (interne oder ungueltige Adresse)." }
      }

      // Deduct credits before the expensive Firecrawl call
      const domain = new URL(url).hostname
      const { deductToolCredits, calculateBrandingCredits } = await import("@/lib/credits")
      const creditError = await deductToolCredits(userId, calculateBrandingCredits(), {
        chatId, description: `Branding-Extraktion (${domain})`, toolName: "extract_branding",
      })
      if (creditError) return { error: creditError }

      let result
      try {
        result = await webBranding({ url })
      } catch (err) {
        console.error("[extract_branding] Firecrawl error:", err instanceof Error ? err.message : err)
        return { error: "Branding-Extraktion fehlgeschlagen. Die Seite ist moeglicherweise nicht erreichbar." }
      }

      if (!result.branding) {
        console.warn("[extract_branding] No branding data returned for:", url, "Keys:", Object.keys(result))
        return { error: "Keine Branding-Daten gefunden. Die Seite ist moeglicherweise nicht erreichbar oder hat keine extrahierbaren Styles." }
      }

      const artifactTitle = title ?? `Branding: ${domain}`

      const artifact = await createArtifact({
        chatId,
        type: "code",
        title: artifactTitle,
        content: JSON.stringify(result.branding, null, 2),
        language: "json",
      })

      // Return summary metadata — full data is in the artifact JSON
      const b = result.branding
      return {
        artifactId: artifact.id,
        title: artifactTitle,
        type: "code" as const,
        version: artifact.version,
        domain,
        colorScheme: b.colorScheme ?? null,
        primaryColor: b.colors?.primary ?? null,
        accentColor: b.colors?.accent ?? null,
        primaryFont: b.typography?.fontFamilies?.primary ?? b.fonts?.[0]?.family ?? null,
        headingFont: b.typography?.fontFamilies?.heading ?? null,
        brandTone: b.personality?.tone ?? null,
        hasLogo: !!(b.images?.logo ?? b.logo),
        hasComponents: !!b.components,
      }
    },
  })
}
