---
name: presentation-factory
description: "Präsentations-Factory für 1920×1080 Slides. Multi-Brand-fähig (loschke.ai, unlearn.how, lernen.diy). Enthält 18 validierte Slide-Typen. Zwei Modi: Preview (Slides untereinander) und Präsentation (klickbar). Bei Erstellung Brand fragen oder loschke.ai als Default."
---

# Presentation Factory – Slide-Bibliothek

Validierte Slide-Typen für Präsentationen. Multi-Brand-fähig. Zwei Ausgabe-Modi.

## Slide-Typen

| ID  | Name                 | Einsatz                  | Varianten |
| --- | -------------------- | ------------------------ | --------- |
| 01  | titel-slides         | Opening, Titelfolie      | A–D (4)   |
| 02  | agenda-slides        | Agenda, Übersicht        | A–C (3)   |
| 03  | kapitel-slides       | Kapitel-Trenner          | A–C (3)   |
| 04  | content-text-slides  | Fließtext, Erklärungen   | A–G (7)   |
| 05  | content-grid-slides  | Grid-Layouts, Karten     | A–E (5)   |
| 06  | content-split-slides | 50/50 Layouts            | A–B (2)   |
| 07  | content-flow-slides  | Prozesse, Flows          | A–C (3)   |
| 08  | content-emoji-slides | Emoji-basierte Inhalte   | A–C (3)   |
| 09  | liste-slides         | Listen, Aufzählungen     | A–D (4)   |
| 10  | quote-slides         | Zitate                   | A–D (4)   |
| 11  | statement-slides     | Statements, Thesen       | A–C (3)   |
| 12  | statistik-slides     | Zahlen, KPIs             | A–D (4)   |
| 13  | vergleich-slides     | Gegenüberstellungen      | A–C (3)   |
| 14  | tabelle-slides       | Tabellarische Daten      | A–C (3)   |
| 15  | framework-slides     | Frameworks mit Indikator | A–B (2)   |
| 16  | about-slides         | Speaker-Vorstellung      | A–E (5)   |
| 17  | cta-slides           | Call-to-Action           | A–E (5)   |
| 18  | closing-slides       | Abschluss, Danke         | A–D (4)   |

**Für Specs eines Typs:** `[name].md` lesen
**Für HTML-Template:** `[name].html` verwenden

## Brand & Design

**Farben, Typografie, Logos:** Lies aus Brainsidian
→ `04_BRANDS/Visual-Identity-Reference.md`

**Drei Brands:** loschke.ai (default), unlearn.how, lernen.diy

**Format:**

- Slide: 1920 × 1080px
- Padding: 100px
- Footer: 80px

**Typografie-Kurzform:**

| Element         | Font              | Größe |
| --------------- | ----------------- | ----- |
| Große Headlines | Noto Sans 900     | 72px  |
| Headlines       | Noto Sans 900     | 56px  |
| Subheadlines    | Noto Sans 900     | 48px  |
| Labels          | Instrument Serif  | 32px  |
| Sublines        | Instrument Serif  | 36px  |
| Body            | Noto Sans 400–600 | 32px  |
| Source/Meta     | Noto Sans 400     | 28px  |

## Design-Regeln

1. **Hintergründe alternieren:** bg-dark / bg-dark-alt wechseln
2. **Accent sparsam:** nur für Highlights, wichtige Wörter, CTAs
3. **Ein Gedanke pro Slide:** Klarheit vor Vollständigkeit
4. **Instrument Serif für Labels/Sublines:** immer mind. 32px
5. **Footer rechts:** Logo in rechter unterer Ecke

## Workflow

1. Brand wählen (oder Default loschke.ai)
2. Farben aus `04_BRANDS/Visual-Identity-Reference.md` in Brainsidian lesen
3. Slide-Typen wählen
4. `[name].md` für Specs lesen
5. `[name].html` als Template nutzen
6. Inhalte einsetzen
7. Modus wählen (Preview oder Präsentation)

## Ausgabe-Modi

### Modus 1: Preview (Slides untereinander)

Zum Erarbeiten und Reviewen. Alle Slides auf einen Blick, 50% skaliert.

```css
.slide {
    transform: scale(0.5);
    margin-bottom: -540px; /* Kompensiert Scale */
}
```

### Modus 2: Präsentation (Klickbar)

Zum Präsentieren. Fullscreen, Navigation mit Pfeiltasten oder Klick.

**Navigation:**

- `→` oder `Space`: Nächste Folie
- `←`: Vorherige Folie
- `Home`: Erste Folie
- `End`: Letzte Folie
- Klick rechte Hälfte: Vor
- Klick linke Hälfte: Zurück

Für Präsentations-JavaScript siehe bestehendes Template.

## Typische Präsentations-Struktur

| Position | Typ                             | Zweck               |
| -------- | ------------------------------- | ------------------- |
| 1        | titel-slides                    | Opening             |
| 2        | about-slides                    | Speaker-Vorstellung |
| 3        | agenda-slides                   | Überblick           |
| 4–5      | kapitel-slides                  | Kapitel-Trenner     |
| 6–15     | content-*, liste-*, vergleich-* | Hauptinhalt         |
| 16–17    | statement-slides, quote-slides  | Key Messages        |
| 18       | cta-slides                      | Call-to-Action      |
| 19       | closing-slides                  | Abschluss           |

## Footer-Struktur

```html
<div class="slide-footer">
    <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
</div>
```

Für Brand-spezifische Logos siehe `_brands.css`.

## Datei-Struktur

```
presentation-factory/
├── _base.css           # Gemeinsame Styles
├── _brands.css         # Brand-Definitionen
├── [name]-slides.html  # HTML-Templates
├── [name]-slides.md    # Dokumentation
└── SKILL.md            # Diese Datei
```
