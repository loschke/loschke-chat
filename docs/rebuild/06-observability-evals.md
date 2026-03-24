# 06 — Observability & Evals

## Ausgangslage: Blind in Production

Aktuell gibt es kein Tracing, kein Monitoring und keine Qualitätsmessung:

- LLM-Calls: Keine Sichtbarkeit auf Latenz, Token-Verbrauch pro Step, Error Rates
- Tool-Executions: Kein Tracking ob Tools erfolgreich laufen oder still fehlschlagen
- Workflows: Kein Tracing der onFinish-Steps (fire-and-forget = unsichtbar)
- Agent-Verhalten: Keine Messung ob Prompt-Änderungen die Output-Qualität verbessern
- Debugging: console.log in Serverless Functions (Vercel) → schwer zugänglich

---

## OpenTelemetry Setup mit Mastra

Mastra hat Built-in Observability über OpenTelemetry:

```typescript
// src/mastra/index.ts
import { Mastra } from '@mastra/core'

export const mastra = new Mastra({
  agents: { ... },
  tools: { ... },
  workflows: { ... },

  observability: {
    enabled: true,
    serviceName: 'loschke-chat',

    // Exporter: Langfuse (empfohlen)
    exporter: {
      type: 'langfuse',
      config: {
        publicKey: process.env.LANGFUSE_PUBLIC_KEY,
        secretKey: process.env.LANGFUSE_SECRET_KEY,
        baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
      },
    },

    // Sampling (Production)
    sampling: {
      rate: 0.1, // 10% der Requests tracen (Production)
      // rate: 1.0, // 100% in Development
    },

    // Serialization (Production)
    serialization: {
      maxStringLength: 256,
      maxDepth: 3,
      maxArrayLength: 10,
      maxObjectKeys: 20,
    },
  },
})
```

### Was automatisch getract wird

| Event | Details |
|-------|---------|
| **LLM Call** | Model, Prompt, Completion, Tokens (Input/Output/Cached), Latenz, Temperature |
| **Tool Call** | Tool Name, Input, Output, Duration, Success/Error |
| **Agent Run** | Agent ID, Instructions Length, Tool Calls Count, Total Duration |
| **Workflow Step** | Step Name, Input, Output, Duration, Retry Count, Error |
| **Memory Operation** | Type (Search/Save), Duration, Results Count |
| **RAG Query** | Query, TopK, Results Count, Min Score |

### Serverless Flush

In Vercel Serverless Functions muss der Trace-Buffer am Ende geflusht werden:

```typescript
// In jeder API Route oder im Workflow-Cleanup
const observability = mastra.getObservability()
await observability?.flush()
```

**Integration in onFinish Workflow:**

```typescript
step('flush-traces', {
  execute: async () => {
    const obs = mastra.getObservability()
    await obs?.flush()
  },
  always: true, // Immer ausführen
})
```

---

## Exporter: Langfuse (Empfehlung)

### Warum Langfuse?

| Kriterium | Langfuse | Datadog | New Relic |
|-----------|----------|---------|-----------|
| **Kosten** | Gratis Tier (50k Traces/Monat) | Teuer | Teuer |
| **LLM-Fokus** | Ja (Prompt Playground, Token Analytics) | Generisch | Generisch |
| **Self-Host** | Möglich (Docker) | Nein | Nein |
| **Solo-Team** | Ideal | Overkill | Overkill |
| **Mastra Support** | Native Exporter | Über OTLP | Über OTLP |

**Langfuse bietet:**
- Prompt Management & Versioning
- Token Cost Tracking pro Model
- Latency Analytics
- User-Level Tracking
- Evaluation Scores Integration
- Prompt Playground (A/B Testing)

### Setup

```bash
# .env
LANGFUSE_PUBLIC_KEY=pk-...
LANGFUSE_SECRET_KEY=sk-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com  # oder self-hosted URL
```

### Environment-spezifische Config

```typescript
const observabilityConfig = {
  development: {
    sampling: { rate: 1.0 }, // Alles tracen
    serialization: { maxStringLength: 1024 }, // Mehr Detail
  },
  production: {
    sampling: { rate: 0.1 }, // 10% Sampling
    serialization: { maxStringLength: 256 }, // Kompakt
  },
}
```

---

## Sensitive Data Filtering

Mastra bietet `SensitiveDataFilter` für automatische PII-Redaktion in Traces:

```typescript
observability: {
  processors: [
    new SensitiveDataFilter({
      // Patterns die in Traces redaktiert werden
      patterns: [
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
        /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Kreditkarte
        /\bDE\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{2}\b/g, // IBAN
      ],
      replacement: '[REDACTED]',
    }),
  ],
}
```

**Wichtig für Business Mode:** Wenn Business Mode aktiv ist, dürfen keine PII in Traces landen. Der SensitiveDataFilter ergänzt unseren bestehenden PII-Detektor in `src/lib/pii/`.

---

## Eval-Framework

### Was sind Evals?

Systematische Bewertung der Agent-Output-Qualität. Statt "fühlt sich gut an" → messbare Scores.

### Scorer-Typen

```typescript
// src/mastra/evals/scorers.ts
import { createScorer } from '@mastra/evals'

// 1. Textuelle Scorer: Ist die Antwort relevant?
export const relevanceScorer = createScorer({
  id: 'relevance',
  type: 'textual',
  description: 'Bewertet ob die Antwort zur Frage passt',
  model: gateway('anthropic/claude-haiku-3-5'),
  prompt: `Bewerte auf einer Skala von 0-1 wie relevant die Antwort zur Frage ist.
    Frage: {{input}}
    Antwort: {{output}}
    Score (0-1):`,
})

// 2. Klassifikations-Scorer: Enthält die Antwort Halluzinationen?
export const hallucinationScorer = createScorer({
  id: 'hallucination',
  type: 'classification',
  description: 'Prüft auf Halluzinationen',
  model: gateway('anthropic/claude-haiku-3-5'),
  categories: ['none', 'minor', 'major'],
})

// 3. Rule-based Scorer: Formatierung korrekt?
export const formatScorer = createScorer({
  id: 'format',
  type: 'rule',
  evaluate: (input, output) => {
    const hasHeadings = /^#{1,3}\s/m.test(output)
    const hasLists = /^[-*]\s/m.test(output)
    const length = output.length

    return {
      score: (hasHeadings ? 0.3 : 0) + (hasLists ? 0.3 : 0) + (length > 200 ? 0.4 : 0.2),
    }
  },
})

// 4. Tool-Usage Scorer: Nutzt der Agent die richtigen Tools?
export const toolUsageScorer = createScorer({
  id: 'tool-usage',
  type: 'rule',
  evaluate: (input, output, metadata) => {
    const toolCalls = metadata.toolCalls || []
    const hasArtifact = toolCalls.some(t => t.name === 'create_artifact')
    const hasWebSearch = toolCalls.some(t => t.name === 'web_search')

    // Score basierend auf erwarteten Tool-Nutzung
    return { score: hasArtifact ? 1.0 : 0.5 }
  },
})
```

### Live Evaluations (Background Scoring)

```typescript
// Mastra Agent mit Scorers
const agent = new Agent({
  scorers: [relevanceScorer, formatScorer],

  // Sampling Rate für Evals (nicht jede Antwort bewerten)
  evalSampling: 0.05, // 5% der Antworten
})
```

Ergebnisse werden automatisch in `mastra_scorers` Tabelle gespeichert.

### Trace Evaluations (Retrospektiv)

Historische Agent-Runs nachträglich bewerten:

```typescript
// Batch-Evaluation von gespeicherten Traces
await mastra.evaluateTraces({
  scorers: [relevanceScorer, hallucinationScorer],
  filter: {
    agentId: 'writer',
    dateRange: { from: '2026-03-01', to: '2026-03-24' },
  },
})
```

### Trend-Analyse

Langfuse Dashboard zeigt:
- Score-Trends über Zeit (wird Output besser/schlechter?)
- Score-Verteilung pro Agent
- Korrelation: Welche Prompt-Änderungen verbessern Scores?
- Alert: Score fällt unter Threshold

---

## Mastra Studio (Lokale Entwicklung)

### Was ist Studio?

Lokales Dev-UI auf `http://localhost:4111/`:

- **Agent Chat:** Agents interaktiv testen mit Temperature/TopP Adjustments
- **Workflow Visualisierung:** Graph-Darstellung der Workflow-Steps
- **Tool Testing:** Tools isoliert ausführen
- **Observability Tab:** Real-Time Traces
- **Test Cases:** CSV/JSON Import, Ground-Truth Definitionen

### Setup

```bash
# In package.json
{
  "scripts": {
    "mastra:studio": "mastra studio"
  }
}
```

```bash
pnpm mastra:studio
# → http://localhost:4111/
# → Swagger API: http://localhost:4111/swagger-ui
```

### Nutzen für Entwicklung

| Feature | Nutzen |
|---------|--------|
| Agent Chat | Prompt-Änderungen sofort testen ohne Frontend |
| Workflow Graph | Visuell sehen welcher Step hängt/fehlschlägt |
| Tool Testing | Tools isoliert debuggen (z.B. web_search mit echtem API Call) |
| Traces | Sofort sehen: Token-Verbrauch, Latenz, Tool-Calls |
| Test Cases | Regression-Tests für Agent-Antworten |

---

## ENV-Variablen

```bash
# Observability (Optional — graceful degradation wenn nicht gesetzt)
LANGFUSE_PUBLIC_KEY=pk-...
LANGFUSE_SECRET_KEY=sk-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com

# Eval Model (für LLM-basierte Scorer)
# Nutzt AI Gateway — kein separater Key nötig
```

---

## Migration Checklist

### Phase 1 (Basis-Tracing)
- [ ] Mastra Observability aktivieren
- [ ] Langfuse Account erstellen + Keys konfigurieren
- [ ] SensitiveDataFilter konfigurieren
- [ ] Trace Flush in Serverless Routes
- [ ] Sampling Rate: 100% Dev, 10% Prod
- [ ] Verify: Traces in Langfuse Dashboard sichtbar

### Phase 4 (Evals)
- [ ] Relevance Scorer definieren
- [ ] Format Scorer definieren (Rule-based)
- [ ] Hallucination Scorer definieren
- [ ] Tool Usage Scorer definieren
- [ ] Live Eval Sampling konfigurieren (5%)
- [ ] Langfuse Dashboard für Score-Trends einrichten
- [ ] Mastra Studio lokal einrichten
- [ ] Test Cases für kritische Agent-Szenarien erstellen

---

## Altsystem-Referenzen

Für die Umsetzung dieses Dokuments:

| Thema | Quelle |
|-------|--------|
| PII Detection (Business Mode) | `src/lib/pii/` — 9 Entity Types, Regex Patterns |
| Usage Logging (Token-Tracking) | `src/lib/db/queries/` → logUsage() |
| Credit Calculation Formula | `docs/system/technical-architecture.md` → Credit System |
| Feature Flag für Observability | `src/config/features.ts` — Neues Flag hinzufügen |
| ENV-Variable Pattern | `.env.example` + `docs/system/feature-flags-konfiguration.md` |
| Serverless Route Pattern | `src/app/api/CLAUDE.md` → Route Patterns |
