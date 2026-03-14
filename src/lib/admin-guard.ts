/**
 * Admin guard — ENV-based email allowlist.
 * Each instance has its own ADMIN_EMAILS env var.
 */

import { getUserFull } from "@/lib/auth"

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

/** Check if an email is in the admin allowlist */
export function isAdminEmail(email?: string | null): boolean {
  if (!email || ADMIN_EMAILS.length === 0) return false
  return ADMIN_EMAILS.includes(email.toLowerCase())
}

/**
 * Require admin access. Returns userId + email on success, throws Response on failure.
 * Uses getUserFull() to get the email from Logto userInfo endpoint.
 */
export async function requireAdmin(): Promise<{ userId: string; email: string }> {
  const user = await getUserFull()

  if (!user) {
    throw Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!user.email || !isAdminEmail(user.email)) {
    throw Response.json({ error: "Forbidden" }, { status: 403 })
  }

  return { userId: user.id, email: user.email }
}
