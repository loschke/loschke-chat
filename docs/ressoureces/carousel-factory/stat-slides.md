# 10 – Statistik-Slides

**ID:** `stat-slides`  
**Status:** ✅ validiert  
**Beispiel:** [stat-slides.html](stat-slides.html)

---

## Übersicht

5 Statistik-Varianten für verschiedene Einsatzzwecke. Die große Zahl ist immer der Hero.

| Variante | Klasse | Einsatz |
|----------|--------|---------|
| A | `stat-classic` | Standard, große Zahl links |
| B | `stat-centered` | Zentriert, symmetrisch |
| C | `stat-source` | Mit Quellenangabe |
| D | `stat-compare` | Zwei Zahlen im Vergleich |
| E | `stat-highlight` | Mit Intro-Text oben |

---

## Hintergrund

`bg-dark` oder `bg-dark-alt` – je nach Kontext.

---

## Design-Prinzip

- **Zahl in Accent:** Immer der visuelle Fokus
- **A, B, C:** Context in Instrument Serif muted – Zahl dominiert
- **D, E:** Context in Noto Sans weiß – braucht mehr Gewicht für die Pointe

---

## Variante A: Classic

**Einsatz:** Standard, einzelne Statistik

```css
.stat-classic .content-area {
    justify-content: center;
}

.stat-classic .stat-number {
    font-family: 'Noto Sans', sans-serif;
    font-weight: 900;
    font-size: 140px;
    color: var(--accent);
    line-height: 1;
    margin-bottom: 20px;
}

.stat-classic .stat-unit {
    font-size: 60px;
    color: var(--text-muted);
}

.stat-classic .stat-context {
    font-family: 'Instrument Serif', serif;
    font-size: 24px;
    color: var(--text-muted);
    max-width: 380px;
    line-height: 1.4;
}
```

---

## Variante B: Centered

**Einsatz:** Symmetrisch, für kürzere Kontexte

```css
.stat-centered .content-area {
    justify-content: center;
    align-items: center;
    text-align: center;
}

.stat-centered .stat-number {
    font-family: 'Noto Sans', sans-serif;
    font-weight: 900;
    font-size: 120px;
    color: var(--accent);
    line-height: 1;
    margin-bottom: 24px;
}

.stat-centered .stat-unit {
    font-size: 50px;
    color: var(--text-muted);
}

.stat-centered .stat-context {
    font-family: 'Instrument Serif', serif;
    font-size: 22px;
    color: var(--text-muted);
    max-width: 360px;
    line-height: 1.45;
}
```

---

## Variante C: Mit Quelle

**Einsatz:** Externe Statistiken mit Quellenangabe

```css
.stat-source .content-area {
    justify-content: center;
}

.stat-source .stat-number {
    font-family: 'Noto Sans', sans-serif;
    font-weight: 900;
    font-size: 130px;
    color: var(--accent);
    line-height: 1;
    margin-bottom: 20px;
}

.stat-source .stat-unit {
    font-size: 55px;
    color: var(--text-muted);
}

.stat-source .stat-context {
    font-family: 'Instrument Serif', serif;
    font-size: 22px;
    color: var(--text-muted);
    max-width: 380px;
    line-height: 1.4;
    margin-bottom: 20px;
}

.stat-source .stat-citation {
    font-family: 'Noto Sans', sans-serif;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-muted);
    opacity: 0.5;
}
```

---

## Variante D: Vergleich

**Einsatz:** Zwei Zahlen gegenüberstellen (vorher/nachher, Anspruch/Realität)

```css
.stat-compare .content-area {
    justify-content: center;
}

.stat-compare .stat-row {
    display: flex;
    gap: 40px;
    margin-bottom: 28px;
}

.stat-compare .stat-item {
    display: flex;
    flex-direction: column;
}

.stat-compare .stat-number {
    font-family: 'Noto Sans', sans-serif;
    font-weight: 900;
    font-size: 80px;
    line-height: 1;
    margin-bottom: 8px;
}

.stat-compare .stat-number.muted {
    color: var(--text-muted);
    opacity: 0.6;
}

.stat-compare .stat-number.accent {
    color: var(--accent);
}

.stat-compare .stat-label {
    font-family: 'Instrument Serif', serif;
    font-size: 16px;
    color: var(--text-muted);
}

.stat-compare .stat-context {
    font-family: 'Noto Sans', sans-serif;
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    max-width: 400px;
    line-height: 1.4;
}
```

**HTML-Struktur:**
```html
<div class="stat-row">
    <div class="stat-item">
        <div class="stat-number muted">21%</div>
        <span class="stat-label">mit dokumentierter Strategie</span>
    </div>
    <div class="stat-item">
        <div class="stat-number accent">73%</div>
        <span class="stat-label">sagen „wir haben eine"</span>
    </div>
</div>
<p class="stat-context">Die Pointe hier.</p>
```

---

## Variante E: Highlight

**Einsatz:** Mit einleitendem Text, der die Zahl kontextualisiert

```css
.stat-highlight .content-area {
    justify-content: center;
}

.stat-highlight .stat-intro {
    font-family: 'Instrument Serif', serif;
    font-size: 20px;
    color: var(--text-muted);
    margin-bottom: 16px;
    max-width: 380px;
    line-height: 1.4;
    opacity: 0.8;
}

.stat-highlight .stat-number {
    font-family: 'Noto Sans', sans-serif;
    font-weight: 900;
    font-size: 110px;
    color: var(--accent);
    line-height: 1;
    margin-bottom: 20px;
}

.stat-highlight .stat-unit {
    font-size: 45px;
    color: var(--text-muted);
}

.stat-highlight .stat-context {
    font-family: 'Noto Sans', sans-serif;
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    max-width: 380px;
    line-height: 1.4;
}
```

**HTML-Struktur:**
```html
<p class="stat-intro">Von allen gestarteten KI-Projekten:</p>
<div class="stat-number">87<span class="stat-unit">%</span></div>
<p class="stat-context">erreichen nie den produktiven Einsatz.</p>
```

---

## Einheiten (stat-unit)

Typische Einheiten:
- `%` – Prozent
- `x` – Multiplikator
- `min` – Minuten
- `h` – Stunden
- `k` – Tausend
- Oder keine Einheit bei absoluten Zahlen

---

## Constraints

| Element | Max Zeichen |
|---------|-------------|
| Top-Label | 25 |
| Stat-Number | 4–5 Zeichen inkl. Einheit |
| Stat-Context | 120 |
| Stat-Intro | 60 |
| Stat-Citation | 50 |
| Stat-Label (Compare) | 30 |

---

## Top-Label Beispiele

- "Die Realität"
- "Der Unterschied"
- "Zeitersparnis"
- "Vorher / Nachher"
- "Die unbequeme Wahrheit"
- "Meine Erfahrung"

---

## Validiert mit

- **Datum:** 2025-01-06
