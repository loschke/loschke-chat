import { requireAuth } from "@/lib/api-guards"
import { features } from "@/config/features"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { ANTHROPIC_FILES_API_BASE, ANTHROPIC_FILES_API_BETA } from "@/lib/ai/anthropic-skills"
import { getErrorMessage } from "@/lib/errors"

/** Validate fileId format to prevent path traversal / injection */
const FILE_ID_PATTERN = /^file_[a-zA-Z0-9]{20,60}$/

export async function GET(
  req: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  if (!features.anthropicSkills.enabled) {
    return Response.json({ error: "Agent Skills sind deaktiviert" }, { status: 404 })
  }

  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const { fileId } = await params

  if (!FILE_ID_PATTERN.test(fileId)) {
    return Response.json({ error: "Ungültige Datei-ID" }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return Response.json({ error: "Anthropic API nicht konfiguriert" }, { status: 500 })
  }

  try {
    // Fetch file content from Anthropic Files API
    const response = await fetch(`${ANTHROPIC_FILES_API_BASE}/${fileId}/content`, {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": ANTHROPIC_FILES_API_BETA,
      },
    })

    if (!response.ok) {
      const status = response.status === 404 ? 404 : 502
      return Response.json(
        { error: status === 404 ? "Datei nicht gefunden oder abgelaufen" : "Fehler beim Abrufen der Datei" },
        { status }
      )
    }

    // Stream file content through to client
    const contentType = response.headers.get("content-type") ?? "application/octet-stream"
    const contentLength = response.headers.get("content-length")

    // Always force attachment to prevent XSS via Content-Type spoofing
    const ext = contentType.includes("pdf") ? ".pdf"
      : contentType.includes("spreadsheet") || contentType.includes("xlsx") ? ".xlsx"
      : contentType.includes("presentation") || contentType.includes("pptx") ? ".pptx"
      : contentType.includes("wordprocessing") || contentType.includes("docx") ? ".docx"
      : ""

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${fileId}${ext}"`,
    }
    if (contentLength) {
      headers["Content-Length"] = contentLength
    }

    return new Response(response.body, { status: 200, headers })
  } catch (error) {
    console.error("[files] Proxy error:", getErrorMessage(error))
    return Response.json({ error: "Fehler beim Abrufen der Datei" }, { status: 502 })
  }
}
