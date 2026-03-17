# Expert & Skill System — Referenz

> Vollständige Dokumentation des Expert-, Skill- und Quicktask-Systems.
> Zielgruppe: LLMs und Builder, die Experten und Skills für die Plattform erstellen.

---

## Überblick

Die Plattform hat drei Konfigurationsebenen:

```
Experten           →  WIE die KI sich verhält (Persona, Stil, Regeln)
├── Skills         →  WAS die KI weiß (Fachwissen, on-demand ladbar)
└── Quicktasks     →  Geführte Workflows (Formular → Template → Output)
```

**Experten** definieren Persona, Tonalität und Verhalten. Sie verweisen auf **Skills** (Wissenspakete) und können Model und Temperature überschreiben. **Quicktasks** sind eine Sonderform von Skills mit Formularfeldern und Template-Rendering.

---

## 1. Experten

### Was ein Expert ist

Ein Expert ist eine vorkonfigurierte Persona mit:

- **System-Prompt** — Wie die KI spricht, denkt und antwortet
- **Bevorzugte Skills** — Welche Wissenspakete priorisiert werden
- **Model-Präferenz** — Welches KI-Modell verwendet wird
- **Temperature** — Wie kreativ vs. deterministisch die Antworten sind

### Import-Format (JSON)

Experten werden als JSON importiert über `POST /api/admin/experts`:

```json
{
  "name": "SEO-Berater",
  "slug": "seo",
  "description": "Datengetriebener SEO-Experte für Analyse und Optimierung",
  "icon": "Search",
  "systemPrompt": "Du bist ein erfahrener SEO-Berater...",
  "skillSlugs": ["seo-analysis", "content-optimization"],
  "modelPreference": "anthropic/claude-sonnet-4-6",
  "temperature": 0.5,
  "allowedTools": [],
  "mcpServerIds": [],
  "isPublic": true,
  "sortOrder": 2
}
```

### Felder im Detail

| Feld              | Typ      | Required | Beschreibung                                                               |
| ----------------- | -------- | -------- | -------------------------------------------------------------------------- |
| `name`            | string   | Ja       | Anzeigename (2-100 Zeichen)                                                |
| `slug`            | string   | Ja       | URL-sicherer Identifier (2-50 Zeichen, nur `a-z`, `0-9`, `-`)              |
| `description`     | string   | Ja       | Kurzbeschreibung für die Auswahl-UI (2-500 Zeichen)                        |
| `icon`            | string   | Nein     | Lucide Icon-Name (siehe Icon-Liste unten)                                  |
| `systemPrompt`    | string   | Ja       | Vollständiger System-Prompt (10-50.000 Zeichen)                            |
| `skillSlugs`      | string[] | Nein     | Slugs der bevorzugten Skills (max 20). Werden im Prompt mit Stern markiert |
| `modelPreference` | string   | Nein     | Gateway Model-ID (z.B. `"anthropic/claude-sonnet-4-6"`)                    |
| `temperature`     | number   | Nein     | 0.0-2.0. Niedrig = präzise, hoch = kreativ                                 |
| `allowedTools`    | string[] | Nein     | Erlaubte Tool-Namen (leer = alle). Siehe Tool-Liste                        |
| `mcpServerIds`    | string[] | Nein     | IDs externer MCP-Server (max 20)                                           |
| `isPublic`        | boolean  | Nein     | Default `true`. Steuert Sichtbarkeit in der Auswahl                        |
| `sortOrder`       | number   | Nein     | Reihenfolge in der UI (0-1000, default 0)                                  |

### System-Prompt schreiben

Der System-Prompt ist das Herzstück. Er wird als **erster Layer** im zusammengesetzten Prompt verwendet. Danach kommen automatisch: Artifact-Anweisungen, Web-Tool-Hinweise, Skills-Übersicht, Projekt-Kontext und User Custom Instructions.

**Bewährte Struktur:**

```markdown
Du bist [Rolle/Persona]. Du hilfst bei [Aufgabenbereich].

## Prinzipien
- [Kernprinzip 1]
- [Kernprinzip 2]
- [Kernprinzip 3]

## Kommunikation
- [Stil-Regel 1]
- [Stil-Regel 2]

## Ausgabeformat
- [Format-Regel 1]
- [Format-Regel 2]
```

**Tipps:**

- Persona und Rolle im ersten Satz klar definieren
- Prinzipien als priorisierte Liste
- Konkrete Anweisungen für Ausgabeformat (Tabellen, Code-Blöcke, Artifacts)
- Verbotene Muster explizit benennen (z.B. KI-Floskeln)
- Nicht wiederholen, was das System automatisch hinzufügt (Artifacts, Web-Tools, Skills)

### Temperature-Richtwerte

| Wert    | Einsatz                                | Beispiel-Experten             |
| ------- | -------------------------------------- | ----------------------------- |
| 0.1-0.3 | Präzise, deterministische Aufgaben     | Code-Assistent, Daten-Analyst |
| 0.4-0.6 | Balance zwischen Präzision und Varianz | SEO-Berater, Researcher       |
| 0.7-0.9 | Kreative Aufgaben                      | Content Writer, Brainstorming |
| 1.0+    | Experimentell, maximale Kreativität    | Selten sinnvoll               |

### Bestehende Experten (6 globale Defaults)

| Slug         | Name           | Icon      | Skills                             | Temp | Fokus                           |
| ------------ | -------------- | --------- | ---------------------------------- | ---- | ------------------------------- |
| `general`    | Allgemein      | Sparkles  | —                                  | —    | Vielseitiger Assistent          |
| `code`       | Code-Assistent | Code      | react-patterns                     | 0.3  | Clean Code, Best Practices      |
| `seo`        | SEO-Berater    | Search    | seo-analysis, content-optimization | 0.5  | Datengetriebene SEO-Analyse     |
| `analyst`    | Daten-Analyst  | BarChart3 | data-analysis                      | 0.3  | Daten, Metriken, Visualisierung |
| `researcher` | Researcher     | BookOpen  | competitor-research                | 0.5  | Systematische Recherche         |
| `writer`     | Content Writer | PenLine   | content-optimization               | 0.8  | Blog, Social Media, Marketing   |

---

## 2. Skills

### Was ein Skill ist

Ein Skill ist ein Markdown-basiertes Wissenspaket, das die KI on-demand laden kann. Skills werden im System-Prompt als Übersicht gelistet. Wenn eine Anfrage von Expertenwissen profitiert, lädt die KI den Skill via `load_skill` Tool.

### Import-Format (SKILL.md)

Skills werden als Markdown mit YAML-Frontmatter importiert über `POST /api/admin/skills`:

```yaml
---
name: SEO-Analyse
slug: seo-analysis
description: Strukturierte SEO-Analyse mit technischem Audit, Content-Bewertung und Wettbewerbsvergleich
mode: skill
---

# SEO-Analyse Framework

## 1. Technisches Audit
- Crawlability und Indexierung prüfen
- Core Web Vitals bewerten
- Mobile-Friendliness testen
...
```

### Felder im Detail (Frontmatter)

| Feld          | Typ    | Required | Beschreibung                                                   |
| ------------- | ------ | -------- | -------------------------------------------------------------- |
| `name`        | string | Ja       | Anzeigename                                                    |
| `slug`        | string | Ja       | Eindeutiger Identifier (nur `a-z`, `0-9`, `-`)                 |
| `description` | string | Ja       | Kurzbeschreibung (erscheint in der Skills-Übersicht im Prompt) |
| `mode`        | string | Nein     | `"skill"` (default) oder `"quicktask"`                         |

### Skill-Content schreiben

Der Content nach dem Frontmatter ist der eigentliche Wissensinhalt. Er wird 1:1 an die KI übergeben, wenn sie `load_skill` aufruft.

**Bewährte Struktur:**

```markdown
# [Skill-Name]

## Vorgehen
1. [Schritt 1]
2. [Schritt 2]
3. [Schritt 3]

## Checkliste
- [ ] [Prüfpunkt 1]
- [ ] [Prüfpunkt 2]

## Ausgabeformat
[Wie das Ergebnis strukturiert sein soll]
```

**Tipps:**

- Klare Schritt-für-Schritt-Anleitungen
- Checklisten für systematisches Vorgehen
- Ausgabeformat-Vorgaben (Tabellen, Markdown-Struktur)
- Nicht zu lang — die KI muss den Content in einem Tool-Call verarbeiten

---

## 3. Quicktasks

### Was ein Quicktask ist

Ein Quicktask ist ein Skill mit `mode: "quicktask"`, der ein Formular anbietet. Der User füllt Felder aus, die Werte werden in ein Markdown-Template eingesetzt, und die KI generiert daraus den Output. Quicktasks sind Ein-Schuss-Interaktionen — nach dem ersten Output wird der Chat zum normalen Chat.

### Import-Format (SKILL.md mit Quicktask-Feldern)

```yaml
---
name: KI-Bildprompt-Generator
slug: image-prompt
description: Generiert detaillierte Bildprompts für KI-Bildgeneratoren
mode: quicktask
category: Content
icon: Image
outputAsArtifact: true
temperature: 0.8
modelId: anthropic/claude-sonnet-4-6
fields:
  - key: bildidee
    label: Bildidee
    type: textarea
    required: true
    placeholder: "Beschreibe deine Bildidee..."
  - key: stil
    label: Stil
    type: select
    required: false
    options:
      - Fotorealistisch
      - Illustration
      - Abstrakt
      - Minimalistisch
  - key: seitenverhaeltnis
    label: Seitenverhältnis
    type: text
    required: false
    placeholder: "z.B. 16:9, 1:1, 4:3"
---

# Bildprompt-Generator

Erstelle einen detaillierten, professionellen Bildprompt basierend auf folgenden Angaben:

**Bildidee:** {{bildidee}}
**Stil:** {{stil | default: "Fotorealistisch"}}
**Seitenverhältnis:** {{seitenverhaeltnis | default: "1:1"}}

## Anweisungen
- Beschreibe die Szene visuell und präzise
- Nutze Fachbegriffe für Belichtung, Komposition, Farbpalette
- Gib den Prompt auf Englisch aus
- Strukturiere: Subject → Setting → Style → Technical Details
```

### Zusätzliche Frontmatter-Felder für Quicktasks

| Feld               | Typ     | Required | Beschreibung                                                         |
| ------------------ | ------- | -------- | -------------------------------------------------------------------- |
| `mode`             | string  | Ja       | Muss `"quicktask"` sein                                              |
| `category`         | string  | Nein     | Kategorie für Filter-UI (z.B. "Content", "Social Media", "Workflow") |
| `icon`             | string  | Nein     | Lucide Icon-Name                                                     |
| `outputAsArtifact` | boolean | Nein     | `true` → Ergebnis wird als Artifact im Side-Panel angezeigt          |
| `temperature`      | number  | Nein     | 0.0-2.0, überschreibt Expert- und User-Default                       |
| `modelId`          | string  | Nein     | Spezifisches Modell (höchste Priorität in der Auflösung)             |
| `fields`           | array   | Ja       | Formularfelder (siehe unten)                                         |

### Formularfeld-Schema

Jedes Feld im `fields`-Array:

| Feld          | Typ      | Required       | Beschreibung                                                           |
| ------------- | -------- | -------------- | ---------------------------------------------------------------------- |
| `key`         | string   | Ja             | Variablenname für Template (1-50 Zeichen, z.B. `bildidee`)             |
| `label`       | string   | Ja             | Anzeige-Label im Formular (1-100 Zeichen)                              |
| `type`        | string   | Ja             | `"text"` (einzeilig), `"textarea"` (mehrzeilig), `"select"` (Dropdown) |
| `required`    | boolean  | Nein           | Default `false`. Pflichtfeld im Formular                               |
| `placeholder` | string   | Nein           | Hilfetext im leeren Feld (max 200 Zeichen)                             |
| `options`     | string[] | Nur bei select | Auswahloptionen (max 20 Stück, je max 100 Zeichen)                     |

### Template-Syntax

Im Markdown-Content (nach dem Frontmatter) werden Variablen per Mustache-Syntax ersetzt:

| Syntax                            | Beschreibung                                                | Beispiel                               |
| --------------------------------- | ----------------------------------------------------------- | -------------------------------------- |
| `{{variable}}`                    | Wird durch den Feldwert ersetzt, leer wenn nicht ausgefüllt | `{{bildidee}}`                         |
| `{{variable \| default: "Wert"}}` | Fallback-Wert wenn Feld leer                                | `{{stil \| default: "Professionell"}}` |

Die `key`-Werte aus den `fields` müssen mit den `{{key}}`-Platzhaltern im Content übereinstimmen.

### Bestehende Quicktasks

| Slug               | Name                    | Category     | Artifact | Felder                                                       |
| ------------------ | ----------------------- | ------------ | -------- | ------------------------------------------------------------ |
| `image-prompt`     | KI-Bildprompt-Generator | Content      | Ja       | bildidee (textarea), stil (select), seitenverhaeltnis (text) |
| `social-media-mix` | Social-Media-Mix        | Social Media | Nein     | thema (textarea), plattformen (select), tonalitaet (select)  |
| `meeting-prep`     | Meeting-Vorbereitung    | Workflow     | Nein     | thema (text), teilnehmer (textarea), ziel (textarea)         |

---

## 4. Verfügbare Tools

Experten können über `allowedTools` steuern, welche Tools verfügbar sind. Leeres Array = alle aktiven Tools.

| Tool-Name         | Beschreibung                                                        | Immer aktiv                                      |
| ----------------- | ------------------------------------------------------------------- | ------------------------------------------------ |
| `create_artifact` | Erstellt eigenständige Outputs (HTML, Markdown, Code) im Side-Panel | Ja                                               |
| `ask_user`        | Stellt dem User strukturierte Fragen (Radio, Checkbox, Freitext)    | Ja                                               |
| `web_search`      | Sucht im Web nach aktuellen Informationen                           | Nur wenn Search-Provider konfiguriert            |
| `web_fetch`       | Ruft den Inhalt einer URL ab und liest ihn als Markdown             | Nur wenn Search-Provider konfiguriert            |
| `load_skill`      | Lädt den vollständigen Inhalt eines Skills                          | Nur wenn Skills existieren, nicht bei Quicktasks |

### create_artifact — Details

Erstellt einen eigenständigen Output, der im Side-Panel angezeigt wird.

**Typen:**

- `markdown` — Dokumente, Berichte, Anleitungen → Markdown-Rendering
- `html` — Interaktive Webseiten → Sandboxed iframe Preview
- `code` — Source Code → Syntax-Highlighting

**Wann verwenden:** Vollständige Dateien, HTML-Seiten, lange Dokumente.
**Wann nicht:** Kurze Code-Snippets, Listen, direkte Antworten.

### ask_user — Details

Pausiert den Stream und zeigt dem User ein Formular. Maximal 3 Fragen.

**Fragetypen:**

- `single_select` — Radio-Buttons (2-6 Optionen)
- `multi_select` — Checkboxen (2-6 Optionen)
- `free_text` — Freitext-Eingabe

**Wann verwenden:** Mehrdeutige Anfragen, Auswahl zwischen Optionen, fehlende Anforderungen.

---

## 5. Verfügbare Icons (Lucide)

Für `icon`-Felder bei Experten und Quicktasks. Häufig verwendete:

### Allgemein

`Sparkles`, `Star`, `Zap`, `Lightbulb`, `Brain`, `BrainCircuit`, `Target`, `Award`

### Kommunikation & Content

`PenLine`, `Pencil`, `FileText`, `BookOpen`, `MessageSquare`, `MessageCircle`, `Mail`, `Megaphone`

### Analyse & Daten

`BarChart3`, `LineChart`, `PieChart`, `TrendingUp`, `Search`, `Filter`, `Database`, `Table`

### Tech & Code

`Code`, `Terminal`, `Globe`, `Server`, `Cpu`, `Settings`, `Wrench`, `Bug`

### Medien

`Image`, `Camera`, `Video`, `Music`, `Palette`, `Brush`

### Business

`Users`, `Building`, `Briefcase`, `DollarSign`, `ShoppingCart`, `Rocket`, `Flag`

### Navigation & UI

`FolderOpen`, `Layout`, `Layers`, `Grid`, `List`, `CheckSquare`, `ClipboardList`

Vollständige Liste: https://lucide.dev/icons

---

## 6. Verfügbare Modelle

Modelle werden über ihre Gateway-ID referenziert (Format: `provider/model-name`).

### Aktuelle Modelle (Beispiele)

| Gateway-ID                    | Name             | Provider  | Region | Stärke            |
| ----------------------------- | ---------------- | --------- | ------ | ----------------- |
| `anthropic/claude-sonnet-4-6` | Claude Sonnet 4  | Anthropic | EU     | Allrounder        |
| `anthropic/claude-haiku-4-5`  | Claude Haiku 4.5 | Anthropic | EU     | Schnell & günstig |
| `openai/gpt-4.1`              | GPT-4.1          | OpenAI    | US     | Enterprise        |
| `openai/gpt-4.1-mini`         | GPT-4.1 Mini     | OpenAI    | US     | Schnell           |
| `google/gemini-2.5-flash`     | Gemini 2.5 Flash | Google    | US     | Schnell & günstig |

Die tatsächlich verfügbaren Modelle hängen von der Instanz-Konfiguration ab. Modelle können in der Admin-UI unter `/admin/models` verwaltet werden.

### Modell-Kategorien

| Kategorie    | Verwendung                               |
| ------------ | ---------------------------------------- |
| `enterprise` | Große Kontextfenster, komplexe Aufgaben  |
| `allrounder` | Ausgewogen, Allzweck                     |
| `creative`   | Kreatives Schreiben (höhere Temperature) |
| `coding`     | Code-Generierung & Debugging             |
| `analysis`   | Datenanalyse, strukturiertes Denken      |
| `fast`       | Geschwindigkeit & Kosten-Priorität       |

---

## 7. Zusammenspiel der Komponenten

### Prompt-Assembly (5 Layer)

Wenn ein Chat startet, wird der System-Prompt aus Layern zusammengesetzt:

```
Layer 1: Expert System-Prompt (oder Default-Chat-Prompt)
Layer 2: Artifact-Anweisungen (immer)
Layer 3: Web-Tool-Hinweise (wenn aktiviert)
Layer 4: Skills-Übersicht ODER Quicktask-Prompt
Layer 5: Projekt-Instruktionen (wenn Chat in Projekt)
Layer 6: User Custom Instructions (immer zuletzt, höchste Prio)
```

Bei einem Quicktask werden Layer 4 und 5 durch den gerenderten Quicktask-Prompt ersetzt.

### Auflösungskette: Modell

Wer bestimmt welches Modell verwendet wird (höchste Priorität zuerst):

1. Quicktask `modelId` — falls Quicktask aktiv
2. Expert `modelPreference` — falls Expert gewählt
3. User Default-Modell — in den Einstellungen konfiguriert
4. System Default — aus der Plattform-Konfiguration

### Auflösungskette: Temperature

1. Quicktask `temperature` — falls Quicktask aktiv
2. Expert `temperature` — falls Expert gewählt
3. System Default (0.7)

### Auflösungskette: Expert (bei neuem Chat)

1. Explizite User-Auswahl im Chat
2. Projekt `defaultExpertId` — falls Chat in einem Projekt gestartet wird
3. Kein Expert — System-Default-Prompt

### Lebenszyklus eines Quicktasks

```
1. User wählt Quicktask in der UI
2. Formular wird aus `fields` gerendert
3. User füllt aus und sendet
4. Client sendet: { quicktaskSlug, quicktaskData, messages }
5. Server lädt Skill-Content aus DB
6. Template-Rendering: {{variable}} → User-Eingaben
7. Quicktask-Prompt ersetzt Skills-Layer im System-Prompt
8. KI generiert Antwort (ggf. als Artifact)
9. Ab jetzt: normaler Chat (Quicktask-Modus gilt nur für erste Nachricht)
```

---

## 8. Vollständiges Expert-Beispiel

```json
{
  "name": "Social Media Strategist",
  "slug": "social-media",
  "description": "Strategischer Berater für Social-Media-Kanäle und Content-Planung",
  "icon": "Megaphone",
  "systemPrompt": "Du bist ein erfahrener Social-Media-Stratege mit Fokus auf B2B-Kommunikation und Thought Leadership.\n\n## Prinzipien\n- Plattform-spezifisch denken: LinkedIn ≠ Instagram ≠ X\n- Reichweite ist kein Selbstzweck. Relevanz vor Viralität.\n- Daten und Benchmarks nutzen, nicht Bauchgefühl\n- Content-Säulen statt Einzelposts denken\n\n## Kommunikation\n- Konkrete Vorschläge mit Begründung\n- Vorher/Nachher-Beispiele bei Optimierungen\n- Plattform-spezifische Formate empfehlen (Carousel, Text, Video)\n\n## Ausgabeformat\n- Tabellen für Content-Pläne und Vergleiche\n- Markdown-Artifacts für ausgearbeitete Strategien\n- Klare Handlungsschritte mit Prioritäten",
  "skillSlugs": ["content-optimization"],
  "modelPreference": null,
  "temperature": 0.6,
  "allowedTools": [],
  "mcpServerIds": [],
  "isPublic": true,
  "sortOrder": 10
}
```

## 9. Vollständiges Quicktask-Beispiel

```yaml
---
name: LinkedIn-Post Generator
slug: linkedin-post
description: Generiert einen LinkedIn-Post aus Kernaussage und Zielgruppe
mode: quicktask
category: Social Media
icon: MessageSquare
outputAsArtifact: true
temperature: 0.8
fields:
  - key: kernaussage
    label: Kernaussage
    type: textarea
    required: true
    placeholder: "Was ist die zentrale Botschaft deines Posts?"
  - key: zielgruppe
    label: Zielgruppe
    type: text
    required: false
    placeholder: "z.B. Marketing-Entscheider, Entwickler, HR"
  - key: format
    label: Format
    type: select
    required: false
    options:
      - Story
      - Listicle
      - Kontroverse These
      - How-To
      - Erfahrungsbericht
  - key: laenge
    label: Länge
    type: select
    required: false
    options:
      - Kurz (unter 500 Zeichen)
      - Mittel (500-1000 Zeichen)
      - Lang (über 1000 Zeichen)
---

# LinkedIn-Post Generator

Erstelle einen LinkedIn-Post basierend auf folgenden Angaben:

**Kernaussage:** {{kernaussage}}
**Zielgruppe:** {{zielgruppe | default: "Fach- und Führungskräfte"}}
**Format:** {{format | default: "Story"}}
**Länge:** {{laenge | default: "Mittel (500-1000 Zeichen)"}}

## Regeln
- Schreibe auf Deutsch
- Erster Satz muss Aufmerksamkeit erzeugen (Hook)
- Kein Emoji-Spam. Maximal 2-3 Emojis im gesamten Post.
- Keine Hashtag-Walls. Maximal 3 relevante Hashtags am Ende.
- Absätze kurz halten (1-2 Sätze)
- Call-to-Action am Ende (Frage oder Aufforderung)
- Keine KI-Floskeln: "In einer Welt, in der...", "bahnbrechend", "Game-Changer"
- Kontraste statt Superlative: "Von X zu Y" statt "das Beste"

## Ausgabe
Gib den fertigen Post als Markdown-Artifact aus. Keine Erklärung drumherum, nur der Post.
```

---

## 10. Import-Endpunkte

| Was               | Methode | URL                  | Body                             | Verhalten                           |
| ----------------- | ------- | -------------------- | -------------------------------- | ----------------------------------- |
| Expert            | POST    | `/api/admin/experts` | JSON (Expert-Objekt)             | Upsert by slug                      |
| Skill / Quicktask | POST    | `/api/admin/skills`  | `{ "content": "---\nname:..." }` | Upsert by slug, SKILL.md als String |
| Models            | POST    | `/api/admin/models`  | JSON-Array von Model-Objekten    | Upsert by modelId                   |

**Authentifizierung:** Alle Admin-Endpunkte erfordern eine gültige Session mit einer E-Mail aus der `ADMIN_EMAILS` Allowlist.

### Skill-Import: Body-Format

Beim Skill-Import wird der gesamte SKILL.md-Inhalt als String im `content`-Feld gesendet:

```json
{
  "content": "---\nname: Skill-Name\nslug: skill-slug\ndescription: Beschreibung\nmode: skill\n---\n\n# Content hier..."
}
```

Der Server parst den YAML-Frontmatter und den Markdown-Body automatisch.
