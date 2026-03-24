# 05 — Memory & RAG

## Mem0 → Mastra Memory Migration

### Heute: Mem0 Cloud (Extern)

**Architektur:**
- Mem0 Cloud SDK (`mem0ai`) als externer SaaS-Dienst
- Lazy Loading (SDK erst bei erstem Aufruf geladen)
- Circuit Breaker: 5 Failures → 5 Minuten Cooldown
- 8 Sekunden Timeout pro Operation
- Memory Search: Automatisch bei neuem Chat (3s Timeout)
- Memory Save: Fire-and-forget in onFinish (min. 6 Messages)
- Token Budget: Max 4000 Zeichen im System Prompt

**Dateien:**
- `src/lib/memory/mem0-client.ts` — SDK Wrapper mit Circuit Breaker
- `src/lib/ai/tools/save-memory.ts` — Tool für explizites Speichern
- `src/lib/ai/tools/recall-memory.ts` — Tool für explizites Abrufen
- `src/app/api/chat/resolve-context.ts` — Automatische Suche bei Chat-Start
- `src/app/api/chat/persist.ts` — Automatische Extraktion nach Chat

**Probleme:**
- Externe SaaS-Dependency (Latenz, Verfügbarkeit, Kosten)
- DSGVO: User-Daten bei US-SaaS-Provider
- Kein Fallback wenn Mem0 down ist (Circuit Breaker = Feature aus)
- Fire-and-forget Save → Daten können verloren gehen
- Keine Kontrolle über Speicher-Algorithmus

### Mit Mastra: Built-in Memory (Eigene DB)

Mastra bietet drei Memory-Typen:

#### 1. Thread Memory (Konversations-Historie)

Ersetzt: Unsere `messages`-Tabelle (teilweise)

```typescript
import { MastraMemory } from '@mastra/memory'
import { PgStorage } from '@mastra/pg'

export const mastraMemory = new MastraMemory({
  storage: new PgStorage({
    connectionString: process.env.DATABASE_URL,
  }),
  // Thread-basierte Konversation
  threadId: (context) => context.chatId,
  userId: (context) => context.userId,
})
```

**Hinweis:** Unsere `messages`-Tabelle bleibt für UI-Darstellung. Mastra Memory ist für den Agent-Context.

#### 2. Working Memory (Session State)

Neu: Strukturierte User-Informationen die der Agent über Sessions hinweg kennt.

```typescript
// Working Memory speichert z.B.:
// - User-Präferenzen die der Agent gelernt hat
// - Laufende Projekt-Kontexte
// - Kommunikationsstil-Präferenzen
```

Ersetzt teilweise: `users.customInstructions` + Mem0 Memories

#### 3. Semantic Recall (Vector-basierte Suche)

Ersetzt: Mem0 Search

```typescript
const memory = new MastraMemory({
  storage: pgStorage,
  // Semantic Recall über vergangene Konversationen
  semanticRecall: {
    enabled: true,
    embedModel: 'openai/text-embedding-3-small',
    topK: 5,
    minScore: 0.7,
  },
})
```

Der Agent sucht automatisch nach relevanten vergangenen Konversationen wenn Semantic Recall aktiviert ist. Keine expliziten `recall_memory` / `save_memory` Tools mehr nötig.

---

## Memory-Migration: Schrittweise

### Phase 1: Mem0 beibehalten

- `save_memory` und `recall_memory` als Mastra Tools definieren
- Mem0 Client bleibt
- Kein Migration-Aufwand

### Phase 3: Mastra Memory

1. **Mastra Memory Setup** mit PgStorage (Neon)
2. **Thread Memory** für Chat-Kontext
3. **Semantic Recall** für automatische Kontext-Anreicherung
4. **Working Memory** für User-Präferenzen
5. **Tools anpassen:** `save_memory` → Mastra Memory API, `recall_memory` → optional (Semantic Recall macht es automatisch)
6. **Mem0 Daten migrieren** (Export → Import in neue Tabellen)
7. **Mem0 SDK entfernen**

### Memory Gates (bleiben)

```typescript
// Alle 3 Bedingungen müssen erfüllt sein:
// 1. Feature Flag: DATABASE_URL gesetzt (statt MEM0_API_KEY)
// 2. User Toggle: memoryEnabled in DB
// 3. Min. Messages: >= 6 für automatische Extraktion
```

---

## RAG Pipeline (Neu)

### Warum RAG?

**Heute:** Project Documents werden komplett als Text in den System Prompt geladen. Bei großen Dokumenten geht Token-Budget verloren. Skills werden über `load_skill` als Volltext geladen.

**Mit RAG:** Dokumente werden in Chunks aufgeteilt, als Vektoren gespeichert und semantisch durchsucht. Nur relevante Abschnitte landen im Context.

### Architektur

```
Document (Project Doc / Skill Content)
    ↓
MDocument.fromText() — Initialisierung
    ↓
chunk() — Recursive Chunking (512 Tokens, 50 Overlap)
    ↓
embed() — text-embedding-3-small (OpenAI)
    ↓
pgvector — Neon PostgreSQL mit pgvector Extension
    ↓
query() — Semantic Search (topK: 5, minScore: 0.7)
    ↓
Context Injection — Relevante Chunks im System Prompt
```

### Implementation

```typescript
// src/mastra/rag/config.ts
import { MDocument, PgVector } from '@mastra/rag'

// Vector Store
export const vectorStore = new PgVector({
  connectionString: process.env.DATABASE_URL,
  tableName: 'document_embeddings',
})

// Document Ingestion
export async function ingestDocument(doc: {
  id: string
  title: string
  content: string
  type: 'project_document' | 'skill'
}) {
  const mdoc = MDocument.fromText(doc.content)

  // Chunking
  const chunks = await mdoc.chunk({
    strategy: 'recursive',
    size: 512,
    overlap: 50,
  })

  // Embedding
  const embeddings = await mdoc.embed({
    model: 'openai/text-embedding-3-small',
    chunks,
  })

  // Store
  await vectorStore.upsert({
    id: doc.id,
    metadata: { title: doc.title, type: doc.type },
    embeddings,
  })
}

// Retrieval
export async function queryDocuments(
  query: string,
  filters?: { type?: string; projectId?: string }
) {
  return vectorStore.query({
    query,
    topK: 5,
    minScore: 0.7,
    filter: filters,
  })
}
```

### pgvector auf Neon

Neon unterstützt pgvector nativ:

```sql
-- Migration: pgvector Extension aktivieren
CREATE EXTENSION IF NOT EXISTS vector;

-- Embeddings-Tabelle
CREATE TABLE document_embeddings (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  embedding vector(1536), -- text-embedding-3-small Dimension
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index für Similarity Search
CREATE INDEX ON document_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

### RAG Use Cases

#### 1. Project Documents (Primär)

**Heute:** `project_documents.content` wird vollständig in Layer 5 des System Prompts injiziert.

**Mit RAG:** Nur relevante Chunks basierend auf der User-Message:

```typescript
// In Agent Instructions (Dynamic)
instructions: async ({ context, messages }) => {
  const lastMessage = messages[messages.length - 1]?.content

  if (context.projectId && lastMessage) {
    const relevantDocs = await queryDocuments(lastMessage, {
      projectId: context.projectId,
    })
    return buildPromptWithRAGContext(expert, relevantDocs)
  }

  return buildPromptWithoutRAG(expert)
}
```

#### 2. Skill Discovery (Optional, Phase 3+)

**Heute:** `load_skill` Tool lädt Skills on-demand als Volltext.

**Mit RAG:** Skills könnten als Embeddings vorliegen. Agent findet relevante Skill-Abschnitte automatisch über Semantic Search.

**Bewertung:** Für Phase 3 evaluieren. Skills sind relativ kurz (< 2000 Tokens) — vollständiges Laden ist oft besser als fragmentierte Chunks.

#### 3. Chat History Search (Optional, Phase 4+)

Vergangene Chat-Messages als Embeddings → "Was haben wir letzte Woche über X besprochen?"

Mastra's Semantic Recall deckt das teilweise ab. Explizite Chat-History-RAG wäre ein Premium-Feature.

---

## DSGVO-Konformität

### Heute (Mem0)

| Aspekt | Status |
|--------|--------|
| Datenspeicherung | US (Mem0 Cloud) |
| Kontrolle | Begrenzt (API-basiert) |
| Löschung | Über Mem0 API möglich |
| Audit Trail | Keiner |
| User Consent | Toggle in User Preferences |

### Mit Mastra Memory

| Aspekt | Status |
|--------|--------|
| Datenspeicherung | EU (Neon Frankfurt) |
| Kontrolle | Voll (eigene DB) |
| Löschung | Direkte DB-Queries |
| Audit Trail | Möglich (consent_logs erweitern) |
| User Consent | Toggle bleibt + DSGVO Export/Delete |

**Konkrete Verbesserungen:**
1. Alle Memory-Daten in eigener Neon DB (EU Region)
2. User kann alle Memories exportieren (DSGVO Art. 20)
3. User kann alle Memories löschen (DSGVO Art. 17)
4. Kein externer SaaS-Provider hat Zugriff auf User-Memories
5. Audit Trail über consent_logs erweiterbar

---

## Memory Tools Anpassung

### Phase 1 (Mem0 bleibt)

```typescript
// save_memory und recall_memory bleiben als Tools
// Nur als Mastra Tool-Format umgeschrieben
export const saveMemoryTool = createTool({
  id: 'save_memory',
  inputSchema: z.object({
    content: z.string().describe('Was gespeichert werden soll'),
  }),
  execute: async ({ context, input }) => {
    await mem0Client.add(input.content, { user_id: context.userId })
    return { saved: true }
  },
})
```

### Phase 3 (Mastra Memory)

```typescript
// save_memory wird optional — Mastra Memory extrahiert automatisch
// recall_memory wird optional — Semantic Recall findet automatisch

// Explizite Tools bleiben als Power-User-Feature:
export const saveMemoryTool = createTool({
  id: 'save_memory',
  execute: async ({ context, input }) => {
    await mastraMemory.save({
      threadId: context.chatId,
      userId: context.userId,
      content: input.content,
    })
    return { saved: true }
  },
})
```

---

## Migration Checklist

### Phase 1 (Memory bleibt Mem0)
- [ ] save_memory als Mastra Tool
- [ ] recall_memory als Mastra Tool
- [ ] Memory Search in Dynamic Instructions integrieren
- [ ] Circuit Breaker Pattern beibehalten

### Phase 3 (Mastra Memory)
- [ ] pgvector Extension auf Neon aktivieren
- [ ] Mastra Memory mit PgStorage konfigurieren
- [ ] Thread Memory für Chat-Kontext
- [ ] Semantic Recall konfigurieren
- [ ] Working Memory für User-Präferenzen
- [ ] Mem0 Daten exportieren und migrieren
- [ ] save_memory / recall_memory auf Mastra Memory umstellen
- [ ] Mem0 SDK entfernen
- [ ] DSGVO: Export-Endpoint für User Memories
- [ ] DSGVO: Delete-Endpoint für User Memories

### Phase 3 (RAG)
- [ ] document_embeddings Tabelle erstellen
- [ ] Ingestion Pipeline für Project Documents
- [ ] Query-Funktion für Semantic Search
- [ ] Integration in Dynamic Instructions (Layer 5)
- [ ] Admin-UI: Re-Ingest Button für Dokumente
- [ ] Tests: Embedding-Qualität validieren
- [ ] Tests: Retrieval-Relevanz messen

---

## Altsystem-Referenzen

Für die Umsetzung dieses Dokuments:

| Thema | Quelle |
|-------|--------|
| Mem0 Client (SDK Wrapper, Circuit Breaker) | `src/lib/memory/mem0-client.ts` |
| save_memory Tool | `src/lib/ai/tools/save-memory.ts` |
| recall_memory Tool | `src/lib/ai/tools/recall-memory.ts` |
| Memory Search bei Chat-Start | `src/app/api/chat/resolve-context.ts` → searchMemory() |
| Memory Extraction in onFinish | `src/app/api/chat/persist.ts` → extractMemory() |
| Memory Formatierung im Prompt | `src/config/prompts.ts` → Layer 4 (Memory Context) |
| Memory User Toggle | `src/lib/db/queries/` → getUserPreferences().memoryEnabled |
| Memory Gates (3 Bedingungen) | `src/lib/ai/CLAUDE.md` → "Memory System" |
| Project Documents (aktuell Volltext) | `src/config/prompts.ts` → Layer 5 (Project Context) |
| Project Documents DB-Schema | `src/lib/db/schema/` → project_documents Table |
| User Memory API Routes | `src/app/api/user/memories/` |
| Memory Config | `src/config/memory.ts` (falls vorhanden) |
| DSGVO Consent Logging | `src/lib/db/schema/` → consent_logs Table |
