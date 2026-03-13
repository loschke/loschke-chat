import { z } from "zod"

import { requireAuth } from "@/lib/api-guards"
import { getExperts, createExpert } from "@/lib/db/queries/experts"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"

const createExpertSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Nur Kleinbuchstaben, Zahlen und Bindestriche"),
  description: z.string().min(2).max(500),
  icon: z.string().max(50).nullable().optional(),
  systemPrompt: z.string().min(10).max(50000),
  skillSlugs: z.array(z.string()).max(20).default([]),
  modelPreference: z.string().max(100).nullable().optional(),
  temperature: z.number().min(0).max(2).nullable().optional(),
  allowedTools: z.array(z.string()).max(50).default([]),
  mcpServerIds: z.array(z.string()).max(20).default([]),
  isPublic: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(1000).default(0),
})

export async function GET() {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const experts = await getExperts(user.id)

  return Response.json(
    experts.map((e) => ({
      id: e.id,
      name: e.name,
      slug: e.slug,
      description: e.description,
      icon: e.icon,
      skillSlugs: e.skillSlugs,
      modelPreference: e.modelPreference,
      temperature: e.temperature,
      isPublic: e.isPublic,
      sortOrder: e.sortOrder,
      isGlobal: e.userId === null,
    }))
  )
}

export async function POST(req: Request) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = createExpertSchema.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid request"
    return Response.json({ error: firstError }, { status: 400 })
  }

  try {
    const expert = await createExpert(user.id, parsed.data)
    return Response.json({
      id: expert.id,
      name: expert.name,
      slug: expert.slug,
      description: expert.description,
      icon: expert.icon,
      isGlobal: false,
    }, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message.includes("unique")) {
      return Response.json({ error: "Slug bereits vergeben" }, { status: 409 })
    }
    throw err
  }
}
