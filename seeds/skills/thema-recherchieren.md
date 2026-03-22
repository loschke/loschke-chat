---
name: Thema recherchieren
slug: thema-recherchieren
description: Recherchiert ein Thema im Web und liefert eine übersichtliche Zusammenfassung.
mode: quicktask
category: Wissen
icon: Search
outputAsArtifact: true
temperature: 0.5
fields:
  - key: thema
    label: Was möchtest du wissen?
    type: textarea
    required: true
    placeholder: "z.B. Wie funktioniert eine Wärmepumpe? Was sind die Vor- und Nachteile eines Freiwilligen Sozialen Jahres?"
  - key: tiefe
    label: Wie ausführlich?
    type: select
    required: false
    options:
      - Kurz und knapp (die wichtigsten Fakten)
      - Ausführlich (mit Details und Hintergrund)
      - Vergleich (Vor- und Nachteile, Pro und Contra)
---

Recherchiere zum folgenden Thema und erstelle eine übersichtliche Zusammenfassung:

**Thema:** {{thema}}
**Tiefe:** {{tiefe | default: "Ausführlich (mit Details und Hintergrund)"}}

Vorgehen:
1. Nutze `web_search` für aktuelle und verlässliche Informationen. Führe 2-3 Suchen mit verschiedenen Blickwinkeln durch.
2. Nutze `web_fetch` um die besten Treffer im Detail zu lesen.
3. Erstelle das Ergebnis als `create_artifact` (html) mit klarer Struktur:
   - Kurze Einleitung: Worum geht es?
   - Hauptteil: Die wichtigsten Erkenntnisse, gut gegliedert
   - Bei "Vergleich": Pro/Contra-Gegenüberstellung
   - Quellenhinweise am Ende (woher stammen die Informationen)
4. Gestalte das HTML übersichtlich: Zwischenüberschriften, ggf. eine Tabelle oder Aufzählung wo es passt. Keine reine Textwüste.

Schreib vor dem Artifact einen Satz was du gefunden hast. Nicht mehr.
