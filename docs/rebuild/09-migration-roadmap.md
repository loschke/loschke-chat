# 09 — Migration Roadmap

## Phasen-Übersicht

```
Phase 1: Foundation        Phase 2: Workflows       Phase 3: Memory & RAG
(Mastra Setup, Agents,     (onFinish, Context       (Mem0 ablösen, pgvector,
 Tools, Basis-Tracing)      Resolution, Retry)       Document Pipeline)
        │                        │                        │
        ▼                        ▼                        ▼
   Feature Parity           Robustheit              Neue Capabilities
   (alle 12 Tools)          (kein fire-and-forget)  (RAG, DSGVO Memory)
                                                          │
                                                          ▼
                              Phase 4: Evals         Phase 5: Polish
                              (Scorer, Langfuse      (Admin UI, Studio,
                               Dashboard, Trends)     Dev Workflow)
```

---

## Phase 1: Foundation

**Ziel:** Feature Parity — die App funktioniert identisch wie heute, aber auf Mastra.

**Dauer-Schätzung:** Schwerpunkt-Phase

### Scope

1. **Mastra Package Setup**
   - `@mastra/core` installieren
   - `src/mastra/` Verzeichnisstruktur anlegen
   - Mastra Instance konfigurieren (`src/mastra/index.ts`)
   - `next.config.ts`: `serverExternalPackages: ["@mastra/*"]`

2. **Agent-Definitionen** (7 Agents)
   - general, code, writer, researcher, analyst, seo, visual
   - Dynamic Instructions aus bestehendem `buildSystemPrompt()`
   - DB-driven Agent Resolution (Expert-Tabelle bleibt)
   - Temperature + Model aus Expert-Config

3. **Tool-Migration** (12 Tools)
   - Alle Tools als `createTool()` mit Zod Schemas
   - `requestContextSchema` für chatId, userId
   - Feature-Gating in Tool Registry
   - MCP-Integration auf Mastra MCPClient
   - Inline-Tools (ask_user, content_alternatives) ohne execute

4. **Chat Route Umbau**
   - `/api/chat/route.ts` → Thin Layer (Auth → Agent → Stream)
   - `resolve-context.ts` → In Agent Instructions integriert
   - `build-tools.ts` → Tool Registry + Agent Binding
   - `persist.ts` → Bleibt als Zwischenlösung (Workflow kommt in Phase 2)

5. **Basis-Observability**
   - Langfuse Setup (Account + Keys)
   - Mastra Observability aktivieren
   - Trace Flush in Serverless Routes
   - SensitiveDataFilter für PII

### Dependencies
- Keine externen Dependencies außer Mastra Packages
- Neon DB bleibt unverändert

### Risiken
- **API-Inkompatibilität:** Mastra Agent.stream() Output muss mit useChat Frontend kompatibel sein
- **Tool-Part States:** AI SDK 6 Part States müssen identisch funktionieren
- **Performance:** Mastra Overhead auf Cold Start in Serverless

### Akzeptanzkriterien
- [ ] Alle 7 Agents antworten korrekt (System Prompt identisch)
- [ ] Alle 12 Tools funktionieren (create_artifact, web_search, generate_image, etc.)
- [ ] Inline-Tools rendern korrekt im Frontend (ask_user, content_alternatives)
- [ ] MCP-Tools werden geladen und funktionieren
- [ ] Expert-Wechsel funktioniert
- [ ] Quicktasks funktionieren
- [ ] Feature Flags greifen (deaktivierte Features = Tools nicht verfügbar)
- [ ] Streaming Response im Frontend identisch
- [ ] Credits-Berechnung funktioniert
- [ ] Business Mode / Privacy Routing funktioniert
- [ ] Traces in Langfuse sichtbar

---

## Phase 2: Workflows

**Ziel:** Fire-and-forget eliminieren. Jede async Operation hat Retry und Error Handling.

### Scope

1. **onFinish Workflow**
   - `persist.ts` → Mastra Workflow mit Steps
   - R2 File Persist (retry: 2x)
   - Message + Usage Save (retry: 3x)
   - Credit Deduction (retry: 3x, alert on failure)
   - Title Generation (retry: 2x, optional)
   - Suggested Replies (retry: 2x, optional)
   - Memory Extraction (retry: 2x, optional)
   - MCP Cleanup (always)

2. **Context Resolution Workflow** (Optional)
   - Phase A parallel, Phase B sequential als Workflow
   - Benefit: Tracing pro Step, Error Handling
   - Kann auch als Funktion bleiben (weniger komplex)

3. **Quicktask Workflow**
   - Template Render → Agent Generate → Artifact Save
   - Als registrierbarer Workflow

### Dependencies
- Phase 1 muss abgeschlossen sein
- Optional: `workflow_runs` Tabelle für persistentes Tracking

### Risiken
- **Latenz:** Workflow-Overhead darf onFinish nicht signifikant verlangsamen
- **Serverless Timeout:** Vercel Functions haben 60s Timeout (Pro: 300s). onFinish muss darunter bleiben.

### Akzeptanzkriterien
- [ ] onFinish Workflow läuft erfolgreich (alle Steps)
- [ ] Retry funktioniert bei simulierten Fehlern
- [ ] Optionale Steps (Title, Suggestions, Memory) blockieren nicht bei Fehler
- [ ] Credit Deduction ist atomar + hat Alert bei Failure
- [ ] Workflow-Traces in Langfuse mit Step-Details sichtbar
- [ ] Keine fire-and-forget Operationen mehr
- [ ] Performance: onFinish < 30s (inklusive Retries)

---

## Phase 3: Memory & RAG

**Ziel:** Mem0 ablösen, RAG für Project Documents, DSGVO-konforme Memory.

### Scope

1. **pgvector Setup**
   - Extension auf Neon aktivieren
   - Drizzle Schema für `mastra_memories`, `document_embeddings`
   - Migrationen generieren und deployen

2. **Mastra Memory**
   - PgStorage mit Neon konfigurieren
   - Thread Memory für Chat-Kontext
   - Semantic Recall für automatische Kontext-Anreicherung
   - Working Memory für User-Präferenzen

3. **Mem0 Migration**
   - Export-Script für bestehende Mem0 Memories
   - Import in `mastra_memories`
   - Embeddings generieren
   - `save_memory` / `recall_memory` Tools auf Mastra Memory umstellen
   - Mem0 SDK entfernen

4. **RAG Pipeline**
   - Document Ingestion (Project Documents → Chunks → Embeddings)
   - Semantic Search in Agent Instructions (Layer 5)
   - `project_documents.embedding_status` Column
   - Admin-UI: Re-Ingest Button (optional)

5. **DSGVO Features**
   - `/api/user/memories/export` — Alle Memories als JSON
   - `/api/user/memories/delete` — Alle Memories löschen
   - Audit Trail in consent_logs

### Dependencies
- Phase 1+2 müssen abgeschlossen sein
- pgvector Extension auf Neon
- Embedding-Model (text-embedding-3-small über AI Gateway oder direkt)

### Risiken
- **Embedding-Qualität:** Deutsche Texte funktionieren schlechter mit englisch-optimierten Modellen
- **Mem0 Migration:** Daten-Export aus Mem0 API muss vollständig sein
- **pgvector Performance:** Index-Tuning nötig bei wachsender Datenmenge
- **Kosten:** Embedding-API-Calls für alle Dokumente

### Akzeptanzkriterien
- [ ] Memory Search funktioniert ohne Mem0 (rein Mastra Memory)
- [ ] Semantic Recall findet relevante vergangene Konversationen
- [ ] Project Documents werden korrekt chunked und embedded
- [ ] RAG-Suche liefert relevante Dokument-Abschnitte
- [ ] User kann Memories exportieren (DSGVO Art. 20)
- [ ] User kann Memories löschen (DSGVO Art. 17)
- [ ] Mem0 SDK komplett entfernt
- [ ] Alle Memory-Daten in eigener DB (Neon EU)

---

## Phase 4: Evals & Observability

**Ziel:** Systematische Output-Qualitätsmessung und Production Monitoring.

### Scope

1. **Scorer-Definitionen**
   - Relevance Scorer (LLM-basiert)
   - Format Scorer (Rule-based)
   - Hallucination Scorer (LLM-basiert)
   - Tool Usage Scorer (Rule-based)

2. **Live Evals**
   - 5% Sampling Rate in Production
   - Scorer-Results in `mastra_scorers` Tabelle
   - Langfuse Score Integration

3. **Langfuse Dashboard**
   - Score-Trends über Zeit
   - Per-Agent Score Distribution
   - Token-Cost-Analyse
   - Latency Monitoring

4. **Admin UI**
   - `/admin/evals` Seite mit Score-Charts
   - Score-Badge pro Expert in Expert-Liste

### Dependencies
- Phase 1-3 abgeschlossen
- `mastra_scorers` Tabelle (Phase 4 Migration)
- Langfuse Account mit Score-Integration

### Risiken
- **Eval-Kosten:** LLM-basierte Scorer verbrauchen Tokens (Haiku für Kosten-Effizienz)
- **Sampling Bias:** 5% Sampling kann Edge Cases verpassen

### Akzeptanzkriterien
- [ ] Scorer laufen im Hintergrund (kein Impact auf Chat-Latenz)
- [ ] Scores in Langfuse Dashboard sichtbar
- [ ] Trend-Analyse zeigt Qualitätsveränderungen über Zeit
- [ ] Admin-UI zeigt aktuelle Scores pro Agent
- [ ] Token-Kosten für Evals < 5% der Gesamt-Token-Kosten

---

## Phase 5: Polish & Dev Experience

**Ziel:** Developer Experience, Dokumentation, Cleanup.

### Scope

1. **Mastra Studio**
   - `pnpm mastra:studio` Script
   - Dev-Workflow-Dokumentation
   - Agent-Test-Cases in Studio

2. **Admin UI Erweiterungen**
   - Workflow-Runs Übersicht (optional)
   - RAG Document Status
   - Embedding Re-Ingest UI

3. **Code Cleanup**
   - Alte resolve-context.ts entfernen
   - Alte build-tools.ts entfernen
   - Alte persist.ts entfernen
   - Mem0 Client Code entfernen
   - Ungenutzte Imports/Dependencies

4. **Dokumentation aktualisieren**
   - CLAUDE.md auf Mastra-Architektur aktualisieren
   - docs/system/ aktualisieren
   - Component CLAUDE.md aktualisieren

5. **Performance Tuning**
   - Cold Start Optimierung
   - pgvector Index Tuning
   - Memory Search Latenz optimieren

### Akzeptanzkriterien
- [ ] Mastra Studio läuft lokal und zeigt alle Agents
- [ ] Kein alter Code mehr vorhanden (clean removal)
- [ ] Dokumentation aktuell und korrekt
- [ ] Cold Start < 3s auf Vercel

---

## Feature Parity Checklist

Alle Features der v1 müssen in der Mastra-Version funktionieren:

### Tools (12)
- [ ] create_artifact — Dokument/HTML/Code erstellen
- [ ] create_quiz — Interaktiven Test erstellen
- [ ] create_review — Abschnittsweises Review
- [ ] ask_user — Strukturierte Rückfrage (Inline, kein execute)
- [ ] content_alternatives — Tab-View Varianten (Inline, kein execute)
- [ ] web_search — Web-Suche (Firecrawl/Jina/Tavily/Perplexity)
- [ ] web_fetch — URL-Inhalt abrufen
- [ ] save_memory — Explizit Memory speichern
- [ ] recall_memory — Explizit Memory abrufen
- [ ] generate_image — Bild generieren (Gemini)
- [ ] load_skill — Skill-Content laden
- [ ] parse_fake_artifact — Fallback für Models ohne Tool-Calling

### Feature Flags (12)
- [ ] chat — Chat-Feature aktiviert
- [ ] mermaid — Diagramm-Rendering
- [ ] darkMode — Theme Toggle
- [ ] web — Web-Features (Firecrawl)
- [ ] search — Web-Suche
- [ ] storage — R2 File Upload
- [ ] mcp — MCP Client
- [ ] admin — Admin UI
- [ ] memory — Memory System
- [ ] imageGeneration — Bildgenerierung
- [ ] businessMode — PII Detection + Privacy Routing
- [ ] credits — Credit System

### Expert System
- [ ] 7 Default Experts (general, code, writer, researcher, analyst, seo, visual)
- [ ] Expert-Wechsel mid-Chat
- [ ] Expert mit Custom System Prompt
- [ ] Expert mit Model Preference
- [ ] Expert mit Temperature Override
- [ ] Expert mit Skill-Priorisierung
- [ ] Expert mit Tool Allowlist
- [ ] Expert mit MCP Server Binding

### Core Features
- [ ] Streaming Chat Response
- [ ] Anthropic Cache Control
- [ ] Adaptive/Extended Thinking
- [ ] File Upload (R2, bis 10MB)
- [ ] Artifact Panel (Split-View)
- [ ] Artifact Versioning (Optimistic Locking)
- [ ] Chat History (CRUD)
- [ ] Chat Pinning
- [ ] Title Auto-Generation
- [ ] Suggested Replies
- [ ] Quicktask Execution
- [ ] Project Context
- [ ] Custom User Instructions

### Business Features
- [ ] Credit System (Deduction + Balance + Transactions)
- [ ] Business Mode (PII Detection)
- [ ] Privacy Routing (EU/Local Model)
- [ ] Consent Logging
- [ ] Rate Limiting

### Admin
- [ ] Skills CRUD + Seed
- [ ] Experts CRUD + Seed
- [ ] Models CRUD + Seed
- [ ] MCP Servers CRUD + Seed
- [ ] Credits Management
- [ ] Export Functions

### Multi-Instance
- [ ] Brand-spezifisches Deployment (NEXT_PUBLIC_BRAND)
- [ ] Feature-Set pro Instance via ENV
- [ ] Separate DB pro Instance

---

## Entscheidungen die vor Phase 1 getroffen werden müssen

1. **Mastra Version:** Welche Version pinnen? (Framework ist aktiv in Entwicklung)
2. **Integration Pattern:** Direct (empfohlen) oder Separate Backend?
3. **Memory Phase 1:** Mem0 beibehalten oder direkt Mastra Memory?
4. **Langfuse:** Cloud oder Self-Hosted?
5. **Embedding Model:** text-embedding-3-small (OpenAI) oder Alternative?
6. **Branch-Strategie:** Feature Branch oder neues Repo?

---

## Abhängigkeiten zwischen Phasen

```
Phase 1 ──────────→ Phase 2 ──────────→ Phase 3 ──────→ Phase 4
(Foundation)        (Workflows)          (Memory/RAG)    (Evals)
                                                              │
                                              Phase 5 ←──────┘
                                              (Polish)
```

- Phase 2 braucht Phase 1 (Agents + Tools müssen funktionieren)
- Phase 3 braucht Phase 2 (Memory Extraction als Workflow Step)
- Phase 4 braucht Phase 1 (Agents mit Observability)
- Phase 5 braucht alle vorherigen Phasen
- Phase 3 und 4 können teilweise parallel laufen (unabhängige DB-Migrationen)

---

## Altsystem-Referenzen (Gesamtübersicht)

Der umsetzende Agent muss vor jeder Phase die relevanten Quellen lesen:

### Phase 1: Foundation
- `CLAUDE.md` (Root) — Gesamtarchitektur, Stack, Konventionen
- `src/lib/ai/CLAUDE.md` — Tool-System, Skills, Prompts
- `src/app/api/CLAUDE.md` — Route-Patterns, Chat-Route
- `src/app/api/chat/route.ts` — Aktueller Orchestrator
- `src/app/api/chat/resolve-context.ts` — Context Resolution
- `src/app/api/chat/build-tools.ts` — Tool Registration
- `src/app/api/chat/build-messages.ts` — Message Transformation
- `src/config/prompts.ts` — System Prompt Assembly
- `src/config/features.ts` — Feature Flags
- `src/lib/ai/tools/*.ts` — Alle 12 Tool-Implementierungen
- `seeds/experts/*.md` — Expert System Prompts

### Phase 2: Workflows
- `src/app/api/chat/persist.ts` — Kompletter onFinish-Flow
- `src/lib/storage/` — R2 Integration
- `src/lib/db/queries/` — saveMessages, logUsage, deductCredits

### Phase 3: Memory & RAG
- `src/lib/memory/` — Mem0 Client + Circuit Breaker
- `src/lib/ai/tools/save-memory.ts` + `recall-memory.ts`
- `src/lib/db/schema/` — Aktuelles Schema für Erweiterung
- `docs/system/feature-flags-konfiguration.md` — Memory Feature Flag

### Phase 4: Evals
- Langfuse Docs (extern)
- Mastra Evals Docs (extern, context7)

### Phase 5: Polish
- `src/components/CLAUDE.md` — UI-Patterns für Admin-Erweiterungen
- Alle CLAUDE.md Files — zum Aktualisieren

### Mastra-Dokumentation
- Vor jeder Phase: `context7 MCP` für aktuelle Mastra API-Docs konsultieren
- Keine Mastra-APIs aus den Rebuild-Docs copy-pasten ohne Verifikation gegen aktuelle Docs
