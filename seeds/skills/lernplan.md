---
name: Lernplan erstellen
slug: lernplan
description: Erstellt einen strukturierten Lernplan mit Tages-/Wochenzielen, Ressourcen und optionalem Wissenstest.
mode: quicktask
category: Lernen
icon: CalendarDays
outputAsArtifact: true
temperature: 0.5
fields:
  - key: thema
    label: Was willst du lernen?
    type: textarea
    required: true
    placeholder: "z.B. Python Grundlagen, Projektmanagement-Zertifizierung, Spanisch für den Urlaub, Prüfung Biologie Klasse 10"
  - key: zeitrahmen
    label: Zeitrahmen
    type: select
    required: true
    options:
      - 1 Woche (Intensiv)
      - 2 Wochen
      - 1 Monat
      - Flexibel (kein festes Datum)
  - key: wissensstand
    label: Aktueller Wissensstand
    type: select
    required: true
    options:
      - Anfänger (kein Vorwissen)
      - Grundlagen vorhanden
      - Fortgeschritten (Vertiefung)
  - key: lernziel
    label: Konkretes Lernziel
    type: textarea
    required: false
    placeholder: "Optional: Was genau willst du am Ende können? Prüfung bestehen? Projekt umsetzen? Gespräch führen?"
---

## Aufgabe

Du erstellst einen konkreten, umsetzbaren Lernplan. Kein generisches "Lies Kapitel 1-5", sondern ein Plan mit klaren Tageszielen, empfohlenen Ressourcen und Meilensteinen.

## Eingaben

- **Thema:** {{thema}}
- **Zeitrahmen:** {{zeitrahmen}}
- **Wissensstand:** {{wissensstand}}
- **Lernziel:** {{lernziel | default: "Solides Grundverständnis des Themas aufbauen"}}

## Vorgehen

### 1. Themenstruktur recherchieren

Nutze `web_search` (1-2 Suchen) um die inhaltliche Struktur des Themas zu verstehen:
- Welche Unterthemen gehören dazu?
- Welche Reihenfolge ist sinnvoll (Vorwissen-Abhängigkeiten)?
- Welche kostenlosen Ressourcen gibt es (Videos, Tutorials, Übungen)?

### 2. Lernplan strukturieren

Teile das Thema in Lerneinheiten auf, angepasst an den Zeitrahmen:

- **1 Woche:** 5-7 Tagesblöcke à 60-90 Minuten
- **2 Wochen:** 10 Tagesblöcke à 45-60 Minuten
- **1 Monat:** Wochenblöcke mit 3-4 Einheiten pro Woche
- **Flexibel:** Modulare Einheiten die in beliebiger Geschwindigkeit abgearbeitet werden können

Jede Einheit hat:
- Lernziel (was kann ich danach?)
- Inhalte (was wird behandelt?)
- Empfohlene Ressource (konkreter Link oder Typ)
- Übung oder Praxisaufgabe
- Geschätzte Dauer

### 3. HTML-Artifact erstellen

Erstelle ein `create_artifact` (type: html) mit:

**Übersicht:**
- Thema, Zeitrahmen, Ziel
- Voraussetzungen
- Gesamtstruktur als Roadmap

**Detailplan:**
- Tages- oder Wochenansicht
- Jede Einheit mit Lernziel, Inhalt, Ressource, Übung
- Meilensteine markiert (z.B. "Nach Woche 1 kannst du...")
- Checkboxen oder visuelle Fortschrittsanzeige

**Ressourcen-Sammlung:**
- Empfohlene Videos, Artikel, Tools
- Unterscheidung: Pflicht vs. optional

**Design:** Übersichtlich, motivierend, druckbar.

### 4. Wissenstest anbieten

Biete am Ende an, einen Wissenstest zum Lernplan zu erstellen (`create_quiz`). Der Test deckt die Kernthemen ab und hilft, den eigenen Fortschritt zu prüfen.
