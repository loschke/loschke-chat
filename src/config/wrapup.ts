/**
 * Session Wrap-up: Typ-Definitionen, Labels und Prompt-Templates.
 * Generiert strukturierte Markdown-Artifacts aus Chat-Sessions.
 */

export interface WrapupType {
  key: string
  label: string
  description: string
  icon: string
  promptTemplate: string
}

export const WRAPUP_TYPES: WrapupType[] = [
  {
    key: "handoff",
    label: "Übergabe",
    description: "Strukturiertes Dokument für nächste Session oder Person",
    icon: "ArrowRightLeft",
    promptTemplate: `Erstelle ein strukturiertes Übergabe-Dokument basierend auf dem gesamten bisherigen Dialog.

Struktur:
## Ausgangslage
Was war die ursprüngliche Fragestellung oder Aufgabe?

## Erarbeitetes
Was wurde im Dialog entwickelt, diskutiert oder entschieden? Konkrete Ergebnisse.

## Entscheidungen
Welche Entscheidungen wurden getroffen? Mit Begründung.

## Offene Punkte
Was ist noch ungeklärt oder braucht weitere Arbeit?

## Nächste Schritte
Konkrete Handlungsempfehlungen, priorisiert.`,
  },
  {
    key: "summary",
    label: "Zusammenfassung",
    description: "Kernpunkte und Entscheidungen kompakt",
    icon: "FileText",
    promptTemplate: `Erstelle eine kompakte Zusammenfassung des gesamten bisherigen Dialogs.

Struktur:
## Thema
Ein Satz: Worum ging es?

## Kernpunkte
- Die wichtigsten Erkenntnisse und Ergebnisse als Bullet Points

## Entscheidungen
- Getroffene Entscheidungen mit kurzer Begründung

## Offene Fragen
- Falls vorhanden: Was wurde nicht abschließend geklärt?

Halte es scannbar und auf das Wesentliche reduziert.`,
  },
  {
    key: "prd",
    label: "Anforderungsdokument",
    description: "Formales Dokument mit Anforderungen und Abgrenzung",
    icon: "ClipboardList",
    promptTemplate: `Erstelle ein Anforderungsdokument (PRD) basierend auf dem gesamten bisherigen Dialog.

Struktur:
## Ziel
Was soll erreicht werden? Ein klarer Satz.

## Kontext
Warum ist das relevant? Hintergrund und Ausgangslage.

## Anforderungen

### Must-Have
- Unverzichtbare Anforderungen

### Should-Have
- Wichtige aber nicht kritische Anforderungen

### Could-Have
- Nice-to-have Features

## Abgrenzung
Was ist explizit NICHT Teil des Scopes?

## Offene Fragen
Ungeklärte Punkte die vor der Umsetzung entschieden werden müssen.`,
  },
  {
    key: "action-items",
    label: "Action Items",
    description: "Priorisierte nächste Schritte",
    icon: "ListChecks",
    promptTemplate: `Erstelle eine priorisierte Liste von Action Items basierend auf dem gesamten bisherigen Dialog.

Struktur:
## Kontext
Ein Satz: Was wurde besprochen?

## Action Items

| # | Aufgabe | Priorität | Abhängigkeit |
|---|---------|-----------|--------------|
| 1 | ... | Hoch/Mittel/Niedrig | Falls vorhanden |

## Hinweise
- Zusätzliche Informationen die für die Umsetzung relevant sind

Leite die Action Items aus konkreten Ergebnissen und Entscheidungen im Dialog ab. Keine generischen Aufgaben erfinden.`,
  },
  {
    key: "briefing",
    label: "Briefing",
    description: "Kompakt-Info für Dritte ohne internen Jargon",
    icon: "Send",
    promptTemplate: `Erstelle ein Briefing-Dokument für Dritte basierend auf dem gesamten bisherigen Dialog.

Struktur:
## Thema
Worum geht es? Verständlich ohne Vorwissen.

## Kontext
Warum ist das relevant? Ausgangslage kurz erklärt.

## Ergebnisse
Was wurde erarbeitet? Konkrete Outcomes.

## Implikationen
Was bedeutet das für die Empfänger? Was ändert sich?

## Nächste Schritte
Was wird erwartet oder empfohlen?

Schreibe klar und ohne internen Jargon. Das Dokument muss ohne den Dialog verständlich sein.`,
  },
]

export function getWrapupType(key: string): WrapupType | undefined {
  return WRAPUP_TYPES.find((t) => t.key === key)
}

export function buildWrapupPrompt(type: WrapupType, userContext?: string, format: "text" | "audio" = "text"): string {
  const sections: string[] = []

  sections.push(`## Session Wrap-up: ${type.label}`)
  sections.push("Analysiere den gesamten bisherigen Dialog sorgfältig und erstelle ein strukturiertes Dokument.")
  sections.push(type.promptTemplate)

  if (userContext?.trim()) {
    sections.push(`### Zusätzliche Hinweise des Nutzers\n${userContext.trim()}`)
  }

  if (format === "audio") {
    sections.push(`WICHTIG: Erstelle das Ergebnis als Audio mit dem \`text_to_speech\` Tool. Formuliere den Text als gesprochene Zusammenfassung — natürlich, flüssig, ohne Markdown-Formatierung, ohne Aufzählungszeichen oder Tabellen. Halte dich kompakt (max. 4000 Zeichen), damit die Sprachausgabe gut funktioniert. Beginne direkt mit dem Inhalt, keine Meta-Einleitung wie "Hier ist deine Zusammenfassung".`)
  } else {
    sections.push(`WICHTIG: Erstelle das Ergebnis als Artifact mit dem \`create_artifact\` Tool (type: "markdown"). Wähle einen passenden Titel im Format "${type.label}: [Thema aus der Konversation]".`)
  }

  return sections.join("\n\n")
}
