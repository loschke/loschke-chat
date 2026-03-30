# Vergleich-Slides

Gegenüberstellungen verschiedener Art – von klassischen Spalten bis Vorher/Nachher-Transformationen.

---

## Varianten-Übersicht

| Variante | Klasse | Use Case |
|----------|--------|----------|
| A | `compare-columns` | Klassische Zwei-Spalten-Gegenüberstellung |
| B | `compare-myth` | Mythos durchgestrichen + Realität |
| C | `compare-dodont` | Do/Don't mit Icons |
| D | `compare-transform` | Vorher/Nachher-Boxen |

---

## Variante A – Zwei Spalten

**Klasse:** `compare-columns`

**Use Case:** Klassische Gegenüberstellung (Typisch/Besser, Alt/Neu, etc.)

**Elemente:**
- `top-label`: Instrument Serif, var(--font-label), muted
- `compare-title`: Noto Sans 900, var(--font-title-md)
- `col-header`: Instrument Serif, var(--font-label), mit Border
- `col-item`: Noto Sans 500, var(--font-source), mit linker Border
- Grid-Gap: 80px zwischen Spalten

**Struktur:**
```html
<div class="slide bg-dark compare-columns">
    <p class="top-label">Der Unterschied</p>
    <div class="content-area">
        <h1 class="compare-title">Tool-Fokus vs. Problem-Fokus</h1>
        <div class="compare-grid">
            <div class="compare-col">
                <div class="col-header negative">Typisch</div>
                <p class="col-item">"Wir brauchen ChatGPT"</p>
                <p class="col-item">"Was kann KI alles?"</p>
                <p class="col-item">"Alle nutzen es schon"</p>
            </div>
            <div class="compare-col">
                <div class="col-header positive">Besser</div>
                <p class="col-item">"Wir brauchen schnellere Antworten"</p>
                <p class="col-item">"Was kostet uns Zeit?"</p>
                <p class="col-item">"Was passt zu uns?"</p>
            </div>
        </div>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

**Header-Klassen:**
- `.negative` – Muted, abgeschwächt (linke Spalte)
- `.positive` – color-good/Grün (rechte Spalte)

---

## Variante B – Mythos/Realität

**Klasse:** `compare-myth`

**Use Case:** Einen Irrglauben korrigieren, Erwartung vs. Wirklichkeit

**Elemente:**
- `top-label`: Instrument Serif, var(--font-label), muted
- `block-label`: Instrument Serif, 32px, uppercase
- `myth-text`: Noto Sans 600, var(--font-subline), muted, durchgestrichen
- `reality-text`: Noto Sans 700, var(--font-title-md), primary
- Gap zwischen Blöcken: 56px

**Struktur:**
```html
<div class="slide bg-dark-alt compare-myth">
    <p class="top-label">Erwartung vs. Wirklichkeit</p>
    <div class="content-area">
        <div class="myth-block">
            <span class="block-label">Mythos</span>
            <p class="myth-text">"KI ersetzt Mitarbeiter und spart sofort Kosten"</p>
        </div>
        <div class="reality-block">
            <span class="block-label">Realität</span>
            <p class="reality-text">KI verschiebt Arbeit. Wer das nicht managed, hat mehr Chaos – nicht weniger.</p>
        </div>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

**Farben:**
- Mythos-Label: muted
- Realität-Label: color-good (Grün)

**Label-Varianten:**
- Mythos / Realität
- Erwartung / Wirklichkeit
- Alte Überzeugung / Neue Perspektive
- Vorurteil / Fakt

---

## Variante C – Do/Don't

**Klasse:** `compare-dodont`

**Use Case:** Best Practices, Verhaltensregeln, Anleitungen

**Elemente:**
- `compare-title`: Noto Sans 900, var(--font-title-md)
- `col-header`: Mit Icon (48×48px) + Text, Border unten
- `col-item`: Noto Sans 500, var(--font-source)
- Grid-Gap: 80px zwischen Spalten, 28px zwischen Items

**Struktur:**
```html
<div class="slide bg-dark compare-dodont">
    <p class="top-label">Best Practices</p>
    <div class="content-area">
        <h1 class="compare-title">KI-Projekte richtig angehen</h1>
        <div class="compare-grid">
            <div class="compare-col">
                <div class="col-header dont">
                    <div class="icon">
                        <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </div>
                    <span class="header-text">Don't</span>
                </div>
                <p class="col-item">Mit dem Tool starten</p>
                <p class="col-item">Alles auf einmal automatisieren</p>
                <p class="col-item">Erfolg nicht messen</p>
            </div>
            <div class="compare-col">
                <div class="col-header do">
                    <div class="icon">
                        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <span class="header-text">Do</span>
                </div>
                <p class="col-item">Mit dem Problem starten</p>
                <p class="col-item">Klein anfangen, iterieren</p>
                <p class="col-item">KPIs von Anfang an definieren</p>
            </div>
        </div>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

**Header-Klassen:**
- `.dont` – X-Icon, color-bad (Rot)
- `.do` – Checkmark-Icon, color-good (Grün)

---

## Variante D – Vorher/Nachher

**Klasse:** `compare-transform`

**Use Case:** Transformationen, Verbesserungen, Zeitersparnis zeigen

**Elemente:**
- `top-label`: Instrument Serif, var(--font-label), muted
- `transform-box`: 600px breit, 48px Padding
- `box-label`: Instrument Serif, 32px
- `box-content`: Noto Sans 600, var(--font-body)
- `transform-arrow`: 64px, accent
- Gap zwischen Boxen: 60px

**Struktur:**
```html
<div class="slide bg-dark compare-transform">
    <p class="top-label">Transformation</p>
    <div class="content-area">
        <div class="transform-row">
            <div class="transform-box before">
                <span class="box-label">Vorher</span>
                <p class="box-content">Manuelle Recherche: 2 Stunden pro Anfrage</p>
            </div>
            <span class="transform-arrow">→</span>
            <div class="transform-box after">
                <span class="box-label">Nachher</span>
                <p class="box-content">Strukturierter Workflow: 15 Minuten pro Anfrage</p>
            </div>
        </div>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

**Box-Klassen:**
- `.before` – color-bad Border (Rot), abgeschwächt
- `.after` – color-good Border (Grün), hervorgehoben

**Label-Varianten:**
- Vorher / Nachher
- Alt / Neu
- Ohne KI / Mit KI
- Problem / Lösung

---

## Entscheidungshilfe

| Situation | Empfohlene Variante |
|-----------|---------------------|
| Zwei Ansätze vergleichen | A (Zwei Spalten) |
| Irrglauben korrigieren | B (Mythos/Realität) |
| Best Practices vermitteln | C (Do/Don't) |
| Verbesserung quantifizieren | D (Vorher/Nachher) |
| Starke Aussage machen | B auf bg-accent |

---

## Hintergrund-Optionen

Alle Varianten funktionieren auf:
- `bg-dark` – Standard
- `bg-dark-alt` – Subtile Variation
- `bg-accent` – Maximale Signalwirkung (besonders für B)

---

## Design-Konstanten

- Padding: 120px (alle Seiten)
- Footer-Höhe: 100px
- Logo: Rechts unten
- Titel-Margin-Bottom: 56px
- Spalten-Gap: 80px
- Typografie: Gemäß CSS-Variablen

**Semantische Farben:**
- `--color-bad: #E53935` (Rot) – Negativ, Don't, Vorher, Mythos
- `--color-good: #43A047` (Grün) – Positiv, Do, Nachher, Realität

---

## Tipps für gute Vergleiche

1. **Parallelität**: Beide Seiten sollten strukturell ähnlich sein
2. **Kürze**: Max. 3-4 Punkte pro Spalte
3. **Kontrast**: Unterschied muss auf den ersten Blick klar sein
4. **Wertung**: Positive Seite immer rechts (Leserichtung)
