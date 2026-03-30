# 06 – Myth Reality

**ID:** `myth-reality`  
**Status:** ✅ validiert  
**Beispiel:** [myth-reality.html](myth-reality.html)

---

## Einsatz

Korrektur von Denkweisen, Annahmen, Missverständnissen. Puristischer Text-Fokus ohne Boxen. Ideal für:
- Missverständnisse aufklären
- Falsche Annahmen korrigieren
- Mythen vs. Fakten
- Erwartung vs. Wirklichkeit

**Unterschied zu `compare-better`:**
- compare-better: Handlungsanleitung (Prompt-Varianten), mit Boxen
- myth-reality: Aufklärung (Denkweisen), puristischer Text

---

## Hintergrund

`bg-dark` oder `bg-dark-alt` – bei mehreren Slides gleichen Typs alternieren.

---

## Elemente

| Element | Font | Größe | Gewicht | Farbe |
|---------|------|-------|---------|-------|
| Top-Label | Instrument Serif | 18px | 400 | `--text-muted` |
| Myth-Label | Noto Sans | 12px | 700 | `--text-muted` @ 0.6 |
| Myth-Text | Noto Sans | 22px | 500 | `--text-muted` + line-through |
| Reality-Label | Noto Sans | 12px | 700 | `--color-good` |
| Reality-Text | Noto Sans | 24px | 700 | `--text-primary` |

---

## Spacing

| Element | Wert |
|---------|------|
| Gap zwischen Blöcken | 36px |
| Nach Labels | 12px |
| Reality border-left padding | 20px |

---

## Visuelle Struktur

### Myth-Block
- Kein Hintergrund, keine Border
- Text durchgestrichen (`text-decoration: line-through`, 2px)
- Dezent aber lesbar

### Reality-Block
- `border-left: 3px solid var(--color-good)`
- `padding-left: 20px`
- Kein Hintergrund (puristisch)

---

## Constraints

| Element | Max Zeichen | Beispiel |
|---------|-------------|----------|
| Top-Label | 25 | "Missverständnis 1 von 6" |
| Myth-Text | 60 | Die falsche Annahme |
| Reality-Text | 140 | Die korrekte Erklärung |

---

## CSS

```css
/* Myth Reality – Spezifische Styles */

.myth-reality .content-area {
    justify-content: center;
    gap: 36px;
}

.myth-block,
.reality-block {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.myth-label,
.reality-label {
    font-family: 'Noto Sans', sans-serif;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.myth-label { 
    color: var(--text-muted); 
    opacity: 0.6; 
}

.reality-label { 
    color: var(--color-good); 
}

.myth-text {
    font-family: 'Noto Sans', sans-serif;
    font-size: 22px;
    font-weight: 500;
    color: var(--text-muted);
    text-decoration: line-through;
    text-decoration-thickness: 2px;
    max-width: 400px;
    line-height: 1.35;
}

.reality-block {
    padding-left: 20px;
    border-left: 3px solid var(--color-good);
}

.reality-text {
    font-family: 'Noto Sans', sans-serif;
    font-size: 24px;
    font-weight: 700;
    color: var(--text-primary);
    max-width: 400px;
    line-height: 1.35;
}
```

---

## Labels

**Myth-Label Optionen:**
- "Annahme"
- "Mythos"
- "Erwartung"

**Reality-Label Optionen:**
- "Realität"
- "Fakt"
- "Wirklichkeit"

---

## Validiert mit

- **Carousel:** "Prompt Praxis #2 – Wie LLMs (nicht) funktionieren" (Slides 3-8)
- **Datum:** 2025-01-06
