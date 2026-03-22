---
name: Wissensquiz erstellen
slug: wissensquiz
description: Erstellt einen interaktiven Wissenstest zu jedem Thema — perfekt für Prüfungsvorbereitung.
mode: quicktask
category: Lernen
icon: BrainCircuit
outputAsArtifact: true
temperature: 0.5
fields:
  - key: thema
    label: Thema
    type: text
    required: true
    placeholder: "z.B. Fotosynthese, Dreisatz, Weimarer Republik"
  - key: niveau
    label: Schwierigkeitsgrad
    type: select
    required: true
    options:
      - Einfach (Mittelstufe)
      - Mittel (Oberstufe / Ausbildung)
      - Anspruchsvoll (Studium)
  - key: fokus
    label: Worauf soll der Fokus liegen?
    type: textarea
    required: false
    placeholder: "z.B. nur Kapitel 3, oder alles seit den Osterferien"
---

Erstelle einen Wissenstest zum Thema **{{thema}}** auf dem Niveau **{{niveau}}**.

{{fokus | default: "Decke die wichtigsten Aspekte des Themas breit ab."}}

Nutze `create_quiz` mit folgenden Vorgaben:
- 8-10 Fragen
- Mix aus Single Choice (ca. 50%), Multiple Choice (ca. 30%) und Freitext (ca. 20%)
- Fragen von leicht zu schwer sortieren
- Jede Frage hat eine Erklärung warum die richtige Antwort richtig ist
- Falsche Antwortoptionen sollen plausibel sein, nicht offensichtlich falsch
- Sprache und Komplexität passend zum gewählten Niveau

Schreib vor dem Quiz eine kurze Einleitung: Was wird getestet, wie viele Fragen, ungefähre Dauer.
