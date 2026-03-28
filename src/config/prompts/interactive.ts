/**
 * Interactive tool instruction sections: Quiz, Review, ContentAlternatives.
 */

export const QUIZ_INSTRUCTIONS = `### Quiz (\`create_quiz\`)
Erstelle interaktive Quizzes um Wissen abzufragen oder Verständnis zu prüfen. Nutze es wenn:
- Der User einen Wissenstest will ("Teste mein Wissen über...")
- Du Verständnis prüfen willst nach einer Erklärung
- Ein Expert Lernfortschritt messen soll
- Fragetypen: \`single_choice\` (eine richtige Antwort), \`multiple_choice\` (mehrere richtige), \`free_text\` (offene Antwort die du nach Abgabe bewertest)
- Schreibe immer eine kurze Einleitung bevor du das Quiz erstellst
- Bei \`correctAnswer\`: Verwende den 0-basierten Index der Option (z.B. 0 für die erste Option)
- Nach der Abgabe bekommst du die Ergebnisse und sollst Feedback geben`

export const CONTENT_ALTERNATIVES_INSTRUCTIONS = `### Varianten (\`content_alternatives\`)
Präsentiere 2-5 inhaltliche Alternativen zur Auswahl. Nutze es wenn:
- Du mehrere Varianten generiert hast (Überschriften, Textversionen, Ansätze)
- Der User zwischen Optionen wählen soll bevor du weiterarbeitest
- Jede Alternative braucht ein kurzes Label und den vollständigen Inhalt als Markdown
- Nutze es NICHT für triviale Ja/Nein-Fragen (dafür \`ask_user\`)`

export const REVIEW_INSTRUCTIONS = `### Review (\`create_review\`)
Erstelle strukturierte Dokumente zur abschnittsweisen Durchsicht. Nutze es wenn:
- Du Konzepte, Strategien, Blog-Entwürfe, Pläne oder andere längere Inhalte erstellst
- Der User die Möglichkeit haben soll, jeden Abschnitt einzeln zu bewerten (Passt / Ändern / Frage / Raus)
- **Struktur:** Schreibe den Inhalt als Markdown mit \`##\` Überschriften — jede \`##\` Sektion wird ein eigener Review-Block
- **Iteration:** Wenn du nach Feedback eine überarbeitete Version erstellst, übergib \`previousFeedback\` mit den genehmigten Abschnitten der Vorrunde. So muss der User nur geänderte/neue Abschnitte erneut bewerten.
- **Bevorzuge \`create_review\` statt \`create_artifact\` (Markdown)** wenn der Inhalt iterativ verbessert werden soll
- **Abschluss:** Wenn alle Abschnitte genehmigt sind, erstelle ein finales \`create_artifact\` (type: markdown) mit dem bereinigten Inhalt. Entferne dabei Abschnitte die als "Raus" markiert waren. Das finale Artifact hat Copy/Download/Edit — das Review-Artifact bleibt als Prozess-Dokumentation im Chat.
- Nutze \`create_artifact\` nur für finale Dokumente die keiner Durchsicht bedürfen`
