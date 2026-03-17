# M8: Memory System — Implementierungsplan

> Persistenter Memory-Layer via Mem0. Kontext über Chat-Sessions hinweg.
> Basis: `docs/prd-memory-system.md`

---

## Überblick

Die Plattform erhält ein Memory-System, das Kontext über Chat-Sessions hinweg speichert. Memories werden automatisch aus Konversationen extrahiert und können von Experts explizit mit strukturierten Metadaten geschrieben werden. Alle Experts profitieren vom selben Memory-Pool.

**Technologie:** Mem0 Cloud (direkt, kein Abstraktionslayer)

- npm: `mem0ai`
- Docs: https://docs.mem0.ai
- AI SDK Integration: https://ai-sdk.dev/docs/agents/memory#mem0

**4 Implementierungsphasen**, jeweils unabhängig deploybar.

---

## Phase 1: Foundation + Retrieval

**Ziel:** Mem0-Client funktioniert, Memories werden bei Chat-Start gesucht und in den System-Prompt injiziert. Noch kein Schreiben — nur Lesen (testbar mit manuell geseedeten Memories im Mem0-Dashboard).

### 1.1 Feature Flag

**Datei:** `src/config/features.ts`

```typescript
memory: {
  enabled: !!process.env.MEM0_API_KEY,
},
```

Opt-in Pattern wie `mcp` und `storage`.

### 1.2 Memory Config

**Neue Datei:** `src/config/memory.ts`

Pattern wie `src/config/mcp.ts` — Config-Modul mit Helpers.

```typescript
import MemoryClient from "mem0ai"

export interface MemoryConfig {
  apiKey: string
  extractionModel: string   // LLM für automatische Extraktion
  minMessages: number        // Minimum Messages vor Extraktion
  searchLimit: number        // Max Memories im System-Prompt
}

const config: MemoryConfig = {
  apiKey: process.env.MEM0_API_KEY ?? "",
  extractionModel: process.env.MEMORY_EXTRACTION_MODEL ?? "gpt-4.1-nano",
  minMessages: parseInt(process.env.MEMORY_MIN_MESSAGES ?? "4", 10),
  searchLimit: parseInt(process.env.MEMORY_SEARCH_LIMIT ?? "10", 10),
}

// Module-level Singleton (wie DB-Client)
let client: MemoryClient | null = null

export function getMemoryClient(): MemoryClient {
  if (!client) {
    client = new MemoryClient({ apiKey: config.apiKey })
  }
  return client
}

export { config as memoryConfig }
```

**ENV-Variablen:**

| Variable                  | Default        | Beschreibung                      |
| ------------------------- | -------------- | --------------------------------- |
| `MEM0_API_KEY`            | —              | Mem0 Cloud API Key (Feature-Gate) |
| `MEMORY_EXTRACTION_MODEL` | `gpt-4.1-nano` | LLM für Faktenextraktion          |
| `MEMORY_MIN_MESSAGES`     | `4`            | Minimum Messages für Extraktion   |
| `MEMORY_SEARCH_LIMIT`     | `10`           | Max Memories im Prompt            |

### 1.3 Memory Search Helper + Circuit Breaker

**Neue Datei:** `src/lib/memory/index.ts`

```typescript
import { getMemoryClient, memoryConfig } from "@/config/memory"

export interface MemoryEntry {
  id: string
  memory: string
  metadata?: Record<string, unknown>
  score?: number
  createdAt?: string
  updatedAt?: string
}

// --- Circuit Breaker ---
// Verhindert wiederholte Calls bei Mem0-Ausfall (Log-Spam, nutzlose Latenz).
let failureCount = 0
let circuitOpenUntil = 0
const MAX_FAILURES = 5
const COOLDOWN_MS = 5 * 60 * 1000 // 5 Minuten

export function isMemoryCircuitOpen(): boolean {
  if (Date.now() > circuitOpenUntil) {
    failureCount = 0
    return false
  }
  return true
}

export function recordMemoryFailure(): void {
  failureCount++
  if (failureCount >= MAX_FAILURES) {
    circuitOpenUntil = Date.now() + COOLDOWN_MS
    console.warn(`[Memory] Circuit breaker open — ${MAX_FAILURES} failures, cooling down ${COOLDOWN_MS / 1000}s`)
  }
}

// --- Search ---

/**
 * Sucht relevante Memories für den aktuellen Kontext.
 * Wird bei Chat-Start aufgerufen mit der ersten User-Message als Query.
 * Circuit Breaker verhindert Calls bei Mem0-Ausfall.
 */
export async function searchMemories(
  userId: string,
  query: string,
  limit?: number
): Promise<MemoryEntry[]> {
  if (isMemoryCircuitOpen()) return []

  try {
    const client = getMemoryClient()
    const results = await client.search(query, {
      user_id: userId,
      limit: limit ?? memoryConfig.searchLimit,
    })
    return results as MemoryEntry[]
  } catch (err) {
    recordMemoryFailure()
    throw err // Wird vom Aufrufer via .catch(() => []) gefangen
  }
}

// --- Prompt Formatting mit Token-Budget ---

const MAX_MEMORY_CHARS = 4000 // ~1000 Tokens — hartes Limit

/**
 * Formatiert Memories als Prompt-Block mit Token-Budget.
 * Memories kommen von Mem0 nach Relevanz sortiert.
 * Nimmt so viele wie ins Budget passen, Rest wird abgeschnitten.
 */
export function formatMemoriesForPrompt(memories: MemoryEntry[]): string {
  if (memories.length === 0) return ""

  const lines: string[] = []
  let charCount = 0

  for (const m of memories) {
    const line = `- ${m.memory}`
    if (charCount + line.length > MAX_MEMORY_CHARS) break
    lines.push(line)
    charCount += line.length
  }

  if (lines.length === 0) return ""

  return `## Kontext aus früheren Sessions\n\nFolgende Informationen sind aus früheren Gesprächen bekannt:\n\n${lines.join("\n")}`
}
```

### 1.4 Prompt Assembly — Neuer Layer

**Datei:** `src/config/prompts.ts`

Neuer Layer 5 (Memory) zwischen Skills und Projekt-Kontext:

```typescript
interface BuildSystemPromptOptions {
  // ... bestehende Felder ...
  memoryContext?: string | null  // NEU
}

export function buildSystemPrompt(options?: BuildSystemPromptOptions): string {
  const sections: string[] = []

  // Layer 1: Expert Persona
  // Layer 2: Artifact Instructions
  // Layer 2.5: Web-Tools
  // Layer 2.6: MCP-Tools
  // Layer 3: Skills / Quicktask

  // Layer 5: Memory-Kontext (NEU)
  if (options?.memoryContext?.trim()) {
    sections.push(options.memoryContext.trim())
  }

  // Layer 6: Projekt-Instruktionen
  // Layer 7: Custom Instructions (höchste Prio)

  return sections.join("\n\n")
}
```

**Prompt-Layer-Hierarchie (komplett):**

```
Layer 1: Expert System-Prompt (oder Default)
Layer 2: Artifact-Anweisungen (immer)
Layer 2.5: Web-Tool-Hinweise (wenn aktiv)
Layer 2.6: MCP-Tool-Hinweise (wenn vorhanden)
Layer 3: Skills-Übersicht ODER Quicktask-Prompt
Layer 5: Memory-Kontext (NEU)
Layer 6: Projekt-Instruktionen
Layer 7: User Custom Instructions (höchste Prio)
```

### 1.5 Chat-Route Integration (Retrieval)

**Datei:** `src/app/api/chat/resolve-context.ts`

Memory-Search parallel zu den bestehenden Queries in Phase A. **Timeout + Graceful Degradation:** Memory-Search wird mit einem 3s-Timeout abgesichert. Wenn Mem0 nicht antwortet, geht der Chat ohne Memory weiter.

```typescript
// In resolveContext():
const MEMORY_TIMEOUT_MS = 3000

const memorySearch = features.memory.enabled
  ? Promise.race([
      import("@/lib/memory").then(async (m) => {
        const query = extractSearchQuery(params)
        return m.searchMemories(userId, query)
      }),
      new Promise<[]>(resolve => setTimeout(() => resolve([]), MEMORY_TIMEOUT_MS))
    ]).catch(() => [])
  : Promise.resolve([])

const [existingChat, userPrefs, allSkills, , , memories] = await Promise.all([
  requestChatId ? getChatById(requestChatId) : null,
  getUserPreferences(userId),
  discoverSkills(),
  getModels(),
  mcpCacheWarmup,
  memorySearch,  // NEU
])
```

**Problem:** `resolveContext` hat aktuell keinen Zugriff auf die Messages. Die kommen als Parameter in `route.ts`, nicht in `resolveContext`.

**Lösung:** `messages` als optionalen Parameter an `resolveContext` durchreichen:

```typescript
interface ResolveContextParams {
  // ... bestehende Felder ...
  messages?: Array<{ role: string; parts?: Array<{ type: string; text?: string }> }>
}
```

Dann die letzte User-Message als Search-Query extrahieren:

```typescript
function extractSearchQuery(params: ResolveContextParams): string {
  const msgs = params.messages ?? []
  const lastUser = [...msgs].reverse().find(m => m.role === "user")
  const text = lastUser?.parts
    ?.filter(p => p.type === "text")
    .map(p => p.text ?? "")
    .join(" ") ?? ""
  return text.slice(0, 500) // Truncate für Mem0 Query
}
```

Memory-Kontext wird in `buildSystemPrompt()` eingefügt:

```typescript
import { formatMemoriesForPrompt } from "@/lib/memory"

const memoryContext = memories.length > 0
  ? formatMemoriesForPrompt(memories)
  : null

const systemPrompt = buildSystemPrompt({
  // ... bestehende Optionen ...
  memoryContext,  // NEU
})
```

### 1.6 ChatContext erweitern

**Datei:** `src/app/api/chat/resolve-context.ts`

```typescript
export interface ChatContext {
  // ... bestehende Felder ...
  memoriesLoaded: number  // Für Debugging/Logging
}
```

### Phase 1 — Dateien-Übersicht

| Aktion | Datei                                                                  |
| ------ | ---------------------------------------------------------------------- |
| Neu    | `src/config/memory.ts`                                                 |
| Neu    | `src/lib/memory/index.ts`                                              |
| Edit   | `src/config/features.ts` — Feature Flag                                |
| Edit   | `src/config/prompts.ts` — Layer 5, neues Options-Feld                  |
| Edit   | `src/app/api/chat/resolve-context.ts` — Memory Search + Messages-Param |
| Edit   | `src/app/api/chat/route.ts` — Messages an resolveContext durchreichen  |
| Edit   | `.env.example` — MEM0_API_KEY + Memory-Config                          |

---

## Phase 2: Automatische Extraktion + User-Settings

**Ziel:** Nach jedem Chat werden Memories automatisch extrahiert. User kann Memory global ein/aus schalten und Inkognito pro Chat aktivieren.

### 2.1 DB-Schema: User-Preferences erweitern

**Datei:** `src/lib/db/schema/users.ts`

```typescript
// Neue Spalte
memoryEnabled: boolean("memory_enabled").default(true).notNull(),
```

Migration: `ALTER TABLE users ADD COLUMN memory_enabled BOOLEAN NOT NULL DEFAULT true;`

### 2.2 DB-Schema: Chat Inkognito-Flag

**Datei:** `src/lib/db/schema/chats.ts`

```typescript
// Neue Spalte
isIncognito: boolean("is_incognito").default(false).notNull(),
```

Migration: `ALTER TABLE chats ADD COLUMN is_incognito BOOLEAN NOT NULL DEFAULT false;`

### 2.3 Automatische Extraktion in onFinish

**Datei:** `src/app/api/chat/persist.ts`

Nach dem erfolgreichen Speichern der Messages — fire-and-forget (wie Title-Generation):

```typescript
// In createOnFinish(), nach Promise.all(savePromises):
import { isMemoryCircuitOpen } from "@/lib/memory"

// Memory extraction: fire-and-forget (mit Circuit Breaker)
if (features.memory.enabled && !isIncognito && userMemoryEnabled && !isMemoryCircuitOpen()) {
  const messageCount = messages.length + response.messages.length
  if (messageCount >= memoryConfig.minMessages) {
    extractMemories(resolvedChatId, userId, messages, response.messages)
      .catch(err => console.warn("Memory extraction failed:", err instanceof Error ? err.message : "Unknown"))
  }
}
```

**Neue Funktion in `src/lib/memory/index.ts`:**

```typescript
/**
 * Extrahiert Memories aus einer Chat-Session via Mem0.
 * Fire-and-forget — Fehler werden geloggt, nicht geworfen.
 * Circuit Breaker verhindert wiederholte Calls bei Mem0-Ausfall.
 */
export async function extractMemories(
  chatId: string,
  userId: string,
  userMessages: Array<{ role: string; parts?: Array<Record<string, unknown>> }>,
  assistantMessages: Array<unknown>
): Promise<void> {
  if (isMemoryCircuitOpen()) return

  try {
    const client = getMemoryClient()

    // Messages in Mem0-Format konvertieren
    const formattedMessages = convertToMem0Format(userMessages, assistantMessages)

    await client.add(formattedMessages, {
      user_id: userId,
      metadata: { chatId, extractedAt: new Date().toISOString() },
    })
  } catch (err) {
    recordMemoryFailure()
    throw err
  }
}

function convertToMem0Format(
  userMessages: Array<{ role: string; parts?: Array<Record<string, unknown>> }>,
  assistantMessages: Array<unknown>
): Array<{ role: string; content: string }> {
  // Nur Text-Parts extrahieren, Files/Tool-Calls ignorieren
  const result: Array<{ role: string; content: string }> = []

  for (const msg of userMessages) {
    const text = msg.parts
      ?.filter(p => p.type === "text")
      .map(p => (p.text as string) ?? "")
      .join(" ") ?? ""
    if (text.trim()) {
      result.push({ role: msg.role, content: text })
    }
  }

  // Assistant Messages aus response.messages extrahieren
  // (Format: AI SDK ResponseMessage[])
  for (const msg of assistantMessages) {
    const m = msg as { role: string; content: Array<{ type: string; text?: string }> }
    if (m.role === "assistant" && Array.isArray(m.content)) {
      const text = m.content
        .filter(c => c.type === "text")
        .map(c => c.text ?? "")
        .join(" ")
      if (text.trim()) {
        result.push({ role: "assistant", content: text })
      }
    }
  }

  return result
}
```

### 2.4 Kontext-Durchreichung (Inkognito + memoryEnabled)

`createOnFinish` braucht Zugriff auf die Memory-Flags:

**Datei:** `src/app/api/chat/persist.ts`

```typescript
interface CreateOnFinishParams {
  // ... bestehende Felder ...
  isIncognito?: boolean
  userMemoryEnabled?: boolean
}
```

**Datei:** `src/app/api/chat/resolve-context.ts`

`ChatContext` um die Flags erweitern:

```typescript
export interface ChatContext {
  // ... bestehende Felder ...
  isIncognito: boolean
  userMemoryEnabled: boolean
}
```

`userPrefs.memoryEnabled` und `existingChat.isIncognito` auslesen und durchreichen.

### 2.5 resolveContext: Memory-Search nur wenn erlaubt

```typescript
const shouldSearchMemory = features.memory.enabled
  && userPrefs.memoryEnabled !== false
  && !(existingChat?.isIncognito)

const memorySearch = shouldSearchMemory
  ? searchMemories(userId, extractSearchQuery(params))
  : Promise.resolve([])
```

### 2.6 User-Settings: Memory Toggle

**Datei:** `src/app/api/user/instructions/route.ts` (oder neuer Endpoint)

PATCH-Endpoint erweitern um `memoryEnabled`:

```typescript
// Bestehender PATCH body um memoryEnabled erweitern
const body = z.object({
  customInstructions: z.string().max(2000).optional(),
  defaultModelId: z.string().optional(),
  memoryEnabled: z.boolean().optional(),  // NEU
})
```

**UI:** Toggle-Switch im Settings-Dialog (neben Custom Instructions und Default Model).

### 2.7 Chat-Inkognito: Toggle im Chat-Header

**Datei:** `src/components/chat/chat-header.tsx`

Inkognito-Toggle (Eye-Off Icon) im Chat-Header. Setzt `isIncognito` auf dem Chat via API.

**Neuer Endpoint oder bestehenden PATCH erweitern:**

```
PATCH /api/chats/[chatId] — { isIncognito: true }
```

**Visueller Indikator:** Wenn Inkognito aktiv, zeigt der Chat-Header ein dezentes Icon (z.B. `EyeOff` von Lucide).

### 2.8 Onboarding-Banner

Beim ersten Chat mit aktivem Memory: einmaliger Hinweis als Inline-Banner.

**Tracking:** `users.memoryOnboardingSeen` (boolean, default false) oder einfacher: localStorage-Flag (`memory-onboarding-seen`).

**Komponente:** `src/components/chat/memory-onboarding-banner.tsx`

```
"Diese Plattform merkt sich Kontext aus deinen Gesprächen, damit zukünftige
Sessions besser auf dich zugeschnitten sind. Du kannst das jederzeit in den
Einstellungen deaktivieren oder einzelne Erinnerungen löschen."
[Verstanden]
```

Kein Blocking-Dialog — Inline-Banner, verschwindet nach Klick.

### Phase 2 — Dateien-Übersicht

| Aktion    | Datei                                                                    |
| --------- | ------------------------------------------------------------------------ |
| Edit      | `src/lib/db/schema/users.ts` — `memoryEnabled` Spalte                    |
| Edit      | `src/lib/db/schema/chats.ts` — `isIncognito` Spalte                      |
| Edit      | `src/lib/memory/index.ts` — `extractMemories()`, `convertToMem0Format()` |
| Edit      | `src/app/api/chat/persist.ts` — Extraktion in onFinish                   |
| Edit      | `src/app/api/chat/resolve-context.ts` — Flags durchreichen, Guard        |
| Edit      | `src/app/api/user/instructions/route.ts` — memoryEnabled                 |
| Edit      | `src/components/chat/chat-header.tsx` — Inkognito-Toggle                 |
| Neu       | `src/components/chat/memory-onboarding-banner.tsx`                       |
| Migration | `memoryEnabled` auf users, `isIncognito` auf chats                       |

---

## Phase 3: Explizite Tools (save_memory + recall_memory)

**Ziel:** Experts können aktiv Memories schreiben und gezielt abrufen.

### 3.1 save_memory Tool

**Neue Datei:** `src/lib/ai/tools/save-memory.ts`

```typescript
import { tool } from "ai"
import { z } from "zod"
import { getMemoryClient } from "@/config/memory"

/**
 * Factory — braucht userId als Closure (wie createArtifactTool mit chatId).
 */
export function createSaveMemoryTool(userId: string) {
  return tool({
    description:
      "Speichert eine wichtige Information im User-Memory für spätere Sessions. " +
      "Nutze dieses Tool wenn du etwas Erinnerungswürdiges über den User erfährst " +
      "(Vorwissen, Ziele, Präferenzen, Projektkontext).",
    parameters: z.object({
      memory: z.string()
        .min(10, "Memory muss mindestens 10 Zeichen lang sein")
        .max(1000, "Memory darf maximal 1000 Zeichen lang sein")
        .describe("Die zu speichernde Information als natürlicher Satz."),
      metadata: z.record(z.string(), z.unknown())
        .optional()
        .describe("Optionale Metadaten für gezielteres Abrufen (z.B. type, topic)."),
    }),
    execute: async ({ memory, metadata }) => {
      const client = getMemoryClient()
      const result = await client.add(
        [{ role: "user", content: memory }],
        {
          user_id: userId,
          metadata: metadata ?? {},
        }
      )
      return {
        success: true,
        message: "Memory gespeichert.",
        id: result?.id ?? null,
      }
    },
  })
}
```

### 3.2 recall_memory Tool

**Neue Datei:** `src/lib/ai/tools/recall-memory.ts`

```typescript
import { tool } from "ai"
import { z } from "zod"
import { searchMemories } from "@/lib/memory"

/**
 * Factory — braucht userId als Closure.
 */
export function createRecallMemoryTool(userId: string) {
  return tool({
    description:
      "Sucht in den User-Memories nach relevantem Kontext aus früheren Sessions. " +
      "Nutze dieses Tool wenn ein neues Thema aufkommt und du prüfen willst, " +
      "ob es bereits Kontext gibt.",
    parameters: z.object({
      query: z.string()
        .min(3)
        .max(500)
        .describe("Wonach soll gesucht werden?"),
      limit: z.number()
        .int()
        .min(1)
        .max(20)
        .default(5)
        .describe("Maximale Anzahl Ergebnisse."),
    }),
    execute: async ({ query, limit }) => {
      const memories = await searchMemories(userId, query, limit)
      if (memories.length === 0) {
        return { found: false, message: "Keine relevanten Memories gefunden." }
      }
      return {
        found: true,
        count: memories.length,
        memories: memories.map(m => ({
          memory: m.memory,
          metadata: m.metadata,
          score: m.score,
        })),
      }
    },
  })
}
```

### 3.3 Tool-Registry Integration

**Datei:** `src/app/api/chat/build-tools.ts`

```typescript
import { createSaveMemoryTool } from "@/lib/ai/tools/save-memory"
import { createRecallMemoryTool } from "@/lib/ai/tools/recall-memory"

export async function buildTools(params: BuildToolsParams): Promise<BuildToolsResult> {
  const tools: Record<string, any> = {
    create_artifact: createArtifactTool(chatId),
    ask_user: askUserTool,
  }

  // Memory Tools (wenn Feature aktiv + User hat Memory an + kein Inkognito)
  if (params.memoryEnabled && params.userId) {
    tools.save_memory = createSaveMemoryTool(params.userId)
    tools.recall_memory = createRecallMemoryTool(params.userId)
  }

  // ... rest wie bisher
}
```

`BuildToolsParams` erweitern:

```typescript
interface BuildToolsParams {
  // ... bestehende Felder ...
  memoryEnabled?: boolean  // Feature + User-Pref + !Inkognito
  userId?: string
}
```

### 3.4 Expert System-Prompt Guidance

Experts die Memory-Tools nutzen sollen, referenzieren sie im System-Prompt. Kein erzwungener Eingriff in bestehende Experts nötig.

**Beispiel-Ergänzung für den Lernbegleiter-Expert:**

```markdown
## Deine Tools

- **save_memory** — Wenn du etwas Wichtiges über den Lernenden erfährst
  (Vorwissen, Fortschritt, Schwächen, Ziele), speichere es für die nächste Session.
- **recall_memory** — Wenn ein neues Thema aufkommt, prüfe ob es bereits
  Kontext aus früheren Sessions gibt.
```

### 3.5 allowedTools Integration

`save_memory` und `recall_memory` werden automatisch ins Tool-Set aufgenommen. Experts können sie via `allowedTools` ein-/ausschließen (wie bei MCP-Tools).

### 3.6 Tool-Status UI

**Datei:** `src/components/chat/tool-status.tsx`

Memory-Tools mit Brain-Icon anzeigen:

```typescript
// Erkennung: toolName === "save_memory" || toolName === "recall_memory"
// Icon: Brain (lucide-react)
// save_memory: "Memory gespeichert" als Status-Text
// recall_memory: Anzahl gefundener Memories anzeigen
```

### Phase 3 — Dateien-Übersicht

| Aktion | Datei                                                              |
| ------ | ------------------------------------------------------------------ |
| Neu    | `src/lib/ai/tools/save-memory.ts`                                  |
| Neu    | `src/lib/ai/tools/recall-memory.ts`                                |
| Edit   | `src/app/api/chat/build-tools.ts` — Memory-Tools hinzufügen        |
| Edit   | `src/app/api/chat/route.ts` — userId + memoryEnabled an buildTools |
| Edit   | `src/components/chat/tool-status.tsx` — Memory-Tool-Rendering      |

---

## Phase 4: Memory-Verwaltung + Admin

**Ziel:** User kann Memories einsehen, durchsuchen, löschen. Admin sieht Statistiken.

### 4.1 Memory-API

**Neue Datei:** `src/app/api/user/memories/route.ts`

```typescript
// GET — Liste aller Memories des Users (paginiert)
// Query-Params: ?page=1&limit=20&search=prompt+engineering

export async function GET(req: Request) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search")
  const page = parseInt(searchParams.get("page") ?? "1", 10)
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50)

  const client = getMemoryClient()

  if (search) {
    const results = await client.search(search, {
      user_id: auth.user.id,
      limit,
    })
    return Response.json({ memories: results, page, hasMore: false })
  }

  const results = await client.getAll({ user_id: auth.user.id })
  // Client-seitige Paginierung (Mem0 API-Abhängig)
  const paginated = results.slice((page - 1) * limit, page * limit)
  return Response.json({
    memories: paginated,
    page,
    total: results.length,
    hasMore: page * limit < results.length,
  })
}
```

**Neue Datei:** `src/app/api/user/memories/[memoryId]/route.ts`

```typescript
// DELETE — Einzelne Memory löschen
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ memoryId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { memoryId } = await params
  const client = getMemoryClient()
  await client.delete(memoryId)
  return Response.json({ success: true })
}

// PATCH — Memory bearbeiten (Text korrigieren)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ memoryId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { memoryId } = await params
  const body = await req.json()
  const { memory } = z.object({
    memory: z.string().min(1).max(1000),
  }).parse(body)

  const client = getMemoryClient()
  await client.update(memoryId, memory)
  return Response.json({ success: true })
}
```

**Neue Datei:** `src/app/api/user/memories/export/route.ts`

```typescript
// GET — Alle Memories als JSON exportieren (DSGVO)
export async function GET(req: Request) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const client = getMemoryClient()
  const all = await client.getAll({ user_id: auth.user.id })

  return new Response(JSON.stringify(all, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="memories-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  })
}
```

**Bulk-Delete:**

```typescript
// DELETE /api/user/memories — Alle löschen
export async function DELETE(req: Request) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const client = getMemoryClient()
  await client.deleteAll({ user_id: auth.user.id })
  return Response.json({ success: true })
}
```

### 4.2 Memory-Verwaltung UI

**Neue Datei:** `src/components/settings/memory-manager.tsx`

Tab oder eigener Bereich in den User-Settings:

```
┌─────────────────────────────────────────────────────┐
│ Erinnerungen (42)                       [Suche ...] │
│ [Alle]  [Wissen]  [Projekte]  [Bewertungen]        │
├─────────────────────────────────────────────────────┤
│                                                      │
│ "User versteht Few-Shot-Prompting und kann es        │
│  eigenständig anwenden"                              │
│ Tags: skill_assessment · prompt-engineering           │
│ Quelle: Lernbegleiter · automatisch                  │
│ 12. März 2026                                        │
│                        [Bearbeiten] [Stimmt nicht mehr] │
│                                                      │
│ "Die Website des Users ist example.com, B2B-SaaS"   │
│ Tags: project_context · example.com                  │
│ Quelle: SEO-Berater · explizit (save_memory)        │
│ 10. März 2026                                        │
│                        [Bearbeiten] [Stimmt nicht mehr] │
│                                                      │
│ ...                                                  │
├─────────────────────────────────────────────────────┤
│ [Alle exportieren (JSON)]           [Alle löschen]  │
└─────────────────────────────────────────────────────┘
```

**Funktionen:**

- **Suche** — Freitext-Suche (nutzt `searchMemories` via API)
- **Kategorie-Filter** — Filtert nach `metadata.type` (Tabs: Alle, Wissen, Projekte, Bewertungen etc.). Kategorien werden dynamisch aus vorhandenen Metadaten generiert.
- **Inline-Editing** — Klick auf "Bearbeiten" macht den Memory-Text editierbar (Textarea). Speichern via `PATCH /api/user/memories/[id]`. Nutzt Mem0 `update`-API.
- **"Stimmt nicht mehr"-Button** — Einfacher als Edit: löscht die Memory mit einem Klick + Confirm. Niedrigere Hürde als manuelles Editieren, ermutigt zum Aufräumen.
- **Memory-Herkunft anzeigen** — Woher kam die Memory?
  - `metadata.source`: `"auto"` (automatisch extrahiert) oder `"explicit"` (via save_memory Tool)
  - `metadata.expertName`: Welcher Expert war aktiv?
  - `metadata.chatId`: Link zum ursprünglichen Chat (klickbar → `/c/[chatId]`)
- **Alle löschen** — Confirm-Dialog mit Danger-Button, Wortbestätigung ("löschen" eintippen)
- **Export als JSON** — Download aller Memories (DSGVO-Auskunftsrecht)
- **Metadaten als Tags** — Farbige Badges für `type`, `topic`, `domain` etc.
- **Zeitstempel** — Relativ ("vor 3 Tagen"), Hover zeigt absolutes Datum

### 4.3 Memory-Indikator im Chat

**Neue Datei:** `src/components/chat/memory-indicator.tsx`

Im Chat-Header ein dezenter Hinweis, welche Memories geladen wurden:

```
┌──────────────────────────────────────────┐
│ Chat-Header              [Brain · 3]     │
└──────────────────────────────────────────┘
```

- **Brain-Icon + Zahl** zeigt an wie viele Memories in den Prompt injiziert wurden
- **Klickbar** — öffnet ein Popover/Dropdown mit der Liste der geladenen Memories
- **Nur sichtbar** wenn `memoriesLoaded > 0`
- **Transparenz:** User versteht warum die KI bestimmte Dinge "weiß" und kann bei Bedarf korrigieren (Link zu Memory-Verwaltung im Popover)

```typescript
interface MemoryIndicatorProps {
  memoriesLoaded: number
  memories?: Array<{ memory: string; metadata?: Record<string, unknown> }>
}
```

Die `memories`-Liste wird via `messageMetadata` vom Server zum Client gesendet (wie `chatId`, `modelId`):

```typescript
// In route.ts → toUIMessageStreamResponse
messageMetadata: ({ part }) => {
  if (part.type === "start") {
    return {
      chatId: resolvedChatId,
      modelId: finalModelId,
      memoriesLoaded: context.memoriesLoaded,  // NEU
      // Optional: Die Memory-Texte selbst (für Popover)
      // memories: memories.map(m => ({ memory: m.memory })),
    }
  }
}
```

### 4.4 Memory-Metadaten für Herkunft

Damit die Verwaltungs-UI die Herkunft anzeigen kann, müssen sowohl die automatische Extraktion als auch das save_memory Tool entsprechende Metadaten mitliefern:

**Automatische Extraktion (persist.ts):**

```typescript
await client.add(formattedMessages, {
  user_id: userId,
  metadata: {
    chatId,
    source: "auto",
    expertId: expert?.id ?? null,
    expertName: expert?.name ?? null,
    extractedAt: new Date().toISOString(),
  },
})
```

**Explizites save_memory Tool:**

```typescript
// In createSaveMemoryTool — metadata wird um source + expert angereichert
const enrichedMetadata = {
  ...metadata,
  source: "explicit",
  expertId: expertId ?? null,    // via Closure
  expertName: expertName ?? null, // via Closure
  chatId,                         // via Closure
}
```

### 4.5 Settings-Page Integration

Memory-Verwaltung als neuer Tab/Bereich im bestehenden Settings-Dialog oder als eigene Route `/settings/memories`.

**Einfachster Ansatz:** Neuer Tab im Settings-Dialog neben "Allgemein" (wo Custom Instructions und Default Model leben).

### Phase 4 — Dateien-Übersicht

| Aktion | Datei                                                              |
| ------ | ------------------------------------------------------------------ |
| Neu    | `src/app/api/user/memories/route.ts`                               |
| Neu    | `src/app/api/user/memories/[memoryId]/route.ts`                    |
| Neu    | `src/app/api/user/memories/export/route.ts`                        |
| Neu    | `src/components/settings/memory-manager.tsx`                       |
| Neu    | `src/components/chat/memory-indicator.tsx`                         |
| Edit   | `src/app/api/chat/route.ts` — memoriesLoaded in messageMetadata    |
| Edit   | `src/components/chat/chat-header.tsx` — Memory-Indikator einbinden |
| Edit   | `src/lib/ai/tools/save-memory.ts` — source/expert Metadaten        |
| Edit   | `src/lib/memory/index.ts` — source/expert Metadaten bei Extraktion |
| Edit   | Settings-Dialog/Page — Memory-Tab hinzufügen                       |

---

## Resilience & Fehlertoleranz

Das Memory-System darf das bestehende Chat-System unter keinen Umständen destabilisieren. Drei Mechanismen stellen das sicher:

### Timeout + Graceful Degradation (Phase 1)

Memory-Search bei Chat-Start läuft als `Promise.race` gegen einen 3-Sekunden-Timeout. Wenn Mem0 nicht rechtzeitig antwortet, geht der Chat ohne Memory-Kontext weiter. Der User merkt nichts — die Antwort kommt nur ohne den Memory-Layer.

```
Mem0 antwortet in <3s  → Memories im Prompt
Mem0 antwortet in >3s  → Leerer Memory-Block, Chat normal
Mem0 wirft Error       → .catch(() => []), Chat normal
```

### Circuit Breaker (Phase 1+2)

In-Memory Circuit Breaker in `src/lib/memory/index.ts`. Nach 5 aufeinanderfolgenden Fehlern wird der Circuit für 5 Minuten geöffnet. Während dieser Zeit werden keine Mem0-Calls gemacht (weder Search noch Extraktion). Nach dem Cooldown wird der erste Call als Probe verwendet.

Verhindert:

- Log-Spam bei Mem0-Ausfall
- Unnötige Latenz durch Calls die ohnehin fehlschlagen
- API-Rate-Limit-Probleme durch Retry-Loops

### Token-Budget für Memory-Block (Phase 1)

`formatMemoriesForPrompt` hat ein hartes Limit von 4000 Zeichen (~1000 Tokens). Memories kommen von Mem0 nach Relevanz sortiert. Die Funktion nimmt so viele wie ins Budget passen und schneidet den Rest ab. Das verhindert Prompt-Bloat selbst wenn Mem0 lange Memories oder viele Ergebnisse zurückgibt.

---

## Integration Points (Zusammenfassung)

### Chat-Route Flow mit Memory

```
User sendet Message
    │
    ▼
route.ts — POST /api/chat
    │
    ▼
resolveContext()
    ├── getUserPreferences() → memoryEnabled?
    ├── getChatById() → isIncognito?
    ├── searchMemories(userId, query) ← NEU (parallel)
    └── buildSystemPrompt({ memoryContext }) ← NEU
    │
    ▼
buildTools({ memoryEnabled, userId })
    ├── save_memory (wenn aktiv)
    └── recall_memory (wenn aktiv)
    │
    ▼
streamText()
    │
    ▼
onFinish (persist.ts)
    ├── saveMessages (bestehend)
    ├── logUsage (bestehend)
    ├── titleGeneration (bestehend)
    └── extractMemories() ← NEU (fire-and-forget)
```

### Prompt-Assembly

```
Layer 1: Expert Persona
Layer 2: Artifact Instructions
Layer 2.5: Web-Tools
Layer 2.6: MCP-Tools
Layer 3: Skills / Quicktask
Layer 5: Memory-Kontext ← NEU
Layer 6: Projekt-Instruktionen
Layer 7: Custom Instructions
```

### Feature Flags & Guards

```
Feature aktiv?     → MEM0_API_KEY gesetzt
User will Memory?  → users.memoryEnabled (default true)
Chat ist privat?   → chats.isIncognito (default false)

Memory Search:     Feature ∧ User ∧ ¬Inkognito
Memory Extract:    Feature ∧ User ∧ ¬Inkognito ∧ Messages ≥ MIN
Memory Tools:      Feature ∧ User ∧ ¬Inkognito
```

---

## Kosten & Performance

### Mem0 Cloud Kosten

- **Search:** ~0.001$ pro Query (Embedding + Vector Search)
- **Add (Extraktion):** ~0.01-0.05$ pro Chat (LLM-Call für Faktenextraktion)
- **Storage:** Im Cloud-Plan inkludiert

### Performance-Impact

- **Search bei Chat-Start:** ~200-500ms (parallel zu anderen Queries, kein Bottleneck)
- **Extraktion nach Chat:** Fire-and-forget, blockiert nicht den Response
- **Tool-Calls:** ~200-500ms pro save_memory/recall_memory

### Kostenkontrolle

- `MEMORY_MIN_MESSAGES=4` — Kurze Chats (1-3 Messages) werden nicht extrahiert
- `MEMORY_SEARCH_LIMIT=10` — Max 10 Memories im Prompt (Token-Budget)
- Inkognito-Mode für sensible Chats
- Globaler Toggle für User die kein Memory wollen

---

## Offene Entscheidungen

| #   | Frage                                                                    | Empfehlung                                                                                                  |
| --- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| 1   | **Mem0 npm Package:** `mem0ai` oder `@mem0/vercel-ai-provider`?          | `mem0ai` direkt — Provider-Wrapper ist für `generateText`-Integration, wir brauchen `search`/`add`/`delete` |
| 2   | **Memory-Limit pro User:** Max Memories in Mem0?                         | Erst ohne Limit starten, monitoren, bei Bedarf Cleanup einbauen                                             |
| 3   | ~~Token-Budget~~ **Entschieden:** 4000 Zeichen (~1000 Tokens)            | Hartes Limit in `formatMemoriesForPrompt`, relevanteste Memories zuerst                                     |
| 4   | ~~Extraktion-Timing~~ **Entschieden:** onFinish fire-and-forget          | Mit Circuit Breaker abgesichert gegen Dauerfehler                                                           |
| 5   | **Mem0 API Kompatibilität:** Exakte API des `mem0ai` npm-Packages prüfen | Vor Phase 1 context7 MCP konsultieren für aktuelle API                                                      |

---

## Abhängigkeiten

### Neue npm Packages

```bash
pnpm add mem0ai
```

### Neue ENV-Variablen

```env
# Memory System (M8)
MEM0_API_KEY=                           # Mem0 Cloud API Key (Feature-Gate)
MEMORY_EXTRACTION_MODEL=gpt-4.1-nano   # LLM für Extraktion (optional)
MEMORY_MIN_MESSAGES=4                   # Min Messages für Extraktion (optional)
MEMORY_SEARCH_LIMIT=10                  # Max Memories im Prompt (optional)
```

### DB-Migrationen

```sql
-- Phase 2
ALTER TABLE users ADD COLUMN memory_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE chats ADD COLUMN is_incognito BOOLEAN NOT NULL DEFAULT false;
```

### Keine Abhängigkeit auf andere Milestones

M8 ist unabhängig von M6 (Projekte) und M7 (MCP). Memory funktioniert mit und ohne Projekte, mit und ohne MCP.

---

## Phasen-Reihenfolge

| Phase       | Inhalt                     | Voraussetzung          |
| ----------- | -------------------------- | ---------------------- |
| **Phase 1** | Foundation + Retrieval     | Mem0 Account + API Key |
| **Phase 2** | Auto-Extraktion + Settings | Phase 1                |
| **Phase 3** | Explizite Tools            | Phase 1                |
| **Phase 4** | Memory-Verwaltung UI       | Phase 1                |

Phase 2 und 3 sind unabhängig voneinander und können parallel entwickelt werden. Phase 4 kann jederzeit nach Phase 1 kommen.
