import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes — kein Auth nötig
  if (pathname === "/" || pathname.startsWith("/api/auth") || pathname.startsWith("/share/") || pathname.startsWith("/api/share/")) {
    return NextResponse.next()
  }

  // Dev-Bypass: Ohne Logto-Credentials alles durchlassen — NUR in Development
  if (!process.env.LOGTO_APP_ID && process.env.NODE_ENV === "development") {
    return NextResponse.next()
  }

  // In Production ohne LOGTO_APP_ID: Fehler statt stillem Bypass
  if (!process.env.LOGTO_APP_ID) {
    return new NextResponse("Auth not configured", { status: 503 })
  }

  // CSRF: Origin-Check fuer mutating requests
  const method = request.method
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    const origin = request.headers.get("origin")
    const baseUrl = process.env.LOGTO_BASE_URL

    if (!origin || !baseUrl) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const allowed = new URL(baseUrl).origin
    if (origin !== allowed) {
      return new NextResponse("Forbidden", { status: 403 })
    }
  }

  // Protected routes: Session-Cookie prüfen
  // Cookie-Name ist `logto_${appId}` bei @logto/next
  const cookieName = `logto_${process.env.LOGTO_APP_ID}`
  const hasSession = request.cookies.has(cookieName)

  if (!hasSession) {
    return NextResponse.redirect(new URL("/api/auth/sign-in", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/).*)"],
}
