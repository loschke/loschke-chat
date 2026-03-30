# Generative UI — Tools Entwickler-Guide

> Referenz für die Implementierung neuer interaktiver Tools im Chat.
> Zwei Patterns: **Inline-Tools** (im Chat-Flow) und **Artifact-Tools** (im Side-Panel).

---

## Architektur-Überblick

```
Tool-Definition (AI SDK)
    │
    ├─── Inline-Tool (kein execute)
    │    └─ Stream pausiert → Client rendert → User interagiert → addToolResult → Model reagiert
    │    Beispiele: ask_user, content_alternatives
    │
    └─── Artifact-Tool (mit execute)
         └─ execute speichert in DB → Panel öffnet sich → User interagiert → Ergebnis als User-Message
         Beispiele: create_artifact, create_quiz
```

---

## Pattern 1: Inline-Tool (kein execute)

Für leichtgewichtige Interaktionen direkt im Chat-Flow. Der Stream pausiert, der User antwortet, und das Model arbeitet weiter.

### Bestehende Beispiele

| Tool | Zweck | Component |
|------|-------|-----------|
| `ask_user` | Strukturierte Rückfragen (Radio, Checkbox, Textarea) | `src/components/generative-ui/ask-user.tsx` |
| `content_alternatives` | Varianten-Auswahl mit Tabs + Markdown-Rendering | `src/components/generative-ui/content-alternatives.tsx` |

### Checkliste: Neues Inline-Tool

1. **Tool-Definition erstellen**
   - Datei: `src/lib/ai/tools/{tool-name}.ts`
   - Pattern: `tool()` ohne `execute`-Funktion (wie `ask-user.ts`)
   - Zod-Schema für die Input-Parameter definieren
   ```typescript
   import { tool } from "ai"
   import { z } from "zod"

   export const myNewTool = tool({
     description: "Beschreibung wann das Tool genutzt werden soll...",
     inputSchema: z.object({
       // ... Parameter
     }),
     // KEIN execute — Stream pausiert automatisch
   })
   ```

2. **Tool registrieren**
   - Datei: `src/app/api/chat/build-tools.ts`
   - Import + zur `tools`-Map hinzufügen
   ```typescript
   import { myNewTool } from "@/lib/ai/tools/my-new-tool"
   // ...
   tools.my_new_tool = myNewTool
   ```

3. **Component erstellen**
   - Datei: `src/components/generative-ui/{tool-name}.tsx`
   - Props-Pattern:
     ```typescript
     interface MyNewToolProps {
       // Input-Daten aus dem Tool-Schema
       data: { ... }
       // Callback wenn User fertig ist
       onSubmit: (result: unknown) => void
       // Read-only wenn bereits beantwortet (Chat-Reload)
       isReadOnly?: boolean
       // Vorherige Antwort für Read-only-Rendering
       previousResult?: unknown
     }
     ```
   - Styling: `card-elevated` Container, `rounded-2xl border bg-muted/30 p-5`
   - UI-Sprache: Deutsch

4. **In chat-message.tsx integrieren**
   - `"my_new_tool"` zu `CUSTOM_RENDERED_TOOLS` Set hinzufügen
   - Detection: `isMyNewToolPart()` oder generischen Helper nutzen:
     ```typescript
     // Einfach: Typ-Check
     function isMyNewToolPart(part: { type: string }): boolean {
       return part.type === "tool-my_new_tool"
     }
     ```
   - Extraktion: `extractInlineToolData(part, "my_new_tool")` (generischer Helper)
   - Rendering im Part-Loop hinzufügen (vor `isGenericToolPart`)
   - **Wichtig:** `onToolResult(data.toolCallId, "my_new_tool", result)` — Tool-Name mitgeben!

5. **System-Prompt ergänzen**
   - Datei: `src/config/prompts.ts` → `SYSTEM_PROMPTS.artifacts` Sektion
   - Beschreibung wann das Model das Tool nutzen soll

### Rückkanal (addToolResult)

```
Component → onSubmit(result) → ChatMessage.onToolResult(toolCallId, toolName, result)
  → ChatView.handleToolResult → addToolOutput({ toolCallId, tool: toolName, output: result })
    → Stream wird fortgesetzt, Model bekommt result als Tool-Output
```

### AI SDK 6 Part-States

| State | Bedeutung | Component-Verhalten |
|-------|-----------|---------------------|
| `input-streaming` | Tool-Args werden gestreamt | Loading/Partial anzeigen |
| `input-available` | Args komplett, kein execute | **Component rendern, interaktiv** |
| `output-available` | User hat geantwortet | **Read-only Rendering** |
| `output-error` | Fehler | Fallback anzeigen |

### Chat-Reload

Tool-Parts werden via `mapSavedPartsToUI()` in `use-artifact.ts` von DB-Format (`tool-call`/`tool-result`) zu AI SDK 6 Format (`tool-{toolName}` mit states) konvertiert. Bei `output-available` → Read-only rendern mit gespeicherter Antwort.

---

## Pattern 2: Artifact-Tool (mit execute)

Für umfangreiche interaktive Inhalte im Side-Panel. Das Tool speichert Daten in der DB, das Panel rendert sie.

### Bestehende Beispiele

| Tool | Artifact-Type | Zweck | Renderer |
|------|---------------|-------|----------|
| `create_artifact` | markdown, html, code | Dokumente, HTML-Seiten, Code | MessageResponse, HtmlPreview, CodePreview |
| `create_quiz` | quiz | Interaktive Quizzes | `src/components/assistant/quiz-renderer.tsx` |

### Checkliste: Neues Artifact-Tool

1. **Typ-System erweitern**
   - `src/types/artifact.ts` → `ArtifactContentType` um neuen Typ erweitern
   - `src/lib/db/queries/artifacts.ts` → `CreateArtifactInput.type` erweitern
   - Optional: Eigene Types-Datei (wie `src/types/quiz.ts`)

2. **Tool-Definition erstellen**
   - Datei: `src/lib/ai/tools/{tool-name}.ts`
   - **Factory-Pattern** mit chatId-Closure:
   ```typescript
   export function createMyTool(chatId: string) {
     return tool({
       description: "...",
       inputSchema: z.object({ ... }),
       execute: async (input) => {
         const artifact = await createArtifact({
           chatId,
           type: "my_type",
           title: input.title,
           content: JSON.stringify(input),
         })
         return { artifactId: artifact.id, title: artifact.title, type: "my_type", version: artifact.version }
       },
     })
   }
   ```

3. **Tool registrieren**
   - `src/app/api/chat/build-tools.ts` → `createMyTool(chatId)` hinzufügen

4. **Detection im Hook**
   - `src/hooks/use-artifact.ts`:
     - `isCreateMyToolPart()` Funktion
     - `extractMyToolFromToolPart()` Funktion (baut `SelectedArtifact` aus Tool-Input)
     - `ARTIFACT_TOOL_TYPES` Set erweitern
     - `useEffect` erweitern (Detection-Chain: `extractArtifactFromToolPart(part) ?? extractQuizFromToolPart(part) ?? extractMyToolFromToolPart(part)`)

5. **Renderer erstellen**
   - Datei: `src/components/assistant/{type}-renderer.tsx`
   - Props: `{ data: MyType; artifactId?: string; isStreaming: boolean; onComplete?: (result) => void }`
   - Streaming-Placeholder bereitstellen

6. **Artifact Panel integrieren**
   - `src/components/assistant/artifact-panel.tsx`:
     - Import Renderer
     - Branch im Content-Rendering: `contentType === "my_type" ? <MyRenderer ... />`
     - Header-Buttons ggf. ausblenden (wie bei Quiz)
     - `onComplete` Prop hinzufügen wenn Rückkanal nötig

7. **Chat Message integrieren**
   - `src/components/chat/chat-message.tsx`:
     - `"create_my_tool"` zu `CUSTOM_RENDERED_TOOLS` hinzufügen
     - `isCreateMyToolPart()` Check
     - `ArtifactCard` rendern mit passendem Icon + Preview

8. **Icon registrieren**
   - `src/components/assistant/artifact-utils.ts` → `artifactTypeToIcon()` erweitern

9. **System-Prompt ergänzen**
   - `src/config/prompts.ts`

### Rückkanal (User-Message)

Artifact-Tools können keinen `addToolResult` nutzen (execute ist bereits abgeschlossen). Stattdessen:

```
Renderer → onComplete(result) → ChatView.handleMyToolComplete
  → 1. handleArtifactSave(updatedContent)  // Ergebnis in Artifact speichern
  → 2. sendMessage({ text: summary })       // Ergebnis als User-Message → Model reagiert
```

Dafür:
- `onComplete` Callback in `chat-view.tsx` definieren
- Via Props durch `ArtifactPanel` zum Renderer durchreichen
- In `chat-view.tsx` an `ArtifactPanel` übergeben (conditional: nur wenn richtiger Typ aktiv)

---

## Datei-Referenz

### Kern-Dateien (bei jedem neuen Tool relevant)

| Datei | Zweck |
|-------|-------|
| `src/app/api/chat/build-tools.ts` | Tool-Registry (Server) |
| `src/components/chat/chat-message.tsx` | Part-Rendering + CUSTOM_RENDERED_TOOLS |
| `src/components/chat/chat-view.tsx` | handleToolResult + handleXxxComplete |
| `src/config/prompts.ts` | System-Prompt Guidance |

### Inline-Tool-spezifisch

| Datei | Zweck |
|-------|-------|
| `src/lib/ai/tools/{name}.ts` | Tool-Definition (kein execute) |
| `src/components/generative-ui/{name}.tsx` | Interaktive Component |

### Artifact-Tool-spezifisch

| Datei | Zweck |
|-------|-------|
| `src/lib/ai/tools/{name}.ts` | Tool-Definition (Factory mit execute) |
| `src/types/{type}.ts` | TypeScript Interfaces |
| `src/hooks/use-artifact.ts` | Detection + Extraction |
| `src/components/assistant/{type}-renderer.tsx` | Panel-Renderer |
| `src/components/assistant/artifact-panel.tsx` | Panel-Integration (Branch + Props) |
| `src/components/assistant/artifact-utils.ts` | Icon-Mapping |

---

## Ideen für weitere Tools

### Inline-Tools (Pattern 1)
- **`confirm_action`** — Bestätigungsdialog vor kritischen Aktionen
- **`rate_response`** — Feedback-Widget (Daumen hoch/runter + Kommentar)
- **`select_template`** — Template-Auswahl für Quicktasks
- **`link_preview`** — URL-Preview Card mit Zusammenfassung

### Artifact-Tools (Pattern 2)
- **`generate_exercise`** — Interaktive Übungen (rewrite, fill_gaps, build, analyze, compare)
- **`create_comparison`** — Interaktive Vergleichstabelle mit Gewichtung
- **`create_timeline`** — Interaktive Timeline mit Drag & Drop
- **`create_form`** — Dynamisches Formular aus Tool-Daten

### Spätere Stufen (Generative UI Stufenplan)
- **Stufe 4: Declarative UI** — JSON-Spec → shadcn/ui Renderer (kein Tool-spezifischer Code)
- **Stufe 5: Skill-Templates** — UI-Specs in Skills eingebettet
- **Stufe 6: MCP Apps** — Externe Apps im Chat via iframe
- Details: `docs/generative-ui-stufenplan.md`
