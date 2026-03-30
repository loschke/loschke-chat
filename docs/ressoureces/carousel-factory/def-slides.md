# 11 – Definition-Slides

**ID:** `def-slides`  
**Status:** ✅ validiert  
**Beispiel:** [def-slides.html](def-slides.html)

---

## Übersicht

5 Varianten für Begriffsklärungen – besonders für Anfänger-Inhalte.

| Variante | Klasse              | Einsatz                                 |
| -------- | ------------------- | --------------------------------------- |
| A        | `def-classic`       | Standard, Term + Definition mit Border  |
| B        | `def-minimal`       | Zentriert, ohne Border                  |
| C        | `def-example`       | Definition + praktisches Beispiel       |
| D        | `def-contrast`      | Was es ist vs. was nicht (asymmetrisch) |
| D2       | `def-contrast-cols` | Wie D, Zwei-Spalten-Layout              |
| E        | `def-glossary`      | Mehrere Begriffe kompakt                |

---

## Design-Prinzip

- **Term immer in Accent** – der Begriff ist der Hero
- **Definition in Instrument Serif muted** (A, B) oder mit mehr Gewicht (C, D)
- **Für Anfänger:** D-Variante räumt mit Missverständnissen auf

---

## Variante A: Classic

**Einsatz:** Standard, einzelner Begriff

```css
.def-classic .def-term {
    font-family: 'Noto Sans', sans-serif;
    font-weight: 900;
    font-size: 44px;
    color: var(--accent);
    margin-bottom: 24px;
}

.def-classic .def-text {
    font-family: 'Instrument Serif', serif;
    font-size: 26px;
    color: var(--text-muted);
    line-height: 1.45;
    max-width: 400px;
    padding-left: 24px;
    border-left: 3px solid var(--accent);
}
```

---

## Variante B: Minimal

**Einsatz:** Sehr clean, kurze Definitionen. Top-Label zentriert.

```css
.def-minimal .top-label {
    position: absolute;
    top: var(--slide-padding);
    left: 50%;
    transform: translateX(-50%);
}

.def-minimal .def-term {
    font-family: 'Noto Sans', sans-serif;
    font-weight: 900;
    font-size: 40px;
    color: var(--accent);
    margin-bottom: 28px;
}

.def-minimal .def-text {
    font-family: 'Instrument Serif', serif;
    font-size: 24px;
    color: var(--text-muted);
    line-height: 1.5;
    max-width: 380px;
}
```

---

## Variante C: Mit Beispiel

**Einsatz:** Definition + praktisches Beispiel in Box

```css
.def-example .def-term {
    font-size: 38px;
    margin-bottom: 20px;
}

.def-example .def-text {
    font-family: 'Instrument Serif', serif;
    font-size: 22px;
    color: var(--text-muted);
    margin-bottom: 28px;
}

.def-example .def-example-box {
    background: var(--bg-dark-alt);
    padding: 20px 24px;
    border-left: 3px solid var(--accent);
}

.def-example .def-example-label {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-muted);
    opacity: 0.6;
    margin-bottom: 10px;
}

.def-example .def-example-text {
    font-family: 'Noto Sans', sans-serif;
    font-size: 18px;
    font-weight: 500;
    color: var(--text-primary);
}
```

---

## Variante D: Abgrenzung

**Einsatz:** Was es ist vs. was es nicht ist – räumt mit Fehlvorstellungen auf

```css
.def-contrast .def-is {
    background: var(--bg-dark-alt);
    padding: 20px 24px;
    border-left: 3px solid var(--accent);
    margin-bottom: 24px;
}

.def-contrast .def-label.positive { color: var(--accent); }
.def-contrast .def-label.negative { color: var(--text-muted); opacity: 0.5; }

.def-contrast .def-is-text {
    font-family: 'Noto Sans', sans-serif;
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
}

.def-contrast .def-not-text {
    font-family: 'Instrument Serif', serif;
    font-size: 18px;
    color: var(--text-muted);
    opacity: 0.7;
}
```

---

## Variante E: Glossar

**Einsatz:** Mehrere Begriffe kompakt (max 3)

```css
.def-glossary .def-list {
    display: flex;
    flex-direction: column;
    gap: 28px;
}

.def-glossary .def-term {
    font-weight: 700;
    font-size: 22px;
    color: var(--accent);
}

.def-glossary .def-text {
    font-family: 'Instrument Serif', serif;
    font-size: 18px;
    color: var(--text-muted);
}
```

---

## Constraints

| Element              | Max Zeichen |
| -------------------- | ----------- |
| Top-Label            | 20          |
| Term                 | 25          |
| Definition (A, B)    | 150         |
| Definition (C, D, E) | 120         |
| Beispiel-Text        | 80          |

---

## Top-Label Beispiele

- "Begriff erklärt"
- "Kurz erklärt"
- "Glossar"

---

## Validiert

- **Datum:** 2025-01-07
