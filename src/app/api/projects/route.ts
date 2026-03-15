import { requireAuth } from "@/lib/api-guards"
import { getUserProjects, createProject } from "@/lib/db/queries/projects"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { createProjectSchema } from "@/lib/validations/project"

export async function GET() {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const projects = await getUserProjects(user.id)

  return Response.json(projects)
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
    return Response.json({ error: "Ungültiges JSON" }, { status: 400 })
  }

  const parsed = createProjectSchema.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Ungültige Anfrage"
    return Response.json({ error: firstError }, { status: 400 })
  }

  const project = await createProject(user.id, parsed.data)
  return Response.json({
    id: project.id,
    name: project.name,
    description: project.description,
    defaultExpertId: project.defaultExpertId,
    isArchived: project.isArchived,
    chatCount: 0,
    updatedAt: project.updatedAt.toISOString(),
  }, { status: 201 })
}
