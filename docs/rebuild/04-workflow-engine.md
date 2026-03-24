# 04 — Workflow Engine

## Warum Workflows der größte Einzelgewinn sind

Der onFinish-Flow in `src/app/api/chat/persist.ts` ist der fragilste Teil der aktuellen Architektur:

- 8+ Steps sequentiell ausgeführt
- 4 davon fire-and-forget (Title, Suggestions, Memory, Expert Metadata)
- Kein Retry bei Fehlern
- Kein Rollback bei Teil-Failures
- Error Handling: `catch()` + console.log, weiter machen
- Neue Steps erfordern Modifikation der Core-Route

Mastra's Workflow Engine (XState-basiert) löst alle diese Probleme.

---

## onFinish als Mastra Workflow

### Heute: Imperativ in persist.ts

```typescript
// src/app/api/chat/persist.ts (vereinfacht)
export async function onFinish(result, config) {
  try {
    // Step 1: R2 File Persist (awaited)
    const processedParts = await persistFilesToR2(result.parts)

    // Step 2: Collect response parts (sync)
    const responseParts = collectResponseParts(result)

    // Step 3: Fake artifact detection (sync)
    detectFakeArtifacts(responseParts)

    // Step 4: Save messages + usage (awaited, parallel)
    await Promise.all([
      saveMessages(config.chatId, processedParts, responseParts),
      logUsage(result.usage, config),
    ])

    // Step 5: Title generation (fire-and-forget!)
    generateTitle(config.chatId).catch(console.error)

    // Step 6: Credit deduction (awaited, atomic)
    await deductCredits(config.userId, result.usage)

    // Step 7: Suggested replies (fire-and-forget!)
    generateSuggestions(config.chatId).catch(console.error)

    // Step 8: Memory extraction (fire-and-forget!)
    extractMemory(config.chatId, config.userId).catch(console.error)
  } finally {
    // MCP cleanup
    await cleanupMcpConnections()
  }
}
```

### Mit Mastra: Deklarativer Workflow

```typescript
// src/mastra/workflows/on-finish.ts
import { Workflow } from '@mastra/core'

export const onFinishWorkflow = new Workflow({
  id: 'on-finish',
  description: 'Post-Chat Persistence und Side Effects',

  steps: [
    // Step 1: R2 File Persist
    step('persist-files', {
      execute: async ({ input }) => {
        return await persistFilesToR2(input.result.parts)
      },
      retry: { maxAttempts: 2, delay: 1000 },
    }),

    // Step 2+3: Response Assembly + Fake Artifact Detection
    step('assemble-response', {
      execute: async ({ input, previousResult }) => {
        const responseParts = collectResponseParts(input.result)
        const artifacts = detectFakeArtifacts(responseParts)
        return { responseParts, processedParts: previousResult, artifacts }
      },
    }),

    // Step 4: Messages + Usage (parallel)
    parallel('save-data', [
      step('save-messages', {
        execute: async ({ input, context }) => {
          await saveMessages(context.chatId, input.processedParts, input.responseParts)
        },
        retry: { maxAttempts: 3, delay: 500 },
      }),
      step('log-usage', {
        execute: async ({ input, context }) => {
          await logUsage(input.result.usage, context)
        },
        retry: { maxAttempts: 3, delay: 500 },
      }),
    ]),

    // Step 5: Credit Deduction (atomic, must succeed)
    step('deduct-credits', {
      execute: async ({ input, context }) => {
        await deductCredits(context.userId, input.result.usage)
      },
      retry: { maxAttempts: 3, delay: 1000 },
      onError: 'log-and-alert', // Credits-Fehler sind kritisch
    }),

    // Step 6-8: Side Effects (parallel, non-critical)
    parallel('side-effects', [
      step('generate-title', {
        execute: async ({ context }) => {
          await generateTitle(context.chatId)
        },
        retry: { maxAttempts: 2, delay: 2000 },
        optional: true, // Fehler blockiert nicht den Workflow
      }),
      step('suggested-replies', {
        execute: async ({ context }) => {
          await generateSuggestions(context.chatId)
        },
        retry: { maxAttempts: 2, delay: 2000 },
        optional: true,
      }),
      step('extract-memory', {
        execute: async ({ context }) => {
          if (context.messageCount >= 6) {
            await extractMemory(context.chatId, context.userId)
          }
        },
        retry: { maxAttempts: 2, delay: 2000 },
        optional: true,
      }),
    ]),

    // Final: MCP Cleanup
    step('cleanup', {
      execute: async ({ context }) => {
        await cleanupMcpConnections(context.mcpClients)
      },
      always: true, // Läuft immer, auch bei vorherigen Fehlern
    }),
  ],
})
```

### Verbesserungen gegenüber heute

| Aspekt | persist.ts (heute) | Mastra Workflow |
|--------|-------------------|-----------------|
| **Retry** | Keins | Pro Step konfigurierbar |
| **Error Handling** | catch + console.log | onError Handler, optional Steps |
| **Parallelität** | Manual Promise.all | Deklarativ mit `parallel()` |
| **Sichtbarkeit** | console.log | OpenTelemetry Traces pro Step |
| **Testbarkeit** | Nur als Ganzes | Jeder Step isoliert testbar |
| **Erweiterbarkeit** | Code ändern | Step hinzufügen |
| **Rollback** | Nicht möglich | Compensation Steps möglich |

---

## Context Resolution als Workflow

### Heute: resolve-context.ts

Phase A (parallel):
- getChatById, getUserPreferences, discoverSkills, getModels, getMcpServers

Phase B (sequential):
- Expert Resolution → Model Resolution → Temperature → Memory Search → System Prompt

### Als Workflow

```typescript
// src/mastra/workflows/context-resolution.ts
export const contextResolutionWorkflow = new Workflow({
  id: 'context-resolution',

  steps: [
    // Phase A: Parallel Data Loading
    parallel('load-data', [
      step('load-chat', {
        execute: async ({ context }) => getChatById(context.chatId),
      }),
      step('load-preferences', {
        execute: async ({ context }) => getUserPreferences(context.userId),
      }),
      step('load-skills', {
        execute: async () => discoverSkills(),
      }),
      step('load-models', {
        execute: async () => getModels(),
      }),
      step('load-mcp', {
        execute: async () => getMcpServers(),
      }),
    ]),

    // Phase B: Sequential Resolution
    step('resolve-expert', {
      execute: async ({ input, previousResults }) => {
        const chat = previousResults['load-chat']
        const requestExpert = input.expertSlug
        return resolveExpert(requestExpert, chat?.expertId)
      },
    }),

    step('resolve-model', {
      execute: async ({ previousResults }) => {
        const expert = previousResults['resolve-expert']
        const prefs = previousResults['load-preferences']
        return resolveModel(expert, prefs)
      },
    }),

    step('search-memory', {
      execute: async ({ context, previousResults }) => {
        const prefs = previousResults['load-preferences']
        if (context.isNewChat && prefs?.memoryEnabled) {
          return await searchMemoryWithTimeout(context.userId, 3000)
        }
        return null
      },
      optional: true,
    }),

    step('build-prompt', {
      execute: async ({ previousResults }) => {
        return buildSystemPrompt({
          expert: previousResults['resolve-expert'],
          skills: previousResults['load-skills'],
          memory: previousResults['search-memory'],
          preferences: previousResults['load-preferences'],
        })
      },
    }),
  ],
})
```

**Vorteil:** Jeder Step ist traceable. Wenn Memory Search 3s dauert, sieht man das im Trace. Wenn Expert Resolution fehlschlägt, gibt es einen klaren Error statt eines Default-Fallbacks ohne Logging.

---

## Error Handling & Retry-Strategien

### Kritische Steps (müssen erfolgreich sein)

| Step | Retry | Strategie |
|------|-------|-----------|
| save-messages | 3x, 500ms delay | Ohne Messages ist der Chat verloren |
| log-usage | 3x, 500ms delay | Usage-Tracking für Credits |
| deduct-credits | 3x, 1000ms delay | Atomic Transaction, Alert bei Failure |

### Optionale Steps (dürfen fehlschlagen)

| Step | Retry | Strategie |
|------|-------|-----------|
| generate-title | 2x, 2000ms delay | Fallback: Chat bleibt "Neuer Chat" |
| suggested-replies | 2x, 2000ms delay | Fallback: Keine Vorschläge angezeigt |
| extract-memory | 2x, 2000ms delay | Fallback: Memory nicht aktualisiert |
| persist-files | 2x, 1000ms delay | Fallback: Data-URLs bleiben (wie heute) |

### Error Alerting

```typescript
// Kritische Fehler → Logging Service
step('deduct-credits', {
  onError: async (error, context) => {
    await logCriticalError({
      workflow: 'on-finish',
      step: 'deduct-credits',
      userId: context.userId,
      chatId: context.chatId,
      error: error.message,
    })
  },
})
```

---

## Suspend/Resume für Human-in-the-Loop

Mastra Workflows können **pausiert** werden und auf externes Input warten:

```typescript
step('review-content', {
  execute: async ({ input, suspend }) => {
    if (input.requiresApproval) {
      // Workflow pausiert hier
      const approval = await suspend({
        reason: 'Content needs human review',
        data: { content: input.content },
      })
      return approval.decision
    }
    return 'auto-approved'
  },
})
```

**Für uns relevant in Phase 2+:**
- Business Mode: PII Detection → Suspend → User entscheidet (Edit/Mask/Route/Send)
- Artifact Review: Agent erstellt → Suspend → User prüft → Feedback Loop
- Multi-Step Workflows: Agent recherchiert → Suspend → User bestätigt Richtung

---

## Quicktask als Workflow

```typescript
// src/mastra/workflows/quicktask.ts
export const quicktaskWorkflow = new Workflow({
  id: 'quicktask-execution',

  steps: [
    step('load-skill', {
      execute: async ({ input }) => {
        const skill = await getSkillBySlug(input.skillSlug)
        if (!skill) throw new Error(`Skill ${input.skillSlug} not found`)
        return skill
      },
    }),

    step('render-template', {
      execute: async ({ input, previousResult }) => {
        const skill = previousResult
        const rendered = renderTemplate(skill.content, input.fields)
        return {
          prompt: rendered,
          temperature: skill.temperature,
          modelId: skill.modelId,
          outputAsArtifact: skill.outputAsArtifact,
        }
      },
    }),

    step('generate', {
      execute: async ({ input, previousResult, context }) => {
        const agent = await resolveAgent(context.expertSlug)
        const result = await agent.generate(previousResult.prompt, {
          temperature: previousResult.temperature,
          model: previousResult.modelId
            ? gateway(previousResult.modelId)
            : undefined,
        })
        return result
      },
    }),

    // Conditional: Als Artifact speichern
    step('save-artifact', {
      when: ({ previousResults }) =>
        previousResults['render-template'].outputAsArtifact,
      execute: async ({ previousResult, context }) => {
        return await saveArtifact({
          chatId: context.chatId,
          type: 'markdown',
          content: previousResult.text,
        })
      },
    }),
  ],
})
```

---

## Integration in Chat Route

### Heute

```typescript
// route.ts
const result = streamText({
  model,
  messages,
  tools,
  onFinish: (result) => onFinishPersist(result, config),
})
```

### Mit Mastra

```typescript
// route.ts (dünn)
const agent = await resolveAgent(expertSlug)

const result = agent.stream(messages, {
  context: { chatId, userId, isNewChat },
  onFinish: async (result) => {
    await onFinishWorkflow.execute({
      input: { result },
      context: { chatId, userId, messageCount, mcpClients },
    })
  },
})
```

Die Route wird zum Thin Layer: Auth → Agent Resolution → Stream → Workflow.

---

## Migration Checklist

- [ ] onFinish Workflow definieren mit allen 8+ Steps
- [ ] Context Resolution Workflow definieren
- [ ] Retry-Policies pro Step konfigurieren
- [ ] Error Alerting für kritische Steps (Credits, Messages)
- [ ] Optional-Flag für non-critical Steps (Title, Suggestions, Memory)
- [ ] Quicktask Workflow definieren
- [ ] Workflow-Integration in route.ts
- [ ] Tests: onFinish Workflow mit simulierten Fehlern
- [ ] Tests: Retry-Logik funktioniert korrekt
- [ ] Tests: Parallel Steps laufen tatsächlich parallel
- [ ] Observability: Workflow-Traces in Langfuse sichtbar

---

## Altsystem-Referenzen

Für die Umsetzung dieses Dokuments:

| Thema | Quelle |
|-------|--------|
| Kompletter onFinish-Flow (alle Steps) | `src/app/api/chat/persist.ts` — Die Datei die durch den Workflow ersetzt wird |
| R2 File Persist (data-URL → R2) | `src/app/api/chat/persist.ts` → persistFilesToR2() + `src/lib/storage/` |
| Response Parts Collection | `src/app/api/chat/persist.ts` → collectResponseParts() |
| Fake Artifact Detection (Regex) | `src/app/api/chat/persist.ts` → detectFakeArtifacts() |
| Message Save (User + Assistant) | `src/lib/db/queries/` → saveMessage(), saveMessages() |
| Usage Logging (Token-Aufschlüsselung) | `src/lib/db/queries/` → logUsage() |
| Title Generation (Prompt + Model) | `src/app/api/chat/persist.ts` → generateTitle() |
| Credit Deduction (Atomic Transaction) | `src/lib/db/queries/` → deductCredits() — db.transaction() Pattern |
| Suggested Replies Generation | `src/app/api/chat/persist.ts` → generateSuggestions() |
| Memory Extraction (Mem0) | `src/app/api/chat/persist.ts` → extractMemory() + `src/lib/memory/` |
| MCP Cleanup | `src/app/api/chat/persist.ts` → finally Block |
| Context Resolution (Phase A+B) | `src/app/api/chat/resolve-context.ts` — Parallel + Sequential Phases |
| Chat Route Architektur | `src/app/api/CLAUDE.md` → Chat Route Section |
| Quicktask Execution Flow | `src/config/prompts.ts` → Quicktask Template Rendering |
