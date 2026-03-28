/**
 * POST /api/deep-research/[interactionId]/complete
 * Called by the client when research is complete. Creates a markdown artifact.
 */

import { requireAuth } from "@/lib/api-guards"
import { features } from "@/config/features"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { getResearchStatus, INTERACTION_ID_REGEX, DEEP_RESEARCH_TAG, verifyInteractionOwner } from "@/lib/ai/deep-research"
import { createArtifact } from "@/lib/db/queries/artifacts"
import { getErrorMessage } from "@/lib/errors"
import { getChatById } from "@/lib/db/queries/chats"
import { z } from "zod"

export const runtime = "nodejs"
export const maxDuration = 30

const bodySchema = z.object({
  chatId: z.string().min(1).max(20).regex(/^[a-zA-Z0-9_-]+$/),
  title: z.string().max(200).optional(),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ interactionId: string }> }
) {
  if (!features.deepResearch.enabled) {
    return new Response("Deep Research is disabled", { status: 404 })
  }

  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const { interactionId } = await params

  if (!INTERACTION_ID_REGEX.test(interactionId)) {
    return Response.json({ error: "Ungueltige Interaction-ID" }, { status: 400 })
  }

  if (!verifyInteractionOwner(interactionId, user.id)) {
    return Response.json({ error: "Zugriff verweigert" }, { status: 403 })
  }

  // Parse body
  let body: z.infer<typeof bodySchema>
  try {
    const raw = await req.json()
    body = bodySchema.parse(raw)
  } catch {
    return Response.json({ error: "Ungueltige Anfrage" }, { status: 400 })
  }

  // Verify chat ownership
  const chat = await getChatById(body.chatId, user.id)
  if (!chat) {
    return Response.json({ error: "Chat nicht gefunden" }, { status: 404 })
  }

  try {
    const status = await getResearchStatus(interactionId)

    if (status.status !== "completed" || !status.outputText) {
      return Response.json(
        { error: "Recherche ist noch nicht abgeschlossen" },
        { status: 409 }
      )
    }

    // Extract citation URLs from markdown links in the output
    const citations = extractCitations(status.outputText)

    // Create markdown artifact with the research report
    const artifact = await createArtifact({
      chatId: body.chatId,
      type: "markdown",
      title: body.title ?? "Deep Research Report",
      content: status.outputText,
      metadata: {
        [DEEP_RESEARCH_TAG]: true,
        interactionId,
        citations,
      },
    })

    return Response.json({
      artifactId: artifact.id,
      title: artifact.title,
      citationCount: citations.length,
    })
  } catch (err) {
    console.error("[deep-research/complete] Failed:", getErrorMessage(err))
    return Response.json(
      { error: "Artifact konnte nicht erstellt werden" },
      { status: 500 }
    )
  }
}

/**
 * Extract citation URLs from markdown content.
 * Finds [text](url) patterns and returns unique URLs.
 */
function extractCitations(markdown: string): Array<{ url: string; title: string }> {
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g
  const seen = new Set<string>()
  const citations: Array<{ url: string; title: string }> = []

  let match
  while ((match = linkRegex.exec(markdown)) !== null) {
    const title = match[1]
    const url = match[2]
    if (!seen.has(url)) {
      seen.add(url)
      citations.push({ url, title })
    }
  }

  return citations
}
