# System-Prompt-Architektur

Leitfaden zur Prompt-Architektur der Chat-Plattform. Beschreibt wie System-Prompts aufgebaut sind, wo Inhalte gespeichert werden und welche Stellschrauben zur Verhaltenssteuerung existieren.

---

## Prompt-Assembly: Wie der System-Prompt entsteht

Die Funktion `buildSystemPrompt()` in `src/config/prompts/index.ts` setzt den System-Prompt aus bis zu 7 Layern zusammen. Alle Layer werden mit `\n\n` getrennt und als **ein einziger System-Message** an das LLM gesendet.

Die Reihenfolge ist relevant: LLMs gewichten Instruktionen am Ende des Prompts tendenziell stärker. Deshalb steht Layer 6 (Custom Instructions) immer zuletzt.

```
┌─────────────────────────────────────────────┐
│  Layer 0: Aktuelles Datum                   │  ← Wann ist heute?
├─────────────────────────────────────────────┤
│  Layer 1: Expert-Persona (oder Default)     │  ← Wer bin ich?
├─────────────────────────────────────────────┤
│  Layer 2: Artifact-Instruktionen            │  ← Welche Tools kann ich nutzen?
│  Layer 2.1: Quellenverlinkung               │
│  Layer 2.2: Stitch Design (bedingt)         │
│  Layer 2.3: Deep Research (bedingt)         │
│  Layer 2.4: Google Search (bedingt)         │
│  Layer 2.5: YouTube / TTS (bedingt)         │
│  Layer 2.6: Web-Tools (bedingt)             │
│  Layer 2.7: MCP-Tools (bedingt)             │
│  Layer 2.8: Anthropic Skills (bedingt)      │
├─────────────────────────────────────────────┤
│  Layer 3: Skills / Quicktask / Wrapup       │  ← Was kann ich laden?
├─────────────────────────────────────────────┤
│  Layer 4: Memory-Kontext (bedingt)          │  ← Was weiß ich über den User?
├─────────────────────────────────────────────┤
│  Layer 5: Projekt-Kontext (bedingt)         │  ← In welchem Projekt bin ich?
├─────────────────────────────────────────────┤
│  Layer 6: Custom Instructions               │  ← Was will der User grundsätzlich?
│  (höchste Priorität)                        │
└─────────────────────────────────────────────┘
```

---

## Layer im Detail

### Layer 0: Aktuelles Datum (immer aktiv)

**Quelle:** `new Date().toLocaleDateString("de-DE", ...)` in `buildSystemPrompt()`

**Format:** `Aktuelles Datum: Donnerstag, 27. März 2026`

**Zweck:** Verhindert, dass das LLM veraltete Jahreszahlen in Suchstrings verwendet. Ohne diesen Layer wuerden Anfragen wie "aktuelle Nachrichten von heute" zu Suchen mit dem Trainingsdatum fuehren.

---

### Layer 1: Expert-Persona (oder Default)

**Quelle:** `experts`-Tabelle → `systemPrompt`-Feld, oder `SYSTEM_PROMPTS.chat` als Fallback

**Default-Prompt (ohne Expert):**

```
Du bist ein hilfreicher KI-Assistent. Antworte klar, präzise und auf Deutsch,
es sei denn der Nutzer schreibt auf einer anderen Sprache. Nutze Markdown für
Formatierung wenn sinnvoll.
```

**Expert-Auflösung (Priorität):**

1. `expertId` aus dem Request-Body (User wählt Expert bei neuem Chat)
2. `existingChat.expertId` (Expert aus bestehendem Chat)
3. `project.defaultExpertId` (Default-Expert des Projekts)
4. Kein Expert → Default-Prompt

**Mitgelieferte Experts (7 Default):**

| Slug         | Name            | Temperature   | Bevorzugte Skills                       |
| ------------ | --------------- | ------------- | --------------------------------------- |
| `general`    | Allgemein       | 0.7 (default) | —                                       |
| `code`       | Code-Assistent  | 0.3           | react-patterns                          |
| `seo`        | SEO-Berater     | 0.5           | seo-analysis, content-optimization      |
| `analyst`    | Daten-Analyst   | 0.3           | data-analysis                           |
| `researcher` | Researcher      | 0.5           | competitor-research                     |
| `writer`     | Content Writer  | 0.8           | content-optimization                    |
| `visual`     | Visual Designer | 0.7           | — (nur generate_image, create_artifact) |

**Dateien:**

- Default-Prompt: `src/config/prompts/` Zeile 10
- Expert-Seed: `src/lib/db/seed/default-experts.ts`
- Expert CRUD: `src/lib/db/queries/experts.ts`

---

### Layer 2: Artifact-Instruktionen (immer aktiv)

**Quelle:** Hardcoded in `SYSTEM_PROMPTS.artifacts` (`src/config/prompts/`, Zeile 13-50)

Definiert Regeln und Anwendungsfälle fuer:

| Tool                   | Zweck                                | Wann nutzen               |
| ---------------------- | ------------------------------------ | ------------------------- |
| `create_artifact`      | HTML-Seiten, Dokumente, Code-Dateien | Eigenständige Outputs     |
| `create_quiz`          | Interaktive Wissenstests             | "Teste mein Wissen..."    |
| `content_alternatives` | 2-5 inhaltliche Varianten            | Auswahl zwischen Optionen |
| `create_review`        | Abschnittsweises Feedback            | Iterative Texte/Konzepte  |

Enthält auch Regeln fuer:

- Vor Tool-Call immer kurze Einleitung schreiben
- Kein Artifact fuer kurze Snippets oder direkte Antworten
- Review bevorzugen wenn Inhalt iterativ verbessert wird
- Finales Artifact nach Review-Abschluss erstellen
- **Quellenverlinkung:** Unicode-Superscript-Zitate `⁽¹⁾` + `## Quellen` Verzeichnis bei web_search-basierten Artifacts
- **Stitch Design:** `generate_design` Instruktionen (bedingt)
- **Deep Research:** `deep_research` mit Bestaetigungspflicht via `ask_user` (bedingt)
- **Google Search:** `google_search` als ergaenzende Websuche (bedingt)
- **Anthropic Skills:** `code_execution` fuer Office-Dokument-Generierung (bedingt, nur Anthropic-Modelle)

---

### Layer 2.4: Google Search (bedingt)

**Quelle:** Hardcoded in `src/config/prompts/tools.ts`

**Aktiv wenn:** `features.googleSearch.enabled` UND kein Privacy-Routing

**Inhalt:** Instruktionen fuer Google Search Grounding — ergaenzende Websuche mit Inline-Quellen.

---

### Layer 2.5: Web-Tools (bedingt)

**Quelle:** Hardcoded in `buildSystemPrompt()` (`src/config/prompts/`, Zeile 92-94)

**Aktiv wenn:** `features.search.enabled` (mindestens ein Search-Provider-Key gesetzt: Firecrawl, Jina, Tavily, Perplexity oder SearXNG)

**Inhalt:**

```
## Web-Tools
Du hast zwei Web-Tools zur Verfügung:
- web_search: Suche im Web nach aktuellen Informationen.
- web_fetch: Rufe den Inhalt einer URL ab und lies ihn als Markdown.

Wenn der User eine URL teilt, nutze web_fetch um den Inhalt zu lesen.
Wenn der User nach aktuellen Informationen fragt, nutze web_search.
```

---

### Layer 2.6: Externe Tools / MCP (bedingt)

**Quelle:** Dynamisch aus `mcp_servers`-Tabelle

**Aktiv wenn:** MCP-Server konfiguriert, aktiv und erreichbar

**Inhalt:** Liste der verfuegbaren MCP-Tool-Namen (z.B. `github__list_repos`, `slack__send_message`)

**Expert-Filterung:** Wenn ein Expert `mcpServerIds` oder `allowedTools` definiert hat, werden nur die entsprechenden Tools gelistet.

---

### Layer 2.8: Anthropic Skills / Code Execution (bedingt)

**Quelle:** Hardcoded in `src/config/prompts/tools.ts`

**Aktiv wenn:** Anthropic-Modell ausgewaehlt UND `features.anthropicSkills.enabled`

**Inhalt:** Instruktionen fuer `code_execution` Tool — Office-Dokument-Generierung (PPTX, XLSX, DOCX, PDF). Beschreibt verfuegbare Standard-Skills und Custom-Skills.

---

### Layer 3: Skills / Quicktask / Wrapup (exklusiv)

Dieses Layer ist **mutually exclusive** — nur eine der drei Optionen ist aktiv:

**Option A — Skills-Liste** (Standard):

- Zeigt alle aktiven Skills aus der `skills`-Tabelle
- Expert-bevorzugte Skills (via `skillSlugs`) mit ⭐ markiert und zuerst sortiert
- Instruktion: "Nutze `load_skill` wenn eine Anfrage von Expertenwissen profitiert"

**Option B — Quicktask-Prompt** (bei Quicktask-Auswahl):

- Ersetzt die Skills-Liste komplett
- Template-gerendert: `{{variable}}` Platzhalter durch Formular-Eingaben ersetzt
- Nur fuer die erste Nachricht aktiv, danach normaler Chat

**Option C — Wrapup** (Session-Abschluss):

- Wird aktiviert wenn der Nutzer einen Wrapup-Typ auswaehlt
- Ersetzt die Skills-Liste komplett durch den Wrapup-Prompt
- 3 Typen: `summary` (Zusammenfassung), `action-items` (Action Items), `prd` (Anforderungsdokument)
- 2 Ausgabeformate: Text (→ `create_artifact`) oder Audio (→ `text_to_speech`)
- Prompt wird via `buildWrapupPrompt(type, userContext, format)` zusammengebaut
- Konfiguration: `src/config/wrapup.ts`

**Skill Resources:**

Wenn ein Skill Resources (Zusatzdateien) hat, wird beim `load_skill`-Aufruf ein Manifest mitgeliefert. Das LLM kann dann gezielt `load_skill_resource(skillSlug, filename)` aufrufen um einzelne Dateien zu laden.

**Dateien:**

- Prompts: `src/config/prompts/` (5 Dateien: base, artifacts, interactive, tools, index)
- Discovery: `src/lib/ai/skills/discovery.ts` (DB-Query, 60s TTL-Cache)
- Template: `src/lib/ai/skills/template.ts` (Mustache-Replacer)
- Wrapup: `src/config/wrapup.ts` (3 Typen + Prompt-Builder)
- Admin: `/admin/skills` (SKILL.md Editor, Import, Active-Toggle)

---

### Layer 4: Memory-Kontext (bedingt)

**Quelle:** Mem0 Cloud → `searchMemories()` → `formatMemoriesForPrompt()`

**Aktiv wenn (alle drei muessen zutreffen):**

1. Feature-Flag: `MEM0_API_KEY` gesetzt
2. User-Toggle: `memoryEnabled` in User-Einstellungen
3. Neuer Chat (bei bestehenden Chats wird Memory NICHT gesucht)

**Verhalten:**

- Letzte User-Nachricht (max 500 Zeichen) als Suchquery
- Mem0 liefert semantisch relevante Erinnerungen
- Max 4000 Zeichen Memory-Kontext
- 3-Sekunden Timeout (Chat funktioniert auch ohne Memory)

**Format im Prompt:**

```
## Kontext aus früheren Sessions
- Memory 1...
- Memory 2...
```

**Dateien:** `src/lib/memory/index.ts`

---

### Layer 5: Projekt-Kontext (bedingt)

**Quelle:** `projects`-Tabelle + `project_documents`-Tabelle

**Aktiv wenn:** Chat ist einem Projekt zugeordnet (`chats.projectId` gesetzt)

**Zwei Sub-Sektionen:**

1. **Projekt-Instruktionen:** Freitext aus `projects.instructions`
2. **Projekt-Dokumente:** Titel + Inhalt aus `project_documents` (nach sortOrder)

**Format im Prompt:**

```
## Projekt-Kontext
{Projekt-Instruktionen}

## Projekt-Dokumente
### {Dokument-Titel 1}
{Dokument-Inhalt 1}
### {Dokument-Titel 2}
{Dokument-Inhalt 2}
```

---

### Layer 6: Custom Instructions (immer letztes Layer)

**Quelle:** `users`-Tabelle → `customInstructions`-Feld

**Immer als letztes Layer** = hoechste Prioritaet fuer das LLM

**Format im Prompt:**

```
## Nutzer-Anweisungen
Der Nutzer hat folgende persönliche Anweisungen hinterlegt.
Berücksichtige diese bei allen Antworten:

{Custom Instructions Text}
```

**Zugang:** Einstellungen-Dialog (Zahnrad-Icon) → Custom Instructions Textarea

**API:** `PATCH /api/user/instructions` mit `{ customInstructions: "..." }`

---

## Stellschrauben fuer Verhaltensaenderungen

### Uebersicht: Was wo anpassen

| Ziel                                  | Layer | Wo anpassen                                          | Scope                    |
| ------------------------------------- | ----- | ---------------------------------------------------- | ------------------------ |
| Generelles Verhalten aendern          | 6     | Einstellungen → Custom Instructions                  | Alle Chats des Users     |
| Expert-Verhalten anpassen             | 1     | Admin → Experts → systemPrompt                       | Chats mit diesem Expert  |
| Default-Chat (ohne Expert) verbessern | 1     | `src/config/prompts/` → `SYSTEM_PROMPTS.chat`      | Chats ohne Expert        |
| Artifact-Regeln anpassen              | 2     | `src/config/prompts/` → `SYSTEM_PROMPTS.artifacts` | Alle Chats               |
| Web-Tool-Instruktionen                | 2.5   | `src/config/prompts/` → `buildSystemPrompt()`      | Alle Chats mit Web-Tools |
| Projekt-spezifisches Verhalten        | 5     | Projekt bearbeiten → Instructions + Dokumente        | Chats im Projekt         |
| Skill-Inhalte                         | 3     | Admin → Skills → SKILL.md bearbeiten                 | On-demand via load_skill |

### Empfohlenes Vorgehen

**Schritt 1: Custom Instructions (schnellster Weg)**
Ueber die UI einstellbar, kein Code-Deployment noetig. Gut fuer:

- Sprachliche Vorgaben (Tonalitaet, Duzen/Siezen, Laenge)
- Format-Praeferenzen (Listen vs. Fliesstext, Markdown-Nutzung)
- Verbotene Muster (bestimmte Phrasen, Emojis, Ueberschriften-Stil)
- Fachliche Kontextinformationen (Branche, Rolle, Vorkenntnisse)

**Schritt 2: Expert-Prompts (pro Rolle)**
Ueber Admin-UI anpassbar, kein Code-Deployment noetig. Gut fuer:

- Rollenspezifische Anweisungen (z.B. "Immer Quellen angeben")
- Expert-spezifische Tool-Nutzung (z.B. "Nutze create_review statt create_artifact")
- Temperature-Anpassung (kreativ vs. deterministisch)
- Skill-Priorisierung (welche Skills zuerst angeboten werden)

**Schritt 3: Code-Aenderungen (selten noetig)**
Nur wenn die hardcoded Layer (2, 2.5) angepasst werden muessen:

- `SYSTEM_PROMPTS.artifacts` — Wann Artifacts erstellt werden sollen
- `SYSTEM_PROMPTS.chat` — Default-Verhalten ohne Expert
- `buildSystemPrompt()` — Neue Layer hinzufuegen oder Reihenfolge aendern

---

## Architektur: Datenfluss

```
User sendet Nachricht
    │
    ▼
POST /api/chat (route.ts)
    │
    ▼
resolveContext() — Parallel:
    ├── getChatById()           → Expert + Projekt aus bestehendem Chat
    ├── getUserPreferences()    → Custom Instructions, Memory-Toggle, Default-Model
    ├── discoverSkills()        → Alle aktiven Skills (60s Cache)
    ├── getModels()             → Model-Registry (60s Cache)
    └── getMcpServers()         → MCP-Konfiguration (60s Cache)
    │
    ├── Expert aufloesen (Request → Chat → Projekt-Default)
    ├── Quicktask laden + Template rendern (wenn aktiv)
    ├── Memory suchen (nur neue Chats, 3s Timeout)
    └── Projekt-Dokumente laden
    │
    ▼
buildSystemPrompt({
    expert, skills, quicktask,
    memoryContext, projectInstructions, projectDocuments,
    customInstructions, webToolsEnabled, mcpToolNames
})
    │
    ▼
buildModelMessages()
    ├── System-Prompt als messages[0] ({role: "system"})
    ├── Anthropic Cache Control (ephemeral) wenn Anthropic-Model
    └── User/Assistant Messages danach
    │
    ▼
streamText() → AI Response
```

---

## Kern-Dateien

| Datei                                 | Beschreibung                                           |
| ------------------------------------- | ------------------------------------------------------ |
| `src/config/prompts/`               | `buildSystemPrompt()`, Default-Prompt, Artifact-Regeln |
| `src/app/api/chat/resolve-context.ts` | Orchestriert alle Layer-Inputs parallel                |
| `src/app/api/chat/build-messages.ts`  | Setzt System-Prompt als erste Message                  |
| `src/app/api/chat/build-tools.ts`     | Tool-Registry (welche Tools verfuegbar)                |
| `src/app/api/chat/route.ts`           | API-Entry-Point, ruft resolve → build → stream         |
| `src/config/ai.ts`                    | AI-Defaults (Temperature 0.7, Default Model)           |
| `src/config/features.ts`              | Feature-Flags (welche Layer aktiv)                     |
| `src/lib/ai/skills/discovery.ts`      | Skill-Discovery aus DB                                 |
| `src/lib/memory/index.ts`             | Memory-Suche + Formatierung                            |
| `src/lib/db/seed/default-experts.ts`  | 7 Default Expert-Definitionen                          |

---

## Zusaetzliche Einflussfaktoren (nicht im Prompt)

Neben dem System-Prompt beeinflussen weitere Faktoren das KI-Verhalten:

| Faktor                | Wo konfiguriert                                         | Wirkung                             |
| --------------------- | ------------------------------------------------------- | ----------------------------------- |
| **Temperature**       | Expert (DB), Quicktask (SKILL.md), Default (ai.ts: 0.7) | Kreativitaet vs. Determinismus      |
| **Model**             | User-Default, Expert-Preference, Quicktask-Override     | Faehigkeiten und Stil des Modells   |
| **Tool-Allowlist**    | Expert `allowedTools` (DB)                              | Welche Tools das Modell nutzen kann |
| **MCP-Server-Filter** | Expert `mcpServerIds` (DB)                              | Welche externen Dienste verfuegbar  |
| **Max Output Tokens** | Model-Registry (DB)                                     | Maximale Antwortlaenge              |
