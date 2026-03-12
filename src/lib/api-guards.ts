/**
 * Shared API route guards.
 */

import { getUser, type AppUser } from "@/lib/auth"

const DEFAULT_MAX_BODY = 1024 * 1024 // 1MB

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
