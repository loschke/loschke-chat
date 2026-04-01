---
name: Risikoanalyse
slug: risk-analysis
description: Erstellt eine strukturierte Risikoanalyse mit interaktiver Risikomatrix für Projekte, Kampagnen oder Entscheidungen.
mode: quicktask
category: Analyse & Strategie
icon: ShieldAlert
outputAsArtifact: true
temperature: 0.4
fields:
  - key: vorhaben
    label: Was wird analysiert?
    type: textarea
    required: true
    placeholder: "Projekt, Kampagne, Produkt-Launch, Entscheidung — beschreibe das Vorhaben und den aktuellen Stand"
  - key: bereich
    label: Branche / Bereich
    type: text
    required: true
    placeholder: "z.B. B2B-SaaS, Pharma, Agentur, E-Commerce, Maschinenbau"
  - key: perspektive
    label: Perspektive
    type: select
    required: true
    options:
      - Projektleitung (Umsetzungsrisiken)
      - Management (strategische Risiken)
      - Marketing (Markt- und Reputationsrisiken)
      - Technik (technische und Infrastruktur-Risiken)
      - Compliance (regulatorische Risiken)
  - key: bekannte_risiken
    label: Bereits bekannte Risiken
    type: textarea
    required: false
    placeholder: "Optional: Risiken die du schon auf dem Schirm hast"
---

## Aufgabe

Du erstellst eine strukturierte Risikoanalyse mit konkreten, bewerteten Risiken und einer interaktiven Risikomatrix. Kein generisches Risk-Template — eine Analyse die auf das beschriebene Vorhaben zugeschnitten ist.

## Eingaben

- **Vorhaben:** {{vorhaben}}
- **Branche:** {{bereich}}
- **Perspektive:** {{perspektive}}
- **Bekannte Risiken:** {{bekannte_risiken | default: "Keine vorgegeben"}}

## Vorgehen

### 1. Kontext-Recherche

Nutze `web_search` (1-2 Suchen) um branchenspezifische Risiken zu prüfen:
- Aktuelle regulatorische Änderungen in der Branche
- Bekannte Branchenrisiken oder aktuelle Marktentwicklungen

Nicht tiefer als nötig — das Ziel ist Plausibilitätsprüfung, nicht Marktforschung.

### 2. Risiken identifizieren

Identifiziere 8-12 konkrete Risiken, aufgeteilt nach:

- **Vom Nutzer genannte Risiken** (aus dem Feld "bekannte Risiken") — übernehmen und bewerten
- **Vorhaben-spezifische Risiken** — aus der Beschreibung abgeleitet
- **Branchentypische Risiken** — aus der Recherche
- **Perspektiven-spezifische Risiken** — passend zur gewählten Perspektive

Jedes Risiko bekommt:
- Kurztitel (3-5 Wörter)
- Beschreibung (1-2 Sätze, konkret, nicht generisch)
- Eintrittswahrscheinlichkeit (1-5)
- Auswirkung / Impact (1-5)
- Risiko-Score (Wahrscheinlichkeit × Impact)
- Gegenmaßnahme (1 Satz, konkret und umsetzbar)

### 3. Risikomatrix als HTML-Artifact

Erstelle ein `create_artifact` (type: html) mit:

**Interaktive 5×5 Risikomatrix:**
- X-Achse: Eintrittswahrscheinlichkeit (1=unwahrscheinlich bis 5=sehr wahrscheinlich)
- Y-Achse: Auswirkung (1=gering bis 5=kritisch)
- Farbcodierung: Grün (1-6), Gelb (7-12), Orange (13-19), Rot (20-25)
- Jedes Risiko als Punkt/Badge in der Matrix, klickbar für Details
- Hover oder Click zeigt Beschreibung und Gegenmaßnahme

**Darunter: Risiko-Tabelle**
- Sortiert nach Risiko-Score (höchstes zuerst)
- Spalten: Risiko, Beschreibung, W'keit, Impact, Score, Gegenmaßnahme
- Farbliche Kennzeichnung konsistent mit der Matrix

**Design:**
- Professionell, presentation-ready (kann man in einen Stakeholder-Call mitnehmen)
- Responsive, funktioniert auf Laptop und Tablet
- Keine externen Abhängigkeiten

### 4. Keine Floskeln

- Keine generischen Risiken wie "unvorhergesehene Probleme" oder "Ressourcenmangel" ohne Kontext
- Jedes Risiko muss spezifisch zum Vorhaben sein
- Gegenmaßnahmen müssen umsetzbar sein, nicht "regelmäßig monitoren"
