# PRD: Tool-Architektur & Skill-Ressourcen — Konsolidiertes Refactoring

> Status: Freigegeben — Alle 7 Phasen, keine Kompromisse
> Zusammenfuehrung von `prd-refactoring-stabilisierung.md` und `prd-skill-resources.md`
> Datum: 2026-03-28

---

## Motivation

Die Plattform steht vor der Ueberfuehrung in eine SaaS-Loesung. Erste Testgruppen geben starkes Feedback. Bevor zahlende Nutzer auf der Plattform arbeiten, muss die Architektur stabil, wartbar und skalierbar sein.

**Warum jetzt:** Nach dem Launch wird jede strukturelle Aenderung teurer — DB-Migrationen muessen non-destructive sein, Breaking Changes in der API sind nicht mehr akzeptabel, Downtime trifft echte User. Aktuell koennen wir Code, Datenbank und alles zuruecksetzen ohne Konsequenzen. Diese Gelegenheit kommt nicht wieder.

### Zwei Probleme, eine Loesung

**Problem 1 — Tool-Skalierung:** Die Plattform hat 21 Tools, geplant sind 40-50. Jedes neue Tool erfordert Aenderungen an 4+ Stellen (Tool-Datei, `build-tools.ts` If-Kette, `tool-status.tsx` Labels/Icons, ggf. `chat-message.tsx` Renderer). Mehrere Client-Komponenten sind auf 800+ Zeilen angewachsen. Das ist bei 21 Tools handhabbar, wird aber bei 40-50 Tools zum Fehler-Magneten.

**Problem 2 — Skill-Ressourcen:** Design-Skills (carousel-factory, ebook-factory, presentation-factory) bestehen aus 30+ Dateien. Alles in SKILL.md zu packen wuerde 50.000+ Tokens verbrauchen. Ohne Ressourcen-System bleiben Skills auf einfache Textanweisungen beschraenkt — das begrenzt direkt, was die Plattform als SaaS leisten kann.

**Synergie:** Die Tool Registry (Problem 1) macht das Hinzufuegen von `load_skill_resource` (Problem 2) trivial — 1 Datei statt 4-Datei-Koordination. Error Handling und Code-Vereinfachung kommen beiden zugute.

---

## Entscheidung: Experten und Skills getrennt halten

**Analyseergebnis:** Keine Zusammenfuehrung empfohlen.

| Aspekt        | Experten                               | Skills                             |
| ------------- | -------------------------------------- | ---------------------------------- |
| Ownership     | User-scoped (global/persoenlich)       | Immer global                       |
| Konzept       | Chat-Persona mit systemPrompt          | Wiederverwendbare Prompt-Templates |
| Konfiguration | allowedTools, mcpServerIds, skillSlugs | fields, outputAsArtifact, category |
| Modus         | Einzeltyp                              | Dual-Mode (skill/quicktask)        |
| Mutation      | User + Admin                           | Nur Admin                          |

---

## Ist-Zustand (Bestandsaufnahme)

### Tool-System

| Datei              | Zeilen    | Problem                                                              |
| ------------------ | --------- | -------------------------------------------------------------------- |
| `build-tools.ts`   | 157       | If-Kette fuer bedingte Tool-Registrierung                            |
| `tool-status.tsx`  | 185       | Hardcoded `TOOL_LABELS` (12) + `TOOL_ICONS` (12)                     |
| `chat-message.tsx` | 811       | 15+ Tool-Type-Checks, `CUSTOM_RENDERED_TOOLS` Set, 500+ Zeilen JSX   |
| `use-artifact.ts`  | 792       | 12 `isXxxPart()` Funktionen, 7 `extractXxxFromToolPart()` Funktionen |
| `persist.ts`       | 511       | 8 sequentielle/parallele Ops in einer Funktion                       |
| `prompts.ts`       | 260       | Monolith, `SYSTEM_PROMPTS.artifacts` allein 60+ Zeilen               |
| 21 Tool-Dateien    | ~35-80 je | Factory- oder Direct-Export Pattern                                  |

### Error Handling

38 Instanzen von `err instanceof Error ? err.message : "Unknown"` in 23 Dateien. Top: `persist.ts` (11x).

### Skill-System

| Datei                 | Zeilen | Funktion                                   |
| --------------------- | ------ | ------------------------------------------ |
| `load-skill.ts`       | 34     | Factory, gibt `{ skill, content }` zurueck |
| `skills.ts` (Schema)  | 39     | Einzelne Tabelle, kein Ressourcen-Support  |
| `skills.ts` (Queries) | 183    | CRUD + `upsertSkillBySlug`                 |
| `discovery.ts`        | 102    | 60s TTL-Cache, `SkillMetadata` Interface   |
| `parser.ts`           | 119    | gray-matter Parsing + Serialisierung       |
| `seed-skills.ts`      | 51     | Nur `*.md` Dateien, keine Verzeichnisse    |

### Existierende Skills mit Ressourcen-Bedarf

| Skill                | Dateien | Ressourcen-Typen                                            |
| -------------------- | ------- | ----------------------------------------------------------- |
| carousel-factory     | 33      | CSS (3), Specs (14 .md), Templates (14 .html), Export-Panel |
| presentation-factory | 39      | CSS (2), Specs (20 .md), Templates (20 .html)               |
| ebook-factory        | 12      | CSS (2), Specs (6 .md), Shell-HTML, Example                 |
| content-factory      | 1       | Nur SKILL.md                                                |
| linkedin-factory     | 1       | Nur SKILL.md                                                |
| whiteboard-factory   | 1       | Nur SKILL.md                                                |

---

## Phase 1: Error Handling Utility

### Problem

38 duplizierte Error-Extraction Patterns. Inkonsistente Messages (deutsch/englisch). 11x identisches `.catch()` Pattern in `persist.ts`.

### Loesung

```typescript
// src/lib/errors.ts
export function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export async function fireAndForget(label: string, fn: () => Promise<void>): Promise<void> {
  try { await fn() } catch (err) { console.warn(`[${label}]`, getErrorMessage(err)) }
}
```

### Betroffene Dateien

- **Neu:** `src/lib/errors.ts`
- **Modifiziert:** 23 Dateien (mechanische Ersetzung)

Top-Dateien: `persist.ts` (11), `memory/index.ts` (2), `youtube.ts` (2), `google-search-grounding.ts` (2), `chat-view.tsx` (2)

### Verifikation

- `pnpm build` erfolgreich
- Grep nach `instanceof Error ? err.message` = 0 Treffer

---

## Phase 2: DB Schema `skill_resources`

### Problem

Skills koennen nur einen einzelnen Markdown-String speichern. Design-Skills brauchen 30+ separate Dateien.

### Loesung

Neue Tabelle `skill_resources`:

| Spalte    | Typ               | Beschreibung                                |
| --------- | ----------------- | ------------------------------------------- |
| id        | text PK           | nanoid                                      |
| skillId   | text FK           | → skills.id, ON DELETE CASCADE              |
| filename  | text NOT NULL     | Relativer Pfad, z.B. `shared/base.css`      |
| content   | text NOT NULL     | Dateiinhalt (nur Text, keine Binaerdateien) |
| category  | text NOT NULL     | Abgeleitet aus Ordner-Prefix                |
| sortOrder | integer DEFAULT 0 | Reihenfolge im Manifest                     |
| createdAt | timestamp         |                                             |
| updatedAt | timestamp         |                                             |

**Constraints:** `UNIQUE(skillId, filename)`, `INDEX(skillId)`

**Kategorie-Ableitung:**

| Ordner-Prefix | Kategorie | Beschreibung                        |
| ------------- | --------- | ----------------------------------- |
| `shared/`     | shared    | CSS, Shell-HTML, strukturelle Basis |
| `specs/`      | spec      | Design-Regeln, Constraints pro Typ  |
| `templates/`  | template  | HTML-Beispiele als Vorlage          |
| `references/` | reference | API-Docs, Konzepte, Guides          |
| `examples/`   | example   | Fertige Referenz-Implementierungen  |
| Alles andere  | other     | Fallback fuer Drittanbieter         |

**Queries** (`src/lib/db/queries/skill-resources.ts`):

- `getResourcesBySkillId(skillId)` — Alle Ressourcen eines Skills
- `getResourceManifest(skillId)` — Nur filenames + category (fuer load_skill Response)
- `getResourcesByFilenames(skillId, filenames[])` — Batch-Loading (fuer load_skill_resource)
- `upsertResources(skillId, resources[])` — Transaktion: alte loeschen + neue einfuegen
- `deleteResourcesBySkillId(skillId)` — Cleanup

### Skill-Verzeichnis-Schema (verbindlich fuer eigene Skills)

```
skill-name/
├── SKILL.md              ← Pflicht. Hauptanweisungen + Frontmatter.
├── shared/               ← Basis-Assets, bei jeder Ausgabe noetig.
│   ├── base.css
│   └── brands.css
├── specs/                ← Spezifikationen pro Typ.
│   ├── titel-slides.md
│   └── quote-slides.md
├── templates/            ← Funktionierende Beispiele pro Typ.
│   ├── titel-slides.html
│   └── quote-slides.html
├── references/           ← Hintergrunddokumente.
│   └── api-reference.md
└── examples/             ← Vollstaendige Referenz-Implementierungen.
    └── example-loschke-light.html
```

Nicht jeder Skill braucht alle Ordner. Einfache Skills bleiben als einzelne .md Datei.

### SKILL.md Ressourcen-Sektion

Skills mit Ressourcen enthalten eine Prosa-Sektion fuer die AI:

```markdown
## Ressourcen

Dieser Skill hat zusaetzliche Dateien. Lade sie mit `load_skill_resource`.

### Immer laden
- `shared/base.css` — Basis-Styling
- `shared/brands.css` — Brand-Farben

### Pro Slide-Typ laden
- `specs/titel-slides.md` + `templates/titel-slides.html`
- `specs/quote-slides.md` + `templates/quote-slides.html`

### Bei Bedarf
- `examples/example-loschke-light.html` — Komplettes Beispiel
```

### Betroffene Dateien

- **Neu:** `src/lib/db/schema/skill-resources.ts`, `src/lib/db/queries/skill-resources.ts`
- **Modifiziert:** `src/lib/db/schema/index.ts` (Re-Export)

### Verifikation

- Migration laeuft fehlerfrei (`pnpm db:generate` + `pnpm db:push`)
- CRUD-Queries funktional in Drizzle Studio

---

## Phase 3: Tool Registry

### Problem

Jedes neue Tool erfordert Aenderungen an 4+ Stellen:

1. Tool-Datei erstellen
2. `build-tools.ts` — If-Block hinzufuegen
3. `tool-status.tsx` — TOOL_LABELS + TOOL_ICONS erweitern
4. `chat-message.tsx` — ggf. CUSTOM_RENDERED_TOOLS erweitern

### Loesung

Zentrale Registry mit Self-Registration:

```typescript
// src/lib/ai/tools/registry.ts
interface ToolRegistration {
  name: string                    // "web_search"
  label: string                   // "Websuche"
  icon: string                    // Lucide Icon-Name
  category: ToolCategory          // "core" | "search" | "media" | "memory" | "skill"
  featureCheck?: () => boolean    // Bedingte Aktivierung
  privacySensitive?: boolean      // Deaktiviert bei Privacy-Routing
  customRenderer?: boolean        // Eigenes UI in chat-message.tsx
  artifactProducing?: boolean     // Oeffnet Artifact-Panel automatisch
}
```

**Self-Registration** in jeder Tool-Datei:

```typescript
// In web-search.ts
export const registration: ToolRegistration = {
  name: "web_search",
  label: "Websuche",
  icon: "Search",
  category: "search",
  featureCheck: () => features.search.enabled,
}
```

**Registry-API:**

- `getToolLabel(name)` — Label fuer UI (Fallback: humanize Tool-Name)
- `getToolIcon(name)` — Icon-Name (Fallback: Default-Icon)
- `isCustomRendered(name)` — Hat eigenes Rendering in chat-message?
- `isArtifactProducing(name)` — Oeffnet Artifact-Panel?
- `getActiveTools(ctx)` — Alle Tools die fuer den Kontext aktiv sind

### Auswirkung

- `build-tools.ts`: 157-Zeilen If-Kette → ~40 Zeilen Registry-Loop
- `tool-status.tsx`: Hardcoded Maps → `getToolLabel()`/`getToolIcon()` Calls
- `chat-message.tsx`: `CUSTOM_RENDERED_TOOLS` Set → `isCustomRendered()` Call
- **Neues Tool = 1 Datei mit Registration, fertig**

### Betroffene Dateien

- **Neu:** `src/lib/ai/tools/registry.ts`
- **Modifiziert:** 21 Tool-Dateien (Registration-Export), `build-tools.ts`, `tool-status.tsx`, `chat-message.tsx`

### Verifikation

- Alle Tool-Typen rendern korrekt (Streaming + Complete + Error)
- ToolStatus Labels/Icons stimmen
- MCP-Tools funktional (Fallback-Rendering)
- Expert allowedTools-Filter greift

---

## Phase 4: Artifact-Extraktion und Tool-Rendering vereinfachen

### Problem

- `use-artifact.ts` (792 Zeilen): 12 identische `isXxxPart()` Funktionen, 7 fast identische `extractXxxFromToolPart()` Funktionen (je ~40 Zeilen)
- `chat-message.tsx` (811 Zeilen): 15+ Tool-Type-Checks, 500+ Zeilen JSX If/Else-Kette

### Loesung

**4.1 Generische `isToolPart()` Funktion:**

```typescript
export function isToolPart(part: { type: string }, toolName: string): boolean {
  return part.type === `tool-${toolName}`
}
```

12 einzelne Funktionen delegieren intern. Kein Breaking Change.

**4.2 Generischer Tool-Part-Extraktor:**

Factory-Funktion `createToolPartExtractor(config)` mit 7 kurzen Configs (~10 Zeilen je) statt 7 x 40-Zeilen-Funktionen.

Zwei Extraktions-Muster:

- **Streaming Content** (create_artifact, quiz, review): Inhalt aus Tool-Input waehrend Streaming
- **Server-Side Content** (generate_image, branding, design): Leer waehrend Streaming, artifactId aus Output

```typescript
interface ExtractorConfig {
  toolName: string
  mode: "streaming" | "server-side"
  mapInput?: (input: unknown) => { content: string; type: string; language?: string }
  mapOutput?: (output: unknown) => { artifactId?: string }
}
```

**4.3 Tool-Renderer Registry:**

```typescript
// src/components/chat/tool-renderers.ts
const TOOL_RENDERERS: Record<string, ToolRenderer> = {
  ask_user: renderAskUser,
  create_artifact: renderArtifactCard,
  generate_image: renderImageStatus,
  // ...
}

export function renderToolPart(toolName: string, props: ToolRenderProps): ReactNode | null
```

### Auswirkung

- `use-artifact.ts`: 792 → ~450 Zeilen
- `chat-message.tsx`: 811 → ~400 Zeilen
- Neues Tool mit Custom-Rendering = 1 Renderer registrieren

### Betroffene Dateien

- **Neu:** `src/hooks/artifact-extractors.ts`, `src/components/chat/tool-renderers.ts`
- **Modifiziert:** `use-artifact.ts`, `chat-message.tsx`

### Verifikation

- Jeder Tool-Typ in allen States (streaming, complete, error)
- Artifact-Panel Auto-Open waehrend Streaming
- Card-Clicks oeffnen korrekten Inhalt
- Quicktask-Flow unveraendert

---

## Phase 5: load_skill Erweiterung + load_skill_resource Tool

### load_skill erweitern

Response-Format fuer Skills mit Ressourcen:

```json
{
  "skill": "carousel-factory",
  "content": "# Carousel Factory\n\n...",
  "resources": [
    { "filename": "shared/base.css", "category": "shared" },
    { "filename": "specs/titel-slides.md", "category": "spec" },
    { "filename": "templates/titel-slides.html", "category": "template" }
  ],
  "hint": "Nutze load_skill_resource um Dateien zu laden. Das SKILL.md beschreibt, wann welche Ressourcen relevant sind."
}
```

Skills ohne Ressourcen: unveraendert `{ skill, content }`.

### SkillMetadata erweitern

```typescript
interface SkillMetadata {
  // ... bestehende Felder ...
  hasResources: boolean    // NEU
}
```

### load_skill_resource (neues Tool)

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

**Registration (dank Phase 3 — nur 1 Datei noetig):**

```typescript
export const registration: ToolRegistration = {
  name: "load_skill_resource",
  label: "Skill-Ressource laden",
  icon: "FileText",
  category: "skill",
  // Gleiche Bedingung wie load_skill
}
```

### Betroffene Dateien

- **Neu:** `src/lib/ai/tools/load-skill-resource.ts`
- **Modifiziert:** `load-skill.ts`, `discovery.ts`, `skill-resources.ts` (Queries)

### Verifikation

- load_skill fuer Skills ohne Ressourcen: unveraendert
- load_skill fuer Skills mit Ressourcen: Manifest im Response
- load_skill_resource: laedt Dateien korrekt, lehnt ungueltige Slugs/Filenames ab
- Batch-Limit 5 wird enforced

---

## Phase 6: persist.ts Dekomposition + Prompts Modularisierung

### persist.ts → persist/ Verzeichnis

```
src/app/api/chat/persist/
  index.ts              — createOnFinish() Orchestrator (~80 Zeilen)
  assemble-parts.ts     — Response-Parts sammeln + Fake-Artifact erkennen
  persist-files.ts      — R2 File Persist + Code Execution Files
  post-response.ts      — Title, Credits, Suggestions, Memory (Fire-and-Forget)
```

### resolveR2FileParts aufteilen

```typescript
resolveImagePart(buffer, mediaType): Promise<FilePart>
resolvePdfPart(buffer, mediaType, modelId): Promise<FilePart | TextPart>
resolveDocumentPart(buffer, mediaType, filename): Promise<TextPart>
```

### prompts.ts → prompts/ Verzeichnis

```
src/config/prompts/
  index.ts          — buildSystemPrompt() + Re-Exports
  base.ts           — Chat-Default, Title-Generation
  artifacts.ts      — Artifact-Instruktionen + Quellenverlinkung
  tools.ts          — Tool-spezifische Prompts (YouTube, TTS, Web, Google Search, Design)
  interactive.ts    — Quiz, Review, ContentAlternatives Instruktionen
```

### Betroffene Dateien

- **Ersetzt:** `persist.ts` → `persist/index.ts`, `prompts.ts` → `prompts/index.ts`
- **Modifiziert:** `route.ts`, `resolve-context.ts` (Import-Pfade)

### Verifikation

- `pnpm build` erfolgreich
- Chat-Flow End-to-End funktional

---

## Phase 7: ZIP-Import + Seed-Script

### ZIP-Import (Admin)

Neuer Endpoint: `POST /api/admin/skills/import-zip`

**Ablauf:**

1. ZIP in-memory entpacken
2. SKILL.md im Root finden (Pflicht, Fehler wenn nicht vorhanden)
3. Skill upserten via bestehendem Parser
4. Alle anderen Dateien als Ressourcen sammeln
5. Kategorie aus Ordner-Prefix ableiten
6. Ressourcen upserten (vorherige loeschen + neue einfuegen in Transaktion)
7. Skill-Cache invalidieren

**Admin-UI:** Button "ZIP hochladen" neben ".md-Datei hochladen"

### Seed-Script Erweiterung

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

### Migration der existierenden Skills

Einmalig: Skills in `docs/skills/` ins Schema umstrukturieren:

**Vorher:** `_base.css`, `_brands.css`, flache Dateistruktur
**Nachher:** `shared/base.css`, `shared/brands.css`, Schema-konforme Ordner

### Betroffene Dateien

- **Neu:** Import-Endpoint in Admin-API, ZIP-Verarbeitung
- **Modifiziert:** `seed-skills.ts`, Admin-UI (Upload-Button)

### Verifikation

- ZIP-Import erstellt Skill + Ressourcen korrekt
- Seed-Script verarbeitet Verzeichnisse und .md-Dateien
- Bestehende Seeds funktionieren weiterhin

---

## Phasen-Abhaengigkeiten

```
Phase 1 (Error Handling)     Phase 2 (DB Schema)
  [parallel]                   [parallel]
        |                         |
        v                         v
     Phase 3 (Tool Registry) <----+
        |                         |
   +----+----+                    |
   |         |                    |
   v         v                    v
Phase 4   Phase 5              Phase 5
(Artifact  (load_skill_       (load_skill
Simplify)   resource)          extension)
   |                              |
   v                              v
Phase 6                        Phase 7
(persist +                     (ZIP + Seed)
prompts split)
```

### Sprint-Gruppierung

Alle 7 Phasen vor dem SaaS-Launch. Keine Phase wird verschoben.

| Sprint | Phasen                    | Fokus                                                | Ergebnis                              |
| ------ | ------------------------- | ---------------------------------------------------- | ------------------------------------- |
| 1      | 1 + 2 parallel, dann 3   | Foundation: Error Handling, DB Schema, Tool Registry | Saubere Basis, neue Tools = 1 Datei   |
| 2      | 4 + 5 (parallel moeglich) | Features: Artifact-Vereinfachung, Skill-Ressourcen   | UI wartbar, Design-Skills nutzbar     |
| 3      | 6 + 7                     | Stabilisierung: Code-Reorganisation, Admin-Import    | Keine 500-Zeilen-Monolithen, Seeding  |

**Nach Sprint 3:** Codebase ist bereit fuer SaaS-Betrieb. Neue Tools, Skills und Features koennen ohne strukturelle Schulden ergaenzt werden.

---

## Risiko-Bewertung

| Phase                | Risiko       | Begruendung                                        | Mitigation                                          |
| -------------------- | ------------ | -------------------------------------------------- | --------------------------------------------------- |
| 1. Error Handling    | Sehr niedrig | Reine Utility-Extraktion                           | Mechanische Ersetzung, kein Verhaltensaenderung     |
| 2. DB Schema         | Niedrig      | Additive Migration                                 | Kein bestehendes Schema betroffen                   |
| 3. Tool Registry     | **Mittel**   | Chat-Hot-Path betroffen, voller Test-Matrix noetig | Volle Test-Matrix aller 21 Tools nach Umstellung    |
| 4. Artifact/Message  | **Mittel**   | Komplexe Streaming-State-Logik                     | Jeden Tool-Typ in allen States testen (stream/done) |
| 5. Skill Tools       | Niedrig      | Additive Aenderungen + neues Tool                  | Bestehende Skills bleiben unveraendert              |
| 6. persist + prompts | Niedrig      | Reine Reorganisation                               | Nur Import-Pfade aendern sich                       |
| 7. ZIP + Seed        | Niedrig      | Admin-only, kein Runtime-Impact                    | Rueckwaertskompatibel mit bestehenden .md-Seeds     |

**Gesamtrisiko vor Launch: Tragbar.** Phase 3+4 sind die einzigen Stellen mit echtem Regressions-Potenzial. Da aktuell keine Produktions-User betroffen sind, ist der Zeitpunkt ideal — Fehler koennen ohne Druck behoben werden.

---

## Was sich NICHT aendert

- **Expert/Skill-Trennung:** Bleiben separate Konzepte
- **System-Prompt Layer 3:** Skill-Uebersicht bleibt identisch (Slug + Beschreibung)
- **Einfache Skills:** Komplett unberuehrt. Kein Zwang zu Verzeichnissen.
- **Quicktasks:** Kein Zugriff auf Ressourcen
- **Expert-Zuordnung:** Skills weiterhin ueber `expertSkillSlugs`
- **Memory-System:** Nicht betroffen

---

## Offene Entscheidungen

| #   | Frage                              | Empfehlung                                                                   |
| --- | ---------------------------------- | ---------------------------------------------------------------------------- |
| 1   | Binaer-Dateien in skill_resources? | Nur Text. Bilder via R2-URL referenzieren.                                   |
| 2   | Ressourcen-Groessenlimit?          | 100KB pro Datei, 1MB gesamt pro Skill. Groesste aktuell ~16KB.               |
| 3   | ZIP-Library?                       | `fflate` (~8KB, kein Native-Addon) vs. Node.js `zlib` mit manuellem Parsing. |

---

## Zusammenfassung

| Phase                | Neue Dateien | Geaenderte Dateien | Reduktion / Ergebnis                           | Risiko       |
| -------------------- | ------------ | ------------------ | ---------------------------------------------- | ------------ |
| 1. Error Handling    | 1            | ~23                | 38 duplizierte Patterns eliminiert             | Sehr niedrig |
| 2. DB Schema         | 2            | 1                  | Skill-Ressourcen persistierbar                 | Niedrig      |
| 3. Tool Registry     | 1            | ~24                | build-tools: 157→~40 Zeilen, 1-Datei-Workflow  | Mittel       |
| 4. Artifact/Message  | 2            | 2                  | use-artifact: 792→~450, chat-message: 811→~400 | Mittel       |
| 5. Skill Tools       | 1            | 3                  | On-demand Ressourcen-Loading                   | Niedrig      |
| 6. persist + prompts | 7            | 2                  | Reorganisation, bessere Lesbarkeit             | Niedrig      |
| 7. ZIP + Seed        | 2            | 2                  | Admin-Import + Verzeichnis-Seeding             | Niedrig      |

---

## Verifikation (pro Sprint)

1. `pnpm build` — keine Type-Errors
2. Chat: Expert waehlen, Tools nutzen (Websuche, Bild, YouTube, TTS, Design)
3. MCP-Tools funktional
4. Expert mit allowedTools-Filter
5. Quicktask-Flow
6. Artifact-Panel fuer alle Typen (HTML, Quiz, Review, Image, Design, Branding, Audio)
7. Credit-Abzug korrekt
8. Skill laden + Skill-Ressource laden (ab Sprint 2)
9. ZIP-Import im Admin (Sprint 3)
