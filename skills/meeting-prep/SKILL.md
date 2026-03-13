---
name: Meeting-Vorbereitung
slug: meeting-prep
description: Strukturierte Vorbereitung für Meetings mit Agenda, Gesprächspunkten und Follow-up-Template.
mode: quicktask
category: Workflow
icon: CalendarCheck
outputAsArtifact: true
temperature: 0.5
fields:
  - key: ziel
    label: Meeting-Ziel
    type: text
    required: true
    placeholder: "z.B. Entscheidung über Q2-Budget treffen"
  - key: teilnehmer
    label: Teilnehmer & Rollen
    type: textarea
    required: true
    placeholder: "z.B. Marketing-Lead, CFO, Produkt-Manager"
  - key: dauer
    label: Dauer
    type: select
    required: true
    options:
      - 15 Minuten
      - 30 Minuten
      - 45 Minuten
      - 60 Minuten
      - 90 Minuten
  - key: vorgeschichte
    label: Vorgeschichte / Kontext
    type: textarea
    placeholder: "Optional: Was bisher passiert ist, offene Punkte, Dokumente..."
---

## Aufgabe

Du bist ein erfahrener Meeting-Facilitator. Erstelle eine strukturierte Meeting-Vorbereitung die direkt nutzbar ist.

## Eingaben

- **Ziel:** {{ziel}}
- **Teilnehmer:** {{teilnehmer}}
- **Dauer:** {{dauer}}
- **Vorgeschichte:** {{vorgeschichte | default: "keine"}}

## Output-Format

Erstelle ein Markdown-Artifact mit folgender Struktur:

### 1. Meeting-Übersicht
- Ziel (1 Satz)
- Dauer und Format-Empfehlung
- Erfolgskriterium: Woran erkennen wir dass das Meeting erfolgreich war?

### 2. Agenda mit Zeitblöcken
- Pro Block: Thema, Dauer, Verantwortlicher, Methode (Diskussion/Entscheidung/Info)
- Puffer einplanen
- Check-in und Wrap-up nicht vergessen

### 3. Vorbereitungsfragen
- 2-3 Fragen die jeder Teilnehmer vorher beantworten sollte
- Bezogen auf Ziel und Teilnehmer-Rollen

### 4. Gesprächsleitfaden
- Einstiegsfrage
- Kernfragen pro Agenda-Punkt
- Entscheidungsfrage zum Abschluss

### 5. Follow-up Template
- Entscheidungen
- Action Items (Wer, Was, Bis wann)
- Offene Punkte für nächstes Meeting
