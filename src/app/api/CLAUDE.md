# API Routes

Guidance fuer `src/app/api/` — Route-Patterns, Guards, Validierung und Chat-Architektur.

## Auth-Guards

| Guard | Verwendung | Verhalten bei Fehler |
|-------|-----------|---------------------|
| `requireAuth()` | Alle User-Routes | 401, stellt User-DB-Upsert sicher |
| `requireAdmin()` | `/api/admin/*` Routes | 401/403, prueft ADMIN_EMAILS |

**Nie `getUser()` in API-Routes verwenden** — das stellt keinen DB-Upsert sicher. Immer `requireAuth()`.

## Feature-Gating

Deaktivierte Features geben 404 zurueck:

```typescript
if (!features.storage.enabled) {
  return new Response("Storage is disabled", { status: 404 })
}
```

Alle optionalen Feature-Routes pruefen `features.X.enabled` als erstes.

## Rate-Limiting

In-Memory Token Bucket (`src/lib/rate-limit.ts`):

| Preset | Limit | Routes |
|--------|-------|--------|
| `chat` | 20/min | `/api/chat` |
| `api` | 60/min | `/api/chats`, `/api/models`, `/api/experts`, `/api/credits`, etc. |
| `web` | 30/min | `/api/web/*` |
| `upload` | 10/min | `/api/upload` (POST) |

## Input-Validierung

- **chatId:** Max 20 Zeichen, nur `[a-zA-Z0-9_-]`
- **Message-Rollen:** Nur `user` und `assistant` (Zod)
- **Message-Limit:** Max 50 Messages pro Request
- **Nachrichtenlaenge:** Max 2000 Zeichen pro User-Nachricht
- **Body-Size:** Max 5MB (Content-Length + rawBody.length)
- **ModelId:** Gegen Model-Registry validiert

## Error-Response Format

```typescript
return Response.json({ error: "Beschreibung" }, { status: 400 })
```

Konsistent JSON mit `error` Feld. Deutsche Fehlermeldungen fuer User-facing Errors.

## Chat-Route Architektur

`/api/chat/route.ts` ist ein schlanker Orchestrator. Logik in 4 Modulen:

### resolve-context.ts

Parallel in Phase A:
- `getChatById()` → existierender Expert/Projekt
- `getUserPreferences()` → Custom Instructions, Memory-Toggle, Default-Model
- `discoverSkills()` → alle aktiven Skills (cached)
- `getModels()` → Model-Cache aufwaermen
- `getMcpServers()` → MCP-Cache aufwaermen

Dann sequenziell:
- Expert aufloesen (Request → Chat → Projekt-Default)
- Model aufloesen (Quicktask → Expert → User → System-Default)
- Temperature aufloesen (Quicktask → Expert → System-Default 0.7)
- Memory suchen (nur neue Chats, 3s Timeout)
- System-Prompt bauen (6 Layer)

### build-messages.ts

- System-Prompt als erste Message
- UI-Messages zu Model-Messages konvertieren
- Anthropic Cache Control (`cacheControl: { type: "ephemeral" }`) auf System-Prompt
- File-Parts fuer Gateway-Kompatibilitaet anpassen

### build-tools.ts

- Bedingte Tool-Registrierung (siehe `src/lib/ai/CLAUDE.md`)
- MCP-Tool-Discovery mit Collision Guard
- Expert allowedTools Filter

### persist.ts (onFinish)

Reihenfolge nach Chat-Response:

| # | Operation | Modus |
|---|-----------|-------|
| 1 | R2 File Persist (data-URLs → R2-URLs) | Awaited |
| 2 | Response-Parts sammeln | Sync |
| 3 | Fake-Artifact-Erkennung | Sync |
| 4 | Messages + Usage speichern | Awaited |
| 5 | Title-Generierung | Fire-and-Forget |
| 6 | Credit-Deduktion | Awaited |
| 7 | Suggested Replies | Fire-and-Forget |
| 8 | Memory-Extraktion | Fire-and-Forget |
| — | MCP Cleanup | Finally |

## Route-Uebersicht

```
api/
├── auth/           — Sign-In, Callback, Sign-Out
├── chat/           — Unified Chat (POST, Streaming)
├── chats/          — Chat-History CRUD
├── models/         — Model-Registry (GET)
├── experts/        — Expert-Registry (GET, POST, PATCH, DELETE)
├── artifacts/      — Artifact CRUD (GET, PATCH)
├── credits/        — Credit Balance + Transactions (GET)
├── upload/         — File-Upload/Download/Delete (R2)
├── web/            — Search, Scrape, Crawl, Extract (Firecrawl)
├── user/           — Instructions, Memories
├── skills/         — Quicktasks (GET, public)
├── projects/       — Projekte CRUD
├── business-mode/  — PII-Check, Redact, Consent, Status
└── admin/
    ├── skills/     — Admin Skills CRUD + Import
    ├── experts/    — Admin Experts CRUD + Import
    ├── models/     — Admin Models CRUD + Import
    ├── mcp-servers/ — Admin MCP CRUD + Health
    ├── credits/    — Admin Credit-Grant + Balances
    └── export/     — Bulk-Export (skills, experts, models, mcp-servers)
```
