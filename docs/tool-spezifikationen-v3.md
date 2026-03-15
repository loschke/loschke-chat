# Tool-Erweiterungen — Spezifikation v3

> Neue Tools für die AI-Chat-Plattform. Jedes Tool macht eine Sache gut.
> Memory ist ein separates Plattform-Feature (siehe `prd-memory-system.md`) — 
> diese Tools haben keine eingebaute Memory-Logik.

---

## 1. `create_quiz`

### Problem

`ask_user` kann maximal 3 Fragen pro Call, nur simple Typen (single_select, multi_select, free_text), und hat kein Feedback-Konzept. Für Wissensabfragen und Verständnischecks reicht das nicht.

Ein HTML-Artifact als Workaround ist fehleranfällig, teuer (Token), und das Ergebnis fließt nicht in den Chat zurück.

### Was das Tool tun soll

Erstellt ein interaktives Quiz im Side-Panel. Der User beantwortet die Fragen, das Tool gibt die Ergebnisse an das Modell zurück, damit der Expert darauf reagieren kann.

### Vorgeschlagene Parameter

```json
{
  "title": "Verständnischeck: Prompt Engineering Basics",
  "questions": [
    {
      "type": "single_choice",
      "question": "Was passiert, wenn du einem LLM eine Rolle gibst?",
      "options": [
        "Es wird intelligenter",
        "Es aktiviert einen spezialisierten Modus",
        "Es richtet seinen Antwort-Stil und Fokus am Rollenkontext aus",
        "Es hat keinen Effekt"
      ],
      "correct": 2,
      "explanation": "Der Rollenkontext beeinflusst, welche Muster das Modell bei der Textgenerierung priorisiert."
    },
    {
      "type": "multiple_choice",
      "question": "Welche Elemente gehören zu einem gut strukturierten Prompt?",
      "options": [
        "Kontext / Hintergrund",
        "Möglichst viele Emojis",
        "Gewünschtes Ausgabeformat",
        "Beispiele (Few-Shot)"
      ],
      "correct": [0, 2, 3],
      "explanation": "Kontext, Format und Beispiele sind die drei Kernelemente."
    },
    {
      "type": "free_text",
      "question": "Erkläre in einem Satz, was Few-Shot-Prompting bedeutet.",
      "evaluation_hint": "Sinngemäß: Man gibt dem Modell Beispiele im Prompt, damit es das gewünschte Muster erkennt."
    },
    {
      "type": "ordering",
      "question": "Bringe diese Prompt-Elemente in eine sinnvolle Reihenfolge:",
      "items": ["Beispiele", "Rolle/Kontext", "Aufgabe", "Ausgabeformat"],
      "correct_order": [1, 2, 0, 3],
      "explanation": "Erst Kontext, dann Aufgabe, dann Beispiele, dann Format."
    },
    {
      "type": "matching",
      "question": "Ordne die Technik dem passenden Einsatzzweck zu:",
      "left": ["Zero-Shot", "Few-Shot", "Chain-of-Thought"],
      "right": ["Einfache Aufgaben", "Mustererkennung durch Beispiele", "Komplexe Reasoning-Aufgaben"],
      "correct_pairs": [[0, 0], [1, 1], [2, 2]]
    }
  ],
  "show_results": true
}
```

### Fragetypen

| Typ | Beschreibung | Auswertung |
|-----|-------------|-----------|
| `single_choice` | Eine richtige Antwort aus n Optionen | Automatisch |
| `multiple_choice` | Mehrere richtige Antworten | Automatisch |
| `free_text` | Offene Antwort | Durch das Modell (via `evaluation_hint`) |
| `ordering` | Elemente in die richtige Reihenfolge bringen | Automatisch |
| `matching` | Paare zuordnen (Drag & Drop) | Automatisch |

### Rückgabe an das Modell

```json
{
  "total_questions": 5,
  "auto_graded": 4,
  "correct": 3,
  "incorrect": 1,
  "pending_review": 1,
  "details": [
    { "question": 1, "type": "single_choice", "correct": true },
    { "question": 2, "type": "multiple_choice", "correct": true },
    { "question": 3, "type": "free_text", "user_answer": "Wenn man dem Modell Beispiele gibt, damit es versteht was man will", "needs_review": true },
    { "question": 4, "type": "ordering", "correct": false, "user_order": [1, 0, 2, 3] },
    { "question": 5, "type": "matching", "correct": true }
  ]
}
```

Der Expert bekommt die Ergebnisse und reagiert darauf im Chat. Was davon erinnerungswürdig ist, extrahiert Mem0 automatisch aus der Konversation — das Tool muss sich darum nicht kümmern.

### Nutzung durch Experts

Jeder Expert kann `create_quiz` nutzen. Der SEO-Berater für einen Knowledge-Check, der Lernbegleiter für Verständnistests, der Analyst für Daten-Interpretations-Fragen.

---

## 2. `generate_exercise`

### Problem

Interaktive Übungen — Text verbessern, Lücken ausfüllen, etwas von Grund auf bauen — müssen aktuell als komplettes HTML-Artifact generiert werden. Das ist aufwändig, fehleranfällig und das Ergebnis fließt nicht in den Chat zurück.

### Was das Tool tun soll

Erstellt eine interaktive Übung im Side-Panel. Der User bearbeitet die Übung, das Ergebnis geht ans Modell zurück, damit der Expert Feedback geben kann.

### Vorgeschlagene Parameter

```json
{
  "title": "Übung: Prompt verbessern",
  "type": "rewrite",
  "instruction": "Dieser Prompt liefert ungenaue Ergebnisse. Verbessere ihn so, dass er zuverlässig eine strukturierte Antwort liefert.",
  "initial_content": "Schreib mir was über Marketing.",
  "hints": [
    "Denk an Kontext: Für wen ist der Marketing-Text?",
    "Was genau soll das Ergebnis sein?",
    "Welches Format soll die Antwort haben?"
  ],
  "evaluation_criteria": "Der verbesserte Prompt sollte mindestens enthalten: Zielgruppe, gewünschtes Format, und einen konkreten Anwendungsfall."
}
```

### Übungstypen

| Typ | Beschreibung | Beispiel |
|-----|-------------|---------|
| `rewrite` | Text verbessern oder umschreiben | Prompt verbessern, Code refactoren |
| `fill_gaps` | Lücken in einem Text/Code ausfüllen | Fehlende Prompt-Elemente ergänzen |
| `build` | Etwas von Grund auf erstellen | "Schreibe einen Prompt für..." |
| `analyze` | Gegebenes Material bewerten | "Was ist an diesem Prompt problematisch?" |
| `compare` | Zwei Varianten vergleichen | "Welcher Prompt ist besser und warum?" |

### Rückgabe an das Modell

```json
{
  "exercise_type": "rewrite",
  "user_submission": "Erstelle eine Social-Media-Strategie für ein B2B-SaaS-Startup im HR-Bereich. Fokus auf LinkedIn. Ausgabe als Tabelle mit: Thema, Format, Posting-Frequenz, KPI.",
  "time_spent_seconds": 180,
  "hints_used": 2
}
```

Der Expert bewertet die Einreichung anhand der `evaluation_criteria` und gibt Feedback. Auch hier: Was Memory-relevant ist, extrahiert Mem0 aus dem Chat-Verlauf.

### Abgrenzung zu `create_quiz`

- **create_quiz** = Wissen *abfragen*. Geschlossene Fragen, automatische Auswertung.
- **generate_exercise** = Fähigkeiten *üben*. Offene Aufgaben, Modell-Bewertung.

---

## 3. Priorisierung

| Tool | Impact | Aufwand | Empfehlung |
|------|--------|---------|------------|
| `create_quiz` | Hoch — nützlich für jeden Expert | Mittel — UI-Komponente + Rückkanal | **Phase 1** |
| `generate_exercise` | Mittel — primär Lernszenarien | Hoch — mehrere Übungstypen, Custom-UI | **Phase 2** |

Beide Tools funktionieren unabhängig vom Memory-System. Memory ist ein separates Feature, das parallel oder nacheinander gebaut werden kann.

---

## 4. Offene Fragen

1. **Rückkanal:** Wie kommen die Ergebnisse technisch zurück ans Modell? Als Tool-Result im nächsten Turn? Als automatische System-Message?

2. **Rendering:** Eigene UI-Komponente (wie `ask_user`) oder spezialisierter Artifact-Typ im Side-Panel?

3. **Quiz-Scope Phase 1:** Reichen `single_choice` und `free_text` für den MVP? `ordering` und `matching` sind aufwändige UI-Komponenten, die man in Phase 2 nachziehen könnte.

4. **Exercise-Bewertung:** Das Modell bewertet freie Übungen anhand von `evaluation_criteria`. Reicht eine Freitext-Beschreibung, oder braucht es ein strukturiertes Bewertungs-Template?
