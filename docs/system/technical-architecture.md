# Technische Architektur

Entwickler-Dokumentation der internen Systeme: LLM-Provider, Tools, Skills, Experts, Memory, MCP und Datenbank. Kein Code, aber alle Konzepte und Zusammenhaenge.

---

## LLM-Provider-Architektur

### Gateway-Pattern

Die App nutzt den **Vercel AI Gateway** als zentrale Abstraktion. Alle Chat-Requests laufen ueber `gateway(modelId)`, wobei `modelId` im Format `provider/model-name` uebergeben wird (z.B. `anthropic/claude-sonnet-4-6`).

```
User-Request
    │
    ▼
route.ts: gateway(finalModelId)
    │
    ▼
Vercel AI Gateway
    ├── Anthropic (anthropic/claude-*)
    ├── Google (google/gemini-*)
    ├── OpenAI (openai/gpt-*)
    └── Weitere Provider...
```

**Vorteil:** Ein einziger API-Key (`AI_GATEWAY_API_KEY`), ein einheitliches Interface. Provider-Wechsel ohne Code-Aenderung.

### Privacy-Routing (Bypass)

Wenn Business Mode aktiv ist und der Nutzer eine Privacy-Route waehlt, wird der Gateway umgangen:

| Route         | Provider          | SDK                         | Konfiguration                                           |
| ------------- | ----------------- | --------------------------- | ------------------------------------------------------- |
| **EU-Modell** | Mistral           | `@ai-sdk/mistral`           | `BUSINESS_MODE_EU_MODEL` + `MISTRAL_API_KEY`            |
| **Lokal**     | OpenAI-kompatibel | `@ai-sdk/openai-compatible` | `BUSINESS_MODE_LOCAL_MODEL` + `BUSINESS_MODE_LOCAL_URL` |

Privacy-Routing deaktiviert automatisch die Bildgenerierung (Gemini ist nicht privacy-routbar).

### Bildgenerierung (Direktverbindung)

`generateImage()` laeuft NICHT ueber den Gateway. Gemini wird direkt via `@ai-sdk/google` angesprochen, weil die Gateway-API keine Bildgenerierung unterstuetzt.

- **Model:** `gemini-2.5-flash-image` (hardcoded)
- **Aufruf:** `generateImageFromPrompt()` in `src/lib/ai/image-generation.ts`
- **Credits:** Flat-Rate (`IMAGE_GENERATION_CREDITS`, default 500), nicht token-basiert

### Model-Aufloesung

Die Modell-Auswahl folgt einer Prioritaetskette. Das erste gueltige Modell gewinnt:

1. **Quicktask-Model** — `skills.modelId` aus dem Quicktask-Frontmatter
2. **Expert-Model** — `experts.modelPreference` aus der DB
3. **User-Default** — `users.defaultModelId` aus den Einstellungen
4. **System-Default** — `aiDefaults.model` (ENV `DEFAULT_MODEL_ID` oder `anthropic/claude-sonnet-4-6`)

Jede Stufe wird gegen die Model-Registry validiert. Ungueltige IDs fallen zur naechsten Stufe durch.

### Temperature-Aufloesung

Gleiche Kette wie Modell:

1. Quicktask-Temperature → 2. Expert-Temperature → 3. System-Default (0.7)

Kreative Experts (Writer: 0.8, Visual: 0.7) nutzen hoehere Werte. Praezise Experts (Code: 0.3, Analyst: 0.3) niedrigere.

### Model-Registry

Modelle werden in der `models`-Tabelle verwaltet mit:

- **Preis:** `inputPrice.per1m` und `outputPrice.per1m` (Dollar pro 1M Tokens)
- **Region:** `eu` oder `us` (fuer Datenschutz-Awareness)
- **Capabilities:** `vision` (Bilder), `pdfInput` (`native`/`extract`/`none`), `reasoning`, `tools` — steuern UI-File-Upload + Server-Pipeline
- **Kategorien:** enterprise, allrounder, creative, coding, analysis, fast

**Cache:** 60s TTL auf Modul-Ebene. `clearModelCache()` nach Admin-Mutations.

**Fallback-Kette:** DB → ENV `MODELS_CONFIG` (JSON-Array) → hardcoded Fallback (Claude Sonnet 4).

---

## Tool-System

### Ueberblick

Tools sind Funktionen, die das LLM autonom aufrufen kann. Der Nutzer muss nichts konfigurieren. Die KI entscheidet selbst, wann welches Tool passt.

Alle Tools werden in `src/app/api/chat/build-tools.ts` registriert. Die Registrierung ist kontextabhaengig: nicht jeder Chat hat alle Tools.

### Tool-Kategorien

#### Immer verfuegbar

| Tool                   | Typ              | Pattern      | Beschreibung                             |
| ---------------------- | ---------------- | ------------ | ---------------------------------------- |
| `create_artifact`      | Factory (chatId) | execute → DB | Erstellt Dokument/HTML/Code als Artifact |
| `create_quiz`          | Factory (chatId) | execute → DB | Erstellt interaktiven Wissenstest        |
| `create_review`        | Factory (chatId) | execute → DB | Erstellt abschnittsweises Review         |
| `ask_user`             | Statisch         | kein execute | Pausiert Stream, zeigt UI-Widget         |
| `content_alternatives` | Statisch         | kein execute | Zeigt Tab-Ansicht mit Varianten          |

#### Bedingt verfuegbar

| Tool             | Bedingung                         | Pattern                           | Beschreibung                         |
| ---------------- | --------------------------------- | --------------------------------- | ------------------------------------ |
| `web_search`     | `features.search.enabled`         | execute → Provider                | Websuche via konfiguriertem Provider |
| `web_fetch`      | `features.search.enabled`         | execute → Provider + SSRF-Check   | URL-Inhalt abrufen                   |
| `save_memory`    | Memory enabled + User-Toggle      | Factory (userId) → Mem0           | Explizit Information speichern       |
| `recall_memory`  | Memory enabled + User-Toggle      | Factory (userId) → Mem0           | Semantische Memory-Suche             |
| `generate_image` | Gemini-Key + kein Privacy-Routing | Factory (chatId, userId) → Gemini | Bild generieren/bearbeiten           |
| `youtube_search`   | `features.youtube.enabled`        | Factory (chatId, userId) → YouTube API | Video-Suche mit Ergebnis-Cards   |
| `youtube_analyze`  | `features.imageGeneration.enabled` | Factory (chatId, userId) → Gemini     | Video-Transkription/Analyse      |
| `text_to_speech`   | `features.tts.enabled`            | Factory (chatId, userId) → Gemini TTS | Text → Audio (8 Stimmen)         |
| `extract_branding` | `features.branding.enabled`       | Factory (chatId, userId) → Firecrawl  | Branding-Extraktion von URLs     |
| `generate_design`  | `features.stitch.enabled`         | Factory (chatId, userId) → Stitch     | UI-Design generieren (fire-and-forget, Projekt-Link) |
| `deep_research`    | `features.deepResearch.enabled` + kein Privacy-Routing | Factory (chatId, userId) → Gemini Interactions API | Async Deep Research (5-12 Min) |
| `google_search`    | `features.googleSearch.enabled` + kein Privacy-Routing | Factory (chatId, userId) → Gemini | Google Search Grounding mit Quellen  |
| `code_execution`   | Anthropic-Modell + Skills enabled | Anthropic Provider                    | Office-Dokumente (PPTX, XLSX, DOCX, PDF) |
| `load_skill`     | Skills vorhanden + kein Quicktask | Factory (availableSkills) → DB    | Skill-Content on-demand laden        |
| `load_skill_resource` | Skills mit Resources vorhanden | Factory (skills) → DB             | Skill-Ressourcen-Datei on-demand laden |

#### MCP-Tools (dynamisch)

MCP-Tools werden zur Laufzeit von externen Servern entdeckt und mit Prefix registriert:
`{serverId}__{toolName}` (z.B. `github__list_repos`, `slack__send_message`)

### Factory-Pattern

Tools, die Zugriff auf Request-Kontext brauchen (chatId, userId), nutzen Factory-Funktionen:

```
createArtifactTool(chatId) → tool({ execute: async (args) => { /* closure ueber chatId */ } })
```

Das LLM sieht nur die Tool-Beschreibung und Parameter. Die Factory injiziert den Kontext unsichtbar.

### Tool-Naming

- **Built-in:** Underscores (`create_artifact`, `web_search`, `load_skill`)
- **MCP:** Doppel-Underscores (`github__list_repos`, `slack__send_message`)
- **UI-Erkennung:** `tool-status.tsx` erkennt MCP-Tools am `__` Separator und zeigt Server-Badge

### Kollisionsschutz

Built-in Tool-Namen werden in einem Set gesammelt. MCP-Tools mit gleichem Namen werden blockiert und gewarnt. Built-in hat immer Vorrang.

### Expert-Tool-Filterung

Experts koennen Tools einschraenken:

- `allowedTools: ["create_artifact", "generate_image"]` → nur diese Tools verfuegbar
- `allowedTools: []` oder `null` → alle Tools verfuegbar
- `mcpServerIds: ["github"]` → nur dieser MCP-Server aktiv

### Tool-Ausfuehrung: execute vs. kein execute

| Pattern          | Verhalten                                                                     | Beispiel                                                              |
| ---------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Mit execute**  | Tool wird server-seitig ausgefuehrt, Ergebnis zurueck an LLM                  | `create_artifact` (speichert in DB), `web_search` (ruft Provider auf) |
| **Ohne execute** | Stream pausiert, Client rendert UI-Widget, User antwortet via `addToolResult` | `ask_user` (Rueckfrage-Widget), `content_alternatives` (Tab-Ansicht)  |

---

## Skill-System

### Konzept

Skills sind Markdown-basierte Wissenspakete. Sie enthalten spezialisierte Anweisungen, die das LLM on-demand laden kann. Skills leben in der `skills`-Tabelle und werden ueber die Admin-UI verwaltet.

### Zwei Modi

| Modus         | Zweck                      | Trigger                             | Verhalten                                                           |
| ------------- | -------------------------- | ----------------------------------- | ------------------------------------------------------------------- |
| **skill**     | On-demand Expertenwissen   | LLM ruft `load_skill` Tool auf      | Content wird in den laufenden Chat injiziert                        |
| **quicktask** | Formularbasierter Workflow | User fuellt Formular im Empty-State | Content wird als System-Prompt-Layer gesetzt (ersetzt Skills-Liste) |

### SKILL.md Format

```yaml
---
name: SEO-Analyse
slug: seo-analysis
description: Strukturierte SEO-Analyse mit Handlungsempfehlungen
mode: skill                    # oder "quicktask"
category: Marketing            # nur bei quicktask
icon: Search                   # Lucide Icon-Name
fields:                        # nur bei quicktask
  - key: domain
    label: Domain
    type: text                 # text | textarea | select
    required: true
    placeholder: "example.com"
    options: [...]             # nur bei type: select
outputAsArtifact: true         # nur bei quicktask
temperature: 0.5               # optional Override
modelId: anthropic/claude-...  # optional Override
---

# Skill-Inhalt als Markdown
Vollstaendige Anweisungen fuer das LLM...
```

### Parsing

`gray-matter` extrahiert Frontmatter und Content. Der Parser (`src/lib/ai/skills/parser.ts`) validiert Pflichtfelder (name, slug, description) und gibt `null` bei ungueltigem Format zurueck.

### Discovery & Cache

`discoverSkills()` und `discoverQuicktasks()` laden aktive Skills aus der DB mit 60s TTL-Cache auf Modul-Ebene. `clearSkillCache()` wird nach Admin-Mutations aufgerufen.

### Template-Rendering (Quicktasks)

Quicktask-Content nutzt `{{variable}}` Platzhalter mit optionalem Default:

```
Analysiere die Domain {{domain}} fuer {{zielgruppe | default: "allgemeine Nutzer"}}.
```

`renderTemplate()` ersetzt Platzhalter mit den Formular-Eingaben des Nutzers.

### Integration in den System-Prompt

**Normaler Chat:** Layer 3 zeigt eine Uebersicht aller verfuegbaren Skills mit Name und Beschreibung. Expert-bevorzugte Skills (via `skillSlugs`) werden mit ⭐ markiert und zuerst sortiert.

**Quicktask:** Layer 3 wird komplett durch den gerenderten Quicktask-Content ersetzt. `load_skill` Tool ist nicht verfuegbar (Quicktasks sind self-contained).

### Skill-Content-Loading

Wenn das LLM `load_skill("seo-analysis")` aufruft:

1. Slug wird gegen `availableSkills` validiert (Runtime-Pruefung)
2. `getSkillContent(slug)` laedt den vollen Markdown-Content aus der DB
3. Content wird als Tool-Result an das LLM zurueckgegeben — inkl. Resource-Manifest falls vorhanden
4. LLM nutzt den Skill-Content fuer die aktuelle Antwort
5. Bei Bedarf laedt das LLM einzelne Resources via `load_skill_resource`

### Skill Resources

Skills koennen zusaetzliche Dateien mitliefern (Templates, Referenzdokumente, Beispiele). Verwaltung ueber die `skill_resources`-Tabelle.

**Upload-Workflow (Admin):**
1. ZIP-Datei im Skill-Editor hochladen
2. System extrahiert Dateien und kategorisiert anhand der Ordnerstruktur
3. Resources werden der `skill_resources`-Tabelle zugeordnet

**Kategorien:**

| Kategorie     | Ordner         | Beschreibung                                |
| ------------- | -------------- | ------------------------------------------- |
| `shared`      | `shared/`      | Gemeinsame Dateien ueber mehrere Skills     |
| `spec`        | `specs/`       | Spezifikationen und Anforderungsdokumente   |
| `template`    | `templates/`   | Vorlagen die das LLM als Basis nutzen kann  |
| `reference`   | `references/`  | Referenzmaterial (Beispiele, Richtlinien)    |
| `example`     | `examples/`    | Beispielausgaben                            |

**Integration:**
- `load_skill` liefert ein Resource-Manifest (Dateiname + Kategorie) mit dem Skill-Content
- Das LLM kann gezielt `load_skill_resource(skillSlug, filename)` aufrufen
- Unique Constraint: Pro Skill nur eine Datei gleichen Namens

### User-eigene Skills

Mit aktiviertem Feature-Flag `userSkills` koennen Nutzer eigene Skills erstellen:

- Eigene Skills haben `userId` gesetzt (globale haben `userId = null`)
- Namenskollision: User-Skill gewinnt ueber globalen Skill bei gleichem Slug
- `isPublic`-Flag: Oeffentliche User-Skills sind fuer alle sichtbar
- Discovery: `discoverSkillsForUser(userId)` merged globale + user-eigene Skills

---

## Expert-System

### Konzept

Experts sind KI-Personas mit eigener Persoenlichkeit, Modell-Praeferenz, Temperatur und Tool-Zugang. Sie aendern fundamental, wie die KI antwortet.

### Schema

| Feld              | Typ               | Wirkung                                      |
| ----------------- | ----------------- | -------------------------------------------- |
| `systemPrompt`    | Text              | Definiert Persona, Prinzipien, Ausgabeformat |
| `modelPreference` | Text (nullable)   | Override des User-Default-Modells            |
| `temperature`     | Number (nullable) | Override der System-Temperatur               |
| `skillSlugs`      | String[]          | Bevorzugte Skills (⭐ in Skills-Liste)        |
| `allowedTools`    | String[]          | Tool-Whitelist (leer = alle)                 |
| `mcpServerIds`    | String[]          | MCP-Server-Whitelist (leer = alle)           |
| `isPublic`        | Boolean           | Sichtbarkeit fuer andere User                |

### Globale vs. eigene Experts

- **Global** (`userId = NULL`): Die 7 Default-Experts. Von Admins verwaltbar, nicht loeschbar.
- **Eigene** (`userId = <auth-sub>`): User-erstellte Experts. Nur fuer den Ersteller sichtbar (wenn `isPublic = false`).

### 7 Default-Experts

| Slug         | Temperatur | Besonderheiten                                               |
| ------------ | ---------- | ------------------------------------------------------------ |
| `general`    | 0.7        | Keine speziellen Tools oder Skills                           |
| `code`       | 0.3        | Skills: react-patterns                                       |
| `seo`        | 0.5        | Skills: seo-analysis, content-optimization                   |
| `analyst`    | 0.3        | Skills: data-analysis                                        |
| `researcher` | 0.5        | Skills: competitor-research                                  |
| `writer`     | 0.8        | Skills: content-optimization. Anti-Buzzword-Regeln im Prompt |
| `visual`     | 0.7        | `allowedTools: ["generate_image", "create_artifact"]`        |

### Kaskade bei Chat-Start

```
Expert ausgewaehlt?
    │
    ├── Ja: Expert systemPrompt → Layer 1
    │       Expert modelPreference → Model-Aufloesung Stufe 2
    │       Expert temperature → Temperature-Aufloesung Stufe 2
    │       Expert skillSlugs → Skills-Priorisierung
    │       Expert allowedTools → Tool-Filterung
    │       Expert mcpServerIds → MCP-Server-Filterung
    │
    └── Nein: Default-Prompt → Layer 1
              User-Default oder System-Default → Modell
              System-Temperature (0.7) → Temperature
              Alle Skills, alle Tools, alle MCP-Server
```

### Expert-Aufloesung

1. `expertId` aus Request-Body (neuer Chat, User waehlt Expert)
2. `existingChat.expertId` (bestehender Chat)
3. `project.defaultExpertId` (Projekt hat Default-Expert)
4. Kein Expert → Default-Prompt

### Seeding

`pnpm db:seed` erstellt die 7 Default-Experts idempotent via `upsertExpertBySlug()` (Insert oder Update bei bestehendem Slug).

---

## Memory-System

### Technologie

**Mem0 Cloud** (`mem0ai` npm) als externer Memory-Provider. Semantische Suche und Extraktion. Die App speichert keine Memories lokal, sondern delegiert an die Mem0 API.

### Architektur

```
Chat-Start (neuer Chat)
    │
    ▼
searchMemories(userId, lastUserMessage)
    │ 3s Timeout, Circuit Breaker
    ▼
formatMemoriesForPrompt(memories)
    │ Max 4000 Zeichen
    ▼
System-Prompt Layer 4: "## Kontext aus frueheren Sessions"

---

Chat-Ende (nach onFinish)
    │
    ▼
Pruefen: features.memory.enabled && userMemoryEnabled && messages >= minMessages(6)
    │
    ▼
extractMemories(userId, chatId, messages) → Fire-and-Forget
    │
    ▼
Mem0 client.add(messages, { user_id, metadata: { chatId } })
```

### Circuit Breaker

Schuetzt vor Log-Spam und Latenz bei Mem0-Ausfaellen:

| Zustand                  | Bedingung                                 | Verhalten                              |
| ------------------------ | ----------------------------------------- | -------------------------------------- |
| **Closed** (normal)      | `failureCount < 5`                        | Requests gehen durch                   |
| **Open** (blockiert)     | `failureCount >= 5` UND `elapsed < 5min`  | Requests sofort abgelehnt, `return []` |
| **Half-Open** (Recovery) | `failureCount >= 5` UND `elapsed >= 5min` | Ein Retry erlaubt, bei Erfolg → Closed |

### Memory-Operationen

| Operation   | Trigger                        | Methode                                                | Timeout                        |
| ----------- | ------------------------------ | ------------------------------------------------------ | ------------------------------ |
| **Search**  | Neuer Chat, automatisch        | `client.search(query, { user_id, limit })`             | 3s Race                        |
| **Extract** | Chat-Ende, automatisch         | `client.add(messages, { user_id })`                    | Kein Timeout (fire-and-forget) |
| **Save**    | LLM nutzt `save_memory` Tool   | `client.add([{ role: "user", content }], { user_id })` | Tool-Timeout                   |
| **Recall**  | LLM nutzt `recall_memory` Tool | `client.search(query, { user_id })`                    | Tool-Timeout                   |
| **List**    | User oeffnet Memory-Dialog     | `client.getAll({ user_id })`                           | API-Timeout                    |
| **Delete**  | User loescht einzelne Memory   | `client.delete(memoryId)`                              | API-Timeout                    |

### Drei-Ebenen-Gate

Jede Memory-Operation prueft:

1. **Feature-Flag:** `MEM0_API_KEY` gesetzt?
2. **User-Toggle:** `users.memoryEnabled` aktiv?
3. **Min-Messages:** Mindestens 6 Nachrichten (nur fuer Auto-Extraktion)

### Token-Budget

`formatMemoriesForPrompt()` begrenzt den Memory-Kontext auf 4000 Zeichen. Memories werden der Reihe nach eingefuegt, bis das Budget erschoepft ist. Abschnitt an Wortgrenze.

---

## MCP-Integration (Model Context Protocol)

### Konzept

Die App ist MCP-Client. Sie verbindet sich zu admin-kuratierten MCP-Servern, entdeckt deren Tools und stellt sie dem LLM zur Verfuegung. MCP-Tools erscheinen neben den Built-in Tools.

### Verbindungsablauf

```
Chat-Request
    │
    ▼
getActiveMCPServersForExpert(expert.mcpServerIds)
    │ Filtert: envVar-Gate + Expert-Whitelist
    ▼
connectMCPServers(configs[])
    │ Parallel, 5s Timeout pro Server
    ▼
Tool-Discovery pro Server
    │ Prefix: {serverId}__{toolName}
    │ Collision Guard: Built-in hat Vorrang
    │ Allowlist: expert.allowedTools
    ▼
Merged Tool-Registry → streamText()

---

onFinish / finally
    │
    ▼
mcpHandle.close() → Alle Verbindungen schliessen
```

### Server-Konfiguration

| Feld           | Beschreibung                                                            |
| -------------- | ----------------------------------------------------------------------- |
| `serverId`     | Eindeutiger Slug, wird Tool-Prefix (`github` → `github__list_repos`)    |
| `url`          | Endpoint mit `${VAR}` Interpolation (z.B. `${GITHUB_MCP_URL}`)          |
| `transport`    | `sse` (Server-Sent Events) oder `http`                                  |
| `envVar`       | Opt-in Gate: Server nur aktiv wenn diese ENV-Variable gesetzt ist       |
| `headers`      | Auth-Headers mit `${VAR}` Interpolation (z.B. `Bearer ${GITHUB_TOKEN}`) |
| `enabledTools` | Tool-Allowlist pro Server (`null` = alle Tools)                         |

### Sicherheit

- **Allowlist-only:** Nur Server aus der DB (admin-kuratiert), keine User-definierten URLs
- **SSRF-Schutz:** `isAllowedUrl()` prueft URLs vor Verbindung
- **Secrets:** `${VAR}` Syntax, nie hardcoded. Aufloesung server-seitig
- **Timeout:** 5s pro Server. Langsame Server werden uebersprungen (graceful degradation)
- **EnvVar Gate:** Server nur aktiv wenn zugehoerige ENV-Variable gesetzt

### Cleanup

MCP-Verbindungen werden im `finally`-Block von `onFinish` geschlossen. `Promise.allSettled()` mit Timeout verhindert haengende Connections.

---

## Datenbank-Schema

### Uebersicht

18 Tabellen in `src/lib/db/schema/`. Neon Serverless Postgres via Drizzle ORM. Connection als Modul-Level Singleton (verhindert Connection-Exhaustion).

### Kern-Tabellen

```
users
├── id (PK, uuid)
├── authSub (unique, text — OIDC sub claim aus loschke-auth)
├── email, name, avatarUrl
├── role ("user" | "admin" | "superadmin")
├── defaultModelId
├── memoryEnabled, suggestedRepliesEnabled
├── creditsBalance (integer)
├── customInstructions (text)
└── createdAt, updatedAt

chats
├── id (PK, nanoid)
├── userId (FK → users)
├── expertId (FK → experts, nullable)
├── projectId (FK → projects, nullable)
├── title, isPinned, modelId
├── metadata (jsonb)
└── createdAt, updatedAt, lastMessageAt

messages
├── id (PK, nanoid)
├── chatId (FK → chats, CASCADE DELETE)
├── role ("user" | "assistant")
├── parts (jsonb) — MessagePart[]
└── metadata (jsonb) — modelId, tokens, expertId
```

### Message-Parts (jsonb)

Messages speichern keine Rohtext-Felder, sondern ein Array von typed Parts:

| Part-Typ      | Felder                             | Beschreibung                                             |
| ------------- | ---------------------------------- | -------------------------------------------------------- |
| `text`        | `text`                             | Textinhalt                                               |
| `file`        | `url`, `mediaType`, `filename`     | Datei-Referenz (R2-URL oder data-URL)                    |
| `tool-call`   | `toolCallId`, `toolName`, `args`   | Tool-Aufruf des LLM                                      |
| `tool-result` | `toolCallId`, `toolName`, `result` | Ergebnis der Tool-Ausfuehrung                            |
| `step-start`  | —                                  | Markiert Multi-Step-Grenze (Tool Call → weitere Antwort) |

### Registry-Tabellen

```
experts                          skills
├── id (PK, nanoid)              ├── id (PK, nanoid)
├── userId (nullable)            ├── slug (unique)
├── slug (unique)                ├── name, description, content
├── systemPrompt                 ├── mode ("skill" | "quicktask")
├── skillSlugs (jsonb)           ├── fields (jsonb)
├── modelPreference              ├── outputAsArtifact
├── temperature (jsonb)          ├── temperature, modelId
├── allowedTools (jsonb)         ├── isActive, sortOrder
├── mcpServerIds (jsonb)         └── createdAt, updatedAt
├── isPublic, sortOrder
└── createdAt, updatedAt

models                           mcp_servers
├── id (PK, nanoid)              ├── id (PK, nanoid)
├── modelId (unique)             ├── serverId (unique)
├── name, provider               ├── name, url, transport
├── categories (jsonb)           ├── headers (jsonb)
├── region ("eu" | "us")         ├── envVar
├── inputPrice, outputPrice      ├── enabledTools (jsonb)
├── capabilities (jsonb)         ├── isActive, sortOrder
├── isActive, sortOrder          └── createdAt, updatedAt
└── createdAt, updatedAt
```

### Projekt-Tabellen

```
projects                         project_documents
├── id (PK, nanoid)              ├── id (PK, nanoid)
├── userId (FK → users)          ├── projectId (FK → projects, CASCADE)
├── name, description            ├── title, content
├── instructions (text)          ├── sortOrder
├── defaultExpertId              └── createdAt, updatedAt
├── isArchived
└── createdAt, updatedAt

project_members
├── id (PK, nanoid)
├── projectId (FK → projects, CASCADE DELETE)
├── userId (text)
├── role ("owner" | "editor")
├── addedBy (text)
├── createdAt
    Unique: (projectId, userId)
    Index: userId, projectId
```

### Sharing-Tabellen

```
shared_chats                     chat_shares
├── id (PK, nanoid)              ├── id (PK, nanoid)
├── chatId (FK → chats, CASCADE) ├── chatId (FK → chats, CASCADE)
├── userId (text)                ├── ownerId (text)
├── token (unique)               ├── sharedWithId (text)
├── createdAt                    ├── createdAt
    Index: token, chatId, userId     Unique: (chatId, sharedWithId)
                                     Index: sharedWithId, chatId
```

**shared_chats:** Public Sharing via Token-URL (jeder mit Link kann lesen).
**chat_shares:** User-zu-User Sharing (bestimmte Nutzer erhalten Zugriff).

### Skill-Resource-Tabelle

```
skill_resources
├── id (PK, nanoid)
├── skillId (FK → skills, CASCADE DELETE)
├── filename (text)
├── content (text)
├── category (text — shared|spec|template|reference|example)
├── sortOrder (integer)
├── createdAt, updatedAt
    Unique: (skillId, filename)
    Index: skillId
```

### Tracking-Tabellen

```
usage_logs                       credit_transactions
├── id (PK, nanoid)              ├── id (PK, nanoid 12)
├── userId, chatId, messageId    ├── userId
├── modelId                      ├── type (usage|grant|admin_adjust)
├── inputTokens                  ├── amount (integer, signed)
├── outputTokens                 ├── balanceAfter (integer)
├── totalTokens                  ├── description, referenceId
├── reasoningTokens              ├── modelId, chatId
├── cachedInputTokens            └── createdAt
├── cacheReadTokens              Index: (userId, createdAt)
├── cacheWriteTokens
├── stepCount
└── createdAt

consent_logs
├── id (PK, nanoid 12)
├── userId, chatId
├── consentType, decision
├── fileMetadata (jsonb)
├── piiFindings (jsonb)
├── routedModel
├── messagePreview (100 chars)
└── createdAt
    Index: (userId, createdAt)

artifacts
├── id (PK, nanoid)
├── chatId (FK), messageId (FK)
├── type (markdown|html|code|image|quiz|review|audio)
├── title, content, language
├── fileUrl (nullable)
├── metadata (jsonb) — sources, deepResearch, stitchProjectId, etc.
├── version (integer, Optimistic Locking)
└── createdAt, updatedAt
    Index: chatId
```

---

## Credit-System

Zentrale Konfiguration in `src/config/credits.ts`, Berechnungslogik in `src/lib/credits.ts`.

### Skala

100 Credits = 1 USD → 1 Credit = 1 Cent. Konfigurierbar via `CREDITS_PER_DOLLAR`.

### Token-basierte Berechnung

```
credits = max(1, ceil(
  (inputTokens × inputPrice
   + outputTokens × outputPrice
   + reasoningTokens × outputPrice
   - cachedInputTokens × inputPrice × 0.9)
  ÷ 1.000.000 × CREDITS_PER_DOLLAR
))
```

- **Model-Preise:** Pro Model in DB (`inputPrice.per1m`, `outputPrice.per1m`)
- **Fallback:** $1/$5 pro 1M Input/Output wenn Model keinen Preis hat
- **Cache-Rabatt:** Cached Input-Tokens bekommen 90% Rabatt (Faktor 0.9)
- **Minimum:** 1 Credit pro Request

### Tool Flat-Rates

Zusaetzlich zu Token-Kosten werden fuer bestimmte Tools fixe Credits berechnet:

| Tool               | Default | ENV Override                  |
| ------------------ | ------- | ----------------------------- |
| Bildgenerierung    | 8       | `IMAGE_GENERATION_CREDITS`    |
| Deep Research      | 400     | `DEEP_RESEARCH_CREDITS`       |
| Stitch Design      | 5       | `STITCH_GENERATION_CREDITS`   |
| YouTube Suche      | 1       | `YOUTUBE_SEARCH_CREDITS`      |
| YouTube Analyse    | 5       | `YOUTUBE_ANALYZE_CREDITS`     |
| TTS                | 3       | `TTS_CREDITS`                 |
| Branding           | 1       | `BRANDING_CREDITS`            |
| Google Search      | 1       | `GOOGLE_SEARCH_CREDITS`       |

### Atomare Deduktion

Credits werden NACH dem Chat abgezogen (in `persist/index.ts`):

```
db.transaction(async (tx) => {
  1. users.creditsBalance UPDATE (atomares Dekrement)
  2. credit_transactions INSERT (Audit-Log mit balanceAfter)
})
```

Kein Balance-Check innerhalb der Transaktion — nur Pre-flight Check (402 bei Balance <= 0 VOR Chat-Start).

### Display

| Balance       | Farbe  |
| ------------- | ------ |
| > 100 Credits | Gruen  |
| > 20 Credits  | Gelb   |
| <= 20 Credits | Rot    |

→ Pricing-Varianten: `docs/system/credit-pricing-varianten.md`

---

## Session-Wrapup-System

Konfiguration in `src/config/wrapup.ts`. Strukturierte Zusammenfassungen am Ende eines Gespraechs.

### 3 Wrapup-Typen

| Key            | Label                | Inhalt                                               |
| -------------- | -------------------- | ---------------------------------------------------- |
| `summary`      | Zusammenfassung      | Kernpunkte, Entscheidungen, offene Fragen            |
| `action-items` | Action Items         | Priorisierte Tabelle mit Aufgaben und Abhaengigkeiten |
| `prd`          | Anforderungsdokument | Must/Should/Could-Haves, Abgrenzung, offene Fragen  |

### Ausgabeformate

- **Text:** Erzeugt Markdown-Artifact via `create_artifact`
- **Audio:** Erzeugt gesprochene Zusammenfassung via `text_to_speech` (natuerlich formuliert, max. 4000 Zeichen)

### Integration

Wrapup wird als Layer 3 in den System-Prompt injiziert (exklusiv — ersetzt Skills-Uebersicht). Der Wrapup-Prompt wird via `buildWrapupPrompt(type, userContext, format)` zusammengebaut.

---

## onFinish: Was nach dem Chat passiert

Der `onFinish`-Callback in `src/app/api/chat/persist.ts` orchestriert alle Post-Response-Operationen:

### Schritt-fuer-Schritt

| #   | Operation                      | Modus              | Beschreibung                                                                           |
| --- | ------------------------------ | ------------------ | -------------------------------------------------------------------------------------- |
| 1   | **R2 File Persist**            | Awaited            | Data-URLs in User-Messages durch R2-URLs ersetzen                                      |
| 2   | **Response-Parts sammeln**     | Sync               | Assistant-Text, Tool-Calls und Tool-Results aus Response extrahieren                   |
| 3   | **Fake-Artifact-Erkennung**    | Sync               | Fuer Models ohne Tool-Calling: JSON-Output im Text erkennen und als Artifact speichern |
| 4   | **Messages + Usage speichern** | Awaited (parallel) | User-Message und Assistant-Message in DB, dann Usage-Logging                           |
| 5   | **Title-Generierung**          | Fire-and-Forget    | Bei neuem Chat: Kurztitel via LLM generieren (max 80 Zeichen)                          |
| 6   | **Expert-Wechsel**             | Fire-and-Forget    | Expert-Metadata im Chat aktualisieren wenn gewechselt                                  |
| 7   | **Credit-Deduktion**           | Awaited            | Token-Kosten berechnen, atomare DB-Transaktion (Balance + Audit-Log)                   |
| 8   | **Suggested Replies**          | Fire-and-Forget    | Antwortvorschlaege generieren (wenn User-Setting aktiv)                                |
| 9   | **Memory-Extraktion**          | Fire-and-Forget    | Mem0 Auto-Extraktion (wenn Memory aktiv + >= 6 Messages)                               |
| —   | **MCP Cleanup**                | Finally            | Alle MCP-Verbindungen schliessen                                                       |

### Awaited vs. Fire-and-Forget

**Awaited** (muss abschliessen bevor Chat als "fertig" gilt):

- Message-Persistenz — Nachrichten muessen in der DB sein
- Usage-Logging — Token-Zaehlung muss erfasst sein
- Credit-Deduktion — Bilanzierung muss atomar abschliessen

**Fire-and-Forget** (darf spaeter fertig werden):

- Title-Generierung — Kosmetisch, nicht kritisch
- Memory-Extraktion — Mem0 kann langsam sein, Chat soll nicht blockieren
- Suggested Replies — UX-Feature, nicht systemkritisch

### Fake-Artifact-Erkennung

Manche Models (z.B. aeltere Gemini-Versionen) koennen keine Tool-Calls ausfuehren, sondern geben JSON im Textformat aus. `parseFakeArtifactCall()` erkennt zwei Formate:

1. `{ "action": "create_artifact", "action_input": { ... } }` (Agent-Format)
2. `{ "type": "markdown", "title": "...", "content": "..." }` (Direktes Objekt)

Bei Erkennung wird der Text-Output durch echte Tool-Call/Result Parts ersetzt und ein Artifact in der DB angelegt.

---

## Caching-Strategie

Alle DB-backed Konfigurationen nutzen TTL-Caches auf Modul-Ebene:

| Entitaet         | TTL | Cache-Variable     | Invalidierung           |
| ---------------- | --- | ------------------ | ----------------------- |
| Models           | 60s | `cachedModels`     | `clearModelCache()`     |
| Skills           | 60s | `cachedSkills`     | `clearSkillCache()`     |
| Quicktasks       | 60s | `cachedQuicktasks` | `clearSkillCache()`     |
| MCP-Server       | 60s | `cachedMcpServers` | `clearMcpServerCache()` |
| User-Preferences | 60s | `prefsCache` (Map) | Kein expliziter Clear   |

Admin-Mutations rufen die entsprechende `clearCache()`-Funktion auf, sodass Aenderungen innerhalb von Sekunden wirksam werden (nicht erst nach 60s).

---

## Architektur-Patterns

### 1. Factory-Funktionen fuer kontextgebundene Tools

Tools, die chatId oder userId brauchen, werden als Factory erstellt. Das LLM sieht nur Parameter und Beschreibung.

### 2. DB-backed Config mit ENV-Fallback

Models, Experts, Skills, MCP-Server: DB → ENV (JSON) → Hardcoded Default. Ermoeglicht Konfiguration ohne DB-Zugang.

### 3. Geschichteter System-Prompt

7 Layer in fester Reihenfolge (Layer 0-6). Spaetere Layer haben hoehere Prioritaet. Layer 0 (Datum) ist immer erstes Element. Custom Instructions immer zuletzt.

### 4. Drei-Phasen Chat-Processing

- **Phase A** (resolve-context): Parallele DB-Queries, Cache-Aufwaermen
- **Phase B** (build-messages/tools): Message-Transformation, Tool-Registry
- **Phase C** (streamText → onFinish): Streaming, dann Persistenz

### 5. Graceful Degradation

Optionale Features fallen sauber zurueck: R2 → data-URLs, Memory → leerer Kontext, MCP → keine externen Tools. Kein Feature crasht den Chat.

### 6. Atomare Transaktionen fuer Finanzdaten

Credit-Deduktion nutzt `db.transaction()` fuer Balance-Update + Audit-Log. Verhindert Inkonsistenzen bei Concurrent Requests.
