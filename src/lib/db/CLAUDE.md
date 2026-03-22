# Database

Guidance fuer `src/lib/db/` — Schema, Queries, Migrations und Seeding.

## Schema-Konventionen

- **PKs:** nanoid text (nicht UUID, nicht auto-increment)
- **User-ID:** Logto `sub` claim als text. Kein FK zu users-Tabelle noetig.
- **Arrays:** `jsonb` fuer Listen (skillSlugs, allowedTools, mcpServerIds, categories)
- **Timestamps:** `createdAt` (default now), `updatedAt` (manuell setzen bei Mutations)
- **Soft Delete:** Nicht verwendet. Loeschen ist endgueltig.
- **Naming:** Tabellen snake_case plural (credit_transactions), Spalten camelCase in Drizzle

## Schema-Dateien (`schema/`)

| Datei | Tabellen |
|-------|---------|
| `users.ts` | users (creditsBalance, customInstructions, memoryEnabled, defaultModelId) |
| `chats.ts` | chats (userId, expertId, projectId, title, isPinned, modelId) |
| `messages.ts` | messages (chatId FK cascade, role, parts jsonb, metadata jsonb) |
| `artifacts.ts` | artifacts (chatId, type, title, content, version fuer Optimistic Locking) |
| `experts.ts` | experts (userId nullable=global, slug unique, systemPrompt, skillSlugs) |
| `skills.ts` | skills (slug unique, mode skill/quicktask, fields jsonb, content) |
| `models.ts` | models (modelId unique, inputPrice/outputPrice jsonb, capabilities) |
| `mcp-servers.ts` | mcp_servers (serverId unique, url, headers, envVar, enabledTools) |
| `projects.ts` | projects (userId, instructions, defaultExpertId) |
| `project-documents.ts` | project_documents (projectId FK, title, content) |
| `usage-logs.ts` | usage_logs (alle Token-Typen, stepCount) |
| `credit-transactions.ts` | credit_transactions (type, amount signed, balanceAfter) |
| `consent-logs.ts` | consent_logs (consentType, decision, piiFindings, routedModel) |

Re-Export via `schema/index.ts`.

## Query-Pattern

- Alle Queries in `queries/` als benannte Funktionen, nicht inline in Route-Handlern.
- **userId-Scoping:** Alle Mutations (update, delete) pruefen `WHERE userId = ?` (defense-in-depth).
- **Pagination:** SQL-Level `LIMIT/OFFSET`, kein JS-Slicing.
- **Atomare Transaktionen:** `db.transaction()` fuer Credit-Deduktion (Balance + Audit-Log).

## Cache-Pattern

DB-backed Konfigurationen nutzen Module-Level TTL-Caches:

| Entitaet | TTL | Cache-Funktion | Invalidierung |
|----------|-----|----------------|---------------|
| Models | 60s | `getModels()` | `clearModelCache()` |
| Skills | 60s | `discoverSkills()` | `clearSkillCache()` |
| Quicktasks | 60s | `discoverQuicktasks()` | `clearSkillCache()` |
| MCP-Server | 60s | `getMcpServers()` | `clearMcpServerCache()` |
| User-Prefs | 60s | `getUserPreferences()` | Kein expliziter Clear |

Admin-Mutations rufen `clearCache()` auf → Aenderungen wirksam in Sekunden.

## Migration-Workflow

```bash
# Entwicklung (schnell, keine History)
pnpm db:push

# Produktion (mit Migration-Files in drizzle/)
pnpm db:generate    # SQL-Migration generieren
pnpm db:migrate     # Migration ausfuehren
```

## Seeding

```bash
pnpm db:seed
```

Reihenfolge: Experts → Skills → Models → MCP-Server.
Idempotent via upsert (by slug/modelId/serverId). Kann beliebig oft laufen.

- Experts: `seed/default-experts.ts` (7 globale)
- Skills: `seed/seed-skills.ts` (aus `skills/*/SKILL.md`)
- Models: `seed/seed-models.ts` (aus `MODELS_CONFIG` ENV)
- MCP: `seed/seed-mcp-servers.ts` (aus `MCP_SERVERS_CONFIG` ENV)

## Connection

Module-Level Singleton in `index.ts`. Nie `new Pool()` in Route-Handlern aufrufen.

```
src/lib/db/
├── index.ts           — DB-Client Singleton
├── schema/            — Drizzle Schema-Definitionen
├── schema/index.ts    — Re-Export aller Schemas
├── queries/           — Benannte Query-Funktionen
└── seed/              — Idempotente Seed-Scripts
```
