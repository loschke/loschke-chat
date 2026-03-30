# Titel-Slides

> Opener für Präsentationen, Keynotes, Workshops und Seminare.

---

## Brands

Alle Varianten sind Multi-Brand-fähig. Brand-Klasse auf `.slide` setzen:

| Brand       | Klasse           | Accent  | Logo          |
| ----------- | ---------------- | ------- | ------------- |
| loschke.ai  | (default)        | #FC2D01 | `RL.`         |
| unlearn.how | `.brand-unlearn` | #a855f7 | `unlearn.how` |
| lernen.diy  | `.brand-lernen`  | #0F766E | `lernen.diy`  |

**Beispiel:**

```html
<div class="slide bg-dark titel-centered brand-unlearn">
```

**Logo-HTML je Brand:**

```html
<!-- loschke.ai -->
<div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>

<!-- unlearn.how -->
<div class="logo logo-unlearn">
    <span class="brand-name">unlearn</span><span class="brand-ext">.how</span>
</div>

<!-- lernen.diy -->
<div class="logo logo-lernen">
    <span class="brand-name">lernen</span><span class="brand-ext">.diy</span>
</div>
```

---

## Einsatz

Erste Folie einer Präsentation. Setzt Ton, Thema und Absender.

---

## Varianten

| Variante | Klasse           | Use Case                                   |
| -------- | ---------------- | ------------------------------------------ |
| A        | `titel-centered` | Keynotes, klassische Vorträge              |
| B        | `titel-left`     | Impulsvorträge, provokante Opener          |
| C        | `titel-modul`    | Seminare, Workshop-Module, Schulungsreihen |
| D        | `titel-event`    | Kundenspezifische Keynotes, Konferenzen    |

---

## Variante A: Zentriert Classic

**Use Case:** Klassische Keynotes, formelle Vorträge, neutrale Präsentationen.

**Struktur:**

- `title`: Zentriert, Noto Sans 900, 88px
- `accent-line`: 120×4px, zentriert
- `subtitle`: Instrument Serif, 36px, letter-spacing 3px
- `speaker-block`: Absolut unten mittig (bottom: 140px)
  - `speaker-name`: Noto Sans 500, 26px
  - `speaker-role`: Instrument Serif, 22px muted
- `logo`: Zentriert im Footer

**Hintergrund:** `bg-dark`

**Optionale Elemente:**

- Subtitle (kann weggelassen werden)
- Speaker-Block (kann weggelassen werden)

---

## Variante B: Linksbündig Statement

**Use Case:** Impulsvorträge, provokante Opener, wenn der Titel selbst die Aussage ist.

**Struktur:**

- `top-label`: Instrument Serif, 32px, Accent, uppercase, letter-spacing 3px
- `title`: Noto Sans 900, 84px, uppercase, max-width 1300px
- `accent-line wide`: 200×4px
- `subtitle`: Instrument Serif, 40px muted, max-width 1000px
- `logo`: Rechts im Footer

**Hintergrund:** `bg-dark`

**Hinweis:** Titel ist uppercase – für maximale Wirkung bei kurzen, prägnanten Aussagen.

---

## Variante C: Modul/Workshop

**Use Case:** Seminare, Workshop-Module, Schulungsreihen mit nummerierten Teilen.

**Struktur:**

- `modul-badge`: Absolut oben links
  - `modul-number`: Noto Sans 900, 180px, Accent
- `modul-label`: Instrument Serif, 32px muted (z.B. "Modul", "Teil", "Tag")
- `title`: Noto Sans 900, 72px, max-width 1100px
- `subtitle`: Instrument Serif, 32px muted, max-width 900px
- `logo`: Rechts im Footer

**Hintergrund:** `bg-dark-alt` (zur Unterscheidung von Haupttitel)

**Hinweis:** Modul-Nummer kann auch Buchstabe sein (A, B, C) oder römische Zahl.

---

## Variante D: Event-Personalisiert

**Use Case:** Kundenspezifische Keynotes, Konferenzen, wenn Event-Bezug wichtig ist.

**Struktur:**

- `event-block`: Absolut oben links
  - `event-name`: Noto Sans 600, 24px
  - `event-meta`: Instrument Serif, 22px muted (Datum, Ort)
- `title`: Noto Sans 900, 80px, max-width 1400px
- `accent-line wide`: 200×4px
- `subtitle`: Instrument Serif, 36px muted, max-width 1000px
- `speaker-block`: Absolut unten links (bottom: 140px)
  - `speaker-name`: Noto Sans 600, 24px
  - `speaker-divider`: 2×24px, muted
  - `speaker-role`: Instrument Serif, 22px muted
- `logo`: Rechts im Footer

**Hintergrund:** `bg-dark`

**Optionale Elemente:**

- Event-Block (kann weggelassen werden für generische Version)
- Event-Meta (nur Event-Name reicht auch)

---

## Entscheidungshilfe

| Situation                              | Variante     |
| -------------------------------------- | ------------ |
| Klassische Keynote, neutraler Opener   | A (Centered) |
| Provokanter Titel, Statement-Charakter | B (Left)     |
| Teil einer Seminar-/Workshop-Reihe     | C (Modul)    |
| Vortrag bei Kunden-Event, Konferenz    | D (Event)    |

---

## Design-Konstanten

**Typografie:**

- Hero-Titel: Noto Sans 900, 72–88px (nie italic)
- Subtitles: Instrument Serif, 32–40px
- Labels: Instrument Serif, 22–32px, oft uppercase
- Speaker-Info: Noto Sans 500–600 für Name, Instrument Serif für Rolle

**Abstände:**

- Slide-Padding: 120px
- Accent-Line Margin: 40–48px
- Speaker-Block Position: bottom 140px

**Farben:**

- Titel immer `--text-primary` (weiß)
- Subtitles/Labels immer `--text-muted`
- Akzent-Linie immer `--accent`

---

## HTML-Vorlage

Siehe `titel-slides.html` für vollständige Templates aller Varianten.
