# 05 – Compare Better

**ID:** `compare-better`  
**Status:** ✅ validiert  
**Beispiel:** [compare-better.html](compare-better.html)

---

## Einsatz

Vergleich zwischen suboptimaler und besserer Variante. Ideal für:
- Bias-Typen mit Gegenüberstellung
- Prompt-Fallen vs. bessere Formulierung
- Häufige Fehler korrigieren
- Vorher/Nachher ohne Bilder

**Fokus:** Die bessere Variante soll herausstechen (Grün als einziger Farbakzent).

---

## Hintergrund

`bg-dark` oder `bg-dark-alt` – bei mehreren Slides gleichen Typs alternieren.

**Wichtig:** Bad-Box Hintergrund invertiert automatisch (wie bei prompt-focused).

---

## Elemente

| Element | Font | Größe | Gewicht | Farbe |
|---------|------|-------|---------|-------|
| Top-Label | Instrument Serif | 18px | 400 | `--text-muted` |
| Headline | Noto Sans | 28px | 900 | `--text-primary` |
| Problem-Text | Instrument Serif | 20px | 400 italic | `--text-muted` |
| Bad-Label | Noto Sans | 12px | 700 | `--color-bad` (#E53935) |
| Bad-Text | Noto Sans | 16px | 500 | `--text-soft` @ 0.7 |
| Good-Label | Noto Sans | 12px | 700 | `--color-good` (#43A047) |
| Good-Text | Noto Sans | 18px | 600 | `--text-primary` |

---

## Spacing

| Element | Wert |
|---------|------|
| Content padding-top | 8px |
| Nach Headline | 16px |
| Nach Problem-Text | 28px |
| Bad-Box padding | 14px 20px |
| Nach Bad-Box | 20px |
| Good-Box padding | 18px 24px |
| Nach Labels | 8-10px |

---

## Box-Styles

### Bad-Box
- `background: var(--bg-dark-alt)` auf `bg-dark` Slides
- `background: var(--bg-dark)` auf `bg-dark-alt` Slides
- `border-left: 3px solid var(--color-bad)`

### Good-Box
- `background: rgba(67, 160, 71, 0.08)` (immer)
- `border-left: 4px solid var(--color-good)`

---

## Constraints

| Element | Max Zeichen | Beispiel |
|---------|-------------|----------|
| Top-Label | 20 | "Bias 1 von 6" |
| Headline | 30 | "Suggestive Fragen" |
| Problem-Text | 140 | Erklärung warum das problematisch ist |
| Bad-Text | 100 | Die suboptimale Formulierung |
| Good-Text | 120 | Die bessere Formulierung |

---

## Farben (zusätzlich zu Base)

```css
:root {
    --color-bad: #E53935;
    --color-good: #43A047;
}
```

---

## CSS

```css
/* Compare Better – Spezifische Styles */

.compare-better .content-area {
    justify-content: flex-start;
    padding-top: 8px;
}

.compare-headline {
    font-family: 'Noto Sans', sans-serif;
    font-size: 28px;
    font-weight: 900;
    color: var(--text-primary);
    margin-bottom: 16px;
}

.compare-problem {
    font-family: 'Instrument Serif', serif;
    font-style: italic;
    font-size: 20px;
    color: var(--text-muted);
    line-height: 1.4;
    max-width: 420px;
    margin-bottom: 28px;
}

.example-bad-box {
    border-left: 3px solid var(--color-bad);
    padding: 14px 20px;
    margin-bottom: 20px;
    background: var(--bg-dark-alt);
}

.slide.bg-dark-alt .example-bad-box {
    background: var(--bg-dark);
}

.example-bad-label {
    font-family: 'Noto Sans', sans-serif;
    font-size: 12px;
    font-weight: 700;
    color: var(--color-bad);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
}

.example-bad-text {
    font-family: 'Noto Sans', sans-serif;
    font-size: 16px;
    font-weight: 500;
    color: var(--text-soft);
    opacity: 0.7;
    line-height: 1.4;
}

.example-good-box {
    background: rgba(67, 160, 71, 0.08);
    border-left: 4px solid var(--color-good);
    padding: 18px 24px;
}

.example-good-label {
    font-family: 'Noto Sans', sans-serif;
    font-size: 12px;
    font-weight: 700;
    color: var(--color-good);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 10px;
}

.example-good-text {
    font-family: 'Noto Sans', sans-serif;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.4;
}
```

---

## Labels

**Bad-Label Optionen:**
- "Nicht optimal"
- "Vermeiden"
- "Typisch"

**Good-Label Optionen:**
- "Besser"
- "Empfohlen"

---

## Validiert mit

- **Carousel:** "Prompt Praxis #5 – Prompt-Bias" (Slides 3-8)
- **Datum:** 2025-01-06
