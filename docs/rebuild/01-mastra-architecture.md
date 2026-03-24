# 01 — Mastra Architecture

## Kern-Primitives

Mastra organisiert AI-Anwendungen um sechs Primitives:

| Primitive | Beschreibung | loschke-chat Äquivalent |
|-----------|-------------|------------------------|
| **Agent** | LLM + Tools + Memory + Instructions als Einheit | Expert + buildSystemPrompt() + build-tools.ts |
| **Tool** | Funktion mit Zod Input/Output Schema | Factory-Pattern Tools in `src/lib/ai/tools/` |
| **Workflow** | XState State Machine mit Steps, Branching, Suspend/Resume | persist.ts onFinish + resolve-context.ts |
| **Memory** | Thread-basierte Konversation + Semantic Recall | Mem0 Integration in `src/lib/memory/` |
| **RAG** | Document → Chunk → Embed → Store → Retrieve Pipeline | Nicht vorhanden (Project Docs als Volltext) |
| **Evals** | Scorer für Output-Qualität, Live + Trace | Nicht vorhanden |

Dazu kommen Cross-Cutting Concerns:
- **Observability** — OpenTelemetry Tracing (ersetzt console.log)
- **MCP** — Client + Server (erweitert @ai-sdk/mcp)
- **Studio** — Lokales Dev-UI (ersetzt manuelles Testing)

---

## Mastra-Klasse: Zentraler Entry Point

Die `Mastra`-Klasse ist der zentrale Configuration Hub:

```typescript
// src/mastra/index.ts
import { Mastra } from '@mastra/core'

export const mastra = new Mastra({
  agents: { general, code, writer, researcher, analyst, seo, visual },
  tools: { createArtifact, webSearch, webFetch, generateImage, ... },
  workflows: { onFinishWorkflow, contextResolutionWorkflow },
  memory: mastraMemory,
  // rag: ragConfig,
  // evals: evalConfig,
  // observability: otelConfig,
})
```

Alle Primitives werden hier registriert und sind über die Mastra-Instanz abrufbar. Dependency Injection statt manuellem Wiring.

---

## Mapping: Mastra-Konzepte → loschke-chat

### Agent = Expert + System Prompt + Tools

**Heute:** Expert ist ein DB-Record mit `systemPrompt`, `allowedTools`, `skillSlugs`, `mcpServerIds`, `temperature`. Der System Prompt wird in `buildSystemPrompt()` aus 6 Layern zusammengebaut. Tools werden in `build-tools.ts` conditional registriert.

**Mit Mastra:** Ein Agent kapselt alles:

```typescript
const writerAgent = new Agent({
  id: 'writer',
  name: 'Content Writer',
  model: resolveModel(expertConfig.modelPreference),
  instructions: async (ctx) => buildSystemPrompt(ctx), // Dynamic!
  tools: { createArtifact, webSearch, loadSkill },
  memory: mastraMemory,
  defaultOptions: { temperature: 0.8 },
})
```

Der Clou: `instructions` kann eine **async Function** sein — unsere 6-Layer System Prompt Assembly läuft als Runtime-Funktion.

### Workflow = onFinish + Context Resolution

**Heute:** `persist.ts` ist eine ~200-Zeilen Funktion mit try/catch Blöcken und fire-and-forget Promises. `resolve-context.ts` hat Phase A (parallel) und Phase B (sequential) als imperativen Code.

**Mit Mastra:** Deklarative Workflows mit expliziten Steps, Retry-Policies und Error Handling. Details in [04-workflow-engine](04-workflow-engine.md).

### Tool = Factory Function → Deklaratives Tool

**Heute:** `createArtifactTool(chatId)` gibt ein Tool-Objekt zurück, das `chatId` über Closure kennt.

**Mit Mastra:** Tools mit `requestContextSchema` für typsicheren Context-Zugriff. Details in [03-tool-system](03-tool-system.md).

### Memory = Mem0 → Mastra Memory

**Heute:** Mem0 Cloud SDK mit Circuit Breaker, 3s Timeout, fire-and-forget Save.

**Mit Mastra:** Built-in Memory mit Thread-Persistenz, Working Memory und Semantic Recall. Alles in eigener DB. Details in [05-memory-rag](05-memory-rag.md).

---

## Integration Pattern: Direct vs. Separate Backend

Mastra bietet zwei Wege in Next.js:

### Option A: Direct Integration (Empfohlen für uns)

Mastra direkt in die Next.js App eingebunden. Ein Deployment, ein Codebase.

```
Next.js App
├── src/app/ (Frontend + API Routes)
├── src/mastra/ (Mastra Agents, Tools, Workflows)
└── src/lib/ (DB, Auth, Storage, Config)
```

**Vorteile:**
- Gleicher Deployment-Flow wie heute (Vercel)
- Kein separater Service zu betreiben
- Shared Types zwischen Frontend und AI-Layer
- Einfacheres Debugging

**Nachteile:**
- AI-Layer skaliert mit Frontend (nicht unabhängig)
- Mastra Studio nur lokal (nicht in Prod)

**Warum für uns:** Wir sind Solo/Small-Team. Ein Service ist einfacher zu betreiben. Unser Traffic rechtfertigt keine separate Skalierung. Vercel Functions skalieren automatisch.

### Option B: Separate Backend

Mastra als eigener Service, Next.js Frontend über MastraClient SDK.

```
Next.js Frontend ←→ Mastra Backend (eigener Service)
```

**Wann relevant:** Wenn mehrere Frontends denselben AI-Backend nutzen sollen. Für Multi-Brand-Deployment (`lernen.diy`, `unlearn.how`) potenziell interessant — aber erst wenn die AI-Logik wirklich identisch ist.

---

## Package-Übersicht

| Package | Zweck | Ersetzt |
|---------|-------|---------|
| `@mastra/core` | Agents, Tools, Mastra-Klasse | route.ts Orchestration, build-tools.ts |
| `@mastra/memory` | Thread Memory + Semantic Recall | src/lib/memory/ (Mem0) |
| `@mastra/rag` | Document Pipeline + Vector Store | Nicht vorhanden |
| `@mastra/pg` | PostgreSQL Storage für Mastra | — |
| `@mastra/evals` | Scorer Framework | Nicht vorhanden |
| `@mastra/mcp` | MCP Client/Server | src/lib/mcp/ (@ai-sdk/mcp) |
| `ai` | Vercel AI SDK (bleibt) | — |
| `@ai-sdk/anthropic` | Anthropic Provider | Bleibt (für Direct-Access) |
| `@ai-sdk/google` | Google Provider | Bleibt (Image Generation) |

**Wichtig:** `@ai-sdk/openai` (für AI Gateway) bleibt bestehen. Mastra nutzt AI SDK Model Routing, wir können weiterhin über den Gateway routen.

---

## Model Routing

### Heute

```typescript
// AI Gateway (OpenAI-compatible)
import { createOpenAI } from '@ai-sdk/openai'
const gateway = createOpenAI({ apiKey: AI_GATEWAY_API_KEY, baseURL: '...' })
const model = gateway('anthropic/claude-sonnet-4-6')
```

### Mit Mastra

Mastra unterstützt Provider-Prefixed Model IDs:

```typescript
// Option 1: Weiterhin über AI Gateway (empfohlen)
const model = gateway('anthropic/claude-sonnet-4-6')

// Option 2: Direkt über Mastra Model Router
// mastra verwendet intern AI SDK Provider
```

**Empfehlung:** AI Gateway beibehalten. Er bietet Caching, Rate Limiting und einheitliches Logging. Mastra's Model Router ist ein Alias für AI SDK Provider — kein Mehrwert gegenüber unserem Gateway-Setup.

**Privacy Routing:** Bleibt custom. Mastra hat keine Built-in Privacy-Routing-Lösung. `resolvePrivacyModel()` bleibt in unserem Code.

---

## Verzeichnisstruktur (Vorschlag)

```
src/
├── app/                    # Next.js Routes (bleibt)
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts    # Thin: Auth → Mastra Agent → Stream
│   │   └── ...             # Andere Routes bleiben
│   └── ...
├── mastra/                 # NEU: Mastra-Layer
│   ├── index.ts            # Mastra Instance
│   ├── agents/
│   │   ├── general.ts
│   │   ├── writer.ts
│   │   ├── code.ts
│   │   ├── researcher.ts
│   │   ├── analyst.ts
│   │   ├── seo.ts
│   │   └── visual.ts
│   ├── tools/
│   │   ├── create-artifact.ts
│   │   ├── web-search.ts
│   │   ├── generate-image.ts
│   │   └── ...
│   ├── workflows/
│   │   ├── on-finish.ts
│   │   └── context-resolution.ts
│   ├── memory/
│   │   └── config.ts
│   ├── rag/
│   │   └── config.ts
│   └── evals/
│       └── scorers.ts
├── lib/                    # Bleibt (DB, Auth, Storage, Config)
├── components/             # Bleibt (UI)
├── config/                 # Bleibt (Features, Prompts)
└── types/                  # Bleibt
```

---

## Serverless-Überlegungen (Vercel)

Mastra in Vercel Serverless Functions erfordert:

1. **next.config.ts**: `serverExternalPackages: ["@mastra/*"]`
2. **Observability Flush**: `await mastra.getObservability()?.flush()` am Ende jeder Request
3. **MCP Serverless Mode**: `serverless: true` auf MCPClient (deaktiviert Subscriptions)
4. **Kein LibSQLStore**: Filesystem-basiert, inkompatibel mit Serverless → nutzen wir nicht (wir haben Neon)

**Kein Blocker:** Mastra ist explizit für Vercel Serverless konzipiert. Neon als DB ist der empfohlene Weg.

---

## Altsystem-Referenzen

Für die Umsetzung dieses Dokuments:

| Thema | Quelle |
|-------|--------|
| Aktuelle Chat-Route Orchestrierung | `src/app/api/chat/route.ts` + `src/app/api/CLAUDE.md` |
| Model Resolution + AI Gateway Setup | `src/lib/ai/CLAUDE.md` → "Model Resolution" |
| Provider-Konfiguration (Gateway, Anthropic, Google, Mistral) | `src/app/api/chat/resolve-context.ts` |
| Privacy Provider Bypass | `src/lib/ai/CLAUDE.md` → "Privacy Provider" |
| Feature Flag System | `src/config/features.ts` + `docs/system/feature-flags-konfiguration.md` |
| next.config.ts Anpassungen | `next.config.ts` (Root) |
| Vercel Deployment Config | `vercel.json` + `docs/system/deployment-guide.md` |
