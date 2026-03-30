# 01 – Use Case mit Prompt

**ID:** `usecase-prompt`  
**Status:** ✅ validiert  
**Beispiel:** [usecase-prompt.html](usecase-prompt.html)

---

## Einsatz

Situation + konkreter Prompt zeigen. Ideal für:
- Prompt-Sammlungen
- KI-Tipps für spezifische Zielgruppen (Führungskräfte, Marketer, etc.)
- "So nutzt du KI für X"-Content

---

## Hintergrund

`bg-dark` oder `bg-dark-alt` – bei mehreren Slides gleichen Typs alternieren.

---

## Elemente

| Element | Font | Größe | Gewicht | Farbe |
|---------|------|-------|---------|-------|
| Top-Label | Instrument Serif | 18px | 400 | `--text-muted` |
| Pre-Label | Noto Sans | 14px | 700 | `--text-muted` |
| Headline | Noto Sans | 28px | 900 | `--text-primary` |
| Description | Instrument Serif | 20px | 400 italic | `--text-muted` |
| Prompt-Label | Noto Sans | 14px | 700 | `--accent` |
| Prompt-Box | Noto Sans | 18px | 500 | `--text-soft` |

---

## Spacing

| Nach Element | Abstand |
|--------------|---------|
| Top-Label | 32px (Standard) |
| Pre-Label | 16px |
| Headline | 12px |
| Description | **32px** |
| Prompt-Label | 10px |

Prompt-Box: `padding: 18px 22px`, `border-left: 4px solid accent`, `background: rgba(252, 45, 1, 0.08)`

---

## Constraints

| Element | Max Zeichen | Beispiel |
|---------|-------------|----------|
| Top-Label | 20 | "Situation 1 von 6" |
| Pre-Label | 20 | "#1 FEEDBACK" |
| Headline | 35 | "Feedback formulieren" |
| Description | 120 | "Du willst konstruktives Feedback geben – positiv oder kritisch – und suchst die richtigen Worte." |
| Prompt | 200 | Der eigentliche Prompt-Text |

---

## CSS

```css
/* Use Case mit Prompt – Spezifische Styles */

.usecase-slide .content-area {
    justify-content: flex-start;
    padding-top: 8px;
}

.usecase-prelabel {
    font-family: 'Noto Sans', sans-serif;
    font-size: 14px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 16px;
}

.usecase-name {
    font-family: 'Noto Sans', sans-serif;
    font-size: 28px;
    font-weight: 900;
    color: var(--text-primary);
    margin-bottom: 12px;
    line-height: 1.2;
}

.usecase-situation {
    font-family: 'Instrument Serif', serif;
    font-size: 20px;
    font-style: italic;
    color: var(--text-muted);
    max-width: 400px;
    line-height: 1.4;
    margin-bottom: 32px;
}

.prompt-label {
    font-family: 'Noto Sans', sans-serif;
    font-size: 14px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: var(--accent);
    margin-bottom: 10px;
}

.prompt-box {
    font-family: 'Noto Sans', sans-serif;
    font-size: 18px;
    font-weight: 500;
    color: var(--text-soft);
    line-height: 1.5;
    max-width: 420px;
    padding: 18px 22px;
    border-left: 4px solid var(--accent);
    background: rgba(252, 45, 1, 0.08);
}
```

---

## Validiert mit

- **Carousel:** "Prompts für Führungskräfte" (Slides 3-8)
- **Datum:** 2025-01-06
