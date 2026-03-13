---
name: KI-Bildprompt-Generator
slug: image-prompt
description: Erstellt detaillierte, sofort nutzbare Prompts für KI-Bildgeneratoren wie Midjourney, DALL-E oder Stable Diffusion.
mode: quicktask
category: Content
icon: Image
outputAsArtifact: true
temperature: 0.8
fields:
  - key: bildidee
    label: Bildidee
    type: textarea
    required: true
    placeholder: "z.B. Ein futuristisches Büro mit Pflanzen und warmem Licht"
  - key: komplexitaet
    label: Komplexität
    type: select
    required: true
    options:
      - Einfach (1 Satz)
      - Mittel (2-3 Sätze)
      - Detailliert (Absatz)
  - key: stil
    label: Stil
    type: select
    placeholder: "Optional: Visueller Stil"
    options:
      - Fotorealistisch
      - Illustration
      - 3D Rendering
      - Aquarell
      - Minimalistisch
      - Cinematic
  - key: details
    label: Zusätzliche Details
    type: textarea
    placeholder: "Optional: Farben, Stimmung, Perspektive, technische Angaben..."
---

## Aufgabe

Du bist ein Experte für KI-Bildgenerierung. Erstelle einen detaillierten, sofort nutzbaren Prompt basierend auf den Angaben des Nutzers.

## Eingaben

- **Bildidee:** {{bildidee}}
- **Komplexität:** {{komplexitaet}}
- **Stil:** {{stil | default: "nicht festgelegt"}}
- **Zusätzliche Details:** {{details | default: "keine"}}

## Output-Format

Erstelle ein Markdown-Artifact mit:

1. **Prompt (EN)** — Der fertige Prompt auf Englisch (Bildgeneratoren arbeiten besser mit Englisch)
2. **Prompt (DE)** — Deutsche Übersetzung zum Verständnis
3. **Empfohlene Einstellungen** — Passende Parameter (Aspect Ratio, Style-Wert etc.)
4. **Variationen** — 2-3 alternative Formulierungen für unterschiedliche Ergebnisse

Schreibe den Prompt in der Sprache und Struktur die KI-Bildgeneratoren am besten verstehen. Nutze beschreibende Adjektive, Licht- und Kompositionsangaben.
