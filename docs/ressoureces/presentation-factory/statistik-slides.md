# Statistik-Slides

> Zahlen und Daten mit Kontext und Wirkung

## Übersicht

| Variante | Klasse | Use Case |
|----------|--------|----------|
| A – Groß Links | `stat-left` | Große Zahl linksbündig mit Erklärung |
| B – Zentriert | `stat-center` | Maximale Wirkung, zentriert |
| C – Vergleich | `stat-compare` | Zwei Zahlen im Kontrast |

Alle Varianten funktionieren auf `bg-dark`, `bg-dark-alt` und `bg-accent`.

---

## Variante A – Groß Links

**Beschreibung:** Große Zahl in Accent-Farbe, linksbündig mit Kontext und Quelle.

**Struktur:**
```html
<div class="slide bg-dark stat-left">
    <p class="top-label">Die Realität</p>
    <div class="content-area">
        <div class="stat-number">73<span class="stat-unit">%</span></div>
        <p class="stat-context">der Führungskräfte sagen, sie haben eine KI-Strategie. Nur 21% haben sie dokumentiert.</p>
        <p class="stat-source">McKinsey Global Survey, 2024</p>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

**Typografie:**
| Element | Font | Größe | Farbe |
|---------|------|-------|-------|
| Top-Label | Instrument Serif | 32px | text-muted |
| Zahl | Noto Sans 900 | 220px | accent |
| Unit | Noto Sans 900 | 110px | text-muted |
| Context | Noto Sans 600 | 36px | text-primary |
| Source | Instrument Serif | 28px | text-muted |

**Wann nutzen:**
- Einzelne beeindruckende Zahl
- Studie/Report zitieren
- Problem quantifizieren

---

## Variante B – Zentriert

**Beschreibung:** Zentrierte Darstellung, größere Zahl für maximale visuelle Wirkung.

**Struktur:**
```html
<div class="slide bg-dark-alt stat-center">
    <div class="content-area">
        <div class="stat-number">47<span class="stat-unit">%</span></div>
        <p class="stat-context">der KI-Pilotprojekte schaffen es nie in den produktiven Einsatz.</p>
        <p class="stat-source">Gartner Research, 2024</p>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

**Typografie:**
| Element | Font | Größe | Farbe |
|---------|------|-------|-------|
| Zahl | Noto Sans 900 | 260px | accent |
| Unit | Noto Sans 900 | 130px | text-muted |
| Context | Noto Sans 600 | 36px | text-primary |
| Source | Instrument Serif | 28px | text-muted |

**Wann nutzen:**
- Schockierende Statistik
- Kernzahl der Präsentation
- Aufmerksamkeit erzeugen

---

## Variante C – Vergleich

**Beschreibung:** Zwei Zahlen nebeneinander für Vorher/Nachher oder Erwartung/Realität.

**Struktur:**
```html
<div class="slide bg-dark stat-compare">
    <p class="top-label">Erwartung vs. Realität</p>
    <div class="content-area">
        <div class="stat-row">
            <div class="stat-item">
                <span class="stat-label">Geplante Zeitersparnis</span>
                <div class="stat-number">40<span class="stat-unit">%</span></div>
            </div>
            <div class="stat-item">
                <span class="stat-label">Tatsächliche Zeitersparnis</span>
                <div class="stat-number">12<span class="stat-unit">%</span></div>
            </div>
        </div>
        <p class="stat-context">Die Lücke entsteht nicht durch schlechte Tools – sondern durch fehlende Prozessanpassung.</p>
        <p class="stat-source">Interne Auswertung, Q3 2025</p>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

**Typografie:**
| Element | Font | Größe | Farbe |
|---------|------|-------|-------|
| Top-Label | Instrument Serif | 32px | text-muted |
| Stat-Label | Instrument Serif | 32px | text-muted |
| Zahl (links) | Noto Sans 900 | 160px | text-muted |
| Zahl (rechts) | Noto Sans 900 | 160px | accent |
| Unit | Noto Sans 900 | 80px | — |
| Context | Noto Sans 600 | 36px | text-primary |
| Source | Instrument Serif | 28px | text-muted |

**Wann nutzen:**
- Vorher/Nachher zeigen
- Erwartung vs. Realität
- Vergleich zweier Werte

---

## Entscheidungshilfe

| Situation | Variante |
|-----------|----------|
| Eine beeindruckende Zahl | B – Zentriert |
| Zahl mit Erklärung | A – Groß Links |
| Zwei Werte vergleichen | C – Vergleich |
| Eigene Messung | A oder C |
| Externe Studie | A oder B |

---

## Units und Formate

Gängige Units:
- `%` – Prozent
- `×` – Multiplikator
- `h` / `min` – Zeit
- `k` / `M` – Tausend/Million
- Keine Unit bei Jahreszahlen

---

## Design-Konstanten

- **Padding:** 120px (alle Seiten)
- **Logo:** Rechts unten, 32px
- **Footer-Höhe:** 100px
- **Max-Breite Context:** 900–1000px
- **Gap bei Vergleich:** 140px

---

## Auf Akzent-Hintergrund

Bei `bg-accent`:
- Zahl: text-primary
- Unit: text-soft mit opacity 0.7
- Context: text-primary
- Source: text-soft mit opacity 0.9
- Bei Vergleich: linke Zahl mit opacity 0.6

---

## Multi-Brand

Brand-Klasse auf `.slide` setzen:
- `brand-unlearn` → Lila Accent
- `brand-lernen` → Teal Accent

Logo entsprechend anpassen (siehe HTML-Beispiele).
