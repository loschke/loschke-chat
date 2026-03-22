import { requireSuperAdmin } from "@/lib/admin-guard"
import { listUsersWithRoles } from "@/lib/db/queries/users"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"

export async function GET() {
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

  const users = await listUsersWithRoles()
  return Response.json({ users })
}
