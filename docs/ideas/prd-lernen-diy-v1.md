# PRD: lernen.diy v1 — Dialogbasierte Lernplattform

> Status: **In Planung**
> Erstellt: 2026-03-22
> Abhängigkeit: Bestehende AI Chat Plattform (siehe `platform-overview.md`)
> Geplante Erweiterung: Notes / Second Brain (siehe `prd-notes-second-brain.md`)

---

## Zusammenfassung

lernen.diy ist eine dialogbasierte KI-Lernplattform für Selbstlerner. Kein LMS, kein Kursmanagement, keine Badges. Stattdessen: Ein Chat-Interface mit kuratierter Wissensbasis, das auf Fragen nicht nur mit Text antwortet, sondern mit interaktiven UI-Elementen — Quizzes, Analysen, Prompt-Werkstätten.

**Kernidee:** KI zum Lernen von KI. Der Lerngegenstand ist gleichzeitig das Tool.

**Technische Umsetzung:** Eigene Vercel-Instanz der bestehenden Chat-Plattform. Kein Fork, keine separate Codebasis. Differenzierung über ENV-Variablen, eigene Experts/Skills, angepasstes Frontend.

### Erster Release: Zwei Lernbereiche

| Bereich | Thema | Content-Quelle |
|---|---|---|
| **AI Design** | Bildgenerierung mit dem 4K Framework | `02_KNOWLEDGE/AI-Media/Images/` |
| **GenAI Essentials** | Fähigkeiten, Prompting, Compliance | `02_KNOWLEDGE/AI-Essentials/` |

---

## Architektur-Entscheidungen

### Deployment-Modell

Die Plattform ist Single-Tenant pro Deployment. lernen.diy ist eine eigene Vercel-Instanz mit:

- Eigener Neon-Datenbank
- Eigener Logto-Application (Auth auf `auth.lernen.diy` oder shared Logto-Instanz)
- Eigenen ENV-Variablen und Feature-Flags
- Eigenen Seed-Daten (Experts, Skills, Models)
- Eigenem Branding (`src/config/brand.ts`)

### Wissensbasis: Skills, kein RAG

Die Wissensbasis wird über das bestehende **Agent Skills System** bereitgestellt. Kein RAG, kein Embedding, keine Vektordatenbank. Begründung:

- Bei 30-40 Skills ist on-demand Loading via `load_skill` performant genug
- Die KI sieht die Skill-Übersicht im System-Prompt und entscheidet selbst, wann sie einen Skill laden muss
- Das System existiert bereits und ist produktionsreif
- Skills können über Kategorien und Expert-Priorisierung (⭐) organisiert werden

### Geplante Erweiterung: Notes als Lern-Notizbuch

In einer späteren Phase wird das **Notes / Second Brain System** (siehe `prd-notes-second-brain.md`) als persönliches Wissensarchiv der Lernenden integriert. Skills = kuratiertes Lehrmaterial (read-only, system-level). Notes = Lern-Notizbuch der User (read-write, user-owned). Die beiden Systeme sind komplementär und ergänzen sich. Diese PRD behandelt nur die Skills-basierte Wissensbasis.

---

## Schritt 1: Wissensbasis — Brainsidian → Skills

### Quelle

Der Content liegt in einem Obsidian-Vault, auf den Claude Code via **Brainsidian MCP-Server** Zugriff hat (separates Projekt). Die relevanten Pfade:

```
02_KNOWLEDGE/
├── AI-Essentials/          → GenAI Essentials (18 Notes)
└── AI-Media/Images/        → AI Design (25+ Notes)
    ├── 01_Principles/      → Grundlagen (3 Notes)
    ├── 02_Generation/      → Text-to-Image + 4K Framework (7 Notes)
    ├── 03_Capabilities/    → Editing Capabilities (11 Notes)
    └── 04_Vocabulary/      → Prompt-Vokabular (6 Notes)
```

### Content-Struktur in Brainsidian

Jede Note hat:

**Frontmatter (YAML):**
```yaml
title: "Konzept – Subjekt, Medium, Eigenschaften"
type: knowledge               # immer "knowledge" für diese Notes
domain: AI-Media/Images        # Hierarchische Zuordnung
tags: [image-generation, prompting, 4k-framework]
# Optional (nur bei AI-Essentials):
audience: [einsteiger, praktiker, fuehrungskraft]
brand-fit: [loschke, unlearn, lernen]
intent: [verstehen, anwenden, vermitteln]
level: basic                   # oder basic-to-advanced
```

**Content (Markdown):**
- Strukturiertes Wissen mit Überschriften, Tabellen, Code-Blöcken
- Wikilinks zu anderen Notes: `[[Prompt-Engineering-Grundlagen]]` oder `[[Prompt-Engineering-Grundlagen|EAKAF-Framework]]`
- Prompt-Beispiele in Code-Blöcken
- Abschnitte wie "Verwendungshinweise", "Verknüpfungen", "Nächste Schritte"

### Aufbereitung: Brainsidian → Skill-Format

Claude Code führt die folgenden Schritte aus, um Brainsidian-Notes in plattformkompatible Skills umzuwandeln.

#### Schritt 1: Notes lesen

Über den Brainsidian MCP-Server alle Notes aus den zwei Bereichen lesen:

```
brainsidian:read_multiple_notes
  paths: [alle .md Dateien aus den Quell-Verzeichnissen]
  includeContent: true
  includeFrontmatter: true
```

MOC-Dateien (`_MOC.md`) und Overview-Dateien (`_Overview.md`, `_Capabilities-Overview.md`, `_4K-Framework.md`, `_Generation-Overview.md`, `_Token-Referenz.md`) werden ebenfalls importiert — sie dienen als Navigations-Skills, die der KI helfen, den richtigen Detail-Skill zu finden.

#### Schritt 2: Wikilinks transformieren

Wikilinks in Skill-Referenzen umwandeln. Das ermöglicht der KI, verwandte Skills on-demand nachzuladen.

**Transformation:**
```
[[Prompt-Engineering-Grundlagen]]
→ (→ Skill: prompt-engineering-grundlagen)

[[Prompt-Engineering-Grundlagen|EAKAF-Framework]]
→ EAKAF-Framework (→ Skill: prompt-engineering-grundlagen)

[[01_Principles/Mental-Models]]
→ (→ Skill: mental-models)

[[AI-Shifts/_MOC|AI-Shifts]]
→ AI-Shifts (→ externer Verweis, kein Skill vorhanden)
```

**Regeln:**
1. Wikilink-Target auf den Dateinamen (ohne Pfad, ohne Extension) reduzieren
2. Slug generieren: Lowercase, Umlaute ersetzen (ä→ae, ö→oe, ü→ue), Leerzeichen/Underscores → Bindestriche
3. Prüfen ob der referenzierte Skill im Import-Set existiert
4. Wenn ja: `(→ Skill: {slug})` anhängen
5. Wenn nein: `(→ externer Verweis, kein Skill vorhanden)` anhängen
6. Display-Text des Wikilinks beibehalten falls vorhanden

#### Schritt 3: Slug und Kategorie ableiten

**Slug-Generierung aus Dateiname:**
```
01-Konzept.md                    → konzept
Prompt-Engineering-Grundlagen.md → prompt-engineering-grundlagen
Object-Manipulation.md           → object-manipulation
_4K-Framework.md                 → 4k-framework-overview
_Capabilities-Overview.md        → capabilities-overview
_MOC.md (AI-Essentials)          → genai-essentials-moc
_MOC.md (AI-Media/Images)        → ai-design-moc
```

**Kategorie-Mapping (aus `domain` und Pfadposition):**

| Pfad-Pattern | Kategorie | Label |
|---|---|---|
| `AI-Media/Images/01_Principles/` | `ai-design-principles` | Grundlagen Bildgenerierung |
| `AI-Media/Images/02_Generation/4K-Framework/` | `ai-design-4k` | 4K Framework |
| `AI-Media/Images/02_Generation/` (Rest) | `ai-design-generation` | Bildgenerierung |
| `AI-Media/Images/03_Capabilities/` | `ai-design-capabilities` | AI Image Editing |
| `AI-Media/Images/04_Vocabulary/` | `ai-design-vocabulary` | Prompt-Vokabular |
| `AI-Media/Images/_MOC.md` | `ai-design` | AI Design (Übersicht) |
| `AI-Essentials/` (Grundlagen) | `genai-basics` | Was ist GenAI? |
| `AI-Essentials/` (Prompting) | `genai-prompting` | Arbeiten mit GenAI |
| `AI-Essentials/` (Architektur) | `genai-architecture` | Konzepte & Architektur |
| `AI-Essentials/` (Compliance) | `genai-compliance` | Sicherheit & Compliance |

**Feinzuordnung AI-Essentials (nach Dateiname):**

```
genai-basics:
  - Wie-LLMs-funktionieren
  - GenAI-Stack-Erklaermodell
  - KI-Faehigkeiten-Scope
  - Multimodalitaet-Ueberblick

genai-prompting:
  - Prompt-Engineering-Grundlagen
  - Context-Engineering-Grundlagen
  - Halluzinationen-und-Zuverlaessigkeit
  - Content-Bewertung-Checkliste

genai-architecture:
  - KI-Agents-Grundlagen
  - RAG
  - Modell-Landschaft
  - Kosten-und-Preismodelle

genai-compliance:
  - LLM-Sicherheitsrisiken-OWASP
  - Datenschutz-Input-Regeln
  - KI-Output-Risiken
  - KI-Sicherheit-Souveraenitaet
  - KI-Regulierung-Governance
```

#### Schritt 4: Skill-Beschreibung generieren

Für die Skill-Discovery braucht jede Skill eine kurze Beschreibung (1-2 Sätze). Diese wird aus dem Frontmatter-`title` und dem ersten Absatz des Contents abgeleitet.

**Beispiel:**
```
Title: "Konzept – Subjekt, Medium, Eigenschaften"
Erster Absatz: "Das Konzept definiert das 'Was' deines Bildes..."

→ Description: "Erste Dimension des 4K Frameworks: Definiert Subjekt/Objekt 
   und Medium eines Bildprompts. Enthält Beispiele nach Komplexitätsstufen."
```

Wenn der Content einen Abschnitt "Überblick" oder die erste H2-Section hat, diese als Basis nehmen. Sonst den ersten nicht-leeren Absatz nach der H1.

#### Schritt 5: In DB inserieren

Jeder aufbereitete Skill wird über die Admin-API (`POST /api/admin/skills`) oder direkt via Seed-Script importiert.

**Skill-Schema (Zielformat):**

```typescript
{
  slug: string,              // z.B. "konzept"
  name: string,              // z.B. "Konzept – Subjekt, Medium, Eigenschaften"
  description: string,       // 1-2 Sätze für Discovery
  content: string,           // Aufbereitetes Markdown (mit transformierten Wikilinks)
  category: string,          // z.B. "ai-design-4k"
  mode: "skill",             // Nicht "quicktask"
  isActive: true,
  sortOrder: number,         // Innerhalb der Kategorie
}
```

**Sortierung innerhalb Kategorien:**
- MOC/Overview-Skills zuerst (sortOrder: 0)
- Dann inhaltliche Reihenfolge (sortOrder: 10, 20, 30...)
- Bei 4K-Framework: Konzept=10, Kontext=20, Komposition=30, Kreativität=40
- Bei Capabilities: Business-Critical zuerst, dann Creative

#### Zusammenfassung: Import-Pipeline

```
Brainsidian (MCP)
  → read_multiple_notes (Content + Frontmatter)
  → Wikilinks transformieren (→ Skill-Referenzen)
  → Slug + Kategorie ableiten (aus Dateiname + Pfad)
  → Beschreibung generieren (aus Title + erstem Absatz)
  → Seed-Script oder Admin-API Import
  → Ergebnis: ~45 Skills in 10 Kategorien
```

### Skill-Inventar (vollständig)

| # | Slug | Kategorie | Quelle |
|---|---|---|---|
| 1 | `ai-design-moc` | `ai-design` | `AI-Media/Images/_MOC.md` |
| 2 | `mental-models` | `ai-design-principles` | `01_Principles/Mental-Models.md` |
| 3 | `how-ai-image-editing-works` | `ai-design-principles` | `01_Principles/How-AI-Image-Editing-Works.md` |
| 4 | `common-pitfalls` | `ai-design-principles` | `01_Principles/Common-Pitfalls.md` |
| 5 | `4k-framework-overview` | `ai-design-4k` | `02_Generation/4K-Framework/_4K-Framework.md` |
| 6 | `konzept` | `ai-design-4k` | `02_Generation/4K-Framework/01-Konzept.md` |
| 7 | `kontext` | `ai-design-4k` | `02_Generation/4K-Framework/02-Kontext.md` |
| 8 | `komposition` | `ai-design-4k` | `02_Generation/4K-Framework/03-Komposition.md` |
| 9 | `kreativitaet` | `ai-design-4k` | `02_Generation/4K-Framework/04-Kreativitaet.md` |
| 10 | `generation-overview` | `ai-design-generation` | `02_Generation/_Generation-Overview.md` |
| 11 | `prompt-formeln` | `ai-design-generation` | `02_Generation/Prompt-Formeln.md` |
| 12 | `capabilities-overview` | `ai-design-capabilities` | `03_Capabilities/_Capabilities-Overview.md` |
| 13 | `object-manipulation` | `ai-design-capabilities` | `03_Capabilities/Object-Manipulation.md` |
| 14 | `character-editing` | `ai-design-capabilities` | `03_Capabilities/Character-Editing.md` |
| 15 | `composition-scene-building` | `ai-design-capabilities` | `03_Capabilities/Composition-Scene-Building.md` |
| 16 | `style-materials` | `ai-design-capabilities` | `03_Capabilities/Style-Materials.md` |
| 17 | `light-color-optimization` | `ai-design-capabilities` | `03_Capabilities/Light-Color-Optimization.md` |
| 18 | `environment-scenes` | `ai-design-capabilities` | `03_Capabilities/Environment-Scenes.md` |
| 19 | `text-graphics` | `ai-design-capabilities` | `03_Capabilities/Text-Graphics.md` |
| 20 | `photo-restoration` | `ai-design-capabilities` | `03_Capabilities/Photo-Restoration.md` |
| 21 | `special-effects` | `ai-design-capabilities` | `03_Capabilities/Special-Effects.md` |
| 22 | `advanced-experimental` | `ai-design-capabilities` | `03_Capabilities/Advanced-Experimental.md` |
| 23 | `token-referenz` | `ai-design-vocabulary` | `04_Vocabulary/_Token-Referenz.md` |
| 24 | `perspektive` | `ai-design-vocabulary` | `04_Vocabulary/01-Perspektive.md` |
| 25 | `kamera-technik` | `ai-design-vocabulary` | `04_Vocabulary/02-Kamera-Technik.md` |
| 26 | `foto-stile` | `ai-design-vocabulary` | `04_Vocabulary/03-Foto-Stile.md` |
| 27 | `adjektive` | `ai-design-vocabulary` | `04_Vocabulary/04-Adjektive.md` |
| 28 | `farben-kontraste` | `ai-design-vocabulary` | `04_Vocabulary/05-Farben-Kontraste.md` |
| 29 | `genai-essentials-moc` | `genai-basics` | `AI-Essentials/_MOC.md` |
| 30 | `wie-llms-funktionieren` | `genai-basics` | `AI-Essentials/Wie-LLMs-funktionieren.md` |
| 31 | `genai-stack-erklaermodell` | `genai-basics` | `AI-Essentials/GenAI-Stack-Erklaermodell.md` |
| 32 | `ki-faehigkeiten-scope` | `genai-basics` | `AI-Essentials/KI-Faehigkeiten-Scope.md` |
| 33 | `multimodalitaet-ueberblick` | `genai-basics` | `AI-Essentials/Multimodalitaet-Ueberblick.md` |
| 34 | `prompt-engineering-grundlagen` | `genai-prompting` | `AI-Essentials/Prompt-Engineering-Grundlagen.md` |
| 35 | `context-engineering-grundlagen` | `genai-prompting` | `AI-Essentials/Context-Engineering-Grundlagen.md` |
| 36 | `halluzinationen-und-zuverlaessigkeit` | `genai-prompting` | `AI-Essentials/Halluzinationen-und-Zuverlaessigkeit.md` |
| 37 | `content-bewertung-checkliste` | `genai-prompting` | `AI-Essentials/Content-Bewertung-Checkliste.md` |
| 38 | `ki-agents-grundlagen` | `genai-architecture` | `AI-Essentials/KI-Agents-Grundlagen.md` |
| 39 | `rag` | `genai-architecture` | `AI-Essentials/RAG.md` |
| 40 | `modell-landschaft` | `genai-architecture` | `AI-Essentials/Modell-Landschaft.md` |
| 41 | `kosten-und-preismodelle` | `genai-architecture` | `AI-Essentials/Kosten-und-Preismodelle.md` |
| 42 | `llm-sicherheitsrisiken-owasp` | `genai-compliance` | `AI-Essentials/LLM-Sicherheitsrisiken-OWASP.md` |
| 43 | `datenschutz-input-regeln` | `genai-compliance` | `AI-Essentials/Datenschutz-Input-Regeln.md` |
| 44 | `ki-output-risiken` | `genai-compliance` | `AI-Essentials/KI-Output-Risiken.md` |
| 45 | `ki-sicherheit-souveraenitaet` | `genai-compliance` | `AI-Essentials/KI-Sicherheit-Souveraenitaet.md` |
| 46 | `ki-regulierung-governance` | `genai-compliance` | `AI-Essentials/KI-Regulierung-Governance.md` |

---

## Schritt 2: Expert — Lernbegleiter

### Expert-Konfiguration

Datei: Seed-Script in `src/lib/db/seed/` oder Admin-Import.

```typescript
{
  name: "Lernbegleiter",
  slug: "lernbegleiter",
  description: "Dein KI-Lernbegleiter für AI Design und GenAI Essentials",
  icon: "🎓",
  systemPrompt: LERNBEGLEITER_PROMPT,  // Siehe unten
  skillSlugs: [
    // Priorisiert (⭐ im System-Prompt)
    "4k-framework-overview",
    "prompt-engineering-grundlagen",
    "ki-faehigkeiten-scope",
    "capabilities-overview",
    "genai-essentials-moc",
    "ai-design-moc",
  ],
  modelPreference: null,
  temperature: { value: 0.7 },
  allowedTools: [
    "create_artifact",
    "create_quiz",
    "ask_user",
    "content_alternatives",
    "generate_image",
    "load_skill",
    "web_search",
    "web_fetch",
    "save_memory",
    "recall_memory",
    // Phase 2: Neue Tools
    "analyze_4k",
    "prompt_werkbank",
  ],
  mcpServerIds: [],
  isPublic: true,
  sortOrder: 0,
}
```

### System-Prompt

```markdown
Du bist der Lernbegleiter auf lernen.diy — eine KI-Lernplattform für Selbstlerner, die KI-Kompetenzen aufbauen wollen.

## Rolle

Du vermittelst Wissen über KI, indem du KI einsetzt. Du bist kein Chatbot mit Textwänden, sondern ein interaktiver Begleiter:
- Erkläre Konzepte, dann lade zum Ausprobieren ein
- Stelle Fragen statt nur Antworten zu geben
- Nutze interaktive Elemente, wo sie den Lerneffekt steigern
- Passe dich an das Level des Lernenden an

## Wissensbasis

Du hast Zugriff auf eine kuratierte Wissensbasis via Skills. Zwei Bereiche:

**AI Design / Bildgenerierung:**
- 4K Framework (Konzept, Kontext, Komposition, Kreativität)
- 10 Image Editing Capabilities mit Beispiel-Prompts
- Prompt-Vokabular (Perspektive, Kamera, Stile, Farben)
- Grundlagen (Mental Models, Pitfalls)

**GenAI Essentials:**
- Wie LLMs funktionieren, Fähigkeiten und Grenzen
- Prompting (EAKAF-Framework) und Context Engineering
- Agents, RAG, Modell-Landschaft, Kosten
- Compliance (DSGVO, AI Act, OWASP)

**Wichtig:** Lade den passenden Skill BEVOR du antwortest, wenn die Frage in einen dieser Bereiche fällt. Antworte nie aus dem Bauch heraus zu Themen, für die du einen Skill laden kannst. Dein Wissen ist geprüft und strukturiert — nutze es.

Skill-Referenzen in den Inhalten (markiert mit "→ Skill: slug-name") zeigen dir verwandte Skills, die du bei Bedarf nachladen kannst.

## Didaktische Prinzipien

1. **Zeigen statt beschreiben.** Nutze create_artifact (HTML, Markdown) für visuelle Erklärungen. Nutze create_quiz für Wissensüberprüfung. Nutze generate_image um Bildgenerierung live zu demonstrieren.

2. **Geführte Interaktion.** Nutze ask_user für Multiple-Choice, Vorwissen-Abfrage, Entscheidungen. Nutze content_alternatives für verschiedene Erklärungsansätze.

3. **4K als roter Faden.** Bei Bildgenerierung: Strukturiere Erklärungen und Übungen entlang der vier Dimensionen. Nutze analyze_4k für Live-Prompt-Analyse (wenn verfügbar).

4. **Adaptiv statt linear.** Kein fester Kursplan. Reagiere auf das, was gefragt wird. Wenn jemand direkt nach Bildgenerierung fragt, spring nicht erst durch "Grundlagen". Wenn jemand unsicher wirkt, frag nach dem Vorwissen.

5. **Kein Lob-Overkill.** Behandle Lernende als kompetente Erwachsene. Sag was gut ist und was besser werden kann.

6. **Maximal 3 Absätze, dann Interaktion.** Nach spätestens drei Absätzen eine Frage stellen, ein Quiz anbieten, oder eine Übung vorschlagen. Monologe verhindern Lernen.

## Sprache

Deutsch. Duze den Lernenden. Informell aber kompetent. Technische Begriffe erklären, wenn sie zum ersten Mal auftauchen. Kein Marketing-Sprech, keine Buzzwords.

## Was du NICHT tust

- Keine Kurse oder Lernpfade empfehlen, die nicht existieren
- Keine Tools empfehlen, ohne die Wissensbasis zu prüfen
- Keinen Content generieren, der über deine Wissensbasis hinausgeht, ohne das transparent zu machen ("Das steht nicht in meiner Wissensbasis, aber nach meinem Kenntnisstand...")
- Keine Teilnahme-Trophäen verteilen
```

---

## Schritt 3: Neue Generative UI-Komponenten

Zwei neue Tools spezifisch für den Lern-Kontext. Implementierung nach dem bestehenden Pattern (siehe `docs/generative-ui-tools-guide.md`).

### Tool 1: `analyze_4k` — Prompt-Analyse nach 4K Framework

**Typ:** Inline-Tool (wie `ask_user`). Pausiert den Stream, rendert interaktive Analyse, Lernender kann Prompt überarbeiten und erneut analysieren lassen.

**Zweck:** Analysiert einen Bildprompt visuell nach den vier Dimensionen. Kern-Lernwerkzeug.

#### Tool-Definition

**Datei:** `src/lib/ai/tools/analyze-4k.ts`

Die KI generiert die Analyse als strukturiertes Tool-Argument (kein execute, kein DB-Zugriff). Die Analyse wird clientseitig gerendert.

```typescript
parameters: z.object({
  prompt: z.string().describe("Der zu analysierende Bildprompt"),
  analysis: z.object({
    konzept: z.object({
      score: z.number().min(0).max(100),
      found: z.array(z.string()),     // Erkannte Elemente
      missing: z.array(z.string()),   // Verbesserungsvorschläge
      explanation: z.string(),
    }),
    kontext: z.object({ /* gleiche Struktur */ }),
    komposition: z.object({ /* gleiche Struktur */ }),
    kreativitaet: z.object({ /* gleiche Struktur */ }),
  }),
  overallScore: z.number().min(0).max(100),
  suggestion: z.string().describe("Konkreter nächster Verbesserungsschritt"),
})
```

**Kein `execute`.** Das Tool rendert die gestreamten Argumente direkt als UI. Der Rückkanal (`addToolResult`) sendet entweder einen überarbeiteten Prompt ("erneut analysieren") oder ein "weiter"-Signal.

#### Komponente

**Datei:** `src/components/generative-ui/analyze-4k.tsx`

```
┌─────────────────────────────────────────────┐
│  4K Prompt-Analyse                          │
│                                             │
│  "a vintage photo of a man in a café"       │
│                                             │
│  ┌──────────┐ ┌──────────┐                  │
│  │ Konzept  │ │ Kontext  │                  │
│  │ ████░░ 70│ │ ███░░░ 50│                  │
│  │ ✓ photo  │ │ ✓ café   │                  │
│  │ ✓ man    │ │ ✗ Aktion │                  │
│  │ ✗ Alter  │ │ ✗ Zeit   │                  │
│  └──────────┘ └──────────┘                  │
│  ┌──────────┐ ┌──────────┐                  │
│  │Komposit. │ │Kreativit.│                  │
│  │ ░░░░░░  0│ │ █░░░░░ 20│                  │
│  │ ✗ Perspek│ │ ✓ vintage│                  │
│  │ ✗ Aufbau │ │ ✗ Stil   │                  │
│  └──────────┘ └──────────┘                  │
│                                             │
│  Gesamt: 35/100                             │
│  💡 Ergänze eine Perspektive                │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │ Prompt anpassen...                   │   │
│  └──────────────────────────────────────┘   │
│  [Erneut analysieren]  [Weiter]             │
└─────────────────────────────────────────────┘
```

**Registrierung:**
1. `CUSTOM_RENDERED_TOOLS` Set erweitern um `"analyze_4k"`
2. Rendering-Branch in `chat-message.tsx`
3. Kein Eintrag in `use-artifact.ts` (kein Artifact)

### Tool 2: `prompt_werkbank` — Interaktiver Prompt-Builder

**Typ:** Artifact-Tool (wie `create_artifact`). Persistiert in DB, rendert im Side-Panel. Bietet Platz für längere Interaktion.

**Zweck:** Geführte Prompt-Entwicklung mit Aufgabenstellung, Hilfen und Verknüpfung zu `analyze_4k` und `generate_image`.

#### Tool-Definition

**Datei:** `src/lib/ai/tools/prompt-werkbank.ts`

```typescript
parameters: z.object({
  title: z.string(),
  task: z.string().describe("Aufgabenstellung für den Lernenden"),
  referencePrompt: z.string().optional().describe("Beispiel-Prompt als Orientierung"),
  fokus4k: z.array(z.enum(["konzept", "kontext", "komposition", "kreativitaet"]))
    .describe("Welche 4K-Dimensionen im Fokus stehen"),
  tips: z.array(z.string()).describe("Hilfestellungen"),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
})
```

**Mit `execute`.** Speichert als Artifact mit `type: "werkbank"` in DB.

#### Neuer ArtifactContentType

**Datei anpassen:** `src/types/artifact.ts`

```typescript
export type ArtifactContentType =
  | "markdown" | "html" | "code" | "quiz" | "review" | "image"
  | "werkbank";  // NEU
```

#### Komponente

**Datei:** `src/components/assistant/werkbank-renderer.tsx`

Rendert im Artifact-Panel (50% Breite, wie andere Artifacts):

- **Aufgabenstellung** (oben, statisch, aus Tool-Args)
- **Prompt-Textarea** (Hauptbereich, editierbar)
- **4K-Schnellcheck** (unter Textarea, clientseitige Heuristik: Keyword-Match pro Dimension, zeigt farbige Badges)
- **Buttons:**
  - "4K Analyse" → `sendPrompt("Analysiere folgenden Prompt mit dem 4K Framework: {prompt}")`
  - "Bild generieren" → `sendPrompt("Generiere ein Bild mit folgendem Prompt: {prompt}")`
- **Tipps** (ausklappbar, aus Tool-Args)

**Kommunikation Panel → Chat:** Über `sendPrompt()` Pattern. Die Werkbank sendet Aktionen als Chat-Nachrichten. Die KI reagiert mit dem passenden Tool (`analyze_4k` oder `generate_image`).

**Registrierung:**
1. `CUSTOM_RENDERED_TOOLS` Set erweitern um `"prompt_werkbank"`
2. Rendering-Branch in `chat-message.tsx` (ArtifactCard)
3. Detection in `use-artifact.ts` für Type `werkbank`
4. WerkbankRenderer in `artifact-panel.tsx` View-Switch

---

## Schritt 4: Landing Page & Topic-Cards

### Öffentliche Landing Page (nicht authentifiziert)

**Datei anpassen:** `src/app/page.tsx`

Für nicht-authentifizierte User: Marketing-Seite mit:

- Hero: "Lerne KI. Mit KI." + Subtitle
- Topic-Cards (3): Bilder generieren, Prompting lernen, GenAI verstehen
- Prompt-Input (deaktiviert, mit Hinweis "Kostenlos starten")
- CTA: Login/Registrierung

### Chat Empty State (authentifiziert)

**Datei anpassen:** `src/components/chat/chat-empty-state.tsx`

Statt Expert-Grid: **Topic-Cards als Quicktasks** + freies Prompt-Feld.

6 Topic-Cards:

| Card | Quicktask-Prompt | Kategorie |
|---|---|---|
| 🎨 Bilder mit KI erstellen | "Ich möchte lernen, wie ich mit KI Bilder generiere. Starte mit einer Einführung ins 4K Framework..." | AI Design |
| ✍️ Bessere Prompts schreiben | "Ich möchte besser prompten lernen. Starte mit dem EAKAF-Framework..." | Prompting |
| 🤖 Was kann KI eigentlich? | "Erkläre mir, was generative KI kann und wo die Grenzen sind..." | Basics |
| 📐 Das 4K Framework | "Erkläre mir das 4K Framework für Bildgenerierung im Detail..." | 4K |
| ⚖️ DSGVO & AI Act | "Was muss ich über Datenschutz und den AI Act wissen, wenn ich KI nutze?" | Compliance |
| 🔍 Wie LLMs funktionieren | "Erkläre mir einfach, wie große Sprachmodelle funktionieren..." | Basics |

**Implementation:** Quicktask-Skills (Mode `quicktask`) mit leeren `fields` (kein Formular nötig, direkter Prompt-Template).

---

## Schritt 5: Branding

### Brand-Config

**Datei anpassen:** `src/config/brand.ts`

```typescript
export const brand = {
  name: "lernen.diy",
  tagline: "Lerne KI. Mit KI.",
  url: "https://lernen.diy",
  colors: {
    primary: "#14B8A6",     // Teal 500
    primaryDark: "#0D9488",  // Teal 600
    accent: "#F472B6",       // Pink 400
  },
  logo: "/logo-lernen.svg",
};
```

### Feature-Flags (ENV)

```env
# Core
NEXT_PUBLIC_CHAT_ENABLED=true
NEXT_PUBLIC_DARK_MODE=true
NEXT_PUBLIC_MERMAID_ENABLED=true

# AI
VERCEL_AI_GATEWAY_URL=...
GOOGLE_GENERATIVE_AI_API_KEY=...
NEXT_PUBLIC_IMAGE_GENERATION=true

# Search + Memory
FIRECRAWL_API_KEY=...
MEM0_API_KEY=...

# Deaktiviert für v1
NEXT_PUBLIC_CREDITS_ENABLED=false
NEXT_PUBLIC_BUSINESS_MODE=false

# Admin + Auth
ADMIN_EMAILS=rico@loschke.ai
LOGTO_APP_ID=...
LOGTO_APP_SECRET=...
```

---

## Schritt 6: Deployment

| Komponente | Konfiguration |
|---|---|
| **Vercel** | Neues Projekt `lernen-diy`, gleiche Codebasis, Custom Domain `lernen.diy` |
| **Neon** | Eigene DB-Instanz oder Branch |
| **Logto** | Eigene Application, E-Mail OTP |
| **Seed** | Lernbegleiter-Expert, ~46 Skills, Model-Registry |

---

## Phasenplan

### Phase 1: Fundament (Woche 1)

| # | Aufgabe | Dateien |
|---|---|---|
| 1.1 | Brainsidian-Content lesen und aufbereiten (Wikilink-Transformation, Slugs, Kategorien, Beschreibungen) | Script oder manuell via Claude Code |
| 1.2 | Skills in DB importieren (Seed-Script) | `src/lib/db/seed/lernen-skills.ts` |
| 1.3 | Lernbegleiter-Expert anlegen | `src/lib/db/seed/lernen-experts.ts` |
| 1.4 | Brand-Config anpassen | `src/config/brand.ts` |
| 1.5 | Quicktask-Templates für Topic-Cards erstellen | 6 Skill-Dateien mit `mode: quicktask` |
| 1.6 | Landing Page (öffentlich) | `src/app/page.tsx` |
| 1.7 | Empty State (Topic-Cards statt Expert-Grid) | `chat-empty-state.tsx` |
| 1.8 | Deployment: Vercel + Neon + Logto | ENV-Konfiguration |
| 1.9 | Smoketest: Chat mit Skill-Loading, Quiz, Bildgenerierung | Manuell |

**Ergebnis Phase 1:** Funktionierendes Chat mit 46 Skills, Quizzes, Bildgenerierung, Memory. Bereits als MVP nutzbar und zeigbar.

### Phase 2: Generative UI (Woche 2-3)

| # | Aufgabe | Dateien |
|---|---|---|
| 2.1 | `analyze_4k` Tool-Definition | `src/lib/ai/tools/analyze-4k.ts` |
| 2.2 | Analyze4K Komponente | `src/components/generative-ui/analyze-4k.tsx` |
| 2.3 | Registrierung (CUSTOM_RENDERED_TOOLS, chat-message.tsx) | Bestehende Dateien anpassen |
| 2.4 | `prompt_werkbank` Tool-Definition | `src/lib/ai/tools/prompt-werkbank.ts` |
| 2.5 | ArtifactContentType `werkbank` ergänzen | `src/types/artifact.ts` |
| 2.6 | WerkbankRenderer Komponente | `src/components/assistant/werkbank-renderer.tsx` |
| 2.7 | Registrierung (use-artifact, artifact-panel, chat-message) | Bestehende Dateien anpassen |
| 2.8 | Testen: "Analysiere den Prompt: a photo of a cat" | Manuell |
| 2.9 | Testen: "Erstelle eine Übung zum Thema Komposition" | Manuell |

**Ergebnis Phase 2:** Interaktive 4K-Analyse und Prompt-Werkbank funktionieren.

### Phase 3: Polish & Content (Woche 3-4)

| # | Aufgabe |
|---|---|
| 3.1 | Memory-Tuning: System-Prompt anpassen für sinnvolle Lern-Extraktion |
| 3.2 | Landing Page ausbauen (mehr Inhalte, Social Proof) |
| 3.3 | User-Testing mit 3-5 Testpersonen (keine Techies) |
| 3.4 | Weitere Brainsidian-Bereiche evaluieren (AI-Agents, AI-Automation) |
| 3.5 | Performance: Skill-Loading-Zeiten messen, ggf. Skill-Chunking |

### Phase 4: Notes-Integration (nach PRD 2)

| # | Aufgabe |
|---|---|
| 4.1 | Notes-System aus PRD 2 implementieren (Plattform-Feature) |
| 4.2 | Note-Tools in Lernbegleiter-Expert `allowedTools` aufnehmen |
| 4.3 | System-Prompt erweitern: "Biete an, Gelerntes als Notiz zu speichern" |
| 4.4 | Testen: "Speichere die wichtigsten Punkte zum 4K Framework als Notiz" |

---

## Offene Entscheidungen

### 1. Shared Codebase vs. Branch

**Empfehlung: Shared Codebase.** Die Plattform ist über Feature-Flags und Brand-Config differenzierbar. lernen.diy-spezifische Komponenten (Werkbank, Analyze4K, Landing Page) werden über Conditional Rendering oder config-basierte Imports gesteuert.

### 2. Bildgenerierung: Kostenkontrolle

`generate_image` (Google Generative AI) kostet pro Bild.

**Empfehlung v1:** Rate-Limit auf 10 Bilder/User/Tag über bestehendes Rate-Limiting. Credits-System vorbereiten aber nicht aktivieren.

### 3. Wissensbasis-Sync

Brainsidian ist Source of Truth. Wie bleibt lernen.diy aktuell?

**Empfehlung v1:** Manueller Re-Import via Claude Code bei Content-Updates. Kein automatischer Sync. Bei Bedarf: Git-basierter CI/CD-Sync in Phase 3+.

---

## Datei-Übersicht

### Neue Dateien (12+)

| Datei | Phase |
|---|---|
| `src/lib/db/seed/lernen-skills.ts` | 1 |
| `src/lib/db/seed/lernen-experts.ts` | 1 |
| 6x Quicktask-Skill-Dateien | 1 |
| `src/lib/ai/tools/analyze-4k.ts` | 2 |
| `src/components/generative-ui/analyze-4k.tsx` | 2 |
| `src/lib/ai/tools/prompt-werkbank.ts` | 2 |
| `src/components/assistant/werkbank-renderer.tsx` | 2 |

### Modifizierte Dateien (6)

| Datei | Phase | Änderung |
|---|---|---|
| `src/config/brand.ts` | 1 | lernen.diy Branding |
| `src/app/page.tsx` | 1 | Landing Page |
| `src/components/chat/chat-empty-state.tsx` | 1 | Topic-Cards |
| `src/types/artifact.ts` | 2 | `werkbank` Type |
| `src/components/chat/chat-message.tsx` | 2 | Rendering-Branches |
| `src/hooks/use-artifact.ts` | 2 | Werkbank-Detection |

---

## Bewusst nicht enthalten

- **Kein LMS.** Keine Kursverwaltung, Lernpfade, Fortschritts-Tracking.
- **Kein RAG.** Skills-System reicht für 50 Skills. Embedding bei Bedarf in Phase 3+.
- **Keine User-generierte Wissensbasis.** Kommt mit Notes (PRD 2).
- **Keine Gamification.** Keine Badges, Streaks, Leaderboards.
- **Kein Multi-Language.** Deutsch only für v1.
- **Kein Pricing.** Kostenlos für v1. Credits-System existiert, wird bei Bedarf aktiviert.
