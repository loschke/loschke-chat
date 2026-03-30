# MVP Collaboration: Chat & Projekt Sharing

## Context

User wollen Chats und Projekte mit anderen Plattform-Usern teilen. Bisheriges Sharing ist nur public via Token-Link (read-only, ohne Auth). Jetzt soll gezieltes User-zu-User Sharing kommen. Das bestehende Public-Sharing bleibt erhalten.

**Scope-Reduktion vs. PRD:** Kein Team-Entity, keine Project-Memories, kein Viewer-Role im MVP, kein Email-Versand. Stattdessen: direktes Sharing per Email-Lookup in der User-DB + Link-basierte Einladung.

**Workspace-PRD Kompatibilitaet:** Die DB-Schema-Erweiterungen (project_members) funktionieren unabhaengig davon, ob Projekt-Management spaeter in /workspace wandert. Keine UI-Entscheidungen die den Workspace-Umbau blockieren.

**Deployment-Kontext:** Geschlossene Instanzen (je Kunde eine App-Instanz). Alle User einer Instanz kennen sich. Kein oeffentliches Self-Signup.

---

## Design-Entscheidungen

1. **Separate Tabellen**: `chat_shares` (User-zu-User Chat-Sharing) neben bestehendem `shared_chats` (Public Links). `project_members` fuer Projekt-Sharing. Klare Trennung der Zugriffs-Modelle.

2. **Einladung per Email-Lookup**: Sharer gibt Email ein, System sucht in `users`-Tabelle. Kein externer Email-Versand im MVP. User muss bereits auf der Plattform registriert sein. Konkrete Fehlermeldung "Nutzer nicht gefunden" (bewusst, da geschlossene Instanzen).

3. **Chat-Ownership bleibt beim Creator**: In geteilten Projekten erstellt jeder User Chats unter seiner eigenen userId. Credits werden dem Creator belastet. Kein Credit-Pooling.

4. **Projekt-Chat-Sichtbarkeit**: Members sehen im geteilten Projekt nur eigene Chats + explizit mit ihnen geteilte Chats anderer Members. NICHT alle Projekt-Chats. Haelt die Uebersichtlichkeit.

5. **Chat-Projekt-Wechsel**: Nur Projekt-Owner darf Chats zwischen Projekten verschieben. `updateChatProject()` bleibt owner-scoped.

6. **Sidebar-Sektionen**: "Geteilte Projekte" unter "Meine Projekte". "Mit mir geteilt" als eigene Sektion fuer empfangene Chat-Shares. Eigene geteilte Items bekommen Badge.

---

## Impact-Analyse & Audit

### Zugriffs-Modell: Vorher vs. Nachher

**Vorher (Single-User):**

```
Zugriffspruefung: userId === chatOwner → ja/nein
1 Dimension, binaer
```

**Nachher (Collaboration MVP):**

```
Zugriffspruefung:
  1. Ist User Chat-Owner? → voller Zugriff
  2. Ist Chat in einem Projekt wo User Member ist? → voller Zugriff (eigene + geteilte Chats)
  3. Hat jemand den Chat direkt mit dem User geteilt? → read-only
  4. Keins davon? → kein Zugriff

3 Zugriffspfade, 2 Berechtigungsstufen (full / read-only)
```

### Zentraler Access-Helper (Kern-Abstraktion)

**`src/lib/db/queries/access.ts`** (NEU) — wird an allen Stellen statt direkter userId-Checks verwendet:

- `canAccessProject(projectId, userId) -> { hasAccess, role, isOwner }`
- `canAccessChat(chatId, userId) -> { hasAccess, isOwner, via: 'owner'|'chat_share'|'project_member'|null }`

### Vollstaendiger userId-Scoping-Audit

Legende: **AENDERN** = Muss angepasst werden | **BELASSEN** = Bleibt wie ist | **NEU** = Neue Datei

#### A. Database Queries (`src/lib/db/queries/`)

**`chats.ts` — 3 von 11 Funktionen aendern:**

| Funktion                            | Aktion   | Begruendung                                             |
| ----------------------------------- | -------- | ------------------------------------------------------- |
| `createChat(userId)`                | BELASSEN | Neuer Chat gehoert immer dem Creator                    |
| `getUserChats(userId)`              | AENDERN  | + Chats aus geteilten Projekten (nur eigene + geteilte) |
| `getChatById(chatId, userId?)`      | AENDERN  | Muss `canAccessChat()` nutzen                           |
| `getChatWithMessages(chatId)`       | BELASSEN | Caller validiert ueber `canAccessChat()`                |
| `updateChatTitle(chatId, userId)`   | BELASSEN | Nur Owner                                               |
| `deleteChat(chatId, userId)`        | BELASSEN | Nur Owner                                               |
| `touchChat(chatId, userId)`         | AENDERN  | Projekt-Member die chatten muessen touch ausloesen      |
| `toggleChatPin(chatId, userId)`     | BELASSEN | Pinning ist persoenlich                                 |
| `updateChatModel(chatId, userId)`   | BELASSEN | Nur Owner                                               |
| `updateChatProject(chatId, userId)` | BELASSEN | Nur Owner                                               |
| `updateChatExpert(chatId, userId)`  | BELASSEN | Nur Owner                                               |

**`projects.ts` — 2 von 5 Funktionen aendern:**

| Funktion                           | Aktion   | Begruendung                                           |
| ---------------------------------- | -------- | ----------------------------------------------------- |
| `createProject(userId)`            | BELASSEN | + `ensureProjectOwnerMember()` aufrufen               |
| `getUserProjects(userId)`          | AENDERN  | + geteilte Projekte zurueckgeben                      |
| `getProjectById(projectId)`        | BELASSEN | Caller prueft via `canAccessProject()`                |
| `updateProject(projectId, userId)` | AENDERN  | Editors duerfen name/description/instructions aendern |
| `deleteProject(projectId, userId)` | BELASSEN | Nur Owner                                             |

**`artifacts.ts` — 3 von 6 Funktionen aendern:**

| Funktion                               | Aktion   | Begruendung                                     |
| -------------------------------------- | -------- | ----------------------------------------------- |
| `createArtifact(chatId)`               | BELASSEN | Validierung ueber Chat-Zugriff                  |
| `getArtifactById(id)`                  | BELASSEN | Caller prueft                                   |
| `getArtifactByIdForUser(id, userId)`   | AENDERN  | Fuer Projekt-Member/Share-Empfaenger            |
| `getArtifactsByChatId(chatId, userId)` | AENDERN  | Selbe Logik                                     |
| `getArtifactsByUserId(userId)`         | BELASSEN | Zeigt nur eigene Artifacts (Uebersichtlichkeit) |
| `updateArtifactContent(id, userId)`    | BELASSEN | Nur Owner darf editieren                        |

**`messages.ts` — 2 von 4 Funktionen aendern:**

| Funktion                                   | Aktion   | Begruendung                     |
| ------------------------------------------ | -------- | ------------------------------- |
| `saveMessages(chatId)`                     | BELASSEN | Caller validiert                |
| `updateMessageMetadata(messageId)`         | BELASSEN | Caller validiert                |
| `getMessageMetadata(messageId, userId)`    | AENDERN  | Projekt-Member brauchen Zugriff |
| `getLastAssistantMetadata(chatId, userId)` | AENDERN  | Fuer Suggestions                |

**`project-documents.ts` — 1 von 5 Funktionen aendern:**

| Funktion                                  | Aktion   | Begruendung                    |
| ----------------------------------------- | -------- | ------------------------------ |
| `getProjectDocuments(projectId)`          | BELASSEN | Caller prueft Projekt-Zugriff  |
| `getProjectDocumentsForPrompt(projectId)` | BELASSEN | Caller prueft                  |
| `getDocumentStats(projectId)`             | BELASSEN | Caller prueft                  |
| `createProjectDocument(projectId)`        | BELASSEN | Caller prueft                  |
| `deleteProjectDocument(docId, userId)`    | AENDERN  | Editors duerfen Docs verwalten |

**Weitere Query-Dateien — alle BELASSEN:**
`shared-chats.ts`, `credits.ts`, `usage.ts`, `experts.ts`, `users.ts`, `consent.ts`

#### B. API Routes (`src/app/api/`)

**Chat-Routen:**

| Route                                       | Methode         | Aktion   | Details                                           |
| ------------------------------------------- | --------------- | -------- | ------------------------------------------------- |
| `/api/chats`                                | GET             | AENDERN  | + geteilte Chats einbeziehen                      |
| `/api/chats/[chatId]`                       | GET             | AENDERN  | `canAccessChat()` statt `chat.userId !== user.id` |
| `/api/chats/[chatId]`                       | PATCH           | BELASSEN | Nur Owner darf Chat-Metadaten aendern             |
| `/api/chats/[chatId]`                       | DELETE          | BELASSEN | Nur Owner                                         |
| `/api/chats/[chatId]/share`                 | POST/DELETE/GET | BELASSEN | Public Share bleibt Owner-only                    |
| `/api/chats/shared`                         | GET             | BELASSEN | Listet eigene Shares (fuer Badges)                |
| `/api/chats/[chatId]/suggestions`           | GET             | AENDERN  | Projekt-Member brauchen Zugriff                   |
| `/api/chats/[chatId]/messages/.../metadata` | GET             | AENDERN  | Projekt-Member brauchen Zugriff                   |

**Projekt-Routen:**

| Route                                         | Methode | Aktion   | Details                                               |
| --------------------------------------------- | ------- | -------- | ----------------------------------------------------- |
| `/api/projects`                               | GET     | AENDERN  | + geteilte Projekte zurueckgeben                      |
| `/api/projects`                               | POST    | BELASSEN | Creator wird Owner                                    |
| `/api/projects/[projectId]`                   | GET     | AENDERN  | `canAccessProject()` statt Owner-Check                |
| `/api/projects/[projectId]`                   | PATCH   | AENDERN  | Editors duerfen name/description/instructions aendern |
| `/api/projects/[projectId]`                   | DELETE  | BELASSEN | Nur Owner                                             |
| `/api/projects/[projectId]/documents`         | GET     | AENDERN  | Member-Zugriff erlauben                               |
| `/api/projects/[projectId]/documents`         | POST    | AENDERN  | Editors duerfen Docs hochladen                        |
| `/api/projects/[projectId]/documents/[docId]` | DELETE  | AENDERN  | Editors duerfen Docs loeschen                         |

**Artifact-Routen:**

| Route                         | Methode | Aktion   | Details                                         |
| ----------------------------- | ------- | -------- | ----------------------------------------------- |
| `/api/artifacts`              | GET     | BELASSEN | Zeigt nur eigene Artifacts (Uebersichtlichkeit) |
| `/api/artifacts/[artifactId]` | GET     | AENDERN  | Chat-Zugriff statt Owner-Check                  |
| `/api/artifacts/[artifactId]` | PATCH   | BELASSEN | Nur Owner darf editieren                        |

**Chat-Kernroute:**

| Datei                    | Stelle                           | Aktion   | Details                                   |
| ------------------------ | -------------------------------- | -------- | ----------------------------------------- |
| `resolve-context.ts:105` | `project.userId !== userId`      | AENDERN  | → `canAccessProject()`                    |
| `resolve-context.ts:111` | `existingChat.userId !== userId` | AENDERN  | → `canAccessChat()` mit write-Level       |
| `persist.ts`             | Credit-Deduktion                 | BELASSEN | Credits gehen an Request-Sender (user.id) |

**Upload-, Deep-Research-, User-, Admin-Routen:** alle BELASSEN.
File-URLs sind als R2 signed URLs in Messages eingebettet — wer den Chat sehen darf, sieht Bilder automatisch. Deep-Research-Interaktionen gehoeren dem Creator, Members sehen das fertige Artifact im Chat.

#### C. Client Components

| Datei                         | Aktion  | Details                                                     |
| ----------------------------- | ------- | ----------------------------------------------------------- |
| `chat-sidebar-content.tsx`    | AENDERN | Neue Sektionen: "Geteilte Projekte" + "Mit mir geteilt"     |
| `chat-view.tsx`               | AENDERN | Read-only Modus fuer Chat-Shares                            |
| `project-settings-dialog.tsx` | AENDERN | Member-Tab hinzufuegen                                      |
| `chat-header.tsx`             | AENDERN | "Geteilt von [Name]" Hinweis bei Chat-Shares, Projekt-Badge |
| `prompt-input.tsx`            | AENDERN | Ausblenden bei Read-only                                    |
| `user-share-dialog.tsx`       | NEU     | Chat-Share Dialog                                           |

### Audit-Zusammenfassung

| Kategorie        | AENDERN | BELASSEN | NEU                                                |
| ---------------- | ------- | -------- | -------------------------------------------------- |
| Query-Funktionen | 11      | 27       | ~7 (access.ts, project-members.ts, chat-shares.ts) |
| API-Routes       | 12      | 14       | 6                                                  |
| Components       | 5       | 1        | 1                                                  |
| **Gesamt**       | **28**  | **42**   | **14**                                             |

---

## Phase 1: Schema & Data Layer

### Neue Tabelle `project_members`

```
src/lib/db/schema/project-members.ts

project_members
  id          text PK (nanoid 12)
  projectId   text NOT NULL FK -> projects.id CASCADE
  userId      text NOT NULL (logto sub)
  role        text NOT NULL DEFAULT 'editor' ('owner' | 'editor')
  addedBy     text NOT NULL (logto sub)
  createdAt   timestamptz DEFAULT now()

  UNIQUE(projectId, userId)
  INDEX on userId
  INDEX on projectId
```

### Neue Tabelle `chat_shares`

```
src/lib/db/schema/chat-shares.ts

chat_shares
  id            text PK (nanoid 12)
  chatId        text NOT NULL FK -> chats.id CASCADE
  ownerId       text NOT NULL (logto sub, wer geteilt hat)
  sharedWithId  text NOT NULL (logto sub, Empfaenger)
  createdAt     timestamptz DEFAULT now()

  UNIQUE(chatId, sharedWithId)
  INDEX on sharedWithId
  INDEX on chatId
```

### Data Migration

- Bestehende Projekte: INSERT `project_members` mit `role='owner'` fuer alle `projects.userId`
- Export in `src/lib/db/schema/index.ts` ergaenzen

### Neue Query-Files

**`src/lib/db/queries/access.ts`** (Kern-Abstraktion)

- `canAccessProject(projectId, userId) -> { hasAccess, role, isOwner }`
- `canAccessChat(chatId, userId) -> { hasAccess, isOwner, via: 'owner'|'chat_share'|'project_member'|null }`

**`src/lib/db/queries/project-members.ts`**

- `addProjectMember(projectId, userId, role, addedBy)`
- `removeProjectMember(memberId, projectId)`
- `getProjectMembers(projectId)` — JOIN users fuer name/email
- `isProjectMember(projectId, userId) -> boolean`
- `getProjectMemberRole(projectId, userId) -> role | null`
- `getUserSharedProjects(userId)` — Projekte wo user Member aber nicht Owner
- `ensureProjectOwnerMember(projectId, userId)` — bei Projekt-Erstellung aufrufen

**`src/lib/db/queries/chat-shares.ts`**

- `shareChatWithUser(chatId, ownerId, sharedWithId)`
- `revokeChatShare(shareId, ownerId)`
- `getChatShareRecipients(chatId, ownerId)` — JOIN users
- `getChatsSharedWithMe(userId)` — JOIN chats fuer title + owner info
- `isChatSharedWithUser(chatId, userId) -> boolean`
- `getUserSharedChatIds(userId) -> Set<string>` — IDs der Chats die User geteilt hat

### Validierung

**`src/lib/validations/sharing.ts`**

- `addMemberSchema: { email: string, role?: 'editor' }`
- `shareChatSchema: { email: string }`

---

## Phase 2: Project Sharing API

### Neue Routes

**`POST /api/projects/[projectId]/members`** — Member hinzufuegen

- Auth: requireAuth, Owner oder Editor
- Body: `{ email, role? }`
- User per Email in `users` suchen, 404 "Nutzer nicht gefunden" wenn nicht registriert, 409 wenn schon Member

**`GET /api/projects/[projectId]/members`** — Member auflisten

- Auth: requireAuth, muss Member sein

**`DELETE /api/projects/[projectId]/members/[memberId]`** — Member entfernen

- Auth: requireAuth, nur Owner. Owner kann sich nicht selbst entfernen.

### Bestehende Routes anpassen

**`GET /api/projects`** (`src/app/api/projects/route.ts`)

- Erweitern: Shared Projects mit `isShared: true` und `role` zurueckgeben
- Zwei Queries: `getUserProjects(userId)` + `getUserSharedProjects(userId)`, zusammenfuehren

**`GET /api/projects/[projectId]`** (`src/app/api/projects/[projectId]/route.ts`)

- Ownership-Check lockern: auch Members erlauben (via `canAccessProject`)

**`PATCH /api/projects/[projectId]`**

- Editors duerfen updaten (name, description, instructions, defaultExpertId)
- Editors duerfen NICHT `isArchived` aendern (Owner-only)

**`DELETE /api/projects/[projectId]`** — keine Aenderung noetig (userId-scoped)

**`GET/POST /api/projects/[projectId]/documents`**

- Member-Zugriff erlauben (Editors koennen Docs verwalten)

**`src/app/api/chat/resolve-context.ts` (Zeile 105)**

- `project.userId !== userId` ersetzen durch `canAccessProject`-Check

### Integration: createProject

- `src/lib/db/queries/projects.ts` `createProject()`: nach Insert auch `ensureProjectOwnerMember()` aufrufen

---

## Phase 3: Chat Sharing API

### Neue Routes

**`POST /api/chats/[chatId]/share-with`** — Chat mit User teilen

- Auth: requireAuth, muss Chat-Owner sein
- Body: `{ email }`

**`GET /api/chats/[chatId]/share-with`** — Empfaenger auflisten

- Auth: requireAuth, muss Chat-Owner sein

**`DELETE /api/chats/[chatId]/share-with/[shareId]`** — Freigabe aufheben

- Auth: requireAuth, muss Chat-Owner sein

**`GET /api/chats/shared-with-me`** — An mich geteilte Chats

- Auth: requireAuth
- Response: `[{ id, title, ownerName, ownerEmail, sharedAt }]`

### Bestehende Routes anpassen

**`GET /api/chats/[chatId]`** — Zugriff erlauben wenn via `chat_shares` oder `project_member`

**`src/app/api/chat/resolve-context.ts` (Zeile 111)**

- `existingChat.userId !== userId` ersetzen durch `canAccessChat()` mit write-Level
- Projekt-Member duerfen in eigenen Chats innerhalb des geteilten Projekts chatten

**`GET /api/chats/shared`** (`src/app/api/chats/shared/route.ts`)

- Erweitern: zusaetzlich `userSharedChatIds` (Chats die ICH mit anderen geteilt habe) zurueckgeben
- Response: `{ chatIds: [...publicShared, ...userShared] }`

**`/c/[chatId]` Page** — Chat laden auch wenn nicht Owner, aber read-only rendern wenn via chat_share

---

## Phase 4: Sidebar UI — Geteilte Projekte

**Datei: `src/components/chat/chat-sidebar-content.tsx`**

### Daten-Fetching erweitern

- `GET /api/projects` liefert jetzt auch shared projects (mit `isShared` Flag)
- Eigene + geteilte Projekte in separate State-Arrays trennen

### Neue Sektion "Geteilte Projekte"

- Unter "Meine Projekte" Accordion
- Gleiche Struktur (Collapsible, Chat-Liste pro Projekt)
- Projekt-Name + Owner-Name als Subtitle
- Kontext-Menu: "Neuer Chat" + "Bearbeiten" fuer Editors, kein "Loeschen"
- Chats im geteilten Projekt: nur eigene Chats + explizit geteilte Chats (NICHT alle Projekt-Chats)

### Badge auf eigenen Projekten

- Projekte die ich geteilt habe: Users-Icon neben dem Projekt-Namen
- Via `getProjectMembers` count > 1 (oder Flag im GET /api/projects Response)

---

## Phase 5: Sidebar UI — Geteilte Chats + Dialoge

### Neue Sektion "Mit mir geteilt"

- Unterhalb der Pinned-Section oder als eigene Gruppe
- Fetch via `GET /api/chats/shared-with-me`
- Chat-Title + Owner-Name
- Klick oeffnet Chat in read-only Modus

### Chat Read-Only Modus

- `/c/[chatId]` erkennt via `canAccessChat` ob Owner oder Shared
- Wenn shared (via chat_share): PromptInput ausblenden, Banner "Von [Name] geteilt — nur Ansicht"
- Wenn shared (via project_member): Voller Zugriff (Chat gehoert dem Projekt, User chattet unter eigener userId)

### Chat-Header Hinweise

- Empfangene Chat-Shares: "Geteilt von [Name]" dezenter Hinweis
- Projekt-Chats: Projekt-Badge im Header

### UserShareDialog (neu)

**`src/components/chat/user-share-dialog.tsx`**

- Email-Input + "Teilen" Button
- Liste der Empfaenger mit Entfernen-Button
- Eigenes Kontext-Menu Item: "Mit Nutzer teilen" (neben bestehendem "Link teilen")

### ProjectMembers-Komponente (neu, wiederverwendbar)

**`src/components/shared/project-members.tsx`**

- Eigenstaendige Komponente, NICHT fest in einen Dialog verdrahtet
- Email-Input + "Einladen" Button
- Member-Liste: Name, Email, Rolle, Entfernen-Button
- Owner sieht alle Aktionen, Editors sehen Member-Liste read-only
- Props: `projectId`, `isOwner`, `onMemberChange?`

**Grund:** Die Workspace-PRD (`docs/prd-user-workspace.md`) plant die Projektverwaltung von Sidebar-Dialogen nach `/workspace/projects` zu verschieben. Wenn die Member-Verwaltung als eigenstaendige Komponente gebaut wird, kann sie sowohl im aktuellen `project-settings-dialog.tsx` als auch spaeter auf der Workspace-Page wiederverwendet werden. Kein Throwaway-Code.

### ProjectSettingsDialog erweitern

**`src/components/chat/project-settings-dialog.tsx`**

- Neuer Tab/Section "Mitglieder" — bindet `<ProjectMembers />` ein
- Member-Liste: Name, Email, Rolle, Entfernen-Button

### Share-Badges in Sidebar

- Chats mit User-Shares: Users-Icon (zusaetzlich zu bestehendem Share2-Icon fuer Public Links)

---

## Phase 6: Polish & Edge Cases

- Loading States fuer Member-Listen und Share-Dialoge
- Error Handling: "Nutzer nicht gefunden" wenn Email nicht in Instanz registriert
- Cascade-Tests: Projekt loeschen -> project_members werden geloescht (FK CASCADE)
- Chat loeschen -> chat_shares werden geloescht (FK CASCADE)
- Shared-Project Chat: Credits korrekt dem Chat-Creator belastet
- Public Share + User Share am gleichen Chat: beide unabhaengig
- touchChat() fuer Projekt-Member: Chat erscheint aktuell in Sidebar nach Interaktion

---

## Risikobewertung

| Risiko                                     | Schwere         | Mitigierung                                                                      |
| ------------------------------------------ | --------------- | -------------------------------------------------------------------------------- |
| Access-Check vergessen an 1 von 28 Stellen | **Hoch**        | Zentraler `canAccessChat()`/`canAccessProject()` Helper. Checkliste abarbeiten.  |
| Projekt-Chat-Sichtbarkeit leckt Daten      | **Hoch**        | Explizite Query: nur eigene Chats + explizit geteilte. Kein projekt-weiter Scan. |
| resolve-context.ts fehlerhaft              | **Hoch**        | Manueller Test mit 2 Accounts: Owner + Member                                    |
| Sidebar Performance (4 Queries)            | **Mittel**      | Parallel fetchen oder kombinierter Endpoint                                      |
| Email-Enumeration                          | **Kein Risiko** | Geschlossene Instanzen, konkrete Meldung gewollt                                 |

### Gesamteinschaetzung

| Dimension                    | Bewertung                                                               |
| ---------------------------- | ----------------------------------------------------------------------- |
| Feature-Wert fuer Testgruppe | **Hoch** — direkt angefragtes Feature                                   |
| Implementierungsaufwand      | **Mittel** — 28 Aenderungen + 14 neue Dateien                           |
| Regressionsrisiko            | **Mittel-Hoch** — Querschnittsaenderung am Zugriffs-Modell              |
| Wartbarkeits-Impact          | **Positiv** — `access.ts` zentralisiert bisher verstreute userId-Checks |
| Architektur-Fit              | **Gut** — additive Erweiterung, kein fundamentaler Umbau                |

---

## Kritische Dateien

| Datei                                                               | Aenderung                                     |
| ------------------------------------------------------------------- | --------------------------------------------- |
| `src/lib/db/schema/project-members.ts`                              | NEU                                           |
| `src/lib/db/schema/chat-shares.ts`                                  | NEU                                           |
| `src/lib/db/schema/index.ts`                                        | Export ergaenzen                              |
| `src/lib/db/queries/access.ts`                                      | NEU (Kern-Abstraktion)                        |
| `src/lib/db/queries/project-members.ts`                             | NEU                                           |
| `src/lib/db/queries/chat-shares.ts`                                 | NEU                                           |
| `src/lib/db/queries/chats.ts`                                       | getUserChats, getChatById, touchChat          |
| `src/lib/db/queries/projects.ts`                                    | createProject, getUserProjects, updateProject |
| `src/lib/db/queries/artifacts.ts`                                   | getArtifactByIdForUser, getArtifactsByChatId  |
| `src/lib/db/queries/messages.ts`                                    | getMessageMetadata, getLastAssistantMetadata  |
| `src/lib/db/queries/project-documents.ts`                           | deleteProjectDocument                         |
| `src/lib/validations/sharing.ts`                                    | NEU                                           |
| `src/app/api/projects/[projectId]/members/route.ts`                 | NEU                                           |
| `src/app/api/projects/[projectId]/members/[memberId]/route.ts`      | NEU                                           |
| `src/app/api/chats/[chatId]/share-with/route.ts`                    | NEU                                           |
| `src/app/api/chats/[chatId]/share-with/[shareId]/route.ts`          | NEU                                           |
| `src/app/api/chats/shared-with-me/route.ts`                         | NEU                                           |
| `src/app/api/projects/route.ts`                                     | Shared Projects einbinden                     |
| `src/app/api/projects/[projectId]/route.ts`                         | Member-Access erlauben                        |
| `src/app/api/projects/[projectId]/documents/route.ts`               | Member-Access erlauben                        |
| `src/app/api/projects/[projectId]/documents/[documentId]/route.ts`  | Editor-Access erlauben                        |
| `src/app/api/chat/resolve-context.ts`                               | Zeile 105+111: canAccess-Checks               |
| `src/app/api/chats/[chatId]/route.ts`                               | GET: Shared-Chat Lesezugriff                  |
| `src/app/api/chats/shared/route.ts`                                 | User-Shares einbinden                         |
| `src/app/api/chats/[chatId]/suggestions/route.ts`                   | Member-Access                                 |
| `src/app/api/chats/[chatId]/messages/[messageId]/metadata/route.ts` | Member-Access                                 |
| `src/app/api/artifacts/[artifactId]/route.ts`                       | GET: Chat-Access statt Owner-Check            |
| `src/components/chat/chat-sidebar-content.tsx`                      | Neue Sektionen                                |
| `src/components/chat/user-share-dialog.tsx`                         | NEU                                           |
| `src/components/chat/project-settings-dialog.tsx`                   | Member-Section                                |
| `src/components/chat/chat-view.tsx`                                 | Read-only Modus                               |
| `src/components/chat/chat-header.tsx`                               | Share-Hinweise                                |
| `src/components/chat/prompt-input.tsx`                              | Ausblenden bei Read-only                      |

---

## Verifikation

1. **DB**: `pnpm db:generate` + `pnpm db:push` — Migration laeuft ohne Fehler
2. **Data Migration**: Bestehende Projekte haben Owner als project_member
3. **Projekt teilen**: Owner teilt Projekt -> Member sieht es in "Geteilte Projekte" -> Member kann eigenen Chat erstellen -> Owner sieht Members Chat NICHT (nur wenn explizit geteilt)
4. **Chat teilen**: Owner teilt Chat per Email -> Empfaenger sieht Chat in "Mit mir geteilt" -> Read-only Ansicht funktioniert
5. **Chat in Projekt teilen**: Member teilt eigenen Chat im Projekt mit anderem Member -> erscheint bei dem unter dem Projekt
6. **Loeschen**: Member kann Projekt nicht loeschen -> nur Owner kann
7. **Projekt-Wechsel**: Nur Owner kann Chat in anderes Projekt verschieben
8. **Public Share**: Bestehendes Token-Sharing funktioniert weiterhin parallel
9. **Credits**: Chat in geteiltem Projekt -> Credits werden dem Chat-Creator belastet
10. **Build**: `pnpm build` laeuft ohne Fehler
