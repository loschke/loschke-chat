import { requireAuth } from "@/lib/api-guards"
import { getProjectById, updateProject, deleteProject } from "@/lib/db/queries/projects"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { updateProjectSchema } from "@/lib/validations/project"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const { projectId } = await params
  const project = await getProjectById(projectId)
  if (!project || project.userId !== user.id) {
    return Response.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  return Response.json(project)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const { projectId } = await params

  // Verify ownership
  const project = await getProjectById(projectId)
  if (!project || project.userId !== user.id) {
    return Response.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Ungültiges JSON" }, { status: 400 })
  }

  const parsed = updateProjectSchema.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Ungültige Anfrage"
    return Response.json({ error: firstError }, { status: 400 })
  }

  const updated = await updateProject(projectId, user.id, parsed.data)
  if (!updated) {
    return Response.json({ error: "Aktualisierung fehlgeschlagen" }, { status: 500 })
  }

  return Response.json(updated)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const { projectId } = await params
  const deleted = await deleteProject(projectId, user.id)
  if (!deleted) {
    return Response.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  return Response.json({ success: true })
}
