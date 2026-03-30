---
name: ebook-factory
description: "Erstellt interaktive HTML-Ebooks mit Buch-Layout (Spread-Ansicht). Multi-Brand-fähig (loschke.ai, unlearn.how, lernen.diy). Light/Dark Mode. Seitentypen-Bibliothek + Komponenten-Baukasten. One-Shot für kurze Ebooks (8–12 Seiten), iterativer Build für längere. Bei Erstellung Brand fragen oder loschke.ai als Default. Default: Light Mode. Integrierter PDF-Export (Einzelseiten)."
---

# Ebook Factory – Interaktive HTML-Ebooks

Erstellt Self-Contained HTML-Ebooks mit Spread-Navigation (Doppelseiten-Ansicht), Brand-Theming und PDF-Export.

## Seitentypen

| ID | Name            | Einsatz                     | Position       |
|----|-----------------|------------------------------|----------------|
| 01 | cover           | Titel, Untertitel, Autor     | Erste Seite    |
| 02 | toc             | Inhaltsverzeichnis           | Zweite Seite   |
| 03 | chapter-opener  | Kapitel-Trenner mit Nummer   | Kapitelstart   |
| 04 | content-text    | Fließtext + Komponenten      | Hauptinhalt    |
| 05 | content-list    | Listen, Schritte, Frameworks | Hauptinhalt    |
| 06 | content-table   | Tabellen, Vergleiche         | Hauptinhalt    |
| 07 | content-checklist | Checklisten, Action Items  | Hauptinhalt    |
| 08 | dialogue        | Gesprächsleitfäden, Q&A      | Hauptinhalt    |
| 09 | case-study      | Praxisbeispiele, Szenarien   | Hauptinhalt    |
| 10 | summary         | Zusammenfassung, Takeaways   | Kapitelende    |
| 11 | resources       | Quellen, Tools, Links        | Anhang         |
| 12 | back-cover      | CTA, Kontakt, Branding       | Letzte Seite   |

**Für Specs:** `[name].md` lesen
**Für Template:** `[name].html` verwenden

## Komponenten (innerhalb von Seiten nutzbar)

Monochromes System – nur Brand-Farben, Unterscheidung durch Struktur:

| Komponente      | CSS-Klasse       | Visuell                          | Ebene   |
|-----------------|------------------|----------------------------------|---------|
| Highlight-Box   | `.highlight-box` | Accent left-border, accent-bg    | Accent  |
| Zitat-Box       | `.quote-box`     | Accent left-border, accent-bg, Serif | Accent |
| Tipp-Box        | `.tip-box`       | Subtle full-border, subtle-bg    | Subtle  |
| Warnung-Box     | `.warning-box`   | Muted left-border, subtle-bg     | Subtle  |
| Definition-Box  | `.definition-box`| Subtle-bg, kein Border, italic   | Subtle  |
| Dialog-Box      | `.dialogue-box`  | Subtle left-border, subtle-bg    | Subtle  |
| Stat-Callout    | `.stat-callout`  | Accent-Zahl, zentriert           | Accent  |
| Tabelle         | `table`          | Dark-Header, subtle rows         | Neutral |

**Keine bunten Boxen.** Keine separaten Farben für Tip/Warning/etc.
Nur `box-accent-*` und `box-subtle-*` aus der Brand-Palette.

### Komponenten-HTML

```html
<!-- Highlight-Box -->
<div class="highlight-box">
    <h4>Titel</h4>
    <p>Inhalt der Highlight-Box.</p>
</div>

<!-- Tipp-Box -->
<div class="tip-box">
    <h4>💡 Tipp-Titel</h4>
    <p>Praktischer Tipp.</p>
</div>

<!-- Warnung-Box -->
<div class="warning-box">
    <h4>⚠️ Warnung</h4>
    <p>Warnhinweis.</p>
</div>

<!-- Definition-Box -->
<div class="definition-box">
    <strong>Begriff:</strong> Erklärung des Begriffs.
</div>

<!-- Dialog-Box -->
<div class="dialogue-box">
    <p><strong>Berater:</strong> „Beispieltext."</p>
    <p><strong>Kunde:</strong> „Antwort."</p>
</div>

<!-- Zitat-Box -->
<div class="quote-box">
    <blockquote>Zitattext hier.</blockquote>
    <cite>— Quelle</cite>
</div>

<!-- Stat-Callout -->
<div class="stat-callout">
    <span class="stat-number">73%</span>
    <span class="stat-label">der Unternehmen nutzen bereits KI</span>
</div>
```

## Brand & Design

**Farben, Typografie, Logos:** Lies aus Brainsidian
→ `04_BRANDS/Visual-Identity-Reference.md`

**Drei Brands:** loschke.ai (default), unlearn.how, lernen.diy
**Kunden-Brand:** Nur mit explizitem Overwrite (Farben + Logo angeben)

**Modi:** Light (default), Dark

**Seitenformat:** Viewport-driven, 3:4 Seitenverhältnis
- Höhe = `calc(100vh - 80px)` (Viewport minus Nav)
- Breite = Höhe × 1.5 (zwei 3:4 Seiten nebeneinander)
- `overflow: hidden` auf Seiten – Content muss passen, kein Scroll
- Content-Seiten werden automatisch vertikal zentriert (flexbox)
- Cover/Chapter-Opener/Back-Cover: `position: absolute; inset: 0`
- JS wrapped Content-Seiten in `.page-inner` für Zentrierung
- Konsequenz: Seiteninhalte müssen knapp gehalten werden (~300 Wörter max)

### Typografie (fluid, vh-basiert)

Alle Größen skalieren mit der Viewport-Höhe via `clamp(min, vh, max)`.
Kalibriert auf ~900px effektiven Viewport (1080p minus Browser-Chrome).
min = bisherige fixe Größe (wird nie kleiner), darüber wächst's.

| Element        | Font              | clamp()                         |
|----------------|-------------------|---------------------------------|
| Buchtitel      | Noto Sans 900     | clamp(28px, 3.5vh, 44px)        |
| Cover-Titel    | Noto Sans 900     | clamp(34px, 4.2vh, 52px)        |
| Kapitel-Titel  | Noto Sans 800     | clamp(26px, 3.2vh, 40px)        |
| Kapitel-Nr.    | Noto Sans 900     | clamp(60px, 7.5vh, 96px)        |
| Überschriften  | Noto Sans 800     | clamp(22px, 2.7vh, 34px)        |
| Unter-Überschr.| Noto Sans 700     | clamp(16px, 2vh, 25px)          |
| Zwischenzeilen | Instrument Serif  | clamp(16px, 2vh, 25px)          |
| Fließtext      | Noto Sans 400     | clamp(14px, 1.65vh, 20px)       |
| Box-Text       | Noto Sans 400     | clamp(13px, 1.55vh, 19px)       |
| Zitat          | Instrument Serif  | clamp(17px, 2.1vh, 27px)        |
| Meta/Quelle    | Noto Sans 400     | clamp(12px, 1.35vh, 17px)       |

Auch Padding, Margins und Box-Abstände sind vh-basiert.

## Design-Regeln

1. **3:4 Buchformat** – Jede Seite hat `aspect-ratio: 3/4`, Content scrollt bei Überlauf
2. **Spread = Doppelseite** – Immer Left + Right Page als Paar denken
3. **Monochrom** – Nur Brand-Farben (Accent + Neutral). Keine bunten Infoboxen
4. **Cover ist Einzelseite** – Left = Cover (volle Breite), Right = TOC oder leer
5. **Kapitel-Opener links** – Neues Kapitel startet immer auf der linken Seite
6. **Komponenten auflockern** – Nie zwei Fließtext-Absätze ohne visuelle Unterbrechung
7. **Accent sparsam** – Nur für Highlights, Nummern, Links
8. **Instrument Serif für Sublines** – Kapiteluntertitel, Seitenlabels
9. **Max. 250–300 Wörter pro Seite** – Content muss ohne Scroll passen

## Workflow

### One-Shot (kurze Ebooks, 8–12 Seiten)

1. Brand + Modus wählen (oder Default: loschke.ai, Light)
2. Farben aus `_brands.css` oder Brainsidian laden
3. Shell aus `_shell.html` als Basis (enthält PDF-Export)
4. Seitentypen wählen und Templates einsetzen
5. Spreads befüllen (je Spread: left + right Content)
6. `[PDF_FILENAME]` im exportPDF() durch Dateinamen ersetzen
7. Als einzelne HTML-Datei ausgeben

### Iterativer Build (längere Ebooks, 14+ Seiten)

1. **Outline-Phase:** Kapitelstruktur + Seitenverteilung festlegen
2. **Kapitel-Phase:** Je Kapitel generieren, Feedback einholen
3. **Assembly-Phase:** Alle Kapitel in Shell zusammenführen
4. **Review-Phase:** `[PDF_FILENAME]` ersetzen, finale HTML ausgeben

Bei iterativem Build: Kapitel als HTML-Fragmente generieren (nur der Content, ohne Shell). Am Ende Assembly.

## Spread-Struktur

Spreads werden als JavaScript-Array definiert:

```javascript
const pageContent = [
    {
        left: `<div class="page-cover">...</div>`,
        right: `<h2>Inhaltsverzeichnis</h2>...`
    },
    {
        left: `<div class="chapter-opener">...</div>`,
        right: `<p>Kapitelinhalt...</p>`
    }
];
```

## Seitenzählung

- Seite 1 = Cover (left im ersten Spread)
- Seite 2 = TOC / rechte Seite im ersten Spread
- Alle weiteren Spreads: left = ungerade, right = gerade
- Seitenzahl wird automatisch im Footer berechnet

## HTML-Ausgabe

Eine Self-Contained HTML-Datei:
- CSS eingebettet (aus `_base.css` + Brand-Variablen aus `_brands.css`)
- JavaScript eingebettet (aus `_shell.html`)
- Google Fonts eingebunden (Noto Sans + Instrument Serif)
- PDF-Export via html2canvas + jsPDF (CDN-Libraries)
- Kein Build-Prozess nötig
- Funktioniert standalone oder eingebettet in Astro (`public/ebooks/`)

## Navigation

Ebook-Navigation enthält:
- **Zurück / Weiter** – Spread-Navigation
- **Pfeiltasten** – Links/Rechts, Home/End
- **Progress-Bar** – Oben, zeigt Lesefortschritt
- **PDF ↓** – Exportiert alle Seiten als Einzelseiten-PDF

## PDF-Export

In der Shell integriert. Button in der Navigationsleiste.

**Funktionsweise:**
1. Iteriert durch alle Spreads
2. Rendert jede Seite (links/rechts) einzeln via html2canvas (scale: 2)
3. Baut mehrseitige PDF mit jsPDF (Einzelseiten im Hochformat)
4. Fortschritt wird in % angezeigt

**Libraries (CDN):**
- `html2canvas 1.4.1` – DOM-to-Canvas Rendering
- `jsPDF 2.5.1` – PDF-Generierung

**Konfiguration:**
- `[PDF_FILENAME]` in `pdf.save()` durch gewünschten Dateinamen ersetzen
- Braucht Internetverbindung (CDN-Libraries)
- Exportiert als Einzelseiten (3:4 Hochformat), nicht als Spreads
- Ideal für LinkedIn-Upload, Download-Angebot, Reader-Nutzung

**Hinweis:** Der Export-Button ist dezent gestaltet (grau, kleiner Font) und stört die Lese-UX nicht. Im PDF-Reader kann der Nutzer selbst auf Zweiseitenansicht umschalten.

## Footer-Struktur

```html
<div class="page-footer">
    <div class="footer-brand">
        <!-- Brand-Logo analog zu Carousel/Presentation Factory -->
    </div>
    <div class="page-number">3</div>
</div>
```

**loschke.ai:**
```html
<div class="footer-brand">
    <span class="rl">RL</span><span class="dot">.</span>
</div>
```

**unlearn.how / lernen.diy:**
```html
<div class="footer-brand logo-brand">
    <span class="brand-name">[name]</span><span class="brand-ext">.[tld]</span>
</div>
```

## Datei-Struktur

```
ebook-factory/
├── SKILL.md              # Diese Datei
├── _base.css             # Gemeinsame Styles (Light + Dark)
├── _brands.css           # Brand-Definitionen
├── _shell.html           # Navigation, JS, Wrapper, PDF-Export
├── cover.md              # Spec: Cover-Seite
├── cover.html            # Template: Cover-Seite
├── toc.md                # Spec: Inhaltsverzeichnis
├── toc.html              # Template: Inhaltsverzeichnis
├── chapter-opener.md     # Spec: Kapitel-Opener
├── chapter-opener.html   # Template: Kapitel-Opener
├── content-text.md       # Spec: Fließtext-Seite
├── content-text.html     # Template: Fließtext-Seite
├── summary.md            # Spec: Zusammenfassung
├── summary.html          # Template: Zusammenfassung
├── back-cover.md         # Spec: Rückseite/CTA
└── back-cover.html       # Template: Rückseite/CTA
```
