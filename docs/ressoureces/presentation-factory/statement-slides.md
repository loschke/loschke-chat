# Statement-Slides

> Starke Einzelaussagen mit maximaler Wirkung

## Übersicht

| Variante | Klasse | Use Case |
|----------|--------|----------|
| A – Links | `statement-left` | Aussage mit Erläuterung, klassisch |
| B – Fokus | `statement-focus` | Reduziert, Teil in Accent, maximale Klarheit |
| C – Highlight | `statement-highlight` | Wort/Phrase hervorgehoben, mit Kontext |

Alle Varianten funktionieren auf `bg-dark`, `bg-dark-alt` und `bg-accent`.

---

## Variante A – Links

**Beschreibung:** Linksbündige Aussage mit optionaler Subline für Kontext.

**Struktur:**
```html
<div class="slide bg-dark-alt statement-left">
    <p class="top-label">Die unbequeme Wahrheit</p>
    <div class="content-area">
        <h1 class="statement-text">Die meisten KI-Projekte scheitern nicht an der Technologie.</h1>
        <p class="statement-subline">Sie scheitern an unklaren Zielen.</p>
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
| Statement | Noto Sans 900 | 64px | text-primary |
| Subline | Instrument Serif | 36px | text-muted |

**Wann nutzen:**
- Kernaussage mit Erläuterung
- Fazit nach Argumentation
- Provokante These mit Einordnung

---

## Variante B – Fokus

**Beschreibung:** Nur großer Titel, zentriert. Teil der Aussage in Accent-Farbe für Betonung.

**Struktur:**
```html
<div class="slide bg-dark statement-focus">
    <div class="content-area">
        <h1 class="statement-text">KI ist ein Werkzeug.<br><span class="focus">Nicht die Strategie.</span></h1>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

**Typografie:**
| Element | Font | Größe | Farbe |
|---------|------|-------|-------|
| Statement | Noto Sans 900 | 80px | text-primary |
| .focus | Noto Sans 900 | 80px | accent |

**Auf bg-accent:** `.focus` wird mit opacity 0.6 dargestellt.

**Wann nutzen:**
- Maximale Reduktion gewünscht
- Zentrale Botschaft der Präsentation
- Abschluss-Statement

---

## Variante C – Highlight

**Beschreibung:** Linksbündig mit einem hervorgehobenen Wort/Phrase in Accent, plus optionale Subline.

**Struktur:**
```html
<div class="slide bg-dark statement-highlight">
    <p class="top-label">Erkenntnis</p>
    <div class="content-area">
        <h1 class="statement-text">Automatisierung ohne Strategie ist nur <span class="highlight">schnelleres Chaos.</span></h1>
        <p class="statement-subline">Die Geschwindigkeit verstärkt bestehende Probleme.</p>
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
| Statement | Noto Sans 900 | 64px | text-primary |
| .highlight | Noto Sans 900 | 64px | accent |
| Subline | Instrument Serif | 36px | text-muted |

**Auf bg-accent:** `.highlight` bekommt weißen Hintergrund mit opacity.

**Wann nutzen:**
- Ein Begriff soll betont werden
- Kontrast zwischen Konzepten
- Pointierte Aussage

---

## Entscheidungshilfe

| Situation | Variante |
|-----------|----------|
| Kernbotschaft, maximale Wirkung | B – Fokus |
| Aussage mit Erklärung | A – Links |
| Ein Begriff hervorheben | C – Highlight |
| Auf rotem Hintergrund | Alle (bg-accent) |
| Fazit-Slide | B oder A auf bg-accent |

---

## Design-Konstanten

- **Padding:** 120px (alle Seiten)
- **Logo:** Rechts unten, 32px
- **Footer-Höhe:** 100px
- **Max-Breite Statement:** 1200–1300px

---

## Multi-Brand

Brand-Klasse auf `.slide` setzen:
- `brand-unlearn` → Lila Accent
- `brand-lernen` → Teal Accent

Logo entsprechend anpassen (siehe HTML-Beispiele).
