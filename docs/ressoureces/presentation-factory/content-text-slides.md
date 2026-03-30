# Content-Text-Slides

Textlastige Inhaltsfolien für erklärende Präsentationsteile – von einfachen Bullet-Listen bis zu strukturierten Pro/Con-Darstellungen.

---

## Varianten-Übersicht

| Variante | Klasse | Use Case |
|----------|--------|----------|
| A | `content-bullets` | Einfache Aufzählung ohne Erklärungen |
| B | `content-bullets content-explained` | Bold-Einleitung + erklärender Text |
| C | `content-grouped` | Mehrere Themenblöcke mit Sub-Bullets |
| D | `content-bullets content-fazit` | Bullets oben + Fazit-Box unten |
| E | `content-bullets content-emoji` | Emojis als Bullet-Marker |
| F | `content-items` | Name → Beschreibung (Tools, Glossar) |
| G | `content-proscons` | Pro/Con mit ✓/✗ Markern |

---

## Variante A – Einfache Bullets

**Klasse:** `content-bullets`

**Use Case:** Klare Aufzählung ohne Erklärungsbedarf (4-6 Items)

**Elemente:**
- `top-label`: Instrument Serif, var(--font-label), text-muted
- `content-title`: Noto Sans 900, var(--font-title-md), text-primary
- `bullet-marker`: 16×16px, accent, rund, margin-top 16px
- `bullet-text`: Noto Sans 500, var(--font-body), text-primary
- Gap zwischen Items: 28px

**Struktur:**
```html
<div class="slide bg-dark content-bullets">
    <div class="top-label">Use-Cases & Anwendung</div>
    <h1 class="content-title">AI-Design im Business-Einsatz</h1>
    <div class="content-area">
        <div class="bullet-list">
            <div class="bullet-item">
                <div class="bullet-marker"></div>
                <span class="bullet-text">Stock-Fotografie für Marketing</span>
            </div>
            <!-- weitere Items -->
        </div>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

---

## Variante B – Bold-Einleitung + Erklärtext

**Klasse:** `content-bullets content-explained`

**Use Case:** Punkte mit Erklärungsbedarf (3-4 Items)

**Elemente:**
- Basis wie Variante A
- `bullet-text`: Noto Sans 400, text-primary
- `bullet-text strong`: Noto Sans 700 (Hervorhebung nur durch font-weight)

**Struktur:**
```html
<div class="slide bg-dark content-bullets content-explained">
    <div class="top-label">KI ist:</div>
    <h1 class="content-title">Besitzt universelles Wissen</h1>
    <div class="content-area">
        <div class="bullet-list">
            <div class="bullet-item">
                <div class="bullet-marker"></div>
                <span class="bullet-text"><strong>Fachwissen auf Abruf:</strong> KI hat während ihres Trainings Millionen von Texten verarbeitet</span>
            </div>
            <!-- weitere Items -->
        </div>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

---

## Variante C – Gruppierte Sektionen

**Klasse:** `content-grouped`

**Use Case:** Mehrere Themenblöcke mit Unterpunkten (2-4 Sektionen)

**Elemente:**
- `content-title`: margin-bottom 48px
- `section-heading`: Noto Sans 700, var(--font-body), text-primary
- `section-item`: Noto Sans 500, var(--font-source), text-primary
- `section-item::before`: Bullet in accent
- Gap zwischen Sektionen: 36px
- Gap innerhalb Sektion: 8px
- Section-Items padding-left: 44px

**Struktur:**
```html
<div class="slide bg-dark content-grouped">
    <h1 class="content-title">Bewusster Umgang mit <span class="highlight">Informationen</span></h1>
    <div class="content-area">
        <div class="content-sections">
            <div class="content-section">
                <div class="section-heading">Personenbezogene Daten:</div>
                <div class="section-items">
                    <div class="section-item">Namen, E-Mail-Adressen, Telefonnummern</div>
                    <div class="section-item">Personalnummern, Sozialversicherungsnummern</div>
                </div>
            </div>
            <!-- weitere Sektionen -->
        </div>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

---

## Variante D – Mit Fazit-Box

**Klasse:** `content-bullets content-fazit`

**Use Case:** Erklärung mit abschließender Schlussfolgerung

**Elemente:**
- Basis wie Variante A
- `section-heading`: Optional für Einleitung, margin-bottom 24px
- `fazit-box`: bg-dark-alt, padding 32px 40px, border-left 4px accent
- `fazit-label`: Instrument Serif, var(--font-source), text-muted
- `fazit-text`: Noto Sans 500, var(--font-source), text-primary

**Struktur:**
```html
<div class="slide bg-dark content-bullets content-fazit">
    <h1 class="content-title">Die Onlinesuche von Gestern war ein berechenbares System</h1>
    <div class="content-wrapper">
        <div class="content-area">
            <div class="section-heading">Das SEO Erfolgsmodell:</div>
            <div class="bullet-list">
                <div class="bullet-item">
                    <div class="bullet-marker"></div>
                    <span class="bullet-text">Die Regeln für SEO waren bekannt.</span>
                </div>
                <!-- weitere Items -->
            </div>
        </div>
        <div class="fazit-box">
            <div class="fazit-label">Veränderung:</div>
            <div class="fazit-text">Von 1 Optimierungsziel zur komplexen Multi-Optimierung</div>
        </div>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

---

## Variante E – Emoji-Bullets

**Klasse:** `content-bullets content-emoji`

**Use Case:** Visuelle Kategorisierung durch Emojis (4-6 Items)

**Elemente:**
- Basis wie Variante A
- `bullet-marker`: Emoji statt Kreis, font-size 36px

**Struktur:**
```html
<div class="slide bg-dark content-bullets content-emoji">
    <div class="top-label">Dimension 4: Neue Architektur</div>
    <h1 class="content-title">Master-Content Architektur</h1>
    <div class="content-area">
        <div class="section-heading section-heading-lg">Einmal erstellt wird automatisch zu:</div>
        <div class="bullet-list">
            <div class="bullet-item">
                <div class="bullet-marker">📱</div>
                <span class="bullet-text">App-Inhalten</span>
            </div>
            <div class="bullet-item">
                <div class="bullet-marker">📺</div>
                <span class="bullet-text">Newsletter-Serien</span>
            </div>
            <!-- weitere Items -->
        </div>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

---

## Variante F – Item-Format

**Klasse:** `content-items`

**Use Case:** Tool-Listen, Ressourcen, Glossar (3-5 Items)

**Elemente:**
- `item-name`: Noto Sans 700, var(--font-body), text-primary
- `item-meta`: Noto Sans 500, var(--font-body), text-muted
- `item-arrow`: Noto Sans 400, var(--font-body), text-muted
- `item-desc`: Instrument Serif, var(--font-source), text-muted
- `item-conclusion`: Instrument Serif, var(--font-subline), text-muted, margin-top 48px
- Gap zwischen Items: 32px

**Struktur:**
```html
<div class="slide bg-dark-alt content-items">
    <div class="top-label">chatGPT & Co</div>
    <h1 class="content-title">Chat-Assistenten</h1>
    <div class="content-area">
        <div class="item-list">
            <div class="item-entry">
                <span class="item-name">chatGPT</span>
                <span class="item-meta">= OpenAI</span>
                <span class="item-arrow">→</span>
                <span class="item-desc">Am häufigsten verwendet</span>
            </div>
            <!-- weitere Items -->
        </div>
        <div class="item-conclusion">Der ideale Assistent hängt von deinen Anforderungen ab.</div>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

---

## Variante G – Pro/Con

**Klasse:** `content-proscons` (gemischt) oder `content-proscons grouped` (gruppiert)

**Use Case:** Abwägungen, Vor-/Nachteile (4-6 Items)

**Elemente:**
- `proscons-marker`: 40×40px, SVG 32px, stroke-width 3
- `.pro svg`: stroke var(--color-good) = #43A047
- `.con svg`: stroke var(--color-bad) = #E53935
- `proscons-text`: Noto Sans 500, var(--font-body), text-primary
- `proscons-conclusion`: Instrument Serif, var(--font-subline), text-muted
- Gap zwischen Items: 24px

**Struktur (gemischt):**
```html
<div class="slide bg-dark-alt content-proscons">
    <div class="top-label">AI-Automatisierung</div>
    <h1 class="content-title">Technische Eigenschaften</h1>
    <div class="content-area">
        <div class="proscons-list">
            <div class="proscons-item">
                <div class="proscons-marker pro">
                    <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <span class="proscons-text">Hohe Konsistenz und Geschwindigkeit</span>
            </div>
            <div class="proscons-item">
                <div class="proscons-marker con">
                    <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </div>
                <span class="proscons-text">Begrenzte Anpassungsfähigkeit</span>
            </div>
        </div>
        <div class="proscons-conclusion">Läuft zuverlässig, wenn vernünftig eingerichtet.</div>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

**Struktur (gruppiert):**
```html
<div class="slide bg-dark content-proscons grouped">
    <div class="top-label">Dimension 3: Neue Formate</div>
    <h1 class="content-title">Content Excellence vor Content Quantität</h1>
    <div class="content-area">
        <div class="proscons-groups">
            <div class="proscons-group">
                <div class="proscons-group-header con">
                    <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    Welcher Content stirbt:
                </div>
                <div class="proscons-group-items">
                    <div class="proscons-group-item">Allgemeine Ratgeber ohne Mehrwert</div>
                </div>
            </div>
            <div class="proscons-group">
                <div class="proscons-group-header pro">
                    <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Welcher Content überlebt:
                </div>
                <div class="proscons-group-items">
                    <div class="proscons-group-item">Service-Seiten und interaktive Tools</div>
                </div>
            </div>
        </div>
    </div>
    <div class="slide-footer">
        <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    </div>
</div>
```

---

## Entscheidungshilfe

| Inhalt | Items | Empfehlung |
|--------|-------|------------|
| Einfache Aufzählung | 4-6 | A (Bullets) |
| Punkte mit Erklärung | 3-4 | B (Explained) |
| Mehrere Themenblöcke | 2-4 Gruppen | C (Grouped) |
| Mit Schlussfolgerung | 3-4 + Fazit | D (Fazit) |
| Visuelle Kategorien | 4-6 | E (Emoji) |
| Tools/Ressourcen/Glossar | 3-5 | F (Items) |
| Vor-/Nachteile | 4-6 | G (ProsCons) |

---

## Hintergrund-Optionen

Alle Varianten funktionieren auf:
- `bg-dark` – Standard
- `bg-dark-alt` – Subtile Variation
- `bg-accent` – Für besondere Hervorhebung

---

## Semantische Farben

Für Pro/Con-Darstellungen (brand-unabhängig):
- `--color-good`: #43A047 (Grün)
- `--color-bad`: #E53935 (Rot)

---

## Design-Konstanten

- Slide-Padding: 120px
- Footer-Höhe: 100px
- Logo: Rechts unten
- Titel-Margin-Bottom: 56px (Standard), 48px (Grouped)
- Typografie: Gemäß CSS-Variablen
