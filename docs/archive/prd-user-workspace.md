# PRD: User Workspace

> Zentraler Verwaltungsbereich fuer User-eigene Inhalte: Skills, Experts, Projekte und Einstellungen.
> **Status:** Implementierungsbereit
> **Prioritaet:** Hoch
> **Stand:** 2026-03-28

---

## 1. Kontext und Ziel

### Problem

User-Verwaltungsfunktionen sind aktuell verstreut und unvollstaendig:

- **Einstellungen**: Dialog im User-Dropdown (Custom Instructions, Model, Memory)
- **Projekte**: Sidebar-Dialoge (Create, Settings, Dokumente)
- **Experts**: API existiert (`/api/experts` POST/PATCH/DELETE), aber **kein UI**
- **Skills/Quicktasks**: Nur Admins koennen diese verwalten. User haben keinen Zugang.

Das fuehrt dazu, dass User die Plattform nicht an ihre Beduerfnisse anpassen koennen. Ein Marketing-Experte kann sich keinen eigenen Prompt bauen. Ein Entwickler kann kein Quicktask fuer seine haeufigsten Aufgaben erstellen.

### Loesung

Ein einheitlicher `/workspace` Bereich — das "Admin fuer User" — mit 4 Tabs:

1. **Skills** — Eigene Skills und Quicktasks erstellen (nur SKILL.md, kein ZIP)
2. **Experts** — Eigene Experten mit System-Prompt und Skill-Zuordnung
3. **Projekte** — Projekt-CRUD mit Dokumenten und Einstellungen (aus Sidebar hierher)
4. **Einstellungen** — Bisheriger Settings-Dialog als vollwertige Seite

### Warum jetzt

- Expert-API existiert bereits, braucht nur UI
- Skill-Infrastruktur (Parser, Templates, Discovery) ist ausgereift
- User fragen nach individuellen Anpassungsmoeglichkeiten
- Admin-UI kann als Blaupause dienen — das Pattern ist erprobt

---

## 2. Rollen und Berechtigungen

### Ist-Zustand

| Rolle | Experts | Skills | Models | MCP | Credits | Users |
|-------|---------|--------|--------|-----|---------|-------|
| **User** | Eigene CRUD (API only, kein UI) | Nur lesen | Nur lesen | - | Nur Balance sehen | - |
| **Admin** | Alle CRUD via `/admin` | Alle CRUD via `/admin` | Alle CRUD | Alle CRUD | Vergeben | - |
| **Superadmin** | Wie Admin | Wie Admin | Wie Admin | Wie Admin | Wie Admin | Rollen vergeben |

### Soll-Zustand

| Rolle | Eigene Inhalte | Globale Inhalte | System |
|-------|---------------|----------------|--------|
| **User** | Experts, Skills, Quicktasks, Projekte CRUD via `/workspace` | Nur lesen (globale Experts, Skills nutzen) | Einstellungen via `/workspace/settings` |
| **Admin** | Wie User via `/workspace` | CRUD via `/admin` (Skills, Experts, Models, MCP, Credits) | Wie User |
| **Superadmin** | Wie Admin | Wie Admin | User-Rollen vergeben via `/admin/users` |

### Abgrenzung Admin vs. Workspace

| Aspekt | Admin (`/admin`) | Workspace (`/workspace`) |
|--------|-----------------|-------------------------|
| Zugang | Nur Admin/Superadmin | Alle authentifizierten User |
| Scope | Globale/System-Inhalte | Nur eigene Inhalte |
| Skills | Vollstaendig (ZIP, Ressourcen, sortOrder, isActive) | Nur SKILL.md Text |
| Experts | Alle (global + User-owned) | Nur eigene |
| Models | CRUD | Kein Zugang |
| MCP-Server | CRUD + Health | Kein Zugang |
| Credits | Vergeben + Uebersicht | Nur eigenen Balance sehen |

---

## 3. User Experience

### Navigation

```
NavUser Dropdown:
  Rico Loschke
  rico@loschke.ai
  ─────────────
  Workspace         → /workspace/skills
  Admin             → /admin/skills        (nur Admins)
  ─────────────
  Abmelden
```

Der bisherige "Einstellungen"-Menuepunkt wird durch "Workspace" ersetzt.

### Workspace Shell

```
┌─────────────────────────────────────────────────┐
│ ← Workspace    [Skills] [Experts] [Projekte] [⚙]│
├─────────────────────────────────────────────────┤
│                                                 │
│  (Tab-Content)                                  │
│                                                 │
└─────────────────────────────────────────────────┘
```

Identisches Layout wie Admin-Shell: Sticky Header, Back-Arrow zu `/`, horizontale Nav-Tabs.

### Tab: Skills

**List-Ansicht:**

| Name | Slug | Modus | Aktionen |
|------|------|-------|----------|
| SEO-Analyse | seo-analyse | Quicktask | Bearbeiten / Loeschen |
| Blog-Entwurf | blog-entwurf | Skill | Bearbeiten / Loeschen |

Button "Neuer Skill" oeffnet den Editor mit einem SKILL.md Template.

**Editor-Ansicht:**
- CodeMirror mit YAML-Frontmatter + Markdown
- Vorausgefuelltes Template mit allen Feldern
- Kein ZIP-Upload, kein sortOrder, kein isActive-Toggle
- User-Skills sind immer aktiv

**Vereinfachungen gegenueber Admin:**
- Kein Import aus ZIP-Dateien
- Kein sortOrder-Management
- Kein isActive-Toggle (User-Skills immer aktiv)
- Kein Bulk-Export

### Tab: Experts

**List-Ansicht:**

| Name | Slug | Skills | Aktionen |
|------|------|--------|----------|
| Mein SEO-Berater | mein-seo | `seo-analyse` | Bearbeiten / Loeschen |

**Editor-Ansicht:**
- Formular-basiert (nicht JSON wie im Admin)
- Felder: Name, Slug, Icon, System-Prompt (Textarea), Skill-Zuordnung (Multi-Select aus eigenen + globalen Skills)
- Optional: Model-Override, Temperature, Allowed Tools

### Tab: Projekte

Uebernimmt die Funktionalitaet die aktuell in Sidebar-Dialogen lebt:

**List-Ansicht:**

| Name | Beschreibung | Dokumente | Default-Expert | Aktionen |
|------|-------------|-----------|---------------|----------|
| Website-Relaunch | Redesign 2026 | 3 | SEO-Berater | Bearbeiten / Loeschen |

**Editor-Ansicht:**
- Name, Beschreibung, Instructions (Textarea)
- Default-Expert-Auswahl (eigene + globale)
- Dokument-Upload und -Verwaltung

**Sidebar-Integration:** Die Sidebar behalt die Projekt-Liste fuer schnellen Chat-Kontext-Wechsel. Nur die ausfuehrliche Verwaltung (CRUD, Dokumente, Settings) wandert in den Workspace.

### Tab: Einstellungen

Uebertraegt den bisherigen `CustomInstructionsDialog` in eine vollwertige Seite:

- **Custom Instructions** (Textarea, max 2000 Zeichen)
- **Standard-Modell** (Dropdown)
- **Memory** (Toggle + Link zur Memory-Verwaltung)
- **Antwortvorschlaege** (Toggle)
- **Credits** (Balance-Anzeige + History-Link, wenn Feature aktiv)

---

## 4. Technische Architektur

### DB-Aenderungen

#### `skills`-Tabelle: Neue Spalten

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| `userId` | text (nullable) | `NULL` = globaler Skill (Admin), gesetzt = User-eigener Skill |
| `isPublic` | boolean (default false) | Wenn true, koennen andere User diesen Skill nutzen |

**Index-Strategie:**
- Bestehender `skills_slug_idx` (global unique) wird ersetzt durch:
  - Partial Unique Index auf `slug` WHERE `user_id IS NULL` (globale Slugs eindeutig)
  - Composite Unique Index auf `(user_id, slug)` WHERE `user_id IS NOT NULL` (pro User eindeutig)
- Dadurch: Gleicher Slug bei verschiedenen Usern erlaubt, aber pro User eindeutig

#### `experts`-Tabelle: Neue Spalte

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| `isPublic` | boolean (default false) | Wenn true, koennen andere User diesen Expert nutzen |

Die `experts`-Tabelle hat bereits eine `userId` Spalte.

### Public-Sharing von User-Inhalten

User koennen eigene Skills und Experts als "oeffentlich" markieren:

- **Default:** Privat (nur fuer den Ersteller sichtbar)
- **Public:** Toggle im Editor setzt `isPublic = true`. Sofort fuer alle User sichtbar, keine Admin-Freigabe noetig.
- **Sichtbarkeit:** Oeffentliche User-Inhalte erscheinen in der Skill/Expert-Auswahl anderer User, gekennzeichnet mit Autor-Info.
- **Rechte:** Andere User koennen oeffentliche Inhalte **nutzen**, aber **nicht bearbeiten**. Nur der Ersteller kann aendern oder loeschen.
- **Im Chat:** Discovery-Reihenfolge: Eigene Skills → Oeffentliche User-Skills → Globale Admin-Skills. Bei Slug-Kollision gewinnt der eigene.

### Neue API-Routes

| Route | Methoden | Guard | Zweck |
|-------|----------|-------|-------|
| `/api/user/skills` | GET, POST | requireAuth | User-Skills auflisten, erstellen |
| `/api/user/skills/[skillId]` | GET, PUT, DELETE | requireAuth + userId-Scope | Einzelnen Skill lesen, updaten, loeschen |

Bestehende Routes bleiben unveraendert:
- `/api/experts` — User-Expert CRUD (existiert bereits)
- `/api/projects` — Projekt CRUD (existiert bereits)
- `/api/user/instructions` — Settings (existiert bereits)
- `/api/admin/skills` — Admin Skills CRUD (unveraendert)

### Chat-Integration

User-Skills muessen im Chat-System auftauchen:
- **System-Prompt**: `discoverSkills()` wird um User-Skills erweitert → globale + eigene Skills in Layer 3
- **load_skill Tool**: `getSkillBySlug()` prueft erst User-Skills, dann globale
- **Quicktasks**: `discoverQuicktasks()` merged globale + User-Quicktasks

**Cache-Strategie:**
- Globale Skills: Weiterhin 60s TTL-Cache (Module-Level)
- User-Skills: Frischer DB-Query pro Request (wenige pro User, kein Cache noetig)
- Merge bei Aufruf: `discoverSkillsForUser(userId)` = cached global + fresh user query

### Betroffene Dateien

**Neue Dateien:**

| Datei | Typ |
|-------|-----|
| `src/app/api/user/skills/route.ts` | API (GET, POST) |
| `src/app/api/user/skills/[skillId]/route.ts` | API (GET, PUT, DELETE) |
| `src/app/workspace/layout.tsx` | Server Layout + Auth |
| `src/app/workspace/page.tsx` | Redirect → /workspace/skills |
| `src/app/workspace/skills/page.tsx` | Skills Page |
| `src/app/workspace/experts/page.tsx` | Experts Page |
| `src/app/workspace/projects/page.tsx` | Projects Page |
| `src/app/workspace/settings/page.tsx` | Settings Page |
| `src/components/workspace/workspace-shell.tsx` | Shell (4 Tabs) |
| `src/components/workspace/workspace-skills.tsx` | Skills List/CRUD |
| `src/components/workspace/workspace-skill-editor.tsx` | SKILL.md Editor |
| `src/components/workspace/workspace-experts.tsx` | Experts List/CRUD |
| `src/components/workspace/workspace-projects.tsx` | Projects List/CRUD |
| `src/components/workspace/workspace-settings.tsx` | Settings Page |

**Bestehende Dateien (Aenderungen):**

| Datei | Aenderung |
|-------|----------|
| `src/lib/db/schema/skills.ts` | userId + isPublic Spalten + neue Indexes |
| `src/lib/db/schema/experts.ts` | isPublic Spalte |
| `src/lib/db/queries/skills.ts` | User-scoped Query-Funktionen |
| `src/lib/ai/skills/discovery.ts` | `*ForUser()` Varianten |
| `src/lib/ai/tools/load-skill.ts` | userId in Factory durchreichen |
| `src/app/api/chat/resolve-context.ts` | userId an discoverSkills |
| `src/app/api/chat/build-tools.ts` | userId an createLoadSkillTool |
| `src/app/api/skills/quicktasks/route.ts` | userId an discoverQuicktasks |
| `src/components/layout/nav-user.tsx` | "Einstellungen" → "Workspace" |
| `src/components/layout/chat-header.tsx` | Workspace im Plus-Dropdown |

**Entfernbar (nach Migration):**

| Datei | Grund |
|-------|-------|
| `src/components/chat/custom-instructions-dialog.tsx` | Ersetzt durch `/workspace/settings` |

---

## 5. Sicherheit

- **userId-Scoping**: Alle Skill-Mutations pruefen `WHERE userId = ?` (defense-in-depth)
- **Kein Cross-User-Zugriff**: User A kann private Skills/Experts von User B nicht sehen. Oeffentliche User-Inhalte sind sichtbar aber read-only.
- **Globale Inhalte read-only**: User koennen globale Skills/Experts nutzen, nicht aendern
- **Public-Inhalte read-only**: Oeffentliche User-Skills/Experts koennen genutzt, aber nur vom Ersteller bearbeitet werden
- **Input-Validierung**: Slug-Format, Name-Laenge, Content-Laenge via Zod
- **Rate-Limiting**: Bestehende API-Limits (60/min) gelten
- **Kein ZIP-Upload**: Reduziert Angriffsflaeche (kein ZIP-Bomb-Risiko fuer User)

---

## 6. Getroffene Entscheidungen

| # | Frage | Entscheidung | Begruendung |
|---|-------|-------------|-------------|
| 1 | Slug-Collision global ↔ user | **Erlaubt.** User-Slug hat Vorrang bei `load_skill`. | `getSkillBySlug(slug, userId?)` prueft erst User-Skills, dann globale. Intuitiv: User kann globalen Skill "ueberschreiben". |
| 2 | Sidebar-Projekte | **Parallel lassen.** Sidebar behaelt Create/Edit-Dialoge vorerst. Workspace bekommt ebenfalls CRUD. | Sicherer Rollout. Sidebar-Dialoge spaeter evaluieren und ggf. entfernen. |
| 3 | Expert-Editor | **Formularbasiert.** Felder statt JSON. | Userfreundlicher. Admin behaelt JSON-Editor. |
| 4 | Skill-Template | **Minimal.** Name, Slug, Description, Content-Body. | Weniger ueberfordern. Fortgeschrittene Felder (temperature, modelId) koennen manuell ins Frontmatter geschrieben werden. |
| 5 | User-Skill Limit | **Max 20 Skills pro User.** API-Level Validation. | Fehlermeldung: "Maximal 20 Fertigkeiten pro Account. Loesche oder bearbeite bestehende." |
| 6 | Sidebar-Dialog Migration | **Erstmal parallel.** Sidebar-Dialoge bleiben aktiv. | UX evaluieren, dann entscheiden ob Sidebar-CRUD entfernt wird. |
| 7 | Public-Sharing | **Sofort sichtbar.** Keine Admin-Freigabe. isPublic-Toggle im Editor. | Einfach, kein Moderations-Overhead. Nur nutzen, nicht bearbeiten. |

---

## 7. Implementierungsreihenfolge

| Phase | Inhalt | Abhaengigkeiten |
|-------|--------|----------------|
| **1** | DB-Migration: userId auf skills | Keine |
| **2** | Query-Layer: User-scoped Skill-Queries | Phase 1 |
| **3** | Skill Discovery: User-Skills im Chat | Phase 2 |
| **4** | Chat-Integration: load_skill + Quicktasks | Phase 3 |
| **5** | User Skills API: `/api/user/skills` | Phase 2 |
| **6** | Workspace UI: Shell + alle 4 Tabs | Phase 5, bestehende APIs |
| **7** | Navigation: NavUser + ChatHeader anpassen | Phase 6 |

Phasen 1-4 (Backend) und Phase 5 (API) koennen unabhaengig von Phase 6-7 (UI) deployed werden.

---

## 8. Ergaenzende Spezifikationen

### Expert-Icon-Auswahl

User waehlen aus einer vordefinierten Liste von ~20 Lucide-Icons (gleiche Auswahl wie im Admin).
Darstellung als Icon-Grid mit Tooltip. Kein Freitext, kein Upload.

### Mobile UX

- Tabs als horizontaler Scroll-Container auf Mobile
- Editor-Ansichten nutzen volle Breite
- CodeMirror-Editor responsive (min-height 300px)
- Zurueck-Button prominent oben links

### Empty States

Jeder Tab zeigt einen Empty State wenn keine Inhalte vorhanden:

- **Skills:** "Du hast noch keine eigenen Fertigkeiten. Erstelle deinen ersten Skill um die KI an deine Arbeitsweise anzupassen." + Button "Neuer Skill"
- **Experts:** "Erstelle eigene Experten mit massgeschneidertem System-Prompt und Skill-Zuordnung." + Button "Neuer Expert"
- **Projekte:** "Organisiere deine Chats in Projekten mit eigenen Instructions und Dokumenten." + Button "Neues Projekt"
- **Einstellungen:** Kein Empty State (immer Formular sichtbar)

### Edge Cases

| Szenario | Verhalten |
|----------|----------|
| User loescht Skill der in eigenem Expert referenziert wird | Skill wird beim Chat-Laden ignoriert (graceful). Expert funktioniert weiter, nur ohne diesen Skill. Kein Cascade-Delete auf skillSlugs. |
| User erstellt Skill mit gleichem Slug wie globaler | Beim Chat: User-Version hat Vorrang. Im Workspace: Kein Hinweis noetig (User weiss was er tut). |
| User aendert mode (skill ↔ quicktask) nach Erstellung | Erlaubt. Mode-Feld im Frontmatter editierbar. |
| API gibt 400 bei 21. Skill | Klare Fehlermeldung im UI anzeigen. |
| Skill-Content ist leer oder invalide | `parseSkillMarkdown()` gibt Fehler zurueck. API gibt 400 mit spezifischer Meldung ("Name fehlt", "Slug fehlt" etc.). |
| User setzt Skill auf public, dann loescht er ihn | Andere User verlieren Zugriff. Experts die den Skill referenzieren ignorieren ihn graceful. |
| User setzt Expert auf public mit privaten Skills | Nur die als public markierten Skills des Experts werden fuer andere geladen. Private Skills werden uebersprungen. |

---

## 9. Nicht in Scope

- ZIP-Upload fuer User-Skills (nur SKILL.md)
- Skill-Ressourcen fuer User (shared, spec, template etc.)
- User-eigene Models oder MCP-Server
- Kopieren/Forken von oeffentlichen Skills (nur nutzen)
- Marketplace/Community-Skills mit Bewertungen
- Bulk-Import/Export fuer User
