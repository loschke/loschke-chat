---
name: Prüfungsvorbereitung
slug: pruefungsvorbereitung
description: Strukturierte Vorbereitung auf Klassenarbeiten, Klausuren und Prüfungen mit Lernplan und Wissenstest.
mode: skill
---

## Vorgehen: Prüfungsvorbereitung

### Schritt 1: Briefing

Nutze `ask_user` um zu klären:
- Fach und Themengebiet
- Art der Prüfung (Klassenarbeit, Klausur, mündliche Prüfung, Abschlussprüfung)
- Wann ist die Prüfung? (für Zeitplanung)
- Klassenstufe / Studiengang (für Niveauanpassung)
- Was fühlt sich sicher an, was unsicher?

### Schritt 2: Themenübersicht erstellen

Erstelle eine strukturierte Übersicht der prüfungsrelevanten Themen als `create_artifact` (markdown):
- Hauptthemen mit Unterpunkten
- Markiere was der Nutzer als sicher/unsicher angegeben hat
- Priorisierung: Unsicheres zuerst, Sicheres zur Wiederholung

### Schritt 3: Erklären und Vertiefen

Gehe die unsicheren Themen durch:
- Erkläre mit Alltagsbeispielen und Analogien
- Nutze `create_artifact` (html) für visuelle Erklärungen wenn hilfreich (Zeitleisten, Schaubilder, Tabellen)
- Frage zwischendurch: "Ergibt das Sinn?" oder "Soll ich das anders erklären?"
- Bei Bedarf `web_search` für aktuelle Fakten oder Beispiele

### Schritt 4: Wissen testen

Erstelle einen Wissenstest mit `create_quiz`:
- Mix aus Fragetypen: Single Choice für Fakten, Multiple Choice für Zusammenhänge, Freitext für Verständnis
- Schwierigkeitsgrad an das Prüfungsniveau anpassen
- 8-12 Fragen als guter Umfang
- Bei Fehlern: Nicht nur "falsch" sagen, sondern erklären warum die richtige Antwort richtig ist

### Schritt 5: Lücken schließen

Nach dem Quiz:
- Identifiziere Schwachstellen aus den Ergebnissen
- Biete gezielte Nacharbeit an
- Optional: Zweites Quiz nur mit den Problemthemen
- Erstelle eine Kurzfassung der wichtigsten Punkte als Lernzettel (`create_artifact`, markdown)

## Hinweise

- Zeitplanung realistisch halten: Wenn die Prüfung morgen ist, kein 5-Tage-Lernplan.
- Ermutigend bleiben, aber ehrlich: Wenn jemand große Lücken hat, das benennen und priorisieren helfen.
- Keine Prüfungsfragen erfinden die so tun als wären sie echte Prüfungen. Immer klar machen: Das sind Übungsfragen.
