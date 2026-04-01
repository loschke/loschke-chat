---
name: Brainstorming
slug: brainstorming
description: Strukturiertes Brainstorming mit Ideenbewertung — von der Fragestellung zur priorisierten Ideenliste.
mode: quicktask
category: Analyse & Strategie
icon: Lightbulb
outputAsArtifact: true
temperature: 0.9
fields:
  - key: fragestellung
    label: Fragestellung / Challenge
    type: textarea
    required: true
    placeholder: "Was soll gelöst, entwickelt oder verbessert werden? Je konkreter, desto besser."
  - key: kontext
    label: Kontext & Rahmenbedingungen
    type: textarea
    required: true
    placeholder: "Branche, Zielgruppe, Budget, Zeitrahmen, Team-Größe, bestehende Constraints..."
  - key: richtung
    label: Denkrichtung
    type: select
    required: true
    options:
      - Pragmatisch (machbar mit vorhandenen Mitteln)
      - Ambitioniert (größer denken, mehr investieren)
      - Radikal (Annahmen hinterfragen, Neustart)
      - Mixed (von sicher bis wild)
  - key: vorhandene_ideen
    label: Vorhandene Ideen
    type: textarea
    required: false
    placeholder: "Optional: Ideen die schon im Raum stehen — werden aufgenommen und weitergedacht"
---

## Aufgabe

Du führst ein strukturiertes Brainstorming durch. Nicht einfach 20 Ideen auflisten — sondern denken, clustern, bewerten und die besten Ideen so aufbereiten, dass man damit weiterarbeiten kann.

## Eingaben

- **Fragestellung:** {{fragestellung}}
- **Kontext:** {{kontext}}
- **Denkrichtung:** {{richtung}}
- **Vorhandene Ideen:** {{vorhandene_ideen | default: "Keine"}}

## Vorgehen

### 1. Fragestellung schärfen

Bevor du Ideen generierst: Reformuliere die Fragestellung als "How Might We"-Frage. Das öffnet den Denkraum.

Aus "Wir brauchen mehr Leads" wird "Wie könnten wir qualifizierte Leads gewinnen, ohne das Budget zu erhöhen?"

### 2. Ideen generieren

Generiere 12-20 Ideen, organisiert in 3-4 Cluster die sich inhaltlich unterscheiden. Nicht alphabetisch oder nach Aufwand — nach Denkrichtung:

**Cluster-Beispiele** (abhängig von der Fragestellung):
- Kanal/Vertrieb, Produkt/Angebot, Prozess/Intern, Kommunikation/Positionierung
- Schnelle Wins, Mittelfristige Projekte, Strategische Wetten
- Inbound, Outbound, Partnerschaften, Produktgeführt

Jede Idee: Titel (3-6 Wörter) + Beschreibung (1-2 Sätze, konkret genug um sie zu verstehen).

Vorhandene Ideen einordnen und weiterdenken — nicht ignorieren, nicht einfach übernehmen.

### 3. Denkrichtung steuert die Mischung

| Richtung | Verteilung |
|---|---|
| Pragmatisch | 70% umsetzbar mit vorhandenen Mitteln, 20% leichter Stretch, 10% wild |
| Ambitioniert | 30% solide Basis, 50% erfordert Investment, 20% moonshot |
| Radikal | 20% Referenz (was man heute tut), 30% deutlich anders, 50% Paradigmenwechsel |
| Mixed | Gleichmäßig verteilt, von sicher bis gewagt, explizit als Spektrum gelabelt |

### 4. Bewertung

Top 5 Ideen bewerten nach:
- **Impact** (1-5): Wie groß ist der potenzielle Effekt?
- **Machbarkeit** (1-5): Wie schnell und einfach umsetzbar?
- **Innovationsgrad** (1-5): Wie neu und differenzierend?

Nutze `content_alternatives` um die Top 3 Ideen mit je einem Mini-Pitch (3-4 Sätze: Was, Warum, Erster Schritt) zur Auswahl zu stellen. Der Nutzer entscheidet welche Richtung er vertiefen will.

### 5. Output

Finales Ergebnis als `create_artifact` (markdown):

- Geschärfte Fragestellung
- Alle Ideen nach Clustern
- Bewertungsmatrix der Top 5
- Empfehlung: Welche 1-2 Ideen zuerst verfolgen und warum
- Nächste Schritte (3 konkrete Actions)

## Keine generischen Ideen

- "Social Media mehr nutzen" ist keine Idee
- "Workshop durchführen" ist keine Idee
- Jede Idee muss spezifisch genug sein, dass man versteht was gemeint ist, ohne nachzufragen
