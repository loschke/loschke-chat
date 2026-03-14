# CLAUDE.md

> Projektkontext für Claude Code. Dieses Dokument beschreibt Architektur, Konventionen und Hintergrund des Projekts.

---

## Projekt-Überblick

**Repository:** `loschke-chat`
**Zweck:** AI Chat Plattform (wie Claude.ai/ChatGPT) mit Chat-Persistenz, Sidebar-History und Streaming.
**Status:** M5 File Upload & Multimodal Chat abgeschlossen. Nächster Schritt: M6 Projekte MVP.
**Roadmap:** 9 Meilensteine (M1: Foundation, M2: Chat Features, M3: Artifacts, M4: Experts, M5: File Upload & Multimodal, M6: Projekte MVP, M7: MCP Integration, M8: Business Mode, M9: Monetarisierung). Details in `docs/PRD-ai-chat-platform.md`.

### Architektur

- `/` — Landing Page (unauthenticated) oder Chat-Interface (authenticated)
- `/c/[chatId]` — Bestehenden Chat laden
- `/api/chat` — Unified Chat API (streaming + DB-Persistenz)
- `/api/chats` — Chat-History CRUD
- `/api/models` — Model-Registry (GET, DB-backed mit ENV-Fallback)
- `/api/artifacts/[artifactId]` — Artifact GET + PATCH (Content-Update mit Version-Bump)
- `/api/experts` — Expert-Registry CRUD (GET list, POST create)
- `/api/experts/[expertId]` — Expert GET + PATCH + DELETE
- `/api/admin/skills` — Admin Skills CRUD + Import (SKILL.md)
- `/api/admin/experts` — Admin Experts CRUD + Import (JSON)
- `/api/admin/export/skills|experts` — Bulk-Export
- Auth über Logto, DB über Neon, Storage über R2 (optional), Admin über ADMIN_EMAILS ENV

---

## Recherche-Pflicht (WICHTIG)

**Bevor Workarounds gebaut werden, IMMER zuerst die Docs konsultieren.**

### Wann recherchieren?

1. **Zu Beginn jedes größeren Features** — context7 MCP für die relevanten Libraries abfragen
2. **Bei unerwarteten Type-Errors oder fehlenden APIs** — sofort recherchieren, nicht raten
3. **Bei Unsicherheit über API-Patterns** — lieber einmal zu viel nachschlagen als einen Workaround bauen

### Wie recherchieren?

1. **Context7 MCP** (primär): `resolve-library-id` → `query-docs` für:
   - AI SDK: `/vercel/ai` oder `/websites/ai-sdk_dev`
   - Next.js: `/vercel/next.js`
   - Drizzle ORM: entsprechende Library-ID
   - Jede Library wo die korrekte API unklar ist
2. **Documentation References** (unten): URLs für alle Stack-Komponenten
3. **User fragen**: Wenn weder context7 noch Docs die Antwort liefern, den User um Hilfe bitten statt einen Workaround zu bauen

### Antiregel

**NIEMALS** eine unbekannte API erraten und dann einen Workaround bauen, wenn der erste Versuch fehlschlägt. Das kostet mehr Zeit als 30 Sekunden Recherche.

---

## Tech Stack

| Komponente | Technologie                         | Hinweise                                           |
| ---------- | ----------------------------------- | -------------------------------------------------- |
| Framework  | **Next.js 16** (App Router)         | Immer App Router, kein Pages Router                |
| Sprache    | **TypeScript**                      | Strict mode, keine `any` Types                     |
| Styling    | **Tailwind CSS v4** + **shadcn/ui** | Light + Dark Mode via next-themes                  |
| Auth       | **Logto** (`@logto/next`)           | OIDC, Server Actions Pattern                       |
| Datenbank  | **Neon** (Serverless Postgres)      | Via **Drizzle ORM**                                |
| Storage    | **Cloudflare R2**                   | S3-kompatible API, `@aws-sdk/client-s3`            |
| Web        | **Firecrawl**                       | Search, Scrape, Crawl, Extract via SDK             |
| AI SDK     | **Vercel AI SDK**                   | `useChat` + `DefaultChatTransport` für Chat         |
| Markdown   | **Streamdown** + Plugins            | Streaming-optimiert, ersetzt react-markdown         |
| AI Components | **Vercel AI Elements**           | shadcn/ui-Pattern, lokale Kopien                   |
| Deployment | **Vercel**                          | Ein Projekt pro Subdomain                          |

### Documentation References

Bei Bedarf aktuelle Docs über context7 MCP oder diese URLs abrufen:

| Komponente                  | URL / Context7 ID                                                    |
| --------------------------- | -------------------------------------------------------------------- |
| AI SDK (komplett)           | `https://ai-sdk.dev/llms.txt` · context7: `/websites/ai-sdk_dev`    |
| AI Elements                 | `https://ai-sdk.dev/elements`                                        |
| AI Gateway                  | `https://vercel.com/docs/ai-gateway`                                 |
| Streamdown                  | `https://streamdown.ai/`                                             |
| MCP in AI SDK               | `https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools`                     |
| Neon Postgres               | `https://neon.com/docs/ai/ai-rules.md`                              |
| Logto Next.js               | `https://docs.logto.io/quick-starts/next-app-router`                |
| R2 Docs                     | `https://developers.cloudflare.com/r2/`                              |
| Anthropic Skills            | `https://platform.claude.com/docs/en/build-with-claude/skills-guide` |
| Agent Skills (AI SDK)       | `https://ai-sdk.dev/cookbook/guides/agent-skills`                     |

Vollständige Referenz-Tabelle (inkl. MCP Apps, Pipedream, Composio etc.): `docs/CLAUDE.md`

---

## Coding-Konventionen

### TypeScript

- **Strict mode** aktiv. Keine `any` Types, außer in absoluten Ausnahmen mit `// eslint-disable-next-line` und Begründung.
- Interfaces für Props, Config-Objekte und API-Responses definieren.
- Zod für Runtime-Validierung von externen Daten (API Responses, Form Input).
- Utility Types (`Pick`, `Omit`, `Partial`) nutzen statt Typen zu duplizieren.

### Komponenten

- **Server Components** als Default. `"use client"` nur wenn nötig (Event Handler, Hooks, Browser APIs).
- Client Components so klein wie möglich halten. Die Server Component rendert Layout und Daten, die Client Component nur den interaktiven Teil.
- Props-Interface immer direkt über der Komponente definieren, nicht in separater Datei.
- shadcn/ui Komponenten NICHT modifizieren. Stattdessen Wrapper-Komponenten bauen die shadcn/ui Primitives zusammensetzen.

```typescript
// ✅ Gut: Wrapper um shadcn/ui
function AppButton({ children, ...props }: ButtonProps) {
  return <Button variant="outline" size="sm" {...props}>{children}</Button>;
}

// ❌ Schlecht: shadcn/ui Quelldatei editieren
```

### Dateistruktur

- `src/app/` — Nur Routing und Layouts. Minimale Logik.
- `src/components/` — Wiederverwendbare UI-Komponenten.
- `src/components/ui/` — shadcn/ui generiert. Nicht manuell ändern.
- `src/components/ai-elements/` — AI Elements (wie shadcn/ui, nicht manuell ändern).
- `src/components/layout/` — App-Shell Komponenten (Sidebar, Header etc.).
- `src/lib/` — Utilities, DB-Client, Auth-Helper.
- `src/lib/validations/` — Shared Zod-Schemas (expert.ts — von public + admin Routes importiert).
- `src/lib/web/` — Firecrawl-Client und Types (Search, Scrape, Crawl, Extract, Map).
- `src/lib/search/` — Provider-agnostische Search-Abstraktion fuer Chat-Tools (Firecrawl, Jina, Tavily, Perplexity).
- `src/lib/storage/` — R2-Client, Upload-Validierung und Types.
- `src/lib/db/schema/` — Drizzle Schema (users, chats, messages, artifacts, usage-logs, experts, skills, models).
- `src/lib/db/queries/` — DB Query-Funktionen (chats, messages, usage, artifacts, experts, skills, models).
- `src/lib/ai/tools/` — AI Tool-Definitionen (create-artifact, parse-fake-artifact, load-skill, ask-user, web-search, web-fetch).
- `src/lib/ai/skills/` — Skill Discovery (DB-basiert), Parser, Loading und Template-Renderer.
- `src/components/admin/` — Admin-UI Komponenten (Skills/Experts Import, Editor, Listen).
- `src/hooks/` — Custom React Hooks (use-artifact).
- `src/components/generative-ui/` — Generative UI Komponenten (ask-user).
- `src/config/` — Konfigurationsdateien (Features, Chat, AI, Brand, MCP).
- `src/types/` — Geteilte TypeScript-Definitionen.

### Naming

- Dateien: `kebab-case.tsx` (Next.js Konvention)
- Komponenten: `PascalCase`
- Funktionen/Variables: `camelCase`
- Konstanten: `UPPER_SNAKE_CASE` nur für echte Konstanten (ENV, Magic Numbers)
- CSS Klassen: Tailwind Utilities, keine Custom Classes außer in `globals.css`

### Imports

- Absolute Imports via `@/*` Alias (zeigt auf `src/`)
- Reihenfolge: React/Next → External Libraries → Internal (`@/`) → Relative (`./`)
- Keine Default Exports außer für Page/Layout Komponenten (Next.js Anforderung)

```typescript
// ✅ Import-Reihenfolge
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/auth";

import { ModuleCard } from "./module-card";
```

### Error Handling

- Async Operationen immer mit try/catch.
- User-facing Errors: Klare deutsche Fehlermeldungen, keine technischen Details.
- Next.js `error.tsx` Boundaries in relevanten Route-Segmenten.
- `loading.tsx` für Suspense-States in jeder Route.

### Performance

- Images über `next/image` mit definierten Dimensions.
- Dynamische Imports (`next/dynamic`) für schwere Client Components.
- Keine Client-Side Data Fetching wenn Server Components möglich.
- `Suspense` Boundaries für granulares Streaming.

---

## Auth (Logto)

### Pattern: Server Actions

Diese App nutzt das `@logto/next` **Server Actions Pattern** für App Router. Das ist wichtig — es gibt ein älteres Pages Router Pattern das hier NICHT verwendet wird.

### Kernfunktionen

```typescript
import { getLogtoContext } from "@logto/next/server-actions";  // Auth-Status prüfen
import { signIn, signOut } from "@logto/next/server-actions";  // Login/Logout
import { handleSignIn } from "@logto/next/server-actions";     // Callback
```

### Auth-Flow

1. User besucht `/` (Landing Page, public)
2. User klickt "Jetzt starten" → Redirect zu Sign-In
3. Proxy (`proxy.ts`) prüft Session-Cookie bei `(app)` Routes
4. Wenn keine Session: Redirect zu `auth.lernen.diy` (Logto Hosted UI)
5. User loggt sich ein (Email OTP)
6. Logto redirected zurück zu `/api/auth/callback`
7. `handleSignIn()` tauscht Code gegen Token
8. Session Cookie wird gesetzt
9. User wird zu `/(app)/` weitergeleitet

### Auth-Architektur

- `/` → **Public** (Landing Page, kein Auth)
- `/(app)/*` → **Protected** (Auth required, Proxy Guard)
- `/api/auth/*` → **Public** (Auth-Endpoints müssen erreichbar sein)
- **Dev-Bypass:** Wenn `LOGTO_APP_ID` nicht gesetzt → alles frei zugänglich

### Proxy (statt Middleware)

Next.js 16 hat `middleware.ts` durch `proxy.ts` ersetzt:
- Datei: `src/proxy.ts` (im Projekt-Root oder `src/`)
- Export: `export function proxy()` (nicht `middleware()`)
- Runtime: Node.js (Default, besser für Auth-Checks als Edge)

### User-Identität

Logto liefert den User via `claims` in `getLogtoContext()`. Die `sub` Claim ist die Logto User ID und wird als Foreign Key in der lokalen Datenbank verwendet. Nie eine eigene User-ID generieren — immer `claims.sub` als Referenz nutzen.

### User-Helper (`src/lib/auth.ts`)

Zwei Funktionen für unterschiedliche Performance-Anforderungen:

- **`getUser()`** — Nur Token-Claims, kein HTTP-Call. Für Sidebar, Header, Auth-Guards.
- **`getUserFull()`** — Mit `fetchUserInfo: true`, HTTP-Call zu Logto. Nur wo vollständige Profildaten nötig (z.B. Profil-Seite).

### Auth-Route Error Handling

`signIn()`, `signOut()` und `handleSignIn()` rufen intern Next.js `redirect()` auf, das eine Exception wirft. In try/catch-Blöcken muss der Redirect-Throw re-thrown werden:

```typescript
try {
  await signIn(logtoConfig, { ... })
} catch (error) {
  // Next.js redirect() wirft mit digest-Property — re-throw
  if (error && typeof error === "object" && "digest" in error) throw error
  redirect("/")
}
```

---

## Datenbank (Neon + Drizzle)

### Drizzle ORM Konventionen

- Schema in `src/lib/db/schema/` Directory (users, chats, messages, artifacts, usage-logs)
- Re-Export via `src/lib/db/schema.ts` → `src/lib/db/schema/index.ts`
- Migrations via `drizzle-kit generate` + `drizzle-kit migrate`
- Für schnelles Prototyping: `drizzle-kit push` (direkt Schema pushen ohne Migration)

### Schema-Design (aktuell)

- `chats` — id (nanoid text PK), userId (Logto sub), title, isPinned, modelId, expertId, metadata (jsonb)
- `messages` — id (nanoid text PK), chatId (FK → chats, cascade), role, parts (jsonb), metadata (jsonb)
- `artifacts` — id (nanoid text PK), chatId (FK), messageId (FK), type (notNull), title (notNull), content (notNull), language, version (default 1), fileUrl. Index auf chatId.
- `usage_logs` — id (nanoid text PK), userId, chatId, messageId, modelId, inputTokens, outputTokens, totalTokens, reasoningTokens, cachedInputTokens, cacheReadTokens, cacheWriteTokens, stepCount
- `experts` — id (nanoid text PK), userId (nullable=global), name, slug (unique), description, icon, systemPrompt, skillSlugs (jsonb[]), modelPreference, temperature (jsonb), allowedTools (jsonb[]), mcpServerIds (jsonb[]), isPublic, sortOrder, createdAt, updatedAt
- `skills` — id (nanoid text PK), slug (unique), name, description, content (Markdown body), mode ('skill'|'quicktask'), category, icon, fields (jsonb), outputAsArtifact, temperature (jsonb), modelId, isActive, sortOrder, createdAt, updatedAt
- `models` — id (nanoid text PK), modelId (unique, gateway ID), name, provider, categories (jsonb), region, contextWindow, maxOutputTokens, isDefault, capabilities (jsonb), inputPrice (jsonb), outputPrice (jsonb), isActive, sortOrder, createdAt, updatedAt
- User-Referenz direkt über Logto `sub` claim als `userId` (text), kein FK zu users-Tabelle

### Token-Tracking (Credit-System)

Usage-Logging nutzt `totalUsage` aus AI SDK `onFinish` (Summe aller Steps inkl. Tool Calls). Alle relevanten Token-Typen werden erfasst:

| DB-Spalte | AI SDK Quelle | Zweck |
|-----------|--------------|-------|
| `input_tokens` | `totalUsage.inputTokens` | Prompt-Kosten |
| `output_tokens` | `totalUsage.outputTokens` | Completion-Kosten |
| `total_tokens` | `totalUsage.totalTokens` | Provider-Total (kann Overhead enthalten) |
| `reasoning_tokens` | `totalUsage.reasoningTokens` | Extended Thinking / o1 |
| `cached_input_tokens` | `totalUsage.cachedInputTokens` | Cache-Hits (günstiger) |
| `cache_read_tokens` | `inputTokenDetails.cacheReadTokens` | Cache-Read Detail |
| `cache_write_tokens` | `inputTokenDetails.cacheWriteTokens` | Cache-Write Detail |
| `step_count` | `steps.length` | Anzahl Steps (Tool Calls erhöhen) |

---

## Styling

### Theme (Light / Dark Mode)

Die App unterstützt Light und Dark Mode via `next-themes` mit class-basiertem Switching.

- **Feature Flag:** `NEXT_PUBLIC_DARK_MODE` (opt-out, default enabled)
- **Default Theme:** `NEXT_PUBLIC_DEFAULT_THEME` (`"light"` | `"dark"` | `"system"`, default `"light"`)
- `globals.css` definiert Light-Variablen in `:root` und Dark-Variablen in `.dark` (+ je 5 Brand-Selektoren)
- `next-themes` ThemeProvider in `src/components/theme-provider.tsx` (wraps children nur wenn Feature aktiv)
- ThemeToggle Button im Header (`src/components/layout/theme-toggle.tsx`)
- `suppressHydrationWarning` auf `<html>` (required by next-themes)
- Tailwind v4: CSS-first mit `@theme` Direktiven (kein `tailwind.config.ts`)

### Farben

Primärfarben werden über shadcn/ui CSS Custom Properties gesteuert. Für lernen.diy Apps:

- Primary: Blau/Teal-Bereich (vertrauenswürdig, lernorientiert)
- Akzent: Kann pro App variieren
- Sidebar: Leicht getönter Hintergrund, nicht reinweiß

### Responsive Breakpoints

- Mobile: `< 768px` (Sidebar als Sheet)
- Tablet: `768px – 1023px` (Sidebar collapsed)
- Desktop: `≥ 1024px` (Sidebar expanded)

---

## AI-Stack (Streamdown + AI Elements)

### Streamdown

Streaming-Markdown-Renderer, löst das Problem unvollständiger Markdown-Syntax während AI-Streaming.

- **Packages:** `streamdown`, `@streamdown/code`, `@streamdown/mermaid`, `@streamdown/cjk`, `@streamdown/math`
- **`isAnimating`-Prop** steuert Streaming-Verhalten (Cursor, partielle Syntax-Toleranz)
- **Tailwind-Klassen:** Safelist-Datei `src/lib/streamdown-safelist.ts` (Tailwind scannt src/ automatisch)
- **KEIN `@source` für node_modules!** Die `@source`-Direktive auf `node_modules` crasht Turbopack auf Windows (versucht Windows-Devicename `nul` zu lesen). Bei Änderungen am Streamdown-Klassen-Set die Safelist-Datei aktualisieren.
- **Styles:** `import "streamdown/styles.css"` in `layout.tsx`
- **Turbopack-Cache:** Bei unerklärlichen CSS-Fehlern `.next/` löschen (persistenter Cache kann stale Referenzen enthalten)
- Docs: https://streamdown.ai/docs

### Vercel AI Elements

shadcn/ui-basierte Komponenten für AI-UIs, installiert als lokale Kopien (wie shadcn/ui).

- **Installationsort:** `src/components/ai-elements/`
- **Verfügbare Komponenten:** `PromptInput`, `Message`, `Conversation`
- **`MessageResponse`** nutzt intern Streamdown mit allen Plugins (code, mermaid, math, cjk)
- **Neue Komponenten hinzufügen:** `npx ai-elements@latest add <component>`
- AI Elements NICHT manuell ändern. Stattdessen Wrapper-Komponenten bauen.
- Docs: https://ai-elements.dev/docs

### Model Registry (M2 + DB-Migration)

Model-Konfiguration via DB mit ENV-Fallback. Admin-UI für Model-Management.

- **Schema:** `src/lib/db/schema/models.ts` — id (PK), modelId (unique, gateway ID), name, provider, categories (jsonb), region, contextWindow, maxOutputTokens, isDefault, capabilities (jsonb), inputPrice (jsonb), outputPrice (jsonb), isActive, sortOrder
- **Queries:** `src/lib/db/queries/models.ts` — CRUD + upsert by modelId
- **Config:** `src/config/models.ts` — Async `getModels()` mit 60s TTL-Cache, Fallback-Kette: DB → ENV → FALLBACK_MODELS
- **Sync Fallback:** `getModelById()` bleibt sync (nutzt Cache wenn warm, ENV wenn kalt)
- **ENV:** `MODELS_CONFIG` (JSON-Array) als Fallback wenn DB leer, `DEFAULT_MODEL_ID` (Fallback)
- **Kategorien:** enterprise, allrounder, creative, coding, analysis, fast
- **Region-Flag:** Jedes Model hat `region: "eu" | "us"` für Datenschutz-Awareness
- **API:** `/api/models` (GET) — liefert Models + Gruppen für Client
- **Admin-API:** `/api/admin/models` (GET/POST), `/api/admin/models/[id]` (GET/PATCH/PUT/DELETE), `/api/admin/export/models` (GET)
- **Admin-UI:** `/admin/models` — Tabelle mit Active-Toggle, JSON-Editor (CodeMirror), Import
- **Seed:** `pnpm db:seed` importiert Models aus MODELS_CONFIG ENV
- **Cache:** `clearModelCache()` wird nach Admin-Mutations aufgerufen

### Chat-Architektur (M2)

Fullpage Chat als Hauptansicht mit Model-Auswahl:

```
ChatShell (Server Component)
├── SidebarProvider + ChatSidebar
│   ├── SidebarLogo + ChatSidebarNewChat
│   ├── Search Input (client-side Filter)
│   ├── ChatSidebarContent (Angepinnt + Chronologie-Gruppen)
│   └── NavUser (+ Custom Instructions Dialog)
├── ChatHeader
└── ChatView (Client Component) — Split-View wenn Artifact offen
    ├── Chat-Column (50% oder 100%)
    │   ├── Conversation + ConversationContent
    │   │   → Message + MessageContent + MessageResponse (Streamdown)
    │   │   → ArtifactCard (inline, bei tool-create_artifact Parts)
    │   │   → ChatEmptyState (Vorschläge)
    │   └── PromptInput + SpeechButton
    └── ArtifactPanel (50%, optional)
        ├── Header (Title, Version-Badge, Save/Edit/Copy/Download)
        ├── View: HtmlPreview | MessageResponse (Markdown/Code)
        └── Edit: ArtifactEditor (CodeMirror)
```

**Chat-Route Architektur:** `/api/chat/route.ts` ist ein schlanker Orchestrator (~120 Zeilen). Die Logik ist in 4 Module aufgeteilt:
- `resolve-context.ts` — Chat/Expert/Model/Skills-Auflösung, System-Prompt Assembly
- `build-messages.ts` — Part-Filtering, convertToModelMessages, fixFilePartsForGateway, Cache Control
- `build-tools.ts` — Tool-Registry (create_artifact, ask_user, web_search, web_fetch, load_skill)
- `persist.ts` — onFinish Callback: R2-Upload, Message Save, Fake-Artifact Detection, Usage Logging, Title Generation

**Persistenz:** `useChat` mit `DefaultChatTransport` → `/api/chat` → `streamText` mit `onFinish` Callback → DB Persist (messages + usage). `chatId` wird per `messageMetadata` vom Server zum Client gesendet. Token-Tracking via `totalUsage` (Summe aller Steps) in `usage_logs`.

**Expert-Integration:** Expert-Auswahl im Empty-State → `expertId` im Request-Body → Server lädt Expert → System-Prompt, Model, Temperature Override → `chats.expertId` für Persistenz. Bei bestehendem Chat: Expert aus DB laden. Expert-Metadata (expertId, expertName) in messageMetadata.

**Prompt Caching:** Anthropic-Models erhalten `cacheControl: { type: "ephemeral" }` auf dem System-Prompt. Cache-Metriken (read/write) werden in `usage_logs` gespeichert.

### Chat Prose-Typografie

Streamdown rendert semantisches HTML, Tailwind Preflight entfernt alle Default-Margins. Für lesbaren Chat-Output gibt es eine scoped `.chat-prose` CSS-Klasse in `globals.css`:

- **Anwendung:** `className="chat-prose"` auf `MessageResponse` in `chat-view.tsx`
- **Scope:** Nur Chat-Ausgabe, nicht global. Kein `@tailwindcss/typography` nötig.
- **Enthält:** Line-height (1.65), Heading-Hierarchie, List-Marker/Spacing, Tabellen, Inline-Code, Blockquotes, Links, HR
- **Code-Blöcke:** Separates Styling via `[data-streamdown="code-block"]` Selektoren (ebenfalls in `globals.css`)

Bei Styling-Anpassungen am Chat-Output: `globals.css` Sektionen "Streamdown Prose Typography" und "Streamdown Code Block Overrides" bearbeiten.

---

## Artifact System (M3)

Eigenständige Outputs (HTML-Seiten, Dokumente, Code-Dateien) werden als Artifacts in einem Split-View-Panel neben dem Chat angezeigt, persistiert und sind editierbar.

### Architektur

- **Tool-basiert:** Model erstellt Artifacts via `create_artifact` Tool-Call
- **Streaming:** Tool-Argumente (content, title, type) streamen automatisch zum Client via AI SDK typed tool parts
- **Persistenz:** `execute`-Funktion speichert in `artifacts`-Tabelle, Tool-Call/Result Parts werden in Message-Parts gespeichert
- **Chat-Reload:** Gespeicherte `tool-call`/`tool-result` Parts werden zu AI SDK 6 typed tool parts gemappt (`tool-{toolName}` mit states)

### Dateien

| Datei | Beschreibung |
|-------|-------------|
| `src/lib/ai/tools/create-artifact.ts` | Tool-Definition (Factory mit chatId-Closure, Zod mit Size-Limits) |
| `src/lib/ai/tools/parse-fake-artifact.ts` | Fallback-Parser für Models ohne Tool-Calling (z.B. Gemini) |
| `src/lib/db/queries/artifacts.ts` | CRUD-Queries (create, getById, getByChatId mit userId-Scoping, updateContent mit Optimistic Locking) |
| `src/app/api/artifacts/[artifactId]/route.ts` | GET + PATCH API (Ownership-Check, ID-Validierung, Body-Size-Limit, 409 Conflict) |
| `src/hooks/use-artifact.ts` | Custom Hook: Artifact-State, Detection (real + fake), Card-Click, Save mit Version-Conflict-Handling |
| `src/components/chat/chat-message.tsx` | Memoized Message-Rendering (User/Assistant, ArtifactCard, Toolbar) |
| `src/components/chat/artifact-error-boundary.tsx` | React Error Boundary um ArtifactPanel (isoliert Rendering-Crashes) |
| `src/components/assistant/artifact-panel.tsx` | Side-Panel (View/Edit, Download, PDF-Druck via srcdoc, Save, Version-Badge) |
| `src/components/assistant/artifact-card.tsx` | Inline-Card im Chat (klickbar, öffnet Panel mit DB-Fetch) |
| `src/components/assistant/artifact-editor.tsx` | CodeMirror Editor (JS/TS/Python/CSS/JSON/HTML/Markdown, Dark-Mode) |
| `src/components/assistant/artifact-utils.ts` | Helpers (languageToExtension, artifactTypeToIcon, extractTitle) |
| `src/components/assistant/html-preview.tsx` | Sandboxed iframe (allow-scripts, CSP Meta-Tag Injection) |
| `src/components/assistant/code-preview.tsx` | Shiki Code-Rendering (JavaScript RegExp Engine, CSP-safe) |

### Content Types

- `markdown` — Dokumente, Berichte, Anleitungen → Streamdown-Rendering
- `html` — Interaktive Web-Seiten → iframe Preview mit `sandbox="allow-scripts"`, CSP blockiert fetch/XHR/WebSocket
- `code` — Source Code → Syntax-Highlighting via Shiki (JavaScript RegExp Engine, kein WASM)

### Security

- **HTML Preview:** CSP Meta-Tag wird in iframe injiziert (`default-src 'none'`, erlaubt nur inline styles/scripts und data/blob images)
- **Print iframe:** `srcdoc`-Pattern mit `sandbox="allow-modals"` (kein `allow-same-origin`)
- **Optimistic Locking:** PATCH sendet `expectedVersion`, Server gibt 409 bei Conflict mit `currentVersion`
- **Fake-Artifact-Parser:** Erkennt JSON-Tool-Call-Output in Text-Responses (zwei Formate: `action`/`action_input` und direktes Objekt)

### AI SDK 6 Tool Parts

Server-definierte Tools kommen als typed parts an: `type: "tool-{toolName}"` (z.B. `"tool-create_artifact"`). Das gilt auch ohne Tool-Generics in `useChat`. States:
- `input-streaming` — Args werden gestreamt, Panel öffnet sich
- `input-available` — Args komplett, Tool wird ausgeführt
- `output-available` — Execute fertig, artifactId verfügbar
- `output-error` — Fehler bei Ausführung

### Split-View Layout

- Desktop: Chat 50% | Panel 50% (nebeneinander)
- Mobile: Panel als Overlay (Chat hidden)
- Ohne Artifact: Chat volle Breite

---

## Expert System (M4)

Experts definieren WIE die KI sich verhält: Persona, Model, Temperature, Tool-Sets. Agent Skills sind Markdown-basierte Wissenspakete, die on-demand geladen werden.

### Architektur

- **Experts:** DB-Entitäten mit systemPrompt, skillSlugs, modelPreference, temperature
- **Skills:** Markdown-Dateien in `skills/*/SKILL.md` mit Frontmatter
- **Selection:** Expert-Grid im Empty-State, Selection wird mit erstem Message gesendet
- **Prompt Assembly:** Layered: Expert Persona → Artifact Instructions → Skills-Übersicht → Custom Instructions

### Dateien

| Datei | Beschreibung |
|-------|-------------|
| `src/lib/db/schema/experts.ts` | Drizzle Schema (nanoid text PK, jsonb für Arrays) |
| `src/lib/db/queries/experts.ts` | CRUD + upsert (seed), userId-Scoping für Mutations |
| `src/app/api/experts/route.ts` | GET (list) + POST (create) |
| `src/app/api/experts/[expertId]/route.ts` | GET + PATCH + DELETE |
| `src/types/expert.ts` | Expert, CreateExpertInput, UpdateExpertInput, ExpertPublic |
| `src/lib/ai/skills/discovery.ts` | Skill Discovery (scannt `skills/`, cached module-level) |
| `src/lib/ai/tools/load-skill.ts` | loadSkill Tool (Factory, validiert gegen availableSkills) |
| `src/lib/ai/tools/ask-user.ts` | ask_user Tool (kein execute, pausiert Stream) |
| `src/components/chat/expert-selector.tsx` | Expert-Grid UI |
| `src/components/generative-ui/ask-user.tsx` | Structured question widget (Radio/Checkbox/Textarea) |
| `src/lib/db/seed/default-experts.ts` | 6 Default Experts |
| `src/lib/db/seed/seed-experts.ts` | Idempotentes Seeding |
| `src/config/prompts.ts` | buildSystemPrompt mit Expert/Skills/Custom Instructions Layers |

### Expert Schema

```
experts: id(text PK), userId(text nullable), name, slug(unique), description,
icon, systemPrompt, skillSlugs(jsonb[]), modelPreference, temperature(jsonb),
allowedTools(jsonb[]), mcpServerIds(jsonb[]), isPublic, sortOrder, createdAt, updatedAt
```

### Agent Skills

Skills leben in der `skills`-DB-Tabelle (importiert aus `skills/<slug>/SKILL.md` via Seed/Admin). Frontmatter-Format:
```yaml
---
name: SEO-Analyse
slug: seo-analysis
description: Strukturierte SEO-Analyse...
---
```

Skills werden über `await discoverSkills()` (DB-Query, async, 60s TTL-Cache) entdeckt und im System-Prompt als Übersicht gelistet. Das `load_skill` Tool lädt den vollständigen Skill-Content on-demand. Expert-bevorzugte Skills (via `skillSlugs`) werden priorisiert.

### ask_user Tool (Generative UI)

Tool ohne `execute` — pausiert den Stream. Client rendert AskUser-Widget mit Radio/Checkbox/Textarea. User-Antwort wird via `addToolResult` zurückgesendet, Stream wird fortgesetzt.

### Chat-Route Integration

- `expertId` im Request-Body (neuer Chat) oder aus bestehendem Chat
- Expert bestimmt: systemPrompt, modelPreference, temperature Override
- `chats.expertId` Spalte speichert die Expert-Zuordnung
- `messageMetadata` enthält expertId + expertName

### Default Experts

6 globale Experts (userId=NULL, nicht editierbar/löschbar):
general, code, seo, analyst, researcher, writer

Seeding: `pnpm db:seed` (idempotent via upsert by slug)

---

## Quicktask System (M4.5)

Quicktasks sind formularbasierte Skills die ohne Prompting-Wissen nutzbar sind und konsistente Outputs liefern. Sie sind Teil des Skill-Systems mit `mode: quicktask` im Frontmatter.

### UX-Pyramide

1. Freies Chatten (User-Default-Modell)
2. Experten-Chat (Expert bestimmt Modell + Persona)
3. Experten + Tools/Skills (KI entscheidet wann)
4. **Quicktasks** — geführt, eigener Experte eingebaut, deterministisches Output

### Architektur

- **Kein neues DB-Schema.** Quicktasks SIND Skills mit `mode: quicktask` im Frontmatter
- **Form wird client-seitig gerendert** aus Skill-Metadaten (kein ask_user-Roundtrip)
- **Template-Rendering:** `{{variable}}` und `{{variable | default: "X"}}` in SKILL.md Content
- **Ein-Schuss:** Quicktask-Modus gilt nur für die erste Nachricht, danach normaler Chat

### Dateien

| Datei | Beschreibung |
|-------|-------------|
| `src/lib/ai/skills/discovery.ts` | SkillMetadata mit quicktask-Feldern, `discoverQuicktasks()` |
| `src/lib/ai/skills/template.ts` | Mustache-Replacer für `{{variable}}` |
| `src/app/api/skills/quicktasks/route.ts` | GET Endpoint (Public-Felder ohne modelId/temperature) |
| `src/components/chat/quicktask-selector.tsx` | Grid mit Kategorie-Filter |
| `src/components/chat/quicktask-form.tsx` | Dynamisches Formular aus Skill-Fields |
| `src/components/chat/chat-empty-state.tsx` | Tabs (Experten/Quicktasks) + Formular-Ansicht |

### Quicktask SKILL.md Frontmatter

```yaml
mode: quicktask
category: Content          # Für Kategorie-Filter
icon: Image                # Lucide Icon-Name
outputAsArtifact: true     # Ergebnis als Artifact
temperature: 0.8           # Override
modelId: anthropic/...     # Optional: Quicktask-spezifisches Modell
fields:
  - key: bildidee
    label: Bildidee
    type: textarea          # text | textarea | select
    required: true
    placeholder: "..."
    options: [...]          # Nur bei type: select
```

### Modell-Auflösung (Priorität hoch → niedrig)

1. Quicktask `modelId` (aus SKILL.md Frontmatter)
2. Expert `modelPreference` (aus DB)
3. User `defaultModelId` (aus `users.default_model_id`)
4. System-Default (`aiDefaults.model`)

ModelPicker wurde entfernt. Modell wird in Einstellungen-Dialog konfiguriert.

### Aktuelle Quicktasks

| Slug | Name | Category |
|------|------|----------|
| `image-prompt` | KI-Bildprompt-Generator | Content |
| `social-media-mix` | Social-Media-Mix | Social Media |
| `meeting-prep` | Meeting-Vorbereitung | Workflow |

---

## Web Services (Firecrawl)

Infrastruktur fuer Websuche, Scraping, Crawling und strukturierte Datenextraktion. Aktiviert per Feature-Flag wenn `FIRECRAWL_API_KEY` gesetzt.

### Client (`src/lib/web/`)

Wrapper um `@mendable/firecrawl-js` SDK mit eigener Type-Abstraktionsschicht:

| Funktion | SDK-Methode | Verhalten | Credits |
|----------|-------------|-----------|---------|
| `webSearch(params)` | `firecrawl.search()` | Sync, direkte Response | ~2 / 10 Ergebnisse |
| `webScrape(params)` | `firecrawl.scrape()` | Sync, direkte Response | 1 / Seite |
| `webCrawl(params)` | `firecrawl.crawl()` | Blockierend mit Auto-Polling | 1 / Seite |
| `webCrawlAsync(params)` | `firecrawl.startCrawl()` | Non-blocking, gibt Job-ID | 1 / Seite |
| `webCrawlStatus(id)` | `firecrawl.getCrawlStatus()` | Job-Status abfragen | 0 |
| `webBatchScrape(params)` | `firecrawl.batchScrape()` | Batch, blockierend | 1 / URL |
| `webExtract(params)` | `firecrawl.extract()` | Strukturierte LLM-Extraktion | 5 / URL |
| `webMap(params)` | `firecrawl.map()` | Sitemap-Discovery | 1 / Call |

### API-Routes (`/api/web/`)

| Route | Methode | Funktion |
|-------|---------|----------|
| `/api/web/search` | POST | Websuche (optional mit Scraping) |
| `/api/web/scrape` | POST | Einzelne URL scrapen |
| `/api/web/crawl` | POST | Crawl-Job starten (async) |
| `/api/web/crawl?jobId=xxx` | GET | Crawl-Status abfragen |
| `/api/web/batch-scrape` | POST | Mehrere URLs auf einmal scrapen |
| `/api/web/extract` | POST | Strukturierte Daten aus URLs |

Alle Routes pruefen Feature-Flag, Auth und validieren Input (URL-Pattern, Query-Laenge, Array-Limits).

### Types (`src/lib/web/types.ts`)

Eigene Interfaces als Abstraktionsschicht ueber dem SDK. Bei SDK-Breaking-Changes nur `src/lib/web/index.ts` anpassen.

### Chat-Tools (`src/lib/search/`)

Provider-agnostische Abstraktionsschicht fuer Web-Tools im Chat. Getrennt von `src/lib/web/` (das bleibt fuer standalone API-Routes).

- **Provider:** Konfiguriert via `SEARCH_PROVIDER` ENV (default: `firecrawl`). Verfuegbare Provider: firecrawl, jina, tavily, perplexity (Stubs).
- **Firecrawl-Provider:** Delegiert an bestehende Funktionen aus `src/lib/web/index.ts`
- **Truncation:** `truncateContent()` begrenzt Fetch-Ergebnisse auf ~8000 Tokens (32000 chars), Schnitt an Absatzgrenze
- **AI SDK Tools:** `src/lib/ai/tools/web-search.ts` und `src/lib/ai/tools/web-fetch.ts` — regulaere `tool()` Definitionen (nicht Anthropic-Provider-spezifisch)
- **SSRF-Schutz:** `web-fetch` nutzt `isAllowedUrl()` aus `src/lib/url-validation.ts`
- **Feature-Flag:** `features.search.enabled` — aktiv wenn mindestens ein Provider-Key gesetzt

**Warum eigene Tools statt Anthropic Provider-Tools?**
Anthropic's `webSearch`/`webFetch` sind server-executed Provider-Tools (`server_tool_use`/`server_tool_result`), die nur mit Anthropic-Models funktionieren und beim Chat-Reload einen 400-Fehler verursachen (tool_use ohne tool_result). Eigene `tool()` Definitionen sind provider-unabhaengig und erzeugen standard tool-call/tool-result Parts.

---

## Storage (Cloudflare R2)

File-Upload/Download via `@aws-sdk/client-s3`. Aktiviert per Feature-Flag wenn `R2_ACCESS_KEY_ID` gesetzt.

### Client (`src/lib/storage/`)

| Funktion | Beschreibung |
|----------|-------------|
| `uploadFile(file, userId, options?)` | Upload mit Validierung (Typ, Groesse, Filename) |
| `deleteFile(key)` | Datei loeschen |
| `getSignedDownloadUrl(key)` | Signed URL fuer private Dateien (1h) |
| `listFiles(prefix?)` | Dateien auflisten |

### Validierung (`src/lib/storage/validation.ts`)

- MIME-Type Allowlist: png, jpg, webp, gif, pdf, markdown, plaintext
- Extension-Blocklist: exe, bat, cmd, js, sh etc.
- Filename: nur `[a-zA-Z0-9._-]`
- Max 10MB Default (konfigurierbar per `UploadOptions`)
- Storage-Key: `uploads/{userId}/{nanoid}-{sanitized-filename}`

### API-Routes (`/api/upload/`)

| Route | Methode | Funktion |
|-------|---------|----------|
| `/api/upload` | POST | File-Upload (FormData) |
| `/api/upload/[key]` | GET | Signed Download URL |
| `/api/upload/[key]` | DELETE | Datei loeschen |

User-Scope: Jeder User kann nur eigene Dateien unter `uploads/{userId}/` lesen und loeschen.

---

## MCP (Model Context Protocol)

Die App ist MCP Client: Sie verbindet sich zu externen MCP-Servern (HTTP/SSE), entdeckt deren Tools, und reicht sie an `streamText()` weiter. MCP-Tools erscheinen neben den bestehenden (web_search, web_fetch, code_execution) im Assistant.

### Aktivierung

1. `MCP_ENABLED=true` in `.env.local` setzen
2. Server in `src/config/mcp.ts` konfigurieren (Array `MCP_SERVERS`)
3. Env-Var des jeweiligen Servers setzen (opt-in Gate)

### Architektur

- **Config:** `src/config/mcp.ts` — Server-Registry mit `MCPServerConfig` Interface
- **Client:** `src/lib/mcp/index.ts` — `connectMCPServers()` verbindet parallel, merged Tools
- **Integration:** `src/app/api/assistant/chat/route.ts` — MCP-Tools werden im Normal-Modus gemerged (nicht bei Skill-Requests)
- **Feature-Flag:** `features.mcp.enabled` (opt-in via `MCP_ENABLED`)

### Neuen MCP-Server hinzufuegen

1. Eintrag in `MCP_SERVERS` Array in `src/config/mcp.ts`:
   ```typescript
   {
     id: "myserver",           // Wird Tool-Prefix: myserver__toolname
     name: "My MCP Server",
     url: "${MY_SERVER_URL}",  // Env-Var Interpolation
     envVar: "MY_SERVER_URL",  // Opt-in Gate
     headers: { Authorization: "Bearer ${MY_SERVER_TOKEN}" },
     experts: ["general"],     // Optional: nur fuer bestimmte Experten
   }
   ```
2. Env-Vars in `.env.local` setzen
3. Kein weiterer Code noetig — Tools werden automatisch entdeckt und in der bestehenden Tool-UI gerendert

### Sicherheit

- **Allowlist:** Nur Server aus `src/config/mcp.ts`, keine User-definierten URLs
- **Secrets:** Headers nutzen `${VAR}` Syntax, nie hardcoded
- **Tool-Prefixing:** `{serverId}__{toolName}` verhindert Namenskollisionen mit Built-in Tools
- **Timeout:** 5s pro Server, langsame Server werden uebersprungen (graceful degradation)
- **Server-seitig:** MCP-Connections laufen in der API-Route, kein CSP-Impact

---

## Admin System (Multi-Instanz)

Admin-UI zur Verwaltung von Skills und Experts pro Instanz, ohne Code-Deployment.

### Zugang

- `ADMIN_EMAILS=rico@loschke.ai` in `.env.local` (kommasepariert fuer mehrere)
- Admin-Link erscheint im User-Dropdown-Menu (NavUser)
- Alle Admin-API-Routes unter `/api/admin/` mit `requireAdmin`-Guard
- Admin-UI unter `/admin/skills` und `/admin/experts`

### Skills in DB

Skills leben jetzt in der `skills`-Tabelle statt nur im Filesystem. Die Discovery (`discoverSkills()`, `getSkillContent()`, `discoverQuicktasks()`) ist async und DB-basiert mit 60s TTL-Cache. `clearSkillCache()` wird nach Admin-Mutations aufgerufen.

- **Seed:** `pnpm db:seed` importiert bestehende `skills/*/SKILL.md` Dateien in die DB
- **Import-Format:** Raw SKILL.md (Frontmatter + Markdown), geparst via `gray-matter` in `parseSkillMarkdown()`
- **Parser:** `src/lib/ai/skills/parser.ts` (shared zwischen Seed, Import, Export)

### Admin-API Routes

| Route | Methode | Beschreibung |
|-------|---------|-------------|
| `/api/admin/skills` | GET/POST | Liste + Import (SKILL.md) |
| `/api/admin/skills/[id]` | GET/PUT/PATCH/DELETE | CRUD (PUT = SKILL.md ersetzen, PATCH = isActive/sortOrder) |
| `/api/admin/experts` | GET/POST | Liste + Import (JSON, upsert by slug) |
| `/api/admin/experts/[id]` | GET/PUT/PATCH/DELETE | CRUD (Admin kann auch globale Experts bearbeiten) |
| `/api/admin/models` | GET/POST | Liste + Import (JSON-Array) |
| `/api/admin/models/[id]` | GET/PATCH/PUT/DELETE | CRUD (Active-Toggle, JSON-Editor) |
| `/api/admin/export/skills` | GET | Bulk-Export mit raw SKILL.md |
| `/api/admin/export/experts` | GET | Bulk-Export als JSON |
| `/api/admin/export/models` | GET | Bulk-Export als JSON |

### Admin-UI

- `/admin/skills` — Tabelle mit Aktiv-Toggle, Edit (SKILL.md Textarea), Import, Delete
- `/admin/experts` — Tabelle mit Edit (JSON Textarea), Import, Delete
- `/admin/models` — Tabelle mit Aktiv-Toggle, Edit (JSON CodeMirror), Import, Delete
- Import-Views mit Vorlagen (Skill-Template, Quicktask-Template, Expert-Template, Model-Template)

---

## Business Mode (ab M5)

Opt-in Datenschutz-Modus für regulierte Umgebungen. Wird schrittweise aufgebaut:

- **M5 Basis:** Feature-Flag `NEXT_PUBLIC_BUSINESS_MODE`, Inline-Privacy-Notice bei File-Upload (Amber-Banner mit Provider/Region)
- **Privacy Notice:** `src/components/chat/file-privacy-notice.tsx` — Nicht-blockierender Inline-Hinweis im Attachment-Bereich
- **Model-Metadaten:** Provider + Region werden aus `/api/models` gecacht und im Notice angezeigt
- **M7 Erweiterung:** Privacy-Routing in Chat-Route (EU-/lokales Modell bei aktivem Business Mode)
- **M8 Vollausbau:** PII-Detection, Consent-Logging, Audit-Trail

Detail-PRD: `docs/prd-business-mode.md`

---

## Projekte (M6 — Schema-Skizze)

MVP: Projekte als Arbeitsräume mit Text-Instruktionen (kein Dokument-Upload).

```
projects
├── id (nanoid text PK)
├── userId (text, Logto sub)
├── name (text, notNull)
├── description (text)
├── instructions (text)           → Wie Custom Instructions, aber pro Projekt
├── defaultExpertId (text, FK → experts)
├── isArchived (boolean, default false)
├── createdAt (timestamp)
└── updatedAt (timestamp)
```

Bestehende `chats`-Tabelle bekommt `projectId` (text, FK → projects, nullable).

---

## Monetarisierung (M9 — Ausblick)

Credit-basiertes Abrechnungssystem mit Tier-Modell. Konzept: `docs/monetization-concept.md`.

- `users` erweitern: tier (free/pro/enterprise), credits, stripeCustomerId
- Neue Tabelle `credit_transactions` für Verbrauchshistorie
- Tier-Guard Middleware für Feature-/Model-/Rate-Gating
- Credit-Deduktion im bestehenden `onFinish` (nutzt `usage_logs` Infrastruktur)
- Stripe Checkout + Webhook + Billing Portal

---

## Deferred Features

Folgende Features sind nicht in der aktuellen Roadmap (M5-M9):

- Anthropic Skills API (PPTX/XLSX/DOCX-Generierung)
- MCP Apps (SEP-1865 UI-Rendering)
- Managed MCP (Pipedream/Composio, User-OAuth)
- Volltextsuche über Chats
- Keyboard Shortcuts
- RAG / Embedding-basierte Suche
- Project Documents (Dokument-Upload + Text-Extraktion)

---

## Deployment

- Vercel Projekt, Theming/Branding über `.env` steuerbar (Multi-Instance für verschiedene Kunden)
- `.env.local` — Logto App-ID, Neon DB, optional: FIRECRAWL_API_KEY (Web), R2 Credentials (Storage)

---

## Next.js 16 Besonderheiten

Dieses Projekt nutzt Next.js 16. Folgende Punkte sind zu beachten:

- **Turbopack ist Default** — kein `--turbopack` Flag nötig bei `next dev` und `next build`
- **`proxy.ts` statt `middleware.ts`** — Export `proxy()`, Node.js Runtime (kein Edge)
- **Async Request APIs** — `cookies()`, `headers()`, `params`, `searchParams` sind **nur noch async** (kein synchroner Zugriff mehr!)
- **`next lint` entfernt** — ESLint direkt über CLI aufrufen
- **ESLint Flat Config** — `eslint.config.js` statt `.eslintrc`
- **React 19.2** — View Transitions, `useEffectEvent`, Activity verfügbar
- **React Compiler** — Optional aktivierbar via `reactCompiler: true` in `next.config.ts`
- **Keine `next/legacy/image`** — Nur `next/image` verwenden

---

## Commands

```bash
pnpm dev             # Entwicklungsserver starten (Turbopack Default)
pnpm build           # Production Build (Turbopack Default)
pnpm lint            # ESLint (kein `next lint` in v16)
pnpm db:generate     # Drizzle Migrations generieren
pnpm db:push         # Schema direkt an DB pushen (Dev)
pnpm db:seed         # Default Experts seeden (idempotent)
pnpm db:studio       # Drizzle Studio (DB Browser)
```

---

## Feature Flags

Feature Flags werden über Environment Variables in `src/config/features.ts` gesteuert:

```typescript
export const features = {
  chat: {      enabled: process.env.NEXT_PUBLIC_CHAT_ENABLED !== "false" },  // Opt-out
  mermaid: {   enabled: process.env.NEXT_PUBLIC_MERMAID_ENABLED !== "false" }, // Opt-out
  darkMode: {  enabled: process.env.NEXT_PUBLIC_DARK_MODE !== "false" },      // Opt-out
  web: {       enabled: !!process.env.FIRECRAWL_API_KEY },                    // Opt-in (API Routes)
  search: {    enabled: !!(FIRECRAWL|JINA|TAVILY|PERPLEXITY_API_KEY) },       // Opt-in (Chat Tools)
  storage: {   enabled: !!process.env.R2_ACCESS_KEY_ID },                     // Opt-in
  mcp: {       enabled: !!process.env.MCP_ENABLED },                          // Opt-in
  admin: {     enabled: !!process.env.ADMIN_EMAILS },                        // Opt-in
} as const
```

Zwei Patterns:
- **Opt-out** (chat, assistant, mermaid): Default `enabled`, explizit `"false"` deaktiviert.
- **Opt-in** (web, storage, admin): Nur aktiv wenn der zugehoerige API-Key/ENV gesetzt ist. Ohne Key sind die Routes nicht erreichbar (404).

---

## Security

### Headers

`next.config.ts` setzt automatisch Security Headers für alle Routes:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-DNS-Prefetch-Control: on`
- `Permissions-Policy: camera=(), microphone=(self), geolocation=(), browsing-topics=()`

### Content Security Policy

CSP wird in `next.config.ts` konfiguriert. Bei Aenderungen an der CSP beachten:

- **Kein `unsafe-eval`** — CSP script-src ist `'self' 'unsafe-inline'`. Keine Dependencies benötigen eval.
- **`connect-src` braucht `blob:`** — File-Uploads konvertieren Dateien client-seitig von blob-URLs zu data-URLs via `fetch(blobUrl)`.
- **`img-src` braucht `blob:` und `data:`** — Attachment-Previews nutzen blob-URLs, Inline-Bilder nutzen data-URLs.

### Rate Limiting

In-Memory Rate Limiter in `src/lib/rate-limit.ts`. Alle API-Endpoints sind rate-limited:

| Endpoint | Limit |
|----------|-------|
| `/api/chat` | 20 req/min |
| `/api/chats`, `/api/chats/[chatId]` | 60 req/min |
| `/api/models` | 60 req/min |
| `/api/user/instructions` | 60 req/min |
| `/api/artifacts/[artifactId]` | 60 req/min |
| `/api/experts`, `/api/experts/[expertId]` | 60 req/min |

**Limitation:** In-Memory-Limiter wird bei Serverless-Deployments pro Instanz zurückgesetzt. Für Produktion mit mehreren Usern: Upstash Redis einbauen.

### Chat-API Input-Validierung

- **chatId-Format:** Max 20 Zeichen, nur `[a-zA-Z0-9_-]` (Injection Prevention)
- **Message-Rollen:** Nur `user` und `assistant` erlaubt (server-seitig via Zod)
- **Message-Limit:** Max. 50 Messages pro Request
- **Nachrichtenlänge:** Max. 2000 Zeichen pro User-Nachricht
- **ModelId-Validierung:** Gegen Model-Registry geprüft (chat route + PATCH)
- **JSON-Parsing:** try/catch um `req.text()` + `JSON.parse()`, gibt 400 bei invalidem Body
- **Body-Size:** Max 5MB (Content-Length + rawBody.length Check)

### DB-Sicherheit

- **userId-Scoping:** Alle Mutation-Queries (update, delete) prüfen `WHERE userId = ?` (defense-in-depth)
- **Connection-Caching:** Module-level Singleton verhindert Connection-Exhaustion auf Serverless
- **SQL-Pagination:** `getChatWithMessages` nutzt SQL-Level `LIMIT/OFFSET` statt JS-Slicing
- **User-Sync:** `ensureUserExists()` mit In-Memory-Cache in `requireAuth()` (Upsert bei erstem API-Call)

---

## Environment

Alle benötigten Environment Variables stehen in `.env.example`. Für lokale Entwicklung `.env.local` anlegen.

Wichtig:

- `LOGTO_COOKIE_SECRET` muss mindestens 32 Zeichen lang sein
- `LOGTO_BASE_URL` ist `http://localhost:3000` in Dev und die Produktions-URL in Production
- `DATABASE_URL` kommt aus dem Neon Dashboard (Connection String mit `?sslmode=require`)
