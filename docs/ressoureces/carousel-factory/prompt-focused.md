# 04 – Prompt Focused

**ID:** `prompt-focused`  
**Status:** ✅ validiert  
**Beispiel:** [prompt-focused.html](prompt-focused.html)

---

## Einsatz

Prompt-zentrierter Slide – der Prompt ist der Star. Weniger Setup als `usecase-prompt`. Ideal für:
- Prompt-Sammlungen mit vielen Beispielen
- Schnelle Tipps ohne viel Kontext
- Recherche-Prompts, Tool-Prompts

**Unterschied zu `usecase-prompt`:**
- usecase-prompt: Situation erklären → dann Prompt (mehr Kontext)
- prompt-focused: Ziel nennen → Prompt zeigen → kurze Erklärung (Prompt als Star)

---

## Hintergrund

`bg-dark` oder `bg-dark-alt` – bei mehreren Slides gleichen Typs alternieren.

**Wichtig:** Prompt-Box Hintergrund invertiert automatisch (dunkel auf hell, hell auf dunkel).

---

## Elemente

| Element | Font | Größe | Gewicht | Farbe |
|---------|------|-------|---------|-------|
| Top-Label | Instrument Serif | 18px | 400 | `--text-muted` |
| Prompt-Goal | Noto Sans | 14px | 700 | `--accent` |
| Prompt-Text | Noto Sans | 24px | 700 | `--text-primary` |
| Prompt-Context | Instrument Serif | 22px | 400 italic | `--text-muted` |

---

## Spacing

| Element | Wert |
|---------|------|
| Content padding-top | 20px |
| Nach Prompt-Goal | 28px |
| Prompt-Box padding | 28px |
| Nach Prompt-Box | 28px |

---

## Prompt-Box

- `background: var(--bg-dark-alt)` auf `bg-dark` Slides
- `background: var(--bg-dark)` auf `bg-dark-alt` Slides
- `border-left: 4px solid var(--accent)`
- `max-width: 420px`

---

## Constraints

| Element | Max Zeichen | Beispiel |
|---------|-------------|----------|
| Top-Label | 20 | "Prompt 1 von 6" |
| Prompt-Goal | 30 | "Fakten verifizieren" |
| Prompt-Text | 150 | Der eigentliche Prompt |
| Prompt-Context | 140 | Kurze Erklärung wann/warum |

---

## CSS

```css
/* Prompt Focused – Spezifische Styles */

.prompt-focused .content-area {
    justify-content: flex-start;
    padding-top: 20px;
}

.prompt-goal {
    font-family: 'Noto Sans', sans-serif;
    font-size: 14px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: var(--accent);
    margin-bottom: 28px;
}

.prompt-text {
    font-family: 'Noto Sans', sans-serif;
    font-size: 24px;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.35;
    max-width: 420px;
    padding: 28px;
    background: var(--bg-dark-alt);
    border-left: 4px solid var(--accent);
    margin-bottom: 28px;
}

/* Hintergrund invertieren bei bg-dark-alt */
.slide.bg-dark-alt .prompt-text {
    background: var(--bg-dark);
}

.prompt-context {
    font-family: 'Instrument Serif', serif;
    font-size: 22px;
    font-style: italic;
    color: var(--text-muted);
    line-height: 1.4;
    max-width: 400px;
}
```

---

## Validiert mit

- **Carousel:** "Prompt Praxis #6 – Recherche mit KI" (Slides 3-8)
- **Datum:** 2025-01-06
