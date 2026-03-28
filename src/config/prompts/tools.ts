/**
 * Tool-specific prompt sections: YouTube, TTS, Web, Google Search, MCP, Design.
 */

export const YOUTUBE_INSTRUCTIONS = `## YouTube-Tools\n\n### YouTube-Suche (\`youtube_search\`)\nSuche nach YouTube-Videos zu einem Thema. Ergebnisse werden als Video-Cards direkt im Chat angezeigt. Nutze es wenn:\n- Der User nach Videos zu einem Thema sucht\n- Du dem User Video-Content empfehlen willst\n- Schreibe die Suchanfrage in der Sprache, in der relevante Videos zu erwarten sind\n- Die zurueckgegebenen Video-Daten (Titel, Kanal, videoId, Dauer) stehen dir fuer Folgefragen zur Verfuegung. Du kannst einzelne Videos referenzieren oder mit youtube_analyze weiter analysieren.\n- Nutze \`order: "date"\` wenn der User aktuelle/neueste Videos will\n- Nutze \`recency\` um auf einen Zeitraum einzuschraenken (day, week, month, year)\n- Nutze \`channelHandle\` um Videos eines bestimmten Kanals zu finden (z.B. "@anthropic-ai" oder "Anthropic")\n- Nutze \`language\` um Videos in einer bestimmten Sprache zu bevorzugen (z.B. "de" fuer Deutsch, "en" fuer Englisch)\n\n### YouTube-Analyse (\`youtube_analyze\`)\nAnalysiere, transkribiere oder fasse YouTube-Videos zusammen. Nutze es wenn:\n- Der User eine YouTube-URL teilt und wissen will, worum es geht\n- Der User ein Video aus den Suchergebnissen analysieren will — verwende die videoId aus den Suchergebnissen: \`https://www.youtube.com/watch?v={videoId}\`\n- Transkription, Zusammenfassung oder detaillierte Analyse eines Videos gefragt ist\n- Tasks: \`transcribe\` (Wort für Wort), \`summarize\` (Zusammenfassung), \`analyze\` (detailliert)`

export const TTS_INSTRUCTIONS = `## Text-to-Speech (\`text_to_speech\`)\nWandle Text in gesprochenes Audio um. Nutze es wenn:\n- Der User Text vorgelesen haben will\n- Ein Podcast-Intro, Voiceover oder Sprachausgabe gewünscht ist\n- Für Dialoge: Nutze das \`speakers\` Feld mit genau 2 Sprechern und verschiedenen Stimmen\n- Stimmen: Kore (warm weiblich, Standard), Puck (energisch männlich), Charon (tief männlich), Zephyr (hell weiblich), Aoede, Fenrir, Leda, Orus\n- Maximal 5000 Zeichen pro Anfrage`

/**
 * Web tools instructions. Includes optional google_search differentiation.
 */
export function buildWebToolsInstructions(googleSearchEnabled: boolean): string {
  return `## Web-Tools\n\nDu hast zwei Web-Tools zur Verfügung:\n- **web_search**: Suche im Web nach aktuellen Informationen.\n- **web_fetch**: Rufe den Inhalt einer URL ab und lies ihn als Markdown.\n\nWenn der User eine URL teilt, nutze web_fetch um den Inhalt zu lesen. Wenn der User nach aktuellen Informationen fragt, nutze web_search.${googleSearchEnabled ? `\n\n**Abgrenzung web_search vs. google_search:**\n- \`web_search\`: Breite Recherche, domainspezifische Suchen, wenn du Rohdaten brauchst oder ganze Seiten lesen willst (mit web_fetch). Gut fuer Artifacts mit Quellenverzeichnis.\n- \`google_search\`: Schnelle Faktenantworten mit automatischen Quellenangaben direkt im Chat. Bevorzuge google_search fuer Faktencheck, aktuelle Ereignisse und quellenbasierte Schnellantworten.` : ""}`
}

export const GOOGLE_SEARCH_INSTRUCTIONS = `## Google Search (\`google_search\`)\nSchnelle Websuche ueber Google mit automatischen Quellenangaben. Nutze es wenn:\n- Der User Fakten pruefen will oder aktuelle Informationen braucht\n- Quellenangaben wichtig sind (die Quellen werden automatisch mitgeliefert)\n- Eine schnelle, praegnante Antwort mit Belegen gefragt ist\n- Der User explizit nach Google oder aktuellen Informationen fragt\n\nDie Antwort wird direkt im Chat angezeigt — erstelle KEIN Artifact fuer google_search Ergebnisse.\nFuer ausfuehrliche Recherche mit ganzen Seiten nutze stattdessen web_search + web_fetch.`

/**
 * MCP tools instructions. Takes tool names to build the tool list.
 */
export function buildMcpToolsInstructions(toolNames: string[]): string {
  const toolList = toolNames.map((name) => `- \`${name}\``).join("\n")
  return `## Externe Tools\n\nDu hast zusätzliche externe Tools zur Verfügung:\n${toolList}\n\nNutze diese Tools wenn die Anfrage des Nutzers davon profitiert.`
}

/**
 * Design (Stitch) instructions. Only included when features.stitch.enabled.
 */
export const DESIGN_INSTRUCTIONS = `### UI-Design-Generierung (\`generate_design\` / \`edit_design\`)
Wenn verfügbar, nutze \`generate_design\` statt \`create_artifact\` für visuelle UI-Designs:
- **Nutze \`generate_design\` für:** Landing Pages, Dashboards, App-Screens, Settings-Seiten, Portfolio-Websites, jedes visuelle UI-Layout
- **Nutze \`create_artifact\` für:** Code-Snippets, einfache HTML-Bausteine, Markdown-Dokumente, nicht-visuellen Output
- **Iteration:** Wenn der User ein generiertes Design anpassen will, nutze \`edit_design\` mit der artifactId des bestehenden Designs
- Schreibe Prompts auf Englisch für beste Ergebnisse
- Generierung dauert 10-30 Sekunden — weise den User kurz darauf hin`
