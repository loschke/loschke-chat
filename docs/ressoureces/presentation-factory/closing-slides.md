# Closing-Slides

Abschlussfolien für Präsentationen – von klassischem Dank bis konkreten nächsten Schritten.

---

## Varianten-Übersicht

| Variante | Klasse | Use Case |
|----------|--------|----------|
| A | `closing-thanks` | Klassischer Dank, zentriert |
| B | `closing-takeaway` | Kernbotschaft + Call-to-Action |
| C | `closing-contact` | Kontaktdaten mit Icons |
| D | `closing-next` | Konkrete nächste Schritte |

---

## Variante A – Danke

**Klasse:** `closing-thanks`

**Use Case:** Klassischer Abschluss für Vorträge und Präsentationen

**Elemente:**
- `closing-title`: Noto Sans 900, 120px
- `closing-subline`: Instrument Serif, var(--font-subline), muted

**Struktur:**
```html
<div class="slide bg-dark closing-thanks">
    <div class="content-area">
        <h1 class="closing-title">Danke.</h1>
        <p class="closing-subline">Für eure Zeit, eure Fragen und euer Engagement.</p>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

---

## Variante B – Takeaway

**Klasse:** `closing-takeaway`

**Use Case:** Kernbotschaft mit Handlungsaufforderung

**Elemente:**
- `closing-label`: Instrument Serif, var(--font-label), muted
- `closing-title`: Noto Sans 900, var(--font-title-lg)
- `closing-cta`: Noto Sans 600, var(--font-body), accent

**Struktur:**
```html
<div class="slide bg-dark-alt closing-takeaway">
    <div class="content-area">
        <p class="closing-label">Das Wichtigste</p>
        <h1 class="closing-title">Startet mit einem Problem, nicht mit einem Tool.</h1>
        <p class="closing-cta">→ Welches Problem löst ihr zuerst?</p>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

---

## Variante C – Kontakt

**Klasse:** `closing-contact`

**Use Case:** Kontaktdaten für weiteren Austausch

**Elemente:**
- `closing-title`: Noto Sans 900, var(--font-title-lg)
- `contact-grid`: Flex-Column, gap 28px
- `contact-item`: Icon + Text
- `contact-icon`: 56×56px, bg-dark-alt, SVG 28px accent
- `contact-text`: Noto Sans 500, var(--font-body)

**Struktur:**
```html
<div class="slide bg-dark closing-contact">
    <div class="content-area">
        <h1 class="closing-title">Lasst uns in Kontakt bleiben.</h1>
        <div class="contact-grid">
            <div class="contact-item">
                <div class="contact-icon">
                    <svg><!-- Icon --></svg>
                </div>
                <span class="contact-text">rico@loschke.ai</span>
            </div>
            <!-- weitere Items -->
        </div>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

**Verfügbare Icons:**
- E-Mail (Briefumschlag)
- LinkedIn (Logo)
- Website (Globus)

---

## Variante D – Nächste Schritte

**Klasse:** `closing-next`

**Use Case:** Konkrete Handlungsaufforderungen zum Mitnehmen

**Elemente:**
- `closing-label`: Instrument Serif, var(--font-label), muted
- `closing-title`: Noto Sans 900, var(--font-title-md)
- `next-steps`: Flex-Column, gap 24px
- `step-number`: Noto Sans 900, 48px, accent
- `step-text`: Noto Sans 500, var(--font-body)

**Struktur:**
```html
<div class="slide bg-dark-alt closing-next">
    <div class="content-area">
        <p class="closing-label">Eure nächsten Schritte</p>
        <h1 class="closing-title">Was ihr morgen tun könnt</h1>
        <div class="next-steps">
            <div class="next-step">
                <span class="step-number">01</span>
                <span class="step-text">Einen Prozess identifizieren, der Zeit frisst</span>
            </div>
            <!-- weitere Steps -->
        </div>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

---

## Entscheidungshilfe

| Situation | Empfohlene Variante |
|-----------|---------------------|
| Keynote, Impulsvortrag | A (Danke) |
| Workshop mit Kernbotschaft | B (Takeaway) |
| Networking-Event | C (Kontakt) |
| Schulung, Training | D (Nächste Schritte) |
| Wichtige Kernaussage | B auf bg-accent |

---

## Hintergrund-Optionen

Alle Varianten funktionieren auf:
- `bg-dark` – Standard
- `bg-dark-alt` – Subtile Variation
- `bg-accent` – Maximale Signalwirkung (besonders für A + B)

---

## Design-Konstanten

- Padding: 120px (alle Seiten)
- Footer-Höhe: 100px
- Logo: Rechts unten
- Typografie: Gemäß CSS-Variablen (--font-label: 40px, --font-subline: 44px, etc.)
