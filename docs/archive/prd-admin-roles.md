# PRD: DB-basiertes Admin-Rollen-System

> Status: **Geplant**
> Erstellt: 2026-03-17

---

## Problem

Das aktuelle Admin-System identifiziert Admins ausschließlich über die ENV-Variable `ADMIN_EMAILS` (kommaseparierte Email-Liste). Das hat mehrere Nachteile:

- Jede Änderung an Admin-Zugängen erfordert ein Redeployment
- Keine Rollenunterscheidung (Admin vs. Superadmin)
- `requireAdmin()` macht bei jedem Call einen HTTP-Request zu Logto (`getUserFull()`) nur um die Email zu bekommen
- Keine UI zum Verwalten von Admin-Zugängen

## Lösung

Hybrid-Ansatz: `SUPERADMIN_EMAIL` ENV als Bootstrap-Mechanismus, `role`-Spalte in der `users`-Tabelle für die eigentliche Rollenverwaltung. Superadmin kann Admins über die Admin-UI ernennen/entfernen.

### Rollen

| Rolle | Zugriff | Vergabe |
|-------|---------|---------|
| `user` | Chat, Einstellungen | Default für alle |
| `admin` | + Admin-UI (Skills, Experts, Models, MCP, Credits) | Superadmin vergibt über UI |
| `superadmin` | + User-Verwaltung (Rollen zuweisen) | Nur via `SUPERADMIN_EMAIL` ENV |

### Performance-Gewinn

Kein HTTP-Call mehr zu Logto bei jedem Admin-API-Request. Vorher: `getUserFull()` (HTTP-Call zu Logto UserInfo Endpoint) + Email-Allowlist. Nachher: `getUser()` (Token-Claims, kein HTTP) + DB-Role-Check mit 60s Cache.

---

## 1. Schema-Migration: `role`-Spalte

**Datei:** `src/lib/db/schema/users.ts`

Neue Spalte + Type-Export:

```typescript
export type UserRole = "user" | "admin" | "superadmin"

// In users table:
role: text("role", { enum: ["user", "admin", "superadmin"] }).default("user").notNull(),
```

- Default `"user"` — alle bestehenden Zeilen bekommen automatisch den korrekten Wert
- Migration: `pnpm db:generate` + `pnpm db:push`

---

## 2. Auto-Promotion in `ensureUserExists()`

**Datei:** `src/lib/db/queries/users.ts`

Nach dem bestehenden Upsert: Wenn `email` mit `SUPERADMIN_EMAIL` übereinstimmt, Role auf `superadmin` setzen.

```typescript
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase()

// Nach dem upsert:
if (SUPERADMIN_EMAIL && params.email?.toLowerCase() === SUPERADMIN_EMAIL) {
  await db.update(users)
    .set({ role: "superadmin", updatedAt: new Date() })
    .where(and(eq(users.logtoId, params.logtoId), ne(users.role, "superadmin")))
}
```

### Neue Query-Funktionen

```typescript
// Role-Cache (60s TTL, gleicher Pattern wie prefsCache)
export async function getUserRole(logtoId: string): Promise<UserRole>
export function clearRoleCache(userId?: string): void

// Für Admin-UI
export async function listUsersWithRoles(): Promise<Array<{
  logtoId: string; email: string | null; name: string | null;
  role: string; creditsBalance: number; createdAt: Date;
}>>

// Role-Updates
export async function updateUserRole(logtoId: string, role: UserRole): Promise<UserRole>
```

---

## 3. Admin-Guard umschreiben

**Datei:** `src/lib/admin-guard.ts`

Vorher: `getUserFull()` (HTTP-Call zu Logto) + Email-Allowlist-Check
Nachher: `getUser()` (nur Token-Claims, kein HTTP) + DB-Role-Check

### Neue Exports

```typescript
export type { UserRole } from "@/lib/db/schema/users"

// Ersetzt bisheriges requireAdmin — jetzt mit role im Return
export async function requireAdmin(): Promise<{ userId: string; email: string; role: UserRole }>

// Neu: Nur superadmin, kein ADMIN_EMAILS Fallback
export async function requireSuperAdmin(): Promise<{ userId: string; email: string }>

// Ersetzt isAdminEmail()
export function isAdminRole(role?: string | null): boolean
```

### Abwärtskompatibilität

Falls `ADMIN_EMAILS` noch gesetzt ist, wird es als Fallback geprüft (mit Console-Warning). User, die über `ADMIN_EMAILS` Zugang bekommen, erhalten `role: "admin"` im Return — aber nur als Runtime-Fallback, nicht als DB-Eintrag. Wird in einem späteren Release entfernt.

`isAdminEmail()` bleibt als deprecated Export erhalten, bis alle Stellen migriert sind.

---

## 4. UI-Anpassungen (bestehende Dateien)

| Datei | Änderung |
|-------|----------|
| `src/components/layout/chat-shell.tsx` | `isAdminEmail(email)` → `getUserRole(id)` + `isAdminRole(role)` |
| `src/app/admin/layout.tsx` | `getUserFull()` + `isAdminEmail()` → `getUser()` + `getUserRole()` + `isAdminRole()`. Superadmin-Flag an AdminShell weitergeben |
| `src/components/admin/admin-shell.tsx` | "Users" Nav-Item hinzufügen (nur für Superadmin sichtbar, via Prop `isSuperAdmin`) |
| `src/config/features.ts` | `admin.enabled` prüft `ADMIN_EMAILS \|\| SUPERADMIN_EMAIL` |
| `.env.example` | `SUPERADMIN_EMAIL` hinzufügen, `ADMIN_EMAILS` als deprecated markieren |

### Keine Änderungen nötig an:

- Den 15+ bestehenden Admin-API-Routes (nutzen alle `requireAdmin()` — Single Point of Change)
- `nav-user.tsx`, `chat-header.tsx` (erhalten `isAdmin` bereits als Prop)

---

## 5. Neue API-Routes: User-Management

### `GET /api/admin/users` (Superadmin only)

- Alle User mit Role, Email, Name, Credits, CreatedAt
- Rate-Limited (60 req/min)
- Response: `{ users: Array<{ logtoId, email, name, role, creditsBalance, createdAt }> }`

### `PATCH /api/admin/users/[logtoId]/role` (Superadmin only)

- Body: `{ role: "user" | "admin" }` (Zod-validiert)
- Kann NICHT `superadmin` setzen (nur ENV-Bootstrap)
- Kann NICHT eigene Role ändern (Self-Demotion-Schutz)
- Ruft `clearRoleCache()` nach Mutation auf
- Response: `{ success: true, role: string }`

---

## 6. Neue Admin-UI: User-Verwaltung

### Neue Dateien

- `src/app/admin/users/page.tsx` — Server Component (lädt User-Liste)
- `src/app/admin/users/loading.tsx` — Loading State
- `src/app/admin/users/error.tsx` — Error Boundary
- `src/components/admin/users-admin.tsx` — Client Component

### UI-Design (konsistent mit `credits-admin.tsx`)

- Tabelle: Name, Email, Role (Badge), Registriert, Aktionen
- Role-Badges: `user` = default/muted, `admin` = blau, `superadmin` = amber
- Aktionen: Dropdown mit "Zum Admin machen" / "Admin entziehen"
- Eigene Zeile hervorgehoben, nicht editierbar
- Superadmin-Badge nicht editierbar (ENV-kontrolliert)

---

## 7. Migrations-Pfad

### Phase 1 (dieses Feature)

1. `role`-Spalte hinzufügen (Default `"user"`)
2. `SUPERADMIN_EMAIL` ENV-Support + `ADMIN_EMAILS` Fallback
3. Bestehende Admins funktionieren weiter über Fallback
4. Deploy

### Phase 2 (nach Deployment)

1. Superadmin loggt sich ein → Auto-Promotion
2. Superadmin promoted bestehende Admins über UI
3. `ADMIN_EMAILS` aus ENV entfernen, `SUPERADMIN_EMAIL` setzen

### Phase 3 (späteres Cleanup)

1. `ADMIN_EMAILS` Fallback-Code entfernen
2. `isAdminEmail()` Export entfernen

---

## Datei-Übersicht

| Datei | Art | Beschreibung |
|-------|-----|-------------|
| `src/lib/db/schema/users.ts` | Ändern | `role`-Spalte + `UserRole` Type |
| `src/lib/db/queries/users.ts` | Ändern | Auto-Promotion, `getUserRole()`, `listUsersWithRoles()`, `updateUserRole()` |
| `src/lib/admin-guard.ts` | Umschreiben | DB-basiert, `requireSuperAdmin()`, Fallback |
| `src/config/features.ts` | Ändern | Feature-Flag um `SUPERADMIN_EMAIL` erweitern |
| `src/components/layout/chat-shell.tsx` | Ändern | Role-Check statt Email-Check |
| `src/app/admin/layout.tsx` | Ändern | Role-Check, Superadmin-Flag |
| `src/components/admin/admin-shell.tsx` | Ändern | "Users" Nav-Item (Superadmin only) |
| `src/app/api/admin/users/route.ts` | **Neu** | GET Users (Superadmin) |
| `src/app/api/admin/users/[logtoId]/role/route.ts` | **Neu** | PATCH Role (Superadmin) |
| `src/app/admin/users/page.tsx` | **Neu** | Admin Users Page |
| `src/app/admin/users/loading.tsx` | **Neu** | Loading State |
| `src/app/admin/users/error.tsx` | **Neu** | Error Boundary |
| `src/components/admin/users-admin.tsx` | **Neu** | Users-Tabelle + Role-Management |
| `.env.example` | Ändern | `SUPERADMIN_EMAIL` hinzufügen |

---

## Verifikation

1. **Schema:** `pnpm db:push` — prüfen dass `role`-Spalte angelegt wird
2. **Auto-Promotion:** Mit `SUPERADMIN_EMAIL` einloggen → DB prüfen dass `role = superadmin`
3. **Admin-Guard:** Bestehende Admin-Pages/APIs funktionieren weiterhin
4. **Fallback:** Mit `ADMIN_EMAILS` (ohne `SUPERADMIN_EMAIL`) testen — Warnung in Console, Zugang funktioniert
5. **User-Management UI:** Als Superadmin `/admin/users` aufrufen, User zum Admin promoten
6. **Schutz:** Als normaler Admin `/admin/users` nicht erreichbar (403)
7. **Self-Demotion:** Superadmin kann eigene Role nicht ändern

---

## Bewusst nicht in diesem Feature

- Keine granularen Permissions (z.B. "darf nur Skills verwalten")
- Kein Audit-Log für Role-Changes (kann später über `credit_transactions`-Pattern ergänzt werden)
- Kein Invitation-System (Admin-Promotion nur für bestehende User)
- Keine API-Key-basierte Admin-Authentifizierung
