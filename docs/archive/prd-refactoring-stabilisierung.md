# PRD: Refactoring — Stabilisierung, Vereinfachung, Tool-Skalierung

> Status: Entwurf — Freigabe durch Team ausstehend

---

## Motivation

Die Plattform hat aktuell 21 Tools. Geplant sind weitere 20-30 Tool-Anbindungen. Das aktuelle System erfordert pro neuem Tool Änderungen an 4+ Stellen (Tool-Datei, `build-tools.ts`, UI-Labels/Icons, ggf. Credits). Gleichzeitig sind mehrere Client-Komponenten auf 800+ Zeilen angewachsen mit duplizierten Patterns.

Ziel: Codebase vereinfachen und stabilisieren, ohne UX zu verändern. Skalierbare Architektur für 40-50 Tools schaffen.

---

## Entscheidung: Experten und Skills getrennt halten

**Analyseergebnis:** Keine Zusammenführung empfohlen.

| Aspekt        | Experten                               | Skills                             |
| ------------- | -------------------------------------- | ---------------------------------- |
| Ownership     | User-scoped (global/persönlich)        | Immer global                       |
| Konzept       | Chat-Persona mit systemPrompt          | Wiederverwendbare Prompt-Templates |
| Konfiguration | allowedTools, mcpServerIds, skillSlugs | fields, outputAsArtifact, category |
| Modus         | Einzeltyp                              | Dual-Mode (skill/quicktask)        |
| Mutation      | User + Admin                           | Nur Admin                          |

Die Unterschiede sind fundamental — eine Zusammenführung würde durch nullable Felder und Modus-Unterscheidungen mehr Komplexität schaffen als beseitigen. Stattdessen: Referentielle Integrität verbessern (orphaned skillSlugs erkennen).

---

## Phase 1: Tool Registry (Skalierungs-Enabler)

### Problem

- `build-tools.ts`: 156 Zeilen If-Kette für bedingte Tool-Registrierung
- `tool-status.tsx`: Hardcoded `TOOL_LABELS` und `TOOL_ICONS` Maps (21+ Einträge)
- Credit-Berechnung manuell pro Tool in execute-Funktionen
- Expert `allowedTools` ist unvalidierter String-Array
- Privacy-Routing deaktiviert Tools implizit (gekoppelte Logik)

### Lösung

Zentrale Tool-Registry mit Metadata. Jedes Tool registriert sich selbst:

```typescript
// src/lib/ai/tools/registry.ts
interface ToolRegistryEntry {
  name: string              // "web_search"
  label: string             // "Websuche" (UI)
  icon: string              // Lucide Icon-Name
  category: ToolCategory    // "core" | "search" | "media" | "memory" | ...
  featureCheck?: () => boolean
  privacySensitive?: boolean
  modelCheck?: (modelId: string) => boolean
  factory: (ctx: ToolContext) => unknown
}
```

Beispiel Tool-Registrierung:

```typescript
// In web-search.ts
registerTool({
  name: "web_search", label: "Websuche", icon: "SearchIcon", category: "search",
  featureCheck: () => features.search.enabled,
  factory: () => webSearchTool,
})
```

### Auswirkung

- `build-tools.ts`: 156 Zeilen If-Kette wird zu ~40 Zeilen Registry-Loop
- Neues Tool = 1 Datei erstellen mit `registerTool()`, fertig
- UI-Labels/Icons aus Registry abgeleitet statt hardcoded
- Expert `allowedTools` gegen Registry validierbar

### Betroffene Dateien

- **Neu:** `src/lib/ai/tools/registry.ts`, `src/lib/ai/tools/tool-metadata.ts`
- **Modifiziert:** 21 Tool-Dateien (registerTool-Call), `build-tools.ts`, `tool-status.tsx`, `assistant-messages.tsx`

---

## Phase 2: Error-Handling Utility

### Problem

38 Instanzen von `err instanceof Error ? err.message : "Unknown"` in 23 Dateien. Inkonsistente Error-Messages (deutsch/englisch gemischt). Fire-and-Forget-Operationen in `persist.ts` (11 Instanzen) nutzen identische `.catch()`-Pattern.

### Lösung

```typescript
// src/lib/errors.ts
export function getErrorMessage(err: unknown): string
export async function fireAndForget(label: string, fn: () => Promise<void>): Promise<void>
```

### Betroffene Dateien

- **Neu:** `src/lib/errors.ts`
- **Modifiziert:** 23 Dateien (mechanische Ersetzung)

### Top-Dateien nach Instanzen

| Datei                        | Instanzen |
| ---------------------------- | --------- |
| `persist.ts`                 | 11        |
| `memory/index.ts`            | 2         |
| `youtube.ts`                 | 2         |
| `google-search-grounding.ts` | 2         |
| `user/memories/route.ts`     | 2         |
| `chat-view.tsx`              | 2         |
| Restliche 17 Dateien         | je 1      |

---

## Phase 3: Artifact-Extraktion und Tool-Rendering vereinfachen

### Problem

- `use-artifact.ts` (791 Zeilen): 12 identische `is*Part()` Funktionen, 7 fast identische `extract*FromToolPart()` Funktionen (je ~40 Zeilen)
- `chat-message.tsx` (810 Zeilen): 15+ Tool-Type-Checks, 500+ Zeilen JSX If/Else-Kette für Tool-Rendering

### Lösung

**3.1 Generische `isToolPart()` Funktion:**

```typescript
export function isToolPart(part: { type: string }, toolName: string): boolean {
  return part.type === `tool-${toolName}`
}
```

12 einzelne Funktionen delegieren intern an diese eine. Kein Breaking Change.

**3.2 Generischer Tool-Part-Extraktor:**

Factory-Funktion `createToolPartExtractor(config)` mit 7 kurzen Configs (~10 Zeilen je) statt 7 x 40-Zeilen-Funktionen.

**3.3 Tool-Renderer Registry:**

```typescript
// src/components/chat/tool-renderers.ts
const TOOL_RENDERERS: Record<string, ToolRenderer> = {
  ask_user: renderAskUser,
  create_artifact: renderArtifactCard,
  // ...
}
export function renderToolPart(toolName: string, props: ToolRenderProps): ReactNode | null
```

### Auswirkung

- `use-artifact.ts`: 791 Zeilen wird zu ~450 Zeilen
- `chat-message.tsx`: 810 Zeilen wird zu ~400 Zeilen
- Neues Tool mit Custom-Rendering = 1 Renderer registrieren

### Betroffene Dateien

- **Neu:** `src/hooks/artifact-extractors.ts`, `src/components/chat/tool-renderers.ts`
- **Modifiziert:** `src/hooks/use-artifact.ts`, `src/components/chat/chat-message.tsx`

---

## Phase 4: `persist.ts` Dekomposition und `build-messages.ts` Aufräumen

### Problem

- `persist.ts` (511 Zeilen): 8 sequenzielle/parallele Operationen in einer Funktion
- `resolveR2FileParts` in `build-messages.ts` (103 Zeilen): Macht 4 verschiedene Dinge (Image Resize, PDF-Handling, Document-Extraction, Error-Recovery)

### Lösung

**4.1 persist.ts in Submodule:**

```
src/app/api/chat/persist/
  index.ts              — createOnFinish() Orchestrator (~80 Zeilen)
  assemble-parts.ts     — Response-Parts sammeln + Fake-Artifact erkennen
  persist-files.ts      — R2 File Persist + Code Execution Files
  post-response.ts      — Title, Credits, Suggestions, Memory (Fire-and-Forget)
```

**4.2 resolveR2FileParts aufteilen:**

```typescript
resolveImagePart(buffer, mediaType): Promise<FilePart>
resolvePdfPart(buffer, mediaType, modelId): Promise<FilePart | TextPart>
resolveDocumentPart(buffer, mediaType, filename): Promise<TextPart>
```

### Betroffene Dateien

- **Neu:** 3 Dateien in `persist/`
- **Modifiziert:** `build-messages.ts`, `route.ts` (Import-Pfad)
- **Ersetzt:** `persist.ts` wird zu `persist/index.ts`

---

## Phase 5: `prompts.ts` Modularisierung

### Problem

`prompts.ts` (260 Zeilen): Monolith. `SYSTEM_PROMPTS.artifacts` allein ist 60+ Zeilen und deckt 5 verschiedene Features ab (Artifact-Regeln, Quellenverlinkung, Design-Generation, Deep Research, Mermaid).

### Lösung

```
src/config/prompts/
  index.ts          — buildSystemPrompt() + Re-Exports
  base.ts           — Chat-Default, Title-Generation
  artifacts.ts      — Artifact-Instruktionen + Quellenverlinkung
  tools.ts          — Tool-spezifische Prompts (YouTube, TTS, Web, Google Search, Design)
  interactive.ts    — Quiz, Review, ContentAlternatives Instruktionen
```

Optional (nach Phase 1): Tool-Prompt-Sections aus Registry laden statt hardcoded If-Ketten. Neues Tool = Prompt automatisch inkludiert.

### Betroffene Dateien

- **Neu:** 4 Dateien in `prompts/`
- **Ersetzt:** `src/config/prompts.ts` wird zu `prompts/index.ts`
- **Modifiziert:** `resolve-context.ts` (Import-Pfad)

---

## Phasen-Abhängigkeiten

```
Phase 1 (Tool Registry)
  |
  +---> Phase 2 (Error Handling)     [kann parallel zu Phase 1]
  |       |
  |       +---> Phase 4 (persist + build-messages)
  |
  +---> Phase 3 (Artifact + Message)
  |
  +---> Phase 5 (Prompts)
```

---

## Zusammenfassung

| Phase                | Neue Dateien | Geänderte Dateien | Reduktion                                              | Risiko  |
| -------------------- | ------------ | ----------------- | ------------------------------------------------------ | ------- |
| 1. Tool Registry     | 2            | ~24               | build-tools: 156 auf ~40 Zeilen                        | Mittel  |
| 2. Error Handling    | 1            | ~23               | 38 duplizierte Pattern eliminiert                      | Niedrig |
| 3. Artifact/Message  | 2            | 2                 | use-artifact: 791 auf ~450, chat-message: 810 auf ~400 | Mittel  |
| 4. persist/build-msg | 3            | 2                 | Reorganisation, bessere Lesbarkeit                     | Mittel  |
| 5. Prompts           | 4            | 1                 | Reorganisation, registry-getrieben                     | Niedrig |

**Nicht im Scope:** Expert/Skill-Zusammenführung, Memory-System, neue Features.

---

## Verifikation (pro Phase)

1. `pnpm build` — keine Type-Errors
2. Manueller Chat-Test: Expert wählen, Tools nutzen (Websuche, Bild, YouTube, TTS, Design)
3. MCP-Tools funktional
4. Expert mit allowedTools-Filter
5. Quicktask-Flow
6. Artifact-Panel für alle Typen (HTML, Quiz, Review, Image, Design, Branding, Audio)
7. Credit-Abzug korrekt
