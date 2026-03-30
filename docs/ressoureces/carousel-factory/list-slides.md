# List-Slides

> Vertikale Listen mit verschiedenen Strukturen und Komplexitätsgraden.

---

## Einsatz

Inhalte strukturiert darstellen: Framework-Übersichten, Schritte, Rankings, Aufzählungen.

---

## Varianten

| Variante | Klasse           | Einsatz                                              |
| -------- | ---------------- | ---------------------------------------------------- |
| A        | `list-framework` | Framework-Übersichten: Nummer + Titel + Hint         |
| B        | `list-simple`    | Rankings, Schritte: Nummer + nur Titel               |
| C        | `list-bullets`   | Aufzählungen ohne Reihenfolge                        |
| D        | `list-detailed`  | Prozesse, Anleitungen: Nummer + Titel + Beschreibung |

---

## Variante A: Framework

**Einsatz:** Framework-Übersichten mit kompakten Erklärungen pro Schritt.

**Struktur:**

- `top-label`: "Das Framework", "Übersicht"
- `headline size-sm`: Framework-Name
- `framework-list`: Container
  - `framework-item`: Nummer + Content
    - `framework-number`: 36×36px, Accent-Hintergrund
    - `framework-name`: Noto Sans 700, 20px
    - `framework-hint`: Instrument Serif 18px muted

**CSS-Klassen:**

```css
.framework-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.framework-number {
    width: 36px;
    height: 36px;
    background: var(--accent);
    color: var(--text-primary);
    font-family: 'Noto Sans', sans-serif;
    font-weight: 900;
    font-size: 18px;
}

.framework-name {
    font-family: 'Noto Sans', sans-serif;
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
}

.framework-hint {
    font-family: 'Instrument Serif', serif;
    font-size: 18px;
    color: var(--text-muted);
}
```

**Kapazität:** 4–5 Items

---

## Variante B: Simple

**Einsatz:** Rankings, einfache Schritte – kompakt ohne Erklärungen.

**Struktur:**

- `top-label`: "Die Grundlagen", "Ranking"
- `headline size-sm`: Listen-Titel
- `simple-list`: Container
  - `simple-item`: Nummer + Text
    - `simple-number`: 32×32px
    - `simple-text`: Noto Sans 600, 20px

**CSS-Klassen:**

```css
.simple-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.simple-number {
    width: 32px;
    height: 32px;
    background: var(--accent);
    color: var(--text-primary);
    font-weight: 900;
    font-size: 16px;
}

.simple-text {
    font-family: 'Noto Sans', sans-serif;
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
}
```

**Kapazität:** 3–5 Items

---

## Variante C: Bullets

**Einsatz:** Aufzählungen ohne Reihenfolge – Vorteile, Nachteile, Features.

**Struktur:**

- `top-label`: "Vorteile", "Grenzen"
- `headline size-sm`: Listen-Titel
- `bullet-list`: Container
  - `bullet-item`: Marker + Text
    - `bullet-marker`: 8×8px Quadrat, Accent
    - `bullet-text`: Noto Sans 500, 20px

**CSS-Klassen:**

```css
.bullet-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.bullet-marker {
    width: 8px;
    height: 8px;
    background: var(--accent);
    margin-top: 10px;
}

.bullet-text {
    font-family: 'Noto Sans', sans-serif;
    font-size: 20px;
    font-weight: 500;
    color: var(--text-primary);
}
```

**Kapazität:** 4–5 Items

---

## Variante D: Detailed

**Einsatz:** Prozesse, Anleitungen mit Erklärungen pro Schritt.

**Struktur:**

- `top-label`: "Prozess", "Framework-Übersicht"
- `headline size-sm`: Titel
- `detailed-list`: Container
  - `detailed-item`: Nummer + Content
    - `detailed-number`: 32×32px
    - `detailed-title`: Noto Sans 700, 20px
    - `detailed-desc`: Instrument Serif 20px muted

**CSS-Klassen:**

```css
.detailed-list {
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.detailed-number {
    width: 32px;
    height: 32px;
    background: var(--accent);
    color: var(--text-primary);
    font-weight: 900;
    font-size: 16px;
    margin-top: 2px;
}

.detailed-title {
    font-family: 'Noto Sans', sans-serif;
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
}

.detailed-desc {
    font-family: 'Instrument Serif', serif;
    font-size: 20px;
    color: var(--text-muted);
    line-height: 1.45;
    max-width: 380px;
}
```

**Kapazität:** 3 Items (mehr wird zu eng)

---

## Entscheidungshilfe

| Situation                         | Variante      |
| --------------------------------- | ------------- |
| Framework mit Kurzfragen          | A (Framework) |
| Top-5-Liste, Ranking              | B (Simple)    |
| Pro/Contra, Features              | C (Bullets)   |
| Schritt-für-Schritt mit Erklärung | D (Detailed)  |

---

## Design-Konstanten

- Nummern immer: Accent-Hintergrund, helle Schrift
- Beschreibungen: Instrument Serif muted, 18–20px
- Gap zwischen Items: 14–24px je nach Komplexität
