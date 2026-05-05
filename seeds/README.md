# Seeds — Handbuch

> Seed-Dateien definieren die Grundausstattung der Chat-Plattform: Experten, Skills, Models und MCP-Server.
> Jede Datei ist eine Markdown-Datei mit YAML-Frontmatter. Ablegen, `pnpm db:seed` ausfuehren, fertig.

---

## Schnellstart

1. Datei im passenden Ordner anlegen (z.B. `seeds/experts/mein-experte.md`)
2. Frontmatter + Content nach den Vorlagen unten ausfuellen
3. `pnpm db:seed` ausfuehren — idempotent, kann beliebig oft laufen

```
seeds/
├── experts/        ← Experten (Personas mit System-Prompt)
├── skills/         ← Skills + Quicktasks (abrufbare Faehigkeiten)
├── models/         ← AI-Modelle (Gateway-Konfiguration)
└── mcp-servers/    ← MCP-Server (externe Tool-Provider)
```

---

## 1. Experten

**Dateiname:** `seeds/experts/{slug}.md`
**Zweck:** Definiert eine Chat-Persona mit eigenem System-Prompt, zugeordneten Skills und Modell-Praeferenzen.

### Vorlage

```markdown
---
name: Anzeigename
slug: eindeutiger-slug
description: Kurzbeschreibung (1 Satz, wird in der Experten-Auswahl angezeigt)
icon: LucideIconName
skillSlugs:
  - skill-slug-1
  - skill-slug-2
temperature: 0.7
sortOrder: 0
---

Der System-Prompt steht hier als Markdown-Content.

## Ueberschriften und Formatierung sind erlaubt

- Listen
- Regeln
- Beispiele
```

### Felder

| Feld              | Pflicht | Typ      | Beschreibung                                                                                                                          |
| ----------------- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `name`            | ja      | String   | Anzeigename in der UI                                                                                                                 |
| `slug`            | ja      | String   | Eindeutige ID, kebab-case, wird fuer Upsert verwendet                                                                                 |
| `description`     | ja      | String   | Kurzbeschreibung fuer die Experten-Auswahl                                                                                            |
| `icon`            | nein    | String   | Lucide Icon Name (z.B. `Code`, `Search`, `PenLine`, `BookOpen`, `Sparkles`, `BarChart3`, `ImageIcon`, `Brain`, `Lightbulb`, `Target`) |
| `skillSlugs`      | nein    | String[] | Slugs der Skills die dieser Experte nutzen kann                                                                                       |
| `modelPreference` | nein    | String   | Gateway Model-ID (z.B. `anthropic/claude-opus-4-6`). Null = User-Default                                                              |
| `temperature`     | nein    | Number   | 0.0 - 1.0. Niedriger = praeziser, hoeher = kreativer                                                                                  |
| `allowedTools`    | nein    | String[] | Tool-Whitelist. Leer = alle Tools erlaubt                                                                                             |
| `mcpServerIds`    | nein    | String[] | IDs der MCP-Server die dieser Experte nutzen darf                                                                                     |
| `isPublic`        | nein    | Boolean  | Default: true. False = nur fuer den Ersteller sichtbar                                                                                |
| `sortOrder`       | nein    | Number   | Reihenfolge in der UI (0 = ganz oben)                                                                                                 |

### Content (System-Prompt)

Alles unterhalb der Frontmatter (`---`) wird als System-Prompt verwendet. Best Practices:

- Starte mit einer klaren Rollendefinition ("Du bist ein...")
- Definiere Prinzipien als Liste
- Nutze `##` Ueberschriften fuer Abschnitte (Prinzipien, Ausgabeformat, Verbotenes)
- Referenziere Tools mit Backticks (`create_artifact`, `web_search`)
- Halte den Prompt unter 1000 Woerter

### Beispiel

```markdown
---
name: Strategie-Berater
slug: strategy
description: Strategische Analyse und Entscheidungsfindung
icon: Target
skillSlugs:
  - competitor-research
temperature: 0.6
sortOrder: 10
---

Du bist ein erfahrener Strategie-Berater. Du hilfst bei strategischen Entscheidungen mit strukturierten Frameworks.

## Prinzipien
- Fakten vor Meinungen
- Immer Alternativen aufzeigen
- Risiken explizit benennen

## Frameworks
- SWOT fuer Situationsanalysen
- Porter's Five Forces fuer Marktanalysen
- Entscheidungsmatrizen fuer Optionsvergleiche

## Ausgabeformat
- Nutze Tabellen fuer Vergleiche
- HTML-Artifacts fuer komplexe Visualisierungen
- Klare Handlungsempfehlung am Ende
```

---

## 2. Skills

**Dateiname:** `seeds/skills/{slug}.md`
**Zweck:** Definiert eine Faehigkeit die ein Experte on-demand laden kann. Zwei Modi: `skill` (wird per Tool geladen) und `quicktask` (Formular-basiert, wird direkt ausgefuehrt).

### Vorlage: Skill

```markdown
---
name: Anzeigename
slug: eindeutiger-slug
description: Was dieser Skill kann (1 Satz)
mode: skill
---

# Skill-Name

Instruktionen fuer die KI wenn dieser Skill geladen wird.

## Vorgehen
1. Schritt eins
2. Schritt zwei

## Ausgabeformat
- Format-Vorgaben
```

### Vorlage: Quicktask

```markdown
---
name: Anzeigename
slug: eindeutiger-slug
description: Was dieser Quicktask macht (1 Satz)
mode: quicktask
category: Kategorie
icon: LucideIconName
outputAsArtifact: true
temperature: 0.7
fields:
  - key: eingabe1
    label: Beschriftung
    type: textarea
    required: true
    placeholder: "Platzhalter-Text..."
  - key: auswahl1
    label: Beschriftung
    type: select
    required: true
    options:
      - Option A
      - Option B
      - Option C
  - key: optional1
    label: Beschriftung
    type: text
    placeholder: "Optional: ..."
---

## Aufgabe

Instruktionen mit Template-Variablen: {{eingabe1}}

## Eingaben

- **Eingabe 1:** {{eingabe1}}
- **Auswahl:** {{auswahl1}}
- **Optional:** {{optional1 | default: "nicht angegeben"}}

## Output-Format

Beschreibung des gewuenschten Outputs.
```

### Felder

| Feld               | Pflicht | Typ                      | Beschreibung                                                                       |
| ------------------ | ------- | ------------------------ | ---------------------------------------------------------------------------------- |
| `name`             | ja      | String                   | Anzeigename                                                                        |
| `slug`             | ja      | String                   | Eindeutige ID, kebab-case                                                          |
| `description`      | ja      | String                   | Kurzbeschreibung                                                                   |
| `mode`             | nein    | `skill` oder `quicktask` | Default: `skill`                                                                   |
| `category`         | nein    | String                   | Nur Quicktasks: Gruppierung in der UI (z.B. `Content`, `Workflow`, `Social Media`) |
| `icon`             | nein    | String                   | Nur Quicktasks: Lucide Icon Name                                                   |
| `outputAsArtifact` | nein    | Boolean                  | Nur Quicktasks: Ergebnis als Artifact anzeigen                                     |
| `temperature`      | nein    | Number                   | 0.0 - 1.0                                                                          |
| `modelId`          | nein    | String                   | Spezifisches Modell erzwingen (Gateway-ID)                                         |
| `fields`           | nein    | Array                    | Nur Quicktasks: Formular-Felder (siehe unten)                                      |

### Field-Schema (Quicktasks)

```yaml
fields:
  - key: variablenname        # Wird als {{variablenname}} im Content referenziert
    label: Anzeige-Label       # Beschriftung im Formular
    type: text | textarea | select
    required: true | false     # Optional, default: false
    placeholder: "Hilfetext"   # Optional
    options:                   # Nur bei type: select
      - Wert 1
      - Wert 2
```

### Template-Syntax im Content

- `{{variablenname}}` — Wird durch den Formular-Wert ersetzt
- `{{variablenname | default: "Fallback"}}` — Fallback wenn leer

### Skill vs. Quicktask

|                    | Skill                                    | Quicktask                   |
| ------------------ | ---------------------------------------- | --------------------------- |
| Aktivierung        | KI laedt on-demand via `load_skill` Tool | User fuellt Formular aus    |
| Formular           | Nein                                     | Ja (`fields`)               |
| Template-Variablen | Nein (Content wird 1:1 geladen)          | Ja (`{{var}}`)              |
| Zuordnung          | Via Expert `skillSlugs`                  | Direkt in der UI waehlbar   |
| Typisch fuer       | Methodenwissen, Analyse-Frameworks       | Konkrete Aufgaben mit Input |

---

## 3. Models

**Dateiname:** `seeds/models/{name}.md`
**Zweck:** Registriert ein AI-Modell in der Datenbank. Die Model-ID entspricht dem Gateway-Format `provider/modellname`.

### Vorlage

```markdown
---
name: Anzeigename
modelId: provider/modell-id
provider: Anbietername
categories:
  - kategorie1
  - kategorie2
region: eu
contextWindow: 200000
maxOutputTokens: 16384
isDefault: false
inputPrice:
  per1m: 3.00
outputPrice:
  per1m: 15.00
sortOrder: 0
---
```

### Felder

| Feld              | Pflicht | Typ            | Beschreibung                                                                                       |
| ----------------- | ------- | -------------- | -------------------------------------------------------------------------------------------------- |
| `name`            | ja      | String         | Anzeigename in der UI                                                                              |
| `modelId`         | ja      | String         | Gateway-ID: `provider/modell` (z.B. `anthropic/claude-sonnet-4-6`)                                 |
| `provider`        | ja      | String         | Anbietername: `Anthropic`, `Google`, `OpenAI`, `Mistral`, `xAI`, `DeepSeek`                        |
| `categories`      | ja      | String[]       | Mindestens eine aus: `enterprise`, `allrounder`, `creative`, `coding`, `analysis`, `fast`, `image` |
| `region`          | ja      | `eu` oder `us` | Datenschutz-Region. EU-Modelle fuer Privacy-Routing                                                |
| `contextWindow`   | ja      | Number         | Max. Input-Tokens                                                                                  |
| `maxOutputTokens` | ja      | Number         | Max. Output-Tokens                                                                                 |
| `isDefault`       | nein    | Boolean        | Genau ein Modell sollte Default sein                                                               |
| `capabilities`    | nein    | Object         | `vision` (bool, def. false), `pdfInput` (`native`/`extract`/`none`, def. extract), `reasoning` (bool, def. false), `tools` (bool, def. true) |
| `inputPrice`      | nein    | Object         | `per1m: X.XX` — Preis pro 1M Input-Tokens in USD                                                   |
| `outputPrice`     | nein    | Object         | `per1m: X.XX` — Preis pro 1M Output-Tokens in USD                                                  |
| `isActive`        | nein    | Boolean        | Default: true. False = in DB aber nicht nutzbar                                                    |
| `sortOrder`       | nein    | Number         | Reihenfolge in der UI                                                                              |

### Kategorien erklaert

| Kategorie    | Bedeutung                                      | Beispiel                     |
| ------------ | ---------------------------------------------- | ---------------------------- |
| `enterprise` | Grosse, leistungsstarke Modelle                | Claude Opus, Gemini Pro      |
| `allrounder` | Gute Balance aus Qualitaet und Geschwindigkeit | Claude Sonnet, Mistral Large |
| `creative`   | Gut fuer Texte, Ideen, kreative Aufgaben       | Claude Opus                  |
| `coding`     | Optimiert fuer Code-Generierung                | Gemini Flash, Claude Opus    |
| `analysis`   | Stark bei Analyse und Reasoning                | Claude Opus, Gemini Pro      |
| `fast`       | Schnelle, guenstige Modelle                    | Claude Haiku, Gemini Flash   |
| `image`      | Bildgenerierung / Bildverstaendnis             | Gemini Pro Image             |

Ein Modell kann mehrere Kategorien haben.

### Kein Content

Model-Dateien haben keinen Markdown-Content unterhalb der Frontmatter. Alles steht in der Frontmatter.

---

## 4. MCP-Server

**Dateiname:** `seeds/mcp-servers/{server-id}.md`
**Zweck:** Registriert einen MCP-Server (Model Context Protocol) der zusaetzliche Tools bereitstellt.

### Vorlage

```markdown
---
name: Anzeigename
serverId: eindeutige-server-id
description: Was dieser Server bereitstellt
url: ${ENV_VAR_URL}
transport: http
headers:
  API_KEY: ${ENV_VAR_KEY}
envVar: ENV_VAR_KEY
sortOrder: 0
---
```

### Felder

| Feld           | Pflicht | Typ               | Beschreibung                                                                         |
| -------------- | ------- | ----------------- | ------------------------------------------------------------------------------------ |
| `name`         | ja      | String            | Anzeigename                                                                          |
| `serverId`     | ja      | String            | Eindeutige ID, wird als Tool-Prefix verwendet (z.B. `github` → `github__list_repos`) |
| `url`          | ja      | String            | MCP-Endpoint URL. Unterstuetzt `${VAR}` Syntax fuer ENV-Variablen                    |
| `description`  | nein    | String            | Beschreibung fuer Admin-UI                                                           |
| `transport`    | nein    | `sse` oder `http` | Default: `sse`                                                                       |
| `headers`      | nein    | Object            | Auth-Header. Werte unterstuetzen `${VAR}` Syntax                                     |
| `envVar`       | nein    | String            | ENV-Variable die diesen Server aktiviert. Server nur aktiv wenn gesetzt              |
| `enabledTools` | nein    | String[]          | Tool-Whitelist. Null = alle Tools des Servers                                        |
| `isActive`     | nein    | Boolean           | Default: true                                                                        |
| `sortOrder`    | nein    | Number            | Reihenfolge                                                                          |

### ENV-Variablen-Syntax

URLs und Header-Werte koennen `${VARIABLE_NAME}` enthalten. Zur Laufzeit wird der Wert aus `process.env` eingesetzt:

```yaml
url: ${CONTEXT7_MCP_URL}           # → process.env.CONTEXT7_MCP_URL
headers:
  Authorization: Bearer ${API_KEY}  # → "Bearer " + process.env.API_KEY
```

### Kein Content

MCP-Server-Dateien haben keinen Markdown-Content. Alles steht in der Frontmatter.

---

## Seeding ausfuehren

```bash
# Alle Seeds einspielen (idempotent)
pnpm db:seed
```

Reihenfolge: Experts → Skills → Models → MCP-Server.
Bestehende Eintraege werden per slug/modelId/serverId aktualisiert (upsert).
Manuell ueber die Admin-UI angelegte Eintraege bleiben unangetastet.

---

## Instanz-Filter (Multi-Tenant Seeding)

Jede Kunden-Instanz hat eine eigene Neon-DB und eine eigene `OIDC_CLIENT_ID`.
Damit beim Seed nur die fuer eine Instanz vorgesehenen Files in die DB landen,
gibt es zwei optionale Frontmatter-Felder:

```yaml
# Whitelist: Datei wird nur in diesen Instanzen geseedet
instances:
  - sava-aok
  - kunde-pflege-y

# Blacklist: Datei wird in allen Instanzen AUSSER diesen geseedet
excludeInstances:
  - prototype
  - demo
```

**Konvention:** Instance-Slug == `OIDC_CLIENT_ID` == loschke-auth Org-Slug.

**Default:** Wenn keines der beiden Felder gesetzt ist, wird die Datei in
allen Instanzen geseedet (= heutiges Verhalten, keine Migration noetig).

**Konflikt:** Wenn beide Felder gesetzt sind, gewinnt `instances`,
`excludeInstances` wird ignoriert (mit Warning im Log).

### Aufruf

```bash
# Standard: keine Filterung, seedt alles (Dev/CI)
pnpm db:seed

# Filterung nach Instanz-Slug
SEED_INSTANCE=sava-aok pnpm db:seed

# Listing-Modus: zeigt was geseedet wuerde, ohne DB-Writes
SEED_INSTANCE=sava-aok pnpm db:seed --dry-run
```

Am Ende eines Laufs erscheint eine Zusammenfassung pro Entitaet
(`Experts: 5 seeded, 11 skipped`). Bei `0 seeded` mit gesetztem
`SEED_INSTANCE` warnt das Skript explizit (Tippfehler im Slug?).

---

## Checkliste neue Seed-Datei

- [ ] Dateiname = slug (kebab-case, `.md`)
- [ ] Frontmatter beginnt und endet mit `---`
- [ ] Alle Pflichtfelder ausgefuellt
- [ ] `slug` / `modelId` / `serverId` ist eindeutig
- [ ] Bei Skills: `mode` korrekt (`skill` oder `quicktask`)
- [ ] Bei Quicktasks: `fields` definiert und `{{variablen}}` im Content referenziert
- [ ] Bei Experten: referenzierte `skillSlugs` existieren als Seed-Dateien
- [ ] Datei im richtigen Ordner abgelegt
- [ ] Instanz-Scope geprueft: gehoert die Datei in alle Instanzen oder
      nur in bestimmte? Bei Bedarf `instances` oder `excludeInstances` setzen.
