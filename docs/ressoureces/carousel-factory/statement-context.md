# 02 – Statement mit Kontext

**ID:** `statement-context`  
**Status:** ✅ validiert  
**Beispiel:** [statement-context.html](statement-context.html)

---

## Einsatz

Flexibler Slide für:
- Problem-Setup ("Das Problem ist...")
- Kontext/Einleitung ("Die Realität ist...")
- These/Behauptung aufstellen
- Überleitung zwischen Abschnitten

---

## Hintergrund

`bg-dark` oder `bg-dark-alt` – bei mehreren Slides gleichen Typs alternieren.

---

## Elemente

| Element | Font | Größe | Gewicht | Farbe |
|---------|------|-------|---------|-------|
| Top-Label | Instrument Serif | 18px | 400 | `--text-muted` |
| Headline | Noto Sans | 36px | 900 | `--text-primary` |
| Accent (in Headline) | Noto Sans | 36px | 900 | `--accent` |
| Subline | Instrument Serif | 24px | 400 | `--text-muted` |

---

## Spacing

| Nach Element | Abstand |
|--------------|---------|
| Top-Label | 32px (Standard) |
| Headline | **24px** |

Headline: `max-width: 440px`  
Subline: `max-width: 400px`

---

## Constraints

| Element | Max Zeichen | Beispiel |
|---------|-------------|----------|
| Top-Label | 25 | "Das Problem" |
| Headline | 80 | "'Gib mir 10 Ideen' liefert 10 mittelmäßige Ideen." |
| Subline | 120 | "Bessere Prompts führen zu besseren Ideen – von der ersten Sammlung bis zur Auswahl." |

---

## CSS

```css
/* Statement mit Kontext – Spezifische Styles */

.statement .content-area {
    justify-content: center;
}

.statement .headline {
    font-family: 'Noto Sans', sans-serif;
    font-weight: 900;
    font-size: 36px;
    color: var(--text-primary);
    line-height: 1.15;
    max-width: 440px;
}

.statement .headline .accent {
    color: var(--accent);
}

.statement .subline {
    font-family: 'Instrument Serif', serif;
    font-size: 24px;
    color: var(--text-muted);
    line-height: 1.4;
    margin-top: 24px;
    max-width: 400px;
}
```

---

## Varianten

**Top-Label Optionen:**
- "Das Problem"
- "Die Realität"
- "Der Kontext"
- "Die Frage"
- "Die These"

**Accent-Nutzung:**
Ein Wort oder kurze Phrase in der Headline kann mit `<span class="accent">` hervorgehoben werden – sparsam einsetzen.

---

## Validiert mit

- **Carousel:** "Prompt Praxis #9 – Ideen entwickeln" (Slide 2)
- **Datum:** 2025-01-06
