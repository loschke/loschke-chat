import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { ID_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/session"

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes — kein Auth noetig
  if (
    pathname === "/" ||
    pathname === "/pending-approval" ||
    pathname === "/impressum" ||
    pathname === "/datenschutz" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/share/") ||
    pathname.startsWith("/api/share/")
  ) {
    return NextResponse.next()
  }

  // Dev-Bypass: Ohne OIDC-Credentials in Development alles durchlassen
  if (!process.env.OIDC_CLIENT_ID && process.env.NODE_ENV === "development") {
    return NextResponse.next()
  }

  // Production ohne OIDC_CLIENT_ID: harter Fehler statt stillem Bypass
  if (!process.env.OIDC_CLIENT_ID) {
    return new NextResponse("Auth not configured", { status: 503 })
  }

  // CSRF: Origin-Check fuer mutating requests
  const method = request.method
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    const origin = request.headers.get("origin")
    const baseUrl = process.env.APP_BASE_URL ?? request.nextUrl.origin

    if (!origin) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const allowed = new URL(baseUrl).origin
    if (origin !== allowed) {
      return new NextResponse("Forbidden", { status: 403 })
    }
  }

  // Protected routes: Session-Cookie pruefen (nur Existenz; Validierung + Refresh passieren in Route-Handlern via getCurrentClaims)
  // Refresh-Cookie zaehlt auch als Session: id_token laeuft nach 1h ab, refresh nach 7d. Solange einer von beiden da ist,
  // kann getCurrentClaims() die Session wiederherstellen.
  const hasSession =
    request.cookies.has(ID_TOKEN_COOKIE) || request.cookies.has(REFRESH_TOKEN_COOKIE)
  if (!hasSession) {
    return NextResponse.redirect(new URL("/api/auth/sign-in", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/|screenshots/|audio-recorder-worklet\\.js).*)"],
}
