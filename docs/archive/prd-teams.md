# PRD: Teams & Organisationen

**Status:** Entwurf
**Datum:** 2026-03-25
**Feature-Flag:** `NEXT_PUBLIC_TEAMS_ENABLED`

---

## 1. Problemstellung

loschke-chat ist aktuell rein einzelnutzer-orientiert. Alle Ressourcen (Chats, Projekte, Credits) gehoeren einem User. Experts existieren entweder global (admin-verwaltet) oder persoenlich. Skills sind ausschliesslich global.

Fuer den Einsatz in Beratungs-, Workshop- oder Unternehmensszenarien fehlt eine Ebene dazwischen: **Teams**. Nutzer wollen gemeinsam an Projekten arbeiten, teamspezifische Experten und Skills nutzen und ein geteiltes Credit-Budget verwalten.

Das aktuelle Zwei-Ebenen-Modell (personal / global) reicht nicht aus. Ein Team-Layer ermoeglicht Zusammenarbeit, ohne die globale Ebene zu verschmutzen oder die persoenliche Ebene aufzubrechen.

---

## 2. Ziele

1. **Team-Ressourcen:** Projekte, Experts und Skills auf Team-Ebene teilen.
2. **Team-Credits:** Geteiltes Credit-Budget pro Team mit individueller Verbrauchszuordnung.
3. **Team-Rollen:** Owner, Admin, Member mit klaren Berechtigungen.
4. **Chat-Sharing im Team:** Bestehende Teilen-Funktion erweitern — neben "Veroeffentlichen" auch "Mit Team teilen".
5. **Opt-in:** Bestehende Einzelnutzer-Funktionalitaet bleibt unberuehrt. Teams sind additiv.
6. **Drei-Ebenen-Sichtbarkeit:** personal > team > global fuer Experts; team > global fuer Skills.
7. **Konfigurierbare Limits:** Alle Obergrenzen ueber Config/ENV steuerbar.

## 3. Nicht-Ziele

- **Multi-Tenancy/Isolation:** Kein striktes Mandanten-System. Teams sind ein Collaboration-Layer, keine Organisations-Firewall.
- **Echtzeit-Kollaboration in Chats:** Kein gleichzeitiges Schreiben. Chats bleiben immer einer Person zugeordnet.
- **Team-Chats:** Es gibt kein Konzept von "Team-Chats". Chats sind privat. Team-Sichtbarkeit entsteht durch explizites Teilen.
- **Logto Organizations:** Keine Nutzung von Logtos eingebautem Organizations-Feature. Teams werden in der eigenen DB verwaltet (einfacher, flexibler, keine Plan-Abhaengigkeit).
- **Team-Memory:** Memory bleibt persoenlich. Kein geteilter Memory-Pool.
- **Verschachtelte Teams / Sub-Teams.**
- **Billing / Stripe-Integration:** Gehoert zu einer spaeteren Stufe.
- **E-Mail-Versand fuer Einladungen:** Kein Transactional-Mail-Service. Invite-Links werden manuell geteilt.

---

## 4. User Stories

### Team-Erstellung & Verwaltung

| ID | Story |
|----|-------|
| US-1 | Als Nutzer kann ich ein Team erstellen und werde automatisch Owner. |
| US-2 | Als Team-Owner/Admin kann ich einen Einladungs-Link generieren. |
| US-3 | Als Empfaenger kann ich ueber einen Link einem Team beitreten. |
| US-4 | Als Team-Admin kann ich Teamnamen und Beschreibung aendern. |
| US-5 | Als Team-Owner kann ich Mitglieder-Rollen aendern oder Mitglieder entfernen. |
| US-6 | Als Mitglied kann ich ein Team verlassen. |

### Team-Kontext

| ID | Story |
|----|-------|
| US-7 | Als Nutzer kann ich in der Sidebar zwischen meinem persoenlichen Bereich und einem Team umschalten. |
| US-8 | Im Team-Kontext sehe ich Team-Projekte, Team-Experts und Team-Skills zusaetzlich zu meinen persoenlichen und den globalen Ressourcen. |

### Team-Projekte

| ID | Story |
|----|-------|
| US-9 | Als Team-Admin kann ich Projekte fuer das Team erstellen. |
| US-10 | Als Team-Mitglied kann ich Team-Projekte sehen und Chats darin starten. |
| US-11 | Team-Projekte haben eigene Anweisungen und Dokumente, genau wie persoenliche Projekte. |

### Team-Experts & Skills

| ID | Story |
|----|-------|
| US-12 | Als Team-Admin kann ich Experts fuer das Team erstellen (sichtbar fuer alle Mitglieder). |
| US-13 | Als Team-Admin kann ich Skills/Quicktasks fuer das Team erstellen. |
| US-14 | Die Aufloesung ist: persoenlicher Expert > Team-Expert > globaler Expert (bei gleichem Slug). |

### Chat-Sharing im Team

| ID | Story |
|----|-------|
| US-15 | Als Nutzer kann ich einen Chat mit meinem Team teilen (read-only). |
| US-16 | Im Team-Kontext sehe ich eine Liste der mit dem Team geteilten Chats. |
| US-17 | Team-geteilte Chats sind nur fuer Team-Mitglieder sichtbar, nicht oeffentlich. |

### Team-Credits

| ID | Story |
|----|-------|
| US-18 | Als Team-Owner kann ich dem Team Credits zuweisen (aus eigenem Budget oder per Admin-Grant). |
| US-19 | Wenn ich im Team-Kontext chatte, werden Credits vom Team-Pool abgezogen. |
| US-20 | Als Team-Admin sehe ich, welches Mitglied wie viele Team-Credits verbraucht hat. |
| US-21 | Als Plattform-Admin kann ich Team-Credit-Pools direkt aufladen. |

---

## 5. Datenmodell

### 5.1 Neue Tabellen

#### `teams`

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| `id` | `text PK` | nanoid(12) |
| `name` | `text NOT NULL` | Team-Anzeigename |
| `slug` | `text UNIQUE NOT NULL` | URL-safe Bezeichner |
| `description` | `text` | Optionale Beschreibung |
| `credits_balance` | `integer DEFAULT 0` | Team-Credit-Pool |
| `created_at` | `timestamp with tz` | |
| `updated_at` | `timestamp with tz` | |

#### `team_members`

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| `id` | `text PK` | nanoid(12) |
| `team_id` | `text FK → teams.id CASCADE` | |
| `user_id` | `text NOT NULL` | Logto sub (wie ueberall) |
| `role` | `text NOT NULL` | `owner` · `admin` · `member` |
| `created_at` | `timestamp with tz` | |

- Unique Constraint: `(team_id, user_id)`
- Index: `team_members_user_id_idx` (fuer "meine Teams" Lookup)

#### `team_invites`

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| `id` | `text PK` | nanoid(12) |
| `team_id` | `text FK → teams.id CASCADE` | |
| `email` | `text` | Optional: erwartete E-Mail (Validierung bei Annahme) |
| `role` | `text DEFAULT 'member'` | Rolle nach Annahme |
| `token` | `text UNIQUE NOT NULL` | nanoid(32), kryptografisch sicher |
| `invited_by` | `text NOT NULL` | userId des Einladenden |
| `expires_at` | `timestamp with tz NOT NULL` | Default: 7 Tage |
| `accepted_at` | `timestamp with tz` | NULL = noch offen |
| `created_at` | `timestamp with tz` | |

#### `team_credit_transactions`

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| `id` | `text PK` | nanoid(12) |
| `team_id` | `text FK → teams.id CASCADE` | |
| `user_id` | `text` | Wer hat verbraucht (NULL bei Grants) |
| `type` | `text NOT NULL` | `usage` · `grant` · `admin_adjust` · `transfer` |
| `amount` | `integer NOT NULL` | Signed (negativ bei Verbrauch) |
| `balance_after` | `integer NOT NULL` | Snapshot nach Transaktion |
| `description` | `text` | |
| `reference_id` | `text` | Verweis auf usage_logs.id |
| `model_id` | `text` | |
| `chat_id` | `text` | |
| `created_at` | `timestamp with tz` | |

- Index: `(team_id, created_at)`

### 5.2 Aenderungen an bestehenden Tabellen

#### `experts` — neues Feld

```
+ team_id  text NULL  FK → teams.id ON DELETE SET NULL
```

Bedeutung:

| `userId` | `teamId` | Scope |
|----------|----------|-------|
| NULL | NULL | Global (Admin-verwaltet) |
| set | NULL | Persoenlich (User-eigener Expert) |
| NULL | set | Team-Expert |

Index: `experts_team_id_idx`

**Slug-Strategie:** Prefix-Konvention `t-{teamSlug}-{expertSlug}` fuer Team-Experts. Vermeidet Schema-Komplikationen mit der bestehenden Unique-Constraint auf `slug`.

#### `skills` — neues Feld

```
+ team_id  text NULL  FK → teams.id ON DELETE SET NULL
```

| `teamId` | Scope |
|----------|-------|
| NULL | Global (wie bisher) |
| set | Team-Skill |

Index: `skills_team_id_idx`. Gleiche Slug-Prefix-Strategie wie bei Experts.

#### `projects` — neues Feld

```
+ team_id  text NULL  FK → teams.id ON DELETE SET NULL
```

Wenn `team_id` gesetzt: Projekt gehoert dem Team. `user_id` bleibt als Ersteller gesetzt, ist aber nicht mehr fuer Scoping relevant. Index: `projects_team_id_idx`.

#### `shared_chats` — neues Feld

```
+ team_id  text NULL  FK → teams.id ON DELETE CASCADE
```

Das ist der Kernmechanismus fuer Team-Chat-Sharing:

| `token` | `team_id` | Bedeutung |
|---------|----------|-----------|
| set | NULL | Oeffentlich geteilt (wie bisher) |
| NULL | set | Mit Team geteilt (nur Mitglieder) |
| set | set | Beides: oeffentlich UND mit Team geteilt |

Ein Chat kann gleichzeitig oeffentlich und mit einem Team geteilt sein. Es sind zwei separate Eintraege in `shared_chats`.

Index: `shared_chats_team_id_idx`.

#### `credit_transactions` — neues Feld

```
+ team_id  text NULL  FK → teams.id ON DELETE SET NULL
```

Wenn gesetzt: Transaktion ging auf das Team-Budget.

#### `usage_logs` — neues Feld

```
+ team_id  text NULL
```

Fuer Team-Nutzungsberichte. Kein FK (Logs sind Audit-Daten).

### 5.3 Kein `team_id` auf der `chats`-Tabelle

Chats bleiben immer user-scoped. Es gibt kein Konzept von "Team-Chats". Die Team-Sichtbarkeit entsteht ausschliesslich durch die erweiterte `shared_chats`-Tabelle. Ein User entscheidet aktiv, welche Chats er mit dem Team teilt.

---

## 6. Ressourcen-Aufloesung

### 6.1 Drei-Ebenen-Modell

```
              Sichtbarkeit
              ┌──────────────────────┐
              │   Global (Admin)     │  ← Alle Nutzer
              ├──────────────────────┤
              │   Team               │  ← Nur Team-Mitglieder
              ├──────────────────────┤
              │   Personal           │  ← Nur der Eigentuemer
              └──────────────────────┘
```

### 6.2 Expert-Aufloesung

Prioritaet (hoeher oben):
1. **Persoenlicher Expert** (`userId = currentUser, teamId = NULL`)
2. **Team-Expert** (`teamId = activeTeam, userId = NULL`)
3. **Globaler Expert** (`userId = NULL, teamId = NULL`)

`getExperts(userId, teamId?)` liefert die Vereinigung aller drei Ebenen. Bei Slug-Konflikten gewinnt die hoehere Prioritaet.

Ohne `teamId`: Verhalten wie bisher (personal + global).

### 6.3 Skill/Quicktask-Aufloesung

1. **Team-Skills** (`teamId = activeTeam`)
2. **Globale Skills** (`teamId = NULL`)

Kein persoenliches Skill-Level (gibt es heute nicht, wird auch nicht eingefuehrt).

`discoverSkills(teamId?)` und `discoverQuicktasks(teamId?)`. Cache-Key muss `teamId` einschliessen.

### 6.4 Projekt-Scoping

| Kontext | Sichtbar | Erstellbar |
|---------|----------|------------|
| Persoenlicher Bereich | Eigene Projekte | Ja |
| Team-Kontext | Team-Projekte + eigene Projekte | Team-Projekte: nur Admin/Owner |

`getUserProjects(userId)` bleibt. Neu: `getTeamProjects(teamId)`. Die Sidebar zeigt kontextabhaengig die richtige Liste.

### 6.5 Chat-Sharing im Team

Chats sind immer privat. Die Sichtbarkeit fuer Team-Mitglieder entsteht durch explizites Teilen:

```
User klickt "Mit Team teilen"
  → Eintrag in shared_chats mit team_id (ohne Token)
  → Chat erscheint in der "Geteilte Chats"-Liste des Teams
  → Alle Team-Mitglieder koennen den Chat read-only sehen
  → User kann das Teilen jederzeit widerrufen
```

Die bestehende Share-UI im Chat-Header bekommt eine zweite Option neben "Veroeffentlichen":

```
Teilen
├── Veroeffentlichen (Link fuer alle)
└── Mit Team teilen (nur Mitglieder)
    ├── Team A  ☑
    └── Team B  ☐
```

### 6.6 Resolve-Context-Erweiterung

`resolveContext()` in `/api/chat/route.ts` erhaelt `teamId` als optionalen Parameter:

```
Phase A (parallel):
  + getTeamMembership(userId, teamId) — Pruefen ob User im Team ist
  + getExperts(userId, teamId)        — Drei-Ebenen-Lookup
  + discoverSkills(teamId)            — Team + Global
  + getTeamProjects(teamId)           — Team-Projekte laden

Phase B (sequentiell):
  Expert-Resolution: personal > team > global (wie bisher, plus Team-Layer)
  Model-Resolution:  Quicktask > Expert > User-Default > System-Default
  Credit-Context:    teamId fuer Team-Credit-Deduktion mitfuehren
```

---

## 7. Rollen & Berechtigungen

### 7.1 Team-Rollen

| Aktion | Owner | Admin | Member |
|--------|:-----:|:-----:|:------:|
| Team loeschen | Ja | — | — |
| Mitglieder einladen | Ja | Ja | — |
| Mitglieder entfernen | Ja | Ja* | — |
| Rollen aendern | Ja | — | — |
| Team-Settings aendern | Ja | Ja | — |
| Team-Projekte erstellen/bearbeiten/loeschen | Ja | Ja | — |
| Team-Experts erstellen/bearbeiten/loeschen | Ja | Ja | — |
| Team-Skills erstellen/bearbeiten/loeschen | Ja | Ja | — |
| Team-Credits zuweisen/transferieren | Ja | — | — |
| Team-Credits-Bericht einsehen | Ja | Ja | — |
| Team-Projekte nutzen (Chats starten) | Ja | Ja | Ja |
| Team-Experts/Skills nutzen | Ja | Ja | Ja |
| Eigene Chats mit Team teilen | Ja | Ja | Ja |
| Team-geteilte Chats lesen | Ja | Ja | Ja |
| Team verlassen | —** | Ja | Ja |

*Admin kann andere Admins und Members entfernen, nicht den Owner.
**Owner muss Ownership uebertragen oder das Team loeschen.

### 7.2 Interaktion mit Plattform-Rollen

- **Plattform-Admin/Superadmin** kann Team-Credits per Admin-API aufladen.
- **Plattform-Admin** sieht alle Teams in der Admin-UI (Uebersicht, kein automatischer Beitritt).
- Team-Rollen sind orthogonal zu Plattform-Rollen. Ein `member` im Team kann `admin` auf der Plattform sein und umgekehrt.

---

## 8. Credits & Nutzung

### 8.1 Dual-Pool-Modell

Jeder Nutzer hat weiterhin ein persoenliches Credit-Budget. Zusaetzlich hat jedes Team ein eigenes Budget.

```
Chat-Request im Team-Kontext:
  WENN team_id aktiv UND Team-Budget > 0:
    → Credits vom Team-Pool abziehen
    → Transaktion in team_credit_transactions loggen
  SONST:
    → Credits vom persoenlichen Pool abziehen (wie bisher)
```

### 8.2 Credit-Operationen

| Operation | Wer | Beschreibung |
|-----------|-----|-------------|
| Team-Pool aufladen (Transfer) | Team-Owner | Transferiert Credits vom eigenen Budget zum Team |
| Team-Pool aufladen (Admin) | Plattform-Admin | Direkter Grant auf Team-Budget |
| Team-Credits verbrauchen | Jedes Mitglied | Automatisch im Team-Kontext |
| Verbrauchs-Report | Owner / Admin | Aufschluesselung nach Mitglied, Modell, Zeitraum |

### 8.3 Deduction-Flow

In `persist.ts` wird der bestehende Credit-Flow erweitert:

```typescript
// Bestehend:
if (features.credits.enabled) {
  deductCredits(userId, creditCost, meta)
}

// Erweitert:
if (features.credits.enabled) {
  if (context.teamId && teamHasCredits(context.teamId, creditCost)) {
    deductTeamCredits(context.teamId, userId, creditCost, meta)
  } else {
    deductCredits(userId, creditCost, meta)
  }
}
```

`deductTeamCredits()` ist eine neue atomare Transaktion analog zu `deductCredits()`, die auf `teams.credits_balance` und `team_credit_transactions` operiert.

Fallback auf persoenliches Budget wenn Team-Pool leer.

---

## 9. API-Design

### 9.1 Neue Endpoints

**Team CRUD:**

| Methode | Endpoint | Beschreibung | Berechtigung |
|---------|----------|-------------|--------------|
| GET | `/api/teams` | Meine Teams (Mitgliedschaften) | Auth |
| POST | `/api/teams` | Team erstellen | Auth |
| GET | `/api/teams/[teamId]` | Team-Details | Team-Member |
| PATCH | `/api/teams/[teamId]` | Team aktualisieren | Team-Admin |
| DELETE | `/api/teams/[teamId]` | Team loeschen | Team-Owner |

**Mitglieder:**

| Methode | Endpoint | Beschreibung | Berechtigung |
|---------|----------|-------------|--------------|
| GET | `/api/teams/[teamId]/members` | Mitglieder-Liste | Team-Member |
| POST | `/api/teams/[teamId]/invites` | Einladungs-Link generieren | Team-Admin |
| DELETE | `/api/teams/[teamId]/members/[userId]` | Mitglied entfernen | Team-Admin |
| PATCH | `/api/teams/[teamId]/members/[userId]` | Rolle aendern | Team-Owner |
| POST | `/api/teams/[teamId]/leave` | Team verlassen | Team-Member |
| POST | `/api/invites/[token]/accept` | Einladung annehmen | Auth |

**Team-Ressourcen:**

| Methode | Endpoint | Beschreibung | Berechtigung |
|---------|----------|-------------|--------------|
| GET | `/api/teams/[teamId]/projects` | Team-Projekte | Team-Member |
| POST | `/api/teams/[teamId]/projects` | Team-Projekt erstellen | Team-Admin |
| GET | `/api/teams/[teamId]/experts` | Team-Experts | Team-Member |
| POST | `/api/teams/[teamId]/experts` | Team-Expert erstellen | Team-Admin |
| GET | `/api/teams/[teamId]/skills` | Team-Skills | Team-Member |
| POST | `/api/teams/[teamId]/skills` | Team-Skill erstellen | Team-Admin |
| GET | `/api/teams/[teamId]/shared-chats` | Im Team geteilte Chats | Team-Member |

**Team-Credits:**

| Methode | Endpoint | Beschreibung | Berechtigung |
|---------|----------|-------------|--------------|
| GET | `/api/teams/[teamId]/credits` | Balance + Transaktionen | Team-Admin |
| POST | `/api/teams/[teamId]/credits/transfer` | Credits vom eigenen Budget uebertragen | Team-Owner |

**Admin:**

| Methode | Endpoint | Beschreibung | Berechtigung |
|---------|----------|-------------|--------------|
| GET | `/api/admin/teams` | Alle Teams | Plattform-Admin |
| POST | `/api/admin/teams/[teamId]/credits` | Credits direkt aufladen | Plattform-Admin |

### 9.2 Aenderungen an bestehenden Endpoints

**`POST /api/chat`** — neues optionales Feld:

```json
{
  "teamId": "optional-team-id"
}
```

Wenn gesetzt: Pruefen ob User Mitglied ist. Expert/Skill-Resolution mit Team-Layer. Credit-Deduktion vom Team-Pool.

**`GET /api/experts`** — neuer Query-Parameter:

```
GET /api/experts?teamId=xxx  → Personal + Team + Global
GET /api/experts              → Personal + Global (wie bisher)
```

**`GET /api/skills/quicktasks`** — neuer Query-Parameter:

```
GET /api/skills/quicktasks?teamId=xxx  → Team + Global
GET /api/skills/quicktasks              → Global (wie bisher)
```

**`POST /api/chats/[chatId]/share`** — erweitert:

```json
{
  "type": "public"
}
// oder
{
  "type": "team",
  "teamId": "team-id"
}
```

**`DELETE /api/chats/[chatId]/share`** — erweitert:

```json
{
  "type": "public"
}
// oder
{
  "type": "team",
  "teamId": "team-id"
}
```

### 9.3 Team-Kontext-Propagierung

Der aktive Team-Kontext wird client-seitig gehalten (React State + localStorage). Kein Server-Side-Session-State.

Jeder Request, der Team-Kontext braucht, sendet `teamId` explizit mit (Body oder Query-Parameter). Der Server validiert die Mitgliedschaft bei jedem Aufruf.

```
Sidebar → Team-Switcher → setActiveTeamId(teamId)
  → ChatView sendet teamId in /api/chat POST
  → Sidebar-Queries senden teamId als Query-Parameter
  → Expert/Skill-Fetches senden teamId als Query-Parameter
```

---

## 10. UI/UX-Konzepte

### 10.1 Team-Switcher (Sidebar)

Neue Komponente im Sidebar-Header, unter dem Brand-Logo:

```
┌─────────────────────────┐
│ [Logo]                   │
│ ┌─────────────────────┐ │
│ │ Persoenlich       ▼ │ │  ← Dropdown
│ └─────────────────────┘ │
│ ─────────────────────── │
│ Chats / Projekte / ...  │
```

Dropdown-Optionen:
- Persoenlich (default)
- Team A
- Team B
- Team erstellen...
- Teams verwalten...

### 10.2 Kontext-abhaengige Sidebar

| Bereich | Persoenlicher Kontext | Team-Kontext |
|---------|----------------------|-------------|
| Chats | Eigene Chats | Eigene Chats + geteilte Team-Chats |
| Projekte | Eigene Projekte | Team-Projekte + eigene Projekte |
| Experts (Empty State) | Persoenliche + globale | Persoenliche + Team + globale |
| Quicktasks (Empty State) | Globale | Team + globale |
| Credits (Anzeige) | Persoenliches Budget | Team-Budget (+ persoenliches) |

### 10.3 Team-Verwaltung

Erreichbar ueber Team-Switcher-Dropdown "Teams verwalten" oder eigene Route (`/teams/[teamId]`):

**Tab 1: Mitglieder**
- Liste mit Name, E-Mail, Rolle, Beitrittsdatum
- Einladungs-Link generieren (Button → kopiert Link)
- Rollen-Dropdown (Owner only)
- Entfernen-Button (Admin+)

**Tab 2: Ressourcen**
- Team-Experts (CRUD, analog Admin-UI)
- Team-Skills/Quicktasks (CRUD)
- Team-Projekte (CRUD)

**Tab 3: Credits**
- Aktuelle Balance
- Transfer-Button (Owner: eigene Credits → Team)
- Verbrauchs-Tabelle nach Mitglied mit Zeitraum-Filter

### 10.4 Chat-Sharing erweitert

Bestehender Share-Dialog im Chat-Header bekommt eine zweite Sektion:

```
┌─────────────────────────────┐
│ Chat teilen                 │
│                             │
│ Oeffentlich                 │
│ ┌─────────────────────────┐ │
│ │ [Link] [Kopieren]       │ │
│ └─────────────────────────┘ │
│                             │
│ Mit Team teilen             │
│ ┌─────────────────────────┐ │
│ │ ☑ Design-Team           │ │
│ │ ☐ Marketing-Team        │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

### 10.5 Einladungs-Flow

1. Team-Admin klickt "Einladen" in der Mitglieder-Verwaltung
2. System generiert Invite-Link (`/teams/invite/[token]`)
3. Admin kopiert Link und teilt ihn (Slack, E-Mail, etc.)
4. Empfaenger klickt Link:
   - Eingeloggt → direkt beitreten, Weiterleitung zum Team
   - Nicht eingeloggt → Login, dann automatisch beitreten

### 10.6 Team-Kontext-Indikatoren

- Team-Name im Sidebar-Header (Switcher zeigt aktives Team)
- Credit-Anzeige wechselt zwischen persoenlichem und Team-Budget
- Team-Projekte zeigen ein Team-Icon in der Sidebar
- Geteilte Chats zeigen ein Team-Badge

---

## 11. Sicherheit

### 11.1 Authorization Guards

Neue Guard-Funktionen analog zu `requireAdmin()`:

```typescript
requireTeamMember(teamId, userId)  → TeamMember | 403
requireTeamAdmin(teamId, userId)   → TeamMember | 403
requireTeamOwner(teamId, userId)   → TeamMember | 403
```

Jeder Team-API-Call prueft Mitgliedschaft serverseitig. Client kann keine fremden Teams ansprechen.

### 11.2 Resource-Isolation

- Team-Ressourcen: Doppelte Absicherung durch `WHERE team_id = ?` UND Mitgliedschafts-Check
- Team-Projekte: Nur Mitglieder koennen sehen, nur Admin+ kann editieren
- Team-geteilte Chats: Nur Mitglieder koennen lesen, nur Chat-Owner kann widerrufen

### 11.3 Invite-Tokens

- Kryptografisch sichere Tokens (`nanoid(32)`)
- 7 Tage Ablauf (konfigurierbar)
- Single-Use: nach Annahme `accepted_at` gesetzt, nicht wiederverwendbar
- Optional: E-Mail-Validierung (wenn `email` im Invite gesetzt, muss die E-Mail des annehmenden Users matchen)
- Rate-Limit auf Invite-Erstellung (konfigurierbar, z.B. 10/Stunde pro Team)

### 11.4 Credit-Isolation

- Team-Credits: Eigene Transaktionstabelle, atomare Operationen
- Kein Ruecktransfer: Mitglieder koennen keine Credits vom Team-Pool auf ihr persoenliches Konto uebertragen
- Nur Owner kann persoenliche Credits zum Team transferieren

---

## 12. Konfiguration & Limits

Alle Limits ueber `src/config/teams.ts` und ENV-Variablen steuerbar:

| Variable | Default | Beschreibung |
|----------|---------|-------------|
| `NEXT_PUBLIC_TEAMS_ENABLED` | `false` | Feature aktivieren |
| `TEAM_MAX_PER_USER` | `5` | Max. Teams pro User |
| `TEAM_MAX_MEMBERS` | `25` | Max. Mitglieder pro Team |
| `TEAM_INVITE_EXPIRY_DAYS` | `7` | Invite-Gueltigkeit in Tagen |
| `TEAM_INVITE_RATE_LIMIT` | `10` | Max. Invites pro Stunde pro Team |
| `TEAM_MAX_EXPERTS` | `20` | Max. Team-Experts |
| `TEAM_MAX_SKILLS` | `20` | Max. Team-Skills |
| `TEAM_MAX_PROJECTS` | `10` | Max. Team-Projekte |

---

## 13. Migrationsstrategie

### 13.1 Feature-Flag

```typescript
// src/config/features.ts
teams: {
  enabled: process.env.NEXT_PUBLIC_TEAMS_ENABLED === "true",
}
```

Ohne Flag: kein Team-Switcher, keine Team-Endpoints, alles wie bisher.

### 13.2 Datenbank-Migration

**Phase 1: Additive Tabellen** (kein Breaking Change)

```sql
CREATE TABLE teams (...)
CREATE TABLE team_members (...)
CREATE TABLE team_invites (...)
CREATE TABLE team_credit_transactions (...)
```

**Phase 2: Optionale Spalten** (kein Breaking Change)

```sql
ALTER TABLE experts ADD COLUMN team_id text REFERENCES teams(id) ON DELETE SET NULL;
ALTER TABLE skills ADD COLUMN team_id text REFERENCES teams(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN team_id text REFERENCES teams(id) ON DELETE SET NULL;
ALTER TABLE shared_chats ADD COLUMN team_id text REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE credit_transactions ADD COLUMN team_id text REFERENCES teams(id) ON DELETE SET NULL;
ALTER TABLE usage_logs ADD COLUMN team_id text;
-- Indices auf alle neuen team_id Spalten
```

Alle neuen Spalten sind NULL-able. Bestehende Daten bleiben unberuehrt. Bestehende Queries aendern sich nicht — sie filtern weiterhin auf `userId`, und `teamId = NULL` bei allen bestehenden Datensaetzen.

### 13.3 Code-Migration (Phasen)

**Phase A: Backend-Grundlage**
- Schema-Dateien fuer neue Tabellen
- team_id Spalten an bestehenden Schemas
- Query-Funktionen: Team-CRUD, Member-Management, Invite-Flow
- Guards: `requireTeamMember`, `requireTeamAdmin`, `requireTeamOwner`
- API-Routes: `/api/teams/**`

**Phase B: Integration**
- `getExperts()`, `discoverSkills()`, `getUserProjects()` um `teamId` erweitern
- `resolve-context.ts`: `teamId` in ChatContext, Drei-Ebenen-Resolution
- `persist.ts`: Team-Credit-Deduktion
- Share-API erweitern (Team-Sharing)

**Phase C: Frontend**
- Team-Switcher Komponente
- Team-Verwaltungsseiten
- Sidebar-Anpassung (kontextabhaengige Listen)
- Chat-Share-Dialog erweitern (Team-Checkbox)
- Credit-Anzeige team-aware
- Invite-Accept-Seite (`/teams/invite/[token]`)

**Phase D: Admin & Polish**
- Team-Uebersicht in Admin-UI
- Team-Credit-Grant in Admin-UI
- Tests, Edge Cases, Performance

---

## 14. Beruehrte Dateien (Kernbereich)

| Datei | Aenderung |
|-------|-----------|
| `src/lib/db/schema/` | 4 neue Schema-Dateien + 6 bestehende erweitern |
| `src/lib/db/queries/` | Team-Queries + bestehende um teamId erweitern |
| `src/app/api/teams/` | Neue Route-Gruppe (~8 Dateien) |
| `src/app/api/chat/resolve-context.ts` | teamId-Parameter, Drei-Ebenen-Resolution |
| `src/app/api/chat/persist.ts` | Team-Credit-Deduktion |
| `src/lib/db/queries/experts.ts` | `getExperts(userId, teamId?)` |
| `src/lib/ai/skills/discovery.ts` | `discoverSkills(teamId?)` |
| `src/config/features.ts` | `teams.enabled` Flag |
| `src/config/teams.ts` | Neue Config-Datei fuer Limits |
| `src/components/chat/chat-sidebar-content.tsx` | Team-Switcher, kontextabhaengige Listen |
| `src/components/chat/chat-empty-state.tsx` | Team-Experts/Skills anzeigen |
| `src/app/api/chats/[chatId]/share/route.ts` | Team-Sharing erweitern |

---

## 15. Risikobewertung

### 15.1 Uebersicht

| Dimension | Risiko | Begruendung |
|-----------|--------|-------------|
| Stabilitaet | Mittel-niedrig | Feature-Flag + additive Migration. Kritisch: Cache-Keys und Expert-Merge-Logik |
| Performance | Niedrig | Einfache Index-Lookups, Caching. Kritisch: Shared-Chats-Pagination bei grossen Teams |
| Security | Mittel | Neue Authorization-Schicht mit Client-seitigem `teamId`. Jeder Endpoint muss Mitgliedschaft validieren |

### 15.2 Stabilitaet

**Geringes Risiko:**
- Alle neuen Spalten sind NULL-able. Bestehende Queries aendern sich im Default-Fall nicht.
- Feature-Flag schottet komplett ab. Ohne Flag existiert das Feature nicht.
- Der Chat-Kern (`/api/chat/route.ts` Orchestrator) bleibt unveraendert; `resolve-context` bekommt nur einen optionalen Parameter.

**Kritische Stellen:**
- **Expert-Merge-Logik:** Die Drei-Ebenen-Deduplizierung (personal > team > global) ist die komplexeste Aenderung an bestehendem Code. Ein Bug hier bricht die Expert-Auswahl fuer alle User, nicht nur Team-Nutzer.
- **Cache-Poisoning:** `discoverSkills()` und `discoverQuicktasks()` muessen `teamId` im Cache-Key fuehren. Ohne das sehen Team-A-User die Skills von Team-B aus dem Cache.
- **shared_chats Semantik:** Die Tabelle hat heute eine klare 1:1-Beziehung (1 Chat = 1 public Token). Mit Team-Sharing kann ein Chat mehrere Eintraege haben. Alle bestehenden Queries (`getUserSharedChatIds`, `getShareByChatId`) muessen das korrekt handhaben.

### 15.3 Performance

**Geringes Risiko:**
- Team-Mitgliedschaft: Einfacher Index-Lookup auf `(team_id, user_id)` Unique Constraint. Sub-Millisekunde.
- Expert/Skill-Resolution: Statt 1 Query (personal + global) werden es 2 Queries (+ Team). Bei 60s Cache vernachlaessigbar.

**Kritische Stellen:**
- **Shared-Chats-Liste:** Bei 25 Mitgliedern die jeweils 50 Chats teilen: 1250 Eintraege. Ohne Pagination und Index auf `(team_id, created_at)` wird das langsam.
- **Credit-Deduktion unter Last:** Mehrere Team-Mitglieder chatten gleichzeitig → konkurrierende Locks auf `teams.credits_balance`. Mitigation: `SELECT ... FOR UPDATE` mit kurzer Lock-Duration (wie bei `deductCredits` bereits umgesetzt).

### 15.4 Security

Das ist der kritischste Bereich. Team-Features fuehren eine neue Klasse von Authorization-Bugs ein.

**Neue Angriffsflaechen:**
- **Horizontale Privilegien-Eskalation:** User ist Member, versucht Admin-Aktionen. Jeder Endpoint braucht den richtigen Guard. Ein vergessener Guard = offene Tuer.
- **Team-ID-Manipulation:** `teamId` ist ein Client-Parameter (anders als `userId`, das aus dem Auth-Token kommt). Wenn ein Endpoint die Mitgliedschaft nicht prueft, kann ein User Ressourcen fremder Teams sehen oder aendern.
- **Credit-Drain:** Ein kompromittiertes Mitglied kann das gesamte Team-Budget verbrauchen. Kein Per-Member-Limit im initialen Design.

**Gut abgesichert:**
- Bestehende Defense-in-Depth (userId-Scoping auf allen persoenlichen Mutations) bleibt unveraendert.
- Chats bleiben privat — kein `team_id` auf `chats` bedeutet keine versehentliche Offenlegung.
- Team-Sharing ist explizit (aktive Aktion), nicht implizit.

---

## 16. Technische Leitplanken

Massnahmen, die bei der Implementation die identifizierten Risiken adressieren.

### 16.1 Guard-Middleware statt manueller Checks

**Problem:** ~20 neue Endpoints brauchen jeweils den richtigen Team-Guard. Manuelles Aufrufen ist fehleranfaellig.

**Loesung:** Eine `withTeamAuth`-Wrapper-Funktion, die den Guard automatisch anwendet:

```typescript
// Statt in jeder Route manuell:
export async function GET(req, { params }) {
  const member = await requireTeamAdmin(params.teamId, userId) // leicht vergessen
  // ...
}

// Besser: deklarativ
export const GET = withTeamAuth("admin", async (req, { team, member }) => {
  // team und member sind garantiert validiert
})
```

Analog zu `requireAdmin()`, aber als Higher-Order-Function die nicht vergessen werden kann.

### 16.2 Cache-Key-Konvention

**Problem:** Cache-Poisoning wenn `teamId` im Key fehlt.

**Loesung:** Verbindliche Konvention fuer alle Cache-Keys mit Team-Scope:

```typescript
// Konvention: `{entity}:{teamId ?? "global"}`
const cacheKey = `skills:${teamId ?? "global"}`
const cacheKey = `experts:${userId}:${teamId ?? "none"}`
```

Review-Checkliste: Jede Funktion mit `teamId?`-Parameter muss den Parameter im Cache-Key fuehren.

### 16.3 Shared-Chats-Query-Absicherung

**Problem:** Bestehende Queries gehen von 1 Eintrag pro Chat aus.

**Loesung:** Bestehende Share-Queries explizit auf `team_id IS NULL` filtern (Public-Shares). Neue Queries fuer Team-Shares. Kein Query darf beide Typen unbeabsichtigt mischen.

```typescript
// Bestehend: explizit nur Public-Shares
getPublicShare(chatId)  → WHERE chat_id = ? AND team_id IS NULL
// Neu: nur Team-Shares
getTeamShare(chatId, teamId)  → WHERE chat_id = ? AND team_id = ?
```

### 16.4 Credit-Drain-Schutz

**Problem:** Ein Mitglied kann das gesamte Team-Budget aufbrauchen.

**Loesung (Phase 1):** Konfigurierbare Tageslimits pro Mitglied:

| Variable | Default | Beschreibung |
|----------|---------|-------------|
| `TEAM_MEMBER_DAILY_CREDIT_LIMIT` | `0` (unbegrenzt) | Max. Team-Credits pro Mitglied pro Tag. 0 = kein Limit. |

Implementierung: Vor `deductTeamCredits` pruefen ob der User heute schon das Limit erreicht hat (SUM ueber `team_credit_transactions` des Tages).

### 16.5 Bestehende Code-Pfade schuetzen

**Problem:** Aenderungen an `getExperts()` oder `discoverSkills()` koennten den Nicht-Team-Fall brechen.

**Loesung:** Early-Return-Pattern. Wenn `teamId` nicht gesetzt: exakt den bisherigen Code-Pfad nehmen, keine Merge-Logik ausfuehren.

```typescript
export async function getExperts(userId: string, teamId?: string) {
  // Bestehender Pfad: unveraendert
  if (!teamId) {
    return getPersonalAndGlobalExperts(userId)
  }
  // Neuer Pfad: nur wenn teamId gesetzt
  return getThreeTierExperts(userId, teamId)
}
```

### 16.6 Team-ID-Validierung

**Problem:** `teamId` kommt vom Client und kann manipuliert sein.

**Loesung:** Zentrale Validierungsfunktion analog zu `chatId`-Validierung:

```typescript
// teamId: max 20 Zeichen, [a-zA-Z0-9_-]
const TEAM_ID_REGEX = /^[a-zA-Z0-9_-]{1,20}$/
```

Plus: Jeder Endpoint der `teamId` akzeptiert MUSS `requireTeamMember` (oder hoeher) aufrufen. Das wird durch die `withTeamAuth`-Wrapper-Funktion (16.1) sichergestellt.

---

## 17. Offene Entscheidungen

1. **Slug-Strategie:** Prefix `t-{teamSlug}-{slug}` ist pragmatisch, aber macht Slugs laenger und weniger lesbar. Alternative: zusammengesetzter Unique-Index mit COALESCE-Trick. Entscheidung bei Implementation.

2. **Team-Projekt-Chats:** Wenn ein User einen Chat in einem Team-Projekt startet — soll der Chat automatisch mit dem Team geteilt werden, oder muss der User das manuell tun? Empfehlung: manuell, konsistent mit dem Prinzip "Chats sind privat".

3. **Credit-Fallback-UX:** Wenn Team-Budget leer und auf persoenliches Budget gefallbackt wird — soll der User vorher gefragt werden oder automatisch? Empfehlung: automatisch mit Hinweis im UI.

---

## 18. Zukunftsthemen (nicht in Scope)

- **Team-Memory:** Geteilte Erinnerungen auf Team-Ebene
- **Team-MCP-Server:** Eigene MCP-Server pro Team (aktuell global)
- **Verschachtelte Teams:** Abteilungen innerhalb eines Teams
- **Team-Analytics:** Dashboard mit Nutzungstrends, populaersten Experts, Credit-Burn-Rate
- **SSO-basierter Team-Join:** Automatischer Beitritt basierend auf E-Mail-Domain oder Logto Organization
- **Granulares RBAC:** Einzelne Projekt-Berechtigungen statt Team-weite Rollen
