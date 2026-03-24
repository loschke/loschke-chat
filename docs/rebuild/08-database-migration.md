# 08 — Database Migration

## Grundsatz: Erweitern, nicht ersetzen

Das bestehende Schema (13 Tabellen) bleibt. Mastra bringt eigene Tabellen mit und benötigt eine Extension (pgvector). Keine Breaking Changes an bestehenden Tabellen.

---

## Bestehende Tabellen (bleiben)

| Tabelle | Status | Anmerkungen |
|---------|--------|-------------|
| `users` | Unverändert | creditsBalance, memoryEnabled, customInstructions |
| `chats` | Unverändert | expertId bleibt (auch wenn Backend "Agent" nutzt) |
| `messages` | Unverändert | parts jsonb, metadata jsonb |
| `artifacts` | Unverändert | type, content, version |
| `experts` | Unverändert | Bleibt als Agent-Config-Tabelle |
| `skills` | Unverändert | mode, fields, content |
| `models` | Unverändert | inputPrice, outputPrice, capabilities |
| `mcp_servers` | Unverändert | url, transport, headers, enabledTools |
| `projects` | Unverändert | instructions, defaultExpertId |
| `project_documents` | Unverändert | title, content |
| `usage_logs` | Unverändert | Token tracking |
| `credit_transactions` | Unverändert | Atomic mit Balance |
| `consent_logs` | Unverändert | DSGVO Audit Trail |

---

## Neue Tabellen

### 1. `mastra_memories` (Phase 3)

Ersetzt Mem0 Cloud Storage. Speichert extrahierte User-Memories lokal.

```sql
CREATE TABLE mastra_memories (
  id TEXT PRIMARY KEY,                    -- nanoid
  user_id TEXT NOT NULL,                  -- Logto sub
  thread_id TEXT,                         -- Optional: Chat-Bezug
  content TEXT NOT NULL,                  -- Memory-Inhalt
  type TEXT NOT NULL DEFAULT 'semantic',  -- semantic | working | observation
  metadata JSONB,                         -- Zusätzliche Infos
  embedding vector(1536),                 -- Für Semantic Recall
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indices
CREATE INDEX idx_memories_user ON mastra_memories(user_id);
CREATE INDEX idx_memories_thread ON mastra_memories(thread_id);
CREATE INDEX idx_memories_embedding ON mastra_memories
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### 2. `document_embeddings` (Phase 3)

Für RAG Pipeline — Project Documents und optional Skills als Vektoren.

```sql
CREATE TABLE document_embeddings (
  id TEXT PRIMARY KEY,                    -- nanoid
  source_id TEXT NOT NULL,                -- project_document.id oder skill.id
  source_type TEXT NOT NULL,              -- 'project_document' | 'skill'
  chunk_index INTEGER NOT NULL,           -- Position im Dokument
  content TEXT NOT NULL,                  -- Chunk-Inhalt
  embedding vector(1536),                 -- text-embedding-3-small
  metadata JSONB,                         -- title, projectId, etc.
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indices
CREATE INDEX idx_embeddings_source ON document_embeddings(source_id, source_type);
CREATE INDEX idx_embeddings_vector ON document_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### 3. `mastra_scorers` (Phase 4)

Eval-Ergebnisse für Agent-Output-Qualität.

```sql
CREATE TABLE mastra_scorers (
  id TEXT PRIMARY KEY,                    -- nanoid
  agent_id TEXT NOT NULL,                 -- Agent/Expert Slug
  scorer_id TEXT NOT NULL,                -- z.B. 'relevance', 'format'
  trace_id TEXT,                          -- OpenTelemetry Trace ID
  chat_id TEXT,                           -- Bezug zum Chat
  score REAL NOT NULL,                    -- 0.0 - 1.0
  metadata JSONB,                         -- Input, Output, Reasoning
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indices
CREATE INDEX idx_scorers_agent ON mastra_scorers(agent_id);
CREATE INDEX idx_scorers_scorer ON mastra_scorers(scorer_id);
CREATE INDEX idx_scorers_date ON mastra_scorers(created_at);
```

### 4. `workflow_runs` (Phase 2, Optional)

Wenn wir Workflow-Runs persistent tracken wollen (zusätzlich zu Langfuse Traces):

```sql
CREATE TABLE workflow_runs (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,              -- 'on-finish', 'context-resolution'
  chat_id TEXT,
  user_id TEXT,
  status TEXT NOT NULL,                   -- 'running' | 'completed' | 'failed' | 'suspended'
  steps JSONB,                            -- Step-Results und Timings
  error TEXT,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX idx_workflow_runs_status ON workflow_runs(status);
CREATE INDEX idx_workflow_runs_workflow ON workflow_runs(workflow_id);
```

---

## pgvector Extension

### Aktivierung auf Neon

Neon unterstützt pgvector nativ. Aktivierung über SQL:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Drizzle ORM Integration

```typescript
// src/lib/db/schema/embeddings.ts
import { pgTable, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core'
import { vector } from 'drizzle-orm/pg-core' // pgvector Support

export const documentEmbeddings = pgTable('document_embeddings', {
  id: text('id').primaryKey(),
  sourceId: text('source_id').notNull(),
  sourceType: text('source_type').notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  content: text('content').notNull(),
  embedding: vector('embedding', { dimensions: 1536 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
})
```

**Hinweis:** Drizzle ORM pgvector Support muss verifiziert werden. Wenn Drizzle pgvector nicht nativ unterstützt, nutzen wir raw SQL für Embedding-Queries.

---

## Schema-Änderungen an bestehenden Tabellen

### experts Tabelle (Optional, Phase 4)

Wenn Eval-Scores pro Expert angezeigt werden sollen:

```sql
-- Keine Schema-Änderung nötig
-- Scores kommen aus mastra_scorers über JOIN:
-- SELECT e.*, AVG(s.score) as avg_score
-- FROM experts e LEFT JOIN mastra_scorers s ON e.slug = s.agent_id
-- GROUP BY e.id
```

### project_documents Tabelle (Phase 3)

Tracking ob ein Document bereits embeddet wurde:

```sql
ALTER TABLE project_documents
  ADD COLUMN embedding_status TEXT DEFAULT 'pending',  -- pending | indexed | failed
  ADD COLUMN embedded_at TIMESTAMP;
```

### users Tabelle (Phase 3)

Memory-Quelle aktualisieren (Mem0 → Mastra):

```
-- Keine Schema-Änderung nötig
-- memoryEnabled Boolean bleibt
-- Intern wechselt nur der Provider (Mem0 → Mastra Memory)
```

---

## Migration-Strategie

### Phase 1: Keine DB-Änderungen

Mastra nutzt bestehende Tabellen. Agents lesen aus `experts`, Tools schreiben in `artifacts`, Messages bleiben in `messages`.

### Phase 2: workflow_runs (Optional)

```bash
pnpm db:generate  # Migration für workflow_runs generieren
pnpm db:migrate   # In Production
```

### Phase 3: pgvector + Memory + Embeddings

```bash
# 1. pgvector Extension aktivieren (einmalig, manuell in Neon Console)
CREATE EXTENSION IF NOT EXISTS vector;

# 2. Neue Tabellen
pnpm db:generate  # Migrations für mastra_memories, document_embeddings
pnpm db:migrate

# 3. project_documents erweitern
pnpm db:generate  # Migration für embedding_status Column
pnpm db:migrate

# 4. Bestehende Dokumente embedden
pnpm db:seed:embeddings  # Custom Script für Initial-Ingestion
```

### Phase 4: Scorers

```bash
pnpm db:generate  # Migration für mastra_scorers
pnpm db:migrate
```

---

## Seeding-Anpassungen

### Bestehende Seeds (bleiben)

- `seeds/experts/*.md` → experts Tabelle
- `seeds/skills/*.md` → skills Tabelle
- `seeds/models/*.md` → models Tabelle
- `seeds/mcp-servers/*.md` → mcp_servers Tabelle

### Neue Seeds

```
seeds/
├── experts/         # Unverändert
├── skills/          # Unverändert
├── models/          # Unverändert
├── mcp-servers/     # Unverändert
└── evals/           # NEU: Scorer-Definitionen (Phase 4)
    ├── relevance.md
    ├── format.md
    └── hallucination.md
```

**Scorer Seeds sind optional** — Scorer können auch im Code definiert sein (wie in 06-observability-evals beschrieben).

---

## Daten-Migration (Mem0 → Mastra Memory)

### Export aus Mem0

```typescript
// scripts/migrate-memories.ts
import { mem0Client } from '../src/lib/memory/mem0-client'

// Alle User-IDs aus DB laden
const users = await db.select({ id: usersTable.id }).from(usersTable)

for (const user of users) {
  // Mem0 Memories exportieren
  const memories = await mem0Client.getAll({ user_id: user.id })

  // In mastra_memories importieren
  for (const memory of memories) {
    await db.insert(mastraMemories).values({
      id: nanoid(),
      userId: user.id,
      content: memory.memory,
      type: 'semantic',
      metadata: { source: 'mem0', originalId: memory.id },
      createdAt: new Date(memory.created_at),
    })
  }
}
```

### Embeddings generieren

```typescript
// Nach Import: Embeddings für migrated Memories generieren
const memories = await db.select().from(mastraMemories).where(isNull(mastraMemories.embedding))

for (const batch of chunk(memories, 100)) {
  const embeddings = await embed({
    model: 'openai/text-embedding-3-small',
    values: batch.map(m => m.content),
  })

  for (let i = 0; i < batch.length; i++) {
    await db.update(mastraMemories)
      .set({ embedding: embeddings[i] })
      .where(eq(mastraMemories.id, batch[i].id))
  }
}
```

---

## Backup-Strategie

Vor jeder Migration-Phase:

```bash
# Neon Point-in-Time Recovery ist automatisch aktiv
# Zusätzlich: Manueller Snapshot vor großen Migrationen
# → Neon Console → Branch → Create Snapshot
```

---

## Migration Checklist

### Phase 1 (Keine DB-Änderungen)
- [ ] Verify: Mastra Agents können aus bestehenden Tabellen lesen

### Phase 2 (Optional: workflow_runs)
- [ ] workflow_runs Schema in Drizzle definieren
- [ ] Migration generieren und testen
- [ ] Index-Performance prüfen

### Phase 3 (pgvector + Memory + RAG)
- [ ] pgvector Extension auf Neon aktivieren
- [ ] Drizzle pgvector Support prüfen (ggf. raw SQL)
- [ ] mastra_memories Schema + Migration
- [ ] document_embeddings Schema + Migration
- [ ] project_documents.embedding_status Column
- [ ] Mem0 → mastra_memories Migration Script
- [ ] Embedding-Generierung für migrierte Memories
- [ ] Initial Document Ingestion Script
- [ ] Performance: Embedding Index tunen (lists Parameter)

### Phase 4 (Evals)
- [ ] mastra_scorers Schema + Migration
- [ ] Score-Aggregation Queries (AVG pro Agent)

---

## Altsystem-Referenzen

Für die Umsetzung dieses Dokuments:

| Thema | Quelle |
|-------|--------|
| Komplettes DB-Schema (13 Tabellen) | `src/lib/db/schema/` — Alle Table Definitions |
| DB-Konventionen (nanoid, jsonb, etc.) | `src/lib/db/CLAUDE.md` |
| Query-Pattern + userId-Scoping | `src/lib/db/queries/` — Alle Query Functions |
| Drizzle ORM Config | `drizzle.config.ts` + `src/lib/db/index.ts` |
| Migration Workflow | `src/lib/db/CLAUDE.md` → "Migrations" |
| Seeding Pattern (Markdown → DB) | `src/lib/db/seed.ts` + `seeds/` Ordner |
| Cache Pattern (TTL 60s) | `src/lib/db/CLAUDE.md` → "Cache Pattern" |
| Credit Transaction (Atomic) | `src/lib/db/queries/` → deductCredits() |
| Mem0 API (für Export-Script) | `src/lib/memory/mem0-client.ts` |
| Neon Serverless Config | `src/lib/db/index.ts` → Connection Setup |
