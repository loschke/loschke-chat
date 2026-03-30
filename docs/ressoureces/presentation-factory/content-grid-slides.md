# Content-Grid-Slides

Grid-basierte Inhaltsfolien für gleichwertige Konzepte nebeneinander – von 2×2 Cards bis zu reinen Text-Spalten.

---

## Varianten-Übersicht

| Variante | Klasse | Use Case |
|----------|--------|----------|
| A | `grid-2x2` | 4 gleichwertige Konzepte/Kategorien |
| B | `grid-2col` | 2 Hauptkonzepte mit optionalem Intro/Fazit |
| C | `grid-3col` | 3 Konzepte, einfach oder strukturiert |
| D | `grid-4col` | 4 Schritte/Phasen mit Nummerierung |
| E | `grid-columns` | Spalten ohne Card-Hintergrund |

---

## Variante A – 2×2 Cards

**Klasse:** `grid-2x2`

**Use Case:** 4 gleichwertige Konzepte, Kategorien oder Säulen

**Elemente:**
- `top-label`: Instrument Serif, var(--font-label), text-muted
- `grid-title`: Noto Sans 900, var(--font-title-md), text-primary
- `grid-subline`: Instrument Serif, var(--font-subline), text-muted
- `card`: bg-dark-alt, padding 40px, gap 16px
- `card-title`: Noto Sans 700, var(--font-body), text-primary
- `card-desc`: Instrument Serif, var(--font-source), text-muted
- `card.highlight`: Accent-Hintergrund, Text in text-primary

**Struktur:**
```html
<div class="slide bg-dark grid-2x2">
    <div class="top-label">KI-Strategie</div>
    <h1 class="grid-title">Die vier Säulen erfolgreicher <span class="highlight">KI-Projekte</span></h1>
    <div class="grid-subline">Was unterscheidet erfolgreiche von gescheiterten Implementierungen?</div>
    <div class="content-area">
        <div class="card-grid">
            <div class="card">
                <div class="card-title">Strategie</div>
                <div class="card-desc">Klare Ziele, messbare KPIs, definierte Verantwortlichkeiten</div>
            </div>
            <div class="card">
                <div class="card-title">Daten</div>
                <div class="card-desc">Qualität vor Quantität – strukturiert, zugänglich, gepflegt</div>
            </div>
            <div class="card">
                <div class="card-title">Menschen</div>
                <div class="card-desc">Befähigung, Change Management, kontinuierliches Lernen</div>
            </div>
            <div class="card highlight">
                <div class="card-title">Prozesse</div>
                <div class="card-desc">Integration in bestehende Workflows, nicht isolierte Insellösungen</div>
            </div>
        </div>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

---

## Variante B – 2er-Reihe

**Klasse:** `grid-2col`

**Use Case:** 2 Hauptkonzepte mit optionalem Intro-Text oben oder Fazit unten

**Elemente:**
- `grid-intro`: Noto Sans 400, var(--font-body), text-primary, margin-bottom 48px
- `card`: bg-dark-alt, padding 48px, gap 20px
- `card-title`: Noto Sans 700, var(--font-body), text-primary
- `card-desc`: Instrument Serif, var(--font-source), text-muted
- `grid-conclusion`: Instrument Serif, var(--font-subline), text-muted, border-top

**Struktur mit Intro:**
```html
<div class="slide bg-dark grid-2col">
    <div class="top-label">Grundlagen</div>
    <h1 class="grid-title">Zwei Wege zur <span class="highlight">KI-Integration</span></h1>
    <div class="content-area">
        <div class="grid-intro">Die Wahl des richtigen Ansatzes hängt von euren Ressourcen und Zielen ab.</div>
        <div class="card-grid">
            <div class="card">
                <div class="card-title">Build: Eigene Lösungen</div>
                <div class="card-desc">Maximale Kontrolle, höherer Aufwand. Ideal für Kernprozesse.</div>
            </div>
            <div class="card">
                <div class="card-title">Buy: Fertige Tools</div>
                <div class="card-desc">Schnelle Implementierung, geringere Einstiegshürde.</div>
            </div>
        </div>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

**Struktur mit Fazit:**
```html
<div class="slide bg-dark-alt grid-2col">
    <h1 class="grid-title">Prompt-Ansätze im Vergleich</h1>
    <div class="grid-subline">Beide Methoden haben ihre Berechtigung.</div>
    <div class="content-area">
        <div class="card-grid">
            <div class="card">
                <div class="card-title">Zero-Shot Prompting</div>
                <div class="card-desc">Direkte Anfrage ohne Beispiele. Schnell, flexibel.</div>
            </div>
            <div class="card">
                <div class="card-title">Few-Shot Prompting</div>
                <div class="card-desc">Mit Beispielen arbeiten. Höhere Qualität und Konsistenz.</div>
            </div>
        </div>
        <div class="grid-conclusion">Für Alltags-Tasks reicht Zero-Shot – bei wichtigen Outputs lohnt sich der Mehraufwand.</div>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

---

## Variante C – 3er-Reihe

**Klasse:** `grid-3col`

**Use Case:** 3 gleichwertige Konzepte, einfach oder mit strukturierten Sektionen

**Elemente:**
- `card`: bg-dark-alt, padding 40px, gap 20px
- `card-title`: Noto Sans 700, var(--font-body), text-primary
- `card-desc`: Instrument Serif, var(--font-source), text-muted
- `card-section`: Strukturierte Sektion mit Label + Content
- `section-label`: Instrument Serif, var(--font-source), accent
- `section-content`: Noto Sans 500, 32px, text-primary

**Struktur einfach:**
```html
<div class="slide bg-dark grid-3col">
    <h1 class="grid-title">Drei Ebenen der <span class="highlight">KI-Kompetenz</span></h1>
    <div class="grid-subline">Von der Nutzung zur Gestaltung – wo steht ihr?</div>
    <div class="content-area">
        <div class="card-grid">
            <div class="card">
                <div class="card-title">Anwender</div>
                <div class="card-desc">KI-Tools nutzen, Ergebnisse bewerten</div>
            </div>
            <div class="card">
                <div class="card-title">Gestalter</div>
                <div class="card-desc">Prompts optimieren, Workflows designen</div>
            </div>
            <div class="card">
                <div class="card-title">Architekt</div>
                <div class="card-desc">Systeme konzipieren, Strategie entwickeln</div>
            </div>
        </div>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

**Struktur mit Sektionen:**
```html
<div class="slide bg-dark-alt grid-3col">
    <h1 class="grid-title">Drei Modell-Typen im Überblick</h1>
    <div class="content-area">
        <div class="card-grid">
            <div class="card">
                <div class="card-section">
                    <div class="section-label">Was?</div>
                    <div class="section-content">Large Language Models</div>
                </div>
                <div class="card-section">
                    <div class="section-label">Effekt</div>
                    <div class="section-content">Text verstehen und generieren</div>
                </div>
                <div class="card-section">
                    <div class="section-label">Anwendungen</div>
                    <div class="section-content">Chatbots, Textgenerierung, Analyse</div>
                </div>
            </div>
            <!-- weitere Cards -->
        </div>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

---

## Variante D – 4er-Reihe kompakt

**Klasse:** `grid-4col`

**Use Case:** 4 Schritte, Phasen oder Kategorien mit Nummerierung

**Elemente:**
- `grid-intro`: Noto Sans 400, var(--font-body), text-primary
- `card`: bg-dark-alt, padding 32px, gap 16px
- `card-number`: Noto Sans 900, 48px, accent (Format: 01, 02, 03...)
- `card-title`: Noto Sans 700, 32px, text-primary
- `card-desc`: Instrument Serif, 28px, text-muted
- `grid-conclusion`: Instrument Serif, var(--font-subline), text-muted

**Struktur:**
```html
<div class="slide bg-dark grid-4col">
    <div class="top-label">Prozess</div>
    <h1 class="grid-title">Der Weg zum erfolgreichen <span class="highlight">KI-Projekt</span></h1>
    <div class="content-area">
        <div class="grid-intro">Von der Idee zur Implementierung in vier Phasen.</div>
        <div class="card-grid">
            <div class="card">
                <div class="card-number">01</div>
                <div class="card-title">Verstehen</div>
                <div class="card-desc">Problem definieren, Ziele klären</div>
            </div>
            <div class="card">
                <div class="card-number">02</div>
                <div class="card-title">Planen</div>
                <div class="card-desc">Ressourcen, Timeline, Metriken</div>
            </div>
            <div class="card">
                <div class="card-number">03</div>
                <div class="card-title">Pilotieren</div>
                <div class="card-desc">Klein starten, schnell lernen</div>
            </div>
            <div class="card">
                <div class="card-number">04</div>
                <div class="card-title">Skalieren</div>
                <div class="card-desc">Ausrollen, optimieren, iterieren</div>
            </div>
        </div>
        <div class="grid-conclusion">Die Kombination ermöglicht konsistente Ergebnisse.</div>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

---

## Variante E – Spalten ohne Container

**Klasse:** `grid-columns` (3 Spalten) oder `grid-columns cols-2` (2 Spalten)

**Use Case:** Reine Text-Spalten ohne Box-Hintergrund, für detailliertere Inhalte

**Elemente:**
- `column-grid`: 3 Spalten (oder 2 mit `.cols-2`), gap 64px
- `column-title`: Noto Sans 700, var(--font-body), text-primary, border-bottom accent
- `column-content`: Noto Sans 400, var(--font-source), text-soft
- `column-section`: Strukturierte Sektion
- `section-label`: Instrument Serif, var(--font-source), accent
- `section-content`: Noto Sans 500, 32px, text-primary
- `section-list` + `section-item`: Bullet-Liste, 32px, text-muted

**Struktur einfach (3 Spalten):**
```html
<div class="slide bg-dark grid-columns">
    <h1 class="grid-title">Drei Perspektiven auf <span class="highlight">KI-Ethik</span></h1>
    <div class="grid-subline">Verantwortungsvoller Einsatz beginnt mit dem Verständnis verschiedener Blickwinkel.</div>
    <div class="content-area">
        <div class="column-grid">
            <div class="column">
                <div class="column-title">Technisch</div>
                <div class="column-content">Bias erkennen und minimieren. Transparenz schaffen. Robustheit sicherstellen.</div>
            </div>
            <div class="column">
                <div class="column-title">Organisatorisch</div>
                <div class="column-content">Governance etablieren. Verantwortlichkeiten definieren. Schulungen bereitstellen.</div>
            </div>
            <div class="column">
                <div class="column-title">Gesellschaftlich</div>
                <div class="column-content">Arbeitsmärkte bedenken. Fairness gewährleisten. Langfristige Konsequenzen abwägen.</div>
            </div>
        </div>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

**Struktur mit Sektionen:**
```html
<div class="slide bg-dark-alt grid-columns">
    <h1 class="grid-title">Prompt-Komponenten im Detail</h1>
    <div class="content-area">
        <div class="column-grid">
            <div class="column">
                <div class="column-title">Rolle</div>
                <div class="column-section">
                    <div class="section-label">Was?</div>
                    <div class="section-content">Persona oder Expertise definieren</div>
                </div>
                <div class="column-section">
                    <div class="section-label">Beispiele</div>
                    <div class="section-list">
                        <div class="section-item">Fachexperte</div>
                        <div class="section-item">Kritischer Reviewer</div>
                    </div>
                </div>
            </div>
            <!-- weitere Spalten -->
        </div>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

**Struktur 2 Spalten:**
```html
<div class="slide bg-dark grid-columns cols-2">
    <!-- wie oben, nur 2 Spalten -->
</div>
```

---

## Entscheidungshilfe

| Anzahl Konzepte | Detailgrad | Empfehlung |
|-----------------|------------|------------|
| 4 gleichwertig | Kurz | A (2×2 Cards) |
| 2 Hauptkonzepte | Mittel | B (2er-Reihe) |
| 3 gleichwertig | Kurz–Mittel | C (3er-Reihe) |
| 4 Schritte/Phasen | Kurz | D (4er-Reihe) |
| 2-3 | Detailliert | E (Spalten) |

---

## Hintergrund-Optionen

Alle Varianten funktionieren auf:
- `bg-dark` – Standard (Cards werden bg-dark-alt)
- `bg-dark-alt` – Subtile Variation (Cards werden bg-dark)

---

## Design-Konstanten

- Slide-Padding: 120px
- Footer-Höhe: 100px
- Logo: Rechts unten
- Titel-Margin-Bottom: 56px (ohne Subline)
- Subline-Margin-Bottom: 56px
- Nummern-Format: 01, 02, 03... (ohne #)
- Highlight-Card: Accent-Hintergrund mit text-primary
