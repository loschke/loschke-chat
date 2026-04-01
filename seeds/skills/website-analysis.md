---
name: Website analysieren
slug: website-analysis
description: Liest eine Website und erstellt eine strukturierte Analyse — Inhalt, Technik, UX und Verbesserungsvorschläge.
mode: quicktask
category: Analyse & Strategie
icon: Globe
outputAsArtifact: true
temperature: 0.5
fields:
  - key: url
    label: Website-URL
    type: text
    required: true
    placeholder: "https://beispiel.de"
  - key: fokus
    label: Analyse-Fokus
    type: select
    required: true
    options:
      - Gesamtüberblick
      - Content & Messaging
      - Technik & SEO
      - UX & Conversion
  - key: kontext
    label: Kontext
    type: textarea
    placeholder: "Optional: Was ist der Anlass? Relaunch geplant? Wettbewerber analysieren?"
---

## Aufgabe

Du analysierst eine Website systematisch und lieferst ein strukturiertes Ergebnis.

## Eingaben

- **URL:** {{url}}
- **Fokus:** {{fokus}}
- **Kontext:** {{kontext | default: "kein zusätzlicher Kontext"}}

## Vorgehen

1. **Seite lesen:** Nutze `web_fetch` um die Seite vollständig zu laden. Analysiere den tatsächlichen Inhalt, nicht dein Vorwissen über die Domain.

2. **Analysiere** je nach Fokus:

   **Gesamtüberblick:** Alle Bereiche oberflächlich — wer ist die Zielgruppe, was ist die Kernbotschaft, wie ist die technische Qualität?

   **Content & Messaging:** Klarheit der Botschaft, Tonalität, Zielgruppen-Passung, Content-Lücken, Headline-Qualität, CTAs.

   **Technik & SEO:** Meta-Tags, Heading-Struktur, URL-Aufbau, Mobile-Hinweise, strukturierte Daten, Ladezeit-Indikatoren.

   **UX & Conversion:** Navigation, Nutzerführung, Call-to-Actions, Vertrauenselemente, Conversion-Pfade.

3. **Erstelle einen HTML-Report** (`create_artifact` type `html`):
   - Übersicht mit Score pro Bereich (Rot/Gelb/Grün)
   - Detailanalyse mit konkreten Beispielen aus der Seite
   - Priorisierte Handlungsempfehlungen
   - Professionelles Design, exportierbar

## Wichtig

- Analysiere was du siehst, nicht was du vermutest. Lies die Seite.
- Gib konkrete Beispiele: "Der Title-Tag lautet 'Home' — besser wäre 'Produkt X | Firma Y'"
- Sei ehrlich bei Lücken: "Ohne Zugang zu Analytics kann ich Traffic nicht einschätzen"
