# CLAUDE.md

> Projektkontext für Claude Code. Beschreibt Architektur, Konventionen und Struktur der KI-Chat-Plattform.

---

## Projekt-Überblick

**Repository:** `build-jetzt`
**Zweck:** KI-Chat-Plattform mit Expert-System, Artifact-Erstellung, Memory, Bildgenerierung, YouTube-Suche/Analyse, Text-to-Speech, Deep Research, Websuche und MCP-Integration.
**Stack:** Next.js 16 + TypeScript + Tailwind v4 + Vercel AI SDK + Neon Postgres + Logto Auth

### Routing

- `/` — Landing Page (public) oder Chat-Interface (authenticated)
- `/c/[chatId]` — Bestehenden Chat laden
- `/admin/*` — Admin-UI (Skills, Experts, Models, MCP-Server, Credits)
- `/api/chat` — Unified Chat API (Streaming + DB-Persistenz)
- `/api/chats` — Chat-History CRUD
- `/api/models` — Model-Registry
- `/api/experts` — Expert-Registry
- `/api/artifacts/[artifactId]` — Artifact CRUD
- `/api/credits` — Credit Balance + Transactions
- `/api/upload` — File-Upload (R2)
- `/api/web/*` — Web Search/Scrape/Crawl (Firecrawl)
- `/api/user/*` — User-Einstellungen, Memories
- `/api/business-mode/*` — PII-Check, Redaction, Consent
- `/share/[token]` — Geteilter Chat (public, read-only)
- `/api/chats/[chatId]/share` — Share erstellen/widerrufen/prüfen
- `/api/share/[token]` — Public Chat-Daten für Share-Ansicht
- `/api/cron/retention` — Chat Retention Cron (CRON_SECRET Auth)
- `/api/deep-research/[interactionId]` — Deep Research Polling + Completion
- `/api/admin/*` — Admin CRUD + Export für Skills, Experts, Models, MCP-Server, Credits, Users

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
2. **Documentation References** (unten)
3. **User fragen**: Wenn weder context7 noch Docs die Antwort liefern

### Antiregel

**NIEMALS** eine unbekannte API erraten und dann einen Workaround bauen, wenn der erste Versuch fehlschlägt.

---

## Tech Stack

| Komponente    | Technologie                         | Hinweise                                         |
| ------------- | ----------------------------------- | ------------------------------------------------ |
| Framework     | **Next.js 16** (App Router)         | Immer App Router, kein Pages Router              |
| Sprache       | **TypeScript**                      | Strict mode, keine `any` Types                   |
| Styling       | **Tailwind CSS v4** + **shadcn/ui** | Light + Dark Mode via next-themes                |
| Auth          | **Logto** (`@logto/next`)           | OIDC, Server Actions Pattern                     |
| Datenbank     | **Neon** (Serverless Postgres)      | Via **Drizzle ORM**                              |
| Storage       | **Cloudflare R2**                   | S3-kompatible API, `@aws-sdk/client-s3`          |
| Web           | **Firecrawl**                       | Search, Scrape, Crawl, Extract via SDK           |
| AI SDK        | **Vercel AI SDK**                   | `useChat` + `DefaultChatTransport`               |
| Markdown      | **Streamdown** + Plugins            | Streaming-optimiert                              |
| AI Components | **Vercel AI Elements**              | shadcn/ui-Pattern, lokale Kopien                 |
| Deployment    | **Vercel**                          | Ein Projekt pro Subdomain/Brand                  |

### Documentation References

| Komponente    | URL / Context7 ID                                                  |
| ------------- | ------------------------------------------------------------------ |
| AI SDK        | `https://ai-sdk.dev/llms.txt` · context7: `/websites/ai-sdk_dev`  |
| AI Elements   | `https://ai-sdk.dev/elements`                                      |
| AI Gateway    | `https://vercel.com/docs/ai-gateway`                               |
| Streamdown    | `https://streamdown.ai/`                                           |
| MCP in AI SDK | `https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools`                   |
| Neon Postgres | `https://neon.com/docs/ai/ai-rules.md`                            |
| Logto Next.js | `https://docs.logto.io/quick-starts/next-app-router`              |
| R2 Docs       | `https://developers.cloudflare.com/r2/`                            |

---

## Coding-Konventionen

### TypeScript

- **Strict mode** aktiv. Keine `any` Types, außer in absoluten Ausnahmen mit `// eslint-disable-next-line` und Begründung.
- Interfaces für Props, Config-Objekte und API-Responses definieren.
- Zod für Runtime-Validierung von externen Daten (API Responses, Form Input).
- Utility Types (`Pick`, `Omit`, `Partial`) nutzen statt Typen zu duplizieren.

### Komponenten

- **Server Components** als Default. `"use client"` nur wenn nötig (Event Handler, Hooks, Browser APIs).
- Client Components so klein wie möglich halten.
- Props-Interface immer direkt über der Komponente definieren.
- shadcn/ui und AI Elements NICHT modifizieren. Wrapper-Komponenten bauen.

### Dateistruktur

- `src/app/` — Routing und Layouts. Minimale Logik.
- `src/components/` — Wiederverwendbare UI-Komponenten. Details: `src/components/CLAUDE.md`
- `src/lib/` — Utilities, DB, Auth, AI. Details: `src/lib/ai/CLAUDE.md`, `src/lib/db/CLAUDE.md`
- `src/config/` — Konfigurationsdateien (Features, Chat, AI, Brand, MCP, Memory).
- `src/hooks/` — Custom React Hooks.
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

- **Pattern:** `@logto/next` Server Actions Pattern (App Router, NICHT Pages Router)
- **Proxy:** `src/proxy.ts` statt `middleware.ts` (Next.js 16). Export: `proxy()`, Node.js Runtime.
- **Dev-Bypass:** Wenn `LOGTO_APP_ID` nicht gesetzt → alles frei zugänglich.
- **User-Helper:** `getUser()` (nur Claims, kein HTTP-Call) vs. `getUserFull()` (mit fetchUserInfo).
- **User-ID:** Logto `sub` claim als Foreign Key. Nie eigene ID generieren.
- **Redirect-Throw:** `signIn()`/`signOut()` werfen intern `redirect()`. In try/catch: Error mit `"digest"` Property re-thrown.

---

## Datenbank (Neon + Drizzle)

### Konventionen

- Schema in `src/lib/db/schema/`, Queries in `src/lib/db/queries/`
- Alle PKs: nanoid text. User-ID: Logto `sub` claim.
- Migrations: `pnpm db:generate` + `pnpm db:migrate` (Prod), `pnpm db:push` (Dev)
- Details: `src/lib/db/CLAUDE.md`

### Tabellen

`users`, `chats`, `messages`, `artifacts`, `usage_logs`, `experts`, `skills`, `models`, `mcp_servers`, `projects`, `project_documents`, `consent_logs`, `credit_transactions`, `shared_chats`

---

## Styling

- **Theme:** Light + Dark Mode via `next-themes`. Feature-Flag: `NEXT_PUBLIC_DARK_MODE`.
- **Tailwind v4:** CSS-first mit `@theme` Direktiven (kein `tailwind.config.ts`).
- **Streamdown:** Safelist in `src/lib/streamdown-safelist.ts`. KEIN `@source` für node_modules (crasht Turbopack auf Windows).
- **Chat-Prose:** `.chat-prose` Scope in `globals.css` für Chat-Typografie.

### Elevation-Klassen (globals.css)

| Klasse | Verwendung |
|--------|-----------|
| `.card-elevated` | Statische Cards, Chips, Tool-Status |
| `.card-interactive` | Klickbare Cards (Expert, Quicktask, Suggestion) |
| `.input-prominent` | Chat-Input-Bereich |
| `.glass-card` | Glasmorphism (Landing Page) |

### Breakpoints

- Mobile: `< 768px` (Sidebar als Sheet)
- Tablet: `768px – 1023px` (Sidebar collapsed)
- Desktop: `≥ 1024px` (Sidebar expanded)

---

## Chat-Architektur

```
ChatShell (Server Component)
├── SidebarProvider + ChatSidebar
├── ChatHeader
└── ChatView (Client Component) — Split-View wenn Artifact offen
    ├── Chat-Column
    │   ├── Conversation → Message → MessageResponse (Streamdown)
    │   ├── ArtifactCard / QuizCard / ReviewCard
    │   ├── ChatEmptyState (Experten-Grid / Quicktasks)
    │   └── PromptInput
    └── ArtifactPanel (optional, 50%)
        ├── View: HtmlPreview | MessageResponse | QuizRenderer | ReviewRenderer | ImagePreview | AudioPreview
        └── Edit: ArtifactEditor (CodeMirror)
```

**Chat-Route:** `/api/chat/route.ts` ist Orchestrator. Logik in 4 Modulen:
- `resolve-context.ts` — Expert/Model/Skills/Memory-Auflösung
- `build-messages.ts` — Message-Transformation, Cache Control
- `build-tools.ts` — Tool-Registry (bedingte Registrierung)
- `persist.ts` — onFinish: Message Save, Usage, Credits, Title, Memory

**Model Resolution:** `src/lib/ai/model-resolver.ts` — zentraler Model Resolver
- `LLM_ROUTING=gateway` (Default) → Vercel AI Gateway
- `LLM_ROUTING=direct` → Provider-SDKs direkt (EU/Local)
- `LLM_ROUTING=litellm` → Self-hosted LiteLLM Proxy
- Custom Providers (Ionos, Ollama) in `custom-providers.ts`

Details: `src/app/api/CLAUDE.md` und `docs/system/technical-architecture.md`

---

## Next.js 16 Besonderheiten

- **Turbopack ist Default** — kein `--turbopack` Flag nötig
- **`proxy.ts` statt `middleware.ts`** — Export `proxy()`, Node.js Runtime
- **Async Request APIs** — `cookies()`, `headers()`, `params`, `searchParams` sind nur noch async
- **ESLint Flat Config** — `eslint.config.js` statt `.eslintrc`
- **React 19.2** — View Transitions, `useEffectEvent`, Activity verfügbar
- **Keine `next/legacy/image`** — Nur `next/image` verwenden

---

## Commands

```bash
pnpm dev             # Entwicklungsserver starten (Turbopack Default)
pnpm build           # Production Build
pnpm lint            # ESLint (kein `next lint` in v16)
pnpm db:generate     # Drizzle Migrations generieren
pnpm db:push         # Schema direkt an DB pushen (Dev)
pnpm db:seed         # Default Experts, Skills, Models seeden (idempotent)
pnpm db:studio       # Drizzle Studio (DB Browser)
```

---

## Feature Flags

Zentral in `src/config/features.ts`. Drei Patterns:

| Pattern | Flags | Aktivierung |
|---------|-------|-------------|
| **Opt-out** | chat, mermaid, darkMode | Default `enabled`, explizit `"false"` deaktiviert |
| **Opt-in Server** | web, search, storage, mcp, admin, memory, imageGeneration, youtube, tts, deepResearch | Aktiv wenn API-Key/ENV gesetzt |
| **Opt-in Client** | businessMode, credits | `NEXT_PUBLIC_*` auf `"true"`, Build-Zeit |

Details: `docs/system/feature-flags-konfiguration.md`

### EU/Local-Kompatibilität (WICHTIG)

Die Plattform unterstützt drei Deployment-Profile: SaaS (Gateway), EU (Direct), Local (Ollama/LiteLLM).
**Bei jedem neuen Feature prüfen:**

- Externe Provider-Abhängigkeit hinter Feature Flag in `features.ts`
- Tools bedingt registrieren in `build-tools.ts` (kein Tool ohne Feature-Guard)
- LLM-Aufrufe über `resolveModel()` aus `model-resolver.ts`, nie direkt `gateway()`
- Storage über S3-kompatible API, nicht R2-spezifisch
- Admin Features-Seite (`/admin/features`) mit Datenfluss-Info aktualisieren
- `.env.example` und `.env.eu.example` synchron halten

---

## Security (Kurzfassung)

- **Auth:** `requireAuth()` für User-Routes, `requireAdmin()` für Admin-Routes, `requireSuperAdmin()` für User-Management
- **Public Routes:** `/`, `/api/auth/*`, `/share/*`, `/api/share/*` (in `proxy.ts`)
- **Rate-Limiting:** In-Memory Token Bucket (chat: 20/min, api: 60/min, upload: 10/min)
- **Input-Validierung:** chatId max 20 Zeichen `[a-zA-Z0-9_-]`, Messages max 2000 Zeichen, Body max 5MB
- **CSP:** `script-src 'self' 'unsafe-inline'`, kein `unsafe-eval`. `connect-src` braucht `blob:`.
- **Artifact-Sandbox:** HTML-Preview in iframe mit `sandbox="allow-scripts"`, CSP Meta-Tag Injection
- **SSRF:** `isAllowedUrl()` für web_fetch und MCP-URLs
- **DB:** userId-Scoping auf allen Mutations (defense-in-depth)
- **Credits:** Atomare `db.transaction()` für Balance + Audit-Log

---

## Environment

Alle ENV-Variablen in `.env.example`. Minimum für funktionierende Instanz:

```bash
LOGTO_APP_ID, LOGTO_APP_SECRET, LOGTO_ENDPOINT, LOGTO_BASE_URL, LOGTO_COOKIE_SECRET
DATABASE_URL
AI_GATEWAY_API_KEY
```

Optionale Features werden durch Setzen der jeweiligen API-Keys aktiviert.
Details: `docs/system/deployment-guide.md` und `docs/system/feature-flags-konfiguration.md`

---

## Dokumentation

### System-Docs (aktuell, V1.0)

| Dokument | Beschreibung |
|----------|-------------|
| `docs/system/technical-architecture.md` | Technische Architektur (Tools, Skills, Experts, Memory, MCP, DB, onFinish-Flow) |
| `docs/system/system-prompt-architektur.md` | System-Prompt-Aufbau (7 Layer, Stellschrauben) |
| `docs/system/feature-flags-konfiguration.md` | Feature-Flags, ENV-Referenz, Tier-Baukasten |
| `docs/system/platform-capabilities.md` | Nutzer-Perspektive (Marketing, Feature-Übersicht) |
| `docs/system/deployment-guide.md` | Deployment (Cloud + Self-Hosted + Multi-Instanz) |
| `docs/system/admin-handbuch.md` | Admin-Handbuch (Skills, Experts, Models, MCP, Credits) |
| `docs/system/collaboration-sharing.md` | Chat-Sharing und Collaboration |
| `docs/system/credit-pricing-varianten.md` | Credit-System Preisgestaltung und Szenarien |
| `docs/system/landing-kommunikation.md` | Landing-Page Kommunikation und Messaging |
| `docs/system/tom-datenschutz.md` | Technische und Organisatorische Maßnahmen (Art. 32 DSGVO) |
| `docs/system/datenschutz-übersicht.md` | Verarbeitungsverzeichnis, Rechtsgrundlagen, Auftragsverarbeiter |
| `docs/system/data-retention-policy.md` | Löschfristen und Aufbewahrungsregeln |
| `docs/platform-overview.md` | Plattform-Übersicht (High-Level) |

### Weitere Ordner

| Ordner | Inhalt |
|--------|--------|
| `docs/archive/` | Abgeschlossene PRDs und historische Feature-Docs |
| `docs/ideas/` | Zukunfts-Ideen und Feature-Konzepte |
| `docs/ressoureces/` | Skill-Ressourcen (Carousel, Ebook, Presentation Factory, etc.) |

### Ordner-Level Guidance

| Datei | Scope |
|-------|-------|
| `src/lib/ai/CLAUDE.md` | Tool-System, Skills, Prompts, Image Generation |
| `src/lib/db/CLAUDE.md` | Schema, Queries, Migrations, Seeding, Caching |
| `src/components/CLAUDE.md` | UI-Patterns, shadcn/ui, AI Elements, Generative UI |
| `src/app/api/CLAUDE.md` | Route-Patterns, Guards, Chat-Route-Architektur |
