---
name: Erklär-Methodik
slug: erklaer-methodik
description: Erklärt beliebige Themen verständlich — angepasst an Alter, Vorwissen und Lernziel.
mode: skill
---

## Vorgehen: Thema erklären

### Schritt 1: Kontext klären

Nutze `ask_user` mit konkreten Optionen:
- Was ist das Thema? (Freitext)
- Für welchen Zweck? (Radio: Schulaufgabe / Studium / Persönliches Interesse / Jemandem erklären können)
- Wie viel weißt du schon? (Radio: Gar nichts / Grundlagen / Einiges, aber Lücken / Viel, will vertiefen)

### Schritt 2: Einstieg finden

Je nach Vorwissen:
- **Gar nichts:** Starte mit einer Alltagsanalogie. Nicht mit der Definition. "Stell dir vor..." ist besser als "X ist definiert als...".
- **Grundlagen:** Baue auf dem auf was da ist. Frage kurz ab was bekannt ist, dann erweitere.
- **Lücken füllen:** Identifiziere die konkreten Lücken und adressiere sie gezielt.
- **Vertiefen:** Gehe in Nuancen, Ausnahmen, Zusammenhänge mit anderen Konzepten.

### Schritt 3: Erklären

Regeln für gute Erklärungen:
- **Ein Konzept pro Absatz.** Nicht alles auf einmal.
- **Beispiele vor Theorie.** Erst das Konkrete, dann das Abstrakte.
- **Fachbegriffe einführen, nicht voraussetzen.** Beim ersten Auftreten kurz erklären.
- **Verbindungen herstellen.** "Das kennst du schon von..." oder "Das ist ähnlich wie..."
- Nutze `create_artifact` (html) für visuelle Erklärungen: Schaubilder, Zeitleisten, Vergleichstabellen.
- Nutze `content_alternatives` wenn ein Konzept über verschiedene Zugänge erklärt werden kann (z.B. mathematisch vs. intuitiv, historisch vs. systematisch).

### Schritt 4: Verständnis prüfen

- Frage aktiv: "Soll ich das anders erklären?" oder "Was ist noch unklar?"
- Biete einen kurzen Test an mit `create_quiz` (3-5 Fragen, niedrige Schwelle).
- Oder nutze die Sokratische Methode: Stelle eine Frage die zeigt ob das Konzept verstanden wurde.

### Schritt 5: Zusammenfassung

- Erstelle eine kompakte Zusammenfassung als `create_artifact` (markdown).
- Auf Wunsch: Weiterführende Themen vorschlagen, Quellen nennen.

## Adaptionsregeln

| Zielgruppe | Sprache | Beispiele | Tiefe |
|---|---|---|---|
| Mittelstufe (Klasse 7-10) | Einfach, kurze Sätze, kein Fachjargon | Alltag, Spiele, Social Media | Grundkonzepte, keine Ausnahmen |
| Oberstufe / Ausbildung | Normal, Fachbegriffe mit Erklärung | Alltagsnah aber präziser | Konzepte + wichtige Details |
| Studium | Fachsprache ok, präzise | Fachliche Beispiele | Tiefe + Zusammenhänge + Grenzen |
| Allgemeinbildung (Erwachsene) | Klar, respektvoll, nicht belehrend | Lebenswelt, Nachrichten | So tief wie gewünscht, flexibel |
