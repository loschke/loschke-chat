# CTA-Slides

> Call-to-Action Folien für konkrete Handlungsaufforderungen

---

## Übersicht

**Zweck:** Konkrete Handlungsaufforderungen, Ressourcen, Events, nächste Schritte

**Abgrenzung zu Closing-Slides:**
- Closing = Präsentations-Abschluss (Danke, Zusammenfassung, Kontakt allgemein)
- CTA = Konkrete Aktion auslösen (Link besuchen, Event anmelden, Download holen)

**Varianten:**
- A: `cta-link` – URL prominent + optionaler QR-Code
- B: `cta-event` – Workshop/Event mit Datum
- C: `cta-resource` – Download/Ressource mit Badge
- D: `cta-next` – Nächster Schritt / Aufforderung
- E: `cta-summary` – Zusammenfassung + CTA (Split-Layout)

---

## Variante A – CTA Link

**Klasse:** `cta-link`

**Use Case:** Verweis auf Website, Artikel, Ressourcen-Seite

**Struktur:**
```html
<div class="slide bg-dark cta-link">
    <div class="content-area">
        <div class="top-label">Mehr erfahren</div>
        <h1 class="cta-title">Den vollständigen Artikel mit allen <span class="highlight">Beispielen</span> findest du online.</h1>
        <div class="link-display">
            <div>
                <div class="link-url">loschke.ai/artikel</div>
                <p class="link-hint">Inklusive Checkliste zum Download</p>
            </div>
            <!-- optional: QR-Platzhalter -->
            <div class="qr-placeholder">
                <span>QR<br>Code</span>
            </div>
        </div>
    </div>
</div>
```

**Elemente:**
| Element | Beschreibung |
|---------|--------------|
| `.cta-title` | Headline (font-title-lg, 900) |
| `.link-url` | URL prominent (font-title-md, 700, accent) |
| `.link-hint` | Zusatzinfo (Instrument Serif, muted) |
| `.qr-placeholder` | 200x200px weiße Box für QR-Code |

---

## Variante B – CTA Event

**Klasse:** `cta-event`

**Use Case:** Workshop, Webinar, Event bewerben

**Struktur:**
```html
<div class="slide bg-dark cta-event">
    <div class="content-area">
        <div class="event-layout">
            <div class="event-date">
                <div class="date-day">14</div>
                <div class="date-month">Februar</div>
            </div>
            <div class="event-content">
                <div class="event-meta">Online Workshop · 09:00 – 12:00 Uhr</div>
                <h1 class="cta-title">KI-Strategie in <span class="highlight">3 Stunden</span></h1>
                <p class="event-details">Beschreibung...</p>
                <div class="event-action">→ Anmeldung unter loschke.ai/workshop</div>
            </div>
        </div>
    </div>
</div>
```

**Elemente:**
| Element | Beschreibung |
|---------|--------------|
| `.date-day` | Tag (120px, 900, accent) |
| `.date-month` | Monat (font-body, uppercase, letter-spacing) |
| `.event-meta` | Typ + Uhrzeit (Instrument Serif, muted) |
| `.event-details` | Beschreibung (font-body, text-soft) |
| `.event-action` | Handlungsaufforderung (font-body, 700, accent) |

---

## Variante C – CTA Resource

**Klasse:** `cta-resource`

**Use Case:** Download, Checkliste, Whitepaper, Lead-Magnet

**Struktur:**
```html
<div class="slide bg-dark cta-resource">
    <div class="content-area">
        <div class="resource-badge">
            <svg><!-- Download Icon --></svg>
            <span class="badge-text">Kostenloser Download</span>
        </div>
        <h1 class="cta-title">KI-Strategie <span class="highlight">Checkliste</span></h1>
        <p class="cta-subline">15 Fragen, die jedes Unternehmen beantworten sollte...</p>
        <div class="resource-url">loschke.ai/checkliste</div>
    </div>
</div>
```

**Elemente:**
| Element | Beschreibung |
|---------|--------------|
| `.resource-badge` | Badge mit Icon + Text (bg-dark-alt) |
| `.badge-text` | Label (font-source, 700, uppercase) |
| `.cta-subline` | Beschreibung (Instrument Serif, font-subline) |
| `.resource-url` | URL (font-body, 700, accent) |

**Layout:** Zentriert

---

## Variante D – CTA Next

**Klasse:** `cta-next`

**Use Case:** Konkreter nächster Schritt, Handlungsaufforderung

**Struktur:**
```html
<div class="slide bg-dark cta-next">
    <div class="content-area">
        <div class="next-number">01</div>
        <h1 class="cta-title">Identifiziert <span class="highlight">einen</span> Prozess, der euch Zeit kostet.</h1>
        <p class="cta-subline">Nicht zehn. Nicht den komplexesten...</p>
    </div>
</div>
```

**Elemente:**
| Element | Beschreibung |
|---------|--------------|
| `.next-number` | Große Zahl/Symbol (180px, opacity 0.3) |
| `.cta-title` | Headline (font-title-lg) |
| `.cta-subline` | Erläuterung (Instrument Serif) |

**Modifier:**
- `.centered` – Zentrierte Ausrichtung (für `bg-accent`)

---

## Variante E – CTA Summary

**Klasse:** `cta-summary`

**Use Case:** Zusammenfassung + Call-to-Action im Split

**Struktur:**
```html
<div class="slide bg-dark cta-summary">
    <div class="content-area">
        <div class="summary-layout">
            <div class="summary-points">
                <div class="summary-point">
                    <span class="point-marker">01</span>
                    <span class="point-text">Punkt 1</span>
                </div>
                <!-- weitere Punkte -->
            </div>
            <div class="summary-cta">
                <div class="cta-label">Nächster Schritt</div>
                <h2 class="cta-title">Lasst uns <span class="highlight">sprechen</span></h2>
                <div class="cta-action">→ rico@loschke.ai</div>
            </div>
        </div>
    </div>
</div>
```

**Elemente:**
| Element | Beschreibung |
|---------|--------------|
| `.summary-layout` | Grid 1fr 1fr, gap 100px |
| `.point-marker` | Nummer (font-body, 900, accent) |
| `.point-text` | Text (font-body, 500) |
| `.summary-cta` | CTA-Bereich mit border-left |
| `.cta-action` | Handlungsaufforderung (font-body, 700, accent) |

---

## Wann welche Variante?

| Situation | Variante |
|-----------|----------|
| "Besucht meine Website" | A (Link) |
| "Meldet euch zum Workshop an" | B (Event) |
| "Holt euch die Checkliste" | C (Resource) |
| "Das ist euer nächster Schritt" | D (Next) |
| "Zusammenfassung + nächster Schritt" | E (Summary) |

---

## Typografie-Referenz

| Variable | Größe | Verwendung |
|----------|-------|------------|
| `--font-title-lg` | 64px | cta-title |
| `--font-title-md` | 52px | link-url, summary cta-title |
| `--font-label` | 40px | top-label, event-meta |
| `--font-subline` | 44px | cta-subline |
| `--font-body` | 40px | event-details, point-text |
| `--font-source` | 36px | badge-text, link-hint |

---

## Beispiel-Folien

**Vorhanden in HTML:**
- A1: Link ohne QR
- A2: Link mit QR-Platzhalter
- B: Event (Workshop mit Datum)
- C: Resource (Checkliste Download)
- D1: Next linksbündig
- D2: Next zentriert auf Accent
- E: Summary (3 Punkte + CTA)
