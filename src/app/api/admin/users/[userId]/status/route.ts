import { z } from "zod"
import { requireAdmin } from "@/lib/admin-guard"
import { updateUserStatus, getUserRole } from "@/lib/db/queries/users"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"

const updateStatusSchema = z.object({
  status: z.enum(["approved", "rejected"]),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  let admin: { userId: string }
  try {
    admin = await requireAdmin()
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }

  const rateCheck = checkRateLimit(admin.userId, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const { userId } = await params

  // Self-action protection
  if (userId === admin.userId) {
    return Response.json({ error: "Eigener Status kann nicht geaendert werden" }, { status: 400 })
  }

  // Superadmin protection
  const targetRole = await getUserRole(userId)
  if (targetRole === "superadmin") {
    return Response.json({ error: "Superadmin-Status kann nicht geaendert werden" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Ungueltiges JSON" }, { status: 400 })
  }

  const parsed = updateStatusSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "Ungueltiger Status. Erlaubt: approved, rejected", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const newStatus = await updateUserStatus(userId, parsed.data.status, admin.userId)
  return Response.json({ success: true, status: newStatus })
}
