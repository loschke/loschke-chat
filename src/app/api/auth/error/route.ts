/**
 * Generischer Fehler-Endpoint fuer den Auth-Flow.
 * Liefert eine schlanke HTML-Page mit Hinweis und Retry-Link.
 */

const REASON_MESSAGES: Record<string, string> = {
  invalid_state: "Die Anmeldung ist abgelaufen oder wurde manipuliert. Bitte erneut versuchen.",
  missing_code_or_state: "Ungueltige Antwort vom Auth-Server. Bitte erneut anmelden.",
  token_exchange_failed: "Die Anmeldung konnte nicht abgeschlossen werden.",
  invalid_id_token: "Das Sicherheits-Token konnte nicht verifiziert werden.",
  no_membership: "Du bist fuer diesen Bereich noch nicht freigeschaltet. Bitte wende dich an deinen Administrator.",
  missing_email_claim: "Im Profil fehlt eine E-Mail-Adresse. Bitte ergaenze dein Profil im zentralen Auth-Konto.",
  db_upsert_failed: "Das Konto konnte nicht angelegt werden. Bitte versuche es spaeter erneut.",
}

const PAGE_TEMPLATE = (reason: string, message: string, detail?: string) => `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <title>Anmeldung fehlgeschlagen</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <style>
      body { background: #151416; color: #f5f3ee; font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
      main { max-width: 32rem; padding: 2rem; }
      h1 { font-size: 1.5rem; margin-bottom: 1rem; font-weight: 800; }
      p { line-height: 1.6; color: #cfcab4; }
      code { background: #1e1e20; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.875rem; }
      a { color: #fc2d01; text-decoration: none; font-weight: 600; }
      a:hover { text-decoration: underline; }
      .actions { margin-top: 2rem; display: flex; gap: 1rem; }
    </style>
  </head>
  <body>
    <main>
      <h1>Anmeldung fehlgeschlagen</h1>
      <p>${message}</p>
      <p style="margin-top: 1rem; font-size: 0.875rem; color: #888;">
        Grund: <code>${reason}</code>${detail ? `<br />Detail: <code>${detail}</code>` : ""}
      </p>
      <div class="actions">
        <a href="/api/auth/sign-in">Erneut anmelden</a>
        <a href="/" style="color: #888;">Zur Startseite</a>
      </div>
    </main>
  </body>
</html>`

export async function GET(request: Request) {
  const url = new URL(request.url)
  const reason = url.searchParams.get("reason") ?? "unknown"
  const detail = url.searchParams.get("detail") ?? undefined
  const message = REASON_MESSAGES[reason] ?? "Bei der Anmeldung ist ein Fehler aufgetreten."

  // Sanitize detail (only display short alphanumeric+space hints)
  const safeDetail = detail && /^[\w\s.:/_,|-]{1,200}$/.test(detail) ? detail : undefined

  return new Response(PAGE_TEMPLATE(reason, message, safeDetail), {
    status: 400,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  })
}
