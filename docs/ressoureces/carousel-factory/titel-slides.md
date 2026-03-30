# 08 – Titel-Slides

**ID:** `titel-slides`  
**Status:** ✅ validiert  
**Beispiel:** [titel-slides.html](titel-slides.html)

---

## Übersicht

8 Titel-Varianten für verschiedene Einsatzzwecke. Alle nutzen dieselbe Basis-Struktur, variieren in Layout und Charakter.

| Variante | Klasse | Einsatz |
|----------|--------|---------|
| A | `titel-left-border` | Praxis-Serie, Guides (mit Akzentlinie) |
| B | `titel-left-clean` | Allgemein, clean ohne Border |
| C | `titel-centered` | Klassisch, neutral |
| D | `titel-bold` | Starke Statements, provokant |
| E | `titel-number` | Listen, Frameworks, Checklisten |
| F | `titel-personal` | Feldnotizen, persönliche Learnings |
| G | `titel-minimal` | Sehr reduziert, nur Headline |
| H | `titel-statement` | Fragen, Thesen |

---

## Hintergrund

`bg-dark` oder `bg-dark-alt` – je nach Kontext.

---

## Gemeinsame Elemente

| Element | Font | Größe | Gewicht | Farbe |
|---------|------|-------|---------|-------|
| Top-Label | Instrument Serif | 18px | 400 | `--text-muted` |
| Headline | Noto Sans | variiert | 900 | `--text-primary` |
| Subline | Instrument Serif | 22px | 400 | `--text-muted` |
| Series-Badge | Noto Sans | 12px | 700 | `--bg-dark` auf `--text-muted` |

---

## Series-Badge (optional)

```css
.series-badge {
    position: absolute;
    top: var(--slide-padding);
    right: var(--slide-padding);
    font-family: 'Noto Sans', sans-serif;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--bg-dark);
    background: var(--text-muted);
    padding: 6px 12px;
}
```

---

## Variante A: Left mit Border

**Einsatz:** Praxis-Serie, strukturierte Guides

```css
.titel-left-border .content-area {
    justify-content: center;
    padding-left: 28px;
    border-left: 4px solid var(--accent);
}

.titel-left-border .headline {
    font-size: 44px;
    max-width: 400px;
}

.titel-left-border .subline {
    margin-top: 20px;
    max-width: 360px;
}
```

---

## Variante B: Left ohne Border

**Einsatz:** Allgemein, wenn Border zu viel ist

```css
.titel-left-clean .content-area {
    justify-content: center;
}

.titel-left-clean .headline {
    font-size: 44px;
    max-width: 420px;
}

.titel-left-clean .subline {
    margin-top: 20px;
    max-width: 380px;
}
```

---

## Variante C: Centered

**Einsatz:** Klassisch, neutral, symmetrisch

```css
.titel-centered .content-area {
    justify-content: center;
    align-items: center;
    text-align: center;
}

.titel-centered .headline {
    font-size: 44px;
    max-width: 420px;
}

.titel-centered .subline {
    margin-top: 20px;
    max-width: 380px;
}
```

---

## Variante D: Bold / Dominant

**Einsatz:** Starke Statements, provokante Titel, Aufmerksamkeit

```css
.titel-bold .content-area {
    justify-content: flex-end;
    padding-bottom: 20px;
}

.titel-bold .top-label {
    position: absolute;
    top: var(--slide-padding);
    left: var(--slide-padding);
}

.titel-bold .headline {
    font-size: 52px;
    max-width: 100%;
}

.titel-bold .subline {
    margin-top: 16px;
    max-width: 400px;
}
```

---

## Variante E: Mit Nummer

**Einsatz:** Listen, Frameworks, "X Dinge über Y"

```css
.titel-number .content-area {
    justify-content: center;
}

.titel-number .number-badge {
    font-family: 'Noto Sans', sans-serif;
    font-weight: 900;
    font-size: 72px;
    color: var(--accent);
    line-height: 1;
    margin-bottom: 16px;
}

.titel-number .headline {
    font-size: 36px;
    max-width: 400px;
}

.titel-number .subline {
    margin-top: 16px;
    max-width: 380px;
}
```

**Zusätzliches Element:**
```html
<div class="number-badge">5</div>
```

---

## Variante F: Personal / Feldnotiz

**Einsatz:** Persönliche Learnings, Erfahrungsberichte

```css
.titel-personal .content-area {
    justify-content: center;
}

.titel-personal .personal-intro {
    font-family: 'Instrument Serif', serif;
    font-style: italic;
    font-size: 24px;
    color: var(--text-muted);
    margin-bottom: 28px;
    max-width: 400px;
    line-height: 1.4;
}

.titel-personal .headline {
    font-size: 38px;
    max-width: 420px;
}
```

**Zusätzliches Element:**
```html
<p class="personal-intro">Ich dachte, das Problem wäre die Technologie. Es war etwas anderes.</p>
```

---

## Variante G: Minimal

**Einsatz:** Sehr reduziert, einzelner Gedanke, kurze Headlines

```css
.titel-minimal .content-area {
    justify-content: center;
    align-items: center;
    text-align: center;
}

.titel-minimal .top-label {
    position: absolute;
    top: var(--slide-padding);
    left: 50%;
    transform: translateX(-50%);
    margin-bottom: 0;
}

.titel-minimal .headline {
    font-size: 40px;
    font-weight: 700;
    max-width: 380px;
}
```

---

## Variante H: Statement-Style

**Einsatz:** Fragen, Thesen, provokante Aussagen

```css
.titel-statement .content-area {
    justify-content: center;
}

.titel-statement .headline {
    font-size: 40px;
    max-width: 440px;
}

.titel-statement .subline {
    margin-top: 24px;
    max-width: 400px;
}
```

---

## Constraints

| Element | Max Zeichen |
|---------|-------------|
| Top-Label | 25 |
| Headline | 60–80 (je nach Variante) |
| Subline | 80 |
| Personal-Intro | 100 |
| Series-Badge | 10 |

---

## Top-Label Beispiele

- Serien: "Prompt Praxis #4 von 10"
- Kategorie: "KI-Strategie", "Praxis-Guide", "Framework"
- Charakter: "Feldnotiz", "Gedanke", "These", "Die Frage"

---

## Validiert mit

- **Carousel:** "Prompt Praxis" Serie (Slides 1)
- **Datum:** 2025-01-06
