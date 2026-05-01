# Neue Instanz aufsetzen — Leitfaden

> Schritt-für-Schritt-Playbook für eine neue Kunden-Instanz von build-jetzt.
> Geschrieben aus der Operator-Perspektive: was tue ich in welcher Reihenfolge,
> in welchem System, wie verifiziere ich es?
> 
> **Referenz** (technisch tiefer): [`deployment-guide.md`](deployment-guide.md)
> **ENV-Übersicht**: [`feature-flags-konfiguration.md`](feature-flags-konfiguration.md)

---

## Konzept: Was ist eine "Instanz"?

Eine Instanz ist **ein eigenständig deploybarer Stack** aus:

- 1× **Vercel-Projekt** (eigene Domain/Subdomain)
- 1× **Neon-Postgres-DB** (kein Daten-Sharing zwischen Instanzen)
- 1× **OAuth-Client** in `loschke-auth` (eigene `OIDC_CLIENT_ID`)
- 1× **Organization** in `loschke-auth` (User müssen approved Member sein)
- 1× ENV-Set (Pflicht-Vars + Feature-Keys nach Bedarf)

**Goldene Konvention:**

```
Instance-Slug == OIDC_CLIENT_ID == loschke-auth Org-Slug == SEED_INSTANCE
```

Diese Identität verbindet Auth-Gating, Seeding und Vercel-Projekt. Halte sie
konsistent, dann sind alle anderen Entscheidungen abgeleitet.

---

## Vor dem Anfangen — Klärung mit dem Kunden

Bevor du irgendwo etwas anlegst, kläre:

| Frage                    | Beispiel                                       | Wo wird das gebraucht?                     |
| ------------------------ | ---------------------------------------------- | ------------------------------------------ |
| **Slug der Instanz?**    | `sava-aok`                                     | überall (Auth, Seeds, Vercel-Projekt-Name) |
| **Domain?**              | `chat.aok-sa.de` oder `aok.build-jetzt.app`    | Vercel + DNS + ENV                         |
| **Brand-Look?**          | `lernen` / `unlearn` / `loschke` / `prototype` | `NEXT_PUBLIC_BRAND`                        |
| **Wer wird Superadmin?** | `it@kunde.de`                                  | `SUPERADMIN_EMAIL`, erste Admin-Bootstrap  |
| **Welche Features?**     | Web, Bildgen, Memory, MCP, Business Mode …     | Feature-Keys in ENV                        |
| **LLM-Profil?**          | SaaS (Gateway) / EU (Direct) / Lokal (Ollama)  | `LLM_ROUTING`                              |
| **Eigene Seeds?**        | Z.B. SAVA-Experten, kunden-spezifische Skills  | Frontmatter-Tags                           |
| **DSGVO-Sensitivität?**  | Standard / EU-only / On-Prem                   | beeinflusst LLM-Profil + Privacy-Routing   |

Empfehlung: ein einseitiges Setup-Memo pro Kunde mit diesen Antworten.
Macht den Rest der Schritte mechanisch.

---

## Der Ablauf in 9 Phasen

```
1. Slug & Domain festlegen
2. loschke-auth: Org + OAuth-Client anlegen
3. Neon: DB anlegen
4. Optional: R2-Bucket anlegen
5. Seeds: instanz-spezifische taggen
6. Vercel-Projekt anlegen + ENV setzen
7. Erstes Deploy + Migration + Seed
8. Bootstrap: Login + Admin-User
9. Smoke-Test + Übergabe
```

Jede Phase hat einen klaren End-Zustand. Wenn der nicht erreicht ist,
nicht zur nächsten Phase weitergehen.

---

## Phase 1 — Slug und Domain festlegen

**Ziel:** Ein verbindlicher Slug existiert. Domain ist registriert / verfügbar.

### Slug-Regeln

- Kebab-Case, lowercase, nur `a-z0-9-`
- Eindeutig im gesamten loschke-auth (kein anderer Client darf den Slug haben)
- Kurz, sprechend (`sava-aok`, `kunde-pflege-x`, nicht `aok-sachsen-anhalt-pilotprojekt-2026`)

### Domain

- Eigene Domain: DNS-Zugriff klären (CNAME auf Vercel später)
- Subdomain unter eigenem Dach: z.B. `<slug>.build-jetzt.app`

**End-Zustand:** Slug schriftlich festgelegt, Domain bekannt.

---

## Phase 2 — loschke-auth: Organization und OAuth-Client

**Ziel:** Login funktioniert technisch (auch wenn die App noch nicht steht).

In der Admin-UI von `auth.loschke.ai`:

### 2.1 Organization anlegen

- Name: Lesbar (z.B. "AOK Sachsen-Anhalt")
- **Slug: identisch zum Instance-Slug** (z.B. `sava-aok`)
- `signup_mode`:
  - `public` → jeder mit dem Login-Link kommt rein (Demos, eigene Brands)
  - `approval_required` → User können sich registrieren, müssen freigegeben werden (Beta)
  - `invite_only` → nur per Einladung, default für Kunden-Instanzen

### 2.2 OAuth-Client anlegen

- `client_id` = Slug
- `owner_organization_id` = die gerade angelegte Org
- `redirect_uris`:
  - Prod: `https://<domain>/api/auth/callback`
  - Lokal: `http://localhost:3000/api/auth/callback`
- `post_logout_redirect_uris`:
  - `https://<domain>/`
  - `http://localhost:3000/`
- `scopes` = `openid profile email organization`
- **Client-Secret notieren** — wird in Phase 6 als ENV gesetzt

### 2.3 Eigenes Membership freischalten

- Du selbst (= dein loschke-auth User) musst in dieser Org als Member angelegt sein
- `role` = `owner`, `status` = `approved`
- Sonst kommst du beim ersten Login nicht durch das Multi-Instanz-Gate

**End-Zustand:** Org existiert, OAuth-Client existiert, Client-Secret im
1Password / Bitwarden gespeichert, eigenes Membership approved.

---

## Phase 3 — Neon-Datenbank anlegen

**Ziel:** Connection-String liegt vor.

1. Im Neon-Dashboard ein **neues Projekt** erstellen (nicht eine zusätzliche
   Branch in einem bestehenden — Instanzen sind getrennt)
2. Projektname = Slug, Region passend zur Zielgruppe (Frankfurt für DE-Kunden)
3. Connection-String kopieren (Format: `postgresql://user:pass@host/db?sslmode=require`)

**End-Zustand:** `DATABASE_URL` notiert, gleich für ENV.

---

## Phase 4 — Cloudflare R2 (optional, aber meist sinnvoll)

Brauchst du, wenn der Kunde:

- Bilder generiert (Bildgen-Outputs werden persistiert)
- Datei-Uploads zu Chats macht
- Audio-Outputs (TTS) speichern soll

Wenn nicht: skippen, Plattform funktioniert ohne (Fallback ist data-URL).

**Schritte:**

1. Cloudflare-Dashboard → R2 → Bucket anlegen, Name `<slug>-assets`
2. Public-Access **deaktiviert** lassen (signed URLs reichen)
3. API-Token mit Schreibrechten auf den Bucket erstellen
4. Notieren: `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` (custom domain auf den Bucket)

**End-Zustand:** Bucket steht, Credentials notiert.

---

## Phase 5 — Seeds: instanz-spezifisch taggen

**Ziel:** Klar, welche Seeds in dieser Instanz landen sollen.

Default: alle ungetaggten Seeds laufen überall. Du musst nur eingreifen, wenn:

### A) Kunde bekommt **eigene** Seeds (Experten/Skills/MCP-Server)

Lege die Files in `seeds/` ab und tagge sie:

```yaml
---
name: ...
slug: ...
instances:
  - <slug>            # nur diese Instanz
---
```

Beispiel: SAVA-Experten haben `instances: ["sava-aok"]`.

### B) Bestehende Globals **nicht** in diese Instanz seeden

```yaml
---
name: ...
slug: ...
excludeInstances:
  - <slug>
---
```

### C) Standard-Variante mit Kunden-Override

Konvention: zwei Files, gleicher `slug` in der DB, aber je einer pro Instanz:

```
seeds/experts/general.md           → excludeInstances: ["<slug>"]
seeds/experts/general-<slug>.md    → instances: ["<slug>"], slug: general
```

**Verifikation vor Phase 7:**

```bash
SEED_INSTANCE=<slug> pnpm db:seed --dry-run
```

Liest **nichts** in die DB, listet nur was geseedet würde + zeigt Skips mit
Begründung. Bei Tippfehler im Slug erscheint eine Warnung mit den bekannten
Slugs als Vorschlag.

**End-Zustand:** Dry-Run gibt das gewünschte Bild aus, alle SAVA-/kunden-spezifischen
Files werden korrekt gefiltert.

Details: [`../../seeds/README.md`](../../seeds/README.md) Sektion „Instanz-Filter".

---

## Phase 6 — Vercel-Projekt anlegen und ENV setzen

**Ziel:** Vercel-Projekt steht, ENV ist vollständig.

### 6.1 Projekt

1. Vercel-Dashboard → New Project → Repo auswählen → Build-Settings akzeptieren
2. Projekt-Name = Slug (auch wenn die Domain anders heißt)
3. Initial **deploy abbrechen** — wir setzen erst ENV, dann redeployen

### 6.2 Custom Domain

- Settings → Domains → Domain hinzufügen
- DNS beim Kunden / Registrar setzen (CNAME auf `cname.vercel-dns.com`)

### 6.3 Environment Variables

In Vercel → Settings → Environment Variables. Drei Tiers nach Bedarf:

#### Pflicht (ohne diese startet die Instanz nicht)

```bash
# Auth
OIDC_CLIENT_ID=<slug>
OIDC_CLIENT_SECRET=<aus Phase 2>
OIDC_ISSUER=https://auth.loschke.ai
OIDC_AUTHORIZE_URL=https://auth.loschke.ai/oauth/authorize
OIDC_TOKEN_URL=https://auth.loschke.ai/oauth/token
OIDC_JWKS_URL=https://auth.loschke.ai/.well-known/jwks.json
OIDC_END_SESSION_URL=https://auth.loschke.ai/oauth/end-session
OIDC_REDIRECT_URI=https://<domain>/api/auth/callback

APP_BASE_URL=https://<domain>

# DB
DATABASE_URL=<aus Phase 3>

# LLM (SaaS-Profil)
AI_GATEWAY_API_KEY=<Vercel AI Gateway Key>
```

#### Identität & Admin

```bash
NEXT_PUBLIC_BRAND=lernen          # oder unlearn / loschke / prototype
SUPERADMIN_EMAIL=<email des Bootstrap-Admins>
LANDING_CONFIG=                   # optional: Slug einer JSON in src/config/landings/
```

**Custom Landing für Kunden-Instanzen:**

Standardmäßig zeigt `/` für nicht-eingeloggte Besucher die build.jetzt-Marketing-Seite (in der Brandfarbe). Für Kunden-Instanzen will man stattdessen eine schlanke Onboarding-Landing zeigen, damit Mitarbeitende nicht verwirrt sind.

1. JSON unter `src/config/landings/<slug>.json` anlegen — Vorlage: `src/config/landings/example.json` kopieren und Inhalte anpassen.
2. ENV setzen: `LANDING_CONFIG=<slug>` (Slug muss `[a-z0-9-]+` matchen).
3. Brand-Farbe und Logo kommen weiterhin aus `NEXT_PUBLIC_BRAND` — die Landing-Config steuert nur Inhalt.
4. Validation per Zod beim Boot: fehlende Datei oder Schema-Verstoß bricht den Start.

Bausteine im JSON: `companyName`, `hero` (title + subline), optional `intro`, `features[]` (Icon-Whitelist + title + text), `cta.loginLabel`, optional `footerNote`. Erlaubte Icons: siehe `LANDING_ICON_NAMES` in `src/config/landing.ts`.

#### Seed-Filter (für nächste Phase)

```bash
SEED_INSTANCE=<slug>
```

#### Optional — Features (nur was der Kunde braucht)

| Feature                            | ENV(s)                                                        | Hinweis                                          |
| ---------------------------------- | ------------------------------------------------------------- | ------------------------------------------------ |
| Web-Search/Scrape                  | `FIRECRAWL_API_KEY`                                           | aktiviert `web_search`, `web_fetch`, `web_crawl` |
| Storage (Uploads, Bildgen-Persist) | `R2_*` aus Phase 4                                            | sonst data-URL Fallback                          |
| Bildgenerierung                    | `GOOGLE_GENERATIVE_AI_API_KEY`                                | gleicher Key wie YouTube/TTS/Deep Research       |
| YouTube                            | `YOUTUBE_API_KEY`                                             | Data API v3                                      |
| TTS                                | `GOOGLE_GENERATIVE_AI_API_KEY` + `TTS_ENABLED=true`           |                                                  |
| Deep Research                      | `GOOGLE_GENERATIVE_AI_API_KEY` + `DEEP_RESEARCH_ENABLED=true` |                                                  |
| Memory                             | `MEM0_API_KEY`                                                | aktiviert Memory-Tools                           |
| MCP                                | `MCP_ENABLED=true` + Server-spezifische Tokens                | siehe Seeds                                      |
| Agent Skills (PPTX/XLSX/DOCX/PDF)  | `ANTHROPIC_API_KEY`                                           | direkt, nicht via Gateway                        |
| Business Mode (Privacy-Routing)    | `NEXT_PUBLIC_BUSINESS_MODE=true` + `MISTRAL_API_KEY`          | EU-Routing für PII                               |
| Credits                            | `NEXT_PUBLIC_CREDITS=true`                                    | Build-Zeit, danach Credit-Settings im Admin      |

**Tipp:** Eine `.env.example`-basierte Checkliste pro Kunde führen — dann
weißt du in 6 Monaten, welche Features aktiv sind.

#### EU/Local-Profil (statt SaaS)

Wenn der Kunde DSGVO-strikt arbeitet:

```bash
LLM_ROUTING=direct                # statt gateway
# AI_GATEWAY_API_KEY entfällt
MISTRAL_API_KEY=<key>
IONOS_API_TOKEN=<token>           # für Llama/GPT-OSS
```

Details: [`deployment-guide.md`](deployment-guide.md) Abschnitt
„EU/Local Deployment".

**End-Zustand:** ENV in Vercel komplett, alle drei Stages (Production,
Preview, Development) gesetzt — oder bewusst nur Production für die erste
Inbetriebnahme.

---

## Phase 7 — Erstes Deploy, Migration, Seed

**Ziel:** Instanz lädt, DB-Schema steht, korrekte Seeds drin.

### 7.1 Deploy

- Vercel → Deployments → Redeploy mit den neuen ENV-Variablen
- Erstes Build kann 2–3 Minuten dauern
- Bei Build-Fehler: Logs prüfen, in 99% der Fälle eine fehlende Pflicht-ENV

### 7.2 Migrationen ausführen

DB-Schema ist initial leer. Lokal gegen die Prod-DB der Instanz:

```bash
DATABASE_URL=<prod-url> pnpm db:migrate
```

Drizzle-Migration-Files liegen in `drizzle/`. Idempotent.

### 7.3 Seeds einspielen

**Mit Instance-Filter** — sonst landen Seeds in der DB, die hier nichts zu suchen haben:

```bash
DATABASE_URL=<prod-url> SEED_INSTANCE=<slug> pnpm db:seed
```

Ergebnis-Zusammenfassung am Ende prüfen: passen die `seeded`/`skipped`-Zahlen
zur Erwartung? Bei Bedarf vorher noch ein `--dry-run` davorschalten.

### 7.4 (Optional) Manuelle DB-Inspektion

```bash
DATABASE_URL=<prod-url> pnpm db:studio
```

Drizzle Studio öffnet sich im Browser. Tabellen `experts`, `skills`,
`models`, `mcp_servers` müssen befüllt sein, `users` darf leer sein.

**End-Zustand:** Domain antwortet mit Landing Page, DB ist gefüllt mit den
korrekt gefilterten Seeds.

---

## Phase 8 — Bootstrap: Login und Superadmin

**Ziel:** Erster User ist drin, Admin-UI erreichbar.

### 8.1 Login testen

1. Domain im Browser öffnen → Klick auf Login
2. Redirect zu `auth.loschke.ai`
3. Mit dem Account einloggen, der in Phase 2.3 als approved Member
   in die Org gesetzt wurde
4. Redirect zurück, Chat-Interface lädt

### 8.2 Superadmin-Promotion

- Wenn dieser Account in `SUPERADMIN_EMAIL` steht: automatische Promotion
  beim ersten Login. `/admin/*` ist sofort erreichbar.
- Wenn nicht: in der DB-Tabelle `users` das Feld `role` auf `superadmin`
  setzen (einmalig, danach via Admin-UI).

### 8.3 Weitere User

- Eingeladen / approved über loschke-auth Admin-UI (in der Org)
- User-Pflege auf App-Seite: `/admin/users`

**End-Zustand:** Du bist eingeloggt, siehst Admin-Menü, kannst Experten/
Skills/Models in der UI sehen.

---

## Phase 9 — Smoke-Test und Übergabe

**Ziel:** Sicherheit, dass die Instanz alles macht, was sie soll.

### Pflicht-Checks

- [ ] Login + Logout funktioniert
- [ ] Chat-Antwort kommt durch (eine kurze Frage stellen)
- [ ] Experten-Liste in der UI zeigt **genau** die erwarteten Experten
- [ ] Models-Picker zeigt erwartete Modelle (Stichprobe: ein Model wählen, Chat funktioniert)
- [ ] Admin-UI: `/admin/skills`, `/admin/experts`, `/admin/models` rendern Daten
- [ ] Falls SAVA o.ä.: getaggte Experten/MCP-Server sind nur in der richtigen Instanz sichtbar

### Feature-Checks (nur was aktiviert ist)

- [ ] Bildgenerierung: Prompt → Bild kommt, R2-URL ist abrufbar
- [ ] Web-Search: Frage mit Recherche-Bedarf, Quellen erscheinen
- [ ] MCP-Server: Test-Tool aufrufen
- [ ] Business Mode: Privacy-Banner, EU-Routing greift bei PII

### Operatives

- [ ] DNS auf TLS prüfen (kein Cert-Warning)
- [ ] CSP-Header korrekt (DevTools → Network → Response Headers)
- [ ] Vercel-Logs: keine roten Errors im ersten Test-Lauf

### Übergabe-Artefakte (für den Kunden)

- Login-URL
- Liste der freigeschalteten Features (was ist an, was nicht)
- Wer ist Superadmin, wie lädt man weitere User ein
- Notfall-Kontakt + welche Logs wo zu finden sind

---

## Cheat-Sheet: Befehle

```bash
# Vor dem ersten Deploy: Seeds prüfen
SEED_INSTANCE=<slug> pnpm db:seed --dry-run

# Erstes Setup gegen Prod-DB
DATABASE_URL=<prod-url> pnpm db:migrate
DATABASE_URL=<prod-url> SEED_INSTANCE=<slug> pnpm db:seed

# Re-Seed (nach Seed-File-Änderung)
DATABASE_URL=<prod-url> SEED_INSTANCE=<slug> pnpm db:seed

# DB-Inhalt inspizieren
DATABASE_URL=<prod-url> pnpm db:studio

# Lokale Entwicklung gegen die Instanz-DB (vorsichtig!)
DATABASE_URL=<prod-url> SEED_INSTANCE=<slug> pnpm dev
```

---

## Häufige Probleme

| Symptom                                           | Wahrscheinliche Ursache                                                     | Fix                                                                                    |
| ------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `503 OIDC_CLIENT_ID nicht gesetzt` in Prod        | ENV nicht auf Production-Stage gesetzt                                      | Vercel ENV-Settings prüfen, Redeploy                                                   |
| Login redirected zu Auth, kommt aber nicht zurück | `OIDC_REDIRECT_URI` weicht von der in loschke-auth registrierten URL ab     | exakt gleich setzen, inkl. Trailing Slash                                              |
| Login geht zu Auth, dann „access denied"          | Membership in der Org fehlt oder nicht approved                             | loschke-auth Admin-UI, Member approven                                                 |
| `403` beim Login obwohl Member                    | Slug-Mismatch zwischen Org und `OIDC_CLIENT_ID`                             | beide auf identischen Slug                                                             |
| SAVA-Experten erscheinen in falscher Instanz      | Seed lief ohne `SEED_INSTANCE`                                              | Aufräumen via Admin-UI deaktivieren oder DELETE in DB; künftiges Re-Seeding mit Filter |
| `0 seeded` mit Warnung „possible typo"            | Slug in `SEED_INSTANCE` weicht vom Frontmatter-Slug ab                      | Warnung listet die bekannten Slugs                                                     |
| Bildgen-Tool fehlt im Chat                        | `GOOGLE_GENERATIVE_AI_API_KEY` nicht gesetzt **oder** Privacy-Routing aktiv | ENV setzen / Privacy-Modus akzeptieren                                                 |
| Build schlägt fehl mit Tailwind-Crash             | Streamdown `@source` für node_modules eingebaut                             | nicht hinzufügen, siehe `globals.css`-Konvention                                       |

---

## Was bleibt geteilt zwischen Instanzen?

- **Codebase** (1 Repo, n Vercel-Projekte) — Bugfixes wirken überall
- **`loschke-auth` Identity Provider** — gleicher User-Account funktioniert über alle Instanzen, ist aber pro Instanz separat zu approven
- **`auth.loschke.ai` als Hostname** — alle Instanzen reden mit demselben OIDC-Provider

**Was getrennt ist (= Vorsicht):**

- Datenbanken (kein Daten-Sharing)
- Chat-Verlauf, User-Profile, Memories
- Credits-Stand
- Geseedete Inhalte (Experten, Skills) — pro Instanz nach Filter-Konfig

---

## Folge-Schritte nach dem Setup

- **Re-Seeding-Routine:** Bei jeder Seed-File-Änderung einmal mit
  `SEED_INSTANCE=<slug>` durch jede betroffene Instanz fahren. Idempotent.
- **Updates:** Code-Push deployt automatisch in alle verbundenen Vercel-Projekte
- **Monitoring:** Vercel-Logs + Neon-Metriken im Auge behalten
- **Backups:** Neon hat Point-in-Time-Recovery; für kritische Kunden zusätzlich
  einen `pg_dump`-Cron einrichten

---

## Verwandte Dokumente

| Dokument                                                           | Zweck                                                     |
| ------------------------------------------------------------------ | --------------------------------------------------------- |
| [`deployment-guide.md`](deployment-guide.md)                       | Technische Tiefe: Self-Hosted, Docker, Migration-Workflow |
| [`feature-flags-konfiguration.md`](feature-flags-konfiguration.md) | Vollständige ENV-Referenz, Feature-Flag-Logik             |
| [`admin-handbuch.md`](admin-handbuch.md)                           | Admin-UI-Bedienung (Skills, Experten, Models, Credits)    |
| [`technical-architecture.md`](technical-architecture.md)           | Architektur, Tools, Skills, Memory, MCP                   |
| [`tom-datenschutz.md`](tom-datenschutz.md)                         | TOM nach Art. 32 DSGVO                                    |
| [`../../seeds/README.md`](../../seeds/README.md)                   | Seed-Format, Instanz-Filter, Konventionen                 |
| [`../../CLAUDE.md`](../../CLAUDE.md)                               | Projektkontext + Konventionen für Claude/Devs             |
