---
name: Website-Sektion Generator
slug: website-section
description: Erstellt einzelne Website-Sektionen als HTML-Bausteine — Hero, Features, Pricing, Testimonials und mehr.
mode: quicktask
category: Kreation & Konzept
icon: PanelTop
outputAsArtifact: true
temperature: 0.7
fields:
  - key: typ
    label: Sektionstyp
    type: select
    required: true
    options:
      - Hero / Header
      - Features / Leistungen
      - Pricing / Preise
      - Testimonials / Kundenstimmen
      - Team / Über uns
      - FAQ / Häufige Fragen
      - CTA-Banner / Conversion
      - Stats / Zahlen & Fakten
      - Timeline / Prozess-Schritte
      - Vergleichstabelle
  - key: inhalt
    label: Inhalt & Kontext
    type: textarea
    required: true
    placeholder: "Was soll in der Sektion stehen? Texte, Daten, Features, Fragen — alles was du hast"
  - key: stil
    label: Stilrichtung
    type: select
    required: true
    options:
      - Clean & Minimal
      - Bold & Auffällig
      - Corporate & Seriös
      - Startup & Modern
      - Dark Mode
  - key: breite
    label: Layout-Breite
    type: select
    required: false
    options:
      - Volle Breite (edge-to-edge)
      - Container (max-width 1200px)
      - Schmal (max-width 800px, Text-fokussiert)
---

## Aufgabe

Du erstellst eine einzelne Website-Sektion als HTML-Baustein. Nicht eine ganze Seite — ein modulares Element das man in eine bestehende Seite einbauen oder als Entwurf für einen Kunden-Call zeigen kann.

## Eingaben

- **Sektionstyp:** {{typ}}
- **Inhalt:** {{inhalt}}
- **Stil:** {{stil}}
- **Layout:** {{breite | default: "Container (max-width 1200px)"}}

## Vorgehen

Erstelle ein `create_artifact` (type: html) mit der fertigen Sektion.

### Technische Anforderungen

- Eigenständiges HTML mit eingebettetem CSS
- Responsive (Mobile-First, Breakpoint bei 768px)
- CSS-Variablen für Farben, Fonts, Spacing (oben im Style-Block dokumentiert)
- Keine externen Abhängigkeiten, keine Bild-URLs
- Platzhalter-Bilder über CSS-Gradients, SVG oder Emoji-Icons

### Sektionstyp-spezifische Patterns

| Typ | Layout-Pattern | Elemente |
|---|---|---|
| Hero | Vollbild oder Split (Text + Visual) | Headline, Subline, CTA-Button(s), optionales Bild/Visual |
| Features | Grid (2-4 Spalten) oder alternierend | Icon/Visual, Titel, Kurzbeschreibung pro Feature |
| Pricing | Card-Grid (2-3 Optionen) | Plan-Name, Preis, Feature-Liste, CTA, Highlight für empfohlenen Plan |
| Testimonials | Karten oder Slider-Layout | Zitat, Name, Rolle, Unternehmen, optionales Foto |
| Team | Grid mit Karten | Foto-Platzhalter, Name, Rolle, Kurzbio |
| FAQ | Accordion (klappbar, mit JS) | Frage als Trigger, Antwort als Content |
| CTA-Banner | Zentriert oder Split | Headline, Subline, Button(s), optionaler Hintergrund |
| Stats | Horizontales Grid | Zahl, Label, optionale Trend-Angabe |
| Timeline | Vertikal mit Linien-Element | Schritt-Nummer, Titel, Beschreibung, Verbindungslinie |
| Vergleichstabelle | Tabelle mit Highlight-Spalte | Features als Zeilen, Optionen als Spalten, Check/Cross Icons |

### Inhaltlich

- Echte Texte aus dem Input — keine Platzhalter
- Wenn der Input dünn ist, sinnvoll ergänzen aber kennzeichnen: `<!-- Platzhalter: hier eigenen Text einsetzen -->`
- Micro-Copy an interaktiven Elementen (Buttons, Links, Toggles)

### Was nicht

- Keine Navigation oder Footer (das ist eine Sektion, keine Seite)
- Kein JavaScript außer wo nötig (Accordion, Tabs)
- Keine Cookie-Banner oder sonstigen Meta-Elemente
