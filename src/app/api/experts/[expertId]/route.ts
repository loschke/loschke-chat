import { requireAuth } from "@/lib/api-guards"
import { getExpertById, updateExpert, deleteExpert } from "@/lib/db/queries/experts"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { updateExpertSchema } from "@/lib/validations/expert"

const ID_PATTERN = /^[a-zA-Z0-9_-]{1,21}$/

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ expertId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const { expertId } = await params
  if (!ID_PATTERN.test(expertId)) {
    return Response.json({ error: "Invalid expert ID" }, { status: 400 })
  }

  const expert = await getExpertById(expertId)
  if (!expert) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  // Visibility check: global + public experts are visible to all, private user experts only to owner
  if (expert.userId !== null && expert.userId !== user.id && !expert.isPublic) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  // Only expose systemPrompt to owner or for global experts (admin-managed)
  const isOwner = expert.userId === null || expert.userId === user.id
  return Response.json({
    id: expert.id,
    name: expert.name,
    slug: expert.slug,
    description: expert.description,
    icon: expert.icon,
    ...(isOwner ? { systemPrompt: expert.systemPrompt } : {}),
    skillSlugs: expert.skillSlugs,
    modelPreference: expert.modelPreference,
    temperature: expert.temperature,
    allowedTools: expert.allowedTools,
    mcpServerIds: expert.mcpServerIds,
    isPublic: expert.isPublic,
    sortOrder: expert.sortOrder,
    isGlobal: expert.userId === null,
  })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ expertId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const { expertId } = await params
  if (!ID_PATTERN.test(expertId)) {
    return Response.json({ error: "Invalid expert ID" }, { status: 400 })
  }

  // Check if expert exists and is owned by user (not global)
  const existing = await getExpertById(expertId)
  if (!existing) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }
  if (existing.userId === null) {
    return Response.json({ error: "Globale Experts können nicht bearbeitet werden" }, { status: 403 })
  }
  if (existing.userId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = updateExpertSchema.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid request"
    return Response.json({ error: firstError }, { status: 400 })
  }

  try {
    // User-created experts are never public (only admins can publish)
    const { isPublic: _ignored, ...safeData } = parsed.data
    const updated = await updateExpert(expertId, user.id, safeData)
    if (!updated) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    return Response.json({
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      description: updated.description,
      icon: updated.icon,
      isGlobal: false,
    })
  } catch (err) {
    if (err instanceof Error && err.message.includes("unique")) {
      return Response.json({ error: "Slug bereits vergeben" }, { status: 409 })
    }
    throw err
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ expertId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const { expertId } = await params
  if (!ID_PATTERN.test(expertId)) {
    return Response.json({ error: "Invalid expert ID" }, { status: 400 })
  }

  // Check if expert exists and is owned by user
  const existing = await getExpertById(expertId)
  if (!existing) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }
  if (existing.userId === null) {
    return Response.json({ error: "Globale Experts können nicht gelöscht werden" }, { status: 403 })
  }
  if (existing.userId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  await deleteExpert(expertId, user.id)
  return new Response(null, { status: 204 })
}
