---
name: Wettbewerbsanalyse
slug: wettbewerbsanalyse
description: Analysiert den Wettbewerb — mit Recherche, Vergleichsmatrix und Positionierungsempfehlung.
mode: quicktask
category: Strategie
icon: Users
outputAsArtifact: true
temperature: 0.5
fields:
  - key: unternehmen
    label: Dein Unternehmen / Produkt
    type: textarea
    required: true
    placeholder: "Was bietest du an? Kurze Beschreibung von Produkt, Service oder Geschäftsmodell."
  - key: branche
    label: Branche / Markt
    type: text
    required: true
    placeholder: "z.B. B2B-SaaS für Projektmanagement, Fitness-Apps, Bio-Lebensmittel"
  - key: wettbewerber
    label: Bekannte Wettbewerber
    type: textarea
    required: false
    placeholder: "Optional: Wettbewerber die du schon kennst (Namen, URLs)"
  - key: fokus
    label: Analyse-Fokus
    type: select
    required: true
    options:
      - Positionierung & Messaging
      - Preisgestaltung & Geschäftsmodell
      - Features & Produktvergleich
      - Marketing & Sichtbarkeit
      - Gesamtanalyse (alles)
---

## Aufgabe

Du erstellst eine datenbasierte Wettbewerbsanalyse. Keine oberflächliche Auflistung, sondern eine Analyse die konkrete Handlungsempfehlungen liefert.

## Eingaben

- **Unternehmen/Produkt:** {{unternehmen}}
- **Branche:** {{branche}}
- **Bekannte Wettbewerber:** {{wettbewerber | default: "Keine vorgegeben — selbst recherchieren"}}
- **Fokus:** {{fokus}}

## Vorgehen

### 1. Wettbewerber identifizieren

Nutze `web_search` (2-3 Suchen) um die relevantesten Wettbewerber zu finden:
- Direkte Wettbewerber (gleiches Angebot, gleiche Zielgruppe)
- Indirekte Wettbewerber (alternatives Angebot, gleiche Zielgruppe)
- Falls der Nutzer Wettbewerber genannt hat: diese einbeziehen und ergänzen

Identifiziere 4-6 relevante Wettbewerber.

### 2. Wettbewerber analysieren

Nutze `web_fetch` um die Websites der Top-Wettbewerber zu lesen. Analysiere je nach Fokus:

- **Positionierung:** Wie positionieren sie sich? Welches Versprechen? Welche Tonalität? Welche Zielgruppe?
- **Preisgestaltung:** Welche Preismodelle? Welche Tiers? Free/Freemium/Paid?
- **Features:** Welche Kernfeatures? Was ist der USP? Was fehlt?
- **Marketing:** Welche Kanäle? Welcher Content? SEO-Sichtbarkeit?

### 3. HTML-Artifact erstellen

Erstelle ein `create_artifact` (type: html) mit:

**Wettbewerber-Matrix:**
- Vergleichstabelle mit den wichtigsten Dimensionen
- Farbliche Kennzeichnung (Stärke/Schwäche)
- Das eigene Unternehmen als Referenz-Spalte

**Positionierungskarte:**
- 2D-Visualisierung mit relevanten Achsen (z.B. Preis vs. Funktionsumfang, Spezialisiert vs. Generalist)
- Wettbewerber als Punkte positioniert

**Erkenntnisse & Empfehlungen:**
- Lücken im Markt die der Nutzer besetzen kann
- Differenzierungsmöglichkeiten
- Konkrete nächste Schritte (3-5 priorisierte Empfehlungen)

**Design:** Professionell, presentation-ready, keine externen Abhängigkeiten.

### 4. Qualitätsregeln

- Jede Aussage über Wettbewerber muss auf der Recherche basieren, nicht geraten.
- Keine generischen Empfehlungen wie "differenziere dich". Konkret: Wodurch? In welche Richtung?
- Quellen angeben wo möglich.
