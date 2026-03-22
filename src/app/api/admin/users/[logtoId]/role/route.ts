import { z } from "zod"
import { requireSuperAdmin } from "@/lib/admin-guard"
import { updateUserRole } from "@/lib/db/queries/users"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"

const updateRoleSchema = z.object({
  role: z.enum(["user", "admin"]),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ logtoId: string }> }
) {
  let admin: { userId: string }
  try {
    admin = await requireSuperAdmin()
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }

  const rateCheck = checkRateLimit(admin.userId, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const { logtoId } = await params

  // Self-demotion protection
  if (logtoId === admin.userId) {
    return Response.json({ error: "Eigene Rolle kann nicht geaendert werden" }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Ungueltiges JSON" }, { status: 400 })
  }

  const parsed = updateRoleSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "Ungueltige Rolle. Erlaubt: user, admin", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const newRole = await updateUserRole(logtoId, parsed.data.role)
  return Response.json({ success: true, role: newRole })
}
