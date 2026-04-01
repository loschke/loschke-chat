---
name: YouTube-Zusammenfassung
slug: youtube-zusammenfassung
description: Fasst YouTube-Videos zusammen — Kernaussagen, Timestamps und Erkenntnisse auf einen Blick.
mode: quicktask
category: Wissen
icon: PlayCircle
outputAsArtifact: true
temperature: 0.4
fields:
  - key: video
    label: YouTube-URL oder Suchbegriff
    type: textarea
    required: true
    placeholder: "YouTube-Link einfügen oder beschreiben was du suchst (z.B. 'Simon Sinek Golden Circle Vortrag')"
  - key: zweck
    label: Was brauchst du?
    type: select
    required: true
    options:
      - Zusammenfassung (Kernaussagen + Struktur)
      - Lernnotizen (zum Nacharbeiten)
      - Kernzitate & Highlights
      - Vollständiges Transkript
  - key: sprache
    label: Sprache der Zusammenfassung
    type: select
    required: false
    options:
      - Deutsch
      - Originalsprache des Videos
---

## Aufgabe

Du analysierst ein YouTube-Video und bereitest den Inhalt strukturiert auf.

## Eingaben

- **Video:** {{video}}
- **Zweck:** {{zweck}}
- **Sprache:** {{sprache | default: "Deutsch"}}

## Vorgehen

### 1. Video finden oder laden

- Wenn eine YouTube-URL angegeben ist: Nutze `youtube_analyze` direkt mit der URL.
- Wenn ein Suchbegriff angegeben ist: Nutze `youtube_search` um passende Videos zu finden. Zeige die Top 3 Ergebnisse kurz an (Titel, Kanal, Dauer) und analysiere das relevanteste mit `youtube_analyze`.

### 2. Inhalt aufbereiten

Je nach gewähltem Zweck:

**Zusammenfassung:**
- Titel, Kanal, Dauer als Metadaten
- 3-5 Kernaussagen als Bullet Points
- Inhaltliche Gliederung mit Timestamps
- "Lohnt sich das Video?"-Einschätzung (für wen, warum)

**Lernnotizen:**
- Thematische Gliederung (nicht chronologisch, sondern nach Themen)
- Kernkonzepte mit Erklärung
- Praxistipps separat hervorgehoben
- Offene Fragen / Weiterführendes

**Kernzitate & Highlights:**
- Die stärksten Aussagen als Zitate mit Timestamps
- Kontext zu jedem Zitat (warum relevant)
- Zusammenfassung der Hauptthese

**Vollständiges Transkript:**
- Bereinigtes Transkript (keine Füllwörter, keine Wiederholungen)
- Absätze nach Themen strukturiert
- Timestamps an Abschnittsgrenzen

### 3. Artifact erstellen

Erstelle ein `create_artifact` (type: html) mit:
- Video-Metadaten als Header (Titel, Kanal, Dauer, Link)
- Aufbereiteter Inhalt je nach Zweck
- Übersichtliches Design mit klarer Typografie

Schreib vor dem Artifact einen Satz was das Video behandelt. Nicht mehr.
