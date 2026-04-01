---
name: SWOT-Analyse
slug: swot-analyse
description: Erstellt eine strukturierte SWOT-Analyse mit Recherche, interaktiver Matrix und Handlungsempfehlungen.
mode: quicktask
category: Analyse & Strategie
icon: Grid2x2
outputAsArtifact: true
temperature: 0.5
fields:
  - key: vorhaben
    label: Was wird analysiert?
    type: textarea
    required: true
    placeholder: "Unternehmen, Produkt, Projekt, Geschäftsidee — beschreibe das Vorhaben."
  - key: branche
    label: Branche / Markt
    type: text
    required: true
    placeholder: "z.B. E-Commerce, Beratung, Gesundheitswesen, SaaS"
  - key: kontext
    label: Zusätzlicher Kontext
    type: textarea
    required: false
    placeholder: "Optional: Aktuelle Situation, Herausforderungen, Ziele, Zeitrahmen"
---

## Aufgabe

Du erstellst eine fundierte SWOT-Analyse. Keine generischen Textbausteine, sondern eine Analyse die auf das konkrete Vorhaben zugeschnitten ist und in Handlungsempfehlungen mündet.

## Eingaben

- **Vorhaben:** {{vorhaben}}
- **Branche:** {{branche}}
- **Kontext:** {{kontext | default: "Kein zusätzlicher Kontext angegeben"}}

## Vorgehen

### 1. Kontext-Recherche

Nutze `web_search` (1-2 Suchen) um den Markt und die Branche besser zu verstehen:
- Aktuelle Trends und Entwicklungen in der Branche
- Regulatorische Veränderungen, Marktdynamik
- Technologische Entwicklungen die relevant sein könnten

### 2. SWOT-Felder befüllen

Identifiziere pro Quadrant 4-6 konkrete Punkte:

**Strengths (Stärken)** — Interne Vorteile
- Was kann das Vorhaben besonders gut? Welche Ressourcen sind vorhanden?

**Weaknesses (Schwächen)** — Interne Nachteile
- Wo gibt es Lücken? Was fehlt an Ressourcen, Know-how, Reichweite?

**Opportunities (Chancen)** — Externe Möglichkeiten
- Welche Markttrends helfen? Welche Nischen sind offen? Was ändert sich gerade?

**Threats (Risiken)** — Externe Bedrohungen
- Welche Marktrisiken existieren? Wettbewerbsdruck? Regulatorische Risiken?

### 3. Strategien ableiten

Aus der SWOT-Kombination konkrete Strategien entwickeln:
- **SO-Strategien:** Stärken nutzen um Chancen zu ergreifen
- **WO-Strategien:** Schwächen abbauen um Chancen zu nutzen
- **ST-Strategien:** Stärken nutzen um Risiken zu begegnen
- **WT-Strategien:** Schwächen und Risiken minimieren

### 4. HTML-Artifact erstellen

Erstelle ein `create_artifact` (type: html) mit:

**Interaktive SWOT-Matrix:**
- 4 Quadranten, farbcodiert (Grün=Stärken, Gelb=Schwächen, Blau=Chancen, Rot=Risiken)
- Jeder Punkt klickbar/hoverable für Details
- Professionelles, aufgeräumtes Design

**Strategie-Ableitungen:**
- SO/WO/ST/WT-Strategien als zweite Ebene
- Priorisierte Handlungsempfehlungen (Top 3-5)

**Design:** Presentation-ready, responsive, keine externen Abhängigkeiten.

### 5. Qualitätsregeln

- Jeder Punkt muss spezifisch zum Vorhaben sein. Keine generischen Punkte wie "gute Mitarbeiter" oder "Marktveränderungen".
- Chancen und Risiken basieren auf der Recherche, nicht auf Vermutungen.
- Strategien müssen umsetzbar sein, nicht "regelmäßig den Markt beobachten".
