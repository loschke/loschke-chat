---
name: Landing Page Generator
slug: landing-page
description: Erstellt eine fertige Landing Page als interaktiven HTML-Prototyp zum Testen und Iterieren.
mode: quicktask
category: Kreation & Konzept
icon: Layout
outputAsArtifact: true
temperature: 0.7
fields:
  - key: angebot
    label: Was wird angeboten?
    type: textarea
    required: true
    placeholder: "Produkt, Dienstleistung oder Angebot beschreiben — was ist es, für wen, was ist der Kern-Nutzen?"
  - key: zielgruppe
    label: Zielgruppe
    type: text
    required: true
    placeholder: "z.B. Marketing-Leiter in B2B-SaaS-Unternehmen"
  - key: cta
    label: Gewünschte Aktion
    type: text
    required: true
    placeholder: "z.B. Demo buchen, Whitepaper downloaden, Kontakt aufnehmen"
  - key: stil
    label: Stilrichtung
    type: select
    required: true
    options:
      - Clean & Minimal
      - Bold & Auffällig
      - Corporate & Seriös
      - Startup & Modern
      - Kreativ & Unkonventionell
  - key: sektionen
    label: Gewünschte Sektionen
    type: textarea
    required: false
    placeholder: "Optional: z.B. Hero, Features, Social Proof, Pricing, FAQ — leer lassen für automatische Auswahl"
---

## Aufgabe

Du erstellst eine vollständige Landing Page als HTML-Prototyp. Nicht nur ein Wireframe — eine Seite die man im Browser öffnen kann, die gut aussieht und die man einem Stakeholder zeigen kann.

## Eingaben

- **Angebot:** {{angebot}}
- **Zielgruppe:** {{zielgruppe}}
- **CTA:** {{cta}}
- **Stilrichtung:** {{stil}}
- **Sektionen:** {{sektionen | default: "Automatisch: Hero, Problem/Lösung, Features/Nutzen, Social Proof, CTA"}}

## Vorgehen

### 1. Struktur planen

Wähle 5-7 Sektionen die zur Conversion-Logik passen. Standard-Flow:

1. Hero mit Headline, Subline, primärem CTA
2. Problem/Pain Point (warum braucht man das?)
3. Lösung/Nutzen (was ändert sich?)
4. Features oder Vorgehensweise (wie funktioniert es?)
5. Social Proof (Testimonials, Logos, Zahlen)
6. FAQ oder Einwand-Behandlung
7. Finaler CTA-Block

Wenn der Nutzer eigene Sektionen angegeben hat, diese priorisieren.

### 2. HTML-Artifact erstellen

Erstelle ein `create_artifact` (type: html) mit:

**Technisch:**
- Vollständiges HTML mit eingebettetem CSS (kein externes Stylesheet)
- Responsive Design (Mobile-First, funktioniert ab 375px)
- Smooth Scroll für Anker-Navigation
- CSS-Variablen für Farben und Typografie (leicht anpassbar)
- Sinnvolle Platzhalterbilder über CSS-Gradients oder SVG-Shapes (keine externen Bild-URLs)

**Inhaltlich:**
- Echte Texte basierend auf dem Angebot — keine Lorem-ipsum-Platzhalter
- Headlines die konvertieren (Nutzen vor Feature)
- Micro-Copy an Buttons und Formularen
- Konkrete Zahlen und Aussagen statt generischer Superlative

**Stilrichtung umsetzen:**

| Stil | Umsetzung |
|---|---|
| Clean & Minimal | Viel Whitespace, dezente Farben, serifenlose Schrift, max 2 Farben |
| Bold & Auffällig | Große Typografie, starke Kontraste, lebendige Akzentfarben |
| Corporate & Seriös | Gedeckte Farben, klare Struktur, professionelle Typografie |
| Startup & Modern | Gradient-Akzente, abgerundete Elemente, lebendige Farben |
| Kreativ & Unkonventionell | Asymmetrische Layouts, unerwartete Farben, experimentelle Typografie |

### 3. Keine Floskeln

- Kein "Willkommen auf unserer Website"
- Kein "Wir sind ein führender Anbieter"
- Kein "Kontaktieren Sie uns noch heute"
- Headlines adressieren den Nutzen für die Zielgruppe, nicht das Ego des Anbieters
