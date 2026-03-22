---
name: Bild generieren
slug: bild-generieren
description: Erstellt ein KI-generiertes Bild nach deiner Beschreibung.
mode: quicktask
category: Kreativ
icon: Image
outputAsArtifact: true
temperature: 0.8
fields:
  - key: beschreibung
    label: Was soll auf dem Bild zu sehen sein?
    type: textarea
    required: true
    placeholder: "z.B. Ein Sonnenuntergang über einem See mit Bergen, oder ein lustiger Cartoon-Hund mit Sonnenbrille"
  - key: stil
    label: Stil
    type: select
    required: false
    options:
      - Fotorealistisch
      - Illustration / Zeichnung
      - Cartoon / Comic
      - Aquarell / Künstlerisch
      - Egal — überrasch mich
---

Der Nutzer möchte ein Bild generieren lassen.

**Beschreibung:** {{beschreibung}}
**Stil:** {{stil | default: "Wähle den Stil der am besten zur Beschreibung passt."}}

Deine Aufgabe:
1. Formuliere einen detaillierten Bildprompt auf Englisch basierend auf der Beschreibung. Ergänze sinnvolle Details zu Komposition, Beleuchtung und Stimmung die zum gewünschten Stil passen.
2. Nutze `generate_image` mit dem Prompt.
3. Beschreibe kurz auf Deutsch was du generiert hast und biete Variationen an: "Soll ich den Stil ändern, etwas hinzufügen oder eine andere Perspektive probieren?"

Halte die Beschreibung vor dem Bild kurz — das Bild spricht für sich.
