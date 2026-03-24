# 07 — Frontend Migration

## Grundsatz: Minimale Änderungen

Das Frontend ist der stabilste Teil der App. ChatShell, Sidebar, ArtifactPanel, Streamdown-Rendering und die Admin-UI funktionieren. Der Rebuild fokussiert sich auf den AI-Layer — das Frontend wird nur angepasst wo Mastra andere Datenformate oder APIs liefert.

---

## Was bleibt unverändert

| Bereich | Komponenten | Grund |
|---------|-------------|-------|
| **Layout** | ChatShell, SidebarProvider, ChatHeader | Kein AI-Bezug |
| **Sidebar** | ChatSidebar, NavUser, CreditIndicator | Liest aus DB, nicht aus AI-Layer |
| **Artifacts** | ArtifactPanel, HtmlPreview, CodePreview, ArtifactEditor, QuizRenderer, ReviewRenderer, ImagePreview | Arbeiten mit DB-Daten, nicht mit Stream |
| **Rendering** | Streamdown, chat-prose CSS | Rendert Text unabhängig von Quelle |
| **Generative UI** | AskUser, ContentAlternatives | Pattern bleibt (Inline-Tools ohne execute) |
| **Admin** | SkillsAdmin, ExpertsAdmin, ModelsAdmin, McpAdmin, CreditsAdmin | CRUD-UI, kein AI-Bezug |
| **Auth** | Login/Logout, proxy.ts | Logto, kein Bezug zu AI-Layer |
| **Styling** | Tailwind v4, shadcn/ui, Elevation Classes, Dark Mode | Unverändert |

---

## Was sich ändert

### 1. Chat API Endpoint

**Heute:**
```typescript
// Frontend nutzt useChat (AI SDK) mit Custom Transport
const { messages, append } = useChat({
  transport: new DefaultChatTransport({
    api: '/api/chat',
    body: { chatId, expertSlug, modelId },
  }),
})
```

**Mit Mastra:**

Die Chat-API-Route bleibt `/api/chat`. Intern nutzt sie einen Mastra Agent statt direktem `streamText()`. Für das Frontend ändert sich nichts am Transport — Mastra Agents nutzen das AI SDK Streaming-Protokoll.

```typescript
// route.ts (intern)
// Heute:
const result = streamText({ model, messages, tools })

// Mit Mastra:
const agent = await resolveAgent(expertSlug)
const result = agent.stream(messages, { context: { chatId, userId } })

// Beide returnen einen AI SDK StreamingTextResponse
// → Frontend useChat bleibt identisch
```

**Keine Änderung am Frontend nötig.**

### 2. Expert → Agent Naming

**UI-seitig bleibt "Expert" als Konzept.** Die interne Umstellung auf Mastra Agents ist ein Backend-Detail. Die `experts`-Tabelle bleibt, die Admin-UI verwaltet weiterhin "Experts".

Einzige Änderung: Wenn ein neues Admin-Feature für Mastra-spezifische Agent-Config dazukommt (z.B. Eval-Scores pro Agent), wird die Expert-Admin-UI erweitert.

### 3. Streaming Response Format

Mastra nutzt das AI SDK Streaming-Protokoll. Die Response-Struktur ist kompatibel:

| Chunk Type | AI SDK (heute) | Mastra | Kompatibel? |
|------------|---------------|--------|-------------|
| `text-delta` | Ja | Ja | Ja |
| `tool-call` | Ja | Ja | Ja |
| `tool-result` | Ja | Ja | Ja |
| `reasoning-delta` | Ja | Ja | Ja |
| `finish` | Ja | Ja | Ja |

**Kein Frontend-Rewrite für Streaming nötig.**

### 4. Tool-Part States

Die AI SDK 6 Tool-Part States bleiben identisch:

| State | Bedeutung | UI-Verhalten |
|-------|-----------|-------------|
| `input-streaming` | Tool-Args streamen | Loading Spinner |
| `input-available` | Args fertig, kein execute | Interaktive Komponente |
| `output-available` | Tool-Ergebnis vorhanden | Read-Only Darstellung |
| `output-error` | Fehler | Error Fallback |

**Keine Änderung nötig.**

### 5. Chat Empty State

Wenn neue Features dazukommen (z.B. RAG-basierte Skill-Vorschläge statt statische Liste), ändert sich der Empty State:

**Heute:**
- Expert-Grid (7 Experts)
- Quicktask-Buttons (aus Skills DB)
- Suggestion Chips

**Potenziell mit Mastra:**
- Agent-Grid (identisch, nur Naming)
- Quicktask-Buttons (bleiben, Workflows im Backend)
- Suggestion Chips (bleiben)
- **Neu:** RAG-basierte Vorschläge ("Basierend auf deinem Projekt...")

---

## Admin UI Erweiterungen

### Neue Admin-Seiten (Phase 4+)

| Seite | Inhalt |
|-------|--------|
| `/admin/evals` | Eval-Scores pro Agent, Trend-Charts, Score-Distribution |
| `/admin/workflows` | Workflow-Runs, Failure-Rates, Step-Durations |
| `/admin/rag` | Ingested Documents, Embedding-Status, Re-Ingest Button |

### Bestehende Admin-Seiten (Anpassungen)

| Seite | Änderung |
|-------|----------|
| `/admin/experts` | Optional: Eval-Score Badge pro Expert, Workflow-Config |
| `/admin/skills` | Optional: RAG-Indexierung Status |
| `/admin/mcp-servers` | Minimal: Mastra MCPClient statt @ai-sdk/mcp Config |

---

## Mastra Client SDK

Mastra bietet ein Client SDK (`@mastra/client-next`) für Next.js:

```typescript
import { MastraClient } from '@mastra/client-next'

const client = new MastraClient({
  baseUrl: '/api/mastra', // Proxy zu Mastra
})
```

**Brauchen wir das?** Nein, nicht in Phase 1-3. Unser `useChat` Hook mit `DefaultChatTransport` funktioniert identisch. Das Mastra Client SDK wäre relevant wenn wir:
- Mastra als separaten Backend-Service betreiben (Option B)
- Direkt auf Mastra-spezifische APIs zugreifen wollen (Agent-Status, Workflow-Status)

**Empfehlung:** Nicht einführen. Bestehende useChat + Custom API Routes reichen.

---

## Mastra Studio Integration

Studio läuft nur lokal (`localhost:4111`) und ist kein Teil der Production-App. Aber es ergänzt das Development:

```bash
# Terminal 1: Next.js Dev Server
pnpm dev

# Terminal 2: Mastra Studio
pnpm mastra:studio
```

**Nutzen:**
- Agent-Prompts iterieren ohne Chat-UI
- Workflow-Runs visuell debuggen
- Tool-Calls isoliert testen
- Traces in Real-Time sehen

**Kein Frontend-Code nötig** — Studio ist ein separates Dev-Tool.

---

## Suggested Replies

**Heute:** Fire-and-forget in onFinish. Frontend pollt `/api/chats/[id]/suggestions`.

**Mit Mastra:** Suggested Replies werden ein Workflow-Step mit Retry. Die Frontend-Integration bleibt identisch (Polling oder SSE).

---

## Migration Checklist

### Phase 1 (Keine Frontend-Änderungen)
- [ ] Verify: useChat funktioniert mit Mastra Agent Streaming
- [ ] Verify: Tool-Part States korrekt (input-streaming, input-available, etc.)
- [ ] Verify: Generative UI Komponenten rendern korrekt
- [ ] Verify: Artifact-Erstellung über Tools funktioniert

### Phase 2 (Minimal)
- [ ] Workflow-Status für onFinish (optional: Loading-Indikator)

### Phase 4 (Admin-Erweiterungen)
- [ ] Admin: Eval-Scores Dashboard
- [ ] Admin: Workflow-Runs Overview
- [ ] Admin: RAG Document Status

### Phase 5 (Polish)
- [ ] Mastra Studio Script in package.json
- [ ] Dev-Workflow Dokumentation (Studio + Next.js parallel)

---

## Altsystem-Referenzen

Für die Umsetzung dieses Dokuments:

| Thema | Quelle |
|-------|--------|
| useChat + DefaultChatTransport Setup | `src/components/chat/` → ChatView (Client Component) |
| Tool-Part State Detection | `src/components/chat/` → chat-message.tsx |
| mapSavedPartsToUI() | `src/hooks/use-artifact.ts` |
| Generative UI Komponenten | `src/components/generative-ui/` → AskUser, ContentAlternatives |
| Artifact Panel + Renderer | `src/components/assistant/` → ArtifactPanel, HtmlPreview, etc. |
| Chat Empty State (Expert Grid, Quicktasks) | `src/components/chat/` → ChatEmptyState |
| Streaming Markdown (Streamdown) | `src/lib/streamdown-safelist.ts` + globals.css `.chat-prose` |
| Admin UI Patterns | `src/components/admin/` + `src/components/CLAUDE.md` |
| Sidebar + Layout | `src/components/layout/` |
| Suggested Replies Frontend | `src/components/chat/` → Suggestion Chips |
| Component Architecture Übersicht | `src/components/CLAUDE.md` |
