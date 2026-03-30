# 03 – Series Overview

**ID:** `series-overview`  
**Status:** ✅ validiert  
**Beispiel:** [series-overview.html](series-overview.html)

---

## Einsatz

Übersichts-Slide für Carousel-Serien. Zeigt:
- Alle Teile der Serie
- Fortschritt (done, current, upcoming)
- CTA zum Folgen

Typisch als letzter Slide eines Serien-Carousels.

---

## Hintergrund

`bg-dark` oder `bg-dark-alt`

---

## Elemente

| Element | Font | Größe | Gewicht | Farbe |
|---------|------|-------|---------|-------|
| Top-Label | Instrument Serif | 18px | 400 | `--text-muted` |
| Series-Title | Noto Sans | 28px | 900 | `--text-primary` |
| Item (default) | Noto Sans | 15px | 400 | `--text-muted` |
| Item (current) | Noto Sans | 15px | 600 | `--text-primary` |
| Item (done) | Noto Sans | 15px | 400 | `--text-muted` @ 0.6 |
| CTA | Noto Sans | 14px | 600 | `--accent` |

---

## Spacing

| Element | Wert |
|---------|------|
| Nach Top-Label | 32px (Standard) |
| Nach Series-Title | 24px |
| List-Gap | 11px |
| CTA margin-top | auto (flexbox) |
| CTA padding-top | 20px |
| CTA border-top | 1px solid rgba(207, 202, 180, 0.2) |

---

## Number-Boxes

| Status | Style |
|--------|-------|
| default | 26×26px, `--bg-dark-alt`, `--text-muted` |
| current | 26×26px, `--accent`, `--bg-dark` |
| done | 26×26px, transparent, 2px border `--text-muted` @ 0.5, "✓" |

---

## Constraints

| Element | Max | Beispiel |
|---------|-----|----------|
| Series-Title | 30 Zeichen | "Prompt Praxis" |
| Item-Text | 35 Zeichen | "Entscheidungen vorbereiten" |
| Items | 5–10 | Empfohlen: 6–8 |
| CTA | 35 Zeichen | "→ Folgen für die nächsten Teile" |

---

## CSS

```css
/* Series Overview – Spezifische Styles */

.series-overview .content-area {
    justify-content: flex-start;
}

.series-title {
    font-family: 'Noto Sans', sans-serif;
    font-weight: 900;
    font-size: 28px;
    color: var(--text-primary);
    margin-bottom: 24px;
}

.series-list {
    display: flex;
    flex-direction: column;
    gap: 11px;
}

.series-item {
    display: flex;
    align-items: center;
    gap: 14px;
    font-family: 'Noto Sans', sans-serif;
    font-size: 15px;
    color: var(--text-muted);
}

.series-item.current {
    color: var(--text-primary);
    font-weight: 600;
}

.series-item.done {
    color: var(--text-muted);
    opacity: 0.6;
}

.series-item-number {
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 12px;
    flex-shrink: 0;
    background: var(--bg-dark-alt);
    color: var(--text-muted);
}

.slide.bg-dark-alt .series-item-number {
    background: var(--bg-dark);
}

.series-item.current .series-item-number {
    background: var(--accent);
    color: var(--bg-dark);
}

.series-item.done .series-item-number {
    background: transparent;
    border: 2px solid var(--text-muted);
    opacity: 0.5;
}

.series-cta {
    margin-top: auto;
    padding-top: 20px;
    border-top: 1px solid rgba(207, 202, 180, 0.2);
}

.series-cta-text {
    font-family: 'Noto Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 1px;
}
```

---

## CTA-Varianten

| Situation | Text |
|-----------|------|
| Nächster Teil kommt | "→ Folgen für Teil [X]" |
| Mehrere Teile kommen | "→ Folgen für die nächsten Teile" |
| Letzter Teil | "→ Folgen für das Finale" |
| Serie komplett | "→ Alle Teile im Profil" |

---

## Validiert mit

- **Carousel:** "Prompt Praxis #9 – Ideen entwickeln" (Slide 10)
- **Datum:** 2025-01-06
