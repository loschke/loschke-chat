# Performance & Caching Konzept

> Systematische Analyse und Loesungsplanung fuer Performance-Optimierungen der Chat-Plattform.
>
> **Stand:** Erstellt Post-M5, aktualisiert 2026-03-22 (Post-M10).
>
> **Status-Uebersicht:**
>
> | Bereich | Status |
> |---------|--------|
> | 1.1 Composite-Indexes | Teilweise umgesetzt (chats, messages, artifacts haben Indexes) |
> | 1.2 Sidebar-Pagination | Nicht umgesetzt |
> | 1.3 getUserPreferences() Cache | Umgesetzt (60s TTL Map-Cache) |
> | 1.4 Upsert ON CONFLICT | Teilweise umgesetzt (ensureUserExists nutzt Pattern) |
> | 1.5 Artifact-Ownership-Check | Nicht umgesetzt |
> | Phase 2 (Redis) | Nicht umgesetzt (in-memory Rate-Limiter) |
> | Phase 3 (API Cache-Headers) | Nicht umgesetzt |
> | Phase 4 (Client Virtualization) | Nicht umgesetzt |
>
> **Zusaetzlich umgesetzt (nicht im Original-Dokument):**
> - resolve-context.ts: Parallele DB-Queries in Phase A (Skills, Models, MCP, UserPrefs, Chat)
> - persist.ts: Fire-and-Forget fuer Title, Memory, Suggested Replies
> - Module-Level Caches: Models (60s), Skills (60s), Quicktasks (60s), MCP-Server (60s), UserPrefs (60s)
> - clearCache()-Funktionen nach Admin-Mutations

---

## Ausgangslage

Nach M5 (File Upload & Multimodal) wächst die Nutzerbasis. Erste Power-User haben 100+ Chats. Performance und Caching wurden bisher bewusst zurückgestellt. Die App funktioniert, aber mehrere Stellen skalieren nicht mit wachsender Nutzung.

Dieses Dokument identifiziert alle Performance-Probleme, beschreibt konkrete Lösungen und teilt sie in priorisierte Phasen auf.

---

## 1. Database Layer

### 1.1 Fehlende Composite-Indexes

**Problem:** Queries nutzen Einzelspalten-Indexes, obwohl sie auf Kombinationen filtern und sortieren. Das erzwingt In-Memory-Sortierung bei wachsenden Datenmengen.

| Tabelle      | Fehlender Index              | Betroffene Query                 | Aktuell            |
| ------------ | ---------------------------- | -------------------------------- | ------------------ |
| `chats`      | `(user_id, updated_at DESC)` | `getUserChats()` — Filter + Sort | Nur `user_id`      |
| `messages`   | `(chat_id, created_at)`      | `getChatWithMessages()` — Sort   | Nur `chat_id`      |
| `artifacts`  | `(chat_id, created_at)`      | `getArtifactsByChatId()` — Sort  | Nur `chat_id`      |
| `usage_logs` | `(user_id, created_at)`      | Aggregationen + Zeitreihen       | Zwei Einzelspalten |
| `usage_logs` | `(model_id, created_at)`     | Kosten-Tracking pro Model        | Nicht indexiert    |

**Lösung:** Composite-Indexes in Drizzle-Schema ergänzen.

```typescript
// src/lib/db/schema/chats.ts
export const chatsUserUpdatedIdx = index("chats_user_updated_idx")
  .on(chats.userId, chats.updatedAt);

// src/lib/db/schema/messages.ts
export const messagesChatCreatedIdx = index("messages_chat_created_idx")
  .on(messages.chatId, messages.createdAt);

// src/lib/db/schema/artifacts.ts
export const artifactsChatCreatedIdx = index("artifacts_chat_created_idx")
  .on(artifacts.chatId, artifacts.createdAt);

// src/lib/db/schema/usage-logs.ts
export const usageUserCreatedIdx = index("usage_user_created_idx")
  .on(usageLogs.userId, usageLogs.createdAt);
export const usageModelCreatedIdx = index("usage_model_created_idx")
  .on(usageLogs.modelId, usageLogs.createdAt);
```

**Impact:** Eliminiert In-Memory-Sortierung. Bei 100+ Chats/User und 1000+ Messages/Chat signifikant.

**Aufwand:** Klein. Schema-Änderung + Migration.

---

### 1.2 Keine Pagination bei getUserChats()

**Problem:** `getUserChats()` in `src/lib/db/queries/chats.ts:23` lädt ALLE Chats eines Users ohne Limit. Die Sidebar rendert alles auf einmal.

**Lösung:** Cursor-basierte Pagination (updatedAt als Cursor, stabiler als Offset bei gleichzeitigen Writes).

```typescript
// src/lib/db/queries/chats.ts
export async function getUserChats(
  userId: string,
  options?: { limit?: number; cursor?: string }
) {
  const limit = options?.limit ?? 50;
  let query = db.select().from(chats)
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.updatedAt))
    .limit(limit + 1); // +1 für hasMore-Detection

  if (options?.cursor) {
    query = query.where(
      and(eq(chats.userId, userId), lt(chats.updatedAt, options.cursor))
    );
  }

  const results = await query;
  const hasMore = results.length > limit;
  return {
    chats: results.slice(0, limit),
    hasMore,
    nextCursor: hasMore ? results[limit - 1].updatedAt : null,
  };
}
```

**Impact:** Sidebar lädt initial 50 statt 500 Chats. Reduziert DB-Transfer, Parsing und Rendering.

**Aufwand:** Mittel. Query + API + Sidebar-Component anpassen.

---

### 1.3 getUserPreferences() ohne Cache

**Problem:** `getUserPreferences()` in `src/lib/db/queries/users.ts:50` wird bei JEDEM Chat-Request aufgerufen (via `resolve-context.ts:86`), ohne Caching. Andere Queries (Models, Skills) haben 60s TTL-Caches.

**Lösung:** Module-Level Cache mit TTL, analog zu Models/Skills.

```typescript
// src/lib/db/queries/users.ts
const prefsCache = new Map<string, { data: UserPrefs; expires: number }>();
const PREFS_TTL = 60_000; // 60s

export async function getUserPreferences(userId: string): Promise<UserPrefs> {
  const cached = prefsCache.get(userId);
  if (cached && cached.expires > Date.now()) return cached.data;

  const result = await db.select({
    customInstructions: users.customInstructions,
    defaultModelId: users.defaultModelId,
  }).from(users).where(eq(users.logtoId, userId)).limit(1);

  const prefs = result[0] ?? { customInstructions: null, defaultModelId: null };
  prefsCache.set(userId, { data: prefs, expires: Date.now() + PREFS_TTL });
  return prefs;
}

export function clearUserPrefsCache(userId?: string) {
  if (userId) prefsCache.delete(userId);
  else prefsCache.clear();
}
```

**Impact:** Eliminiert 1 DB-Query pro Chat-Request für wiederkehrende User.

**Aufwand:** Klein. Analog zu bestehendem Pattern in `config/models.ts`.

---

### 1.4 Upsert-Patterns mit SELECT+INSERT statt ON CONFLICT

**Problem:** `upsertModelByModelId()`, `upsertExpertBySlug()`, `upsertSkillBySlug()` machen jeweils SELECT → conditional UPDATE/INSERT. Das sind 2 Round-Trips statt 1.

**Betroffene Dateien:**

- `src/lib/db/queries/models.ts:130`
- `src/lib/db/queries/experts.ts:89`
- `src/lib/db/queries/skills.ts:141`

**Lösung:** Drizzle `onConflictDoUpdate()` nutzen (Pattern existiert bereits in `ensureUserExists()`).

```typescript
// Beispiel: models.ts
export async function upsertModelByModelId(data: NewModel) {
  return db.insert(models).values(data)
    .onConflictDoUpdate({
      target: models.modelId,
      set: { name: data.name, provider: data.provider, /* ... */ },
    })
    .returning();
}
```

**Impact:** Halbiert Round-Trips bei Seed/Import. Relevant für Admin-Bulk-Operationen.

**Aufwand:** Klein. Mechanische Umstellung, Pattern existiert bereits im Codebase.

---

### 1.5 Artifact-Ownership-Check mit 3 Queries

**Problem:** `updateArtifactContent()` in `src/lib/db/queries/artifacts.ts:78` macht 3 sequenzielle Queries: Artifact laden → Chat-Ownership prüfen → Update ausführen.

**Lösung:** Single UPDATE mit JOIN-basiertem WHERE.

```typescript
export async function updateArtifactContent(
  artifactId: string, userId: string,
  content: string, expectedVersion: number
) {
  const result = await db.update(artifacts)
    .set({ content, version: expectedVersion + 1 })
    .where(and(
      eq(artifacts.id, artifactId),
      eq(artifacts.version, expectedVersion),
      inArray(artifacts.chatId,
        db.select({ id: chats.id }).from(chats).where(eq(chats.userId, userId))
      )
    ))
    .returning();

  if (!result.length) {
    // Differenziere: Not found vs. Version conflict vs. Unauthorized
    const existing = await db.select({ version: artifacts.version })
      .from(artifacts).where(eq(artifacts.id, artifactId)).limit(1);
    if (!existing.length) throw new Error("NOT_FOUND");
    if (existing[0].version !== expectedVersion) throw new Error("VERSION_CONFLICT");
    throw new Error("UNAUTHORIZED");
  }
  return result[0];
}
```

**Impact:** 1 Query statt 3 im Happy Path. Error-Path bleibt bei 2.

**Aufwand:** Mittel. Erfordert Fehlerbehandlung-Refactoring.

---

## 2. API Layer

### 2.1 Sequenzielle Queries in resolveContext()

**Problem:** `src/app/api/chat/resolve-context.ts` führt 4-6 DB-Queries sequenziell aus. Bei 50-100ms Latenz pro Query = 250-500ms zusätzliche Wartezeit.

**Aktueller Flow (sequenziell):**

```
1. getChatById(chatId)           — 50-100ms
2. getExpertById(expertId)       — 50-100ms
3. createChat() ODER skip        — 50-100ms
4. getUserPreferences(userId)    — 50-100ms
5. discoverSkills()              — 0ms (cached) oder 50-100ms
6. getSkillContent(slug)         — 50-100ms (nur bei Quicktask)
```

**Lösung:** Unabhängige Queries parallelisieren.

```typescript
// src/app/api/chat/resolve-context.ts
// Bestehender Chat: Chat + Expert + Preferences parallel laden
const [existingChat, userPrefs, skills] = await Promise.all([
  requestChatId ? getChatById(requestChatId) : null,
  getUserPreferences(userId),
  discoverSkills(),
]);

// Expert erst nach Chat-Ergebnis (abhängig von expertId)
const expertId = requestExpertId ?? existingChat?.expertId;
const expert = expertId ? await getExpertById(expertId) : null;
```

**Impact:** 250-500ms → 100-200ms (3 parallele statt 5 sequenzielle Queries).

**Aufwand:** Mittel. Abhängigkeiten zwischen Queries beachten.

---

### 2.2 Sequenzielle Operations in onFinish (persist.ts)

**Problem:** `src/app/api/chat/persist.ts` führt im `onFinish`-Callback 5-6 Operationen sequenziell aus. Total Blocking: 1-3s.

**Aktueller Flow:**

```
1. persistFilePartsToR2()    — 100-500ms (pro Datei)
2. saveMessages(user)        — 50-100ms
3. saveMessages(assistant)   — 50-100ms
4. logUsage()                — 50-100ms
5. generateText(title)       — 500-2000ms
6. touchChat()               — 50-100ms
```

**Lösung:** Unabhängige Operationen parallel ausführen. Title-Generierung nicht blockierend.

```typescript
// persist.ts — onFinish
// Phase 1: Parallel (unabhängig)
const [, userMsgResult] = await Promise.all([
  persistFilePartsToR2(parts, userId),
  saveMessages([userMessage]),
]);

// Phase 2: Parallel (unabhängig voneinander, aber nach Phase 1)
await Promise.all([
  saveMessages([assistantMessage]),
  logUsage(usageData),
]);

// Phase 3: Non-blocking (Titel braucht kein await vom Client)
generateTitle(chatId, messages).then(title => {
  if (title) updateChatTitle(chatId, userId, title).then(() => touchChat(chatId));
}).catch(console.error);
```

**Impact:** 1-3s → 200-500ms im kritischen Pfad. Title-Generierung läuft async weiter.

**Aufwand:** Mittel. Reihenfolge-Abhängigkeiten beachten (Message Save vor Title).

---

### 2.3 Doppelte getModels()-Aufrufe in /api/models

**Problem:** `src/app/api/models/route.ts` ruft `getPublicModels()` und `getModelsByCategory()` separat auf. Beide delegieren intern an `getModels()`. Bei kaltem Cache = 2 DB-Queries.

**Lösung:** Einmal laden, lokal ableiten.

```typescript
export async function GET() {
  const allModels = await getModels();
  const publicModels = allModels.filter(m => m.isActive);
  const groups = groupByCategory(publicModels);
  return Response.json({ models: publicModels, groups });
}
```

**Aufwand:** Klein. Reine Refactoring-Maßnahme.

---

### 2.4 Fehlende HTTP Cache Headers

**Problem:** Keine API-Route setzt `Cache-Control` Headers. Der Browser re-fetched bei jeder Navigation.

| Route                    | Empfohlener Header                                              | Begründung                            |
| ------------------------ | --------------------------------------------------------------- | ------------------------------------- |
| `/api/models`            | `Cache-Control: public, max-age=300, stale-while-revalidate=60` | Ändert sich selten, 5min Cache sicher |
| `/api/experts`           | `Cache-Control: public, max-age=300, stale-while-revalidate=60` | Analog zu Models                      |
| `/api/chats`             | `Cache-Control: private, max-age=10`                            | Userspezifisch, kurzer Cache          |
| `/api/skills/quicktasks` | `Cache-Control: public, max-age=300`                            | Ändert sich selten                    |

**Lösung:**

```typescript
// Beispiel: /api/models/route.ts
return new Response(JSON.stringify({ models, groups }), {
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
  },
});
```

**Impact:** Eliminiert redundante Netzwerk-Requests bei Navigation zwischen Chats.

**Aufwand:** Klein. Header zu Response-Objekten hinzufügen.

---

### 2.5 Rate Limiter: In-Memory statt Redis

**Problem:** `src/lib/rate-limit.ts` nutzt einen In-Memory-Store. Auf Vercel Serverless wird der State bei jedem Cold Start zurückgesetzt. Mehrere Instanzen teilen keinen State.

**Lösung:** Upstash Redis Rate Limiter (siehe Phase 2: Redis-Integration).

---

## 3. Client Layer

### 3.1 Keine Virtualisierung der Message-Liste

**Problem:** `src/components/chat/chat-view.tsx` rendert alle Messages via `messages.map()`. Bei 50+ Messages werden alle DOM-Elemente erzeugt, auch wenn nur 5 sichtbar sind.

**Lösung:** `@tanstack/react-virtual` (leichtgewichtiger als react-window, besser für variable Höhen).

```typescript
import { useVirtualizer } from "@tanstack/react-virtual";

function MessageList({ messages }: { messages: Message[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // Geschätzte Message-Höhe
    overscan: 5,
  });

  return (
    <div ref={parentRef} style={{ overflow: "auto", height: "100%" }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <ChatMessage
            key={messages[virtualRow.index].id}
            message={messages[virtualRow.index]}
            style={{
              position: "absolute",
              top: virtualRow.start,
              height: virtualRow.size,
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

**Einschränkung:** Messages haben variable Höhen (Code-Blöcke, Artifacts). `estimateSize` muss dynamisch messen. Auto-Scroll bei neuen Messages erfordert `scrollToIndex`.

**Impact:** DOM-Elemente reduziert von n auf ~15 (viewport + overscan). Rendering-Zeit bei 50+ Messages: 500-2000ms → <100ms.

**Aufwand:** Hoch. Scroll-Verhalten, Auto-Scroll, Resize-Handling komplex. Erst ab 50+ Messages nötig.

**Empfehlung:** Erst implementieren wenn User mit 100+ Messages pro Chat auftreten. Vorher: Pagination mit "Ältere laden" Button (einfacher).

---

### 3.2 Keine Sidebar-Pagination

**Problem:** `src/components/chat/chat-sidebar-content.tsx` lädt alle Chats via `fetch("/api/chats")` ohne Limit. Rendert alle auf einmal.

**Lösung:** Zweistufig.

**Stufe 1 (Quick Win):** Initiales Limit + "Mehr laden" Button.

```typescript
const [chats, setChats] = useState<Chat[]>([]);
const [cursor, setCursor] = useState<string | null>(null);
const [hasMore, setHasMore] = useState(true);

async function loadChats(loadMore = false) {
  const params = new URLSearchParams({ limit: "50" });
  if (loadMore && cursor) params.set("cursor", cursor);

  const res = await fetch(`/api/chats?${params}`);
  const data = await res.json();

  setChats(prev => loadMore ? [...prev, ...data.chats] : data.chats);
  setCursor(data.nextCursor);
  setHasMore(data.hasMore);
}
```

**Stufe 2 (Später):** Virtualisierte Sidebar-Liste mit Infinite Scroll.

**Impact:** Initial-Load von 500 → 50 Chats. Schnellerer Sidebar-Aufbau.

**Aufwand:** Mittel. Backend-Pagination (1.2) ist Voraussetzung.

---

### 3.3 Doppelte Model-Fetches

**Problem:** `src/components/chat/chat-view.tsx` hat zwei separate `useEffect`-Hooks die beide `/api/models` fetchen (Zeilen 72-95 und 99-117). Der erste für defaultModelId-Fallback, der zweite für Business-Mode Metadaten.

**Lösung:** Zu einem Effect zusammenfassen. Models einmal laden, lokal verwenden.

```typescript
useEffect(() => {
  async function init() {
    const [prefsRes, modelsRes] = await Promise.all([
      fetch("/api/user/instructions"),
      fetch("/api/models"),
    ]);
    const prefs = await prefsRes.json();
    const models = await modelsRes.json();

    // Default Model setzen
    if (!modelId && prefs.defaultModelId) {
      setModelId(prefs.defaultModelId);
    }

    // Business Mode Metadaten
    if (features.businessMode.enabled) {
      const current = models.models?.find((m: Model) => m.id === modelId);
      setModelMeta({ provider: current?.provider, region: current?.region });
    }
  }
  init();
}, []);
```

**Impact:** 2 Netzwerk-Requests → 1 (parallel). Eliminiert Race Condition zwischen Effects.

**Aufwand:** Klein. Reine Refactoring-Maßnahme.

---

### 3.4 Sidebar-Suche ohne Debounce

**Problem:** `src/components/chat/chat-sidebar-content.tsx` filtert bei jedem Tastendruck über alle Chats. Bei 100+ Chats = 10+ Filter-Durchläufe beim Tippen eines Wortes.

**Lösung:**

```typescript
import { useDeferredValue } from "react";

const [searchInput, setSearchInput] = useState("");
const deferredSearch = useDeferredValue(searchInput);

// Filter nutzt deferredSearch statt searchInput
const filteredChats = useMemo(
  () => chats.filter(chat =>
    chat.title?.toLowerCase().includes(deferredSearch.toLowerCase())
  ),
  [chats, deferredSearch]
);
```

**Impact:** React priorisiert UI-Updates (Typing), Filter läuft mit niedrigerer Priorität.

**Aufwand:** Klein. `useDeferredValue` ist React 19 built-in, kein externes Package.

---

### 3.5 Artifact-Refetch bei jedem Klick

**Problem:** `src/hooks/use-artifact.ts` fetcht das Artifact bei jedem Klick auf eine ArtifactCard neu, auch wenn dasselbe Artifact bereits geladen ist.

**Lösung:** Cache im Hook mit ID-Check.

```typescript
const [cachedArtifact, setCachedArtifact] = useState<Artifact | null>(null);

const handleArtifactCardClick = useCallback((artifact: PartialArtifact) => {
  // Bereits geladen? Skip fetch.
  if (cachedArtifact?.id === artifact.id) {
    setActiveArtifact(cachedArtifact);
    return;
  }

  if (artifact.id) {
    fetch(`/api/artifacts/${artifact.id}`)
      .then(res => res.json())
      .then(data => {
        setCachedArtifact(data);
        setActiveArtifact(data);
      });
  }
}, [cachedArtifact]);
```

**Aufwand:** Klein.

---

### 3.6 renderChatItem nicht memoized

**Problem:** In `src/components/chat/chat-sidebar-content.tsx` wird jedes Chat-Item bei jeder Sidebar-Render-Cycle neu gerendert, auch wenn sich der Chat nicht geändert hat.

**Lösung:** `React.memo` für die Chat-Item-Komponente + stabile Callback-Referenzen.

**Aufwand:** Klein.

---

## 4. Bundle-Optimierung

### 4.1 Aktueller Stand

| Modul                        | Dynamischer Import? | Geschätzte Größe |
| ---------------------------- | ------------------- | ---------------- |
| CodeMirror (Artifact Editor) | Ja (`next/dynamic`) | ~150KB gzip      |
| Shiki (Code Preview)         | Nein (statisch)     | ~100KB gzip      |
| Streamdown + Plugins         | Nein (statisch)     | ~50KB gzip       |
| Mermaid Plugin               | Nein (statisch)     | ~200KB gzip      |
| Math Plugin                  | Nein (statisch)     | ~80KB gzip       |

### 4.2 Empfehlungen

**Mermaid:** Größter Einzelposten. Dynamisch laden wenn Feature aktiv UND Diagramm im Content erkannt.

```typescript
// In MessageResponse oder Streamdown-Config
const MermaidPlugin = features.mermaid.enabled
  ? (await import("@streamdown/mermaid")).default
  : null;
```

**Shiki:** Nur laden wenn Code-Blöcke im Chat vorkommen. Alternativ: Shiki Worker/Web Worker.

**Math:** Nur laden wenn `$` oder `$$` im Content. Bereits selten genutzt.

**Impact:** Initiales Bundle um 200-300KB reduzierbar. Relevant für Mobile und langsame Verbindungen.

**Aufwand:** Mittel. Streamdown-Plugin-System muss lazy Loading unterstützen.

---

## 5. Redis-Integration

### 5.1 Warum Redis?

Drei Probleme die nur mit verteiltem Cache/State lösbar sind:

1. **Rate Limiting:** In-Memory-Limiter ist nutzlos bei Serverless (reset bei Cold Start, kein Shared State)
2. **Session-Cache:** Logto Token-Validierung bei jedem Request. Redis kann Tokens cachen.
3. **Shared Cache:** Model/Expert/Skill-Caches sind per-Instance. Bei 5 Serverless-Instanzen = 5x Cache-Miss.

### 5.2 Empfehlung: Upstash Redis

- Serverless-native (HTTP-basiert, kein Connection-Management)
- Free Tier: 10.000 Commands/Tag (ausreichend für MVP)
- `@upstash/redis` + `@upstash/ratelimit` Packages

### 5.3 Migrationsstrategie

**Phase 1:** Rate Limiting (höchste Priorität, Security-relevant)

```typescript
// src/lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv(); // UPSTASH_REDIS_REST_URL + TOKEN

export const chatLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  prefix: "ratelimit:chat",
});

export const apiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"),
  prefix: "ratelimit:api",
});
```

**Phase 2:** Shared Caches (Models, Skills, Experts)

```typescript
// src/lib/cache.ts
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const hit = await redis.get<T>(key);
  if (hit) return hit;

  const result = await fn();
  await redis.set(key, result, { ex: ttlSeconds });
  return result;
}

// Nutzung:
const models = await cached("models:active", 300, () => getActiveModels());
```

**Phase 3:** User-Session-Cache (getUserPreferences, Custom Instructions)

```typescript
const prefs = await cached(
  `user:${userId}:prefs`, 120,
  () => getUserPreferences(userId)
);
```

### 5.4 Cache-Invalidierung

| Event                   | Invalidierung                                     |
| ----------------------- | ------------------------------------------------- |
| Admin ändert Models     | `redis.del("models:active", "models:all")`        |
| Admin ändert Skills     | `redis.del("skills:active", "skills:quicktasks")` |
| Admin ändert Experts    | `redis.del("experts:list:*")` (Pattern)           |
| User ändert Preferences | `redis.del(`user:${userId}:prefs`)`               |

### 5.5 ENV-Variablen

```
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=AX...
```

Feature-Gate: Redis-Features nur aktiv wenn `UPSTASH_REDIS_REST_URL` gesetzt. Fallback auf In-Memory-Cache (bestehend).

---

## 6. Phasen-Plan

### Phase 1: Quick Wins (ohne Redis, ohne Breaking Changes)

**Zeitrahmen:** 1-2 Tage, parallel zu M6-Start möglich.

| #   | Maßnahme                                    | Datei(en)                                       | Impact                     |
| --- | ------------------------------------------- | ----------------------------------------------- | -------------------------- |
| 1.1 | Composite-Indexes hinzufügen                | `src/lib/db/schema/*.ts`                        | DB-Sortierung via Index    |
| 1.2 | getUserPreferences() cachen (Module-Level)  | `src/lib/db/queries/users.ts`                   | 1 Query/Request weniger    |
| 1.3 | resolveContext() parallelisieren            | `src/app/api/chat/resolve-context.ts`           | 250-500ms → 100-200ms      |
| 1.4 | persist.ts parallelisieren                  | `src/app/api/chat/persist.ts`                   | 1-3s → 200-500ms           |
| 1.5 | Doppelte Model-Fetches zusammenlegen        | `src/components/chat/chat-view.tsx`             | 1 Netzwerk-Request weniger |
| 1.6 | Cache Headers auf API-Routes                | `src/app/api/models/route.ts` etc.              | Browser-Cache nutzen       |
| 1.7 | Sidebar-Suche mit useDeferredValue          | `src/components/chat/chat-sidebar-content.tsx`  | Flüssigeres Tippen         |
| 1.8 | Doppelte getModels() in Route zusammenlegen | `src/app/api/models/route.ts`                   | 1 DB-Query weniger         |
| 1.9 | Upsert-Patterns auf ON CONFLICT migrieren   | `src/lib/db/queries/{models,experts,skills}.ts` | Round-Trips halbiert       |

---

### Phase 2: Redis-Integration

**Zeitrahmen:** 1-2 Tage. Voraussetzung: Upstash-Account.

| #   | Maßnahme                                 | Datei(en)                                                | Impact                      |
| --- | ---------------------------------------- | -------------------------------------------------------- | --------------------------- |
| 2.1 | Upstash Redis Setup + `src/lib/cache.ts` | Neues Modul                                              | Infrastruktur               |
| 2.2 | Rate Limiter auf Redis migrieren         | `src/lib/rate-limit.ts`                                  | Verteiltes Rate Limiting    |
| 2.3 | Models/Skills/Experts Cache auf Redis    | `src/config/models.ts`, `src/lib/ai/skills/discovery.ts` | Shared Cache über Instanzen |
| 2.4 | User Preferences Cache auf Redis         | `src/lib/db/queries/users.ts`                            | Shared Cache                |
| 2.5 | Cache-Invalidierung in Admin-Mutations   | `src/app/api/admin/*/route.ts`                           | Konsistenz                  |

---

### Phase 3: Client-Optimierungen

**Zeitrahmen:** 2-3 Tage. Kann unabhängig von Phase 2 stattfinden.

| #   | Maßnahme                                | Datei(en)                                                    | Impact                        |
| --- | --------------------------------------- | ------------------------------------------------------------ | ----------------------------- |
| 3.1 | Sidebar-Pagination (Backend + Frontend) | `queries/chats.ts`, `chat-sidebar-content.tsx`, `/api/chats` | 50 statt alle Chats laden     |
| 3.2 | Artifact-Cache im use-artifact Hook     | `src/hooks/use-artifact.ts`                                  | Redundante Fetches eliminiert |
| 3.3 | ChatItem memoisieren                    | `src/components/chat/chat-sidebar-content.tsx`               | Weniger Re-Renders            |
| 3.4 | Message-Pagination ("Ältere laden")     | `chat-view.tsx`, `getChatWithMessages()`                     | Lange Chats initial schneller |

---

### Phase 4: Advanced (bei Bedarf)

**Zeitrahmen:** Je nach Bedarf, frühestens nach M7.

| #   | Maßnahme                                   | Datei(en)                           | Impact                 |
| --- | ------------------------------------------ | ----------------------------------- | ---------------------- |
| 4.1 | Message-Virtualisierung (tanstack/virtual) | `src/components/chat/chat-view.tsx` | DOM-Elemente minimiert |
| 4.2 | Mermaid/Shiki Lazy Loading                 | Streamdown-Integration              | Bundle -200-300KB      |
| 4.3 | Artifact-Content auf R2 auslagern          | Schema + Queries                    | DB-Größe reduziert     |
| 4.4 | WebSocket für Sidebar-Updates              | Neue Infrastruktur                  | Echtzeit-Sidebar       |

---

## 7. Roadmap-Impact (M6-M9)

### M6: Projekte MVP

**Neue Performance-Relevanz:**

- `projects`-Tabelle braucht sofort `(user_id, updated_at)` Index
- `chats.projectId` FK braucht Index für Project-Chat-Queries
- Sidebar-Gruppierung nach Projekten erhöht Rendering-Last
- `resolveContext()` bekommt zusätzlichen DB-Query (Projekt-Instruktionen laden)

**Empfehlung:** Phase 1 (Quick Wins) VOR oder parallel zu M6 umsetzen. Besonders 1.1 (Indexes) und 1.3 (resolveContext parallelisieren), da M6 weitere Queries hinzufügt.

### M7: MCP Integration

**Performance-Relevanz:**

- MCP-Tool-Discovery bei jedem Chat-Request (Connection + List Tools)
- Bereits 5s Timeout pro Server (graceful degradation)
- MCP-Tool-Results können groß sein (Token-Overhead)

**Empfehlung:** Redis-Cache (Phase 2) für MCP-Tool-Listen nutzen. Tool-Discovery einmal pro Session, nicht pro Request.

### M8: Business Mode

**Performance-Relevanz:**

- Privacy-Routing braucht schnelle Model-Metadaten (Region)
- PII-Detection könnte pro Message laufen (CPU-intensiv)
- Consent-Logging = zusätzliche DB-Writes

**Empfehlung:** Model-Metadaten im Redis-Cache. PII-Detection async (nicht im kritischen Pfad).

### M9: Monetarisierung

**Performance-Relevanz:**

- Credit-Check bei JEDEM Chat-Request (Blocking!)
- `credit_transactions`-Tabelle wächst schnell (Index-Design kritisch)
- Stripe Webhook-Processing darf Chat nicht blockieren

**Empfehlung:** Credit-Balance im Redis-Cache (Atomic Decrement). DB-Write async. Kritischster Performance-Punkt der gesamten Roadmap, da Latenz = User-Experience.

---

## 8. Metriken & Monitoring

### Zu messende Werte

| Metrik                     | Wo messen                       | Zielwert              |
| -------------------------- | ------------------------------- | --------------------- |
| Time to First Token (TTFT) | `/api/chat` Response Start      | < 500ms               |
| Sidebar Load Time          | Client-seitig (Performance API) | < 200ms               |
| resolveContext() Duration  | Server-seitig (console.time)    | < 150ms               |
| DB Query Duration          | Drizzle Logger oder Wrapper     | < 50ms pro Query      |
| Cache Hit Rate             | Redis INFO oder Custom Counter  | > 80%                 |
| Bundle Size (gzip)         | `next build` Output             | < 300KB First Load JS |

### Einfaches Server-Timing

```typescript
// In API-Routes
const start = performance.now();
const result = await resolveContext(...);
const duration = performance.now() - start;

// Optional: Server-Timing Header für DevTools
response.headers.set("Server-Timing", `resolve;dur=${duration.toFixed(1)}`);
```

---

## Zusammenfassung

| Phase                   | Aufwand        | Impact                                | Abhängigkeit         |
| ----------------------- | -------------- | ------------------------------------- | -------------------- |
| **Phase 1: Quick Wins** | 1-2 Tage       | Hoch (TTFT -300ms, Sidebar schneller) | Keine                |
| **Phase 2: Redis**      | 1-2 Tage       | Mittel (Security, Shared State)       | Upstash-Account      |
| **Phase 3: Client**     | 2-3 Tage       | Mittel (UX bei Power-Usern)           | Phase 1 (Pagination) |
| **Phase 4: Advanced**   | Je nach Bedarf | Niedrig-Mittel (Skalierung)           | Phase 2+3            |

**Empfehlung:** Phase 1 sofort umsetzen (parallel zu M6). Phase 2 vor M9 (Credit-System braucht Redis). Phase 3 wenn Power-User-Feedback kommt. Phase 4 nur bei konkretem Bedarf.
