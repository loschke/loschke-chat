# 07 – Trap Solution

**ID:** `trap-solution`  
**Status:** ✅ validiert  
**Beispiel:** [trap-solution.html](trap-solution.html)

---

## Einsatz

Fehler/Falle mit Erklärung und Lösung. Drei-Schritt-Struktur für asymmetrische Inhalte. Ideal für:
- Prompt-Fallen mit besserer Alternative
- Häufige Fehler + warum sie problematisch sind + Lösung
- Wenn Bad-Beispiel (Prompt) und Lösung (Prinzip) nicht symmetrisch sind

**Unterschied zu `compare-better`:**
- compare-better: Symmetrischer Vergleich (Prompt vs. Prompt)
- trap-solution: Asymmetrisch (Fehler + Erklärung → Lösung/Prinzip)

---

## Hintergrund

`bg-dark` oder `bg-dark-alt` – bei mehreren Slides gleichen Typs alternieren.

---

## Elemente

| Element | Font | Größe | Gewicht | Farbe |
|---------|------|-------|---------|-------|
| Top-Label | Instrument Serif | 18px | 400 | `--text-muted` |
| Headline | Noto Sans | 28px | 900 | `--text-primary` |
| Trap-Label | Noto Sans | 12px | 700 | `--color-bad` |
| Trap-Example | Noto Sans | 18px | 500 | `--text-muted` |
| Trap-Problem | Instrument Serif | 18px | 400 italic | `--text-muted` @ 0.8 |
| Solution-Label | Noto Sans | 12px | 700 | `--color-good` |
| Solution-Text | Noto Sans | 18px | 600 | `--text-primary` |

---

## Spacing

| Element | Wert |
|---------|------|
| Content padding-top | 8px |
| Nach Headline | 24px |
| Nach Trap-Label | 8px |
| Nach Trap-Example | 20px |
| Nach Trap-Problem | 24px |
| Solution-Box padding | 18px 24px |
| Nach Solution-Label | 12px |

---

## Struktur

### Falle-Block (ohne Box)
- Label "Die Falle" in Rot
- Beispiel-Text
- Problem-Erklärung (warum das nicht funktioniert)

### Lösung-Block (mit Box)
- `background: rgba(67, 160, 71, 0.08)`
- `border-left: 3px solid var(--color-good)`
- `padding: 18px 24px`
- Label "Stattdessen" innerhalb der Box

---

## Constraints

| Element | Max Zeichen | Beispiel |
|---------|-------------|----------|
| Top-Label | 20 | "Falle 1 von 6" |
| Headline | 25 | "Zu vage" |
| Trap-Example | 120 | Der fehlerhafte Prompt/Ansatz |
| Trap-Problem | 120 | Warum das problematisch ist |
| Solution-Text | 100 | Die bessere Alternative (Prompt oder Prinzip) |

---

## CSS

```css
/* Trap Solution – Spezifische Styles */

.trap-solution .content-area {
    justify-content: flex-start;
    padding-top: 8px;
}

.trap-headline {
    font-family: 'Noto Sans', sans-serif;
    font-size: 28px;
    font-weight: 900;
    color: var(--text-primary);
    margin-bottom: 24px;
}

.trap-label {
    font-family: 'Noto Sans', sans-serif;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--color-bad);
    margin-bottom: 8px;
}

.trap-example {
    font-family: 'Noto Sans', sans-serif;
    font-size: 18px;
    font-weight: 500;
    color: var(--text-muted);
    line-height: 1.35;
    max-width: 420px;
    margin-bottom: 20px;
}

.trap-problem {
    font-family: 'Instrument Serif', serif;
    font-style: italic;
    font-size: 18px;
    color: var(--text-muted);
    margin-bottom: 24px;
    max-width: 420px;
    line-height: 1.4;
    opacity: 0.8;
}

.solution-box {
    background: rgba(67, 160, 71, 0.08);
    border-left: 3px solid var(--color-good);
    padding: 18px 24px;
}

.solution-label {
    font-family: 'Noto Sans', sans-serif;
    font-size: 12px;
    font-weight: 700;
    color: var(--color-good);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 12px;
}

.solution-text {
    font-family: 'Noto Sans', sans-serif;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.4;
}
```

---

## Labels

**Trap-Label Optionen:**
- "Die Falle"
- "Der Fehler"
- "Typisch"

**Solution-Label Optionen:**
- "Stattdessen"
- "Besser"

---

## Validiert mit

- **Carousel:** "Prompt Praxis #4 – Prompt-Fallen" (Slides 3-8)
- **Datum:** 2025-01-06
