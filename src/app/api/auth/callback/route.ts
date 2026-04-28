import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { exchangeCode, verifyIdToken, decodeIdTokenClaims } from "@/lib/auth/oidc"
import { checkOrgMembership } from "@/lib/auth/claims"
import {
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  OAUTH_RETURN_TO_COOKIE,
  ID_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  ID_TOKEN_MAX_AGE_SECONDS,
  REFRESH_TOKEN_MAX_AGE_SECONDS,
  sessionCookieOptions,
} from "@/lib/auth/session"
import { ensureUserExists } from "@/lib/db/queries/users"

function errorRedirect(baseUrl: URL, reason: string, detail?: string): NextResponse {
  const target = new URL("/api/auth/error", baseUrl)
  target.searchParams.set("reason", reason)
  if (detail) target.searchParams.set("detail", detail)
  return NextResponse.redirect(target)
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const error = url.searchParams.get("error")
  const errorDescription = url.searchParams.get("error_description")

  if (error) {
    console.error("[auth/callback] OAuth error", { error, errorDescription })
    return errorRedirect(url, error, errorDescription ?? undefined)
  }
  if (!code || !state) {
    return errorRedirect(url, "missing_code_or_state")
  }

  const cookieStore = await cookies()
  const storedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value
  const verifier = cookieStore.get(OAUTH_VERIFIER_COOKIE)?.value
  const returnTo = cookieStore.get(OAUTH_RETURN_TO_COOKIE)?.value

  if (!storedState || !verifier || storedState !== state) {
    return errorRedirect(url, "invalid_state")
  }

  let tokens
  try {
    tokens = await exchangeCode(code, verifier)
  } catch (err) {
    console.error("[auth/callback] Token exchange failed", err)
    return errorRedirect(url, "token_exchange_failed", err instanceof Error ? err.message : String(err))
  }

  const idToken = tokens.idToken()
  let claims
  try {
    claims = await verifyIdToken(idToken)
  } catch (err) {
    let unverified: unknown = null
    try { unverified = decodeIdTokenClaims(idToken) } catch { /* noop */ }
    console.error("[auth/callback] id_token verification failed", {
      error: err instanceof Error ? err.message : String(err),
      unverifiedClaims: unverified,
    })
    return errorRedirect(url, "invalid_id_token", err instanceof Error ? err.message : String(err))
  }

  const membership = checkOrgMembership(claims)
  if (membership.reason === "no_membership") {
    console.error("[auth/callback] no_membership", {
      sub: claims.sub,
      email: claims.email,
      required: membership.required,
      organizations: claims.organizations,
    })
    return errorRedirect(url, "no_membership", `required: ${membership.required}`)
  }

  if (!claims.email) {
    return errorRedirect(url, "missing_email_claim")
  }

  try {
    await ensureUserExists({
      logtoId: claims.sub,
      email: claims.email,
      name: claims.name ?? null,
    })
  } catch (err) {
    console.error("[auth/callback] ensureUserExists failed", err)
    return errorRedirect(url, "db_upsert_failed", err instanceof Error ? err.message : String(err))
  }

  const target = returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")
    ? new URL(returnTo, url)
    : new URL("/", url)
  const response = NextResponse.redirect(target)

  const opts = sessionCookieOptions()
  response.cookies.set(ID_TOKEN_COOKIE, idToken, { ...opts, maxAge: ID_TOKEN_MAX_AGE_SECONDS })
  if (tokens.hasRefreshToken()) {
    response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken(), {
      ...opts,
      maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
    })
  }
  response.cookies.set(OAUTH_STATE_COOKIE, "", { ...opts, maxAge: 0 })
  response.cookies.set(OAUTH_VERIFIER_COOKIE, "", { ...opts, maxAge: 0 })
  response.cookies.set(OAUTH_RETURN_TO_COOKIE, "", { ...opts, maxAge: 0 })

  return response
}
