import { z } from "zod"

import { requireAuth } from "@/lib/api-guards"
import { features } from "@/config/features"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { getSignedUploadUrl } from "@/lib/storage"
import { ALLOWED_MIME_TYPES, BLOCKED_EXTENSIONS, DEFAULT_MAX_SIZE } from "@/lib/storage/types"
import { sanitizeFilename } from "@/lib/storage/validation"
import { nanoid } from "nanoid"

const presignSchema = z.object({
  filename: z.string().min(1).max(255),
  size: z.number().int().positive().max(DEFAULT_MAX_SIZE),
  contentType: z.string().min(1).max(200),
})

export async function POST(req: Request) {
  if (!features.storage.enabled) {
    return new Response("Storage is disabled", { status: 404 })
  }

  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.upload)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Ungültiges JSON" }, { status: 400 })
  }

  const parsed = presignSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Ungültige Anfrage", details: parsed.error.flatten() }, { status: 400 })
  }

  const { filename, size, contentType } = parsed.data

  if (!ALLOWED_MIME_TYPES.includes(contentType as typeof ALLOWED_MIME_TYPES[number])) {
    return Response.json({ error: "Dateityp nicht erlaubt" }, { status: 400 })
  }

  const ext = filename.split(".").pop()?.toLowerCase() ?? ""
  if (BLOCKED_EXTENSIONS.includes(ext as typeof BLOCKED_EXTENSIONS[number])) {
    return Response.json({ error: "Dateiendung nicht erlaubt" }, { status: 400 })
  }

  const safeName = sanitizeFilename(filename) || `upload-${nanoid(6)}`
  const storageKey = `uploads/${user.id}/${nanoid()}-${safeName}`

  try {
    const { uploadUrl, publicUrl } = await getSignedUploadUrl(storageKey, contentType, size)

    return Response.json({
      uploadUrl,
      storageKey,
      publicUrl,
      contentType,
      filename: safeName,
    })
  } catch (error) {
    console.error("[Presign error]", { error, userId: user.id })
    return Response.json({ error: "Presign fehlgeschlagen" }, { status: 500 })
  }
}
