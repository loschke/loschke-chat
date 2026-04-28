/**
 * Shared API route guards.
 */

import { getUser, type AppUser } from "@/lib/auth"
import { ensureUserExists, getUserStatus, getUserRole } from "@/lib/db/queries/users"
import { isAdminRole } from "@/lib/admin-guard"

const DEFAULT_MAX_BODY = 1024 * 1024 // 1MB

/** Cache of user IDs already upserted in this process lifetime */
const knownUserIds = new Set<string>()

type AuthSuccess = { user: AppUser; error?: never }
type AuthFailure = { user?: never; error: Response }

/**
 * Auth guard for API routes. Returns the authenticated user or a 401 JSON response.
 *
 * Usage:
 * ```ts
 * const auth = await requireAuth()
 * if (auth.error) return auth.error
 * const { user } = auth
 * ```
 */
export async function requireAuth(): Promise<AuthSuccess | AuthFailure> {
  const user = await getUser()
  if (!user) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  // Upsert user record so DB queries (custom instructions etc.) work
  if (!knownUserIds.has(user.id)) {
    await ensureUserExists({ authSub: user.id, email: user.email, name: user.name })
    knownUserIds.add(user.id)
  }

  // Check user approval status — admins/superadmins bypass
  const [status, role] = await Promise.all([
    getUserStatus(user.id),
    getUserRole(user.id),
  ])
  if (status !== "approved" && !isAdminRole(role)) {
    const message = status === "rejected"
      ? "Dein Account wurde abgelehnt. Bitte kontaktiere den Administrator."
      : "Dein Account wartet auf Freischaltung durch einen Administrator."
    return { error: Response.json({ error: message, code: "USER_NOT_APPROVED", status }, { status: 403 }) }
  }

  return { user }
}

export function checkBodySize(
  req: Request,
  maxBytes = DEFAULT_MAX_BODY
): Response | null {
  const contentLength = req.headers.get("content-length")
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    return new Response("Request too large", { status: 413 })
  }
  return null
}
