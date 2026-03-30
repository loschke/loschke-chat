# 11 – Fazit-Slides

**ID:** `fazit-slides`  
**Status:** ✅ validiert  
**Beispiel:** [fazit-slides.html](fazit-slides.html)

---

## Übersicht

5 Fazit-Varianten für verschiedene Abschluss-Situationen.

| Variante | Klasse | Einsatz |
|----------|--------|---------|
| A | `fazit-accent` | Maximaler Fokus auf rotem Hintergrund |
| B | `fazit-statement` | Reduziert, zentriert mit Accent-Line |
| C | `fazit-takeaways` | Liste mit 3 Takeaways |
| D | `fazit-summary` | Kompakte Box mit Punkten |
| E | `fazit-core` | Statement + erklärende Subline |

---

## Variante A: Accent Statement

**Einsatz:** Maximaler Fokus, stärkste visuelle Wirkung. Für die eine Kernaussage.

**Hintergrund:** `bg-accent`

```css
.fazit-accent .content-area {
    justify-content: center;
}

.fazit-accent .fazit-label {
    font-family: 'Noto Sans', sans-serif;
    font-size: 16px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--text-primary);
    opacity: 0.85;
    margin-bottom: 24px;
}

.fazit-accent .headline {
    max-width: 420px;
}

/* Alles in Weiß auf Rot */
.slide.bg-accent .headline { color: var(--text-primary); }
.slide.bg-accent .logo .rl { color: var(--text-primary); }
.slide.bg-accent .logo .dot { color: var(--text-primary); }
.slide.bg-accent .slide-number { color: var(--text-primary); opacity: 0.7; }
```

---

## Variante B: Single Statement

**Einsatz:** Reduziert, nur die Essenz. Kein Label, nur Accent-Line als Opener.

**Hintergrund:** `bg-dark` oder `bg-dark-alt`

```css
.fazit-statement .content-area {
    justify-content: center;
    align-items: center;
    text-align: center;
}

.fazit-statement .accent-line {
    width: 60px;
    height: 4px;
    background: var(--accent);
    margin-bottom: 32px;
}

.fazit-statement .headline {
    font-size: 44px;
    max-width: 400px;
}
```

---

## Variante C: Takeaways

**Einsatz:** 3 konkrete Punkte zum Mitnehmen. Mit Häkchen-Icons.

**Hintergrund:** `bg-dark` oder `bg-dark-alt`

```css
.fazit-takeaways .content-area {
    justify-content: flex-start;
    padding-top: 8px;
}

.fazit-takeaways .headline {
    margin-bottom: 36px;
    flex-shrink: 0;
}

.takeaway-list {
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.takeaway-item {
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.takeaway-icon {
    width: 28px;
    height: 28px;
    background: var(--accent);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 2px;
}

.takeaway-icon svg {
    width: 16px;
    height: 16px;
    stroke: var(--bg-dark);
    stroke-width: 3;
    fill: none;
}

.takeaway-text {
    font-family: 'Noto Sans', sans-serif;
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.4;
}
```

**HTML für Icon:**
```html
<div class="takeaway-icon">
    <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
</div>
```

---

## Variante D: Summary Box

**Einsatz:** Mehrere Punkte kompakt in einer Box. Instrument Serif für softeren Look.

**Hintergrund:** `bg-dark` oder `bg-dark-alt`

```css
.fazit-summary .content-area {
    justify-content: center;
}

.summary-box {
    background: var(--bg-dark-alt);
    padding: 32px;
    border-left: 4px solid var(--accent);
}

.slide.bg-dark-alt .summary-box {
    background: var(--bg-dark);
}

.summary-title {
    font-family: 'Noto Sans', sans-serif;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--accent);
    margin-bottom: 20px;
}

.summary-points {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.summary-point {
    font-family: 'Instrument Serif', serif;
    font-size: 20px;
    color: var(--text-muted);
    line-height: 1.4;
    padding-left: 24px;
    position: relative;
}

.summary-point::before {
    content: "→";
    position: absolute;
    left: 0;
    color: var(--accent);
    font-family: 'Noto Sans', sans-serif;
    font-weight: 700;
}
```

---

## Variante E: Kernaussage

**Einsatz:** Statement mit erklärender Subline. Wenn die Headline allein zu kryptisch wäre.

**Hintergrund:** `bg-dark` oder `bg-dark-alt`

```css
.fazit-core .content-area {
    justify-content: center;
}

.fazit-core .fazit-label {
    font-family: 'Instrument Serif', serif;
    font-size: 18px;
    color: var(--text-muted);
    margin-bottom: 24px;
}

.fazit-core .headline {
    max-width: 420px;
    margin-bottom: 24px;
}

.fazit-core .fazit-subline {
    font-family: 'Instrument Serif', serif;
    font-size: 22px;
    color: var(--text-muted);
    max-width: 400px;
    line-height: 1.45;
}
```

---

## Constraints

| Element | Max Zeichen |
|---------|-------------|
| Fazit-Label | 20 |
| Headline | 60 |
| Subline | 80 |
| Takeaway-Text | 50 |
| Summary-Point | 60 |

---

## Label-Beispiele

- "Das Wichtigste"
- "Die Kernaussage"
- "Zusammenfassung"
- "Auf einen Blick"
- "Das nimmst du mit"

---

## Wann welche Variante?

| Situation | Empfehlung |
|-----------|------------|
| Eine starke Aussage | A (Accent) oder B (Statement) |
| 3 konkrete Learnings | C (Takeaways) |
| 4+ Punkte kompakt | D (Summary Box) |
| Aussage braucht Erklärung | E (Kernaussage) |

---

## Validiert mit

- **Datum:** 2025-01-06
