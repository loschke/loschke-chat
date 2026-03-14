# AI Chat Platform

> **Hinweis:** Diese Datei enthält erweiterte Referenzen (Documentation URLs, Library Patterns, Zukunfts-Konzepte).
> Die **aktuelle** Projekt-Wahrheit steht in der Haupt-`CLAUDE.md` im Projekt-Root.
> Stand: M5 abgeschlossen, M6 Projekte MVP als nächstes.

## Project Overview

Full-featured AI chat platform with artifact system, expert system, MCP integration, Anthropic Skills, and web search. Built on the Vercel ecosystem.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Server Components, proxy.ts statt middleware.ts)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4
- **UI Base:** shadcn/ui (CSS Variables mode required)
- **AI UI:** AI Elements (`npx ai-elements@latest` — installed in `components/ai-elements/`)
- **AI Core:** AI SDK v6 (`ai`, `@ai-sdk/react`)
- **AI Models:** Vercel AI Gateway — all model calls use string format `provider/model-name`
- **AI Rendering:** Streamdown (`streamdown`, `@streamdown/code`, `@streamdown/mermaid`, `@streamdown/math`)
- **MCP:** `@ai-sdk/mcp` for Model Context Protocol integration
- **MCP Apps Host:** `@mcp-ui/client` for rendering MCP App UIs in sandboxed iframes
- **MCP Apps SDK:** `@modelcontextprotocol/ext-apps` (types, AppBridge if needed)
- **Skills:** Anthropic Agent Skills API (beta: `skills-2025-10-02`, `code-execution-2025-08-25`)
- **Database:** Neon Serverless Postgres + Drizzle ORM
- **Caching:** Redis (Upstash)
- **Storage:** Cloudflare R2 (S3-compatible, via `@aws-sdk/client-s3`)
- **Auth:** Logto Cloud (`@logto/next`, App Router integration)

## Documentation References

When you need current documentation for any stack component, fetch these URLs:

| Component                   | Context URL                                                          |
| --------------------------- | -------------------------------------------------------------------- |
| AI SDK (complete)           | `https://ai-sdk.dev/llms.txt`                                        |
| AI Elements                 | `https://ai-sdk.dev/elements`                                        |
| AI Gateway                  | `https://vercel.com/docs/ai-gateway`                                 |
| Streamdown                  | `https://streamdown.ai/`                                             |
| MCP in AI SDK               | `https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools`                      |
| MCP Apps Extension          | `https://modelcontextprotocol.io/extensions/apps/overview`           |
| MCP Apps SDK/API            | `https://apps.extensions.modelcontextprotocol.io`                    |
| MCP Apps Repo               | `https://github.com/modelcontextprotocol/ext-apps`                   |
| MCP-UI Client (Host)        | `https://mcpui.dev/`                                                 |
| Anthropic Skills            | `https://platform.claude.com/docs/en/build-with-claude/skills-guide` |
| Agent Skills (AI SDK Guide) | `https://ai-sdk.dev/cookbook/guides/agent-skills`                    |
| Agent Skills Spec           | `https://agentskills.io/specification`                               |
| Neon Postgres               | `https://neon.com/docs/ai/ai-rules.md`                               |
| Neon full index             | `https://neon.com/docs/llms.txt`                                     |
| Logto Next.js               | `https://docs.logto.io/quick-starts/next-app-router`                 |
| R2 Docs                     | `https://developers.cloudflare.com/r2/`                              |
| **Phase 2: Managed MCP**    |                                                                      |
| Pipedream MCP Docs          | `https://pipedream.com/docs/connect/mcp`                             |
| Pipedream Chat Demo         | `https://github.com/PipedreamHQ/mcp-chat`                            |
| Composio (AI SDK)           | `https://docs.composio.dev/docs/providers/vercel`                    |
| Smithery Registry API       | `https://smithery.ai/docs/concepts/registry_search_servers`          |
| **Explore Later**           |                                                                      |
| CopilotKit (Orchestration)  | `https://docs.copilotkit.ai`                                         |
| CopilotKit MCP Apps         | `https://www.copilotkit.ai/mcp-apps`                                 |
| AG-UI Protocol              | `https://github.com/ag-ui-protocol/ag-ui`                            |
| A2UI Spec (Google)          | `https://github.com/google/A2UI`                                     |
| Mastra (Agent Framework)    | `https://mastra.ai/docs`                                             |
| ai-sdk-tools Cache          | `https://ai-sdk-tools.dev/cache`                                     |

## Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/page.tsx
│   │   └── callback/page.tsx
│   ├── (chat)/
│   │   ├── layout.tsx                  # Sidebar + Chat area layout
│   │   ├── page.tsx                    # New chat / expert selection
│   │   └── c/[chatId]/
│   │       └── page.tsx                # Chat view
│   ├── (settings)/
│   │   ├── settings/page.tsx           # User settings
│   │   ├── experts/page.tsx            # Expert management
│   │   ├── mcp/page.tsx                # MCP server management
│   │   └── projects/page.tsx           # Project management
│   ├── api/
│   │   ├── chat/route.ts               # AI SDK streaming endpoint
│   │   ├── chat/skills/route.ts        # Anthropic Skills endpoint (separate path)
│   │   ├── upload/route.ts             # R2 presigned URL generation
│   │   └── files/[fileId]/route.ts     # File download proxy
│   └── layout.tsx                      # Root layout (auth provider, theme)
├── components/
│   ├── ai-elements/                    # Auto-installed by AI Elements CLI
│   ├── chat/
│   │   ├── chat-sidebar.tsx
│   │   ├── chat-input.tsx
│   │   ├── chat-messages.tsx
│   │   ├── tool-renderer.tsx           # Maps tool-invocations → components
│   │   ├── expert-selector.tsx
│   │   └── model-selector.tsx
│   ├── generative-ui/                  # Own interactive components for tool results
│   │   ├── ask-user.tsx                # Structured user input (Prio 1)
│   │   ├── content-alternatives.tsx    # Switchable A/B/C content variants (Prio 1)
│   │   ├── weather-card.tsx
│   │   ├── chart-view.tsx
│   │   ├── data-table.tsx
│   │   ├── confirm-action.tsx
│   │   ├── link-preview.tsx
│   │   └── image-gallery.tsx
│   ├── artifacts/
│   │   ├── artifact-panel.tsx
│   │   ├── artifact-html.tsx
│   │   ├── artifact-code.tsx
│   │   ├── artifact-file.tsx
│   │   └── artifact-markdown.tsx
│   ├── mcp/
│   │   ├── mcp-app-renderer.tsx        # @mcp-ui/client AppRenderer wrapper
│   │   └── mcp-server-config.tsx
│   └── ui/                             # shadcn/ui components
├── lib/
│   ├── ai/
│   │   ├── gateway.ts                  # AI Gateway config
│   │   ├── prompt-builder.ts           # System prompt assembly (Expert + Skills + Project)
│   │   ├── tools/
│   │   │   ├── web-search.ts           # Web search tool definition
│   │   │   ├── load-skill.ts           # Agent Skill loading tool
│   │   │   ├── ask-user.ts             # Structured user input tool (no execute)
│   │   │   └── index.ts
│   │   ├── skills/
│   │   │   └── discovery.ts            # Scan skill dirs, extract metadata
│   │   ├── mcp/
│   │   │   ├── client-manager.ts       # MCP client lifecycle
│   │   │   └── app-renderer.ts         # MCP Apps detection + resource fetching
│   │   └── anthropic/
│   │       ├── skills-client.ts        # Anthropic Skills API (doc generation)
│   │       └── file-handler.ts         # Files API download → R2 upload
│   ├── db/
│   │   ├── client.ts                   # Neon + Drizzle client
│   │   ├── schema/
│   │   │   ├── users.ts
│   │   │   ├── chats.ts
│   │   │   ├── messages.ts
│   │   │   ├── artifacts.ts
│   │   │   ├── experts.ts
│   │   │   ├── projects.ts
│   │   │   ├── project-documents.ts
│   │   │   └── mcp-servers.ts
│   │   └── migrations/
│   ├── auth/
│   │   └── logto.ts                    # Logto config + helpers
│   ├── storage/
│   │   └── r2.ts                       # S3Client + presigned URL helpers
│   └── cache/
│       └── redis.ts                    # Upstash Redis client
├── lib/pii/
│   └── check.ts                        # PII detection (openredaction, client-safe)
├── hooks/
│   ├── use-chat-history.ts
│   ├── use-artifacts.ts
│   └── use-mcp-tools.ts
└── types/
    ├── chat.ts
    ├── expert.ts
    ├── artifact.ts
    └── mcp.ts

skills/                                     # Agent Skills (SKILL.md files)
├── seo-analysis/
│   └── SKILL.md
├── react-patterns/
│   └── SKILL.md
├── data-analysis/
│   ├── SKILL.md
│   └── scripts/
├── content-optimization/
│   └── SKILL.md
└── ...                                     # Community skills via npx skills add
```

## Conventions

### General

- Use Server Components by default. Add `"use client"` only for interactive components.
- Use Server Actions for all mutations (DB writes, auth operations).
- Keep `lib/` free of React — pure TypeScript utilities only.
- Never import from `app/` in `lib/` or `components/`.
- Use Zod for all runtime validation (API inputs, tool parameters, form data).
- Prefer `async/await` over `.then()` chains.

### AI SDK Patterns

- **All model calls go through Vercel AI Gateway.** Use model string format: `"provider/model-name"`. Never import provider-specific packages for model calls.
- **EU-compliance via Mistral:** When GDPR-compliant processing is required, use Mistral models (`mistral/mistral-large-latest`, `mistral/mistral-medium-latest`). Mistral AI is an EU company (Paris) with EU data processing. Configurable per Expert or per Project via `modelPreference`.
- **PII detection before send:** When GDPR mode is active, run `openredaction` (or `redact-pii-core`) client-side on the user's message BEFORE sending it to the API. If PII is detected, show a confirmation dialog listing the detected categories (name, email, phone, etc.) with partially masked values. User must explicitly confirm before the message leaves the browser. This check runs locally — no data is sent to any service.

```typescript
// lib/pii/check.ts
import { OpenRedaction } from 'openredaction';

const redactor = new OpenRedaction({ redactionMode: 'placeholder' });

export async function detectPII(text: string) {
  const result = await redactor.detect(text);
  return {
    hasPII: result.detections.length > 0,
    detections: result.detections.map(d => ({
      type: d.type,       // 'EMAIL', 'NAME', 'PHONE', etc.
      masked: d.placeholder, // '[EMAIL_XXXX]'
    })),
  };
}

// Called in chat-input.tsx BEFORE sending:
// const piiResult = await detectPII(input);
// if (piiResult.hasPII) → show confirmation dialog
// else → send immediately
```

- **Use `useChat` hook** for all chat interfaces. Do not build custom streaming logic.
- **Use `streamText`** in Route Handlers for chat endpoints.
- **Use `tool()`** from AI SDK for all tool definitions with Zod schemas.
- **Tools with side effects** must use `needsApproval: true`.
- **Message persistence** uses `UIMessage` format via `onFinish` callback.

```typescript
// CORRECT: AI Gateway model string
const result = streamText({
  model: 'anthropic/claude-sonnet-4-20250514',
  messages,
  tools: { webSearch, ...mcpTools },
});

// WRONG: Direct provider import for model calls
import { anthropic } from '@ai-sdk/anthropic';
const result = streamText({ model: anthropic('claude-sonnet-4-20250514'), ... });
```

### AI Elements

- AI Elements components are in `components/ai-elements/` (auto-installed).
- Use `Conversation` + `ConversationContent` as chat container.
- Use `Message` + `MessageContent` + `MessageResponse` for messages.
- Use `Streamdown` inside `MessageResponse` for markdown rendering.
- Use `Tool` component for tool call display.
- Use `Confirmation` component for tool approval flows.
- Use `CodeBlock` for standalone code artifacts.
- Use `Reasoning` for chain-of-thought display.

### Streamdown

- **Never use `react-markdown`.** Always use Streamdown.
- Import styles: `import "streamdown/styles.css"`
- Add to `globals.css`: `@source "../node_modules/streamdown/dist/*.js";`
- Always pass `animated` and `isAnimating={status === 'streaming'}` for streaming.
- Use plugins: `code` (always), `mermaid` (always), `math` (always).

```typescript
import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import { mermaid } from "@streamdown/mermaid";
import { math } from "@streamdown/math";

<Streamdown
  animated
  plugins={{ code, mermaid, math }}
  isAnimating={status === 'streaming'}
>
  {part.text}
</Streamdown>
```

### Three UI Rendering Layers

This project uses three distinct approaches for rendering non-text content in the chat. Understanding when to use which is critical.

| Layer             | Source                                         | Rendered where                  | Isolation                           | When to use                                                                   |
| ----------------- | ---------------------------------------------- | ------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------- |
| **Artifacts**     | AI-generated content                           | Side panel (split-view)         | Sandboxed iframe for HTML           | Persistent outputs: documents, code files, HTML pages                         |
| **Generative UI** | Own React components, triggered by tool calls  | Inline in chat flow             | None (runs in host process)         | Own interactive features: weather cards, charts, tables, confirmation dialogs |
| **MCP Apps**      | External MCP server delivers complete HTML app | Sandboxed iframe inline in chat | Full isolation (postMessage bridge) | Third-party integrations with UI: Jira, Notion, analytics dashboards          |

### Generative UI (Own Interactive Components)

Generative UI = the model triggers a tool call, and the frontend renders a custom React component for that tool's result. This is NOT `ai/rsc` with `createStreamableUI` (deprecated pattern). It uses standard `useChat` + tool-result rendering on the client.

**Pattern overview:**

1. Define tools in the backend route handler (with `tool()` from AI SDK)
2. Model decides to call a tool → tool executes → result streamed to client
3. Client receives tool-invocation part in `message.parts`
4. Client maps tool name → React component
5. Component renders inline in the chat with full access to app state and styling

**Backend — tool definition (same as any other tool):**

```typescript
// lib/ai/tools/weather.ts
import { tool } from 'ai';
import { z } from 'zod';

export const showWeather = tool({
  description: 'Show an interactive weather display for a location',
  parameters: z.object({
    city: z.string(),
    unit: z.enum(['celsius', 'fahrenheit']).default('celsius'),
  }),
  execute: async ({ city, unit }) => {
    const data = await fetchWeatherData(city, unit);
    return data;  // Return DATA, not UI — UI is handled by frontend
  },
});
```

**Frontend — tool-result → component mapping:**

```tsx
// components/chat/tool-renderer.tsx
import { WeatherCard } from '@/components/generative-ui/weather-card';
import { ChartView } from '@/components/generative-ui/chart-view';
import { DataTable } from '@/components/generative-ui/data-table';
import { AskUser } from '@/components/generative-ui/ask-user';
import { ContentAlternatives } from '@/components/generative-ui/content-alternatives';
import { Tool } from '@/components/ai-elements/tool';

const toolComponents: Record<string, React.ComponentType<any>> = {
  show_weather: WeatherCard,
  render_chart: ChartView,
  show_data_table: DataTable,
  content_alternatives: ContentAlternatives,
};

export function ToolRenderer({ part, addToolResult }: {
  part: ToolInvocationPart;
  addToolResult: (params: { toolCallId: string; result: unknown }) => void;
}) {
  // Special case: AskUser renders on 'call' state (waiting for input)
  if (part.toolName === 'ask_user' && part.state === 'call') {
    return (
      <AskUser
        data={part.args}
        toolCallId={part.toolCallId}
        addToolResult={addToolResult}
      />
    );
  }

  // Normal tools: render on 'result' state
  const Component = toolComponents[part.toolName];
  if (Component && part.state === 'result') {
    return <Component data={part.result} />;
  }

  // Fallback: AI Elements <Tool> component for unknown tools
  return <Tool name={part.toolName} state={part.state} result={part.result} />;
}
```

**In the message rendering loop:**

```tsx
const { addToolResult } = useChat();

{message.parts.map((part, index) => {
  switch (part.type) {
    case 'text':
      return <Streamdown key={index} ...>{part.text}</Streamdown>;
    case 'tool-invocation':
      return <ToolRenderer key={index} part={part} addToolResult={addToolResult} />;
    case 'reasoning':
      return <Reasoning key={index} ...>{part.text}</Reasoning>;
    // ... other part types
  }
})}
```

**Generative UI components live in `components/generative-ui/`:**

- They are normal React client components (`"use client"`)
- They receive the tool result as `data` prop
- They have full access to Tailwind, shadcn/ui, hooks, app state
- They can be interactive (click handlers, state, API calls)
- They render inline in the chat flow, not in a separate panel

**Key difference from Artifacts:** Generative UI components are ephemeral inline renderings inside the message flow. Artifacts are persistent, versioned outputs displayed in a side panel. A chart shown via Generative UI is part of the conversation. A chart saved as an HTML Artifact is a standalone document.

### Structured User Input (AskUser Tool)

The `ask_user` tool is a special Generative UI component that collects structured input from the user. The model decides when to ask, what to ask, and which options to offer — all contextually.

**Two key differences from normal tools:**

1. It has **no `execute` function** — it pauses the stream and waits for user input
2. The component renders on `state === 'call'` (not `'result'`), and uses `addToolResult` to send the answer back

**Backend tool definition:**

```typescript
// lib/ai/tools/ask-user.ts
export const askUser = tool({
  description: 'Ask the user structured questions with selectable options. Use instead of free-text questions when you need clarification.',
  parameters: z.object({
    questions: z.array(z.object({
      question: z.string(),
      type: z.enum(['single_select', 'multi_select', 'free_text']),
      options: z.array(z.string()).min(2).max(5).optional(),
    })).min(1).max(3),
  }),
  // NO execute — waits for user response via addToolResult
});
```

**The `ask_user` tool must ALWAYS be included in the tools object** passed to `streamText`, regardless of Expert or context. It is a global capability.

**System prompt guidance (include in every expert and in the global fallback):**

```
When you need clarification, use the ask_user tool instead of asking in prose.
Formulate concise questions with 2-4 meaningful options.
Combine related questions in one ask_user call (max 3).
The user can always type a custom answer despite options.
Use single_select for either/or, multi_select for multiple choices, free_text for open input.
```

### Database (Neon + Drizzle)

- Use Drizzle ORM for all database operations. No raw SQL.
- Use `@neondatabase/serverless` HTTP driver for serverless-compatible connections.
- Schema files are co-located in `lib/db/schema/`.
- Use `uuid` for all primary keys (via `crypto.randomUUID()`).
- Use `jsonb` columns for flexible data (message parts, metadata, preferences).
- Run migrations via `drizzle-kit push` in development, `drizzle-kit migrate` in production.

```typescript
// lib/db/client.ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

### File Storage (R2)

- All file storage goes through Cloudflare R2. Never store files on the server.
- Use presigned URLs for uploads — client uploads directly to R2.
- Use `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`.
- Key format: `{userId}/{chatId}/{filename}` or `artifacts/{artifactId}/{filename}`.
- Set appropriate Content-Type and Content-Disposition headers.

```typescript
// lib/storage/r2.ts
import { S3Client } from '@aws-sdk/client-s3';

export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
```

### Authentication (Logto)

- Use `@logto/next` with App Router Server Actions pattern.
- Config in `lib/auth/logto.ts`.
- Protect all `/api/` routes and `(chat)/` pages via middleware or `getLogtoContext()`.
- Map Logto user ID to internal user record on first sign-in.

### MCP Integration

**Strategy: Curated-first, user-managed later.**

Phase 1 (current): Admin-curated MCP servers. All servers are globally configured with service-account credentials. Users see MCP tools as capabilities of their Expert, not as separate servers they manage. No user-level OAuth needed.

Phase 2 (future): User-managed connections. Users can add their own MCP server URLs or connect personal accounts (e.g. "my Slack", "my GitHub"). This requires a managed auth layer — see "Future: Managed MCP Providers" below.

**Current approach (Phase 1):**

- MCP servers are configured in DB by admin (no `userId` on `mcp_servers` table)
- Credentials are service-account-level, stored encrypted
- MCP clients are created per-request (or cached in Redis)
- Use HTTP transport for all production MCP servers
- Always close MCP clients after use
- Filter tools based on Expert configuration

```typescript
import { createMCPClient } from '@ai-sdk/mcp';

const client = await createMCPClient({
  transport: { type: 'http', url: serverConfig.url },
});
const tools = await client.tools();
// Pass tools to streamText
// ...
await client.close();
```

**Future: Managed MCP Providers (for Phase 2 user-managed connections):**

- **Pipedream MCP** — 2,500+ APIs, managed OAuth per user, `/:external_user_id/:app` pattern. Best for user-level integrations. https://pipedream.com/docs/connect/mcp / https://mcp.pipedream.com
- **Composio** — 800+ toolkits, direct AI SDK integration, tool router. Alternative to Pipedream. https://docs.composio.dev
- **Smithery** — MCP server registry (7,000+). Useful as discovery/marketplace layer. https://smithery.ai

### MCP Apps (SEP-1865) — Host Implementation

Our chat platform acts as an MCP Apps **Host**. This means we render interactive HTML UIs that MCP servers provide as part of tool responses.

**Key packages:**

- `@mcp-ui/client` — React components for rendering MCP Apps in a host (RECOMMENDED)
- `@modelcontextprotocol/ext-apps` — Lower-level SDK with AppBridge

**Spec:** https://modelcontextprotocol.io/extensions/apps/overview
**Full API docs:** https://apps.extensions.modelcontextprotocol.io
**Host reference:** https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/basic-host
**MCP-UI client:** https://mcpui.dev/

**How MCP Apps work (from our perspective as Host):**

1. During `tools/list`, tools declare UI via `_meta.ui.resourceUri` pointing to `ui://` resources
2. When such a tool is called, we fetch the `ui://` resource from the MCP server → get HTML
3. We render the HTML in a sandboxed iframe inside the chat
4. We establish a postMessage JSON-RPC bridge between iframe and our host
5. The iframe (View) sends `ui/initialize`, we respond with capabilities + theme
6. We send `ui/notifications/tool-input` and `ui/notifications/tool-result` to the View
7. The View can call `tools/call` back through us, or trigger follow-up messages

**Detection pattern:**

```typescript
// When processing tools from MCP server, check for UI metadata
const tools = await mcpClient.tools();
for (const [name, tool] of Object.entries(tools)) {
  if (tool._meta?.ui?.resourceUri) {
    // This tool has a UI component — mark it for special rendering
    // When called, fetch the ui:// resource and render in iframe
  }
}
```

**Rendering pattern:**

```tsx
// components/mcp/mcp-app-renderer.tsx
// Use @mcp-ui/client for the heavy lifting, or implement with AppBridge:
// 1. Fetch HTML from ui:// resource via MCP client
// 2. Render in sandboxed iframe
// 3. Set up postMessage bridge (JSON-RPC)
// 4. Handle ui/initialize, tools/call proxying, sendFollowUpMessage
// 5. Enforce CSP from _meta.ui.csp
```

**Security rules:**

- Always render in sandboxed iframe (`sandbox="allow-scripts"`)
- No DOM access to host, no cookies, no localStorage from iframe
- CSP enforcement: Only allow domains declared in `_meta.ui.csp`
- All communication is auditable via postMessage
- Host controls which capabilities the View can access

**Tool visibility:** Tools can declare `visibility: ["model", "app"]` (default), `["app"]` (UI-only, e.g. refresh buttons), or `["model"]` (model-only). Our host must filter tool lists accordingly when proxying `tools/call` from the View.

### Anthropic Skills API (Document Generation — System Capability)

Anthropic Skills API is a system-wide capability for generating documents (PPTX, XLSX, DOCX, PDF). It is NOT related to Agent Skills (local knowledge files). It uses the Anthropic API directly, NOT the Vercel AI Gateway.

```typescript
// lib/ai/skills/anthropic-client.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const response = await anthropic.beta.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 4096,
  betas: ['code-execution-2025-08-25', 'skills-2025-10-02'],
  container: {
    skills: [
      { type: 'anthropic', skill_id: 'pptx', version: 'latest' }
    ]
  },
  tools: [{ type: 'code_execution_20250825', name: 'code_execution' }],
  messages: [{ role: 'user', content: userMessage }],
});

// Files must be downloaded via Files API, then uploaded to R2
```

### Agent Skills (Local Knowledge — Invisible to Users)

Agent Skills are markdown-based knowledge packages (agentskills.io format) that give the agent procedural expertise. The agent auto-discovers and loads them on demand. Users never see "Skills" as a concept.

**Skill files live in `skills/` directory:**

```
skills/
├── seo-analysis/
│   └── SKILL.md
├── react-patterns/
│   └── SKILL.md
├── data-analysis/
│   ├── SKILL.md
│   └── scripts/
└── content-optimization/
    └── SKILL.md
```

**The `loadSkill` tool enables on-demand loading:**

```typescript
const loadSkillTool = tool({
  description: 'Load a skill to get specialized instructions',
  parameters: z.object({ name: z.string() }),
  execute: async ({ name }) => {
    const skill = availableSkills.find(s => s.name === name);
    const content = await readFile(`${skill.path}/SKILL.md`);
    return { skillDirectory: skill.path, content: stripFrontmatter(content) };
  },
});
```

**Ref:** https://ai-sdk.dev/cookbook/guides/agent-skills

### Expert System

**Architecture:** Expert = Persona (systemPrompt) + Behavior (model, tools, temperature) + prioritized Skills. Experts do NOT contain dynamic knowledge — that comes from Projects.

- Experts are stored in the database (not hardcoded)
- Expert's `systemPrompt` defines persona and behavior
- Expert's `skillSlugs` prioritize certain Agent Skills (but don't lock others)
- Expert's `allowedTools` filter which tools are passed to the model
- Expert's `mcpServerIds` determine which MCP servers are connected
- Expert's `modelPreference` overrides the default model (user can still override)
- Expert is optional — chat works without one (all skills still available)

### System Prompt Assembly

The system prompt is assembled in layers. Each layer is optional.

```typescript
// lib/ai/prompt-builder.ts
export function buildSystemPrompt(
  expert?: Expert,
  project?: Project,
  projectDocs?: ProjectDocument[],
  skills: SkillMetadata[]
): string {
  // Layer 1: Expert persona (optional)
  let prompt = expert?.systemPrompt ?? 'Du bist ein hilfreicher Assistent.';

  // Layer 2: Skills overview (always — for progressive disclosure)
  const prioritized = expert?.skillSlugs ?? [];
  const sorted = [...skills].sort((a, b) =>
    (prioritized.includes(b.name) ? 1 : 0) - (prioritized.includes(a.name) ? 1 : 0)
  );
  prompt += '\n\n## Verfügbare Skills\n';
  prompt += 'Nutze loadSkill wenn ein Request von spezialisiertem Wissen profitiert.\n\n';
  prompt += sorted.map(s => `- ${s.name}: ${s.description}`).join('\n');

  // Layer 3: Project context documents (optional, dynamic)
  if (projectDocs?.length) {
    prompt += '\n\n## Projektkontext\n';
    for (const doc of projectDocs) {
      prompt += `\n### ${doc.title}\n${doc.content}\n`;
    }
  }

  return prompt;
}
```

**Key rule:** Expert brings static knowledge (via skill prioritization). Project brings dynamic knowledge (via context documents). Skills are auto-discoverable regardless of Expert.

## Environment Variables

```env
# Vercel AI Gateway
AI_GATEWAY_API_KEY=

# Anthropic (for Skills API — separate from AI Gateway)
ANTHROPIC_API_KEY=

# Neon Database
DATABASE_URL=postgresql://user:pass@ep-xxx.region.neon.tech/dbname?sslmode=require

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_DOMAIN=

# Logto Auth
LOGTO_ENDPOINT=https://xxx.logto.app
LOGTO_APP_ID=
LOGTO_APP_SECRET=
LOGTO_COOKIE_SECRET=   # min 32 characters

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Web Search
TAVILY_API_KEY=

# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Key Architectural Decisions

1. **Two API paths for AI:** Regular chat goes through AI Gateway (unified model access). Anthropic Skills API goes through Anthropic SDK directly (beta features required). The chat route handler decides which path based on whether document generation is needed.

2. **Three independent context axes:** Expert (persona + behavior), Project (dynamic knowledge), Agent Skills (procedural expertise). All three are optional and independently combinable.

3. **Agent Skills are invisible to users.** Users see competent Experts — they don't see "Skills" as a UI concept. Skills are an internal mechanism the agent manages autonomously via progressive disclosure.

4. **Expert = Persona, not Knowledge.** Experts define HOW the AI behaves. Static domain knowledge comes via Agent Skills (prioritized by Expert). Dynamic project knowledge comes from Project documents.

5. **Projects are living knowledge containers.** Context documents are a proper entity (project_documents table), not a JSON blob. They have token counts for context window management and are the natural place for future RAG.

6. **Artifacts are first-class entities.** They have their own DB table, versioning, and rendering pipeline. They are not just "formatted messages" — they are separate, persistent, editable outputs.

7. **MCP servers are admin-curated (Phase 1).** No global MCP config per user. Admin configures servers, assigns to Experts/Projects.

8. **File storage is always R2.** No local file storage, no server-side temp files. Everything goes through presigned URLs for upload, R2 public domain or signed URLs for download.

9. **Streamdown replaces react-markdown everywhere.** No exceptions.

## Do NOT

- Use `react-markdown` — use Streamdown
- Import AI provider packages directly for model calls — use AI Gateway strings
- Store files on the server filesystem — use R2
- Write raw SQL — use Drizzle ORM
- Build custom streaming/SSE logic — use AI SDK `streamText` + `useChat`
- Build custom chat state management — use AI SDK `useChat` hook
- Hardcode expert system prompts — store in database
- Mix Skills API calls with regular AI Gateway calls in the same route handler
- Use `localStorage` or `sessionStorage` in components — use React state + server persistence
- Skip tool approval for destructive MCP operations — use `needsApproval: true`
