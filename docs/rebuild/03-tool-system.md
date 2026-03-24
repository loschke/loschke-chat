# 03 — Tool System

## Factory-Pattern → Deklarative Mastra Tools

### Heute: Factory Functions mit Closures

Tools werden als Factory Functions definiert, die Request-Context über Closures kapseln:

```typescript
// src/lib/ai/tools/create-artifact.ts (vereinfacht)
export function createArtifactTool(chatId: string) {
  return tool({
    description: 'Creates a document artifact',
    parameters: z.object({ title: z.string(), content: z.string(), type: z.string() }),
    execute: async ({ title, content, type }) => {
      // chatId über Closure verfügbar
      await saveArtifact({ chatId, title, content, type })
      return { success: true }
    },
  })
}
```

Registration in `build-tools.ts`:
```typescript
const tools = {
  create_artifact: createArtifactTool(chatId),
  web_search: features.search.enabled ? webSearchTool() : undefined,
  // ...conditional registration
}
```

**Probleme:**
- Context (chatId, userId) über Closures → nicht typsicher, nicht testbar
- Conditional Registration mit Feature-Flags → viel Boilerplate
- Collision Guards gegen MCP-Tools → manuell
- Expert allowedTools Filter → nachträglich

### Mit Mastra: Deklarative Tools mit Context Schema

```typescript
// src/mastra/tools/create-artifact.ts
import { createTool } from '@mastra/core'

export const createArtifactTool = createTool({
  id: 'create_artifact',
  description: 'Erstellt ein Dokument-Artifact (Markdown, HTML, Code)',
  inputSchema: z.object({
    title: z.string().describe('Titel des Artifacts'),
    content: z.string().describe('Inhalt'),
    type: z.enum(['markdown', 'html', 'code']).describe('Typ'),
    language: z.string().optional().describe('Programmiersprache bei Code'),
  }),
  outputSchema: z.object({
    artifactId: z.string(),
    success: z.boolean(),
  }),
  execute: async ({ context, input }) => {
    // Context typsicher über Mastra's requestContextSchema
    const { chatId, userId } = context
    const artifact = await saveArtifact({
      chatId,
      userId,
      title: input.title,
      content: input.content,
      type: input.type,
    })
    return { artifactId: artifact.id, success: true }
  },
})
```

**Vorteile:**
- `inputSchema` und `outputSchema` mit Zod → Type Safety + automatische Validierung
- Context über `requestContextSchema` statt Closures → typsicher, testbar
- Tools sind Singletons, nicht pro Request neu erstellt
- Automatische Tool-Iteration (Mastra managed multi-step tool calls)

---

## Context Injection via requestContextSchema

Mastra Agents unterstützen ein `requestContextSchema` für typsicheren Runtime-Context:

```typescript
// src/mastra/agents/shared/context.ts
export const chatContextSchema = z.object({
  chatId: z.string(),
  userId: z.string(),
  isNewChat: z.boolean(),
  expertSlug: z.string().optional(),
  projectId: z.string().optional(),
})

// Agent-Definition
const agent = new Agent({
  requestContextSchema: chatContextSchema,
  // ...
})

// Aufruf
agent.stream('User message', {
  context: {
    chatId: 'abc123',
    userId: 'user_xyz',
    isNewChat: true,
  },
})
```

Jedes Tool hat Zugriff auf `context` in seiner `execute`-Funktion. Kein Factory-Pattern mehr nötig.

---

## Tool-Kategorien

### Always-On Tools

Diese Tools sind bei jedem Agent verfügbar:

| Tool | Typ | Beschreibung |
|------|-----|-------------|
| `create_artifact` | Artifact (execute) | Dokument/HTML/Code erstellen |
| `create_quiz` | Artifact (execute) | Interaktiven Test erstellen |
| `create_review` | Artifact (execute) | Abschnittsweises Review |
| `ask_user` | Inline (no execute) | Strukturierte Rückfrage |
| `content_alternatives` | Inline (no execute) | Tab-View mit Varianten |

### Feature-Gated Tools

Verfügbar wenn entsprechende ENV-Variable gesetzt:

| Tool | Gate | ENV |
|------|------|-----|
| `web_search` | search | FIRECRAWL_API_KEY / JINA_API_KEY / ... |
| `web_fetch` | web | (gleich) |
| `save_memory` | memory | MEM0_API_KEY (Phase 1) → Mastra Memory (Phase 3) |
| `recall_memory` | memory | (gleich) |
| `generate_image` | imageGeneration | GOOGLE_GENERATIVE_AI_API_KEY |
| `load_skill` | (immer, wenn Skills existieren) | — |

### MCP Tools

Dynamisch von externen MCP-Servern geladen:

| Aspekt | Heute | Mit Mastra |
|--------|-------|-----------|
| Client | `@ai-sdk/mcp` createMCPClient | `@mastra/mcp` MCPClient |
| Prefixing | `{serverId}__{toolName}` | Mastra managed Namespacing |
| Discovery | Per-Request Parallel Connection | Connection Pooling möglich |
| Collision | Manual Set-based Guard | Mastra handles deduplication |
| Cleanup | finally-Block in route.ts | Mastra Lifecycle Management |

---

## Tool Registration Pattern

### Heute: Imperative Registration in build-tools.ts

```typescript
export function buildTools(config: ToolConfig) {
  const tools: Record<string, Tool> = {}

  // Always-on
  tools.create_artifact = createArtifactTool(config.chatId)
  tools.ask_user = askUserTool()

  // Feature-gated
  if (features.search.enabled) {
    tools.web_search = webSearchTool()
  }

  // Expert filter
  if (config.expert.allowedTools.length > 0) {
    return filterTools(tools, config.expert.allowedTools)
  }

  return tools
}
```

### Mit Mastra: Tool Registry + Agent Binding

```typescript
// src/mastra/tools/index.ts — Zentrale Registry
export const allTools = {
  // Always-on
  create_artifact: createArtifactTool,
  create_quiz: createQuizTool,
  create_review: createReviewTool,
  ask_user: askUserTool,
  content_alternatives: contentAlternativesTool,

  // Feature-gated (conditional import)
  ...(features.search.enabled && {
    web_search: webSearchTool,
    web_fetch: webFetchTool,
  }),
  ...(features.memory.enabled && {
    save_memory: saveMemoryTool,
    recall_memory: recallMemoryTool,
  }),
  ...(features.imageGeneration.enabled && {
    generate_image: generateImageTool,
  }),
}

// Agent bindet seine Subset
const codeAgent = new Agent({
  tools: {
    create_artifact: allTools.create_artifact,
    ask_user: allTools.ask_user,
    // Code Agent braucht kein web_search, generate_image etc.
  },
})
```

**DB-Driven (für Admin-UI Kompatibilität):**

```typescript
async function buildAgentTools(expertConfig: ExpertConfig) {
  let tools = { ...allTools }

  // MCP Tools hinzufügen
  if (features.mcp.enabled && expertConfig.mcpServerIds.length > 0) {
    const mcpTools = await loadMcpTools(expertConfig.mcpServerIds)
    tools = { ...tools, ...mcpTools }
  }

  // Expert allowedTools Filter
  if (expertConfig.allowedTools.length > 0) {
    tools = Object.fromEntries(
      Object.entries(tools).filter(([name]) =>
        expertConfig.allowedTools.includes(name)
      )
    )
  }

  return tools
}
```

---

## Inline-Tools (Generative UI)

### Pattern: Kein execute → Client rendert UI

Inline-Tools (`ask_user`, `content_alternatives`) haben **kein execute**. Der Stream pausiert, der Client rendert eine interaktive Komponente, der User antwortet, und der Stream wird fortgesetzt.

**Dieses Pattern bleibt bestehen.** Mastra ändert nichts an der AI SDK Streaming-Mechanik für Tools ohne execute.

```typescript
// src/mastra/tools/ask-user.ts
export const askUserTool = createTool({
  id: 'ask_user',
  description: 'Stellt dem User eine strukturierte Rückfrage',
  inputSchema: z.object({
    question: z.string(),
    options: z.array(z.string()).optional(),
    allowFreeText: z.boolean().default(true),
  }),
  // KEIN execute → Client-Side Rendering
})
```

**Frontend-Seite:** `ChatMessage` erkennt Tool-Parts mit `state: "input-available"` und rendert die entsprechende Generative UI Komponente. Dieser Code bleibt unverändert.

---

## Artifact-Tools (Server-Side Execute)

Artifact-Tools haben execute und speichern direkt in die DB:

```typescript
// src/mastra/tools/generate-image.ts
export const generateImageTool = createTool({
  id: 'generate_image',
  description: 'Generiert ein Bild basierend auf einer Beschreibung',
  inputSchema: z.object({
    prompt: z.string().describe('Bildbeschreibung'),
    style: z.enum(['natural', 'artistic', 'diagram']).optional(),
  }),
  outputSchema: z.object({
    imageUrl: z.string(),
    artifactId: z.string(),
  }),
  execute: async ({ context, input }) => {
    // Gemini Direct (nicht über Gateway)
    const imageData = await generateWithGemini(input.prompt, input.style)

    // R2 Upload
    const imageUrl = await uploadToR2(imageData, context.chatId)

    // Artifact speichern
    const artifact = await saveImageArtifact({
      chatId: context.chatId,
      imageUrl,
      prompt: input.prompt,
    })

    return { imageUrl, artifactId: artifact.id }
  },
})
```

---

## MCP-Integration in Mastra

### Heute

```typescript
// src/lib/mcp/client.ts
import { createMCPClient } from '@ai-sdk/mcp'

const client = await createMCPClient({
  transport: { type: 'sse', url: server.url },
  timeout: 5000,
})
const mcpTools = await client.tools()
// Prefixing: github__list_repos
```

### Mit Mastra

```typescript
// src/mastra/mcp/index.ts
import { MCPClient } from '@mastra/mcp'

export async function loadMcpTools(serverIds: string[]) {
  const servers = await getMcpServerConfigs(serverIds)

  const clients = await Promise.all(
    servers.map(server => new MCPClient({
      url: interpolateEnvVars(server.url),
      transport: server.transport,
      headers: interpolateEnvVars(server.headers),
      serverless: true, // Für Vercel
    }))
  )

  // Mastra MCPClient gibt Tools im Mastra-Format zurück
  const toolSets = await Promise.all(clients.map(c => c.tools()))

  // Merge mit Prefix
  return mergeWithPrefix(toolSets, servers)
}
```

**Verbesserungen:**
- `serverless: true` für Vercel-Kompatibilität
- Mastra managed Connection Lifecycle
- Bessere Error Handling bei fehlgeschlagenen Connections

---

## Migration Checklist

- [ ] Alle 12 Tools als Mastra `createTool()` definieren
- [ ] `requestContextSchema` für chatId, userId, etc. definieren
- [ ] Tool Registry (`allTools`) als zentrale Sammlung
- [ ] Feature-Gating in Registry (nicht in build-tools.ts)
- [ ] Expert allowedTools Filter als Utility-Funktion
- [ ] MCP-Integration auf Mastra MCPClient umstellen
- [ ] Inline-Tools (ask_user, content_alternatives) ohne execute beibehalten
- [ ] Artifact-Tools mit execute + DB-Persistenz
- [ ] Collision Guards für MCP vs. Built-in Tools
- [ ] Tests: Jedes Tool produziert korrekten Output
- [ ] Tests: Feature-Gating funktioniert korrekt
- [ ] Tests: MCP-Tools werden korrekt geladen und prefixed

---

## Altsystem-Referenzen

Für die Umsetzung dieses Dokuments:

| Thema | Quelle |
|-------|--------|
| Alle 12 Tool-Implementierungen | `src/lib/ai/tools/*.ts` — Jede Datei = ein Tool |
| Tool Registration + Feature Gating | `src/app/api/chat/build-tools.ts` |
| Tool-System Übersicht | `src/lib/ai/CLAUDE.md` → "Tool System" |
| create_artifact Business Logic | `src/lib/ai/tools/create-artifact.ts` + `src/lib/db/queries/` → saveArtifact |
| generate_image (Gemini Direct) | `src/lib/ai/tools/generate-image.ts` + Image Gallery Format |
| web_search Provider-Routing | `src/lib/ai/tools/web-search.ts` + `src/lib/search/` |
| parse_fake_artifact Regex | `src/lib/ai/tools/parse-fake-artifact.ts` |
| MCP Client + Prefixing | `src/lib/mcp/` + `src/app/api/chat/build-tools.ts` → MCP Section |
| MCP Server DB-Schema | `src/lib/db/schema/` → mcp_servers Table |
| Inline-Tool Frontend Pattern | `docs/features/generative-ui-tools-guide.md` |
| Tool-Part State Handling | `src/components/chat/` → chat-message.tsx, use-artifact.ts |
| Collision Guard (Built-in vs MCP) | `src/app/api/chat/build-tools.ts` → Set-based deduplication |
