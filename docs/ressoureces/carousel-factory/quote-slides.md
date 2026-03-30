# 09 – Quote-Slides

**ID:** `quote-slides`  
**Status:** ✅ validiert  
**Beispiel:** [quote-slides.html](quote-slides.html)

---

## Übersicht

5 Zitat-Varianten für verschiedene Einsatzzwecke. Von dekorativ bis puristisch.

| Variante | Klasse | Einsatz |
|----------|--------|---------|
| A | `quote-classic` | Dekorativ mit großem Anführungszeichen |
| B | `quote-border` | Akzentlinie links, mit Top-Label |
| C | `quote-minimal` | Zentriert, nur Text |
| D | `quote-context` | Mit Einordnung/Kontext unter dem Zitat |
| E | `quote-bold` | Statement-Charakter, Noto Sans Bold |

---

## Hintergrund

`bg-dark` oder `bg-dark-alt` – je nach Kontext.

---

## Gemeinsame Elemente

| Element | Font | Größe | Gewicht | Farbe |
|---------|------|-------|---------|-------|
| Top-Label | Instrument Serif | 18px | 400 | `--text-muted` |
| Quote-Text | Instrument Serif | 28–34px | 400 italic | `--text-primary` |
| Quote-Source | Noto Sans | 14–16px | 500 | `--text-muted` |

---

## Variante A: Classic

**Einsatz:** Dekorativ, Eyecatcher, bekannte Zitate

```css
.quote-classic .content-area {
    justify-content: center;
}

.quote-classic .quote-mark {
    font-family: 'Instrument Serif', serif;
    font-size: 120px;
    color: var(--accent);
    line-height: 0.5;
    margin-bottom: 16px;
}

.quote-classic .quote-text {
    font-family: 'Instrument Serif', serif;
    font-style: italic;
    font-size: 32px;
    color: var(--text-primary);
    line-height: 1.35;
    max-width: 420px;
}

.quote-classic .quote-source {
    font-family: 'Noto Sans', sans-serif;
    font-size: 16px;
    font-weight: 500;
    color: var(--text-muted);
    margin-top: 28px;
}
```

**HTML-Struktur:**
```html
<div class="quote-mark">"</div>
<p class="quote-text">...</p>
<p class="quote-source">— Quelle</p>
```

---

## Variante B: Border

**Einsatz:** Strukturiert, mit optionalem Top-Label

```css
.quote-border .content-area {
    justify-content: center;
}

.quote-border .quote-block {
    padding-left: 28px;
    border-left: 4px solid var(--accent);
}

.quote-border .quote-text {
    font-family: 'Instrument Serif', serif;
    font-style: italic;
    font-size: 30px;
    color: var(--text-primary);
    line-height: 1.4;
    max-width: 400px;
}

.quote-border .quote-source {
    font-family: 'Noto Sans', sans-serif;
    font-size: 16px;
    font-weight: 500;
    color: var(--text-muted);
    margin-top: 24px;
}
```

**HTML-Struktur:**
```html
<div class="top-label">Erkenntnis</div>
<div class="quote-block">
    <p class="quote-text">...</p>
    <p class="quote-source">— Quelle</p>
</div>
```

---

## Variante C: Minimal

**Einsatz:** Sehr reduziert, kurze prägnante Zitate

```css
.quote-minimal .content-area {
    justify-content: center;
    align-items: center;
    text-align: center;
}

.quote-minimal .quote-text {
    font-family: 'Instrument Serif', serif;
    font-style: italic;
    font-size: 34px;
    color: var(--text-primary);
    line-height: 1.35;
    max-width: 400px;
}

.quote-minimal .quote-source {
    font-family: 'Noto Sans', sans-serif;
    font-size: 16px;
    font-weight: 500;
    color: var(--text-muted);
    margin-top: 28px;
}
```

**Hinweis:** Bei dieser Variante Anführungszeichen im Text selbst: „Zitat hier."

---

## Variante D: Mit Kontext

**Einsatz:** Zitate mit Einordnung, Kundenfeedback, Learnings

```css
.quote-context .content-area {
    justify-content: center;
}

.quote-context .quote-block {
    padding-left: 24px;
    border-left: 3px solid var(--accent);
    margin-bottom: 24px;
}

.quote-context .quote-text {
    font-family: 'Instrument Serif', serif;
    font-style: italic;
    font-size: 28px;
    color: var(--text-primary);
    line-height: 1.4;
    max-width: 400px;
}

.quote-context .quote-context-text {
    font-family: 'Noto Sans', sans-serif;
    font-size: 16px;
    font-weight: 400;
    color: var(--text-muted);
    max-width: 400px;
    line-height: 1.5;
    margin-bottom: 16px;
}

.quote-context .quote-source {
    font-family: 'Noto Sans', sans-serif;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-muted);
    opacity: 0.7;
}
```

**HTML-Struktur:**
```html
<div class="top-label">Kundenfeedback</div>
<div class="quote-block">
    <p class="quote-text">...</p>
</div>
<p class="quote-context-text">Einordnung und Kontext hier.</p>
<p class="quote-source">— Quelle</p>
```

---

## Variante E: Bold

**Einsatz:** Statement-Charakter, eigene Thesen, starke Aussagen

```css
.quote-bold .content-area {
    justify-content: center;
}

.quote-bold .quote-text {
    font-family: 'Noto Sans', sans-serif;
    font-size: 36px;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.25;
    max-width: 440px;
}

.quote-bold .quote-source {
    font-family: 'Instrument Serif', serif;
    font-style: italic;
    font-size: 18px;
    color: var(--text-muted);
    margin-top: 28px;
}

.quote-bold .quote-source::before {
    content: "— ";
}
```

---

## Constraints

| Element | Max Zeichen |
|---------|-------------|
| Top-Label | 25 |
| Quote-Text | 120 |
| Quote-Context | 150 |
| Quote-Source | 40 |

---

## Top-Label Beispiele

- "Erkenntnis"
- "Was ich gelernt habe"
- "Aus der Praxis"
- "Kundenfeedback"
- "Die Wahrheit"
- "Meine These"

---

## Validiert mit

- **Datum:** 2025-01-06
