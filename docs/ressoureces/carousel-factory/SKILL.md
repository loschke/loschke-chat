---
name: carousel-factory
description: "LinkedIn Carousel Factory mit Multi-Brand-Support. Erstellt LinkedIn Carousels für loschke.ai (default), unlearn.how und lernen.diy. Enthält 14 validierte Slide-Typen und Export-Funktionalität (PDF, PNG). Bei Carousel-Erstellung immer nach Brand fragen oder loschke.ai als Default verwenden."
---

# LinkedIn Carousel – Slide-Bibliothek

Validierte Slide-Typen für LinkedIn Carousels. Multi-Brand-fähig.

## Slide-Typen

| ID | Name | Einsatz | Varianten |
|----|------|---------|-----------|
| 01 | usecase-prompt | Situation + konkreter Prompt | 1 |
| 02 | statement-context | Problem-Setup, These | 1 |
| 03 | series-overview | Serien-Übersicht mit Fortschritt | 1 |
| 04 | prompt-focused | Prompt im Fokus | 1 |
| 05 | compare-better | Nicht optimal vs. Besser | 1 |
| 06 | myth-reality | Annahme vs. Realität | 1 |
| 07 | trap-solution | Falle + Lösung | 1 |
| 08 | titel-slides | Titel/Hook | A–H (8) |
| 09 | quote-slides | Zitate | A–E (5) |
| 10 | stat-slides | Statistiken/Zahlen | A–E (5) |
| 11 | fazit-slides | Abschluss/Summary | A–E (5) |
| 12 | def-slides | Begriffsklärungen | A–E (5) |
| 13 | cta-slides | Call-to-Action | A–D (4) |
| 14 | list-slides | Listen/Frameworks | A–D (4) |

**Für Specs eines Typs:** `references/[name].md` lesen
**Für HTML-Template:** `assets/[name].html` verwenden

## Brand & Design

**Farben, Typografie, Logos:** Lies aus Brainsidian
→ `04_BRANDS/Visual-Identity-Reference.md`

**Drei Brands verfügbar:** loschke.ai (default), unlearn.how, lernen.diy

**Typografie-Kurzform:**
- Headlines: Noto Sans 900, 28–52px
- Sublines/Labels: Instrument Serif, 18–22px
- Fließtext: Noto Sans 400–600, 17–20px

**Format:** 540 × 675px, Padding 48px, Footer 60px

## Design-Regeln

1. **Accent-Hintergrund = helle Schrift** – Text auf Akzentfarbe immer weiß
2. **Hintergründe alternieren** – bg-dark / bg-dark-alt wechseln
3. **Instrument Serif muted: 18–22px** – nie kleiner
4. **Ein Gedanke pro Slide** – max 40–50 Wörter
5. **Akzentfarbe sparsam** – nur für Highlights, Nummern, CTAs

## Workflow

1. Brand wählen (oder Default loschke.ai)
2. Farben aus `04_BRANDS/Visual-Identity-Reference.md` in Brainsidian lesen
3. Slide-Typen für Carousel wählen
4. `[name].md` für Specs lesen
5. `[name].html` als Template nutzen
6. Inhalte einsetzen, Hintergründe alternieren
7. Als einzelne HTML-Datei ausgeben

## Typische Carousel-Struktur

| Position | Typ | Zweck |
|----------|-----|-------|
| 1 | titel-slides | Hook |
| 2–3 | statement-context, def-slides | Setup |
| 4–8 | list-slides, compare-better, stat-slides | Inhalt |
| 9–10 | fazit-slides | Summary |
| 11–12 | cta-slides, series-overview | CTA |

## HTML-Ausgabe

Alle Slides in einer HTML-Datei, CSS eingebettet, Google Fonts eingebunden.
CSS-Variablen aus Visual-Identity-Reference übernehmen.

## Export-Panel

Bei produktiven Carousels das Export-Panel aus `_export-panel.html` vor `</body>` einfügen.

- **PDF für LinkedIn** – Alle Slides als mehrseitiges PDF
- **Einzel-PNGs** – Für Instagram/Threads

## Footer-Struktur

**loschke.ai:**
```html
<div class="slide-footer">
    <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    <div class="slide-number">01</div>
</div>
```

**unlearn.how / lernen.diy:**
```html
<div class="slide-footer">
    <div class="logo logo-brand">
        <span class="brand-name">[name]</span><span class="brand-ext">.[tld]</span>
    </div>
    <div class="slide-number">01</div>
</div>
```

Für Logo-CSS siehe `_brands.css`.
