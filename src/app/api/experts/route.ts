import { requireAuth } from "@/lib/api-guards"
import { getExperts, createExpert } from "@/lib/db/queries/experts"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { createExpertSchema } from "@/lib/validations/expert"

export async function GET() {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const experts = await getExperts(user.id)

  const data = experts.map((e) => ({
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

  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
    },
  })
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
