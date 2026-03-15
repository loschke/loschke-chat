# Tool-Erweiterungen — Spezifikation v2

> Neue Tools für die AI-Chat-Plattform, abgeleitet aus konkreten Lücken beim Lernbegleiter-Expert.
> Alle Tools sind generisch gehalten — sie sollen für jeden Expert nutzbar sein.
> Memory-bezogene Funktionalität basiert auf der Mem0-Integration (siehe `prd-memory-system.md`).

---

## 1. `create_quiz`

### Problem

`ask_user` kann maximal 3 Fragen pro Call, nur simple Typen (single_select, multi_select, free_text), und hat kein Feedback-Konzept. Für Wissensabfragen, Verständnischecks oder Selbsttests reicht das nicht.

Ein HTML-Artifact als Workaround funktioniert, ist aber ein Hack: Das Modell muss jedes Mal das komplette Quiz als HTML generieren, inklusive Auswertungslogik. Das ist fehleranfällig, teuer (Token), und das Ergebnis fließt nicht in den Chat zurück.

### Was das Tool tun soll

Erstellt ein interaktives Quiz im Side-Panel. Der User beantwortet die Fragen, das Tool gibt die Ergebnisse an das Modell zurück. Optional speichert es die Ergebnisse im Memory, damit der Expert in späteren Sessions darauf aufbauen kann.

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
      "explanation": "Das Modell wird nicht 'intelligenter', aber der Rollenkontext beeinflusst, welche Muster es bei der Textgenerierung priorisiert."
    },
    {
      "type": "multiple_choice",
      "question": "Welche Elemente gehören zu einem gut strukturierten Prompt?",
      "options": [
        "Kontext / Hintergrund",
        "Möglichst viele Emojis",
        "Gewünschtes Ausgabeformat",
        "Beispiele (Few-Shot)",
        "Die Aufforderung 'Denk nach'"
      ],
      "correct": [0, 2, 3],
      "explanation": "Kontext, Format und Beispiele sind die drei Kernelemente."
    },
    {
      "type": "free_text",
      "question": "Erkläre in einem Satz, was Few-Shot-Prompting bedeutet.",
      "evaluation_hint": "Der User sollte sinngemäß sagen: Man gibt dem Modell Beispiele im Prompt, damit es das gewünschte Muster erkennt."
    },
    {
      "type": "ordering",
      "question": "Bringe diese Prompt-Elemente in eine sinnvolle Reihenfolge:",
      "items": ["Beispiele", "Rolle/Kontext", "Aufgabe", "Ausgabeformat"],
      "correct_order": [1, 2, 0, 3],
      "explanation": "Erst Kontext setzen, dann Aufgabe, dann Beispiele, dann Format."
    },
    {
      "type": "matching",
      "question": "Ordne die Technik dem passenden Einsatzzweck zu:",
      "left": ["Zero-Shot", "Few-Shot", "Chain-of-Thought"],
      "right": ["Einfache, eindeutige Aufgaben", "Mustererkennung durch Beispiele", "Komplexe Reasoning-Aufgaben"],
      "correct_pairs": [[0, 0], [1, 1], [2, 2]]
    }
  ],
  "show_results": true,
  "save_to_memory": true,
  "memory_metadata": {
    "type": "quiz_result",
    "topic": "prompt-engineering",
    "subtopic": "basics"
  }
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

Das Modell bekommt die Ergebnisse zurück und kann gezielt reagieren: "Frage 4 war nicht ganz richtig — warum hast du die Beispiele vor die Aufgabe gesetzt?"

### Memory-Integration

Wenn `save_to_memory: true`, speichert das Tool die Ergebnisse automatisch im Memory:

```json
{
  "memory": "Quiz 'Prompt Engineering Basics': 3/4 automatisch bewertete Fragen korrekt. Schwäche bei Reihenfolge der Prompt-Elemente.",
  "metadata": {
    "type": "quiz_result",
    "topic": "prompt-engineering",
    "subtopic": "basics",
    "score": 0.75,
    "weak_areas": ["prompt-element-ordering"],
    "assessed_at": "2026-03-15"
  }
}
```

Das ermöglicht:
- **Lernbegleiter:** Ruft bei der nächsten Session Quiz-Ergebnisse per `recall_memory` ab und arbeitet gezielt Schwächen nach.
- **Jeder andere Expert:** Kann Quiz-Ergebnisse nutzen, um das Wissensniveau des Users einzuschätzen, ohne nochmal fragen zu müssen.

### Nutzung durch Experts

Jeder Expert kann `create_quiz` nutzen — der SEO-Berater für einen Knowledge-Check, der Content Writer für Zielgruppen-Verständnis, der Analyst für Daten-Interpretations-Fragen. Das Tool ist nicht lernspezifisch.

---

## 2. `generate_exercise`

### Problem

Interaktive Übungen — Text verbessern, Lücken ausfüllen, etwas von Grund auf bauen — müssen aktuell als komplettes HTML-Artifact generiert werden. Das ist aufwändig, fehleranfällig und jede Übung sieht anders aus. Außerdem fließt das Ergebnis nicht in den Chat zurück.

### Was das Tool tun soll

Erstellt eine interaktive Übung im Side-Panel mit einheitlicher UI. Der User bearbeitet die Übung, das Ergebnis geht ans Modell zurück. Optional werden Ergebnisse im Memory gespeichert.

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
  "evaluation_criteria": "Der verbesserte Prompt sollte mindestens enthalten: Zielgruppe, gewünschtes Format, und einen konkreten Anwendungsfall.",
  "save_to_memory": true,
  "memory_metadata": {
    "type": "exercise_result",
    "topic": "prompt-engineering",
    "subtopic": "prompt-improvement",
    "exercise_type": "rewrite"
  }
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
  "user_submission": "Erstelle eine Social-Media-Strategie für ein B2B-SaaS-Startup im HR-Bereich. Fokus auf LinkedIn. Ausgabe als Tabelle mit: Thema, Format, Posting-Frequenz, KPI. Zeitraum: 1 Monat.",
  "time_spent_seconds": 180,
  "hints_used": 2
}
```

Das Modell bewertet die Einreichung anhand der `evaluation_criteria` und gibt personalisiertes Feedback.

### Memory-Integration

Wenn `save_to_memory: true`, speichert das Tool eine Zusammenfassung:

```json
{
  "memory": "Übung 'Prompt verbessern': User hat einen vagen Prompt zu einem strukturierten B2B-Prompt umgebaut. 2 von 3 Hints genutzt. Braucht noch Übung bei eigenständiger Kontextdefinition.",
  "metadata": {
    "type": "exercise_result",
    "topic": "prompt-engineering",
    "subtopic": "prompt-improvement",
    "exercise_type": "rewrite",
    "hints_used": 2,
    "hints_available": 3,
    "completed_at": "2026-03-15"
  }
}
```

Das ermöglicht:
- **Lernbegleiter:** Erkennt über mehrere Sessions hinweg, ob der User bei einem Aufgabentyp besser wird oder ob dieselben Schwächen bleiben.
- **Progressions-Tracking:** Mehrere Übungsergebnisse zum selben Thema zeigen den Lernverlauf.

### Abgrenzung zu `create_quiz`

- **create_quiz** = Wissen *abfragen*. Geschlossene Fragen, automatische Auswertung.
- **generate_exercise** = Fähigkeiten *üben*. Offene Aufgaben, Modell-Bewertung.

---

## 3. Zusammenspiel der Tools mit Memory

### Der vollständige Loop am Beispiel Lernbegleiter

```
Session 1:
  1. Quicktask "Lernsession starten" → Thema, Vorwissen, Ziel
  2. Expert erklärt Few-Shot-Prompting (sokratisch)
  3. Expert nutzt create_quiz → Verständnischeck
     → Ergebnis: 3/4 korrekt, Schwäche bei Reihenfolge
     → Automatisch im Memory gespeichert (quiz_result)
  4. Expert nutzt generate_exercise → "Verbessere diesen Prompt"
     → Ergebnis: Guter Ansatz, braucht Übung bei Kontext
     → Automatisch im Memory gespeichert (exercise_result)
  5. Expert fasst zusammen, erstellt Cheat Sheet als Artifact
  6. Automatische Mem0-Extraktion nach Chat-Ende:
     → "User lernt Prompt Engineering"
     → "Versteht Few-Shot, Schwäche bei Prompt-Strukturierung"

Session 2 (Tage später):
  1. Memory-Injektion bei Session-Start:
     → Allgemein: "User lernt Prompt Engineering"
     → Quiz: score 0.75, Schwäche bei Ordering
     → Übung: braucht Übung bei Kontextdefinition
  2. Expert knüpft an: "Letztes Mal hatten wir bei der Reihenfolge 
     von Prompt-Elementen einen Knackpunkt. Lass uns da nochmal ran."
  3. Gezielte Übung zur Schwäche
  4. Neuer Quiz → Fortschritt messbar

Zwischendurch, anderer Expert:
  Content Writer sieht im Memory: "User lernt Prompt Engineering"
  → Schlägt vor: "Du könntest einen LinkedIn-Post über deine 
     Erfahrungen beim Prompt-Engineering-Lernen schreiben."
```

### Memory-Metadaten-Konvention

Damit die Tools und der automatische Memory-Layer gut zusammenspielen, eine einfache Konvention für `metadata.type`:

| type | Quelle | Beschreibung |
|------|--------|-------------|
| `quiz_result` | `create_quiz` | Ergebnis eines Quiz mit Score und Schwächen |
| `exercise_result` | `generate_exercise` | Ergebnis einer Übung mit Modell-Bewertung |
| `skill_assessment` | `save_memory` (Expert) | Explizite Einschätzung durch den Expert |
| `user_preference` | Automatisch (Mem0) | Extrahierte Präferenz oder Kontext |
| `project_context` | `save_memory` (Expert) | Projektbezogene Information |

Experts und Tools können eigene Typen definieren. Die Konvention ist nicht erzwungen, sondern eine Empfehlung für konsistentes Filtering.

---

## 4. Priorisierung

| Tool | Impact | Aufwand | Abhängigkeit | Empfehlung |
|------|--------|---------|-------------|------------|
| Memory (Mem0) | Hoch — Fundament für alles andere | Mittel | Keine | **Phase 1** |
| `create_quiz` | Hoch — sofort nützlich, Memory-ready | Mittel | Memory für `save_to_memory` | **Phase 1** |
| `generate_exercise` | Mittel — primär Lernszenarien | Hoch | Memory für `save_to_memory` | **Phase 2** |

**Phase 1** liefert: Memory-Integration + Quiz-Tool. Damit hat der Lernbegleiter bereits den vollständigen Loop: Erklären → Prüfen → Merken → Nächste Session aufbauen.

**Phase 2** ergänzt: Übungs-Tool für offene Aufgaben. Der Lernbegleiter kann dann nicht nur Wissen abfragen, sondern Können üben.

Beide Tools funktionieren auch ohne Memory (einfach `save_to_memory: false` oder weglassen). Die Memory-Integration ist ein Bonus, keine Voraussetzung.

---

## 5. Offene Fragen

1. **Rückkanal:** Wie kommen Quiz-/Übungsergebnisse technisch zurück ans Modell? Als Tool-Result im nächsten Turn? Als automatische System-Message?

2. **Rendering:** Werden die Tools als eigene UI-Komponenten gerendert (wie `ask_user`), oder als spezialisierte Artifact-Typen im Side-Panel? 

3. **Memory-Schreibrecht der Tools:** Sollen `create_quiz` und `generate_exercise` direkt ins Memory schreiben, oder soll das Modell die Ergebnisse bekommen und dann selbst entscheiden, was es via `save_memory` speichert? Direkt ist einfacher, über das Modell ist flexibler.

4. **Quiz-Komplexität Phase 1:** Reichen für den MVP `single_choice` und `free_text`? Ordering und Matching sind aufwändige UI-Komponenten. Könnte man die für Phase 2 aufheben.

5. **Exercise-Bewertung:** Das Modell bewertet freie Übungen anhand von `evaluation_criteria`. Wie robust ist das? Braucht es ein separates Bewertungs-Prompt-Template, oder reicht die Criteria-Beschreibung als Freitext?
