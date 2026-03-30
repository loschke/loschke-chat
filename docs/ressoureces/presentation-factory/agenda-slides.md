# Agenda-Slides

> Übersichtsfolien für Vortragsstruktur, Seminarpläne und Workshop-Abläufe.

---

## Brands

Alle Varianten sind Multi-Brand-fähig. Brand-Klasse auf `.slide` setzen:

| Brand | Klasse | Accent |
|-------|--------|--------|
| loschke.ai | (default) | #FC2D01 |
| unlearn.how | `.brand-unlearn` | #a855f7 |
| lernen.diy | `.brand-lernen` | #0F766E |

---

## Varianten-Übersicht

| Variante | Klasse | Use Case |
|----------|--------|----------|
| A | `agenda-simple` | Keynote, kurzer Vortrag – nur Titel |
| B | `agenda-detailed` | Mittellanger Vortrag – Titel + Beschreibung |
| C | `agenda-schedule` | Workshop-Tag mit Uhrzeiten |
| D | `agenda-visual` | Seminar-Überblick mit großen Nummern |

---

## Variante A: Nummeriert Einfach

**Use Case:** Keynote, kurzer Vortrag, 3-5 Punkte ohne Details.

**Struktur:**
- `agenda-header`: Label + Titel + Accent-Line
  - `agenda-label`: Instrument Serif, 32px muted
  - `agenda-title`: Noto Sans 900, 56px
  - `accent-line`: 120×4px
- `agenda-list`: Flex-Column, gap 36px
  - `item-number`: Noto Sans 900, 52px Accent
  - `item-title`: Noto Sans 700, 40px

**Hintergrund:** `bg-dark`

---

## Variante B: Mit Beschreibung

**Use Case:** Mittellanger Vortrag, mehr Kontext pro Punkt.

**Struktur:**
- `agenda-header`: wie Variante A
- `agenda-list`: Flex-Column, gap 44px
  - `item-number`: Noto Sans 900, 48px Accent
  - `item-content`: 
    - `item-title`: Noto Sans 700, 36px
    - `item-description`: Instrument Serif, 30px muted

**Hintergrund:** `bg-dark-alt` empfohlen

---

## Variante C: Zeitplan Kompakt

**Use Case:** Workshop-Tag mit konkreten Uhrzeiten.

**Struktur:**
- `agenda-header`: Label "Tagesablauf", Titel "Agenda"
- `schedule-list`: Flex-Column, gap 10px
  - `schedule-row`: Flex, padding 18px 28px, bg-dark-alt
    - `schedule-time`: Noto Sans 600, 26px muted, min-width 260px
    - `schedule-activity`: Noto Sans 600, 28px

**Modifikatoren:**
- `.is-break`: Transparenter Hintergrund, opacity 0.5 (für Pausen)
- `.is-highlight`: Accent-Hintergrund (für aktuellen Punkt)

**Hintergrund:** `bg-dark`

---

## Variante D: Themenblöcke mit Nummern

**Use Case:** Seminar-Überblick, Kurs-Struktur – visuell ansprechend.

**Struktur:**
- 3-Spalten-Layout (horizontal zentriert):
  - `visual-left`: Titel + Accent-Line + Label
    - `visual-title`: Noto Sans 900, 56px
    - `visual-label`: Instrument Serif, 32px muted
  - `visual-blocks`: Flex mit gap 48px
    - `blocks-numbers`: Große Nummern vertikal
      - `block-number`: Noto Sans 900, 72px Accent, height 140px
    - `blocks-content`: Text-Blöcke vertikal
      - `block-item`: Border-left 3px Accent, height 140px
        - `block-title`: Noto Sans 700, 32px
        - `block-description`: Instrument Serif, 26px muted

**Hintergrund:** `bg-dark`

---

## Entscheidungshilfe

| Situation | Empfehlung |
|-----------|------------|
| Kurze Keynote (15-30 min) | A (Nummeriert Einfach) |
| Vortrag mit mehr Kontext | B (Mit Beschreibung) |
| Ganztages-Workshop | C (Zeitplan) |
| Seminar/Kurs-Überblick | D (Themenblöcke) |
| Navigation während Vortrag | C mit `.is-highlight` |

---

## Design-Konstanten

**Slide-Padding:** 120px (alle Seiten)

**Logo-Position:** Immer rechts unten

**Typografie:**
- Header-Label: Instrument Serif, 32px muted
- Header-Titel: Noto Sans 900, 56px
- Nummern: Noto Sans 900, 48-72px Accent
- Item-Titel: Noto Sans 700, 32-40px
- Beschreibungen: Instrument Serif, 26-30px muted

**Zeitplan-Zeilen:**
- Normale Zeilen: bg-dark-alt
- Pausen: transparent, opacity 0.5
- Highlight: bg-accent

---

## HTML-Vorlage

Siehe `agenda-slides.html` für vollständige Templates aller Varianten.
