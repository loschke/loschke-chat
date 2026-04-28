# PRD: Auth-Migration build-jetzt → loschke-auth

> **Status:** Draft — Team-Review ausstehend
> **Owner:** Rico Loschke
> **Last updated:** 2026-04-27
> **Scope:** build-jetzt (Auth-Layer + DB-Schema), Vorbereitung Multi-Domain-Rollout

---

## 1. Executive Summary

`build-jetzt` ist heute via `@logto/next` an die externe SaaS-Lösung **Logto** angebunden. Vor dem geplanten Multi-Domain-Rollout (mehrere Vercel-Deployments derselben App auf unterschiedlichen Brand- und Kunden-Domains) wollen wir den Auth-Layer auf unsere selbst entwickelte zentrale Lösung **`loschke-auth`** (auth.loschke.ai) umstellen. Diese Migration:

- Ersetzt einen externen SaaS-Vendor durch eigene Infrastruktur (DSGVO, Kosten, Lock-In).
- Befähigt jede Instanz, eigenen Auth-Modus (`public` / `approval_required` / `invite_only`) und eigene User-Pool-Bindung (Ecosystem vs. Kunde) zu betreiben.
- Wechselt von Resend (E-Mail-Provider) auf Scaleway — Auth-E-Mails laufen vollständig in `loschke-auth`, nicht in der App selbst.

Da `build-jetzt` aktuell nur einen Echtnutzer (Rico, Superadmin) hat, ist ein **Greenfield-Cutover ohne Datenmigration** möglich. Die Umstellung passiert in einem fokussierten PR mit klarem Rollback-Pfad (Vercel-ENV-Revert + Logto-Tenant bleibt 1–2 Wochen warm).

---

## 2. Problem & Motivation

### 2.1 Probleme heute

- **Vendor-Lock-In zu Logto.** `@logto/next` wird tief im Server-Action-Flow genutzt (`signIn`, `signOut`, `handleSignIn`, `getLogtoContext`), Cookie-Naming-Schema (`logto_${appId}`) ist im Proxy hardcoded, ENV-Vars sind Logto-spezifisch.
- **Kein konsistentes Multi-Tenant-Modell.** Logto-Free-Tier limitiert auf 3 Apps; jede neue Brand- oder Kunden-Instanz wäre eine eigene SaaS-App. Pricing skaliert nicht.
- **Datenresidenz unklar.** Logto Cloud läuft (je nach Tenant) in den USA; unsere DSGVO-Aussage in `tom-datenschutz.md` muss auf EU-Stack heben.
- **Kein zentrales Org-/Tenant-Modell.** Rollen/Approval-Status leben vollständig in der App-DB (`users.role`, `users.status`); Logto liefert nur Identity. Bei Multi-Instanz-Rollout fehlt der zentrale Single-Point-of-Truth für „Wer darf was bei welcher Instanz?".
- **E-Mail-Versand parallel verteilt.** Heute keine Mails in build-jetzt; bei Multi-Instanz-Rollout würden Welcome-/Approval-Mails entweder pro App (Resend) oder zentral (Scaleway über loschke-auth) laufen — unsere Architektur-Entscheidung muss eindeutig sein.

### 2.2 Was sich mit `loschke-auth` ändert

`loschke-auth` ist eine selbst entwickelte OAuth-2.1-/OIDC-Lösung auf Better-Auth-Basis mit folgenden Eigenschaften:

- **OIDC-Standard-Endpoints** (`authorize`, `token`, `userinfo`, `end-session`, `jwks`) → kein Vendor-spezifisches SDK auf Client-Seite zwingend.
- **Multi-Tenant-Modell** mit zwei Org-Typen: `ecosystem` (loschke.ai, build.jetzt, lernen.diy, unlearn.how teilen User) und `client` (pro Kunde isoliert).
- **Per-Client `signup_mode`**: `public` / `approval_required` / `invite_only`. Wird in der `oauth_clients`-Tabelle gespeichert, gating passiert serverseitig im `authorize-gate`.
- **Magic-Link-OTP-Flow** (kein Passwort) als Auth-Methode in v1.
- **Scaleway** für transaktionale E-Mails (EU, fr-par).
- **JWKS + RS256-signierte ID-Tokens** mit Claim `organizations: Array<{id, slug, type, role}>` → Client-App kann Membership lokal verifizieren.
- **DSGVO-konformer Audit-Log** mit IP-Hashing.

---

## 3. Goals & Non-Goals

### 3.1 Goals (in Scope)

1. `@logto/next` und alle Logto-Spuren aus build-jetzt entfernen.
2. OIDC-Integration gegen `loschke-auth` etablieren mit `arctic` + `jose`.
3. Multi-Instanz-Konfiguration ermöglichen: pro Vercel-Deployment eigener `oauth_client` + Pflicht-Org-Slug per ENV.
4. Server-Side **Org-Membership-Validierung** im Callback und beim Token-Refresh.
5. Verschlüsselter Session-Cookie (JWE) statt Roh-Tokens.
6. DB-Schema sanft anpassen (`logto_id` → `auth_sub`, `status` Default umstellen).
7. Bestehende API-Guards (`requireAuth`, `requireAdmin`, `requireSuperAdmin`) beibehalten — keine Änderung in den ~70 API-Routen.
8. Greenfield-Cutover (keine Datenmigration), Single-PR mit Rollback-Pfad.

### 3.2 Non-Goals (explizit out of scope)

- **Konsolidierung von `lernen-media-studio`** auf gleichen Cookie-Standard / Org-Membership-Check. Folge-PR.
- **Shared NPM-Package / Workspace-Extraktion.** loschke-hub ist kein pnpm-Workspace; Workspace-Setup + Package-Extraktion wird durchgeführt, sobald der dritte OIDC-Client live geht.
- **Backchannel-Logout** (OIDC-Spec) für sofortige cross-app-Session-Invalidierung. Akzeptierter Trade-off: Membership-Revocation propagiert via Token-Refresh-Cycle.
- **Datenmigration bestehender User.** Greenfield, da nur Rico im System ist.
- **Admin-UI-Erweiterungen** (z. B. Deep-Link von User-Listing in build-jetzt zu loschke-auth-Admin).
- **Datenschutz-Dokumentation aktualisieren** (`tom-datenschutz.md`, `datenschutz-übersicht.md`). Folge-PR.
- **Theme/Brand pro Instanz.** Bereits orthogonal implementiert.
- **Volltext-Konvertierung der Auth-E-Mails.** OTP/Welcome werden komplett von loschke-auth gerendert; build-jetzt sendet keine Auth-Mails.

---

## 4. Stakeholder & Affected Systems

| System | Betroffen? | Art |
|--------|-----------|-----|
| `build-jetzt` | ✅ Primär | Code-Umbau Auth-Layer, DB-Migration, ENV |
| `loschke-auth` | ✅ Konfiguration | OAuth-Client-Registrierung, Org-Setup, Membership |
| `lernen-media-studio` | ❌ unverändert in v1 | Folge-PR später |
| `loschke.ai`, `unlearn.how`, `lernen.diy` | ❌ noch ohne Auth | Werden mittelfristig als weitere Clients angebunden |
| Vercel-Deployments | ✅ ENV-Update | Pro Instanz neue ENV-Vars |
| Datenschutz-Dokumentation | ⚠️ deferred | Auftragsverarbeiter-Liste muss Logto durch Scaleway/loschke-auth ersetzen |

---

## 5. Current State (As-Is)

### 5.1 Auth-Code (build-jetzt)

| Datei | Zweck |
|-------|-------|
| `src/lib/logto.ts` | `logtoConfig`-Objekt mit `LOGTO_*`-ENV-Vars |
| `src/lib/auth.ts` | `getUser()` (Token-Claims), `getUserFull()` (HTTP-Call zu Logto userInfo) |
| `src/lib/api-guards.ts` | `requireAuth()` ruft `getUser()` + `ensureUserExists()` + `getUserStatus()` |
| `src/lib/admin-guard.ts` | `requireAdmin()` / `requireSuperAdmin()` lesen DB-Role mit ADMIN_EMAILS-Fallback |
| `src/proxy.ts` | Cookie-Check `logto_${LOGTO_APP_ID}`, CSRF-Origin-Check gegen `LOGTO_BASE_URL` |
| `src/app/api/auth/sign-in/route.ts` | `signIn()` Server-Action |
| `src/app/api/auth/callback/route.ts` | `handleSignIn()` Server-Action |
| `src/app/api/auth/sign-out/route.ts` | `signOut()` Server-Action |

### 5.2 DB-Schema (`src/lib/db/schema/users.ts`)

```typescript
users {
  id              uuid       PK
  logtoId         text       UNIQUE NOT NULL  -- = Logto sub claim
  email           text
  name            text
  avatarUrl       text
  role            text       'user' | 'admin' | 'superadmin'  default 'user'
  status          text       'pending' | 'approved' | 'rejected'  default 'pending'
  approvedAt      timestamp
  approvedBy      text
  customInstructions text
  defaultModelId  text
  memoryEnabled   boolean    default false
  ...
  creditsBalance  integer    default 0
  createdAt, updatedAt
}
```

**Andere Tabellen** (chats, projects, artifacts, usage_logs, credit_transactions, …) referenzieren `userId text` ohne FK — der String ist heute der Logto-`sub`.

### 5.3 ENV-Vars heute

```
LOGTO_ENDPOINT, LOGTO_APP_ID, LOGTO_APP_SECRET, LOGTO_BASE_URL, LOGTO_COOKIE_SECRET
SUPERADMIN_EMAIL, ADMIN_EMAILS (deprecated)
INITIAL_CREDITS
```

### 5.4 Resend

**Nicht im Einsatz.** build-jetzt sendet aktuell keine E-Mails. Auth-Mails (OTP, Approval-Notifications, Invitations) werden komplett in `loschke-auth` über Scaleway versendet.

### 5.5 Approval-Logik

- Login → `getUser()` → `ensureUserExists` → User mit `status='pending'` (außer `SUPERADMIN_EMAIL` oder `OPEN_REGISTRATION` Flag).
- `requireAuth` returned 403 mit `code: USER_NOT_APPROVED` wenn `status !== 'approved'` und User nicht Admin.
- `/pending-approval`-Page als Public Route, zeigt Wartemeldung.
- Admin schaltet via `/admin/users` PATCH `/api/admin/users/{logtoId}/status` frei.

---

## 6. Target State (To-Be)

### 6.1 Auth-Flow End-to-End

```
User klickt „Anmelden" auf build.jetzt
  ↓
GET /api/auth/sign-in (build-jetzt)
  → generiert state, code_verifier, nonce → Cookies (10min, httpOnly)
  → Redirect zu auth.loschke.ai/api/auth/oauth2/authorize?
       client_id=build-jetzt&redirect_uri=…&code_challenge=…&state=…&nonce=…&scope=openid profile email organization
  ↓
auth.loschke.ai prüft Session-Cookie
  → falls nicht eingeloggt: /login → OTP-Anfrage → Mail via Scaleway → /login/verify → Session
  → falls eingeloggt: weiter zum Authorize-Gate
  ↓
authorize-gate prüft Membership in build-jetzt-Owner-Org (ecosystem-org)
  → falls public signup_mode + keine Membership: auto-join status='approved'
  → falls approval_required: status='pending', User landet auf /pending in loschke-auth (build-jetzt sieht den User nie)
  → falls Membership ok: Consent (oder skip wenn vorhanden)
  ↓
Redirect zu build.jetzt/api/auth/callback?code=…&state=…
  ↓
build-jetzt Callback:
  1. State-Cookie-Match (CSRF)
  2. POST /api/auth/oauth2/token → ID-Token + Refresh-Token
  3. verifyIdToken via JWKS (issuer, audience, nonce match)
  4. assertRequiredOrgMembership(claims, AUTH_REQUIRED_ORG_SLUG)
  5. ensureUserExists({ authSub, email, name }) → User-Row default status='approved'
  6. JWE-Cookie bj_session setzen
  7. Redirect zu / (oder return_to aus Cookie)
  ↓
App nutzbar; bei jedem Request:
  - proxy.ts prüft Cookie bj_session existiert
  - getCurrentUser() entschlüsselt → claims-snapshot
  - bei abgelaufenem id_token: refresh, Cookie rotieren (Mutex gegen Race)
  - claims-Snapshot wird beim Refresh neu validiert (Membership-Revocation propagiert in <token-TTL)
```

### 6.2 Multi-Instanz-Konfiguration

**Konvention (final):** Pro App in `loschke-auth` gibt es genau **eine** Organization, deren `slug` dem `OIDC_CLIENT_ID` der App entspricht. Damit ist die OAuth-Client-ID die einzige zentrale App-Identität — kein zweites Setting nötig. `AUTH_REQUIRED_ORG_SLUG` defaulted automatisch auf `OIDC_CLIENT_ID` und muss nur gesetzt werden, wenn der Slug abweicht.

| Instanz | Domain | OIDC_CLIENT_ID | Org-Slug in loschke-auth | signup_mode |
|---------|--------|----------------|--------------------------|-------------|
| build.jetzt (du) | build.jetzt | `build-jetzt` | `build-jetzt` | `approval_required` |
| Kunden-A | build.acme.com | `build-jetzt-acme` | `build-jetzt-acme` | `invite_only` |
| Kunden-B | build.xyz.com | `build-jetzt-xyz` | `build-jetzt-xyz` | `approval_required` |
| Local-Dev | localhost:3000 | (nicht gesetzt) | (Dev-Bypass im Proxy) | — |

Jede Instanz hat in `loschke-auth`:
- Eigenen `oauth_client` (Client-ID + Secret + Redirect-URI).
- Eigene `organization` mit Slug = Client-ID.
- Eigene Memberships — kein App-übergreifendes Pooling. Wenn ein User in mehreren Apps freigeschaltet ist, hat er pro App eine eigene Membership-Row.

### 6.3 Code-Architektur

Neue Module unter `src/lib/auth/`. Modul-Boundary so gewählt, dass eine spätere Extraktion zum shared Workspace-Package nur den `bridge.ts` als App-Anpassung benötigt.

```
src/lib/auth/
├── oidc.ts       — pure OIDC, keine DB-Imports (kandidat für Extraktion)
├── session.ts    — JWE-Cookie, Refresh-Mutex (kandidat für Extraktion)
├── claims.ts     — Org-Membership-Validation (kandidat für Extraktion)
└── bridge.ts     — App-Brücke: ensureUserExists, AppUser-Mapping (bleibt App-spezifisch)

src/lib/auth.ts   — Thin-Wrapper, behält bisherige API-Oberfläche (AppUser, getUser, getUserFull)
```

### 6.4 DB-Schema-Anpassungen

```sql
ALTER TABLE users RENAME COLUMN logto_id TO auth_sub;
-- Spalten-Type bleibt text, Werte werden bei nächster Anmeldung neu angelegt
-- (Greenfield: alte Logto-sub-Werte verfallen)

-- Default-Status von 'pending' auf 'approved' umstellen
-- (Approval-Gate ist jetzt in loschke-auth, lokales status nur noch für Suspend-Override)
ALTER TABLE users ALTER COLUMN status SET DEFAULT 'approved';
```

`status`-Spalte bleibt erhalten, weil sie weiterhin als App-lokaler Suspend-Override sinnvoll ist (z. B. wenn ein User in loschke-auth aktiv ist, aber in dieser Instanz lokal gesperrt werden soll, ohne Eingriff in die zentrale Auth-Plattform).

### 6.5 ENV-Vars final

```bash
# OIDC-Provider (loschke-auth)
OIDC_ISSUER=https://auth.loschke.ai
OIDC_AUTHORIZE_URL=https://auth.loschke.ai/api/auth/oauth2/authorize
OIDC_TOKEN_URL=https://auth.loschke.ai/api/auth/oauth2/token
OIDC_USERINFO_URL=https://auth.loschke.ai/api/auth/oauth2/userinfo
OIDC_END_SESSION_URL=https://auth.loschke.ai/api/auth/oauth2/end-session
OIDC_JWKS_URL=https://auth.loschke.ai/api/auth/jwks
OIDC_CLIENT_ID=build-jetzt
OIDC_CLIENT_SECRET=…
OIDC_REDIRECT_URI=https://build.jetzt/api/auth/callback
OIDC_SCOPES="openid profile email organization"

# Multi-Instanz Pflicht-Membership — defaulted auf OIDC_CLIENT_ID,
# nur setzen wenn Org-Slug vom Client-ID abweicht.
# AUTH_REQUIRED_ORG_SLUG=

# App selbst
APP_BASE_URL=https://build.jetzt        # ersetzt LOGTO_BASE_URL für CSRF-Origin-Check
AUTH_COOKIE_SECRET=…                     # min 32 Zeichen, JWE-Master-Key

# Bestand
SUPERADMIN_EMAIL=ai@kvix.de
INITIAL_CREDITS=…
```

**Entfallen:** `LOGTO_APP_ID`, `LOGTO_APP_SECRET`, `LOGTO_ENDPOINT`, `LOGTO_BASE_URL`, `LOGTO_COOKIE_SECRET`, `ADMIN_EMAILS` (deprecated war eh).

---

## 7. Architecture Decisions

### 7.1 SDK-Wahl: `arctic` + `jose` direkt, kein BetterAuth-Client-SDK

**Entscheidung:** Wir gehen direkt gegen die OIDC-Endpoints mit `arctic` (OAuth-Client, PKCE) und `jose` (JWT-Verify).

**Begründung:**
- `lernen-media-studio` nutzt dieses Pattern bereits in Production — bewährt.
- Keine Bindung an BetterAuth-Client-Abstraktionen, die sich mit BetterAuth-Server-Versionen ändern können.
- Beide Libraries sind Standards (`jose` = de-facto JWT-Library für Node, `arctic` = leichtgewichtiger OAuth-Client von Lucia-Team).
- Maximaler Kontrolle über Cookie-Format, Refresh-Strategie und Org-Membership-Validation.

**Trade-off:** Mehr eigener Code (~250 LOC) statt 3 SDK-Calls. Akzeptiert.

### 7.2 Session-Cookie: Single JWE-Cookie statt Roh-Tokens

**Entscheidung:** Ein einziger HttpOnly-Cookie `bj_session`, JWE-verschlüsselt, enthält `{ idToken, refreshToken, claimsSnapshot, exp }`.

**Begründung:**
- Schutz gegen Token-Leak bei DB-Backup-Exposition oder Server-Log-Leak (Tokens sind nie roh in Cookies).
- Single-Cookie-Strategie reduziert Cookie-Header-Size und Race-Conditions zwischen Multi-Cookie-Sets.
- Claims-Snapshot ermöglicht günstige `getCurrentUser()`-Calls ohne JWKS-Roundtrip pro Request (nur bei Refresh).

**Trade-off:** `lernen-media-studio` nutzt heute zwei Roh-Token-Cookies. Inkonsistenz zwischen den Apps wird akzeptiert; lms wird in Folge-PR auf gleichen Standard gehoben (User hat OK gegeben).

**Alternative verworfen:** Cross-Domain-Cookie auf `auth.loschke.ai` als Session-Träger (Browser-third-party-cookie-Phaseout, SameSite=None nötig, fragile). SSO entsteht stattdessen über die loschke-auth-eigene Browser-Session, nicht über geteilte Cookies.

### 7.3 Org-Membership-Validierung: im Callback + bei jedem Refresh

**Entscheidung:** Org-Slug wird aus `claims.organizations[]` gegen `AUTH_REQUIRED_ORG_SLUG` validiert
- **im Callback** bei jedem Login (verbindlich), und
- **beim Token-Refresh** (typischerweise alle 15min–1h, je nach `id_token`-TTL in loschke-auth).

**Begründung:**
- Pro-Request-Check gegen die DB oder UserInfo-Endpoint wäre zu teuer (Latenz).
- Refresh-Cycle ist ein natürlicher Validation-Punkt; Membership-Revocation propagiert in ≤ token-TTL.

**Trade-off:** Sofortige Revocation (Backchannel-Logout) wird in v1 nicht implementiert. Akzeptierter Trade-off: max ~15min Latenz, ist für unsere Bedrohungsmodelle ausreichend. Backchannel-Logout ist Out-of-Scope für diesen PR.

### 7.4 Refresh-Token-Race: In-Memory-Mutex pro Vercel-Instanz

**Entscheidung:** Bei parallelen Server-Calls mit abgelaufenem `id_token` schützen wir den Refresh-Call durch einen in-memory `Map<sessionHash, Promise<Tokens>>`-Mutex.

**Begründung:**
- Race-Condition real: zwei gleichzeitige Server-Actions sehen abgelaufenes Token, beide rufen `/token` mit demselben Refresh-Token, der zweite bekommt `invalid_grant` (Refresh ist single-use bei loschke-auth).
- Mutex ist auf Vercel-Function-Instanz lokal; bei mehreren parallelen Vercel-Instances kann der Race noch passieren.
- **Ergänzungs-Anforderung an `loschke-auth`:** 30s-Grace-Window nach Refresh-Token-Rotation, in dem das alte Refresh-Token noch akzeptiert wird (rotierende Token-Familie). Ist robust gegen verteilte Vercel-Multi-Instance-Races.
- Falls loschke-auth diesen Grace nicht hat: Refresh-Calls in eine zentrale `/api/auth/refresh`-Route serialisieren (alle Server-Actions machen Soft-Lookup, nur dieser eine Endpoint refresht).

**Offene Frage an Team:** Hat loschke-auth heute schon ein Grace-Window? Falls nein, ist das ein Anforderungs-Ticket gegen loschke-auth.

### 7.5 DB-Schema: Spalten-Rename statt neue Tabelle

**Entscheidung:** `users.logto_id` wird zu `users.auth_sub` umbenannt. Andere Tabellen bleiben unverändert (Spalten heißen weiterhin `userId`, sind weiterhin `text`-Strings ohne FK).

**Begründung:**
- Greenfield: Werte ändern sich (Logto-Sub ≠ loschke-auth-Sub), aber Schema-Strukturlich identisch.
- Andere Tabellen referenzieren weiter den OIDC-`sub`-String → kein Schema-Change nötig.
- Alte verwaiste Daten (Rico's frühere Logto-Subs) werden bei Folge-Login durch neue Subs ersetzt; Daten-Aufräumung optional.

### 7.6 Approval-Gate: zu loschke-auth verschoben, lokal als Suspend-Override

**Entscheidung:** Neue User landen lokal default mit `status='approved'`. Pending/Rejected ist nur noch lokales Suspend-Konzept.

**Begründung:**
- Approval-Logik ist im `loschke-auth.authorize-gate` zentralisiert. Wenn ein User die App erreicht, wurde Membership bereits gating-geprüft.
- Lokales `status='suspended'`-Pattern bleibt nützlich, falls eine Instanz einen einzelnen User lokal sperren will, ohne in loschke-auth einzugreifen.

**Trade-off:** Kleiner Doppel-Bookkeeping-Aufwand (loschke-auth-Admin + build-jetzt-Admin). Akzeptiert, weil App-Suspend ein eigener Lifecycle-Punkt ist.

### 7.7 App-Admin-Role bleibt lokal (nicht aus Token-Claim)

**Entscheidung:** `users.role` (`user|admin|superadmin`) bleibt App-DB-verwaltet. **Nicht** aus `claims.organizations[].role` abgeleitet.

**Begründung:**
- App-Admin-Role ist App-Domäne (verwaltet Skills/Models/MCP-Server der Plattform).
- Org-Role in loschke-auth ist Identity-Domäne (`owner/admin/member` einer Organization, Bedeutung Org-spezifisch).
- Vermischung würde in loschke-auth zu app-spezifischen Rollen-Wildwuchs führen.
- `SUPERADMIN_EMAIL`-Auto-Promotion bleibt als Bootstrap-Mechanismus, damit Rico beim ersten Login direkt App-Admin ist.

### 7.8 Code-Pattern: Copy-mit-Boundary, kein shared Package in v1

**Entscheidung:** Code lebt in `src/lib/auth/` mit klarer Modul-Boundary. Kein Workspace-Package in v1.

**Begründung:**
- `loschke-hub` ist heute kein pnpm-Workspace (kein root `package.json`, keine `pnpm-workspace.yaml`).
- Workspace-Setup + Package-Extraktion ist ein eigenes Infrastruktur-Projekt, sollte nicht im Auth-PR erschlagen werden.
- Mit klar getrennten Modulen (`oidc.ts`, `session.ts`, `claims.ts` ohne Drizzle-Import) ist die spätere Extraktion ein Datei-Move + Workspace-Setup, kein Refactor.
- Drift-Risiko zwischen `lernen-media-studio` und `build-jetzt` wird akzeptiert; lms wird in Folge-PR auf gleichen Stand gehoben.

**Trigger für Workspace-Konsolidierung:** Wenn der dritte produktive OIDC-Client (loschke.ai oder unlearn.how) live geht, wird ein eigener PR „pnpm-Workspace + @loschke-hub/oidc-client extrahieren" gestartet, der alle drei Apps konsolidiert.

---

## 8. Detailed Implementation Plan

> Ein Single-PR ist möglich, weil Greenfield. Reihenfolge der Commits innerhalb des PRs:

### Commit 1 — Dependencies + ENV-Beispiel

- `pnpm remove @logto/next`
- `pnpm add arctic jose` (jose wird ggf. transitiv schon vorhanden sein, pinning prüfen)
- `.env.example` und `.env.eu.example`: Logto-Block durch OIDC-Block ersetzen.
- `package.json` Update.

### Commit 2 — Neue Auth-Module (ohne Verdrahtung)

Neue Dateien:
- `src/lib/auth/oidc.ts` — `createAuthorizationUrl`, `exchangeCode`, `refreshTokens`, `verifyIdToken`, `decodeIdTokenClaims`. Type `IdTokenClaims`.
- `src/lib/auth/session.ts` — `bj_session` Cookie-Constants, `getSessionPayload`, `setSessionPayload`, `clearSession`, Refresh-Mutex. JWE via `jose.EncryptJWT` mit `dir`/`A256GCM` und Key aus `AUTH_COOKIE_SECRET` per `hkdf`.
- `src/lib/auth/claims.ts` — `assertRequiredOrgMembership(claims)`, `getOrgRole(claims, slug)`, `OrgMembershipError`.
- `src/lib/auth/bridge.ts` — `getCurrentUser()` (Session→AppUser), `requireUser()` (wirft 401), `getCurrentClaims()` (raw).

Tests-Strategie: Wenn keine bestehenden Auth-Tests existieren (zu prüfen): kleine Vitest-Suite gegen oidc/session, lokale Validierung mit Staging-loschke-auth manuell im Dev-Server.

### Commit 3 — Auth-Routen umbauen

- `src/app/api/auth/sign-in/route.ts` (UMBAU): generiert PKCE, transiente Cookies, Redirect zu `OIDC_AUTHORIZE_URL`.
- `src/app/api/auth/callback/route.ts` (UMBAU): State-Match, Token-Exchange, ID-Token-Verify, **`assertRequiredOrgMembership`**, `ensureUserExists`, JWE-Cookie setzen.
- `src/app/api/auth/sign-out/route.ts` (UMBAU): Session lesen, Cookie clearen, Redirect zu `OIDC_END_SESSION_URL` mit `id_token_hint` + `post_logout_redirect_uri`.
- `src/app/api/auth/error/route.ts` (NEU): minimale HTML-Page für Error-Redirects (`reason=no_membership` etc).

### Commit 4 — Helpers + Guards umverdrahten

- `src/lib/auth.ts` (UMBAU): wird Thin-Wrapper. `getUser()` → `bridge.getCurrentUser()`. `getUserFull()` macht zusätzlichen Call zu `OIDC_USERINFO_URL` mit Bearer-Access-Token.
- `src/lib/api-guards.ts` (UMBAU intern): `ensureUserExists({ authSub: user.id, ... })`. Approval-Status-Check bleibt als Defense-in-Depth.
- `src/lib/admin-guard.ts`: bleibt strukturell unverändert.

### Commit 5 — DB-Schema-Migration

- `src/lib/db/schema/users.ts`: `logtoId` → `authSub`, `status` default `"approved"`.
- `src/lib/db/queries/users.ts`: `ensureUserExists` Parameter `authSub`, initial status `"approved"`, sonst Logik unverändert.
- `pnpm db:generate` → neue Drizzle-Migration mit `RENAME COLUMN` + `ALTER DEFAULT`.
- `src/lib/db/CLAUDE.md`: Doku-Update („User-ID Quelle ist OIDC-`sub`").

### Commit 6 — Proxy umstellen

- `src/proxy.ts`: Cookie-Name `bj_session`, ENV `OIDC_CLIENT_ID` für Dev-Bypass-Check, CSRF-Origin gegen `APP_BASE_URL`.

### Commit 7 — Cleanup

- `src/lib/logto.ts` löschen.
- `src/app/pending-approval/page.tsx` behalten (für lokalen Suspend-Override-Fall) oder umformulieren als „Account gesperrt".
- Globale Suche `grep -ri "logto\|@logto" src/ scripts/ docs/` durchgehen, Reste entfernen.
- `CLAUDE.md` und `docs/system/*.md` Auth-Sektionen aktualisieren (Kurzform — Vollformat-Update der Datenschutz-Docs ist Folge-PR).

### Commit 8 — Verification + PR-Description

PR-Body enthält die Verification-Schritte aus Abschnitt 12.

---

## 9. Migration & Rollout

### 9.1 Pre-Conditions in `loschke-auth`

Vor dem Cutover müssen in loschke-auth angelegt sein:

1. `ecosystem`-Org existiert mit Slug `ecosystem`.
2. OAuth-Client `build-jetzt` mit:
   - `owner_organization_id` = ecosystem-org
   - `signup_mode` = `public`
   - `redirect_uris` = `["https://build.jetzt/api/auth/callback", "http://localhost:3000/api/auth/callback"]`
   - `post_logout_redirect_uris` = `["https://build.jetzt/", "http://localhost:3000/"]`
   - `scopes` = `["openid","profile","email","organization"]`
3. Membership Rico in ecosystem-org, role `owner`, status `approved`.
4. Client-Secret sicher in Passwort-Manager + Vercel-ENV.

Für jede weitere Instanz analog: eigener `oauth_client`, eigene Org bei Kunden-Instanzen.

### 9.2 Rollout-Schritte

1. PR `feat/auth-loschke-cutover` mergen (lokal + Staging vorab verifiziert).
2. Vercel-ENV für Production-Instanz umstellen (LOGTO_* raus, OIDC_* + AUTH_REQUIRED_ORG_SLUG + AUTH_COOKIE_SECRET + APP_BASE_URL rein).
3. Deployment.
4. Verification gemäß Abschnitt 12 manuell durchlaufen.
5. Logto-Tenant für 1–2 Wochen warm halten (Rollback-Sicherheit).
6. Nach Stabilitäts-Bestätigung: Logto-Account kündigen.

### 9.3 Rollback

- **Vor Production-Deploy:** PR revert, Logto bleibt aktiv.
- **Nach Production-Deploy, vor 1 Woche:** Vercel-ENV zurücksetzen auf LOGTO_*, alten Container-Build redeployen. Auth funktioniert sofort wieder, da DB-Spalte `auth_sub` (vorher `logto_id`) noch denselben String-Typ hat — Drizzle-Migration rückwärts: `RENAME COLUMN auth_sub TO logto_id; ALTER COLUMN status SET DEFAULT 'pending';`.
- **Nach > 1 Woche:** Logto-Tenant ist gekündigt, Forward-Only.

### 9.4 Multi-Instanz-Rollout (Folge)

Nachdem build.jetzt (Ecosystem) stabil läuft:

1. Erste Kunden-Instanz: neue Vercel-App, eigene Domain, eigener `oauth_client` in loschke-auth mit `signup_mode=invite_only` + eigene Client-Org.
2. Test-Kunde wird via Invite eingeladen → erhält Mail von Scaleway → klickt Link → eingeloggt.
3. Lessons learned → Anpassungen an `AUTH_REQUIRED_ORG_SLUG`-Logik dokumentieren.

---

## 10. Risks & Mitigations

| Risiko | Impact | Wahrscheinlichkeit | Mitigation |
|--------|--------|--------------------|------------|
| `loschke-auth` Production noch nicht stabil zum Cutover-Zeitpunkt | Hoch | Mittel | Cutover erst nach `loschke-auth` v1.0-Tag, Staging-Validation |
| Refresh-Token-Race auf Vercel-Multi-Instance | Mittel | Niedrig | Mutex pro Instance + Grace-Window in loschke-auth (Anforderung) |
| JWKS-Cache-Stale bei Key-Rotation | Niedrig | Niedrig | `jose.createRemoteJWKSet` cached in-memory; bei `kid`-Mismatch wird Fetch ausgelöst |
| Cookie-Größe explodiert mit JWE | Niedrig | Niedrig | id_token + refresh_token + Snapshot ~3-5KB JWE → unter 8KB Cookie-Limit |
| Sneaky Logto-Reste verbleiben (z. B. in Tests, Configs) | Niedrig | Mittel | `grep -ri "logto"` als finaler PR-Check |
| User-ID-Wechsel bricht historische Daten | Niedrig | Hoch | Akzeptiert: nur Rico, alte Daten dürfen verwaisen |
| Org-Membership-Check schlägt fehl, weil Claim nicht da | Mittel | Niedrig | Strict assertion mit klarer Fehlermeldung, Test mit fehlender Membership |
| `AUTH_COOKIE_SECRET`-Rotation invalidiert alle Sessions | Niedrig | Niedrig | Akzeptiert: User loggt sich neu ein. Bei Bedarf Multi-Key-HKDF-Pattern (out of scope v1) |
| Multi-Instanz-Rollout deckt unbekannte Edge-Cases auf | Mittel | Mittel | Erste Kunden-Instanz als Friendly-Beta mit aktivem Monitoring |

---

## 11. Open Questions (für Team-Review)

1. **`loschke-auth` Refresh-Grace:** Hat `loschke-auth` heute schon ein Grace-Window für Refresh-Token-Rotation? Falls nein, wer ergänzt das, und in welchem Sprint?
2. **Cutover-Timing:** Wann ist `loschke-auth` v1.0 stabil genug? Welche Sign-Off-Kriterien?
3. **`lernen-media-studio` Konsolidierung:** Wann wollen wir lms auf den gleichen Cookie-Standard heben? Vor oder nach build-jetzt-Cutover?
4. **`prefill_email`-Parameter:** Soll der Login-Flow bei einer pre-known Email (z. B. aus Invite-Link) den OTP-Step direkt mit der Email vorbelegen? Ist in loschke-auth-Authorize-Endpoint vorgesehen?
5. **`OPEN_REGISTRATION`-Feature-Flag:** Wir hatten in `ensureUserExists` einen `features.openRegistration.enabled` Flag. Mit dem neuen System ist `signup_mode=public` das Pendant. Können wir den Flag ersatzlos entfernen?
6. **Deep-Link aus build-jetzt-Admin zu loschke-auth-Admin:** Soll das User-Management in build-jetzt einen Link „In zentraler Auth verwalten" haben? (eher v2)
7. **Datenschutz-Dokumentation:** Wer aktualisiert `tom-datenschutz.md` und `datenschutz-übersicht.md`? Auftragsverarbeiter Logto → Scaleway + eigenes Hosting Vercel/Neon EU.
8. **Audit-Log:** Soll build-jetzt eigene Audit-Events anlegen (z. B. „User loggt sich ein"), oder reicht der zentrale Audit-Log in loschke-auth?

---

## 12. Verification / Acceptance Criteria

### 12.1 Funktional (manuell)

- [ ] Unauthenticated User auf `/` sieht Landing-Page mit Login-Button.
- [ ] Klick „Anmelden" leitet zu `auth.loschke.ai/api/auth/oauth2/authorize?...` mit korrekten Query-Parametern (PKCE, state, nonce, scope).
- [ ] OTP-Mail kommt an (Scaleway-Versand).
- [ ] Code-Eingabe → Redirect zurück zu `/api/auth/callback?code=…&state=…`.
- [ ] Callback verifiziert ID-Token via JWKS, prüft `claims.organizations` enthält `ecosystem`, ruft `ensureUserExists`, setzt JWE-Cookie.
- [ ] App lädt, Sidebar zeigt User-Avatar + Email + Username.
- [ ] `/admin` öffnet sich (Rico ist Superadmin via `SUPERADMIN_EMAIL`-Auto-Promotion).
- [ ] Eine API-Route mit `requireAuth` (z. B. `/api/credits`) liefert 200.
- [ ] Logout leitet zu `auth.loschke.ai/.../end-session` und kommt nach `/` ohne Cookie zurück.
- [ ] Cookie manuell löschen → Sidebar redirected zu `/`.
- [ ] Mit `AUTH_REQUIRED_ORG_SLUG=client-acme` (Rico nicht in client-acme-Org) → Login → Error-Page mit `reason=no_membership`.

### 12.2 Technisch

- [ ] `pnpm lint` grün.
- [ ] `pnpm build` grün.
- [ ] `pnpm dev` startet ohne Fehler bei minimaler ENV.
- [ ] Drizzle-Migration läuft idempotent (`pnpm db:generate` + `pnpm db:migrate`).
- [ ] DB nach Login: `SELECT auth_sub, email, role, status FROM users WHERE email='ai@kvix.de'` → role=`superadmin`, status=`approved`.
- [ ] `grep -ri "logto" src/ scripts/ .env.example .env.eu.example` liefert nichts (außer ggf. Migration-Hinweis).
- [ ] Cookie-Inhalt ist JWE (lesbar nur mit `AUTH_COOKIE_SECRET`).
- [ ] Static Assets (`/_next/static/...`) gehen ohne Cookie durch.
- [ ] `/share/<token>` ohne Cookie öffnet Share-Page.

### 12.3 Multi-Instanz-Smoke (zweite Vercel-Preview-Deployment)

- [ ] Zweite Preview-Instanz mit `AUTH_REQUIRED_ORG_SLUG=client-acme` und eigenem `OIDC_CLIENT_ID`.
- [ ] Login von Rico → Error-Page (kein Membership).
- [ ] Test-User mit Membership in client-acme → Login durchgeht.
- [ ] Cross-Instance-SSO: Nach Login auf Ecosystem-Instanz, zweiter Tab auf Ecosystem-Preview ohne erneute OTP (loschke-auth-Browser-Session).

---

## 13. Out-of-Scope / Follow-up PRs

Sortiert nach Priorität:

1. **lms-Konsolidierung** auf JWE-Cookie + Org-Membership-Check (Konsistenz zwischen Clients).
2. **Datenschutz-Dokumentation** aktualisieren (`tom-datenschutz.md`, `datenschutz-übersicht.md`): Auftragsverarbeiter-Liste, Datenflüsse, Speicherorte.
3. **`pnpm`-Workspace** in `loschke-hub` einführen + `@loschke-hub/oidc-client` extrahieren (sobald 3. Client live).
4. **Backchannel-Logout** für sofortige cross-app-Session-Invalidierung.
5. **Admin-UI-Erweiterung**: Deep-Link von User-Listing zu loschke-auth-Admin, optional Org-Role-Anzeige.
6. **Friendly-Beta-Onboarding-Flow** für erste Kunden-Instanz (Invite-Pipeline durchspielen).
7. **Test-Coverage** für Auth-Module (Vitest gegen Mock-Auth-Server oder Staging).

---

## 14. Appendix

### 14.1 Critical Files Index

| Datei | Aktion |
|-------|--------|
| `src/lib/auth/oidc.ts` | NEU |
| `src/lib/auth/session.ts` | NEU |
| `src/lib/auth/claims.ts` | NEU |
| `src/lib/auth/bridge.ts` | NEU |
| `src/lib/auth.ts` | UMBAU zu Thin-Wrapper |
| `src/lib/logto.ts` | LÖSCHEN |
| `src/app/api/auth/sign-in/route.ts` | UMBAU |
| `src/app/api/auth/callback/route.ts` | UMBAU |
| `src/app/api/auth/sign-out/route.ts` | UMBAU |
| `src/app/api/auth/error/route.ts` | NEU |
| `src/proxy.ts` | UMBAU |
| `src/lib/api-guards.ts` | UMBAU intern |
| `src/lib/admin-guard.ts` | unverändert |
| `src/lib/db/schema/users.ts` | RENAME `logtoId` → `authSub`, status default `approved` |
| `src/lib/db/queries/users.ts` | UMBAU `ensureUserExists` |
| `src/lib/db/CLAUDE.md` | DOKU-UPDATE |
| `src/app/pending-approval/page.tsx` | optional umformulieren |
| `package.json` | `@logto/next` raus, `arctic` + `jose` rein |
| `.env.example`, `.env.eu.example` | LOGTO_* raus, OIDC_* rein |
| `CLAUDE.md` | Auth-Sektion aktualisieren |

### 14.2 Referenz-Material

- `loschke-auth` Code: `C:\Users\losch\Projekte\loschke-hub\loschke-auth\`
- `loschke-auth` PRD: `C:\Users\losch\Projekte\loschke-hub\loschke-auth\docs\PRD.md`
- `loschke-auth` Security: `C:\Users\losch\Projekte\loschke-hub\loschke-auth\docs\SECURITY.md`
- Referenz-Client `lernen-media-studio`: `C:\Users\losch\Projekte\loschke-hub\lernen-media-studio\`
- OIDC-Spec: https://openid.net/specs/openid-connect-core-1_0.html
- arctic: https://arcticjs.dev/
- jose: https://github.com/panva/jose
