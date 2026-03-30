# Liste-Slides

Aufzählungen verschiedener Art – von nummerierten Listen bis Zwei-Spalten-Layouts.

---

## Varianten-Übersicht

| Variante | Klasse | Use Case |
|----------|--------|----------|
| A | `list-numbered` | Große Nummern, klare Reihenfolge |
| B | `list-bullets` | Einfache Punkte ohne Reihenfolge |
| C | `list-checks` | Checkmarks für Takeaways |
| D | `list-detailed` | Nummer + Titel + Beschreibung |
| E | `list-twocol` | Zwei Spalten für lange Listen |

---

## Variante A – Nummeriert

**Klasse:** `list-numbered`

**Use Case:** Schritte, Prozesse, priorisierte Punkte (3-5 Items)

**Elemente:**
- `top-label`: Instrument Serif, var(--font-label), muted
- `list-title`: Noto Sans 900, var(--font-title-md)
- `item-number`: Noto Sans 900, 56px, accent, width 100px
- `item-text`: Noto Sans 500, var(--font-body)
- Gap zwischen Items: 32px

**Struktur:**
```html
<div class="slide bg-dark list-numbered">
    <p class="top-label">Die Grundlagen</p>
    <div class="content-area">
        <h1 class="list-title">3 Fragen vor jedem KI-Projekt</h1>
        <div class="list-items">
            <div class="list-item">
                <span class="item-number">01</span>
                <span class="item-text">Welches Problem lösen wir wirklich?</span>
            </div>
            <!-- weitere Items -->
        </div>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

---

## Variante B – Bullets

**Klasse:** `list-bullets`

**Use Case:** Aufzählungen ohne Rangfolge (4-6 Items)

**Elemente:**
- `item-bullet`: 16×16px, accent, rund
- `item-text`: Noto Sans 500, var(--font-body)
- Gap zwischen Items: 28px

**Struktur:**
```html
<div class="slide bg-dark-alt list-bullets">
    <p class="top-label">Voraussetzungen</p>
    <div class="content-area">
        <h1 class="list-title">Was ihr braucht</h1>
        <div class="list-items">
            <div class="list-item">
                <span class="item-bullet"></span>
                <span class="item-text">Klare Zielsetzung mit messbaren KPIs</span>
            </div>
            <!-- weitere Items -->
        </div>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

---

## Variante C – Checkmarks

**Klasse:** `list-checks`

**Use Case:** Zusammenfassungen, Takeaways, Erfolgskriterien (3-4 Items)

**Elemente:**
- `item-check`: 48×48px, accent-bg, SVG Checkmark 28px
- `item-text`: Noto Sans 600, var(--font-body)
- Gap zwischen Items: 32px

**Struktur:**
```html
<div class="slide bg-dark list-checks">
    <p class="top-label">Zusammenfassung</p>
    <div class="content-area">
        <h1 class="list-title">Das nehmt ihr mit</h1>
        <div class="list-items">
            <div class="list-item">
                <div class="item-check">
                    <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <span class="item-text">Ziele vor Tools – immer</span>
            </div>
            <!-- weitere Items -->
        </div>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

---

## Variante D – Mit Beschreibung

**Klasse:** `list-detailed`

**Use Case:** Frameworks, Konzepte mit Erklärungsbedarf (3 Items)

**Elemente:**
- `item-number`: Noto Sans 900, 48px, accent
- `item-title`: Noto Sans 700, var(--font-body)
- `item-desc`: Instrument Serif, var(--font-source), muted
- Gap zwischen Items: 40px

**Struktur:**
```html
<div class="slide bg-dark-alt list-detailed">
    <p class="top-label">Framework</p>
    <div class="content-area">
        <h1 class="list-title">Die 3 Säulen erfolgreicher KI-Projekte</h1>
        <div class="list-items">
            <div class="list-item">
                <span class="item-number">01</span>
                <div class="item-content">
                    <span class="item-title">Strategie</span>
                    <span class="item-desc">Klare Ziele, messbare Outcomes, definierte Verantwortlichkeiten</span>
                </div>
            </div>
            <!-- weitere Items -->
        </div>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

---

## Variante E – Zwei Spalten

**Klasse:** `list-twocol`

**Use Case:** Lange Listen, Übersichten (6-10 Items)

**Elemente:**
- Grid: 2 Spalten, gap 28px vertikal, 80px horizontal
- `item-bullet`: 12×12px, accent, rund
- `item-text`: Noto Sans 500, var(--font-source)

**Struktur:**
```html
<div class="slide bg-dark list-twocol">
    <p class="top-label">Übersicht</p>
    <div class="content-area">
        <h1 class="list-title">KI-Anwendungsfälle im Unternehmen</h1>
        <div class="list-items">
            <div class="list-item">
                <span class="item-bullet"></span>
                <span class="item-text">Kundenservice-Automatisierung</span>
            </div>
            <!-- 6-10 Items, werden automatisch auf 2 Spalten verteilt -->
        </div>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

---

## Entscheidungshilfe

| Anzahl Items | Reihenfolge wichtig? | Erklärung nötig? | Empfehlung |
|--------------|---------------------|------------------|------------|
| 3-5 | Ja | Nein | A (Nummeriert) |
| 3-5 | Nein | Nein | B (Bullets) |
| 3-4 | Nein | Nein | C (Checkmarks) |
| 3 | Ja | Ja | D (Detailed) |
| 6-10 | Nein | Nein | E (Zwei Spalten) |

---

## Hintergrund-Optionen

Alle Varianten funktionieren auf:
- `bg-dark` – Standard
- `bg-dark-alt` – Subtile Variation
- `bg-accent` – Für Kernpunkte (besonders C)

---

## Design-Konstanten

- Padding: 120px (alle Seiten)
- Footer-Höhe: 100px
- Logo: Rechts unten
- Titel-Margin-Bottom: 56px
- Typografie: Gemäß CSS-Variablen
