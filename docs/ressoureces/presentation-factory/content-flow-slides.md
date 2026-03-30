# Content-Flow-Slides

> Prozesse, Workflows, Abläufe – Dinge die nacheinander passieren

---

## Übersicht

**Zweck:** Sequenzielle Abläufe, Prozessschritte, iterative Zyklen

**Varianten:**
- A: `flow-linear` – Horizontal, 3-5 Schritte nebeneinander
- B: `flow-vertical` – Vertikal, 3-5 Schritte untereinander mit Text
- C: `flow-cycle` – Kreislauf/Zyklus mit Rückführung

---

## Variante A – Linear (Horizontal)

**Klasse:** `flow-linear`

**Use Case:** Einfache Sequenzen, Prozessschritte, "Von A nach B"

**Struktur:**
```html
<div class="slide bg-dark flow-linear">
    <div class="flow-header">
        <div class="top-label">Prozess</div>
        <h1 class="flow-title">Von der Idee zur <span class="highlight">Implementierung</span></h1>
    </div>
    <div class="flow-area">
        <div class="step-box">
            <div class="step-number">01</div>
            <div class="step-title">Problem definieren</div>
            <div class="step-desc">Was genau soll gelöst werden?</div>
        </div>
        <div class="flow-arrow">→</div>
        <div class="step-box">
            <div class="step-number">02</div>
            <div class="step-title">Lösung konzipieren</div>
            <div class="step-desc">Welcher Ansatz passt am besten?</div>
        </div>
        <!-- ... weitere Steps -->
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

**Sub-Variante: Compact**

Klasse `flow-linear compact` – nur Titel, keine Nummern/Beschreibungen.

```html
<div class="slide bg-dark-alt flow-linear compact">
    <div class="flow-header">...</div>
    <div class="flow-area">
        <div class="step-box">
            <div class="step-title">Workshop buchen</div>
        </div>
        <div class="flow-arrow">→</div>
        <div class="step-box">
            <div class="step-title">Experten einladen</div>
        </div>
        <div class="flow-arrow">→</div>
        <div class="step-box">
            <div class="step-title">Hoffen</div>
        </div>
    </div>
    <div class="flow-conclusion">
        <span class="accent">Und dann passiert: nichts.</span> Die Mitarbeiter nicken...
    </div>
</div>
```

**Elemente:**
| Element | Beschreibung |
|---------|--------------|
| `.step-box` | Container pro Schritt (flex: 1, border, rounded) |
| `.step-number` | Nummerierung (accent, font-small) |
| `.step-title` | Haupttext (font-body, 700) |
| `.step-desc` | Beschreibung (Instrument Serif, text-muted) |
| `.flow-arrow` | Pfeil zwischen Steps (→) |
| `.flow-conclusion` | Optionales Fazit am Ende |

**Constraints:**
- 3-5 Schritte optimal
- Titel max. 2-3 Wörter
- Beschreibung max. 1 Zeile

---

## Variante B – Vertikal (Vorgehen)

**Klasse:** `flow-vertical`

**Use Case:** Anleitungen, Schritt-für-Schritt-Guides, Vorgehensweisen mit Erklärung

**Struktur:**
```html
<div class="slide bg-dark flow-vertical">
    <div class="flow-header">
        <div class="top-label">Anleitung</div>
        <h1 class="flow-title">So startest du dein erstes <span class="highlight">KI-Projekt</span></h1>
    </div>
    <div class="flow-area">
        <div class="step-row">
            <div class="step-indicator">
                <div class="step-number">1</div>
                <div class="step-line"></div>
            </div>
            <div class="step-content">
                <div class="step-title">Pain Point identifizieren</div>
                <div class="step-desc">Wo verliert ihr heute Zeit? Was nervt? Sucht einen Prozess...</div>
            </div>
        </div>
        <div class="step-row">
            <div class="step-indicator">
                <div class="step-number">2</div>
                <div class="step-line"></div>
            </div>
            <div class="step-content">
                <div class="step-title">Erfolg definieren</div>
                <div class="step-desc">Woran messt ihr, ob es funktioniert?</div>
            </div>
        </div>
        <!-- ... weitere Steps -->
    </div>
</div>
```

**Elemente:**
| Element | Beschreibung |
|---------|--------------|
| `.step-row` | Zeile pro Schritt |
| `.step-indicator` | Linke Spalte mit Nummer + Linie |
| `.step-number` | Kreis mit Nummer (64px, accent bg, text-primary) |
| `.step-line` | Verbindungslinie (3px, accent, opacity 0.3) |
| `.step-content` | Rechte Spalte mit Inhalt |
| `.step-title` | Titel (font-body, 700) |
| `.step-desc` | Beschreibung (font-source, text-soft) |

**Constraints:**
- 3-5 Schritte optimal
- Viel Platz für Text pro Schritt
- Letzter Step: `.step-line` wird automatisch ausgeblendet

---

## Variante C – Cycle (Kreislauf)

**Klasse:** `flow-cycle`

**Use Case:** Iterative Prozesse, PDCA, Lernzyklen, wiederkehrende Abläufe

**Struktur:**
```html
<div class="slide bg-dark flow-cycle">
    <div class="flow-header">
        <div class="top-label">Methodik</div>
        <h1 class="flow-title">Der <span class="highlight">Lernzyklus</span></h1>
    </div>
    <div class="flow-area">
        <div class="cycle-row">
            <div class="step-box">
                <div class="step-number">01</div>
                <div class="step-title">Planen</div>
                <div class="step-desc">Hypothese aufstellen, Experiment definieren</div>
            </div>
            <div class="flow-arrow">→</div>
            <div class="step-box">
                <div class="step-number">02</div>
                <div class="step-title">Umsetzen</div>
                <div class="step-desc">Experiment durchführen, Daten sammeln</div>
            </div>
            <div class="flow-arrow">→</div>
            <!-- ... weitere Steps -->
        </div>
        <div class="cycle-return">
            <div class="return-arrow">↰</div>
            <div class="return-line"></div>
            <div class="cycle-center">
                <div class="cycle-center-title">Kontinuierliche Verbesserung</div>
                <div class="cycle-center-desc">Jede Iteration macht euch besser</div>
            </div>
            <div class="return-line"></div>
            <div class="return-arrow">↱</div>
        </div>
    </div>
</div>
```

**Elemente:**
| Element | Beschreibung |
|---------|--------------|
| `.cycle-row` | Horizontale Reihe der Steps |
| `.step-box` | Box pro Schritt (300px breit, border) |
| `.step-number` | Nummerierung (accent) |
| `.step-title` | Titel (font-source, 700) |
| `.step-desc` | Beschreibung (Instrument Serif, text-muted) |
| `.flow-arrow` | Pfeil zwischen Steps |
| `.cycle-return` | Rückführungs-Bereich |
| `.return-line` | Horizontale Linie (accent, opacity 0.4) |
| `.return-arrow` | Pfeil-Symbole (↰ ↱) |
| `.cycle-center` | Zentrale Box mit Kernaussage |

**Constraints:**
- Optimal 4 Schritte
- Cycle-Center für Kernbotschaft nutzen
- Kurze Beschreibungen pro Step

---

## Design-Spezifikationen

**Step-Boxen (alle Varianten):**
- Background: `bg-dark-alt` (bzw. invertiert)
- Border: 2px solid accent
- Border-Radius: 16px
- Padding: variiert je nach Variante

**Pfeile:**
- Farbe: accent
- Font-Size: 32-36px
- Zeichen: → ↓ ← ↰ ↱

**Typografie:**
- Step-Number: Noto Sans 900, font-small, accent
- Step-Title: Noto Sans 700, font-body/font-source
- Step-Desc: Instrument Serif, font-source/font-small, text-muted

---

## Wann welche Variante?

| Situation | Variante |
|-----------|----------|
| Einfacher Prozess, 3-5 Schritte | A (Linear) |
| Anleitung mit Erklärungen | B (Vertikal) |
| Iterativer Prozess, Zyklus | C (Cycle) |
| Ironischer/negativer Ablauf | A Compact + Conclusion |

---

## Beispiel-Folien

**Vorhanden in HTML:**
- A1: Linear mit Beschreibung (4 Steps)
- A2: Linear Compact + Fazit (3 Steps)
- B: Vertikal Vorgehen (4 Steps)
- C: Cycle Lernzyklus (4 Steps)
