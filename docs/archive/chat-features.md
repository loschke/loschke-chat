# Chat Features: Experts, Skills, Tools & Quicktasks

> Vollständige Dokumentation des AI-Feature-Systems. Beschreibt alle Bausteine, ihre Kombinationen und das Zusammenspiel von Modellauswahl, Experts, Skills, Tools und Quicktasks.

---

## Inhaltsverzeichnis

1. [Architektur-Überblick](#architektur-überblick)
2. [Die 4 Nutzungsstufen](#die-4-nutzungsstufen)
3. [Experts](#experts)
4. [Agent Skills](#agent-skills)
5. [Tools](#tools)
6. [Quicktasks](#quicktasks)
7. [Modellmanagement](#modellmanagement)
8. [System-Prompt-Assembly](#system-prompt-assembly)
9. [Zusammenspiel: Request-Lifecycle](#zusammenspiel-request-lifecycle)
10. [Dateien-Referenz](#dateien-referenz)

---

## Architektur-Überblick

Das AI-Feature-System besteht aus vier Bausteinen, die sich schichtweise kombinieren:

```
┌─────────────────────────────────────────────────────┐
│                    Quicktasks (M4.5)                 │
│     Formularbasiert, deterministisch, Ein-Schuss     │
├─────────────────────────────────────────────────────┤
│              Experts + Skills (M4)                   │
│     Persona, Model-Preference, Skill-Zuordnung       │
├─────────────────────────────────────────────────────┤
│                   Tools (M3+)                        │
│  create_artifact, load_skill, ask_user, web_search   │
├─────────────────────────────────────────────────────┤
│              Freies Chatten (M2)                     │
│      User-Default-Modell, Custom Instructions        │
└─────────────────────────────────────────────────────┘
```

Jede Stufe baut auf den darunter liegenden auf. Ein Quicktask nutzt intern einen Expert, der Skills und Tools verwendet.

---

## Die 4 Nutzungsstufen

Die Plattform bietet vier Eskalationsstufen, absteigend nach Nutzer-Aufwand:

| Stufe | Modus                     | Nutzer-Aufwand               | KI-Steuerung                     | Konsistenz  |
| ----- | ------------------------- | ---------------------------- | -------------------------------- | ----------- |
| 1     | **Freies Chatten**        | Hoch (eigene Prompts)        | Nutzer-Default-Modell            | Niedrig     |
| 2     | **Expert-Chat**           | Mittel (Expert wählen)       | Expert bestimmt Modell + Persona | Mittel      |
| 3     | **Expert + Skills/Tools** | Mittel (Expert + Kontext)    | KI entscheidet wann Skills/Tools | Mittel-Hoch |
| 4     | **Quicktasks**            | Niedrig (Formular ausfüllen) | Alles vordefiniert               | Hoch        |

### Stufe 1: Freies Chatten

- User tippt frei in den Chat
- Nutzt das vom User konfigurierte Default-Modell (oder System-Default)
- Custom Instructions werden immer angehängt
- Alle Tools stehen zur Verfügung (Artifacts, Web-Suche, etc.)

### Stufe 2: Expert-Chat

- User wählt einen Expert aus dem Grid im Empty-State
- Expert definiert Persona (System-Prompt), bevorzugtes Modell und Temperature
- Skills werden im System-Prompt als Übersicht gelistet (Expert-bevorzugte zuerst)
- Der Chat bleibt frei, aber die KI verhält sich wie der gewählte Expert

### Stufe 3: Expert + Skills/Tools

- Wie Stufe 2, aber die KI nutzt aktiv das `load_skill` Tool um Expertenwissen nachzuladen
- Die KI entscheidet selbstständig, WANN ein Skill hilfreich ist
- Zusätzlich kann die KI `ask_user` nutzen um strukturiert Rückfragen zu stellen
- Besonders mächtig bei komplexen Aufgaben (z.B. Konkurrenzanalyse: ask_user → web_search → create_artifact)

### Stufe 4: Quicktasks

- User wählt einen Quicktask, füllt ein Formular aus, klickt Absenden
- Alles ist vordefiniert: Prompt-Template, Modell, Temperature, Output-Format
- Kein Prompting-Wissen nötig
- Der Quicktask-Modus gilt nur für die erste Nachricht. Danach wird es ein normaler Chat.

---

## Experts

Experts definieren **WIE** die KI sich verhält. Sie sind die zentrale Steuerungseinheit für Persona, Modell und Tooling.

### Was ein Expert enthält

| Feld              | Typ             | Beschreibung                                            |
| ----------------- | --------------- | ------------------------------------------------------- |
| `name`            | string          | Anzeigename (z.B. "SEO-Berater")                        |
| `slug`            | string (unique) | Technischer Identifier (z.B. "seo")                     |
| `description`     | string          | Kurzbeschreibung für die UI                             |
| `icon`            | string          | Lucide Icon-Name (z.B. "Search")                        |
| `systemPrompt`    | string          | Persona und Verhaltensanweisungen                       |
| `skillSlugs`      | string[]        | Bevorzugte Skills (werden im Prompt priorisiert)        |
| `modelPreference` | string?         | Bevorzugtes Modell (z.B. "anthropic/claude-sonnet-4-6") |
| `temperature`     | number?         | Temperature Override (0.0-1.0)                          |
| `allowedTools`    | string[]        | Erlaubte Tools (für M5 MCP vorbereitet)                 |
| `mcpServerIds`    | string[]        | Zugeordnete MCP-Server (für M5 vorbereitet)             |
| `isPublic`        | boolean         | Sichtbar für alle User                                  |
| `sortOrder`       | number          | Reihenfolge im Expert-Grid                              |

### Globale vs. User-Experts

- **Globale Experts** (`userId = NULL`): Die 6 Default-Experts. Nicht editierbar/löschbar. Werden per `pnpm db:seed` angelegt.
- **User-Experts** (mit `userId`): Individuelle Experts eines Nutzers. Volle CRUD-Rechte. (UI noch nicht implementiert.)

### Die 6 Default Experts

| Slug         | Name           | Icon      | Skills                             | Temperature    | Beschreibung                                |
| ------------ | -------------- | --------- | ---------------------------------- | -------------- | ------------------------------------------- |
| `general`    | Allgemein      | Sparkles  | —                                  | Standard (0.7) | Vielseitiger Assistent                      |
| `code`       | Code-Assistent | Code      | react-patterns                     | 0.3            | Entwickler für Code, Architektur, Debugging |
| `seo`        | SEO-Berater    | Search    | seo-analysis, content-optimization | 0.5            | Datengetriebener SEO-Experte                |
| `analyst`    | Daten-Analyst  | BarChart3 | data-analysis                      | 0.3            | Analyse, Metriken, Visualisierung           |
| `researcher` | Researcher     | BookOpen  | competitor-research                | 0.5            | Gründliche, quellenbasierte Recherche       |
| `writer`     | Content Writer | PenLine   | content-optimization               | 0.8            | Kreativer Texter für alle Kanäle            |

### Expert-Auswahl im Chat

Der Expert wird auf zwei Wegen bestimmt:

1. **Neuer Chat:** User wählt Expert im Empty-State-Grid. Die `expertId` wird mit der ersten Nachricht gesendet.
2. **Bestehender Chat:** Expert wird aus `chats.expertId` geladen. Kein Expert-Wechsel innerhalb eines Chats.

### Expert-Persistenz

- `chats.expertId` speichert die Expert-Zuordnung
- `messageMetadata` enthält `expertId` + `expertName` für Anzeige im Chat
- Expert-Badge wird in der Message-Toolbar angezeigt

### API-Endpunkte

| Endpunkt                  | Methode | Beschreibung                              |
| ------------------------- | ------- | ----------------------------------------- |
| `/api/experts`            | GET     | Alle Experts auflisten (globale + eigene) |
| `/api/experts`            | POST    | Neuen Expert erstellen                    |
| `/api/experts/[expertId]` | GET     | Einzelnen Expert laden                    |
| `/api/experts/[expertId]` | PATCH   | Expert aktualisieren                      |
| `/api/experts/[expertId]` | DELETE  | Expert löschen (nur eigene)               |

---

## Agent Skills

Skills sind **Markdown-basierte Wissenspakete**, die der KI prozedurales Expertenwissen liefern. Sie werden nicht direkt dem System-Prompt hinzugefügt, sondern **on-demand geladen** wenn die KI entscheidet, dass sie hilfreich sind.

### Skill-Typen

Es gibt zwei Skill-Modi, die sich im Frontmatter unterscheiden:

| Eigenschaft      | Skill (`mode: skill`)                      | Quicktask (`mode: quicktask`)                |
| ---------------- | ------------------------------------------ | -------------------------------------------- |
| Zweck            | Wissen on-demand laden                     | Formularbasierte Aufgabe                     |
| Auslösung        | KI entscheidet via `load_skill`            | User füllt Formular aus                      |
| Prompt           | Vollständiger Markdown-Inhalt wird geladen | Template mit `{{variable}}` Platzhaltern     |
| UI               | Keine eigene UI                            | Eigenes Formular                             |
| Felder           | Keine                                      | `fields` Array im Frontmatter                |
| Output-Steuerung | Keine                                      | `outputAsArtifact`, `temperature`, `modelId` |

### Skill-Verzeichnisstruktur

```
skills/
├── seo-analysis/
│   └── SKILL.md          ← mode: skill (Standard)
├── react-patterns/
│   └── SKILL.md          ← mode: skill
├── content-optimization/
│   └── SKILL.md          ← mode: skill
├── competitor-research/
│   └── SKILL.md          ← mode: skill
├── data-analysis/
│   └── SKILL.md          ← mode: skill
├── image-prompt/
│   └── SKILL.md          ← mode: quicktask
├── social-media-mix/
│   └── SKILL.md          ← mode: quicktask
└── meeting-prep/
    └── SKILL.md          ← mode: quicktask
```

### SKILL.md Format (Skill-Modus)

```yaml
---
name: SEO-Analyse
slug: seo-analysis
description: Strukturierte SEO-Analyse mit technischem Audit...
---

# SEO-Analyse Skill

Du bist ein erfahrener SEO-Berater. Wenn du eine Website analysierst...

## 1. Technisches SEO
- Prüfe Meta-Tags...
```

Minimales Frontmatter: `name`, `slug`, `description`. Der Markdown-Inhalt ist das Expertenwissen.

### SKILL.md Format (Quicktask-Modus)

```yaml
---
name: KI-Bildprompt-Generator
slug: image-prompt
description: Erstellt detaillierte Prompts für KI-Bildgeneratoren.
mode: quicktask
category: Content
icon: Image
outputAsArtifact: true
temperature: 0.8
modelId: anthropic/claude-sonnet-4-6   # Optional
fields:
  - key: bildidee
    label: Bildidee
    type: textarea
    required: true
    placeholder: "z.B. Ein futuristisches Büro..."
  - key: stil
    label: Stil
    type: select
    options:
      - Fotorealistisch
      - Illustration
      - 3D Rendering
---

## Aufgabe
Erstelle einen detaillierten Prompt basierend auf:

- **Bildidee:** {{bildidee}}
- **Stil:** {{stil | default: "nicht festgelegt"}}

## Output-Format
...
```

### Skill Discovery

Die Funktion `discoverSkills()` scannt beim Server-Start das `skills/` Verzeichnis:

1. Liest alle Unterverzeichnisse
2. Sucht nach `SKILL.md` in jedem Verzeichnis
3. Parst Frontmatter mit `gray-matter`
4. Validiert Pflichtfelder (`name`, `slug`, `description`)
5. Cached das Ergebnis auf Module-Level (einmalig pro Server-Prozess)

Die Trennung zwischen Skills und Quicktasks erfolgt über das `mode`-Feld:

- `discoverSkills()` gibt ALLE zurück
- `discoverQuicktasks()` filtert nur `mode === "quicktask"`
- In der Chat-Route werden Skills mit `mode === "skill"` für die Skill-Übersicht gefiltert

### Skill-Priorisierung

Im System-Prompt werden Skills nach Expert-Zuordnung sortiert:

- Skills aus `expert.skillSlugs` werden mit einem Stern (⭐) markiert und zuerst gelistet
- Übrige Skills folgen alphabetisch

### Verfügbare Skills (mode: skill)

| Slug                   | Name                | Expert-Zuordnung            |
| ---------------------- | ------------------- | --------------------------- |
| `seo-analysis`         | SEO-Analyse         | SEO-Berater                 |
| `content-optimization` | Content-Optimierung | SEO-Berater, Content Writer |
| `react-patterns`       | React Patterns      | Code-Assistent              |
| `competitor-research`  | Konkurrenzanalyse   | Researcher                  |
| `data-analysis`        | Datenanalyse        | Daten-Analyst               |

---

## Tools

Tools sind **Funktionen, die die KI aufrufen kann**. Sie erweitern die Fähigkeiten des Assistenten über reinen Text hinaus.

### Verfügbare Tools

| Tool              | Typ                         | Beschreibung                              | Besonderheiten                         |
| ----------------- | --------------------------- | ----------------------------------------- | -------------------------------------- |
| `create_artifact` | User-defined (execute)      | Erstellt Artifacts (HTML, Markdown, Code) | Content streamt automatisch zum Client |
| `load_skill`      | User-defined (execute)      | Lädt Skill-Content on-demand              | Validiert gegen verfügbare Skills      |
| `ask_user`        | User-defined (kein execute) | Strukturierte Rückfragen an den User      | Pausiert Stream, Client rendert Widget |
| `web_search`      | Provider (Anthropic)        | Websuche über Claude                      | Max 5 Aufrufe pro Request              |
| `web_fetch`       | Provider (Anthropic)        | Einzelne URL laden                        | Max 3 Aufrufe pro Request              |

### Tool-Kategorien

**User-defined Tools mit `execute`:** Server-seitige Ausführung. Das AI SDK ruft die `execute`-Funktion auf, das Ergebnis wird automatisch an das Modell zurückgegeben. Das ermöglicht Multi-Step-Flows (Modell ruft Tool → bekommt Ergebnis → schreibt weiter).

**User-defined Tools ohne `execute`:** Der Stream pausiert. Der Client rendert eine UI-Komponente (z.B. `AskUser`-Widget). Die Antwort des Users wird via `addToolResult` zurückgesendet. Der Stream wird fortgesetzt.

**Provider Tools (Anthropic):** Server-seitig von Anthropic ausgeführt. `web_search` und `web_fetch` sind spezielle Anthropic-Tools, die direkt in der Claude-Infrastruktur laufen.

### create_artifact

Erstellt eigenständige Outputs, die im Split-View-Panel angezeigt werden.

**Input-Schema:**

| Feld       | Typ                              | Beschreibung                        |
| ---------- | -------------------------------- | ----------------------------------- |
| `type`     | `"markdown" \| "html" \| "code"` | Content-Typ                         |
| `title`    | string (max 200)                 | Beschreibender Titel                |
| `content`  | string (max 500.000)             | Vollständiger Inhalt                |
| `language` | string? (max 30)                 | Programmiersprache (nur bei `code`) |

**Output:** `{ artifactId, title, type, version }`

**Streaming:** Da `content` ein Tool-Argument ist, streamt das AI SDK es automatisch zum Client. Der ArtifactPanel öffnet sich bereits während das Modell den Content generiert.

### load_skill

Lädt Skill-Content on-demand. Die KI entscheidet selbstständig, wann ein Skill hilfreich ist.

**Input-Schema:**

| Feld   | Typ    | Beschreibung                     |
| ------ | ------ | -------------------------------- |
| `name` | string | Skill-Slug (z.B. "seo-analysis") |

**Output:** `{ skill, content }` (der vollständige Markdown-Inhalt des Skills)

**Sicherheit:** Der `name`-Parameter wird gegen die Liste der entdeckten Skills validiert. Kein Path-Traversal möglich.

**Verfügbarkeit:** Das `load_skill`-Tool wird NUR registriert wenn:

- Es mindestens einen Skill mit `mode === "skill"` gibt
- KEIN Quicktask aktiv ist (Quicktasks sind self-contained)

### ask_user

Stellt strukturierte Rückfragen an den User. Hat **keine `execute`-Funktion** — der Stream pausiert.

**Input-Schema:**

| Feld                   | Typ                                                | Beschreibung              |
| ---------------------- | -------------------------------------------------- | ------------------------- |
| `questions`            | Array (1-3)                                        | Liste der Fragen          |
| `questions[].question` | string                                             | Die Frage                 |
| `questions[].type`     | `"single_select" \| "multi_select" \| "free_text"` | Fragetyp                  |
| `questions[].options`  | string[] (2-6)?                                    | Optionen für select-Typen |

**Rendering:** Der Client rendert ein `AskUser`-Widget mit:

- **single_select:** Radio-Buttons (Pill-Style)
- **multi_select:** Checkboxen (Pill-Style, mehrere auswählbar)
- **free_text:** Textarea

**Flow:**

1. Modell ruft `ask_user` mit Fragen auf
2. Stream pausiert
3. Client zeigt AskUser-Widget
4. User beantwortet Fragen
5. Antwort wird via `addToolResult` zurückgesendet
6. `sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls` triggert Fortsetzung
7. Modell erhält Antworten und fährt fort

### Tool-Verfügbarkeit nach Kontext

| Kontext               | create_artifact | load_skill                     | ask_user | web_search | web_fetch |
| --------------------- |:---------------:|:------------------------------:|:--------:|:----------:|:---------:|
| Freier Chat           | Ja              | Ja (wenn Skills vorhanden)     | Ja       | Ja         | Ja        |
| Expert-Chat           | Ja              | Ja (Expert-Skills priorisiert) | Ja       | Ja         | Ja        |
| Quicktask (1. Msg)    | Ja              | Nein (self-contained)          | Ja       | Ja         | Ja        |
| Quicktask (Follow-up) | Ja              | Ja                             | Ja       | Ja         | Ja        |

### MCP-Tools (M5 vorbereitet)

Die MCP-Infrastruktur ist bereits implementiert, aber noch ohne aktive Server:

- **Config:** `src/config/mcp.ts` mit Server-Registry
- **Aktivierung:** `MCP_ENABLED=true` + Server-spezifische Env-Vars
- **Namensgebung:** `{serverId}__{toolName}` verhindert Kollisionen
- **Expert-Scoping:** Server können auf bestimmte Experts beschränkt werden (`experts: ["code"]`)
- **Timeout:** 5s pro Server mit Graceful Degradation

---

## Quicktasks

Quicktasks sind **formularbasierte Skills** die ohne Prompting-Wissen nutzbar sind und konsistente Outputs liefern. Technisch sind sie Skills mit `mode: quicktask` im Frontmatter.

### UX-Flow

1. User klickt im Empty-State auf den "Quicktasks" Tab
2. QuicktaskSelector zeigt ein Grid mit Kategorie-Filter
3. User wählt einen Quicktask (z.B. "KI-Bildprompt-Generator")
4. QuicktaskForm rendert ein dynamisches Formular aus den `fields`
5. User füllt Felder aus und klickt "Generieren"
6. Auf dem Server:
   a. Skill-Content wird geladen
   b. Template-Variablen werden ersetzt (`{{bildidee}}` → User-Input)
   c. Optional: Artifact-Hint wird angehängt
   d. Quicktask-Modell und Temperature überschreiben die Defaults
7. Das Ergebnis erscheint als Artifact im Split-View-Panel
8. Ab der zweiten Nachricht: normaler Chat-Modus

### Template-System

Der Template-Renderer unterstützt zwei Syntax-Varianten:

```
{{variable}}                    → Ersetzt durch User-Input
{{variable | default: "Wert"}}  → Fallback wenn leer
```

**Beispiel:**

Template:

```
- **Stil:** {{stil | default: "nicht festgelegt"}}
```

User-Input: `stil = "Fotorealistisch"` → Ergebnis: `- **Stil:** Fotorealistisch`
User-Input: `stil = ""` → Ergebnis: `- **Stil:** nicht festgelegt`

### Feld-Typen

| Typ        | UI-Element   | Beschreibung                        |
| ---------- | ------------ | ----------------------------------- |
| `text`     | Input-Feld   | Einzeilige Texteingabe              |
| `textarea` | Textarea     | Mehrzeilige Texteingabe             |
| `select`   | Pill-Buttons | Auswahl aus vordefinierten Optionen |

### outputAsArtifact

Wenn `outputAsArtifact: true` im Frontmatter:

- Dem gerenderten Template wird automatisch angehängt:
  
  ```
  WICHTIG: Erstelle das Ergebnis als Artifact mit dem `create_artifact` Tool.
  ```

- Das Modell erstellt den Output als Artifact statt als Chat-Nachricht

- Der ArtifactPanel öffnet sich automatisch

### Verfügbare Quicktasks

| Slug               | Name                    | Kategorie    | Icon          | Artifact | Temperature |
| ------------------ | ----------------------- | ------------ | ------------- |:--------:|:-----------:|
| `image-prompt`     | KI-Bildprompt-Generator | Content      | Image         | Ja       | 0.8         |
| `social-media-mix` | Social-Media-Mix        | Social Media | Share2        | Ja       | 0.7         |
| `meeting-prep`     | Meeting-Vorbereitung    | Workflow     | CalendarCheck | Ja       | 0.5         |

### Neuen Quicktask erstellen

1. Verzeichnis anlegen: `skills/{slug}/SKILL.md`

2. Frontmatter mit Pflichtfeldern:
   
   ```yaml
   ---
   name: Mein Quicktask
   slug: mein-quicktask
   description: Was der Quicktask macht
   mode: quicktask
   category: MeineKategorie
   icon: LucideIconName
   fields:
     - key: eingabe
       label: Eingabe-Label
       type: textarea
       required: true
       placeholder: "Platzhalter..."
   ---
   ```

3. Template-Content mit `{{key}}` Platzhaltern schreiben

4. Optional: `outputAsArtifact: true`, `temperature`, `modelId`

5. Server neustarten (oder Skill-Cache leeren)

### API-Endpunkt

| Endpunkt                 | Methode | Beschreibung                                   |
| ------------------------ | ------- | ---------------------------------------------- |
| `/api/skills/quicktasks` | GET     | Quicktask-Metadaten (ohne modelId/temperature) |

---

## Modellmanagement

### Model Registry

Modelle werden via `MODELS_CONFIG` Environment-Variable konfiguriert (JSON-Array). Kein Deployment nötig.

**Schema pro Modell:**

| Feld              | Typ             | Beschreibung                                               |
| ----------------- | --------------- | ---------------------------------------------------------- |
| `id`              | string          | Vollständige Model-ID (z.B. "anthropic/claude-sonnet-4-6") |
| `name`            | string          | Anzeigename                                                |
| `provider`        | string          | Provider-Name (z.B. "Anthropic")                           |
| `categories`      | ModelCategory[] | Zweck-Kategorien                                           |
| `region`          | "eu" \| "us"    | Datenschutz-Region                                         |
| `contextWindow`   | number          | Kontext-Fenster in Tokens                                  |
| `maxOutputTokens` | number          | Maximale Output-Tokens                                     |
| `isDefault`       | boolean         | Ist dies das System-Default?                               |

**Kategorien:** `enterprise`, `allrounder`, `creative`, `coding`, `analysis`, `fast`

**Fallback:** Wenn `MODELS_CONFIG` nicht gesetzt: eingebauter Minimal-Fallback (Claude Sonnet 4).

### Modell-Auflösungskette

Die Modell-Auswahl folgt einer strikten Prioritätskette (hoch → niedrig):

```
┌─────────────────────────┐
│ 1. Quicktask modelId    │  ← SKILL.md Frontmatter
├─────────────────────────┤
│ 2. Expert modelPreference│  ← Expert-DB-Eintrag
├─────────────────────────┤
│ 3. User defaultModelId  │  ← users.default_model_id
├─────────────────────────┤
│ 4. Request modelId      │  ← Vom Client gesendet
├─────────────────────────┤
│ 5. System Default       │  ← aiDefaults.model (ENV)
└─────────────────────────┘
```

Jede Stufe wird gegen die Model-Registry validiert. Ist ein Modell ungültig, fällt die Kette zur nächsten Stufe durch.

**Konkreter Code-Flow:**

```typescript
// Erste Auflösung (Wunsch)
const resolvedModelId = quicktaskMeta?.modelId
  ?? expert?.modelPreference
  ?? userPrefs.defaultModelId
  ?? modelId  // vom Client

// Validierung mit Fallthrough
let finalModelId = modelId
if (getModelById(resolvedModelId))           finalModelId = resolvedModelId
else if (getModelById(expert?.modelPreference)) finalModelId = expert.modelPreference
else if (getModelById(userPrefs.defaultModelId)) finalModelId = userPrefs.defaultModelId
```

### Temperature-Auflösung

Analog zum Modell, aber nur 3 Stufen:

```
1. Quicktask temperature    ← SKILL.md Frontmatter
2. Expert temperature       ← Expert-DB-Eintrag
3. System Default (0.7)     ← aiDefaults.temperature
```

### User-Default-Modell

- Gespeichert in `users.default_model_id` (nullable text-Spalte)
- Konfigurierbar im Einstellungen-Dialog (zahnrad-Icon im Header)
- Der Einstellungen-Dialog zeigt alle verfügbaren Modelle als Dropdown
- Option "System-Standard" setzt den Wert auf `null` (nutzt den Fallback)
- Kein ModelPicker im Chat-Input (wurde in M4.5 entfernt)

### API-Endpunkte

| Endpunkt                 | Methode | Beschreibung                                       |
| ------------------------ | ------- | -------------------------------------------------- |
| `/api/models`            | GET     | Alle Modelle + Kategorie-Gruppen                   |
| `/api/user/instructions` | GET     | Custom Instructions + defaultModelId               |
| `/api/user/instructions` | PUT     | Custom Instructions + defaultModelId aktualisieren |

---

## System-Prompt-Assembly

Der System-Prompt wird aus 5 Schichten zusammengebaut. Die Funktion `buildSystemPrompt()` in `src/config/prompts.ts` kombiniert sie:

```
┌──────────────────────────────────────────┐
│ 1. Expert Persona ODER Default-Prompt    │  ← Grundverhalten
├──────────────────────────────────────────┤
│ 2. Artifact Instructions (immer)         │  ← Wann create_artifact nutzen
├──────────────────────────────────────────┤
│ 3a. Quicktask-Prompt                     │  ← ODER
│ 3b. Skills-Übersicht                     │  ← (nicht beides)
├──────────────────────────────────────────┤
│ 4. Projekt-Kontext (M7, vorbereitet)     │  ← Noch nicht aktiv
├──────────────────────────────────────────┤
│ 5. Custom Instructions (immer zuletzt)   │  ← Höchste Priorität
└──────────────────────────────────────────┘
```

### Schicht 1: Persona

**Ohne Expert:** Standard-Prompt ("Du bist ein hilfreicher KI-Assistent...")
**Mit Expert:** Der `systemPrompt` des gewählten Experts

### Schicht 2: Artifact Instructions

Immer enthalten. Beschreibt wann und wie `create_artifact` zu verwenden ist. Gilt für alle Modi.

### Schicht 3: Skills ODER Quicktask

**Quicktask aktiv:** Der gerenderte Quicktask-Prompt (Template mit eingesetzten Variablen) wird als dritte Schicht eingefügt. Keine Skills-Übersicht.

**Kein Quicktask:** Alle Skills (`mode: skill`) werden als Übersicht gelistet:

```
## Verfügbare Skills

Du kannst spezialisierte Anweisungen mit dem `load_skill` Tool laden.

- **SEO-Analyse** (`seo-analysis`) ⭐: Strukturierte SEO-Analyse...
- **Content-Optimierung** (`content-optimization`): Texte verbessern...
- **React Patterns** (`react-patterns`): Best Practices...
```

Expert-bevorzugte Skills (aus `expert.skillSlugs`) werden mit ⭐ markiert und zuerst sortiert.

### Schicht 4: Projekt-Kontext

Für M7 (Projects) vorbereitet. Noch nicht aktiv.

### Schicht 5: Custom Instructions

Vom User im Einstellungen-Dialog hinterlegt. Wird immer als letztes angehängt und hat damit die höchste Priorität:

```
## Nutzer-Anweisungen
Der Nutzer hat folgende persönliche Anweisungen hinterlegt.
Berücksichtige diese bei allen Antworten:

[User-Text]
```

### Prompt Caching

Für Anthropic-Modelle wird `cacheControl: { type: "ephemeral" }` auf den System-Prompt gesetzt. Dadurch wird der System-Prompt (der sich zwischen Nachrichten nicht ändert) gecached und reduziert Token-Kosten bei Follow-up-Nachrichten.

---

## Zusammenspiel: Request-Lifecycle

### Szenario 1: Freier Chat (ohne Expert)

```
User tippt "Erkläre mir Docker" → Client sendet an /api/chat
                                   │
                                   ▼
                    ┌─ Model: User-Default oder System-Default
                    ├─ System-Prompt:
                    │   1. Default-Prompt
                    │   2. Artifact Instructions
                    │   3. Skills-Übersicht
                    │   5. Custom Instructions
                    ├─ Tools: create_artifact, load_skill, ask_user, web_search, web_fetch
                    └─ Temperature: 0.7 (System-Default)
```

### Szenario 2: Expert-Chat (SEO-Berater)

```
User wählt "SEO-Berater" → tippt "Analysiere example.com"
                            │
                            ▼
              ┌─ Expert geladen: seo (aus DB)
              ├─ Model: Expert-Preference oder User-Default
              ├─ System-Prompt:
              │   1. SEO-Berater Persona
              │   2. Artifact Instructions
              │   3. Skills-Übersicht (seo-analysis ⭐, content-optimization ⭐ zuerst)
              │   5. Custom Instructions
              ├─ Tools: create_artifact, load_skill, ask_user, web_search, web_fetch
              └─ Temperature: 0.5 (Expert-Override)
```

**Möglicher Multi-Step-Flow:**

1. Modell lädt `seo-analysis` Skill via `load_skill`
2. Modell nutzt `web_fetch` um example.com zu analysieren
3. Modell erstellt HTML-Dashboard via `create_artifact`

### Szenario 3: Quicktask (Bildprompt-Generator)

```
User wählt "KI-Bildprompt-Generator" → füllt Formular aus → klickt Generieren
                                         │
                                         ▼
                           ┌─ quicktaskSlug: "image-prompt"
                           ├─ quicktaskData: { bildidee: "...", stil: "..." }
                           ├─ SKILL.md geladen, Template gerendert
                           ├─ Artifact-Hint angehängt (outputAsArtifact: true)
                           ├─ Model: Quicktask-modelId oder Fallthrough
                           ├─ System-Prompt:
                           │   1. Default-Prompt (kein Expert)
                           │   2. Artifact Instructions
                           │   3. Quicktask-Prompt (gerendertes Template)
                           │   5. Custom Instructions
                           ├─ Tools: create_artifact, ask_user, web_search, web_fetch
                           │         (KEIN load_skill — Quicktask ist self-contained)
                           └─ Temperature: 0.8 (Quicktask-Override)
```

**Ergebnis:** Markdown-Artifact mit Prompt-Variationen im Split-View-Panel.

### Szenario 4: Researcher mit Multi-Tool-Flow

```
User wählt "Researcher" → tippt "Analysiere die Wettbewerber von Notion"
                           │
                           ▼
             ┌─ Expert: researcher
             ├─ System-Prompt enthält competitor-research ⭐ als bevorzugten Skill
             └─ Multi-Step-Flow:

Step 1: Modell ruft load_skill("competitor-research") auf
        → Erhält detailliertes Analyse-Framework

Step 2: Modell ruft ask_user auf
        → "Welche Branche genau? Kennen Sie schon Wettbewerber?"
        → Stream pausiert, Widget erscheint
        → User antwortet

Step 3: Modell ruft web_search("Notion competitors 2025") auf
        → Erhält Suchergebnisse

Step 4: Modell ruft web_fetch für einzelne Competitor-Websites auf
        → Erhält Pricing, Features, Positionierung

Step 5: Modell ruft create_artifact(type: "html") auf
        → Erstellt interaktives Wettbewerbs-Dashboard
        → Streamt Content → ArtifactPanel öffnet sich live
```

### Szenario 5: Follow-up nach Quicktask

```
Quicktask "Bildprompt" erstellt Artifact
                │
                ▼
User tippt Follow-up: "Mach den Prompt kürzer"
                │
                ▼ (ab jetzt normaler Chat-Modus)
  ┌─ quicktaskSlug: null (nur 1. Nachricht)
  ├─ Vorherige Messages inkl. Tool-History werden gesendet
  ├─ step-start Parts erhalten für korrekte Message-Struktur
  ├─ Model: User-Default (Quicktask-Override gilt nur für 1. Msg)
  ├─ Tools: ALLE (inkl. load_skill, da kein Quicktask mehr)
  └─ Temperature: System-Default (0.7)
```

---

## Dateien-Referenz

### Konfiguration

| Datei                   | Beschreibung                                     |
| ----------------------- | ------------------------------------------------ |
| `src/config/ai.ts`      | AI-Defaults (Model-Getter, Temperature)          |
| `src/config/models.ts`  | Model Registry (ENV-Parser, Kategorien, Helpers) |
| `src/config/prompts.ts` | System-Prompt-Assembly (buildSystemPrompt)       |
| `src/config/mcp.ts`     | MCP Server-Registry (M5 vorbereitet)             |

### Expert-System

| Datei                                     | Beschreibung                                           |
| ----------------------------------------- | ------------------------------------------------------ |
| `src/lib/db/schema/experts.ts`            | Drizzle Schema (nanoid PK, jsonb Arrays)               |
| `src/lib/db/queries/experts.ts`           | CRUD + upsert (seed), userId-Scoping                   |
| `src/lib/db/seed/default-experts.ts`      | 6 Default-Expert-Definitionen                          |
| `src/lib/db/seed/seed-experts.ts`         | Idempotentes Seeding (upsert by slug)                  |
| `src/types/expert.ts`                     | TypeScript Interfaces (Expert, Create, Update, Public) |
| `src/app/api/experts/route.ts`            | GET (list) + POST (create)                             |
| `src/app/api/experts/[expertId]/route.ts` | GET + PATCH + DELETE                                   |
| `src/components/chat/expert-selector.tsx` | Expert-Grid UI im Empty-State                          |

### Skill-System

| Datei                                    | Beschreibung                              |
| ---------------------------------------- | ----------------------------------------- |
| `src/lib/ai/skills/discovery.ts`         | Skill-Discovery, Quicktask-Filter, Cache  |
| `src/lib/ai/skills/template.ts`          | Mustache-Style Template-Renderer          |
| `src/lib/ai/tools/load-skill.ts`         | load_skill Tool (Factory, Validierung)    |
| `src/app/api/skills/quicktasks/route.ts` | GET Endpoint (Public Quicktask-Metadaten) |
| `skills/*/SKILL.md`                      | Skill-Dateien (Skills + Quicktasks)       |

### Tools

| Datei                                       | Beschreibung                                  |
| ------------------------------------------- | --------------------------------------------- |
| `src/lib/ai/tools/create-artifact.ts`       | create_artifact Tool (Factory mit chatId)     |
| `src/lib/ai/tools/load-skill.ts`            | load_skill Tool (Factory mit Skills-Liste)    |
| `src/lib/ai/tools/ask-user.ts`              | ask_user Tool (kein execute, pausiert Stream) |
| `src/components/generative-ui/ask-user.tsx` | AskUser Widget (Radio/Checkbox/Textarea)      |

### Quicktask-UI

| Datei                                        | Beschreibung                                 |
| -------------------------------------------- | -------------------------------------------- |
| `src/components/chat/quicktask-selector.tsx` | Grid mit Kategorie-Filter-Tabs               |
| `src/components/chat/quicktask-form.tsx`     | Dynamisches Formular aus Skill-Fields        |
| `src/components/chat/chat-empty-state.tsx`   | Tabs (Experten/Quicktasks), Formular-Ansicht |

### Chat-Route (Zentrale Integration)

| Datei                               | Beschreibung                                                                                             |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/app/api/chat/route.ts`         | Unified Chat API: Expert-Resolution, Quicktask-Rendering, Model-Chain, Tool-Setup, Streaming, Persistenz |
| `src/app/api/chat/schema.ts`        | Zod-Schema (Messages, chatId, modelId, expertId, quicktaskSlug, quicktaskData)                           |
| `src/components/chat/chat-view.tsx` | Client: useChat, Transport, Expert/Quicktask-State                                                       |
| `src/hooks/use-artifact.ts`         | Artifact-Detection, mapSavedPartsToUI (step-start Handling)                                              |

---

## Neuen Skill/Quicktask/Expert hinzufuegen: Checkliste

### Neuer Skill

1. `skills/{slug}/SKILL.md` erstellen
2. Frontmatter: `name`, `slug`, `description`
3. Markdown-Inhalt: Expertenwissen
4. Optional: Expert-Zuordnung in `skillSlugs` eines Experts

### Neuer Quicktask

1. `skills/{slug}/SKILL.md` erstellen
2. Frontmatter: `name`, `slug`, `description`, `mode: quicktask`, `category`, `icon`, `fields`
3. Template-Content mit `{{key}}` Platzhaltern
4. Optional: `outputAsArtifact`, `temperature`, `modelId`

### Neuer Default Expert

1. Eintrag in `src/lib/db/seed/default-experts.ts`
2. `pnpm db:seed` ausführen (idempotent)

### Neues Tool

1. Tool-Definition in `src/lib/ai/tools/{name}.ts`
2. In `src/app/api/chat/route.ts` importieren und zum `tools`-Objekt hinzufügen
3. Bei Tools ohne `execute`: Client-Komponente in `src/components/generative-ui/` erstellen
4. Teil-Rendering in `src/components/chat/chat-message.tsx` ergänzen
