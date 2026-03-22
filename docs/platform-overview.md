# Plattform-Dokumentation — Technische Interna

> Arbeitsgrundlage für die Entwicklung neuer Module auf der bestehenden Plattform. Beschreibt Architektur, Implementierungsdetails, Dateistruktur und Integrationsschnittstellen.

---

## Plattform auf einen Blick

AI Chat Plattform mit Chat-Persistenz, Streaming, Artifact-System, Expert-System und Memory. Vergleichbar mit ChatGPT/Claude.ai, aber self-hosted und konfigurierbar. Multi-Instanz-fähig über Feature-Flags und Environment-Variablen.

**Tech Stack:** Next.js 16 (App Router), TypeScript Strict, Tailwind CSS v4 + shadcn/ui, Vercel AI SDK, Vercel AI Gateway, Neon Postgres + Drizzle ORM, Logto Auth (OIDC), Cloudflare R2, Mem0 Cloud, Firecrawl, Vercel Deployment.

**Status:** 10 Meilensteine implementiert (Chat, Models, Artifacts, Experts, Skills/Quicktasks, File Upload, Projekte, MCP, Memory, Credits, Business Mode).

---

## Dateistruktur

### Übersicht

```
src/
├── app/                          # Routing + Layouts (minimal Logic)
│   ├── page.tsx                  # Landing Page (public) oder Chat (authenticated)
│   ├── c/[chatId]/page.tsx       # Bestehenden Chat laden
│   ├── artifacts/page.tsx        # Artifacts-Übersicht
│   ├── admin/                    # Admin-UI (skills, experts, models, mcp-servers, credits)
│   └── api/                      # REST API (siehe Route-Tabelle unten)
│
├── components/
│   ├── chat/                     # Chat-Core (View, Messages, Empty-State, Sidebar, Header)
│   ├── assistant/                # Artifact UI (Panel, Card, Editor, Previews, Renderers)
│   ├── generative-ui/            # Interaktive Inline-Tools (AskUser, ContentAlternatives)
│   ├── admin/                    # Admin CRUD-Oberflächen
│   ├── layout/                   # App-Shell (Sidebar, Header, NavUser, CreditIndicator)
│   ├── ai-elements/              # AI Elements (wie shadcn/ui — nicht manuell ändern)
│   └── ui/                       # shadcn/ui Primitives (nicht manuell ändern)
│
├── lib/
│   ├── ai/tools/                 # 12 AI Tool-Definitionen (create-artifact, ask-user, web-search etc.)
│   ├── ai/skills/                # Skill Discovery (DB), Parser, Template-Renderer
│   ├── db/schema/                # Drizzle Schema (13 Tabellen)
│   ├── db/queries/               # DB Query-Funktionen (CRUD pro Domain)
│   ├── db/seed/                  # Default Experts, Models, Skills
│   ├── search/                   # Provider-agnostische Search-Abstraktion
│   ├── storage/                  # R2-Client, Upload-Validierung
│   ├── memory/                   # Mem0 Integration (Search, Save, Circuit Breaker)
│   ├── mcp/                      # MCP Client (Verbindung, Tool-Discovery, Merge)
│   ├── pii/                      # PII-Erkennung + Maskierung (9 Entity-Typen)
│   ├── web/                      # Firecrawl-Client (Search, Scrape, Crawl, Extract)
│   ├── auth.ts                   # getUser() + getUserFull() Helper
│   ├── api-guards.ts             # requireAuth(), requireAdmin() Middleware
│   ├── credits.ts                # Credit-Berechnung (Token → Credits)
│   ├── rate-limit.ts             # In-Memory Rate Limiter
│   └── url-validation.ts         # SSRF-Schutz
│
├── config/
│   ├── features.ts               # Feature-Flags (12 Flags, opt-in/opt-out)
│   ├── prompts.ts                # System-Prompt Assembly (8 Layer)
│   ├── models.ts                 # Model-Registry (DB + ENV Fallback, 60s Cache)
│   ├── mcp.ts                    # MCP-Server Config (DB + ENV Fallback)
│   ├── ai.ts                     # AI SDK Defaults
│   ├── brand.ts                  # Brand-Farben/URLs
│   ├── business-mode.ts          # PII-Mode, Privacy Models
│   ├── chat.ts                   # Chat-Settings
│   └── memory.ts                 # Mem0 Config
│
├── hooks/
│   ├── use-artifact.ts           # Artifact-State, Detection, Save, Version-Conflict
│   ├── use-business-mode.ts      # Business Mode State + PII-Check
│   ├── use-keyboard-shortcuts.ts # Keyboard Handling
│   └── use-mobile.ts             # Responsive Detection
│
└── types/
    ├── artifact.ts               # ArtifactContentType
    ├── expert.ts                  # Expert, CreateExpertInput
    ├── project.ts                 # Project Interfaces
    ├── quiz.ts                    # Quiz Interfaces
    └── review.ts                  # Review Interfaces
```

### API-Routen (vollständig)

**Chat-Core:**

| Route                                               | Methode            | Funktion                                     |
| --------------------------------------------------- | ------------------ | -------------------------------------------- |
| `/api/chat`                                         | POST               | Haupt-Chat-Endpoint (Streaming + Persistenz) |
| `/api/chats`                                        | GET, POST          | Chat-Liste, neuen Chat anlegen               |
| `/api/chats/[chatId]`                               | GET, PATCH, DELETE | Chat lesen, updaten (Title, Pin), löschen    |
| `/api/chats/[chatId]/suggestions`                   | GET                | Reply-Vorschläge generieren                  |
| `/api/chats/[chatId]/messages/[messageId]/metadata` | GET, PATCH         | Message-Metadaten                            |
| `/api/models`                                       | GET                | Model-Registry (aktive Models + Gruppen)     |

**Artifacts:**

| Route                         | Methode    | Funktion                                    |
| ----------------------------- | ---------- | ------------------------------------------- |
| `/api/artifacts`              | POST       | Artifact anlegen (Legacy)                   |
| `/api/artifacts/[artifactId]` | GET, PATCH | Lesen, Content updaten (Optimistic Locking) |

**Experts & Skills:**

| Route                     | Methode            | Funktion                     |
| ------------------------- | ------------------ | ---------------------------- |
| `/api/experts`            | GET, POST          | Expert-Liste, Expert anlegen |
| `/api/experts/[expertId]` | GET, PATCH, DELETE | Expert CRUD                  |
| `/api/skills/quicktasks`  | GET                | Quicktask-Metadaten (public) |

**Projekte:**

| Route                                              | Methode            | Funktion                       |
| -------------------------------------------------- | ------------------ | ------------------------------ |
| `/api/projects`                                    | GET, POST          | Projekt-Liste, Projekt anlegen |
| `/api/projects/[projectId]`                        | GET, PATCH, DELETE | Projekt CRUD                   |
| `/api/projects/[projectId]/documents`              | GET, POST          | Projekt-Dokumente              |
| `/api/projects/[projectId]/documents/[documentId]` | GET, DELETE        | Dokument CRUD                  |

**User-Einstellungen & Memory:**

| Route                           | Methode     | Funktion                                          |
| ------------------------------- | ----------- | ------------------------------------------------- |
| `/api/user/instructions`        | GET, PATCH  | Default-Model, Custom Instructions, Memory-Toggle |
| `/api/user/memories`            | GET, DELETE | Memory-Liste (+ Export), Alle löschen             |
| `/api/user/memories/[memoryId]` | DELETE      | Einzelne Memory löschen                           |

**Credits:**

| Route          | Methode | Funktion                           |
| -------------- | ------- | ---------------------------------- |
| `/api/credits` | GET     | Balance + Transactions (paginiert) |

**Storage:**

| Route               | Methode     | Funktion                           |
| ------------------- | ----------- | ---------------------------------- |
| `/api/upload`       | POST        | File-Upload (FormData → R2)        |
| `/api/upload/[key]` | GET, DELETE | Signed Download URL, Datei löschen |

**Web-Services:**

| Route                   | Methode   | Funktion                       |
| ----------------------- | --------- | ------------------------------ |
| `/api/web/search`       | POST      | Websuche                       |
| `/api/web/scrape`       | POST      | URL scrapen                    |
| `/api/web/crawl`        | POST, GET | Crawl starten, Status abfragen |
| `/api/web/batch-scrape` | POST      | Batch-Scraping                 |
| `/api/web/extract`      | POST      | Strukturierte Extraktion       |

**Business Mode:**

| Route                          | Methode | Funktion        |
| ------------------------------ | ------- | --------------- |
| `/api/business-mode/status`    | GET     | Feature-Status  |
| `/api/business-mode/pii-check` | POST    | PII-Erkennung   |
| `/api/business-mode/redact`    | POST    | PII-Maskierung  |
| `/api/business-mode/consent`   | POST    | Consent-Logging |

**Admin (alle mit `requireAdmin`-Guard):**

| Route                                                    | Methode                 | Funktion                         |
| -------------------------------------------------------- | ----------------------- | -------------------------------- |
| `/api/admin/skills`                                      | GET, POST               | Skills-Liste + Import (SKILL.md) |
| `/api/admin/skills/[id]`                                 | GET, PUT, PATCH, DELETE | Skill CRUD                       |
| `/api/admin/experts`                                     | GET, POST               | Experts-Liste + Import (JSON)    |
| `/api/admin/experts/[id]`                                | GET, PUT, PATCH, DELETE | Expert CRUD                      |
| `/api/admin/models`                                      | GET, POST               | Models-Liste + Import (JSON)     |
| `/api/admin/models/[id]`                                 | GET, PATCH, PUT, DELETE | Model CRUD                       |
| `/api/admin/mcp-servers`                                 | GET, POST               | MCP-Server-Liste + Import (JSON) |
| `/api/admin/mcp-servers/[id]`                            | GET, PATCH, PUT, DELETE | MCP-Server CRUD                  |
| `/api/admin/mcp-servers/[id]/health`                     | POST                    | Health-Check                     |
| `/api/admin/credits`                                     | GET, POST               | User-Balances, Credit-Grant      |
| `/api/admin/export/skills\|experts\|models\|mcp-servers` | GET                     | Bulk-Export                      |

**Auth:**

| Route                | Methode   | Funktion                      |
| -------------------- | --------- | ----------------------------- |
| `/api/auth/sign-in`  | GET, POST | Logto Sign-In Redirect        |
| `/api/auth/sign-out` | POST      | Sign-Out                      |
| `/api/auth/callback` | GET       | Logto Callback (Code → Token) |

---

## Chat-Route — Der zentrale Orchestrator

Die Chat-Route (`src/app/api/chat/route.ts`) ist ein schlanker Orchestrator (~120 Zeilen). Die Logik ist in 4 Module aufgeteilt:

### Request-Flow

```
User-Nachricht
  │
  ├─ 1. requireAuth()              → 401 wenn ungültig
  ├─ 2. Rate Limit Check           → 429 bei Überschreitung
  ├─ 3. Body-Validierung           → Zod Schema, 5MB Limit, MIME-Check
  ├─ 4. Credit-Check               → 402 bei Balance <= 0
  │
  ├─ 5. resolveContext()            → ChatContext (parallel)
  │     ├─ getChatById() oder createChat()
  │     ├─ getExpertById()
  │     ├─ discoverSkills() [60s Cache]
  │     ├─ getModels() [Cache Warmup]
  │     ├─ getMcpServers() [Cache Warmup]
  │     ├─ searchMemories() [Race: 3s Timeout]
  │     └─ buildSystemPrompt() [8 Layer]
  │
  ├─ 6. buildModelMessages()       → AI SDK Format
  │     ├─ Part-Filtering
  │     ├─ convertToModelMessages
  │     └─ Cache Control (Anthropic)
  │
  ├─ 7. buildTools()               → Tool-Registry
  │     ├─ Built-in Tools registrieren
  │     ├─ MCP-Server verbinden [5s Timeout pro Server]
  │     └─ Expert-Allowlist anwenden
  │
  ├─ 8. streamText()               → AI SDK Streaming
  │     ├─ Gateway oder Privacy Provider
  │     └─ Model-Parameter aus Context
  │
  └─ 9. onFinish (persist.ts)      → Nachgelagerte Verarbeitung
        ├─ Message in DB speichern
        ├─ Usage loggen (Tokens)
        ├─ Credits abziehen [atomar]
        ├─ Title generieren (erster Chat)
        ├─ Memories extrahieren [fire-and-forget]
        └─ MCP Handle schließen
```

### System-Prompt Assembly (8 Layer)

Der System-Prompt wird in `src/config/prompts.ts` schichtweise zusammengebaut. Jeder Layer ist optional:

| Layer                      | Quelle                                              | Bedingung                                 |
| -------------------------- | --------------------------------------------------- | ----------------------------------------- |
| 1. Expert-Persona          | `expert.systemPrompt` oder Default                  | Immer                                     |
| 2. Artifact-Instruktionen  | Statisch (wann create_artifact, create_quiz etc.)   | Immer                                     |
| 3. Web-Tools               | Hinweise zu web_search, web_fetch                   | Wenn `features.search.enabled`            |
| 4. MCP-Tools               | Liste externer Tools                                | Wenn MCP-Tools vorhanden                  |
| 5. Skills/Quicktask/Wrapup | Skill-Übersicht ODER Quicktask-Template ODER Wrapup | Gegenseitig exklusiv                      |
| 6. Memory-Kontext          | Relevante Memories aus früheren Chats               | Wenn Memories gefunden (max 4000 Zeichen) |
| 7. Projekt-Kontext         | Projekt-Instruktionen + Dokumente                   | Wenn Chat einem Projekt zugeordnet        |
| 8. Custom Instructions     | User-Einstellungen                                  | Wenn gesetzt (höchste Priorität)          |

### Model-Auflösung (Prioritätskette)

1. `quicktaskMeta.modelId` (Skill-Frontmatter)
2. `expert.modelPreference` (Expert-Konfiguration)
3. `userPrefs.defaultModelId` (User-Einstellung)
4. `aiDefaults.model` (System-Default)

Temperatur folgt derselben Kette.

### Tool-Registry

Registriert in `src/app/api/chat/build-tools.ts`:

| Tool                   | Typ                     | Bedingung                                                    |
| ---------------------- | ----------------------- | ------------------------------------------------------------ |
| `create_artifact`      | Factory(chatId)         | Immer                                                        |
| `create_quiz`          | Factory(chatId)         | Immer                                                        |
| `create_review`        | Factory(chatId)         | Immer                                                        |
| `ask_user`             | Singleton               | Immer                                                        |
| `content_alternatives` | Singleton               | Immer                                                        |
| `web_search`           | Factory                 | Wenn `features.search.enabled`                               |
| `web_fetch`            | Factory                 | Wenn `features.search.enabled`                               |
| `save_memory`          | Factory(userId)         | Wenn `features.memory.enabled` + User-Opt-in                 |
| `recall_memory`        | Factory(userId)         | Wenn `features.memory.enabled` + User-Opt-in                 |
| `generate_image`       | Factory(chatId, userId) | Wenn `features.imageGeneration.enabled` + kein Privacy-Route |
| `load_skill`           | Factory(skills)         | Wenn Skills vorhanden + kein Quicktask                       |
| MCP-Tools              | Dynamisch               | Wenn `features.mcp.enabled` + Server konfiguriert            |

Expert-Filtering: `expert.allowedTools` (Allowlist, leer = alle) und `expert.mcpServerIds` (MCP-Server-Filter).

---

## Artifact System — Implementierung

### Lebenszyklus

```
1. Model ruft create_artifact Tool auf
   → Tool-Args (title, type, content, language) streamen zum Client
   → Panel öffnet sich sofort (input-streaming State)

2. execute() speichert in DB
   → INSERT artifacts mit version=1
   → Gibt {artifactId, title, type, version} zurück

3. Client empfängt output-available State
   → artifactId verfügbar
   → Panel fetcht vollständiges Artifact aus DB

4. Nutzer editiert (optional)
   → CodeMirror Editor
   → PATCH /api/artifacts/[id] mit expectedVersion
   → Optimistic Locking: 409 bei Version-Mismatch
   → Bei Erfolg: version = version + 1
```

### Content-Typen und Rendering

| Typ        | Tool            | Rendering                 | Editor                         | Besonderheiten                           |
| ---------- | --------------- | ------------------------- | ------------------------------ | ---------------------------------------- |
| `markdown` | create_artifact | Streamdown                | CodeMirror (Markdown)          | Review-Mode Toggle                       |
| `html`     | create_artifact | Sandboxed iframe (CSP)    | CodeMirror (HTML)              | PDF-Druck via srcdoc                     |
| `code`     | create_artifact | Shiki Syntax-Highlighting | CodeMirror (sprach-spezifisch) | JS RegExp Engine, kein WASM              |
| `quiz`     | create_quiz     | QuizRenderer              | Kein Edit                      | Single/Multiple Choice, Freitext         |
| `review`   | create_review   | ReviewRenderer            | Kein Edit                      | Abschnittsweises Approve/Change/Question |
| `image`    | generate_image  | ImagePreview              | Kein Edit                      | Google Generative AI                     |

### Schlüssel-Dateien

| Datei                                          | Funktion                                                                         |
| ---------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/lib/ai/tools/create-artifact.ts`          | Tool-Definition (Factory mit chatId-Closure, Zod mit Size-Limits)                |
| `src/hooks/use-artifact.ts`                    | State-Management, Detection (real + fake), Card-Click, Save mit Version-Conflict |
| `src/components/assistant/artifact-panel.tsx`  | Side-Panel (View/Edit/Review, Download, PDF-Druck, Save, Version-Badge)          |
| `src/components/assistant/artifact-card.tsx`   | Inline-Card im Chat (klickbar, öffnet Panel)                                     |
| `src/components/assistant/artifact-editor.tsx` | CodeMirror Editor (Multi-Language, Dark-Mode)                                    |
| `src/components/assistant/html-preview.tsx`    | Sandboxed iframe (CSP Meta-Tag Injection)                                        |
| `src/components/assistant/code-preview.tsx`    | Shiki Rendering                                                                  |
| `src/components/assistant/quiz-renderer.tsx`   | Interaktives Quiz-UI                                                             |
| `src/components/assistant/review-renderer.tsx` | Abschnittsweises Review (Approve/Change/Question/Remove)                         |
| `src/lib/db/queries/artifacts.ts`              | CRUD (create, getById, getByChatId, updateContent mit Optimistic Locking)        |
| `src/lib/ai/tools/parse-fake-artifact.ts`      | Fallback für Models ohne Tool-Calling                                            |

### Split-View Layout

- Desktop: Chat 50% | Panel 50% (nebeneinander)
- Mobile: Panel als Overlay (Chat hidden)
- Ohne Artifact: Chat volle Breite

---

## Generative UI — Implementierung

### Trigger-Mechanismus (AI SDK 6)

Tools kommen als **Typed Tool Parts** am Client an:

```
type: "tool-{toolName}"   z.B. "tool-ask_user", "tool-create_artifact"
state: "input-streaming" | "input-available" | "output-available" | "output-error"
input: Record<string, unknown>   Tool-Argumente (auto-gestreamt)
output?: unknown                 Tool-Ergebnis (ab output-available)
toolCallId: string               Für addToolResult Rückkanal
```

### Detection in chat-message.tsx

Custom-gerenderte Tools werden in einem Set definiert:

```
CUSTOM_RENDERED_TOOLS = {
  "ask_user", "create_artifact", "create_quiz",
  "create_review", "content_alternatives", "generate_image"
}
```

Für jedes Tool-Part im Message-Rendering:

1. Prüfe ob `toolName` in `CUSTOM_RENDERED_TOOLS`
2. Ja → Render spezifische Komponente basierend auf Tool-Name und State
3. Nein → Render generisches `ToolStatus` Badge (Name, State, Input/Output)

### Tool-Komponenten

| Tool                   | Komponente                    | Verzeichnis      | Verhalten                                                                               |
| ---------------------- | ----------------------------- | ---------------- | --------------------------------------------------------------------------------------- |
| `ask_user`             | AskUser                       | `generative-ui/` | Pausiert Stream, rendert Radio/Checkbox/Textarea, `addToolResult` sendet Antwort zurück |
| `content_alternatives` | ContentAlternatives           | `generative-ui/` | Tab-Switcher mit 2-5 Varianten, `addToolResult` sendet Auswahl zurück                   |
| `create_artifact`      | ArtifactCard → ArtifactPanel  | `assistant/`     | Card im Chat, Panel-Öffnung auf Click, DB-Fetch bei artifactId                          |
| `create_quiz`          | ArtifactCard → QuizRenderer   | `assistant/`     | Card im Chat, Quiz im Panel                                                             |
| `create_review`        | ArtifactCard → ReviewRenderer | `assistant/`     | Card im Chat, Review im Panel                                                           |
| `generate_image`       | ArtifactCard → ImagePreview   | `assistant/`     | Card im Chat, Bild im Panel                                                             |

### Zwei Patterns

**Inline-Tools (kein execute, addToolResult Rückkanal):** `ask_user`, `content_alternatives`. Pausieren den Stream, warten auf User-Input, setzen Stream mit der Antwort fort.

**Artifact-Tools (mit execute, DB-Persistenz):** `create_artifact`, `create_quiz`, `create_review`, `generate_image`. Speichern Output in DB, rendern im Side-Panel.

### Neues Tool hinzufügen

Entwickler-Guide: `docs/generative-ui-tools-guide.md`

Kurzfassung: Tool definieren → Component in `generative-ui/` oder `assistant/` → `CUSTOM_RENDERED_TOOLS` Set erweitern → Rendering-Branch in `chat-message.tsx` → ggf. Detection in `use-artifact.ts`.

---

## Expert System — Implementierung

### Architektur

Expert = Persona (systemPrompt) + Verhalten (Model, Temperature, Tools) + priorisierte Skills. Experts enthalten kein dynamisches Wissen — das kommt aus Projekten und Skills.

### Schema

```
experts
├── id (nanoid text PK)
├── userId (text, nullable)          → null = global, sonst user-spezifisch
├── name, slug (unique), description, icon
├── systemPrompt (text)              → Persona-Definition
├── skillSlugs (jsonb[])             → Priorisierte Skills
├── modelPreference (text)           → Model-Override
├── temperature (jsonb)              → Temperature-Override
├── allowedTools (jsonb[])           → Tool-Allowlist (leer = alle)
├── mcpServerIds (jsonb[])           → MCP-Server-Filter (leer = alle)
├── isPublic (boolean)
├── sortOrder (integer)
└── createdAt, updatedAt
```

### Auswahl-Flow

1. **Empty-State:** Expert-Grid in `chat-empty-state.tsx`, Nutzer wählt Expert
2. **Erster Request:** `expertId` im Request-Body → Server lädt Expert
3. **Persistenz:** `chats.expertId` speichert Zuordnung
4. **Mid-Chat-Switch:** Expert-Picker Popover → neuer Expert, gleicher Chat
5. **Bestehender Chat:** Expert aus `chat.expertId` laden

### Impact auf Chat-Route

Der Expert bestimmt:

- `systemPrompt` → Layer 1 des System-Prompts
- `modelPreference` → Override in der Model-Auflösungskette
- `temperature` → Override der Default-Temperatur
- `skillSlugs` → Priorisierte Skills (⭐ im System-Prompt)
- `allowedTools` → Welche Tools die KI nutzen darf
- `mcpServerIds` → Welche MCP-Server verbunden werden

### Default Experts

6 globale Experts (userId=null, via Seed): General, Code, SEO, Analyst, Researcher, Writer.

---

## Agent Skills & Quicktasks — Implementierung

### Skills

Skills sind Markdown-basierte Wissenspakete in der DB (importiert aus `skills/*/SKILL.md`).

**Discovery:** `discoverSkills()` in `src/lib/ai/skills/discovery.ts` — DB-Query mit 60s TTL-Cache. Liefert Metadaten (Name, Slug, Beschreibung, Kategorie).

**Loading:** `load_skill` Tool (Factory mit Skills-Liste) → validiert Slug gegen verfügbare Skills → lädt Content aus DB → gibt Markdown an die KI zurück.

**Im System-Prompt:** Skills werden als Übersicht gelistet. Expert-bevorzugte Skills mit ⭐ markiert. Die KI entscheidet selbst, wann sie einen Skill laden will.

### Quicktasks

Quicktasks sind Skills mit `mode: quicktask` im Frontmatter + formularbasierten Feldern.

**Frontmatter-Felder:** `mode`, `category`, `icon`, `outputAsArtifact`, `temperature`, `modelId`, `fields` (Array mit `key`, `label`, `type`, `required`, `placeholder`, `options`).

**Template-Rendering:** `{{variable}}` und `{{variable | default: "X"}}` werden client-seitig durch Formular-Eingaben ersetzt.

**Flow:** Quicktask-Grid im Empty-State → Formular ausfüllen → Template rendern → Erste Nachricht senden → Danach normaler Chat.

---

## Wissensbasis & Context-Injection

### Aktueller Stand: Kein RAG, kein Embedding

Die Plattform nutzt **kein** RAG und keine Embedding-basierte Suche. Wissen wird über drei Mechanismen injiziert:

**1. Agent Skills (on-demand, KI-gesteuert):**
Skills werden als Übersicht im System-Prompt gelistet. Die KI entscheidet, wann sie zusätzliches Wissen braucht, und lädt es via `load_skill` Tool. Das geladene Markdown wird in den Kontext eingefügt. Experts priorisieren bestimmte Skills.

**2. Projekt-Instruktionen (statisch, pro Chat):**
Projekte haben Text-Instruktionen und optionale Dokumente. Diese werden automatisch als Layer 7 in den System-Prompt jedes zugehörigen Chats eingefügt. Kein Token-Counting, kein Chunking — der vollständige Text wird injiziert.

**3. Memory System (semantisch, pro User):**
Mem0 Cloud für semantische Suche über vergangene Chat-Inhalte. Bei jedem neuen Chat: letzte User-Nachricht als Query → Mem0 `client.search()` → Top-Ergebnisse als Layer 6 im System-Prompt (max 4000 Zeichen). Zusätzlich: Auto-Extraktion nach Chat-Ende (fire-and-forget), explizites `save_memory` und `recall_memory` Tool.

### Deferred Features

- **Project Documents + RAG:** Geplant aber nicht implementiert. Schema `project_documents` existiert, aber ohne Embedding/Vektor-Suche.
- **Volltextsuche über Chats:** Nicht implementiert.

---

## Auth & Multi-Tenancy

### Authentifizierung

**Provider:** Logto (OIDC, gehostet auf `auth.lernen.diy`). Login via E-Mail-OTP.

**Session:** Cookie-basiert (`logto_{appId}`). Next.js 16 `proxy.ts` (ersetzt middleware.ts) prüft Session bei allen geschützten Routes.

**User-Identität:** Logto `sub` Claim = `userId` in allen DB-Tabellen. Kein eigenes User-ID-System.

**Zwei Auth-Helper:**

- `getUser()` — Nur Token-Claims, kein HTTP-Call. Für Sidebar, Header, Auth-Guards.
- `getUserFull()` — Mit HTTP-Call zu Logto. Nur für Profil-Seite.

**User-Sync:** `requireAuth()` in API-Routes ruft `ensureUserExists()` auf — Upsert des Users in der lokalen DB beim ersten API-Call.

**Dev-Bypass:** Wenn `LOGTO_APP_ID` nicht gesetzt → alles frei zugänglich.

### Multi-Tenancy: Nicht implementiert

**Die App ist Single-Tenant pro Deployment.** Es gibt kein Org/Workspace/Tenant-Konzept.

- Alle Daten sind per-User (userId-Scoping in jeder Query)
- Kein Mandanten-Schema, keine Mandanten-Trennung
- Globale Experts und Skills gelten für alle User der Instanz
- Admin-Zugang via E-Mail-Allowlist (`ADMIN_EMAILS` ENV)

**Multi-Instanz statt Multi-Tenancy:** Die Plattform wird pro Kunde/Brand als separate Vercel-Instanz deployed. Jede Instanz hat eigene ENV-Variablen, eigene DB, eigene Logto-App. Die Codebasis ist identisch, Feature-Flags und Branding unterscheiden sich.

### Users-Schema

```
users
├── id (uuid PK)                    → Internes PK, NICHT für Scoping verwendet
├── logtoId (text, unique)          → Logto sub Claim = userId in allen anderen Tabellen
├── email, name, avatarUrl
├── customInstructions (text)       → User-Einstellungen
├── defaultModelId (text)           → Bevorzugtes Model
├── memoryEnabled (boolean)         → Memory-Toggle
├── suggestedRepliesEnabled (boolean)
├── creditsBalance (integer)        → Credit-Guthaben (atomare SQL-Updates)
└── createdAt, updatedAt
```

---

## Datenbank-Schema (Übersicht)

13 Tabellen, alle mit nanoid (12 Zeichen) Text-PKs (außer users mit uuid):

| Tabelle               | Funktion                    | Wichtige Relationen                                |
| --------------------- | --------------------------- | -------------------------------------------------- |
| `users`               | User-Profil + Einstellungen | logtoId = userId überall                           |
| `chats`               | Chat-Sessions               | userId, expertId (FK), projectId (FK)              |
| `messages`            | Chat-Nachrichten            | chatId (FK, cascade), parts (jsonb)                |
| `artifacts`           | Persistierte Outputs        | chatId (FK), messageId (FK), version               |
| `experts`             | KI-Personas                 | userId (nullable=global), skillSlugs, mcpServerIds |
| `skills`              | Agent Skills + Quicktasks   | slug (unique), mode, fields (jsonb)                |
| `models`              | Model-Registry              | modelId (unique), capabilities, Preise             |
| `projects`            | Arbeitsbereiche             | userId, defaultExpertId (FK)                       |
| `project_documents`   | Projekt-Dokumente           | projectId (FK)                                     |
| `mcp_servers`         | Externe Tool-Server         | serverId (unique), url, headers, envVar            |
| `usage_logs`          | Token-Tracking              | userId, chatId, alle Token-Typen                   |
| `credit_transactions` | Credit-Audit-Log            | userId, type, amount, balanceAfter                 |
| `consent_logs`        | PII-Entscheidungen          | userId, chatId, consentType, decision              |

---

## Feature-Flag-System

Zentral in `src/config/features.ts`. Drei Patterns:

| Pattern           | Features                                 | Verhalten                                     |
| ----------------- | ---------------------------------------- | --------------------------------------------- |
| **Opt-out**       | chat, mermaid, darkMode                  | Default aktiv, explizit `"false"` deaktiviert |
| **Opt-in Server** | web, search, storage, mcp, admin, memory | Aktiv wenn API-Key/ENV gesetzt                |
| **Opt-in Client** | businessMode, credits, imageGeneration   | `NEXT_PUBLIC_` Prefix, Build-Zeit             |

| Flag                      | Gate                                      | Default |
| ------------------------- | ----------------------------------------- | ------- |
| `chat.enabled`            | `NEXT_PUBLIC_CHAT_ENABLED !== "false"`    | Aktiv   |
| `mermaid.enabled`         | `NEXT_PUBLIC_MERMAID_ENABLED !== "false"` | Aktiv   |
| `darkMode.enabled`        | `NEXT_PUBLIC_DARK_MODE !== "false"`       | Aktiv   |
| `web.enabled`             | `FIRECRAWL_API_KEY` gesetzt               | Inaktiv |
| `search.enabled`          | Mindestens ein Search-Provider-Key        | Inaktiv |
| `storage.enabled`         | `R2_ACCESS_KEY_ID` gesetzt                | Inaktiv |
| `mcp.enabled`             | `MCP_ENABLED` gesetzt                     | Inaktiv |
| `admin.enabled`           | `ADMIN_EMAILS` gesetzt                    | Inaktiv |
| `memory.enabled`          | `MEM0_API_KEY` gesetzt                    | Inaktiv |
| `businessMode.enabled`    | `NEXT_PUBLIC_BUSINESS_MODE === "true"`    | Inaktiv |
| `credits.enabled`         | `NEXT_PUBLIC_CREDITS_ENABLED === "true"`  | Inaktiv |
| `imageGeneration.enabled` | `GOOGLE_GENERATIVE_AI_API_KEY` gesetzt    | Inaktiv |

---

## Komponenten-Architektur (Chat-UI)

```
ChatShell (Server Component)
├── SidebarProvider + ChatSidebar
│   ├── SidebarLogo + NewChat-Button
│   ├── Search Input (client-seitig)
│   ├── ChatSidebarContent (Pinned + Chronologie + Projekte)
│   └── NavUser (Settings, Admin-Link, Logout)
│
├── ChatHeader (Title, Expert-Badge, Projekt-Badge, CreditIndicator)
│
└── ChatView (Client Component) — Split-View wenn Artifact offen
    ├── Chat-Column (50% oder 100%)
    │   ├── Conversation + ConversationContent
    │   │   ├── Message + MessageContent + MessageResponse (Streamdown)
    │   │   ├── ArtifactCard (bei tool-create_artifact Parts)
    │   │   ├── AskUser / ContentAlternatives (Generative UI)
    │   │   ├── ToolStatus (generische Tools)
    │   │   └── ChatEmptyState (Expert-Grid + Quicktask-Grid)
    │   └── PromptInput + SpeechButton + Attachments
    │
    └── ArtifactPanel (50%, optional)
        ├── Header (Title, Version-Badge, Save/Edit/Copy/Download)
        ├── View: HtmlPreview | Streamdown | CodePreview | QuizRenderer | ReviewRenderer
        └── Edit: ArtifactEditor (CodeMirror)
```

---

## Memory System — Implementierung

### Architektur

Mem0 Cloud (`mem0ai` npm) als externer Service. Flacher Memory-Pool pro User (kein Expert-Scoping). Semantische Suche, nicht keyword-basiert.

### 5 Mechanismen

| Mechanismus            | Trigger                                     | Dateien                                              |
| ---------------------- | ------------------------------------------- | ---------------------------------------------------- |
| **Auto-Retrieval**     | Neuer Chat: letzte User-Nachricht als Query | `resolve-context.ts` → `searchMemories()`            |
| **Auto-Extraktion**    | Chat-Ende mit ≥6 Messages                   | `persist.ts` → `extractMemories()` (fire-and-forget) |
| **save_memory Tool**   | KI speichert explizit auf User-Wunsch       | `src/lib/ai/tools/save-memory.ts`                    |
| **recall_memory Tool** | KI sucht on-demand mitten im Chat           | `src/lib/ai/tools/recall-memory.ts`                  |
| **Management UI**      | User verwaltet Memories manuell             | `memory-management-dialog.tsx` + API-Routes          |

### Schutzmaßnahmen

- **3-Ebenen Gate:** Feature-Flag → User-Toggle → minMessages-Schwelle
- **Circuit Breaker:** 5 Failures → 5 Minuten Cooldown → Graceful Degradation
- **Timeout:** 3s Race-Condition — Chat funktioniert bei Mem0-Ausfall normal weiter
- **Token-Budget:** Max 4000 Zeichen für Memory-Kontext im Prompt

---

## MCP Integration — Implementierung

### Architektur

Die Plattform ist MCP-Client. Server werden ausschließlich von Admins kuratiert.

**Verbindungs-Flow:**

1. `build-tools.ts` lädt aktive MCP-Server aus DB (gefiltert nach Expert)
2. `connectMCPServers()` verbindet parallel zu allen Servern (5s Timeout)
3. Tool-Discovery: Alle Tools werden mit `{serverId}__` prefixed
4. Tools werden mit Built-in Tools gemerged (Kollisionsschutz)
5. `mcpHandle.close()` im `onFinish` finally-Block

### Server-Schema

```
mcp_servers
├── serverId (text, unique)          → Slug = Tool-Prefix
├── name, description
├── url (text)                       → Endpoint (${VAR} Interpolation)
├── transport ("sse" | "http")
├── headers (jsonb)                  → Auth-Headers mit ${VAR}
├── envVar (text)                    → Opt-in Gate (nur aktiv wenn ENV gesetzt)
├── enabledTools (jsonb)             → null = alle, string[] = Allowlist
├── isActive (boolean)
└── sortOrder
```

### Expert-Integration

- `expert.mcpServerIds` → Welche Server für diesen Expert aktiv (leer = alle)
- `expert.allowedTools` → Welche Tools (inkl. MCP-prefixed) erlaubt (leer = alle)

---

## Business Mode — Implementierung

Opt-in Datenschutz-Modus (`NEXT_PUBLIC_BUSINESS_MODE=true`).

### PII-Erkennung

9 Entity-Typen via Regex in `src/lib/pii/`: E-Mail, IBAN (mit ibantools-Prüfziffer), Kreditkarte, Telefon DE, Steuer-ID (mit Validierung), SVN, PLZ+Ort, IP, URL.

### Privacy-Routing

Client sendet `privacyRoute` im Request-Body. Chat-Route nutzt `resolvePrivacyModel()`:

- `"eu"` → `@ai-sdk/mistral` mit Mistral-Modell (EU-gehostet)
- `"local"` → `@ai-sdk/openai-compatible` mit lokalem Modell (Ollama/vLLM)
- Kein Privacy-Route → normaler Gateway-Flow

### Consent-Logging

Alle PII-Entscheidungen in `consent_logs` Tabelle (immutable Audit-Trail): userId, chatId, consentType, decision, piiFindings, routedModel.

---

## Credit System — Implementierung

Opt-in (`NEXT_PUBLIC_CREDITS_ENABLED=true`). Pay-as-you-go, Admin-Grant.

### Formel

```
credits = max(1, ceil(
  (inputTokens * inputPrice + outputTokens * outputPrice +
   reasoningTokens * outputPrice - cachedInputTokens * inputPrice * 0.9)
  / 1M * CREDITS_PER_DOLLAR
))
```

- `CREDITS_PER_DOLLAR`: 100.000 (ENV-konfigurierbar)
- Minimum: 1 Credit pro Request
- Fallback-Preise wenn Model keine Preisdaten hat

### Verhalten

- **Pre-flight:** Balance-Check vor `resolveContext()` → 402 bei <= 0
- **Deduktion:** Awaited nach Usage-Logging, atomar via `db.transaction()`
- **Soft Block:** Laufende Requests dürfen ins Negative

### Nicht bepreist

Title Generation, Memory-Operationen, Web-Suche, MCP-Aufrufe (in Marge einkalkuliert).

---

## Sicherheit

| Bereich               | Maßnahme                                                                     |
| --------------------- | ---------------------------------------------------------------------------- |
| **Auth**              | Logto OIDC, Cookie-basiert, proxy.ts Guard                                   |
| **Autorisierung**     | userId-Scoping in allen Queries, requireAdmin Guard                          |
| **HTTP Headers**      | X-Frame-Options, HSTS, CSP, Referrer-Policy (automatisch via next.config.ts) |
| **CSP**               | Kein unsafe-eval, HTML-Artifacts in Sandbox                                  |
| **Rate Limiting**     | 10-60 req/min pro Endpoint (In-Memory)                                       |
| **Input-Validierung** | Zod-Schemas, chatId-Format, Message-Limits (2000 Zeichen, 50 Messages)       |
| **SSRF**              | URL-Allowlist für web_fetch                                                  |
| **File Upload**       | MIME-Allowlist, Extension-Blocklist, 10MB Limit                              |
| **Credits**           | Atomare DB-Transaktionen, kein Inconsistency-Risiko                          |
| **PII**               | Business Mode (opt-in), Consent-Audit-Trail                                  |
| **Artifact Sandbox**  | iframe sandbox="allow-scripts", CSP Meta-Tag Injection, kein Netzwerkzugriff |

---

## Zusammenspiel der Systeme

Drei unabhängige Kontext-Achsen, frei kombinierbar:

**Expert** (Wer) → Persona, Model, Temperature, Tool-Filter, Skills-Priorisierung
**Projekt** (Wo) → Arbeitskontext, Instruktionen, Dokumente
**Skills** (Was) → On-demand Fachwissen, KI-gesteuert

Der System-Prompt wird schichtweise aus diesen Achsen + übergreifenden Systemen zusammengebaut. Jeder Layer ist optional:

```
Expert-Persona → Artifact-Instruktionen → Web-Tools → MCP-Tools
→ Skills-Übersicht → Memory-Kontext → Projekt-Instruktionen → Custom Instructions
```

Übergreifende Systeme:

- **Memory** reichert jeden Chat mit Wissen aus vergangenen Sessions an
- **Business Mode** prüft Nachrichten auf PII und bietet Datenschutz-Routing
- **Credits** bepreist jeden Request basierend auf Token-Verbrauch
- **MCP-Server** erweitern die Tool-Palette um externe Fähigkeiten
