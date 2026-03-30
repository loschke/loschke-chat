# PRD: Stitch Design Generation

> Feature-Dokumentation fuer die Integration von Google Stitch als Design-Backend in die KI-Chat-Plattform.
> Status: Phase 1+2 implementiert (generate_design, edit_design, Device-Targeting, Metadata). Offen: Screenshot-Thumbnail, Design-Varianten.

---

## 1. Feature-Uebersicht

### Was ist Stitch?

Google Stitch ist ein spezialisiertes AI-Design-Modell fuer Frontend-Generierung. Im Gegensatz zu LLMs, die HTML als Text schreiben, hat Stitch ein dediziertes Design-Modell das UI-Patterns, Layout, Typografie und Spacing versteht. Das Ergebnis ist production-quality HTML mit inline Tailwind CSS.

**SDK:** `@google/stitch-sdk` (TypeScript, npm)
**Architektur:** MCP-Server-basiert, SDK abstrahiert den MCP-Transport
**AI SDK Adapter:** `@google/stitch-sdk/ai` liefert `stitchTools()` direkt kompatibel mit Vercel AI SDK

### Was wird moeglich?

| Feature | User-Wert | Beschreibung |
|---------|-----------|-------------|
| Design generieren | Hoch | Prompt → production-quality HTML-Design (Landing Pages, Dashboards, App-Screens) |
| Design iterieren | Hoch | Bestehendes Design mit Follow-up-Prompt verfeinern ("Mach den Header groesser") |
| Device-Targeting | Mittel | Desktop/Mobile/Tablet-optimierte Designs |
| Design-Varianten | Mittel | Layout/Farb/Font-Variationen auf einen Klick |

### Abgrenzung zum bestehenden Artifact-System

| | Heute (`create_artifact`) | Mit Stitch (`generate_design`) |
|---|---|---|
| Wer generiert HTML? | LLM schreibt Code direkt | Stitch Design-Modell |
| Design-Qualitaet | Funktional, aber generisch | Production-quality, spezialisiertes Modell |
| Prompt-Aufwand | User muss Design-Details beschreiben | Einfacher Prompt reicht, Stitch kennt UI-Patterns |
| Tailwind | LLM-generiert, oft inkonsistent | Inline Tailwind, konsistent und valide |
| Iteration | User muss neues Artifact prompten | `screen.edit()` verfeinert bestehendes Design |

Beide Wege existieren parallel. `create_artifact` bleibt fuer einfache HTML-Snippets und Code. `generate_design` fuer visuelle UI-Designs.

---

## 2. Scope

### In Scope

- Design-Generierung via Stitch SDK (`generate_design` Tool)
- Design-Iteration via `screen.edit()` (`edit_design` Tool)
- Device-Typen: Desktop, Mobile, Tablet
- HTML-Output als bestehender `html` Artifact-Typ
- Feature-Flag per `STITCH_API_KEY` (opt-in)
- Credit-Abrechnung (Flat-Rate pro Generierung)

### Out of Scope (bewusst ausgeschlossen)

- Design-Varianten (`screen.variants()`) — spaetere Erweiterung
- Theme-Extraktion (`extractThemes()`) — spaetere Erweiterung
- Stitch MCP Server als direkter MCP-Integration-Eintrag
- DESIGN.md Format-Unterstuetzung
- Eigener "UI Designer" Expert mit rohen Stitch-Tools
- Stitch Admin-UI (Feature-Flag reicht)

---

## 3. Technische Recherche

### Stitch SDK API

Das SDK bietet drei Abstraktionsebenen:

**Domain API (fluent):**
```typescript
import { stitch } from "@google/stitch-sdk"

// Projekt erstellen + Screen generieren
const project = (await stitch.projects()).at(0)
const screen = await project.generate("A dashboard with charts and KPIs")

// HTML und Screenshot abrufen
const htmlUrl = await screen.getHtml()   // Download-URL
const imageUrl = await screen.getImage() // Screenshot-URL

// Design iterieren
const edited = await screen.edit("Change the color scheme to dark mode")
const editedHtml = await edited.getHtml()
```

**AI SDK Adapter:**
```typescript
import { stitchTools } from "@google/stitch-sdk/ai"
import { generateText } from "ai"
import { google } from "@ai-sdk/google"

const { text } = await generateText({
  model: google("gemini-3.1-flash-lite-preview"),
  tools: stitchTools(),  // Record<string, Tool> — direkt kompatibel
  maxSteps: 5,
  prompt: "Create a landing page with hero section",
})
```

**Low-Level Tool API:**
```typescript
// Fuer programmatische Kontrolle in Wrapper-Tools
const result = await stitch.callTool("create_project", { title: "My Project" })
const screen = await stitch.callTool("generate_screen_from_text", {
  projectId: result.name.replace("projects/", ""),
  prompt: "A settings page",
})
```

### SDK Referenz (relevant)

| Klasse | Methode | Rueckgabe | Beschreibung |
|--------|---------|-----------|-------------|
| `stitch` | `projects()` | `Project[]` | Alle Projekte auflisten |
| `stitch` | `project(id)` | `Project` | Handle erstellen (kein API Call) |
| `stitch` | `callTool(name, params)` | `T` | Raw MCP Tool aufrufen |
| `stitch` | `listTools()` | `ToolDefinition[]` | Verfuegbare Tools abfragen |
| `Project` | `generate(prompt, deviceType?, modelId?)` | `Screen` | Neuen Screen generieren |
| `Project` | `screens()` | `Screen[]` | Alle Screens auflisten |
| `Screen` | `edit(prompt, deviceType?, modelId?)` | `Screen` | Screen verfeinern (neuer Screen, Original unveraendert) |
| `Screen` | `variants(prompt, options)` | `Screen[]` | Design-Varianten erzeugen |
| `Screen` | `getHtml()` | `string` (URL) | HTML Download-URL |
| `Screen` | `getImage()` | `string` (URL) | Screenshot Download-URL |

### Enums

| Enum | Werte |
|------|-------|
| `DeviceType` | `MOBILE`, `DESKTOP`, `TABLET`, `AGNOSTIC` |
| `ModelId` | `GEMINI_3_PRO`, `GEMINI_3_FLASH` |
| `CreativeRange` | `REFINE`, `EXPLORE`, `REIMAGINE` |
| `VariantAspect` | `LAYOUT`, `COLOR_SCHEME`, `IMAGES`, `TEXT_FONT`, `TEXT_CONTENT` |

### ENV-Variablen (Stitch SDK)

| Variable | Beschreibung |
|----------|-------------|
| `STITCH_API_KEY` | API Key fuer Authentifizierung |
| `STITCH_HOST` | MCP Server URL (Default: `https://stitch.googleapis.com/mcp`) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API Key (haben wir bereits) |

### CSP-Kompatibilitaet

Stitch dokumentiert "inline Tailwind CSS" als Output. Die bestehende CSP im `html-preview.tsx`:

```
style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: blob: https://i.ytimg.com;
```

Inline Tailwind Classes funktionieren mit `style-src 'unsafe-inline'`. Falls Stitch doch CDN-Links einbettet (`<script src="https://cdn.tailwindcss.com">`), wird ein Post-Processing-Schritt im Tool-Handler eingefuegt der externe Referenzen stripped.

---

## 4. Architektur-Design

### Ansatz: Wrapper-Tools

Zwei dedizierte Tools die Stitch intern orchestrieren, statt rohe Stitch-Tools durchzureichen.

**Gruende gegen Durchreichen:**
- Multi-Step-Orchestration (create_project → generate → download) erzeugt verwirrende Zwischen-Steps fuer User
- Stitch-Projekt-Lifecycle muss gemanaged werden (Cleanup)
- Credit-Abrechnung wird unvorhersagbar
- User sieht Tool-Calls die nichts mit ihrem Request zu tun haben

**Gruende fuer Wrapper:**
- Ein Tool-Call = ein Ergebnis = ein Artifact
- Exakt das Pattern von `generate_image` — bewaehrt
- Stitch-Interna komplett abstrahiert
- Spaeter erweiterbar (Varianten, Themes) ohne UI-Aenderungen

### Bestehende Architektur (wiederverwendet)

```
Chat Route                          Stitch Integration
─────────────                       ──────────────────
route.ts (Orchestrator)
├── resolve-context.ts
├── build-messages.ts
├── build-tools.ts ──────────────── + generate_design, edit_design
└── persist.ts ──────────────────── Artifact-Erkennung (existiert)

Artifact Pipeline (unveraendert)
────────────────
create-artifact.ts (Factory) ────── generate-design.ts folgt demselben Pattern
artifacts.ts (DB Schema) ────────── type: "html" existiert bereits
html-preview.tsx (Rendering) ────── rendert Stitch HTML direkt
use-artifact.ts (Client) ────────── + Tool-Part-Detection
```

### Tool 1: `generate_design`

```
Zweck:    Neues UI-Design aus Prompt generieren
Input:    prompt, title, style?, colorScheme?, deviceType?
Interner Flow:
  1. stitch.callTool("create_project", { title })
  2. stitch.callTool("generate_screen_from_text", { projectId, prompt: enrichedPrompt })
  3. screen.getHtml() → URL → fetch → HTML String
  4. Optional: screen.getImage() → URL → fetch → R2 Upload
  5. createArtifact({ chatId, type: "html", title, content: htmlString })
  6. Stitch-Metadata speichern (fuer spaetere Iteration)
Output:   { artifactId, title, type: "html", version: 1 }
```

### Tool 2: `edit_design`

```
Zweck:    Bestehendes Design iterieren
Input:    artifactId, prompt (Aenderungswunsch), deviceType?
Interner Flow:
  1. Stitch-Metadata aus Artifact laden (projectId, screenId)
  2. screen.edit(prompt, deviceType?) → neuer Screen
  3. screen.getHtml() → URL → fetch → HTML String
  4. updateArtifactContent(artifactId, userId, htmlString) → version++
  5. Neue Stitch-Metadata speichern
Output:   { artifactId, title, type: "html", version: N+1 }
```

### Stitch-Metadata Speicherung

Fuer Iteration muss die Zuordnung Artifact → Stitch Project/Screen gespeichert werden.

**Option A: `fileUrl`-Feld recyclen**
- `fileUrl` als JSON: `{ stitchProjectId: "...", stitchScreenId: "..." }`
- Pro: Keine Migration. Contra: Semantik-Missbrauch, `fileUrl` ist eigentlich eine URL.

**Option B: Neues `metadata` JSONB-Feld**
- Flexibler, sauber typisiert, zukunftssicher fuer andere Metadaten
- Pro: Saubere Architektur. Contra: DB-Migration noetig.

**Empfehlung: Option B** — ein `metadata jsonb` Feld auf der `artifacts` Tabelle ist die sauberere Loesung und nuetzlich fuer zukuenftige Features (z.B. Image Generation Metadata).

### Datenfluss

```
User: "Erstelle eine Landing Page fuer ein SaaS-Produkt"
    │
    ▼
LLM waehlt generate_design Tool
    │
    ▼
generate_design Execute Handler
    ├── Stitch: create_project
    ├── Stitch: generate_screen_from_text
    ├── Stitch: getHtml → fetch HTML
    ├── DB: createArtifact (type: "html")
    └── Return: { artifactId, ... }
    │
    ▼
Client empfaengt tool-generate_design Part
    ├── extractDesignFromToolPart()
    ├── ArtifactPanel oeffnet automatisch
    └── HtmlPreview rendert im iframe
```

```
User: "Mach den Header groesser und aendere die Farben zu Blau"
    │
    ▼
LLM waehlt edit_design Tool (mit artifactId vom vorherigen Design)
    │
    ▼
edit_design Execute Handler
    ├── DB: Artifact laden → Stitch-Metadata extrahieren
    ├── Stitch: screen.edit(prompt)
    ├── Stitch: getHtml → fetch HTML
    ├── DB: updateArtifactContent → version++
    └── Return: { artifactId, version: 2 }
    │
    ▼
Client aktualisiert ArtifactPanel
```

---

## 5. Konfiguration

### Feature Flag

```typescript
// src/config/features.ts — Opt-in Server Pattern
stitch: {
  enabled: !!process.env.STITCH_API_KEY,
},
```

### ENV-Variablen

| Variable | Pflicht | Default | Beschreibung |
|----------|---------|---------|-------------|
| `STITCH_API_KEY` | Ja (fuer Feature) | — | Stitch API Key |
| `STITCH_GENERATION_CREDITS` | Nein | `5000` | Credits pro Design-Generierung |
| `STITCH_EDIT_CREDITS` | Nein | `3000` | Credits pro Design-Iteration |

`GOOGLE_GENERATIVE_AI_API_KEY` wird von Stitch ebenfalls benoetigt, ist aber bereits fuer Image Generation/TTS vorhanden.

---

## 6. Betroffene Dateien

### Bestehende Dateien (Aenderungen)

| Datei | Aenderung | Aufwand |
|-------|-----------|--------|
| `src/config/features.ts` | Feature Flag `stitch` | Gering |
| `src/app/api/chat/build-tools.ts` | Tool-Registration (2 Tools) | Gering |
| `src/hooks/use-artifact.ts` | Tool-Part-Detection fuer `generate_design` und `edit_design` | Gering |
| `src/lib/db/schema/artifacts.ts` | `metadata` JSONB-Feld (Migration) | Gering |
| `src/lib/db/queries/artifacts.ts` | Metadata in Queries mitfuehren | Gering |
| `.env.example` | ENV-Doku | Gering |
| `src/components/assistant/html-preview.tsx` | CSP pruefen, ggf. Post-Processing | Gering |

### Neue Dateien

| Datei | Zweck | Aufwand |
|-------|-------|--------|
| `src/lib/ai/tools/generate-design.ts` | Wrapper-Tool fuer Design-Generierung | Mittel (~150 Zeilen) |
| `src/lib/ai/tools/edit-design.ts` | Wrapper-Tool fuer Design-Iteration | Mittel (~120 Zeilen) |

---

## 7. Implementierungs-Reihenfolge

### Phase 1: Grundlagen ✅

| # | Schritt | Status |
|---|---------|--------|
| 1 | `pnpm add @google/stitch-sdk` | Done |
| 2 | Feature Flag in `features.ts` | Done |
| 3 | DB Migration: `metadata` JSONB-Feld auf `artifacts` | Done |
| 4 | `generate-design.ts` Tool (callTool + deepFind statt Domain API) | Done |
| 5 | Tool-Registration in `build-tools.ts` | Done |

### Phase 2: Client + Iteration ✅

| # | Schritt | Status |
|---|---------|--------|
| 6 | Client-Side Detection in `use-artifact.ts` | Done |
| 7 | CSP: Tailwind CDN, Google Fonts, Google Images erlaubt | Done |
| 8 | `edit-design.ts` Tool (callTool + deepFind) | Done |
| 9 | ArtifactCard-Rendering in `chat-message.tsx` | Done |
| 10 | Artifact-Panel: Resize-Handle + Fullscreen-Toggle | Done |

### Phase 3: Polish (teilweise)

| # | Schritt | Status |
|---|---------|--------|
| 11 | `.env.example` aktualisieren | Done |
| 12 | Docs + Roadmap aktualisieren | Done |
| 13 | Security: SSRF-Schutz (isAllowedStitchUrl), Credit-Pre-Check | Done |
| 14 | Screenshot-Thumbnail als Vorschau (Nice-to-have) | Offen |

---

## 8. Risiken & Offene Fragen

### Risiken (Post-Implementation Review)

| Risiko | Status | Ergebnis |
|--------|--------|----------|
| SDK nicht auf npm verfuegbar | Geloest | v0.0.3 verfuegbar, funktioniert |
| API-Aenderungen (Stitch ist neu) | **Eingetreten** | SDK Domain API (`project.generate()`) parsed Responses fragil. Fix: `callTool()` + `deepFind()` fuer robuste Extraktion |
| Latenz (10-30s pro Generation) | Bestaetigt | 20-60s in der Praxis, Loading-State funktioniert |
| CSP blockiert Stitch-Output | **Eingetreten** | Tailwind CDN + Google Fonts + Google Images mussten in CSP erlaubt werden (App-Level + iframe) |
| Stitch-Projekt-Accumulation | Offen | Projekte werden in Stitch erstellt, kein Cleanup implementiert |

### Offene Fragen (entschieden)

1. ~~Metadata-Feld~~ → JSONB-Feld `metadata` auf `artifacts` implementiert
2. ~~Stitch-Modellwahl~~ → `GEMINI_3_FLASH` als Default (schneller, guenstiger)
3. **Projekt-Cleanup:** Noch offen — Stitch-Projekte akkumulieren serverseitig
4. **Screenshot-Nutzung:** Noch offen — aktuell nur HTML-Artifact, kein Thumbnail
5. **User-eigene API-Keys:** PRD erstellt (`docs/features/prd-user-api-keys.md`) — Bring Your Own Key System

---

## 9. Verifizierung

### Testszenarien

| # | Test | Erwartung |
|---|------|-----------|
| 1 | "Erstelle eine Landing Page fuer ein SaaS-Produkt" | Design generiert, HTML-Artifact im Panel |
| 2 | "Mach den Header groesser" (nach Test 1) | Bestehendes Design iteriert, Version 2 |
| 3 | "Erstelle ein Mobile Dashboard" (deviceType) | Mobile-optimiertes Layout |
| 4 | Ohne `STITCH_API_KEY` | Tool nicht verfuegbar, kein Fehler |
| 5 | Design-Prompt bei Non-Design-Expert | LLM waehlt `create_artifact` oder `generate_design` passend |
| 6 | Sehr langer Prompt | Stitch kommt zurueck (bis 60s Timeout) |
| 7 | Chat mit Stitch-Artifact neuladen | Artifact sichtbar, Iteration weiterhin moeglich |
| 8 | Stitch API down | Klare Fehlermeldung, kein Crash |

---

## Referenzen

- [Stitch SDK Docs: AI SDK Integration](https://stitch.withgoogle.com/docs/sdk/ai-sdk/)
- [Stitch SDK Docs: Agent Workflows](https://stitch.withgoogle.com/docs/sdk/agent-workflows/)
- [Stitch SDK Docs: Edit Screen](https://stitch.withgoogle.com/docs/sdk/edit-screen/)
- [Stitch SDK Docs: Download Artifacts](https://stitch.withgoogle.com/docs/sdk/download-artifacts/)
- [Stitch SDK Docs: Reference](https://stitch.withgoogle.com/docs/sdk/reference/)
- [Stitch SDK Docs: Architecture](https://stitch.withgoogle.com/docs/sdk/architecture/)
