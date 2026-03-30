# Quote-Slides

> Zitate und Aussagen Dritter mit Quellenangabe

## Übersicht

| Variante | Klasse | Use Case |
|----------|--------|----------|
| A – Klassisch | `quote-classic` | Großes Anführungszeichen, linksbündig |
| B – Zentriert | `quote-center` | Symmetrisch, elegant |
| C – Mit Linie | `quote-border` | Borderlinie statt Anführungszeichen |

Alle Varianten funktionieren auf `bg-dark`, `bg-dark-alt` und `bg-accent`.

---

## Variante A – Klassisch

**Beschreibung:** Großes dekoratives Anführungszeichen in Accent-Farbe, linksbündiger Text.

**Struktur:**
```html
<div class="slide bg-dark quote-classic">
    <div class="content-area">
        <span class="quote-mark">"</span>
        <p class="quote-text">Wir neigen dazu, die Auswirkungen einer Technologie kurzfristig zu überschätzen und langfristig zu unterschätzen.</p>
        <p class="quote-source">Roy Amara, Institute for the Future</p>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

**Typografie:**
| Element | Font | Größe | Farbe |
|---------|------|-------|-------|
| Quote-Mark | Instrument Serif | 200px | accent |
| Quote-Text | Instrument Serif italic | 48px | text-primary |
| Source | Noto Sans 500 | 28px | text-muted |

**Wann nutzen:**
- Bekannte Zitate
- Externe Autoritäten
- Historische Aussagen

---

## Variante B – Zentriert

**Beschreibung:** Symmetrische Darstellung, eleganter und formeller.

**Struktur:**
```html
<div class="slide bg-dark-alt quote-center">
    <div class="content-area">
        <span class="quote-mark">"</span>
        <p class="quote-text">Die Frage ist nicht, ob KI Jobs verändert. Die Frage ist, ob wir die Veränderung gestalten oder erleiden.</p>
        <p class="quote-source">— Eigene Erfahrung aus 20+ Workshops</p>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

**Typografie:**
| Element | Font | Größe | Farbe |
|---------|------|-------|-------|
| Quote-Mark | Instrument Serif | 180px | accent |
| Quote-Text | Instrument Serif italic | 48px | text-primary |
| Source | Noto Sans 500 | 28px | text-muted |

**Wann nutzen:**
- Kurze, prägnante Zitate
- Eigene Erkenntnisse
- Formelle Präsentationen

---

## Variante C – Mit Linie

**Beschreibung:** Linke Borderlinie statt Anführungszeichen, moderner Look.

**Struktur:**
```html
<div class="slide bg-dark quote-border">
    <p class="top-label">Aus einem Workshop</p>
    <div class="content-area">
        <div class="quote-block">
            <p class="quote-text">Ich dachte, das Problem wäre die Technologie. Es war die Art, wie wir über Probleme nachdenken.</p>
            <p class="quote-source">— Teilnehmer, KI-Strategie-Workshop</p>
        </div>
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
| Quote-Text | Instrument Serif italic | 48px | text-primary |
| Source | Noto Sans 500 | 28px | text-muted |
| Border | — | 6px | accent |

**Wann nutzen:**
- Testimonials
- Workshop-Feedback
- Persönliche Erfahrungsberichte

---

## Entscheidungshilfe

| Situation | Variante |
|-----------|----------|
| Bekanntes Zitat, Autorität | A – Klassisch |
| Kurz und prägnant | B – Zentriert |
| Testimonial, Feedback | C – Mit Linie |
| Eigene Erkenntnis | B oder C |
| Formelle Keynote | B – Zentriert |

---

## Design-Konstanten

- **Padding:** 120px (alle Seiten)
- **Logo:** Rechts unten, 32px
- **Footer-Höhe:** 100px
- **Max-Breite Quote:** 1000–1100px
- **Source:** Immer mit "—" Prefix

---

## Auf Akzent-Hintergrund

Bei `bg-accent`:
- Quote-Mark: text-primary mit opacity 0.4
- Quote-Text: text-primary
- Source: text-soft mit opacity 0.9
- Border (Variante C): text-primary mit opacity 0.6

---

## Multi-Brand

Brand-Klasse auf `.slide` setzen:
- `brand-unlearn` → Lila Accent
- `brand-lernen` → Teal Accent

Logo entsprechend anpassen (siehe HTML-Beispiele).
