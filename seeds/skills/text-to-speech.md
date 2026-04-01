---
name: Text zu Sprache
slug: text-to-speech
description: Wandelt Text in gesprochenes Audio um. Einzelne Stimme oder Dialog mit zwei Sprechern.
mode: quicktask
category: Kreation & Konzept
icon: Volume2
outputAsArtifact: true
temperature: 0.3
fields:
  - key: text
    label: Text zum Vorlesen
    type: textarea
    required: true
    placeholder: "Den Text eingeben, der vorgelesen werden soll…"
  - key: stimme
    label: Stimme
    type: select
    required: false
    options:
      - Kore (warm, weiblich)
      - Puck (energisch, männlich)
      - Charon (tief, männlich)
      - Zephyr (hell, weiblich)
      - Aoede (warm, weiblich)
      - Fenrir (tief, männlich)
      - Leda (sanft, weiblich)
      - Orus (bestimmt, männlich)
  - key: modus
    label: Modus
    type: select
    required: false
    options:
      - Einzelne Stimme
      - Dialog (2 Sprecher)
---

Der Nutzer möchte Text in gesprochenes Audio umwandeln.

**Text:** {{text}}
**Stimme:** {{stimme | default: "Kore (warm, weiblich)"}}
**Modus:** {{modus | default: "Einzelne Stimme"}}

Deine Aufgabe:
1. Nutze `text_to_speech` um den Text in Audio umzuwandeln.
2. Extrahiere den Stimmnamen aus der Auswahl (z.B. "Kore" aus "Kore (warm, weiblich)").
3. Bei "Dialog (2 Sprecher)": Wenn der Text Sprecher-Markierungen enthält (z.B. "Sprecher 1:", "Rico:", etc.), nutze das `speakers` Feld mit zwei passenden Stimmen. Wähle kontrastierende Stimmen (z.B. eine männliche und eine weibliche).
4. Bei "Einzelne Stimme": Nutze das `voice` Feld mit der gewählten Stimme.
5. Beschreibe kurz auf Deutsch das Ergebnis und biete an, die Stimme zu wechseln oder den Text anzupassen.

Der Text darf maximal 5000 Zeichen lang sein. Wenn er länger ist, kürze ihn sinnvoll.
