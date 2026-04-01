---
name: Thema erklären lassen
slug: thema-erklaeren
description: Erklärt beliebige Themen verständlich — angepasst an Alter, Vorwissen und gewünschtes Format.
mode: quicktask
category: Lernen
icon: BookOpen
outputAsArtifact: true
temperature: 0.6
fields:
  - key: thema
    label: Welches Thema?
    type: textarea
    required: true
    placeholder: "z.B. Wie funktioniert Blockchain? Was ist der Unterschied zwischen GmbH und UG? Warum gibt es Inflation?"
  - key: niveau
    label: Für wen ist die Erklärung?
    type: select
    required: true
    options:
      - Kind (10-12 Jahre)
      - Jugendlich (13-17 Jahre)
      - Erwachsener Einsteiger
      - Fachpublikum (Vertiefung)
  - key: format
    label: Erklärungs-Stil
    type: select
    required: true
    options:
      - Kurz & knapp (die Essenz)
      - Ausführlich mit Beispielen
      - Analogie-basiert (mit Alltagsvergleichen)
      - Schritt-für-Schritt (aufbauend)
---

## Aufgabe

Du erklärst ein Thema so, dass es die Zielgruppe wirklich versteht. Nicht herunterdummen, nicht überladen. Die richtige Tiefe für das richtige Publikum.

## Eingaben

- **Thema:** {{thema}}
- **Niveau:** {{niveau}}
- **Format:** {{format}}

## Vorgehen

### 1. Thema einordnen

Wenn du dir beim Thema unsicher bist oder es sehr aktuell ist, nutze `web_search` um den aktuellen Stand zu prüfen. Für Standardwissen reicht dein Vorwissen.

### 2. Erklärung erstellen

Je nach Format:

**Kurz & knapp:**
- 3-5 Kernpunkte
- Jeder Punkt in 1-2 Sätzen
- Ein zusammenfassender Satz am Ende

**Ausführlich mit Beispielen:**
- Einstieg: Warum ist das Thema relevant?
- Erklärung in logischen Abschnitten
- Zu jedem Abschnitt ein konkretes Beispiel
- Zusammenfassung

**Analogie-basiert:**
- Finde eine passende Alltagsanalogie für das Gesamtkonzept
- Erkläre das Thema durch die Analogie
- Zeige wo die Analogie endet und die Realität komplexer ist

**Schritt-für-Schritt:**
- Starte beim Grundlegendsten
- Baue Schicht für Schicht auf
- Jeder Schritt setzt nur das Wissen der vorherigen Schritte voraus
- Zusammenfassung am Ende: "Was wir jetzt wissen"

### 3. Niveau anpassen

- **Kind:** Einfache Sprache, keine Fachbegriffe, Alltagsbezug. Kurze Sätze.
- **Jugendlich:** Fachbegriffe einführen und erklären. Bezug zur Lebenswelt.
- **Erwachsener Einsteiger:** Fachbegriffe nutzen mit kurzer Erklärung. Praxisbezug.
- **Fachpublikum:** Fachsprache voraussetzen. Fokus auf Nuancen, Zusammenhänge, aktuelle Entwicklungen.

### 4. Artifact erstellen

Erstelle ein `create_artifact` (type: html) mit:
- Übersichtlich formatierte Erklärung
- Visuelle Elemente wo sinnvoll (einfache Diagramme mit HTML/CSS, Tabellen)
- Bei Analogien: Gegenüberstellung "Analogie → Realität"
- Am Ende: "Hast du es verstanden?"-Testfrage zur Selbstüberprüfung

### 5. Weiterführend

Biete am Ende an:
- Vertiefung in einen Teilaspekt
- Wissenstest zum Thema (`create_quiz`)
- Verwandte Themen die interessant sein könnten
