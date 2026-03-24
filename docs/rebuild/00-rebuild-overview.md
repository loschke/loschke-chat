# Rebuild Overview: loschke-chat auf Mastra

## Warum ein Rebuild?

loschke-chat v1 ist eine funktionale KI-Chat-Plattform mit 12 Tools, Expert-System, Memory, MCP und Privacy Controls. Die Architektur hat drei strukturelle Schwachstellen, die mit Patches nicht lösbar sind:

### 1. Keine Workflow-Orchestrierung

Der onFinish-Flow in `src/app/api/chat/persist.ts` führt 8+ Steps sequentiell aus — davon 4 als fire-and-forget ohne Retry, Error Handling oder Rollback. Title-Generierung, Suggested Replies und Memory-Extraction können still fehlschlagen. Neue Steps erfordern direkte Modifikation der Route.

### 2. Keine Observability

Kein Tracing von LLM-Calls, Tool-Executions oder Agent-Verhalten. Debugging erfolgt über console.log. In Production gibt es keine Sichtbarkeit auf Latenz, Token-Verbrauch pro Step oder Fehlerraten.

### 3. Keine Qualitätsmessung

Keine Möglichkeit, Output-Qualität systematisch zu bewerten. Keine Evals, keine Scorer, keine Trend-Analyse. Prompt-Änderungen werden ohne Messung deployt.

### Zusätzliche Limitierungen

- **Kein RAG**: Project Documents werden komplett in den Context geladen statt semantisch durchsucht
- **Externe Memory-Abhängigkeit**: Mem0 Cloud als SaaS-Dependency (DSGVO-Risiko, Vendor Lock-in)
- **Tight Coupling**: Chat-Route (`route.ts`) ist monolithischer Orchestrator — Context Resolution, Tool Building, Streaming und Persistence in einer Datei

---

## Was ist Mastra?

Open-Source TypeScript Framework (MIT-Lizenz), gebaut **auf dem Vercel AI SDK**. Erstellt vom Gatsby-Team. Positionierung: Production-Grade Agent-Infrastruktur für TypeScript.

Mastra erweitert das AI SDK um:
- **Agents** — LLM + Tools + Memory + Instructions als Einheit
- **Workflows** — XState-basierte State Machines mit Suspend/Resume
- **Memory** — Thread-basiert mit Semantic Recall, DB-backed
- **RAG** — Vollständige Pipeline (Chunk → Embed → Store → Retrieve)
- **Evals** — Scorer-Framework mit Live + Trace Evaluation
- **Observability** — OpenTelemetry mit Langfuse/Datadog Export
- **MCP** — Client + Server Support
- **Studio** — Lokales Dev-UI für Agent-Testing und Workflow-Visualisierung

---

## Ziele des Rebuilds

1. **Workflow-Orchestrierung** für alle async Operationen (onFinish, Context Resolution)
2. **Observability** für jeden LLM-Call, Tool-Call und Workflow-Step
3. **RAG Pipeline** für Project Documents und Skill Content
4. **Eval-Framework** für systematische Output-Qualitätsmessung
5. **Memory in eigener DB** statt externer SaaS (DSGVO-konform)
6. **Cleaner Tool-System** mit deklarativen Definitionen statt Factory-Closures
7. **Developer Experience** mit Mastra Studio und Playground

## Nicht-Ziele

- Kein Frontend-Rewrite — ChatShell, Sidebar, ArtifactPanel, Streamdown bleiben
- Kein Auth-Wechsel — Logto bleibt
- Kein DB-Wechsel — Neon + Drizzle bleiben (erweitert um pgvector)
- Kein Deployment-Wechsel — Vercel bleibt
- Keine Feature-Reduktion — alle 12 Tools + alle Feature-Flags bleiben

---

## Was bleibt

| Bereich | Details |
|---------|---------|
| **Frontend** | Next.js 16 App Router, shadcn/ui, Tailwind v4, Streamdown, AI Elements |
| **Auth** | Logto OIDC via `@logto/next`, proxy.ts Pattern |
| **Datenbank** | Neon Postgres + Drizzle ORM (Schema erweitert, nicht ersetzt) |
| **Storage** | Cloudflare R2 für File-Upload |
| **Deployment** | Vercel mit Multi-Instance Pattern |
| **UI Patterns** | Generative UI (Inline-Tools + Artifact-Tools), Split-View, Admin UI |
| **Business Logic** | Credits, Business Mode, Privacy Routing, Feature Flags |

## Was sich ändert

| Bereich | v1 (Custom) | v2 (Mastra) |
|---------|-------------|-------------|
| **AI-Layer** | Vercel AI SDK direkt | Mastra Agents auf AI SDK |
| **Experts** | DB-Config + buildSystemPrompt() | Mastra Agent-Klassen mit Dynamic Instructions |
| **Tools** | Factory Functions + build-tools.ts | Deklarative Mastra Tools mit Zod |
| **Orchestrierung** | route.ts + persist.ts (imperativ) | Mastra Workflows (deklarativ) |
| **Memory** | Mem0 Cloud (extern) | Mastra Memory (eigene DB) |
| **RAG** | Nicht vorhanden | Mastra RAG + pgvector |
| **Evals** | Nicht vorhanden | @mastra/evals Scorer |
| **Observability** | console.log | OpenTelemetry + Langfuse |
| **MCP** | @ai-sdk/mcp direkt | Mastra MCPClient (erweitert) |
| **Dev Tools** | Keine | Mastra Studio (localhost:4111) |

---

## Architektur: Current vs. Mastra

### Current Architecture

```
Next.js App Router
├── /api/chat/route.ts (Monolithischer Orchestrator)
│   ├── resolve-context.ts (Expert, Model, Skills, Memory, Prompt)
│   ├── build-messages.ts (Message Transformation)
│   ├── build-tools.ts (Conditional Tool Registration)
│   └── persist.ts (onFinish: 8+ Fire-and-Forget Steps)
├── src/lib/ai/tools/ (12 Factory-Pattern Tools)
├── src/lib/memory/ (Mem0 Integration)
├── src/lib/mcp/ (AI SDK MCPClient)
└── src/config/prompts.ts (6-Layer System Prompt)
```

### Mastra Architecture

```
Next.js App Router
├── /api/chat/route.ts (Thin Layer → Mastra Agent)
├── src/mastra/
│   ├── agents/ (Expert-Agents mit Dynamic Instructions)
│   ├── tools/ (Deklarative Tool-Definitionen)
│   ├── workflows/
│   │   ├── on-finish.ts (Message Save, Credits, Title, Memory)
│   │   └── context-resolution.ts (Expert, Model, Skills, Prompt)
│   ├── memory/ (Thread Memory + Semantic Recall)
│   ├── rag/ (Document Pipeline + pgvector)
│   ├── evals/ (Scorer-Definitionen)
│   └── index.ts (Mastra Instance)
├── src/lib/db/ (Erweitert: pgvector, mastra_memories, scorers)
└── Mastra Studio (localhost:4111, Dev only)
```

---

## Rebuild-Prinzipien

1. **Feature Parity First** — Kein Feature darf verloren gehen. Alle 12 Tools, alle Feature-Flags, Business Mode, Credits müssen funktionieren bevor neue Features gebaut werden.

2. **Inkrementell migrieren** — Nicht alles auf einmal. Phase für Phase, jede Phase testbar und deploybar.

3. **DB erweitern, nicht ersetzen** — Bestehende Tabellen bleiben. Neue Tabellen (memories, scorers, embeddings) kommen dazu. Keine Breaking Changes an der DB.

4. **Frontend minimal anfassen** — Die Chat-UI funktioniert. Änderungen nur wo Mastra andere Datenformate liefert (Streaming, Tool-Results).

5. **Observability von Tag 1** — Tracing ab Phase 1 aktiv. Nicht als Nachgedanke in Phase 4.

6. **Keine Mastra-API-Annahmen** — Jedes Code-Beispiel in diesen Docs muss gegen die aktuelle Mastra-Dokumentation verifiziert werden bevor es implementiert wird.

---

## Dokumenten-Übersicht

| Dokument | Inhalt |
|----------|--------|
| [01-mastra-architecture](01-mastra-architecture.md) | Mastra-Primitives, Mapping, Integration Pattern |
| [02-agent-system](02-agent-system.md) | Expert → Agent, Instructions, Skills |
| [03-tool-system](03-tool-system.md) | Tools deklarativ, Inline/Artifact, MCP |
| [04-workflow-engine](04-workflow-engine.md) | onFinish, Context Resolution, Retry |
| [05-memory-rag](05-memory-rag.md) | Memory-Migration, RAG Pipeline, DSGVO |
| [06-observability-evals](06-observability-evals.md) | Tracing, Langfuse, Scorer |
| [07-frontend-migration](07-frontend-migration.md) | UI-Änderungen, Streaming, Admin |
| [08-database-migration](08-database-migration.md) | Schema-Erweiterung, pgvector |
| [09-migration-roadmap](09-migration-roadmap.md) | 5 Phasen, Feature Parity Checklist |

---

## Altsystem-Referenzen

Diese Rebuild-Docs beschreiben Architektur und Vorgehen. Für Implementation-Details muss der umsetzende Agent die folgenden Quellen konsultieren:

### Architektur-Docs (docs/system/)

| Dokument | Enthält |
|----------|---------|
| `docs/system/technical-architecture.md` | Tools, Skills, Experts, Memory, MCP, DB, onFinish-Flow im Detail |
| `docs/system/system-prompt-architektur.md` | 6-Layer Prompt Assembly, Stellschrauben, Beispiele |
| `docs/system/feature-flags-konfiguration.md` | Alle 12 Feature Flags, ENV-Referenz, Tier-Baukasten |
| `docs/system/platform-capabilities.md` | Nutzer-Perspektive, Feature-Übersicht |
| `docs/system/deployment-guide.md` | Cloud + Self-Hosted + Multi-Instanz Setup |
| `docs/system/admin-handbuch.md` | Admin-UI für Skills, Experts, Models, MCP, Credits |

### Code-Level Guidance (CLAUDE.md Files)

| Datei | Enthält |
|-------|---------|
| `CLAUDE.md` (Root) | Gesamtarchitektur, Konventionen, Commands, Routing |
| `src/lib/ai/CLAUDE.md` | Tool-System, Skills, Prompts, Image Generation Details |
| `src/lib/db/CLAUDE.md` | Schema, Queries, Migrations, Seeding, Cache Pattern |
| `src/components/CLAUDE.md` | UI-Patterns, Generative UI, Artifact Panel, Admin |
| `src/app/api/CLAUDE.md` | Route-Patterns, Auth Guards, Chat-Route Architektur |

### Feature-Docs

| Datei | Enthält |
|-------|---------|
| `docs/features/generative-ui-tools-guide.md` | Inline-Tool + Artifact-Tool Patterns, Checklisten |
| `docs/features/privacy-family-deployment-guide.md` | Privacy Routing, Tier-System, DSGVO |

### Anweisung für den umsetzenden Agent

**Vor jeder Phase:** Die relevanten CLAUDE.md Files und docs/system/ Dokumente lesen. Die Rebuild-Docs geben die Richtung vor, die Altsystem-Docs liefern die konkreten Implementierungsdetails (Funktionssignaturen, Business Logic, Query-Patterns, Prompt-Templates).
