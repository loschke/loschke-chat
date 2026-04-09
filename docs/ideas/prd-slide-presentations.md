# PRD: Leichtgewichtige Slide-Präsentationen

## Zusammenfassung

Nutzer können Slide-Präsentationen im Chat erstellen, iterativ per Review-Modus überarbeiten und als interaktives HTML-Artifact mit Slide-Navigation anzeigen. Der gesamte Workflow nutzt ausschließlich bestehende Tools (`create_review` → `create_artifact`) und ein Markdown-basiertes Slide-Format, das jedes LLM zuverlässig produzieren kann.

## Motivation

Präsentationen sind ein häufiger Anwendungsfall, der bisher nur über komplexe HTML-Artifacts bedient werden kann. Das hat drei Probleme:

1. **Token-Kosten:** Ein 10-Slide HTML-Deck kostet 1500+ Zeilen Output-Tokens. Das gleiche als Markdown: ~200 Zeilen.
2. **Editierbarkeit:** HTML mit eingebettetem CSS können die wenigsten Nutzer im Artifact-Editor sinnvoll bearbeiten. Markdown kann jeder.
3. **LLM-Zuverlässigkeit:** Strukturiertes Markdown produziert jedes Modell fehlerfrei. Komplexes HTML mit konsistentem Styling ist fehleranfällig, besonders bei schwächeren Modellen.

## Lösung: Zwei-Phasen-Workflow

### Phase 1 — Strukturieren (Review-Modus)

Das LLM nutzt `create_review`, um die Präsentation als abnehmbare Struktur vorzulegen. Jede Slide wird eine Review-Sektion.

**So sieht das für den Nutzer aus:**

```
Review: "Präsentation — KI im Mittelstand"

Sektion 1: Titelslide
  "KI im Mittelstand — Chancen erkennen, pragmatisch starten"
  → [Passt] [Ändern] [Frage] [Raus]

Sektion 2: Agenda
  "Drei Themenblöcke: Status Quo, Einstiegspunkte, Erste Schritte"
  → [Passt] [Ändern] [Frage] [Raus]

Sektion 3: These
  "80% der KI-Projekte scheitern nicht an der Technik,
   sondern an fehlender Integration in bestehende Workflows."
  → [Passt] [Ändern] [Frage] [Raus]

...
```

Der Nutzer gibt pro Slide Feedback. Das LLM überarbeitet und legt ggf. einen neuen Review vor. Dieser Loop wiederholt sich, bis die Struktur steht.

**Keine Änderung am `create_review`-Tool nötig.** Der Review-Modus funktioniert genau so, wie er ist — Sektionen mit Titel, Inhalt und Feedback-Optionen pro Sektion.

### Phase 2 — Rendern (Slide-Artifact)

Wenn der Nutzer die Struktur freigibt, generiert das LLM ein HTML-Artifact über `create_artifact` (type: `html`), das die finalisierten Slides als navigierbares Slide-Deck rendert.

**Das Artifact enthält:**

- Slide-Container mit Keyboard-Navigation (← →) und Click-Navigation
- Slide-Counter ("3 / 12")
- Minimales, sauberes Styling per eingebettetem CSS
- Fullscreen-Toggle (optional)

**Das Artifact enthält NICHT:**

- Externe Dependencies (kein Marp, kein Framework)
- Komplexe Animationen oder Transitions
- Brand-spezifisches Theming (→ das ist ein späterer Ausbauschritt, s.u.)

## Technische Umsetzung

### Was gebaut werden muss: Skill

Ein neuer Skill `slide-presentations` steuert das LLM-Verhalten. Kein neues Tool, kein neuer Artifact-Typ, keine Code-Änderung.

**Skill-Inhalt (Kurzfassung der Logik):**

```markdown
---
name: Slide-Präsentation
slug: slide-presentations
description: Erstellt Slide-Präsentationen im Zwei-Phasen-Workflow — erst Struktur reviewen, dann als interaktives Slide-Deck rendern.
---

# Slide-Präsentation erstellen

## Phase 1: Struktur per Review

Wenn der Nutzer eine Präsentation wünscht:
1. Nutze `create_review` mit einer Sektion pro Slide
2. Sektion-Titel = Slide-Typ (z.B. "Titelslide", "These", "Agenda", "Vergleich")
3. Sektion-Content = Der vollständige Slide-Inhalt als Markdown
4. Verarbeite Nutzer-Feedback, überarbeite, lege neuen Review vor
5. Wiederhole bis der Nutzer die Struktur bestätigt

## Phase 2: Rendering als Artifact

Nach Freigabe:
1. Nutze `create_artifact` mit type "html"
2. Generiere ein self-contained HTML-Dokument
3. Slides als einzelne <section>-Elemente
4. Navigation: Pfeiltasten (← →), Click, Slide-Counter
5. Styling: Dunkler Hintergrund, helle Schrift, große Typografie
6. Kein externes CSS/JS, alles inline

## Slide-Format (Markdown-Konvention)

Jede Slide ist ein Markdown-Block, getrennt durch ---

Unterstützte Elemente pro Slide:
- # Hauptüberschrift (eine pro Slide)
- ## Zwischenüberschrift
- Fließtext (Absätze)
- Listen (- oder 1.)
- **Fett** und *kursiv*
- > Zitate/Statements
- Tabellen (Markdown-Syntax)
```

### Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| Admin UI → Skills | Neuen Skill `slide-presentations` anlegen |
| — | — |

**Das ist alles.** Keine Änderungen an Tools, API, Artifact-Rendering oder Datenbank.

### Warum kein neuer Artifact-Typ?

Ein dedizierter Typ `presentation` mit eigenem Renderer wäre sauberer, erzeugt aber sofort Aufwand in:
- `artifacts`-Tabelle (neuer Typ in der type-Enum)
- Artifact-Rendering-Komponente (neuer Renderer)
- Artifact-Editor (Markdown-Editing mit Slide-Preview?)

Das ist ein valider Ausbauschritt, aber für den Start unnötig. Ein HTML-Artifact mit eingebettetem Slide-Rendering erfüllt den gleichen Zweck mit null Infrastruktur-Aufwand.

## Abgrenzung

### Was dieses Feature IST
- Ein Skill, der das LLM anleitet, bestehende Tools in einer bestimmten Reihenfolge zu nutzen
- Ein leichtgewichtiger Weg, Präsentationen zu erstellen, die gut genug aussehen
- Ein Workflow, der mit jedem Modell funktioniert (Claude, Gemini, GPT)

### Was dieses Feature NICHT IST
- Kein Ersatz für professionelle Präsentations-Tools
- Kein Brand-Theming-System (kommt ggf. später)
- Kein PPTX-Export (→ dafür gibt es `code_execution` mit Anthropic-Modellen)
- Kein neues Tool oder neuer Artifact-Typ

## Spätere Ausbaustufen (nicht Teil dieses PRD)

1. **Brand-Theming:** Nutzer oder Admin hinterlegt Farben/Fonts, Skill referenziert sie. Könnte über `extract_branding` + Memory realisiert werden.
2. **Dedizierter Artifact-Typ `presentation`:** Eigener Renderer mit Slide-Panel, Thumbnail-Sidebar, Speaker-Notes. Lohnt sich erst wenn der Basis-Workflow validiert ist.
3. **PPTX-Export:** Finalisiertes Markdown → PPTX über `code_execution` (python-pptx). Setzt Anthropic-Modell voraus.
4. **Slide-Templates im Skill:** Vordefinierte Layouts (Titel, Vergleich, Statistik, Quote) als HTML-Snippets in Skill-Resources. LLM wählt pro Slide das passende Template.

## Erfolgskriterien

- Nutzer kann in einem Chat eine Präsentation erstellen, die Struktur reviewen, Änderungen einarbeiten lassen und ein navigierbares Slide-Deck erhalten
- Der Workflow funktioniert mit jedem in der Model-Registry verfügbaren Modell
- Die Token-Kosten pro Präsentation sind messbar niedriger als bei reinem HTML-Ansatz
- Kein Deployment nötig — nur ein Skill-Import über die Admin-UI
