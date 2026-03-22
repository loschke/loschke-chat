---
name: Brief oder E-Mail schreiben
slug: brief-email
description: Formuliert einen Brief oder eine E-Mail — von der Kündigung bis zur Dankeskarte.
mode: quicktask
category: Alltag
icon: Mail
outputAsArtifact: true
temperature: 0.7
fields:
  - key: anlass
    label: Worum geht es?
    type: textarea
    required: true
    placeholder: "z.B. Widerspruch gegen eine Rechnung, Bewerbung für ein Praktikum, Entschuldigung für die Schule, Dankeschön an die Nachbarn"
  - key: format
    label: Format
    type: select
    required: true
    options:
      - Formeller Brief
      - E-Mail
      - Kurze Nachricht
  - key: stichpunkte
    label: Was soll rein? (Stichpunkte reichen)
    type: textarea
    required: false
    placeholder: "z.B. Kundennummer 12345, war am 15.3. im Laden, Artikel war defekt"
---

Schreibe einen **{{format}}** zum folgenden Anlass:

**Anlass:** {{anlass}}

{{stichpunkte | default: "Keine weiteren Details angegeben — formuliere einen passenden Text basierend auf dem Anlass."}}

Vorgehen:
1. Erstelle den Text als `create_artifact` (markdown).
2. Passe Tonalität ans Format an: Ein formeller Brief an eine Behörde klingt anders als eine Nachricht an die Nachbarn.
3. Bei formellem Brief: Korrektes Layout mit Absender, Empfänger, Datum, Betreff, Grußformel.
4. Bei E-Mail: Passende Betreffzeile vorschlagen.
5. Nutze `content_alternatives` wenn die Tonalität unklar ist — z.B. eine sachliche und eine freundlichere Variante.

Halte die Einleitung vor dem Artifact kurz. Der Nutzer will den Text sehen, keine Erklärung warum du ihn so geschrieben hast.
