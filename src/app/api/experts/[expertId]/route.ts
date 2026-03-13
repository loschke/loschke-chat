import { z } from "zod"

import { requireAuth } from "@/lib/api-guards"
import { getExpertById, updateExpert, deleteExpert } from "@/lib/db/queries/experts"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"

const ID_PATTERN = /^[a-zA-Z0-9_-]{1,21}$/

const updateExpertSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().min(2).max(500).optional(),
  icon: z.string().max(50).nullable().optional(),
  systemPrompt: z.string().min(10).max(50000).optional(),
  skillSlugs: z.array(z.string()).max(20).optional(),
  modelPreference: z.string().max(100).nullable().optional(),
  temperature: z.number().min(0).max(2).nullable().optional(),
  allowedTools: z.array(z.string()).max(50).optional(),
  mcpServerIds: z.array(z.string()).max(20).optional(),
  isPublic: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
})

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

  // Visibility check: global experts are visible to all, user experts only to owner
  if (expert.userId !== null && expert.userId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  return Response.json({
    id: expert.id,
    name: expert.name,
    slug: expert.slug,
    description: expert.description,
    icon: expert.icon,
    systemPrompt: expert.systemPrompt,
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
    const updated = await updateExpert(expertId, user.id, parsed.data)
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
