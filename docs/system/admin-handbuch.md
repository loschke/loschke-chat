# Admin-Handbuch

Anleitung zur Verwaltung der KI-Chat-Plattform ueber die Admin-Oberflaeche. Zielgruppe: Instanz-Administratoren, kein Entwickler-Hintergrund noetig.

---

## Zugang

### Wer ist Admin?

Admins werden ueber die Environment-Variable `ADMIN_EMAILS` festgelegt. Mehrere Adressen kommasepariert:

```
ADMIN_EMAILS=admin@example.com,teamlead@example.com
```

Gross-/Kleinschreibung spielt keine Rolle.

### Wo finde ich die Admin-UI?

1. Im Chat einloggen
2. Unten links auf den User-Namen klicken
3. "Administration" waehlen

Der Admin-Link erscheint nur, wenn die eingeloggte Email-Adresse in `ADMIN_EMAILS` steht.

### Admin-Bereiche

| Bereich    | URL                  | Beschreibung                                     |
| ---------- | -------------------- | ------------------------------------------------ |
| Skills     | `/admin/skills`      | Wissens-Pakete und Quicktask-Workflows verwalten |
| Experts    | `/admin/experts`     | KI-Experten-Personas verwalten                   |
| Models     | `/admin/models`      | Verfuegbare KI-Modelle konfigurieren             |
| MCP-Server | `/admin/mcp-servers` | Externe Tool-Server verwalten                    |
| Credits    | `/admin/credits`     | Nutzer-Guthaben einsehen und vergeben            |
| Users      | `/admin/users`       | Nutzer-Rollen verwalten (Admin, SuperAdmin)      |
| Features   | `/admin/features`    | Feature-Status und Datenfluss-Uebersicht         |

### Rollen

| Rolle          | Zugriff                                                    |
| -------------- | ---------------------------------------------------------- |
| **User**       | Normaler Chat-Zugang, eigene Einstellungen                 |
| **Admin**      | Alles aus User + Admin-UI (Skills, Experts, Models, etc.)  |
| **SuperAdmin** | Alles aus Admin + User-Management (Rollen aendern)         |

Admin-Zugang via `ADMIN_EMAILS`, SuperAdmin via `SUPERADMIN_EMAIL` (ENV).

---

## Skills verwalten

### Was sind Skills?

Skills sind spezialisierte Wissens-Pakete im Markdown-Format. Die KI kann sie waehrend eines Chats on-demand laden, wenn eine Anfrage davon profitiert. Beispiel: Ein SEO-Analyse-Skill enthaelt detaillierte Anweisungen fuer strukturierte Website-Audits.

### Zwei Skill-Modi

| Modus         | Beschreibung               | Wie der Nutzer es erlebt                                    |
| ------------- | -------------------------- | ----------------------------------------------------------- |
| **Skill**     | On-demand Expertenwissen   | KI laedt den Skill automatisch wenn relevant                |
| **Quicktask** | Formularbasierter Workflow | Nutzer fuellt Formular aus, bekommt strukturiertes Ergebnis |

### Skills-Tabelle

Die Uebersicht zeigt alle Skills mit:

- **Name** und **Slug** (technischer Bezeichner)
- **Modus** (Skill oder Quicktask)
- **Kategorie** (nur bei Quicktasks, fuer Gruppierung)
- **Aktiv-Status** (Auge-Symbol: sichtbar/unsichtbar)
- **Sortierung** (Reihenfolge in der Anzeige)

### Skill erstellen oder importieren

1. **"Importieren"** klicken
2. Vorlage waehlen:
   - **Skill-Vorlage** — fuer on-demand Wissens-Pakete
   - **Quicktask-Vorlage** — fuer formularbasierte Workflows
3. Inhalt anpassen (Format: SKILL.md, siehe unten)
4. **"Importieren"** bestaetigen

### SKILL.md Format

Jeder Skill besteht aus einem Kopfbereich (Frontmatter) und dem eigentlichen Inhalt:

```markdown
---
name: SEO-Analyse
slug: seo-analysis
description: Strukturierte SEO-Analyse mit konkreten Handlungsempfehlungen
---

# SEO-Analyse Anweisungen

Fuehre eine strukturierte SEO-Analyse durch...
(Vollstaendige Anweisungen fuer die KI)
```

**Pflichtfelder:**

- `name` — Anzeigename
- `slug` — Technischer Bezeichner (klein, mit Bindestrichen, eindeutig)
- `description` — Kurzbeschreibung (wird der KI als Uebersicht gezeigt)

**Zusaetzliche Felder fuer Quicktasks:**

```yaml
mode: quicktask
category: Marketing           # Kategorie fuer Gruppierung
icon: Search                   # Icon-Name (Lucide Icons)
outputAsArtifact: true         # Ergebnis als herunterladbares Dokument
temperature: 0.7               # Kreativitaets-Level (0.0 = praezise, 1.0 = kreativ)
modelId: anthropic/claude-...  # Spezifisches Modell fuer diesen Quicktask
fields:                        # Formularfelder
  - key: domain
    label: Domain
    type: text
    required: true
    placeholder: "example.com"
  - key: zielgruppe
    label: Zielgruppe
    type: textarea
    required: false
  - key: sprache
    label: Sprache
    type: select
    options:
      - Deutsch
      - Englisch
```

**Feld-Typen:**

- `text` — Einzeilige Eingabe
- `textarea` — Mehrzeilige Eingabe
- `select` — Dropdown mit vordefinierten Optionen

**Template-Variablen im Inhalt:**

Der Quicktask-Inhalt kann Platzhalter nutzen, die mit den Formular-Eingaben gefuellt werden:

```markdown
Analysiere die Domain {{domain}} fuer die Zielgruppe {{zielgruppe | default: "allgemeine Nutzer"}}.
```

### Skill bearbeiten

1. In der Tabelle auf den Skill klicken
2. SKILL.md Inhalt bearbeiten (Frontmatter + Markdown)
3. **"Speichern"** klicken

### Skill aktivieren / deaktivieren

Klick auf das Auge-Symbol in der Tabelle. Deaktivierte Skills:

- Werden der KI nicht mehr angezeigt
- Koennen nicht mehr geladen werden
- Bleiben in der Datenbank (koennen reaktiviert werden)

### Skill loeschen

"Loeschen" Button in der Bearbeitungsansicht. Endgueltig, kann nicht rueckgaengig gemacht werden.

### Skills exportieren

Alle Skills koennen als Bulk-Export heruntergeladen werden:

- **API:** `GET /api/admin/export/skills`
- **Format:** JSON mit den rohen SKILL.md Inhalten

### Skill Resources (ZIP-Upload)

Skills koennen zusaetzliche Dateien mitliefern — Templates, Spezifikationen, Referenzdokumente oder Beispiele.

**Upload-Workflow:**

1. Im Skill-Editor auf "Resources" klicken
2. ZIP-Datei auswaehlen (max Groesse beachten)
3. System extrahiert Dateien und kategorisiert anhand der Ordnerstruktur:

| Ordner im ZIP  | Kategorie   | Beschreibung                              |
| -------------- | ----------- | ----------------------------------------- |
| `shared/`      | shared      | Gemeinsame Dateien ueber mehrere Skills   |
| `specs/`       | spec        | Spezifikationen und Anforderungen         |
| `templates/`   | template    | Vorlagen fuer das LLM                     |
| `references/`  | reference   | Referenzmaterial und Richtlinien          |
| `examples/`    | example     | Beispielausgaben                          |
| Root-Dateien   | shared      | Dateien ohne Ordner werden als shared kategorisiert |

**Wie Resources im Chat funktionieren:**

1. Nutzer fragt nach etwas, LLM laedt den Skill via `load_skill`
2. Das Tool-Ergebnis enthaelt ein Manifest aller verfuegbaren Resources
3. Das LLM entscheidet selbst, welche Resources es braucht
4. Per `load_skill_resource(skillSlug, filename)` werden einzelne Dateien geladen

**Einschraenkungen:**
- Pro Skill nur eine Datei mit gleichem Namen (Unique Constraint)
- Resources werden bei Skill-Loeschung automatisch mitgeloescht (CASCADE)

---

## Experts verwalten

### Was sind Experts?

Experts sind KI-Personas mit eigener Persoenlichkeit und Konfiguration. Wenn ein Nutzer einen Expert waehlt, aendert sich:

- **Wie** die KI antwortet (Tonalitaet, Struktur, Detailtiefe)
- **Welches Modell** verwendet wird (optional)
- **Wie kreativ** die KI ist (Temperature)
- **Welche Tools** die KI nutzen darf
- **Welche Skills** bevorzugt werden

### Globale vs. eigene Experts

| Typ        | Beschreibung                                 | Editierbar?     |
| ---------- | -------------------------------------------- | --------------- |
| **Global** | 7 vorinstallierte Experts (fuer alle Nutzer) | Ja, durch Admin |
| **Eigene** | Von Nutzern erstellte Experts                | Ja, durch Admin |

### 7 Standard-Experts

| Name            | Slug         | Kreativitaet  | Spezialitaet                    |
| --------------- | ------------ | ------------- | ------------------------------- |
| Allgemein       | `general`    | Mittel (0.7)  | Vielseitig, passt sich an       |
| Code-Assistent  | `code`       | Niedrig (0.3) | Programmierung, Reviews         |
| SEO-Berater     | `seo`        | Mittel (0.5)  | SEO-Analyse, Optimierung        |
| Daten-Analyst   | `analyst`    | Niedrig (0.3) | Datenauswertung, Visualisierung |
| Researcher      | `researcher` | Mittel (0.5)  | Gruendliche Recherche           |
| Content Writer  | `writer`     | Hoch (0.8)    | Texte, Blog, Social Media       |
| Visual Designer | `visual`     | Mittel (0.7)  | Bildgenerierung, Design         |

### Expert erstellen oder importieren

1. **"Importieren"** klicken
2. JSON-Format verwenden:

```json
{
  "name": "Marketing-Stratege",
  "slug": "marketing",
  "description": "Strategische Marketingberatung mit Fokus auf KMU",
  "icon": "Target",
  "systemPrompt": "Du bist ein erfahrener Marketing-Stratege...",
  "skillSlugs": ["content-optimization", "seo-analysis"],
  "modelPreference": null,
  "temperature": 0.6,
  "allowedTools": [],
  "mcpServerIds": [],
  "isPublic": true,
  "sortOrder": 10
}
```

**Feld-Erklaerungen:**

| Feld              | Beschreibung                                  | Beispiel                            |
| ----------------- | --------------------------------------------- | ----------------------------------- |
| `name`            | Anzeigename                                   | "Marketing-Stratege"                |
| `slug`            | Technischer Bezeichner (eindeutig)            | "marketing"                         |
| `description`     | Kurzbeschreibung fuer Auswahl-Grid            | "Strategische Marketingberatung..." |
| `icon`            | Lucide Icon-Name                              | "Target", "Sparkles", "Code"        |
| `systemPrompt`    | Persoenlichkeit und Anweisungen der KI        | Mehrzeiliger Text                   |
| `skillSlugs`      | Bevorzugte Skills (werden priorisiert)        | `["seo-analysis"]`                  |
| `modelPreference` | Modell-Override (`null` = User-Default)       | `"anthropic/claude-opus-4-6"`       |
| `temperature`     | Kreativitaet (0.0-1.0, `null` = Standard 0.7) | `0.3` (praezise), `0.8` (kreativ)   |
| `allowedTools`    | Tool-Whitelist (leer = alle erlaubt)          | `["create_artifact", "web_search"]` |
| `mcpServerIds`    | MCP-Server-Whitelist (leer = alle erlaubt)    | `["github"]`                        |
| `isPublic`        | Fuer alle Nutzer sichtbar?                    | `true`                              |
| `sortOrder`       | Reihenfolge im Auswahl-Grid                   | `0` (ganz vorne)                    |

### System-Prompt schreiben

Der System-Prompt ist das Herzstück eines Experts. Tipps:

- **Rolle definieren:** "Du bist ein erfahrener..." — gibt der KI eine klare Identitaet
- **Prinzipien auflisten:** Was sind die Leitlinien? "Daten vor Meinungen", "Einfach vor clever"
- **Verbotene Muster:** Was soll die KI NICHT tun? "Keine Buzzwords", "Keine Emoji-Uebertreibung"
- **Ausgabeformat:** Wie sollen Antworten strukturiert sein? "Tabellen fuer Vergleiche", "Code-Bloecke mit Highlighting"
- **Markdown nutzen:** Ueberschriften (`##`), Listen (`-`), Fettdruck (`**`) fuer Struktur

### Expert bearbeiten

1. In der Tabelle auf den Expert klicken
2. JSON-Editor oeffnet sich
3. Felder anpassen (besonders `systemPrompt` fuer Verhaltensaenderungen)
4. **"Speichern"** klicken

### Verfuegbare Tool-Namen (fuer `allowedTools`)

| Tool                   | Beschreibung                                  |
| ---------------------- | --------------------------------------------- |
| `create_artifact`      | Dokumente, HTML, Code erstellen               |
| `create_quiz`          | Interaktive Quizzes                           |
| `create_review`        | Abschnittsweises Review                       |
| `ask_user`             | Strukturierte Rueckfragen                     |
| `content_alternatives` | Varianten-Vergleich                           |
| `web_search`           | Websuche (Firecrawl/Tavily/Jina/SearXNG)      |
| `web_fetch`            | URL-Inhalt abrufen                            |
| `save_memory`          | Information merken (Mem0)                     |
| `recall_memory`        | Erinnerung abrufen (Mem0)                     |
| `generate_image`       | Bild generieren (Gemini)                      |
| `youtube_search`       | YouTube-Video-Suche                           |
| `youtube_analyze`      | YouTube-Video transkribieren und analysieren   |
| `text_to_speech`       | Text-zu-Sprache (Gemini TTS)                  |
| `extract_branding`     | Branding von Webseiten extrahieren            |
| `generate_design`      | UI-Design generieren (Stitch, fire-and-forget) |
| `deep_research`        | Tiefenrecherche (Gemini Interactions API)     |
| `google_search`        | Google Search Grounding                       |
| `code_execution`       | Office-Dokumente erstellen (Anthropic Skills) |
| `load_skill`           | Skill on-demand laden                         |
| `load_skill_resource`  | Skill-Ressourcen-Datei laden                  |

Leer lassen (`[]`) bedeutet: alle Tools erlaubt.

### Verfuegbare Icons

Die App nutzt [Lucide Icons](https://lucide.dev/icons/). Haeufig verwendete:

`Sparkles`, `Code`, `Search`, `BarChart3`, `BookOpen`, `PenLine`, `ImageIcon`, `Target`, `Brain`, `Lightbulb`, `Briefcase`, `Globe`, `Shield`, `Zap`, `Heart`, `Star`

---

## Models verwalten

### Was sind Models?

Models sind die KI-Modelle, die Nutzern zur Auswahl stehen. Jedes Model hat eigene Staerken, Preise und Faehigkeiten.

### Models-Tabelle

Die Uebersicht zeigt:

- **Name** und **Model-ID** (technischer Gateway-Bezeichner)
- **Provider** (Anthropic, Google, OpenAI, etc.)
- **Region** (EU oder US — relevant fuer Datenschutz)
- **Kategorien** (Allrounder, Coding, Creative, etc.)
- **Aktiv-Status** (nur aktive Models sind fuer Nutzer waehlbar)

### Model importieren

1. **"Importieren"** klicken
2. JSON-Array verwenden:

```json
[
  {
    "modelId": "anthropic/claude-sonnet-4-6",
    "name": "Claude Sonnet 4",
    "provider": "Anthropic",
    "categories": ["allrounder", "coding"],
    "region": "eu",
    "contextWindow": 200000,
    "maxOutputTokens": 16384,
    "isDefault": false,
    "capabilities": {
      "vision": true,
      "pdfInput": "native",
      "reasoning": true,
      "tools": true
    },
    "inputPrice": { "per1m": 3.0 },
    "outputPrice": { "per1m": 15.0 },
    "isActive": true,
    "sortOrder": 0
  }
]
```

**Feld-Erklaerungen:**

| Feld                | Beschreibung                                                                     |
| ------------------- | -------------------------------------------------------------------------------- |
| `modelId`           | Gateway-ID (Format: `provider/model-name`)                                       |
| `name`              | Anzeigename fuer Nutzer                                                          |
| `provider`          | Hersteller-Name                                                                  |
| `categories`        | Kategorien: `enterprise`, `allrounder`, `creative`, `coding`, `analysis`, `fast` |
| `region`            | Datenstandort: `eu` oder `us`                                                    |
| `contextWindow`     | Maximale Eingabelaenge in Tokens                                                 |
| `maxOutputTokens`   | Maximale Ausgabelaenge in Tokens                                                 |
| `isDefault`         | Ist das System-Standardmodell? (nur eins erlaubt)                                |
| `capabilities`      | `vision` (Bilder, def. false), `pdfInput` (`native`/`extract`/`none`, def. extract), `reasoning` (def. false), `tools` (def. true) |
| `inputPrice.per1m`  | Preis pro 1 Million Input-Tokens in Dollar                                       |
| `outputPrice.per1m` | Preis pro 1 Million Output-Tokens in Dollar                                      |
| `isActive`          | Fuer Nutzer verfuegbar?                                                          |
| `sortOrder`         | Reihenfolge in der Model-Auswahl                                                 |

### Model aktivieren / deaktivieren

Klick auf den Aktiv-Toggle in der Tabelle. Deaktivierte Models:

- Erscheinen nicht in der Model-Auswahl fuer Nutzer
- Koennen nicht fuer neue Chats gewaehlt werden
- Bestehende Chats mit diesem Model funktionieren weiterhin

### Preise und Credits

Die Preise pro Model bestimmen die Credit-Kosten pro Nachricht:

```
Credits = Token-Verbrauch × Model-Preis ÷ 1.000.000 × CREDITS_PER_DOLLAR
```

Guenstige Models (z.B. Haiku) kosten weniger Credits als teure (z.B. Opus). Wenn ein Model keine Preise hat, gelten Fallback-Preise ($1.0 Input / $5.0 Output pro 1M).

---

## MCP-Server verwalten

### Was sind MCP-Server?

MCP (Model Context Protocol) Server sind externe Dienste, die der KI zusaetzliche Werkzeuge bereitstellen. Beispiel: Ein GitHub-MCP-Server erlaubt der KI, Repositories zu durchsuchen und Issues zu erstellen.

### MCP-Server-Tabelle

Die Uebersicht zeigt:

- **Name** und **Server-ID** (wird Tool-Prefix)
- **Beschreibung**
- **Aktiv-Status**
- **Health-Check** Button (testet Verbindung)

### MCP-Server importieren

1. **"Importieren"** klicken
2. JSON-Array verwenden:

```json
[
  {
    "serverId": "github",
    "name": "GitHub",
    "description": "GitHub Repositories, Issues und Pull Requests",
    "url": "${GITHUB_MCP_URL}",
    "transport": "sse",
    "headers": {
      "Authorization": "Bearer ${GITHUB_MCP_TOKEN}"
    },
    "envVar": "GITHUB_MCP_URL",
    "enabledTools": null,
    "isActive": true,
    "sortOrder": 0
  }
]
```

**Feld-Erklaerungen:**

| Feld           | Beschreibung                                                                    |
| -------------- | ------------------------------------------------------------------------------- |
| `serverId`     | Eindeutiger Bezeichner, wird Tool-Prefix (z.B. `github` → `github__list_repos`) |
| `name`         | Anzeigename                                                                     |
| `url`          | Server-Endpoint. `${VAR}` wird durch ENV-Variable ersetzt                       |
| `transport`    | Verbindungsart: `sse` (Streaming) oder `http` (Polling)                         |
| `headers`      | Auth-Header. `${VAR}` wird durch ENV-Variable ersetzt                           |
| `envVar`       | Opt-in Gate: Server nur aktiv wenn diese ENV-Variable gesetzt ist               |
| `enabledTools` | `null` = alle Tools erlaubt, Array = nur gelistete Tools                        |
| `isActive`     | Server aktiviert?                                                               |

### Sicherheitskonzept

- **Secrets nie in der Konfiguration:** URLs und Tokens nutzen `${ENV_VAR}` Syntax. Die echten Werte stehen in den Environment Variables des Servers.
- **EnvVar Gate:** Selbst wenn ein Server in der DB konfiguriert ist, wird er nur aktiviert wenn die zugehoerige ENV-Variable gesetzt ist. Das verhindert versehentliche Aktivierung.
- **Tool-Allowlist:** Pro Server koennen erlaubte Tools eingeschraenkt werden.
- **Expert-Einschraenkung:** Experts koennen auf bestimmte MCP-Server beschraenkt werden (`mcpServerIds`).

### Health Check

Der "Health Check" Button testet:

1. Kann der Server erreicht werden?
2. Welche Tools stellt er bereit?
3. Wie schnell antwortet er? (Timeout: 5 Sekunden)

Ergebnis: Gruenes Haekchen (OK) oder Fehlermeldung.

---

## Credits verwalten

### Wie funktioniert das Credit-System?

Wenn `NEXT_PUBLIC_CREDITS_ENABLED=true` gesetzt ist, kostet jede Chat-Nachricht Credits basierend auf dem Token-Verbrauch und dem genutzten Modell.

### Nutzer-Guthaben einsehen

Die Credits-Seite im Admin-Bereich zeigt:

- Alle Nutzer mit ihrem aktuellen Guthaben
- Sortiert nach Guthaben (niedrigstes zuerst)
- Suchbar nach Email oder Nutzer-ID

### Credits vergeben

1. Nutzer in der Liste finden
2. "Credits vergeben" klicken
3. Betrag eingeben (z.B. 500 = 5,00 EUR)
4. Beschreibung eingeben (z.B. "Startguthaben")
5. **"Vergeben"** bestaetigen (Max. 10.000 Credits = 100 EUR pro Grant)

Die Vergabe wird als Transaktion im Audit-Log gespeichert.

### Credit-Berechnung verstehen

**Skala:** 100 Credits = 1 Dollar = 1 Credit = 1 Cent

```
Credits pro Nachricht = max(1, ceil(
  (inputTokens × inputPrice + outputTokens × outputPrice
   - cachedInputTokens × inputPrice × 0.9)
  ÷ 1.000.000 × CREDITS_PER_DOLLAR
))
```

- **Minimum:** 1 Credit pro Nachricht (nie kostenlos)
- **Teure Models** (Opus): Mehr Credits pro Nachricht
- **Guenstige Models** (Haiku, Flash): Weniger Credits
- **Cache-Rabatt:** Gecachte Tokens bekommen 90% Rabatt
- **Tool Flat-Rates** (zusaetzlich zu Token-Kosten):

| Tool             | Credits | Entspricht |
| ---------------- | ------- | ---------- |
| Bildgenerierung  | 8       | 0,08 EUR   |
| Deep Research    | 400     | 4,00 EUR   |
| Stitch Design    | 5       | 0,05 EUR   |
| Stitch Iteration | 3       | 0,03 EUR   |
| YouTube Suche    | 1       | 0,01 EUR   |
| YouTube Analyse  | 5       | 0,05 EUR   |
| TTS              | 3       | 0,03 EUR   |
| Branding         | 1       | 0,01 EUR   |
| Google Search    | 1       | 0,01 EUR   |

→ Konfiguration: `src/config/credits.ts`, ENV-Overrides: → Siehe `docs/system/feature-flags-konfiguration.md`

### Balance-Farben (fuer Nutzer sichtbar)

| Farbe | Bedeutung             |
| ----- | --------------------- |
| Gruen | > 100 Credits (>1€)   |
| Gelb  | 20 - 100 Credits      |
| Rot   | < 20 Credits (<0,20€) |

Bei 0 oder weniger Credits wird der Chat gesperrt (402-Fehler).

---

## Bulk-Export

Alle Entitaeten koennen als Backup oder fuer den Transfer zwischen Instanzen exportiert werden:

| Bereich    | API-Endpoint                        | Format                  |
| ---------- | ----------------------------------- | ----------------------- |
| Skills     | `GET /api/admin/export/skills`      | JSON mit rohem SKILL.md |
| Experts    | `GET /api/admin/export/experts`     | JSON-Array              |
| Models     | `GET /api/admin/export/models`      | JSON-Array              |
| MCP-Server | `GET /api/admin/export/mcp-servers` | JSON-Array              |

Die exportierten Dateien koennen direkt in einer anderen Instanz importiert werden.

---

## Haeufige Admin-Aufgaben

### "Die KI antwortet zu lang / zu kurz"

→ Expert-`systemPrompt` anpassen. Formulierung wie "Antworte kompakt in maximal 3 Absaetzen" oder "Gib ausfuehrliche, detaillierte Antworten".

### "Die KI nutzt das falsche Modell"

→ Pruefen: Hat der Expert eine `modelPreference`? Hat der User ein Default-Modell in den Einstellungen? Stimmt die Model-ID mit der Model-Registry ueberein?

### "Ein Feature fehlt fuer bestimmte Nutzer"

→ Feature-Flags in den Environment Variables pruefen. Siehe `docs/feature-flags-konfiguration.md`.

### "Neues Modell hinzufuegen"

→ Admin → Models → Importieren. Model-ID muss im Gateway-Format sein (z.B. `anthropic/claude-opus-4-6`). Preise setzen, damit Credits korrekt berechnet werden.

### "Expert verhalt sich falsch"

→ Admin → Experts → Expert oeffnen → `systemPrompt` anpassen. Fuer allgemeine Verhaltensaenderungen: Nutzer-Custom-Instructions empfehlen (gilt fuer alle Chats).

### "Skills zwischen Instanzen uebertragen"

→ Export auf Instanz A (`/api/admin/export/skills`), Import auf Instanz B (Admin → Skills → Importieren).

### "Credits-Verbrauch ueberpruefen"

→ Aktuell nur ueber die Datenbank (Tabelle `credit_transactions`). Admin-UI zeigt Balances, aber keine Transaktionshistorie. Nutzer sehen ihre eigene Historie im Einstellungen-Dialog.
