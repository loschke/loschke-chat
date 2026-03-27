# AI System

Guidance fuer `src/lib/ai/` — Tools, Skills, Prompts und Bildgenerierung.

## Tool-System

### Factory-Pattern

Tools mit Zugriff auf Request-Kontext (chatId, userId) nutzen Factory-Funktionen:

```
createArtifactTool(chatId) → tool({ execute: async (args) => { /* closure */ } })
```

Das LLM sieht nur Parameter und Beschreibung. Die Factory injiziert den Kontext.

### Naming

- Built-in Tools: Underscores (`create_artifact`, `web_search`)
- MCP Tools: Doppel-Underscores (`github__list_repos`)
- UI erkennt MCP-Tools am `__` Separator

### execute vs. kein execute

| Pattern | Verhalten | Beispiel |
|---------|-----------|---------|
| **Mit execute** | Server-seitig ausgefuehrt, Ergebnis an LLM | `create_artifact`, `web_search` |
| **Ohne execute** | Stream pausiert, Client rendert UI-Widget | `ask_user`, `content_alternatives` |

### Tool-Registrierung (`build-tools.ts`)

Tools werden bedingt registriert:
- Immer: `create_artifact`, `create_quiz`, `create_review`, `ask_user`, `content_alternatives`
- Wenn search enabled: `web_search`, `web_fetch`
- Wenn memory enabled + User-Toggle: `save_memory`, `recall_memory`
- Wenn Gemini-Key + kein Privacy-Routing: `generate_image`
- Wenn Stitch-Key: `generate_design`, `edit_design`
- Wenn Deep Research enabled + kein Privacy-Routing: `deep_research`
- Wenn Anthropic-Modell + Skills enabled: `code_execution` (Agent Skills: PPTX, XLSX, DOCX, PDF)
- Wenn Skills vorhanden + kein Quicktask: `load_skill`
- MCP-Tools: dynamisch, mit Collision Guard (Built-in hat Vorrang)

Expert `allowedTools` filtert die finale Tool-Liste. Leer = alle.

## Skill-System

### SKILL.md Format

```yaml
---
name: Name
slug: slug-name
description: Kurzbeschreibung
mode: skill | quicktask
# Nur bei quicktask:
category: Marketing
icon: Search
fields: [{ key, label, type, required?, placeholder?, options? }]
outputAsArtifact: true
temperature: 0.7
modelId: provider/model
---
Markdown-Content mit {{variable}} Platzhaltern
```

### Dateien

| Datei | Beschreibung |
|-------|-------------|
| `skills/discovery.ts` | DB-Query mit 60s TTL-Cache, `clearSkillCache()` nach Mutations |
| `skills/parser.ts` | `gray-matter` Frontmatter + Markdown, Zod-Validierung |
| `skills/template.ts` | `{{var}}` und `{{var \| default: "X"}}` Ersetzung |

### Integration

- **Normaler Chat:** Skills als Uebersicht in System-Prompt Layer 3, `load_skill` Tool laedt Content on-demand
- **Quicktask:** Template-gerendert als System-Prompt Layer 3 (ersetzt Skills-Liste), `load_skill` nicht verfuegbar

## System-Prompt-Aufbau

7 Layer in `src/config/prompts.ts` → `buildSystemPrompt()`:

0. Aktuelles Datum (immer, verhindert veraltete Suchstrings)
1. Expert-Persona (oder Default)
2. Artifact/Tool-Instruktionen (immer, inkl. Quellenverlinkung + Deep Research)
3. Skills-Liste / Quicktask / Wrapup (exklusiv)
4. Memory-Kontext (neue Chats, wenn enabled)
5. Projekt-Kontext + Dokumente (wenn Projekt zugeordnet)
6. Custom Instructions (hoechste Prioritaet)

Details: `docs/system-prompt-architektur.md`

## Bildgenerierung

- **Provider:** Gemini via `@ai-sdk/google` (Direktverbindung, NICHT Gateway)
- **Model:** `gemini-2.5-flash-image`
- **Gallery-Format:** `artifacts.content` = JSON `ImageGalleryEntry[]` mit `{ url, role, prompt?, timestamp }`
- **Storage:** R2-Upload primaer, data-URL als Fallback
- **Credits:** Flat-Rate `IMAGE_GENERATION_CREDITS` (default 500)
- **Privacy:** Tool deaktiviert bei Privacy-Routing

## Stitch Design Generation

- **Provider:** Google Stitch via `@google/stitch-sdk` (MCP-basiert)
- **Tools:** `generate_design` (neues Design), `edit_design` (Iteration)
- **Output:** HTML mit Tailwind CSS als `html` Artifact
- **Metadata:** `artifacts.metadata` JSONB speichert `{ stitchProjectId, stitchScreenId }` fuer Iteration
- **Credits:** Flat-Rate `STITCH_GENERATION_CREDITS` (default 5000), `STITCH_EDIT_CREDITS` (default 3000)
- **Feature-Flag:** `STITCH_API_KEY` (opt-in)

## Deep Research

- **Provider:** Gemini Deep Research Agent via `@google/genai` Interactions API (Direktverbindung)
- **Agent:** `deep-research-pro-preview-12-2025`
- **Pattern:** Async — Tool startet Recherche, Client pollt `/api/deep-research/[interactionId]`
- **Output:** Markdown-Artifact mit Quellenangaben, `metadata.deepResearch: true`
- **Ownership:** In-Memory `interactionOwners` Map verhindert Cross-User-Zugriff
- **Credits:** Flat-Rate `DEEP_RESEARCH_CREDITS` (default 50000), nach erfolgreichem Start
- **Feature-Flag:** `GOOGLE_GENERATIVE_AI_API_KEY` + `DEEP_RESEARCH_ENABLED=true`
- **Privacy:** Tool deaktiviert bei Privacy-Routing (nutzt Google API)

## Quellenverlinkung in Artifacts

- **Inline-Zitate:** Unicode-Superscript `⁽¹⁾` im Fliesstext (keine eckigen Klammern — kollidiert mit Markdown)
- **Quellenverzeichnis:** `## Quellen` als nummerierte Markdown-Liste am Artifact-Ende
- **Metadata:** `create_artifact` akzeptiert optionalen `sources`-Parameter (`[{ url, title }]`)
- **UI:** Quellen-Badge im Artifact-Header, scrollt zum Quellenverzeichnis

## Privacy-Provider (`privacy-provider.ts`)

Bypass fuer den Gateway bei Business Mode Privacy-Routing:
- EU: `@ai-sdk/mistral` mit `BUSINESS_MODE_EU_MODEL`
- Lokal: `@ai-sdk/openai-compatible` mit `BUSINESS_MODE_LOCAL_URL`

## Dateien-Uebersicht

```
src/lib/ai/
├── tools/
│   ├── create-artifact.ts    — Artifact-Erstellung (Factory)
│   ├── create-quiz.ts        — Quiz-Erstellung (Factory)
│   ├── create-review.ts      — Review-Erstellung (Factory)
│   ├── ask-user.ts           — Strukturierte Rueckfragen (kein execute)
│   ├── content-alternatives.ts — Varianten-Auswahl (kein execute)
│   ├── web-search.ts         — Websuche (Provider-agnostisch)
│   ├── web-fetch.ts          — URL-Abruf (SSRF-Schutz)
│   ├── save-memory.ts        — Explizites Memory-Speichern (Factory)
│   ├── recall-memory.ts      — On-demand Memory-Suche (Factory)
│   ├── generate-image.ts     — Bildgenerierung (Factory, Gemini)
│   ├── generate-design.ts    — UI-Design via Stitch (Factory)
│   ├── edit-design.ts        — Design-Iteration via Stitch (Factory)
│   ├── deep-research.ts      — Deep Research starten (Factory, async Polling)
│   ├── load-skill.ts         — Skill-Content laden (Factory)
│   └── parse-fake-artifact.ts — Fallback fuer Models ohne Tool-Calling
├── skills/
│   ├── discovery.ts          — DB-basierte Skill-Discovery (cached)
│   ├── parser.ts             — SKILL.md Parsing (gray-matter)
│   └── template.ts           — Mustache-Replacer
├── deep-research.ts          — Gemini Interactions API Wrapper (Singleton, Ownership)
├── image-generation.ts       — Gemini generateImage() Wrapper
├── privacy-provider.ts       — Mistral/Local Provider fuer Business Mode
└── suggested-replies.ts      — Antwortvorschlaege generieren
```
