# Framework-Slides

> Frameworks und Prozesse mit Progress-Indikator erklären

---

## Übersicht

**Zweck:** Mehrstufige Frameworks, Prozesse oder Modelle Schritt für Schritt erklären

**Varianten:**
- A: `framework-v` – Vertikaler Indikator (rechts, 320px)
- B: `framework-h` – Horizontaler Indikator (oben)

**Slide-Typen pro Variante:**
- `framework-intro` – Einführungsfolie mit Gesamtübersicht
- `framework-detail` – Detail-Folie für einzelne Schritte

**Indikator-Hintergrund:** `--bg-indicator: #252528` (subtiles Grau, nicht accent)

---

## Variante A – Vertikaler Indikator

**Klassen:** `framework-v` + `framework-intro` oder `framework-detail`

**Layout:** Inhalt links, Indikator rechts (320px, bg-indicator)

### Intro-Slide

```html
<div class="slide bg-dark framework-v framework-intro">
    <div class="content-area">
        <div class="framework-content">
            <div class="top-label">Strukturierte Kommunikation</div>
            <h1 class="framework-title">Prompt <span class="highlight">Framework</span></h1>
            <div class="framework-elements">
                <div class="element-row">
                    <span class="element-name">Expertenrolle</span>
                    <span class="element-arrow">→</span>
                    <span class="element-desc">fachliche Ausrichtung & Themenfokus</span>
                </div>
                <!-- weitere Elemente -->
            </div>
            <p class="framework-note">Optionale Anmerkung zum Framework</p>
        </div>
        <div class="framework-indicator">
            <div class="indicator-v">
                <div class="indicator-line"></div>
                <div class="indicator-step">
                    <div class="step-dot"></div>
                    <span class="step-label">Expertenrolle</span>
                </div>
                <!-- weitere Steps -->
            </div>
        </div>
    </div>
</div>
```

### Detail-Slide

```html
<div class="slide bg-dark framework-v framework-detail">
    <div class="content-area">
        <div class="framework-content">
            <div class="top-label accent">Expertenrolle</div>
            <h1 class="framework-title">Wer soll <span class="highlight">antworten</span></h1>
            <div class="detail-intro">
                <div class="detail-point">
                    <div class="point-bullet"></div>
                    <span class="point-text">Bullet Point Text</span>
                </div>
            </div>
            <div class="detail-section">
                <div class="section-label">Beispiele</div>
                <div class="example-block">
                    <p class="example-text">Code oder Beispieltext</p>
                </div>
            </div>
        </div>
        <div class="framework-indicator">
            <div class="indicator-v">
                <div class="indicator-line"></div>
                <div class="indicator-step">
                    <div class="step-dot active"></div>
                    <span class="step-label active">Expertenrolle</span>
                </div>
                <div class="indicator-step">
                    <div class="step-dot inactive"></div>
                    <span class="step-label inactive">Aufgabe</span>
                </div>
                <!-- weitere Steps -->
            </div>
        </div>
    </div>
</div>
```

---

## Variante B – Horizontaler Indikator

**Klassen:** `framework-h` + `framework-intro` oder `framework-detail`

**Layout:** Indikator oben (volle Breite), Inhalt unten

### Intro-Slide

```html
<div class="slide bg-dark framework-h framework-intro">
    <div class="content-area">
        <div class="framework-indicator">
            <div class="indicator-h">
                <div class="indicator-step">
                    <div class="step-dot"></div>
                    <span class="step-label">Ziel</span>
                </div>
                <div class="step-connector"></div>
                <div class="indicator-step">
                    <div class="step-dot"></div>
                    <span class="step-label">Analyse</span>
                </div>
                <!-- weitere Steps mit step-connector dazwischen -->
            </div>
        </div>
        <div class="framework-content">
            <div class="top-label">Vorgehensmodell</div>
            <h1 class="framework-title">KI-Implementierung in <span class="highlight">5 Phasen</span></h1>
            <div class="framework-elements">
                <!-- element-rows -->
            </div>
        </div>
    </div>
</div>
```

### Detail-Slide

```html
<div class="slide bg-dark framework-h framework-detail">
    <div class="content-area">
        <div class="framework-indicator">
            <div class="indicator-h">
                <div class="indicator-step">
                    <div class="step-dot active"></div>
                    <span class="step-label active">Ziel</span>
                </div>
                <div class="step-connector"></div>
                <div class="indicator-step">
                    <div class="step-dot inactive"></div>
                    <span class="step-label inactive">Analyse</span>
                </div>
                <!-- weitere Steps -->
            </div>
        </div>
        <div class="framework-content">
            <div class="top-label accent">Phase 1</div>
            <h1 class="framework-title">Was soll KI konkret <span class="highlight">verbessern</span>?</h1>
            <!-- detail-intro, detail-section -->
        </div>
    </div>
</div>
```

---

## Indikator-Elemente

### Vertikaler Indikator (indicator-v)

| Element | Beschreibung |
|---------|--------------|
| `.indicator-line` | Vertikale Linie (3px, 30% opacity) |
| `.indicator-step` | Container für Dot + Label |
| `.step-dot` | Kreis (48px, Border 3px) |
| `.step-dot.active` | Ausgefüllter Kreis |
| `.step-dot.inactive` | Halbtransparent (50% opacity) |
| `.step-label` | Text neben Dot (font-small, 700) |

### Horizontaler Indikator (indicator-h)

| Element | Beschreibung |
|---------|--------------|
| `.indicator-step` | Container für Dot + Label (vertikal) |
| `.step-connector` | Horizontale Linie zwischen Steps (80px) |
| `.step-dot` | Kreis (48px, Border 3px) |
| `.step-label` | Text unter Dot (24px) |

---

## Content-Elemente

### Intro-Slide (framework-intro)

| Element | Beschreibung |
|---------|--------------|
| `.framework-elements` | Container für alle Elemente |
| `.element-row` | Eine Zeile: Name → Beschreibung |
| `.element-name` | Fett, 200px min-width |
| `.element-arrow` | Pfeil (→), muted |
| `.element-desc` | Beschreibung, text-soft |
| `.framework-note` | Optionale Fußnote (Instrument Serif, italic, accent) |

### Detail-Slide (framework-detail)

| Element | Beschreibung |
|---------|--------------|
| `.detail-intro` | Bullet-Points oben |
| `.detail-point` | Bullet + Text |
| `.point-bullet` | Kleiner Punkt (8px, muted) |
| `.detail-section` | Abschnitt mit Label + Content |
| `.section-label` | Überschrift (Instrument Serif, italic, accent) |
| `.example-block` | Code/Beispiel-Box (bg-dark-alt, monospace) |

---

## Wann welche Variante?

| Situation | Variante |
|-----------|----------|
| 5+ Schritte | A (Vertikal) – mehr Platz für Labels |
| 3-5 Schritte | B (Horizontal) – übersichtlicher |
| Viel Text pro Schritt | A (Vertikal) – mehr Content-Breite |
| Lineare Prozesse | B (Horizontal) – natürlicher Flow |
| Frameworks mit Hierarchie | A (Vertikal) – top-down Logik |

---

## Beispiel-Folien

**Vorhanden in HTML:**
- A1: Vertikal Intro (Prompt Framework, 5 Schritte)
- A2: Vertikal Detail (Expertenrolle aktiv)
- A3: Vertikal Detail (Kontext aktiv)
- B1: Horizontal Intro (KI-Implementierung, 5 Phasen)
- B2: Horizontal Detail (Phase 1 aktiv)
- B3: Horizontal Detail (Phase 3 aktiv)

---

## Typografie-Referenz

| Element | Font | Größe |
|---------|------|-------|
| framework-title | Noto Sans 900 | font-title-lg (56px) |
| top-label | Instrument Serif | font-label (32px) |
| element-name | Noto Sans 700 | font-body (32px) |
| element-desc | Noto Sans 400 | font-body (32px) |
| step-label | Noto Sans 600 | font-small (24px) |
| example-text | Courier New | font-small (24px) |
| point-text | Noto Sans 400 | font-body (32px) |

---

## Änderungen v2

- Indikator-Hintergrund: `--bg-indicator` statt `--accent` (subtiler)
- Vertikaler Indikator: Verbindungslinien via `::before` Pseudo-Elements
- Font-Sizes reduziert für bessere Proportionen
- Dot-Größe: 34px statt 48px
- Spacing optimiert
