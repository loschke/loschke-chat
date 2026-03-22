/**
 * Admin guard — DB-based role system with ENV fallback.
 *
 * Primary: getUserRole() from DB (user/admin/superadmin).
 * Fallback: ADMIN_EMAILS env var (deprecated, logs warning).
 */

import { getUser } from "@/lib/auth"
import { getUserRole } from "@/lib/db/queries/users"
import type { UserRole } from "@/lib/db/schema/users"

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

/** Check if a role has admin access (admin or superadmin). */
export function isAdminRole(role: UserRole): boolean {
  return role === "admin" || role === "superadmin"
}

/**
 * @deprecated Use isAdminRole() with getUserRole() instead.
 * Kept for backwards compatibility during migration.
 */
export function isAdminEmail(email?: string | null): boolean {
  if (!email || ADMIN_EMAILS.length === 0) return false
  return ADMIN_EMAILS.includes(email.toLowerCase())
}

/**
 * Require admin access. Returns userId, email and role on success, throws Response on failure.
 * Uses DB role with ADMIN_EMAILS as fallback.
 */
export async function requireAdmin(): Promise<{ userId: string; email: string; role: UserRole }> {
  const user = await getUser()

  if (!user) {
    throw Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = await getUserRole(user.id)

  // Primary: DB role check
  if (isAdminRole(role)) {
    return { userId: user.id, email: user.email ?? "", role }
  }

  // Fallback: ADMIN_EMAILS env (deprecated)
  if (user.email && isAdminEmail(user.email)) {
    console.warn(
      `[admin-guard] User ${user.email} matched ADMIN_EMAILS fallback. ` +
      `Migrate to DB roles via /admin/users or SUPERADMIN_EMAIL.`
    )
    return { userId: user.id, email: user.email, role: "admin" }
  }

  throw Response.json({ error: "Forbidden" }, { status: 403 })
}

/**
 * Require superadmin access. Only superadmin role passes.
 * No ADMIN_EMAILS fallback for superadmin.
 */
export async function requireSuperAdmin(): Promise<{ userId: string; email: string }> {
  const user = await getUser()

  if (!user) {
    throw Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = await getUserRole(user.id)

  if (role !== "superadmin") {
    throw Response.json({ error: "Forbidden" }, { status: 403 })
  }

  return { userId: user.id, email: user.email ?? "" }
}
