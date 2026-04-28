import { requireAuth } from "@/lib/api-guards"
import { canAccessProject } from "@/lib/db/queries/access"
import { addProjectMember, getProjectMembers } from "@/lib/db/queries/project-members"
import { getUserByEmail } from "@/lib/db/queries/users"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { addMemberSchema } from "@/lib/validations/sharing"

/** GET: List all members of a project. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

  const { projectId } = await params
  const access = await canAccessProject(projectId, user.id)
  if (!access.hasAccess) {
    return Response.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  const members = await getProjectMembers(projectId)
  return Response.json(members)
}

/** POST: Add a member to a project by email lookup. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

  const { projectId } = await params
  const access = await canAccessProject(projectId, user.id)
  if (!access.hasAccess) {
    return Response.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Ungültiges JSON" }, { status: 400 })
  }

  const parsed = addMemberSchema.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Ungültige Anfrage"
    return Response.json({ error: firstError }, { status: 400 })
  }

  const targetUser = await getUserByEmail(parsed.data.email)
  if (!targetUser) {
    return Response.json({ error: "Nutzer nicht gefunden" }, { status: 404 })
  }

  // Can't add yourself
  if (targetUser.authSub === user.id) {
    return Response.json({ error: "Du bist bereits Mitglied" }, { status: 409 })
  }

  const member = await addProjectMember(
    projectId,
    targetUser.authSub,
    parsed.data.role ?? "editor",
    user.id
  )

  return Response.json({
    id: member.id,
    userId: member.userId,
    role: member.role,
    name: targetUser.name,
    email: targetUser.email,
    createdAt: member.createdAt,
  }, { status: 201 })
}
