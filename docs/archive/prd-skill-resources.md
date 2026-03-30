# PRD: Skill-System Erweiterung

> Von flachen Markdown-Skills zu einem Skill-System mit Ressourcen-Dateien (CSS, HTML-Templates, Referenz-Docs, Specs).

**Status:** Entwurf
**Datum:** 2026-03-28

---

## Problem

Das aktuelle Skill-System speichert Skills als einzelnen Markdown-String. Das reicht fuer einfache Anweisungstexte, versagt aber bei komplexeren Skills:

- **Design-Skills** (carousel-factory, ebook-factory) bestehen aus 30+ Dateien: CSS-Assets, HTML-Templates, Markdown-Spezifikationen pro Slide-/Seitentyp
- **Tool-Skills** (page-scraper, ai-seo-engine) brauchen API-Referenzdokumente und Konzepterklaerungen als Kontext

Alle Ressourcen in SKILL.md zu packen wuerde 50.000+ Tokens verbrauchen. Das ist weder bezahlbar noch sinnvoll, weil die AI selten alle Ressourcen gleichzeitig braucht.

---

## Scope und Abgrenzung

### MVP (dieses PRD)

- **Eigene Skills nach definiertem Schema** erstellen und importieren
- Ressourcen-Dateien in DB speichern und on-demand laden
- ZIP-Import im Admin
- Seed-Script fuer Skill-Verzeichnisse

### Drittanbieter-Kompatibilitaet (Fallback, nicht Design-Treiber)

Externe Skills (z.B. aus oeffentlichen Repos) koennen importiert werden, solange sie ein SKILL.md im Root haben. Dateien die nicht ins Schema passen, werden als unkategorisierte Ressourcen gespeichert. Die AI sieht Dateinamen und entscheidet selbst, was sie braucht.

### Nicht in diesem PRD

- Skill-Chaining (chains_from/chains_to, Pipeline-Runtime)
- Skill-Registry mit Trigger-Conditions
- Script-Execution (ausfuehrbarer Code in Skills)
- Input/Output-Typisierung zur Laufzeit

---

## Skill-Schema (verbindlich fuer eigene Skills)

### Verzeichnis-Struktur

```
skill-name/
├── SKILL.md              ← Pflicht. Hauptanweisungen + Frontmatter.
├── shared/               ← Basis-Assets, bei jeder Ausgabe noetig.
│   ├── base.css
│   └── brands.css
├── specs/                ← Spezifikationen pro Typ (Regeln, Constraints).
│   ├── titel-slides.md
│   └── quote-slides.md
├── templates/            ← Funktionierende Beispiele pro Typ.
│   ├── titel-slides.html
│   └── quote-slides.html
├── references/           ← Hintergrunddokumente (API-Docs, Konzepte).
│   └── api-reference.md
└── examples/             ← Vollstaendige Referenz-Implementierungen.
    └── example-loschke-light.html
```

### Ordner-Konvention

| Ordner        | Zweck                                           | Wann die AI sie laedt                   |
| ------------- | ----------------------------------------------- | --------------------------------------- |
| `shared/`     | CSS, Shell-HTML, strukturelle Basis             | Fast immer, wenn der Skill aktiv ist    |
| `specs/`      | Design-Regeln, Constraints, Validierung pro Typ | Wenn ein bestimmter Typ erstellt wird   |
| `templates/`  | HTML-Beispiele mit eingebettetem CSS            | Als Vorlage fuer die Ausgabe            |
| `references/` | API-Docs, Konzepte, Setup-Guides                | Bei Bedarf fuer Hintergrundwissen       |
| `examples/`   | Fertige Beispiele als Referenz                  | Zur Orientierung bei komplexen Ausgaben |

**Nicht jeder Skill braucht alle Ordner.** Ein Referenz-Skill hat vielleicht nur `references/`, ein Design-Skill nur `shared/` + `specs/` + `templates/`.

### SKILL.md Ressourcen-Sektion

Jedes SKILL.md mit Ressourcen enthaelt eine explizite Sektion, die der AI sagt, wann welche Ressourcen relevant sind:

```markdown
## Ressourcen

Dieser Skill hat zusaetzliche Dateien. Lade sie mit `load_skill_resource`.

### Immer laden
- `shared/base.css` — Basis-Styling fuer alle Ausgaben
- `shared/brands.css` — Brand-Farben (loschke.ai, unlearn.how, lernen.diy)

### Pro Slide-Typ laden
Lade die Spec + Template fuer den jeweiligen Typ:
- `specs/titel-slides.md` + `templates/titel-slides.html`
- `specs/quote-slides.md` + `templates/quote-slides.html`
- ...

### Bei Bedarf
- `examples/example-loschke-light.html` — Komplettes Beispiel zur Orientierung
```

Diese Sektion ist Prosa fuer die AI, kein maschinenlesbares Format. Die AI entscheidet auf Basis dieser Anweisungen, was sie laedt.

---

## Bestandsaufnahme: Existierende Skills

### Eigene Skills (docs/skills/)

| Skill                    | Stufe       | Ordner-Mapping                                                                   |
| ------------------------ | ----------- | -------------------------------------------------------------------------------- |
| **carousel-factory**     | Asset-Skill | `shared/` (_base.css, _brands.css), `specs/` (14x .md), `templates/` (14x .html) |
| **ebook-factory**        | Asset-Skill | `shared/` (_base.css, _brands.css, _shell.html), `specs/` (6x .md), `examples/`  |
| **presentation-factory** | Asset-Skill | `shared/` (_base.css, _brands.css), `specs/` (18x .md), `templates/` (18x .html) |
| **content-factory**      | Einfach     | Nur SKILL.md                                                                     |
| **linkedin-factory**     | Einfach     | Nur SKILL.md (434 Zeilen)                                                        |
| **whiteboard-factory**   | Einfach     | Nur SKILL.md (273 Zeilen)                                                        |

### Externe Referenz (boshify/ai-seo-agent-skills)

| Skill             | Stufe          | Ordner-Mapping                                                                                          |
| ----------------- | -------------- | ------------------------------------------------------------------------------------------------------- |
| **page-scraper**  | Referenz-Skill | `references/` (reference.md mit API-Docs)                                                               |
| **ai-seo-engine** | Referenz-Skill | `references/` (concepts.md, cli-reference.md, workflows.md, setup.md, mcp-setup.md, troubleshooting.md) |
| **cms-wordpress** | Einfach        | Nur SKILL.md                                                                                            |

**Externe Skills nutzen andere Ordnernamen** (z.B. keine `shared/`, `specs/` etc.). Beim Import werden Dateien ausserhalb unserer Schema-Ordner als unkategorisiert gespeichert. Die AI sieht den Pfad und entscheidet selbst.

---

## Datenmodell

### Neue Tabelle: `skill_resources`

| Spalte    | Typ               | Beschreibung                                                    |
| --------- | ----------------- | --------------------------------------------------------------- |
| id        | text PK           | nanoid                                                          |
| skillId   | text FK           | → skills.id, ON DELETE CASCADE                                  |
| filename  | text NOT NULL     | Relativer Pfad, z.B. `shared/base.css`, `specs/titel-slides.md` |
| content   | text NOT NULL     | Dateiinhalt                                                     |
| category  | text NOT NULL     | Abgeleitet aus Ordner (siehe unten)                             |
| sortOrder | integer DEFAULT 0 | Reihenfolge im Manifest                                         |
| createdAt | timestamp         |                                                                 |
| updatedAt | timestamp         |                                                                 |

**Constraints:** UNIQUE(skillId, filename), INDEX(skillId)

### Kategorie-Ableitung aus Ordner

| Ordner-Prefix | Kategorie   | Fallback                                         |
| ------------- | ----------- | ------------------------------------------------ |
| `shared/`     | `shared`    |                                                  |
| `specs/`      | `spec`      |                                                  |
| `templates/`  | `template`  |                                                  |
| `references/` | `reference` |                                                  |
| `examples/`   | `example`   |                                                  |
| Alles andere  | `other`     | Fuer Drittanbieter-Skills oder flache Strukturen |

Dateien im Root (neben SKILL.md) bekommen ebenfalls `other`. Das ist der Fallback fuer alles, was nicht ins Schema passt.

### SkillMetadata-Erweiterung

```typescript
interface SkillMetadata {
  // ... bestehende Felder ...
  hasResources: boolean    // NEU: Hat dieser Skill Ressourcen?
}
```

---

## Tool-Aenderungen

### load_skill (erweitern)

Wenn ein Skill Ressourcen hat, kommt ein Manifest mit:

```json
{
  "skill": "carousel-factory",
  "content": "# Carousel Factory\n\n...",
  "resources": [
    { "filename": "shared/base.css", "category": "shared" },
    { "filename": "shared/brands.css", "category": "shared" },
    { "filename": "specs/titel-slides.md", "category": "spec" },
    { "filename": "templates/titel-slides.html", "category": "template" },
    { "filename": "specs/quote-slides.md", "category": "spec" },
    { "filename": "templates/quote-slides.html", "category": "template" }
  ],
  "hint": "Nutze load_skill_resource um Dateien zu laden. Das SKILL.md oben beschreibt, wann welche Ressourcen relevant sind."
}
```

Skills ohne Ressourcen geben weiterhin nur `skill` + `content` zurueck.

### load_skill_resource (neu)

| Parameter | Typ      | Beschreibung                    |
| --------- | -------- | ------------------------------- |
| skill     | string   | Skill-Slug                      |
| filenames | string[] | 1-5 Dateinamen aus dem Manifest |

**Response:**

```json
{
  "skill": "carousel-factory",
  "files": [
    { "filename": "shared/base.css", "content": "/* Base styles... */" },
    { "filename": "templates/titel-slides.html", "content": "<!DOCTYPE html>..." }
  ]
}
```

Batch-Loading (1-5 Dateien pro Call) spart Round-Trips.

**Registrierung:** Neben `load_skill` in `build-tools.ts`, gleiche Bedingung (Skills vorhanden, kein Quicktask).

---

## Import

### ZIP-Import (Admin)

Neuer Endpoint: `POST /api/admin/skills/import-zip`

**Erwartete ZIP-Struktur (Schema-konform):**

```
carousel-factory.zip
├── SKILL.md
├── shared/
│   ├── base.css
│   └── brands.css
├── specs/
│   ├── titel-slides.md
│   └── quote-slides.md
├── templates/
│   ├── titel-slides.html
│   └── quote-slides.html
└── examples/
    └── example-loschke-light.html
```

**Auch akzeptiert (Drittanbieter, flache Struktur):**

```
page-scraper.zip
├── SKILL.md
└── references/
    └── reference.md
```

```
random-skill.zip
├── SKILL.md
├── some-doc.md          ← category: other
├── config.json          ← category: other
└── helpers/
    └── prompt.txt       ← category: other
```

**Ablauf:**

1. ZIP in-memory entpacken
2. SKILL.md im Root finden (Pflicht, Fehler wenn nicht vorhanden)
3. Skill upserten via bestehendem Parser
4. Alle anderen Dateien als Ressourcen sammeln
5. Kategorie aus Ordner-Prefix ableiten (Schema-Ordner → Kategorie, sonst → `other`)
6. Ressourcen upserten (vorherige loeschen + neue einfuegen in Transaktion)
7. Skill-Cache invalidieren

**Admin-UI:** Zweiter Upload-Button "ZIP hochladen" neben ".md-Datei hochladen".

### Seed-Script

`seed-skills.ts` erkennt neben `*.md` auch Verzeichnisse:

```
seeds/skills/
  einfacher-skill.md              ← Stufe 1: Einzeldatei (bestehend)
  carousel-factory/               ← Stufe 2+: Verzeichnis (neu)
    SKILL.md
    shared/
      base.css
      brands.css
    specs/
      titel-slides.md
    templates/
      titel-slides.html
```

---

## Migration der existierenden Skills

Die Skills in `docs/skills/` muessen einmalig ins neue Schema umstrukturiert werden:

**Vorher (aktuell):**

```
carousel-factory/
├── SKILL.md
├── _base.css
├── _brands.css
├── _export-panel.html
├── titel-slides.md
├── titel-slides.html
└── ...
```

**Nachher (Schema):**

```
carousel-factory/
├── SKILL.md              ← + Ressourcen-Sektion ergaenzen
├── shared/
│   ├── base.css          ← umbenannt von _base.css
│   ├── brands.css        ← umbenannt von _brands.css
│   └── export-panel.html ← umbenannt von _export-panel.html
├── specs/
│   ├── titel-slides.md
│   └── quote-slides.md
├── templates/
│   ├── titel-slides.html
│   └── quote-slides.html
└── examples/
    └── example-loschke-light.html
```

Das ist ein einmaliger manueller Schritt pro Skill.

---

## Was sich NICHT aendert

- **System-Prompt Layer 3:** Skill-Uebersicht bleibt identisch (Slug + Beschreibung)
- **Einfache Skills:** Komplett unberuehrt. Kein Zwang zu ZIP oder Verzeichnissen.
- **Quicktasks:** Kein Zugriff auf Ressourcen (selbststaendig, kein load_skill)
- **load_skill Eingabe:** Weiterhin nur `{ name }`. Erweiterung ist im Response.
- **Expert-Zuordnung:** Skills werden weiterhin ueber `expertSkillSlugs` zugeordnet.

---

## Offene Fragen

1. **Ressourcen-Groessenlimit:** Vorschlag 100KB pro Datei, 1MB gesamt pro Skill. Die groessten Dateien sind aktuell ~16KB. Reicht das?

2. **Binaer-Dateien:** Sollen Bilder (PNG, SVG) als Ressourcen moeglich sein? Oder nur Textdateien? Bilder koennten alternativ via R2 referenziert werden.

3. **ZIP-Library:** `fflate` (~8KB, kein Native-Addon) vs. Node.js `zlib` mit manuellem ZIP-Parsing (keine Dependency).

---

## Implementierungs-Reihenfolge

| Phase | Beschreibung                                  | Abhaengigkeit |
| ----- | --------------------------------------------- | ------------- |
| 1     | DB-Schema `skill_resources` + Queries         | -             |
| 2     | `load_skill` erweitern (Manifest im Response) | Phase 1       |
| 3     | `load_skill_resource` Tool (neu)              | Phase 1       |
| 4     | ZIP-Import (Admin API + UI-Button)            | Phase 1       |
| 5     | Seed-Script (Verzeichnis-Support)             | Phase 1       |
| 6     | Discovery-Metadata (`hasResources`)           | Phase 1       |

Phasen 2-6 sind untereinander unabhaengig und koennen in beliebiger Reihenfolge nach Phase 1 umgesetzt werden.

### Vorbereitend (manuell, kein Code)

- Existierende Skills in `docs/skills/` ins Schema umstrukturieren
- SKILL.md um Ressourcen-Sektion ergaenzen
- Umstrukturierte Skills nach `seeds/skills/` kopieren
