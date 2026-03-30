# CTA-Slides

> Call-to-Action Slides für verschiedene Conversion-Ziele.

---

## Einsatz

Abschluss-Slides, die zu einer Handlung auffordern: Link klicken, Ressource laden, Event buchen, Kontakt aufnehmen.

---

## Varianten

| Variante | Klasse | Einsatz |
|----------|--------|---------|
| A | `cta-link` | Website, Blog-Artikel, einfache Links |
| B | `cta-resource` | Whitepaper, Collections, Downloads |
| C | `cta-event` | Workshops, Seminare, Termine mit Datum |
| D | `cta-contact` | Anfragen, Terminbuchung, Kontaktdaten |

---

## Design-Regel

**Accent-Hintergrund = helle Schrift**
- CTA-Button: `background: var(--accent)`, `color: var(--text-primary)`
- Event-Date-Box: Weiße Schrift auf Rot

---

## Variante A: Link

**Struktur:**
- `top-label`: "Mehr erfahren", "Weiterlesen"
- `headline size-md`: Was/Wo finden
- `cta-button`: "Link im Post ↓"
- `cta-hint` (optional): Zusatzinfo

**CSS-Klassen:**
```css
.cta-link .content-area {
    justify-content: center;
    align-items: center;
    text-align: center;
}

.cta-button {
    background: var(--accent);
    color: var(--text-primary);
    font-family: 'Noto Sans', sans-serif;
    font-weight: 700;
    font-size: 16px;
    padding: 14px 32px;
}

.cta-hint {
    font-family: 'Instrument Serif', serif;
    font-size: 16px;
    color: var(--text-muted);
    margin-top: 16px;
}
```

---

## Variante B: Resource

**Struktur:**
- `top-label`: "Kostenlose Ressource", "Download"
- `resource-badge`: Icon + Label (PDF, Collection, etc.)
- `headline size-md`: Ressourcen-Name
- `resource-desc`: Kurzbeschreibung (Instrument Serif 22px muted)
- `cta-button`

**CSS-Klassen:**
```css
.resource-badge {
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--bg-dark-alt);
    padding: 12px 24px;
    margin-bottom: 24px;
}

.resource-badge svg {
    width: 22px;
    height: 22px;
    stroke: var(--accent);
}

.resource-badge span {
    font-family: 'Noto Sans', sans-serif;
    font-size: 13px;
    font-weight: 700;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 1px;
}

.resource-desc {
    font-family: 'Instrument Serif', serif;
    font-size: 22px;
    color: var(--text-muted);
}
```

---

## Variante C: Event

**Struktur:**
- `top-label`: "Nächster Termin", "Workshop"
- `event-header`: Datum-Box + Meta
- `headline size-md`: Event-Name
- `event-desc`: Kurzbeschreibung (Instrument Serif 22px muted)
- `cta-button`

**CSS-Klassen:**
```css
.event-date-box {
    background: var(--accent);
    padding: 14px 18px;
    text-align: center;
}

.event-day {
    font-family: 'Noto Sans', sans-serif;
    font-weight: 900;
    font-size: 32px;
    color: var(--text-primary);  /* Weiß auf Rot! */
}

.event-month {
    font-family: 'Noto Sans', sans-serif;
    font-weight: 700;
    font-size: 13px;
    color: var(--text-primary);
    opacity: 0.9;
    text-transform: uppercase;
}

.event-type {
    font-family: 'Instrument Serif', serif;
    font-size: 16px;
    color: var(--text-muted);
}

.event-time {
    font-family: 'Noto Sans', sans-serif;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
}
```

---

## Variante D: Contact

**Struktur:**
- `top-label`: "Zusammenarbeiten", "Termin buchen"
- `contact-intro`: Einleitende Frage (Instrument Serif 22px muted)
- `headline size-md`: CTA-Statement
- `contact-options`: Liste mit Icons

**CSS-Klassen:**
```css
.contact-intro {
    font-family: 'Instrument Serif', serif;
    font-size: 22px;
    color: var(--text-muted);
    margin-bottom: 20px;
}

.contact-icon {
    width: 40px;
    height: 40px;
    background: var(--bg-dark-alt);
    display: flex;
    align-items: center;
    justify-content: center;
}

.contact-icon svg {
    width: 20px;
    height: 20px;
    stroke: var(--accent);
}

.contact-text {
    font-family: 'Noto Sans', sans-serif;
    font-size: 18px;
    font-weight: 500;
    color: var(--text-primary);
}
```

---

## Icons (SVG)

**Download/PDF:**
```html
<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><polyline points="9 15 12 18 15 15"></polyline></svg>
```

**Collection/Grid:**
```html
<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
```

**Mail:**
```html
<svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
```

**LinkedIn:**
```html
<svg viewBox="0 0 24 24"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
```

**Kalender:**
```html
<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
```
