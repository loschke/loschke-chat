# 02 — Agent System

## Expert → Mastra Agent Migration

### Heute: DB-Config + Runtime Assembly

Experts sind DB-Records in der `experts`-Tabelle:

```
experts
├── id, slug, name, description
├── systemPrompt (Text)
├── modelPreference (optional)
├── temperature (optional)
├── skillSlugs[] (jsonb)
├── allowedTools[] (jsonb)
├── mcpServerIds[] (jsonb)
└── isPublic, isActive, avatarUrl, categories[]
```

Zur Laufzeit werden Expert-Config, Skills, Memory, Project und Custom Instructions in `buildSystemPrompt()` zu einem System Prompt assembliert (6 Layer). Tools werden in `build-tools.ts` conditional registriert und durch `allowedTools` gefiltert.

**Dateien:**
- `src/config/prompts.ts` — System Prompt Assembly
- `src/app/api/chat/resolve-context.ts` — Expert/Model Resolution
- `src/app/api/chat/build-tools.ts` — Tool Registration

### Mit Mastra: Agent als First-Class Primitive

Ein Mastra Agent kapselt LLM, Instructions, Tools und Memory in einer Einheit:

```typescript
// src/mastra/agents/writer.ts
import { Agent } from '@mastra/core'

export const writerAgent = new Agent({
  id: 'writer',
  name: 'Content Writer',
  description: 'Erstellt hochwertige Texte, Blogposts und Content',

  // Model: Aus DB-Config oder Default
  model: gateway('anthropic/claude-sonnet-4-6'),

  // Instructions: Dynamic Function (ersetzt buildSystemPrompt)
  instructions: async ({ context }) => {
    return buildDynamicInstructions({
      expertSlug: 'writer',
      chatId: context.chatId,
      userId: context.userId,
      isNewChat: context.isNewChat,
    })
  },

  // Tools: Deklarativ gebunden
  tools: {
    create_artifact: createArtifactTool,
    web_search: webSearchTool,
    web_fetch: webFetchTool,
    load_skill: loadSkillTool,
    save_memory: saveMemoryTool,
    recall_memory: recallMemoryTool,
    ask_user: askUserTool,
    content_alternatives: contentAlternativesTool,
  },

  // Memory
  memory: mastraMemory,

  // Defaults
  defaultOptions: {
    temperature: 0.8,
  },
})
```

---

## Dynamic Instructions (6-Layer System Prompt)

Der größte Vorteil: Mastra's `instructions` Parameter akzeptiert eine **async Function**. Unsere gesamte 6-Layer-Logik kann als Runtime-Funktion laufen.

### buildDynamicInstructions()

```typescript
// src/mastra/agents/shared/build-instructions.ts

interface InstructionContext {
  expertSlug: string
  chatId?: string
  userId: string
  isNewChat: boolean
}

export async function buildDynamicInstructions(ctx: InstructionContext): Promise<string> {
  // Phase A: Parallel Queries
  const [expert, skills, userPrefs, project] = await Promise.all([
    getExpertBySlug(ctx.expertSlug),
    discoverSkills(ctx.expertSlug),
    getUserPreferences(ctx.userId),
    ctx.chatId ? getChatProject(ctx.chatId) : null,
  ])

  // Phase B: Assembly (wie heute, 6 Layer)
  const layers: string[] = []

  // Layer 1: Expert Persona
  layers.push(expert?.systemPrompt || DEFAULT_SYSTEM_PROMPT)

  // Layer 2: Artifact/Tool Instructions
  layers.push(ARTIFACT_INSTRUCTIONS)
  if (features.web.enabled) layers.push(WEB_TOOLS_INSTRUCTIONS)

  // Layer 3: Skills List (nicht bei Quicktask)
  if (skills.length > 0) {
    layers.push(formatSkillsList(skills))
  }

  // Layer 4: Memory Context (nur neue Chats)
  if (ctx.isNewChat && features.memory.enabled && userPrefs?.memoryEnabled) {
    const memories = await searchMemoryWithTimeout(ctx.userId, 3000)
    if (memories) layers.push(formatMemoryContext(memories))
  }

  // Layer 5: Project Context
  if (project) {
    layers.push(formatProjectContext(project))
  }

  // Layer 6: Custom Instructions
  if (userPrefs?.customInstructions) {
    layers.push(userPrefs.customInstructions)
  }

  return layers.join('\n\n')
}
```

**Vorteil gegenüber heute:** Die Logik ist identisch, aber sie lebt als eigenständige Funktion statt verstreut in `resolve-context.ts` und `prompts.ts`. Testbar, isoliert, wiederverwendbar.

---

## Tool-Binding pro Agent

### Heute: allowedTools Filter

```typescript
// build-tools.ts
let toolSet = { ...alwaysTools, ...conditionalTools, ...mcpTools }
if (expert.allowedTools.length > 0) {
  toolSet = filterByAllowedTools(toolSet, expert.allowedTools)
}
```

### Mit Mastra: Tools direkt am Agent

Jeder Agent deklariert seine Tools. Kein nachträgliches Filtering nötig:

```typescript
// Visual Agent: Nur Image-relevante Tools
export const visualAgent = new Agent({
  id: 'visual',
  tools: {
    generate_image: generateImageTool,
    create_artifact: createArtifactTool,
    ask_user: askUserTool,
  },
  // ...
})
```

**DB-Driven Tool Config:** Wenn Tools weiterhin per Admin-UI konfigurierbar sein sollen, können wir einen Tool-Resolver bauen:

```typescript
tools: async ({ context }) => {
  const expertConfig = await getExpertConfig(context.expertSlug)
  const allTools = await buildToolSet(context)
  return filterTools(allTools, expertConfig.allowedTools)
}
```

---

## Skills Integration

### Heute: load_skill Tool

Skills sind Markdown-Dateien mit Frontmatter in der DB. Der Agent hat ein `load_skill` Tool, das den Skill-Content on-demand lädt und als Tool-Result zurückgibt. Der Agent entscheidet selbst, wann er einen Skill braucht.

### Mit Mastra: Drei Optionen

**Option A: load_skill beibehalten (Empfohlen für Phase 1)**

Einfachste Migration. Skills bleiben in der DB, `load_skill` wird als Mastra Tool definiert. Keine Änderung am Skill-System.

**Option B: Skills als RAG-Dokumente**

Skills werden in die RAG Pipeline aufgenommen. Statt explizitem `load_skill` findet der Agent relevante Skills automatisch über Semantic Search.

```
Skills → Chunk → Embed → pgvector
Agent fragt → Semantic Search → relevante Skill-Snippets im Context
```

Vorteil: Agent muss nicht wissen, welche Skills existieren. Nachteil: Weniger Kontrolle, Skills sind Fragmente statt vollständige Dokumente.

**Option C: Skills als Agent-Workflows**

Komplexe Skills (Quicktasks) werden als Mastra Workflows implementiert. Der Agent kann einen Workflow triggern statt einen Text zu laden.

**Empfehlung:** Phase 1 mit Option A (load_skill beibehalten). Phase 3 evaluieren ob Option B für informational Skills Sinn macht. Option C für Quicktasks in Phase 2.

---

## Quicktask-Pattern

### Heute

Quicktasks sind Skills mit `mode: "quicktask"`, `fields`-Definition und Template-Syntax (`{{variable}}`). Der User füllt ein Formular, der Output wird als System Prompt injiziert, das Ergebnis als Artifact erstellt.

### Mit Mastra: Workflow

Ein Quicktask ist ein natürlicher Mastra Workflow:

```typescript
// src/mastra/workflows/quicktask.ts
const quicktaskWorkflow = new Workflow({
  id: 'quicktask',
  steps: [
    // Step 1: Template mit User-Input rendern
    step('render-template', {
      execute: async ({ input }) => {
        const skill = await getSkill(input.skillSlug)
        return renderTemplate(skill.content, input.fields)
      }
    }),
    // Step 2: Agent mit gerendertem Prompt ausführen
    step('generate', {
      execute: async ({ input, previousResult }) => {
        const agent = resolveAgent(input.expertSlug)
        return agent.generate(previousResult.renderedPrompt, {
          temperature: input.skill.temperature,
        })
      }
    }),
    // Step 3: Als Artifact speichern
    step('save-artifact', {
      execute: async ({ input, previousResult }) => {
        return saveArtifact({
          chatId: input.chatId,
          type: 'markdown',
          content: previousResult.text,
        })
      }
    }),
  ]
})
```

---

## Agent Resolution (Expert-Wechsel)

### Heute: Priority Chain

```
Request Body Expert → Chat Expert → Project Default → None (Default Prompt)
```

### Mit Mastra: Agent Registry

```typescript
// src/mastra/agents/index.ts
const agents = {
  general: generalAgent,
  code: codeAgent,
  writer: writerAgent,
  researcher: researcherAgent,
  analyst: analystAgent,
  seo: seoAgent,
  visual: visualAgent,
}

export function resolveAgent(slug?: string): Agent {
  return agents[slug] || agents.general
}
```

**DB-Driven Agents:** Für dynamische Expert-Konfiguration (Admin-UI) brauchen wir einen Hybrid-Ansatz:

```typescript
export async function resolveAgent(slug: string): Promise<Agent> {
  const config = await getExpertConfig(slug)

  // Base Agent mit DB-Config überschreiben
  return new Agent({
    ...baseAgentDefaults,
    id: config.slug,
    name: config.name,
    model: config.modelPreference
      ? gateway(config.modelPreference)
      : defaultModel,
    instructions: async (ctx) => buildDynamicInstructions({
      expertSlug: config.slug,
      ...ctx.context,
    }),
    tools: await buildToolSet(config),
    defaultOptions: {
      temperature: config.temperature || 0.7,
    },
  })
}
```

**Wichtig:** Agents werden pro Request erstellt (nicht als Singletons gecacht), weil DB-Config sich ändern kann. Caching auf Expert-Config-Ebene bleibt (60s TTL wie heute).

---

## Sub-Agent Delegation

Mastra unterstützt Agent-zu-Agent Delegation:

```typescript
const generalAgent = new Agent({
  // ...
  agents: { writer: writerAgent, code: codeAgent },
})
```

**Für uns relevant?** Aktuell wechselt der User den Expert manuell. Sub-Agent Delegation wäre ein Feature für v3 — z.B. der General Agent delegiert automatisch an den Code Agent wenn er Code-Fragen erkennt.

**Phase 1:** Nicht implementieren. Expert-Wechsel bleibt user-driven.

---

## Migration Checklist

- [ ] 7 Agent-Definitionen erstellen (general, code, writer, researcher, analyst, seo, visual)
- [ ] `buildDynamicInstructions()` aus bestehender `buildSystemPrompt()` + `resolveContext()` extrahieren
- [ ] `resolveAgent()` mit DB-Fallback implementieren
- [ ] Tool-Binding pro Agent konfigurieren
- [ ] load_skill als Mastra Tool migrieren
- [ ] Quicktask-Workflow definieren
- [ ] Agent Resolution Priority Chain beibehalten
- [ ] Tests: Jeder Agent produziert korrekten System Prompt
- [ ] Tests: Tool-Filtering funktioniert wie heute

---

## Altsystem-Referenzen

Für die Umsetzung dieses Dokuments:

| Thema | Quelle |
|-------|--------|
| Expert DB-Schema + Felder | `src/lib/db/schema/` → experts Table |
| Expert Seed-Dateien (7 Personas) | `seeds/experts/*.md` — System Prompts als Markdown mit Frontmatter |
| buildSystemPrompt() Implementierung | `src/config/prompts.ts` — Alle 6 Layer, Formatierung, Konstanten |
| Skill Discovery + Cache | `src/lib/ai/skills/` + `src/lib/db/queries/` |
| Skill Template-Syntax ({{var}}) | `src/lib/ai/skills/` → Template Parser |
| Expert Resolution Priority Chain | `src/app/api/chat/resolve-context.ts` → resolveExpert() |
| Model Resolution Priority Chain | `src/app/api/chat/resolve-context.ts` → resolveModel() |
| Tool Filtering (allowedTools) | `src/app/api/chat/build-tools.ts` |
| Quicktask Rendering | `src/config/prompts.ts` → Quicktask-Modus |
| System Prompt Architektur (6 Layer Detail) | `docs/system/system-prompt-architektur.md` |
| Expert Admin-UI | `src/components/admin/` → ExpertsAdmin |
