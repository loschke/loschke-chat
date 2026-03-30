---
name: linkedin-post-factory
description: "Erstellt LinkedIn-Posts für loschke.ai aus laufenden Gesprächen (Capture-Modus) oder plant Content voraus (Planungs-Modus). Enthält Hook-Patterns, Voice-Guidelines und Asset-Empfehlungen. Funktioniert ohne Brainsidian."
---

# LinkedIn Post Factory

Skill für LinkedIn-Content auf dem loschke.ai-Kanal. Zwei Modi: Capture (aus Gespräch) und Planung (Vorproduktion).

## Trigger

**Capture-Modus:**
- "Mach daraus einen LinkedIn-Post"
- "Das wäre ein guter Post"
- "LinkedIn-Post zu dem, was wir gerade besprochen haben"
- "Kannst du das als Post aufbereiten?"

**Planungs-Modus:**
- "Lass uns LinkedIn-Content vorproduzieren"
- "Ich will Posts vorproduzieren"
- "Content-Planung für LinkedIn"
- "Lass uns eine Post-Queue aufbauen"

---

## Modus 1: Capture

Aus laufendem Gespräch einen Post erstellen.

### Prozess

1. **Kern identifizieren** – Was ist die eine Erkenntnis, der eine Twist?
2. **Hook wählen** – Pattern aus der Liste unten anwenden
3. **Post schreiben** – Struktur einhalten
4. **Asset empfehlen** – Entscheidungslogik nutzen

### Output

```
HOOK: [2 Zeilen max]

BODY: [Kern-Content, 150-300 Wörter]

CTA: [Frage oder Aufforderung]

---
Asset-Empfehlung: [Plain Text / Carousel / Statement-Bild / Whiteboard]
Begründung: [Warum dieses Format]
```

---

## Modus 2: Planung

Content-Queue aufbauen für Vorproduktion.

### Prozess

1. **Zeitraum klären** – Wie viele Wochen? (Default: 2 Wochen = 6 Posts)
2. **Themen sammeln** – Aus Brainsidian, aus Gespräch, aus Rico's Input
3. **Mix prüfen** – 50% Reflexion, 30% Workflow, 20% Personal
4. **Post-Konzepte erstellen** – Für jeden Post:

```
POST [X]:
Thema: [...]
Hook-Ansatz: [Pattern-Name + konkrete Hook-Idee]
Kernaussage: [1 Satz]
Asset: [Plain Text / Carousel / Statement / Whiteboard]
Priorität: [Hoch / Mittel]
```

5. **Bei Freigabe** – Posts einzeln ausarbeiten

---

## Hook-Patterns

### Pattern 1: "Ich lag falsch"

**Energie:** Selbstkritik → Erkenntnis
**Frequenz:** Regelmäßig, aber max 1-2 pro Woche

**Warum es funktioniert:** Sofortiger Spannungsbogen. Zeigt Reflexion statt Belehrung.

**Struktur:**
```
Ich dachte [Annahme].
[Kurzer Kontext]
War falsch.
[Auflösung]
```

**Beispiele:**
- "Ich dachte, ich verstehe KI." → 9.000 Impressions
- "Ich dachte, wer die Tools kennt, ist vorne."
- "Ich war überzeugt, dass gute Prompts reichen."

**Variationen:**
- "Lange Zeit hab ich geglaubt..."
- "Mein größter Irrtum bei X..."
- "Was ich über X dachte – und warum ich falsch lag"

---

### Pattern 2: "Das hat funktioniert"

**Energie:** Erfolg → Teilen (positiv, ermutigend)
**Frequenz:** Regelmäßig

**Warum es funktioniert:** Menschen wollen wissen, was klappt. Nicht nur Fehler, auch Siege teilen.

**Struktur:**
```
Ich hab [X] ausprobiert.
[Kontext: Warum, Ausgangslage]
Es hat funktioniert.
[Was sich verändert hat, konkretes Ergebnis]
```

**Beispiele:**
- "Ich hab angefangen, mein Wissen aufzuschreiben. Nicht für die KI. Für mich. Die KI profitiert nur davon." → 6.500 Impressions
- "Ich hab meine Seminar-Vorbereitung komplett umgestellt. 4 Stunden statt 2 Tage."
- "Ein simpler Workflow hat meine Content-Produktion verdreifacht."

**Variationen:**
- "Das hat bei mir funktioniert..."
- "Seit ich X mache, ist Y anders."
- "Eine Änderung, die geblieben ist..."

---

### Pattern 3: "Eine Sache hat alles verändert"

**Energie:** Discovery → Empowerment (Aha-Moment teilen)
**Frequenz:** Regelmäßig

**Warum es funktioniert:** Fokus auf EINE Erkenntnis. Leicht zu merken, leicht zu teilen.

**Struktur:**
```
[Situation/Problem]
[Die eine Sache, die den Unterschied gemacht hat]
[Warum das alles verändert hat]
```

**Beispiele:**
- "Irgendwann hab ich's kapiert: Die KI ist nicht das Problem. Ich kann ihr keinen Kontext geben, den ich selbst nicht habe."
- "Eine Frage hat in meinen Workshops alles verändert: 'Was ist deine Kassette?'"
- "Der Unterschied zwischen okay und gut war nicht der Prompt. Es war eine Zeile Kontext."

**Variationen:**
- "Die eine Sache, die X verändert hat..."
- "Irgendwann hab ich's kapiert..."
- "Was den Unterschied gemacht hat, war nicht X – es war Y."

---

### Pattern 4: "Szene öffnen"

**Energie:** Konkret → Immersiv (Leser ist sofort IN der Situation)
**Frequenz:** Regelmäßig, guter Default für viele Themen

**Warum es funktioniert:** Konkret statt abstrakt. Leser ist sofort IN einer Situation.

**Struktur:**
```
[Zeitmarker] + [konkrete Situation]
[Was passiert ist]
[Twist oder Erkenntnis]
```

**Beispiele:**
- "Vor einem Jahr sah mein KI-Workflow so aus: Neuer Chat. Erklären, wer ich bin..." → 6.500 Impressions
- "Ich hab letzte Woche zwei Gespräche geführt – eins mit einer Agentur, eins mit einem Handwerker."
- "Jedes zweite Gespräch mit Geschäftsführern endet bei ROI. Ich hab aufgehört, eine Zahl zu nennen."

---

### Pattern 5: "Der weinende Controller"

**Energie:** Emotion + Überraschung → Neugier
**Frequenz:** Gelegentlich (braucht echte Story)

**Warum es funktioniert:** Widerspricht Erwartung. Emotionale Reaktion einer anderen Person ist glaubwürdiger als eigene.

**Struktur:**
```
[Unerwartete emotionale Reaktion]
[Kontext: Warum überraschend?]
[Auflösung]
```

**Beispiele:**
- "Ich hab letzte Woche einen 50-jährigen Controller weinen sehen. Nicht aus Angst vor KI. Aus Erleichterung."
- "Der skeptischste Teilnehmer im Workshop sagte am Ende..."
- "Die Geschäftsführerin, die KI für Hype hielt, hat mich angerufen."

---

### Pattern 6: "Nostalgie → Twist"

**Energie:** Emotional → Unerwartete Wendung
**Frequenz:** Selten (Abnützungseffekt)

**Warum es funktioniert:** Emotionaler Einstieg, unerwartete Wendung.

**Achtung:** Nostalgie allein reicht nicht. Schnell zum Punkt kommen.

**Struktur:**
```
[Nostalgisches Bild – max 1-2 Sätze, KURZ]
[Schneller Schnitt: "Dann kam X. Hab ich getrauert? Nein."]
[Transfer ins Heute]
```

**Beispiel (verbessert):**
- "Ich war nie Kassetten-Mensch. Ich war Musik-Mensch. Warum fällt uns das bei Excel so viel schwerer zu sehen?"

---

## Anti-Patterns: Was NICHT funktioniert

| ❌ Pattern | Warum es floppt | Beispiel |
|-----------|-----------------|----------|
| These als Einstieg | Kein Spannungsbogen | "Nicht jede Branche braucht den AI-Code-Red." |
| Frage zuerst | Zu generisch | "Wie geht ihr mit KI-ROI um?" |
| Aufzählung als Hook | Kein emotionaler Anker | "Drei Dinge, die du wissen solltest:" |
| Belehrend | Leser fühlt sich nicht gemeint | "Unternehmen sollten verstehen, dass..." |
| Berater-Stimme | Distanziert, austauschbar | "Die häufigste Frage im KI-Gespräch..." |

---

## Das Kernprinzip: Berater → Rico

**Faustregel:** Wenn der erste Satz auch von McKinsey kommen könnte, umschreiben.

| ❌ Berater-Pose | ✅ Rico-Stimme |
|----------------|----------------|
| Distanziert, allgemeingültig | Persönlich, situiert |
| "Man sollte..." | "Ich hab gesehen..." |
| These zuerst | Szene zuerst |
| Erklärt | Erzählt |
| "Unternehmen müssen..." | "In meinem letzten Projekt..." |

**Transformation-Beispiele:**

| ❌ Original | ✅ Rico-Version |
|-------------|-----------------|
| "Nicht jede Branche braucht den AI-Code-Red." | "Ich hab letzte Woche zwei Gespräche geführt – eins mit einer Agentur, eins mit einem Handwerker. Beide fragten das Gleiche. Meine Antworten waren komplett unterschiedlich." |
| "Was spare ich damit? Die häufigste Frage." | "Jedes zweite Gespräch mit Geschäftsführern endet bei ROI. Ich hab aufgehört, eine Zahl zu nennen. Hier ist warum." |
| "Context Engineering ist wichtiger als Prompts." | "Ich dachte, gute Prompts reichen. Dann hab ich verstanden: Der Prompt ist 20%. Der Kontext ist 80%." |

---

## Post-Struktur

```
[HOOK – 1-2 Zeilen, Spannungsbogen öffnen]

[KONTEXT – 2-3 Sätze, Situation etablieren]

⎯⎯⎯

[KERN – Hauptaussage, Erkenntnis, Twist]
[Optional: Aufzählung mit → statt Bullets]

⎯⎯⎯

[AUFLÖSUNG – Was das bedeutet, Payoff]

💬 [CTA – Frage, die Engagement erzeugt]

—
[SIGNATUR – nur bei Bedarf]
Hi, ich bin Rico. Ich beschäftige mich mit KI. Wie sie funktioniert, wie sie Arbeit verändert, und wie wir damit umgehen. Hier teile ich, was ich lerne.
```

**Länge:** 150-400 Wörter. Kürzer bei reiner Reflexion, länger bei Workflow-Posts.

---

## Asset-Entscheidung

| Situation | Asset | Warum |
|-----------|-------|-------|
| Reflexion, "Ich lag falsch", persönliche Erkenntnis | **Plain Text** | Top-Performer. Authentizität braucht kein Bild. |
| Workflow, Prozess, Vorher/Nachher mit Schritten | **Carousel** | Schritte brauchen Visualisierung. → carousel-factory |
| Eine zentrale These, zitat-würdig | **Statement-Bild** | Verstärkt die eine Aussage. |
| Framework, Vergleich, Matrix | **Whiteboard** | Komplexität braucht Struktur. → whiteboard-factory |
| Building in Public, persönlicher Meilenstein | **Foto oder Plain Text** | Authentizität > Design |

**Performance-Daten (Rico's Account):**
- Plain Text + Reflexion = 9.000 (Top)
- Carousel + Workflow = 6.500
- Statement-Bild + B2B-These = 200 (Flop)

---

## Content-Kategorien & Mix

### Die 6 Kategorien

| Kategorie | Energie | Frequenz |
|-----------|---------|----------|
| **"Ich lag falsch"** | Selbstkritik → Erkenntnis | Regelmäßig |
| **"Das hat funktioniert"** | Erfolg → Teilen | Regelmäßig |
| **"Eine Sache hat alles verändert"** | Discovery → Empowerment | Regelmäßig |
| **Workflow / How-I-do-it** | Praktisch → Nützlich | Regelmäßig |
| **Building in Public** | Transparent → Verbindung | Gelegentlich |
| **Persönlich / Privat** | Emotion → Tiefe | Selten |

### Empfohlener Mix (pro 2 Wochen / 6 Posts)

| Typ | Anzahl | Beschreibung |
|-----|--------|--------------|
| **Reflexion-Patterns** | 3 | Mix aus "Ich lag falsch", "Das hat funktioniert", "Eine Sache" |
| **Workflow** | 1-2 | Konkrete Prozesse, Tools, Setups |
| **Building in Public** | 1 | Selbständigkeit, Projekte, Learnings |
| **Persönlich** | 0-1 | Emotionen, Erlebnisse, Ziele, Dein Warum – nicht jede Woche |

### Balance-Prinzip

**Nicht zu viel vom Gleichen:**
- Max 2x "Ich lag falsch" pro Woche (sonst wirkt es selbstzweiflerisch)
- Reflexion-Posts mit Workflow/Praktischem abwechseln
- Persönliche Posts sind Gewürz, nicht Hauptgericht

**Positiv vs. Kritisch:**
- "Ich lag falsch" = kritische Energie
- "Das hat funktioniert" = positive Energie
- Beide mischen für Balance

**Vermeide:** Mehr als 1 von 5 Posts im "Berater-Modus" (B2B-Thesen ohne persönliche Rahmung).

---

## Unlearn-Themen auf LinkedIn

Unlearn.how-Substanz kann auf loschke.ai funktionieren – aber nur durch die Rico-Linse.

| Thema | ❌ Unlearn-Stimme | ✅ loschke-Stimme |
|-------|-------------------|-------------------|
| KI-ROI | "Die Frage nach dem ROI ist falsch gestellt." | "Jedes zweite Gespräch endet bei ROI. Ich hab aufgehört, Zahlen zu nennen." |
| Transformation | "Organisationen müssen ihre Kultur ändern." | "Ich hab letzte Woche einen Workshop moderiert. 40 Leute. Eine Frage hat alles verändert." |
| Zeitfenster | "Verschiedene Branchen haben verschiedene Dringlichkeiten." | "Zwei Gespräche letzte Woche. Agentur-Gründer vs. Handwerksmeister. Gleiche Frage, komplett andere Antwort." |

---

## Weiterführende Skills

| Ziel | Skill |
|------|-------|
| Carousel erstellen | carousel-factory |
| Whiteboard-Infografik | whiteboard-factory |
| Content-Steckbrief (Brainsidian) | content-factory |

---

## Qualitäts-Check vor Freigabe

- [ ] Erste Zeile: Würde ich weiterlesen?
- [ ] Berater oder Rico? (Persönlich, situiert, nicht generisch)
- [ ] Spannungsbogen vorhanden?
- [ ] Länge angemessen? (Nicht aufgebläht)
- [ ] CTA: Echte Frage, die Antworten provoziert?
- [ ] Asset-Wahl begründet?

---

## Beispiel-Outputs

### Capture-Modus Output:

```
HOOK:
Ich dachte, Context Engineering ist ein Buzzword.
Dann hab ich verstanden, warum meine besten Prompts trotzdem scheiterten.

BODY:
Vor einem Jahr war ich stolz auf meine Prompts. Strukturiert, klar, mit Beispielen.
Die Ergebnisse? Okay. Nicht großartig. Okay.

⎯⎯⎯

Der Unterschied kam, als ich aufgehört habe, am Prompt zu feilen – und angefangen habe, den Kontext zu bauen.

→ Wer bin ich?
→ Woran arbeite ich gerade?
→ Was weiß ich über dieses Thema?

Das klingt banal. Ist es nicht.

⎯⎯⎯

Der Prompt ist die Frage. Der Kontext ist alles, was die KI braucht, um die Frage richtig zu verstehen.

Seitdem erkläre ich nicht mehr. Ich arbeite.

💬 Wie viel Zeit verbringt ihr mit Prompts vs. mit Kontext?

---
Asset-Empfehlung: Plain Text
Begründung: Reflexions-Post, "Ich lag falsch"-Pattern. Authentizität braucht kein Asset.
```

### Planungs-Modus Output:

```
CONTENT-QUEUE: 2 Wochen (6 Posts)

POST 1:
Thema: Context Engineering vs. Prompt Engineering
Hook-Ansatz: "Ich lag falsch" – "Ich dachte, gute Prompts reichen..."
Kernaussage: Der Kontext entscheidet, nicht der Prompt
Asset: Plain Text
Priorität: Hoch

POST 2:
Thema: Was ich über KI-Workshops gelernt habe
Hook-Ansatz: "Szene öffnen" – "40 Leute im Raum. Eine Frage hat alles verändert."
Kernaussage: Die beste Intervention ist oft die einfachste
Asset: Plain Text
Priorität: Hoch

POST 3:
Thema: Mein Obsidian-Setup (Update)
Hook-Ansatz: "Szene öffnen" – "Vor 6 Monaten hab ich angefangen, alles aufzuschreiben..."
Kernaussage: Externalisiertes Wissen = bessere KI-Outputs
Asset: Carousel (Workflow-Schritte)
Priorität: Mittel

[...]
```
