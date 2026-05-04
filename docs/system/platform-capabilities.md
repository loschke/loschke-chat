# Plattform-Capabilities: Was die KI-Chat-Plattform kann

Übersicht aller Fähigkeiten aus Nutzer-Perspektive. Grundlage für Landingpage-Texte, Feature-Listen und Vorteilsargumentation.

---

## Was Nutzer mit der Plattform tun können

### Frei chatten

Offene Konversation mit KI. Keine Vorkenntnisse nötig. Die Plattform wählt automatisch das passende Modell, lädt relevanten Kontext und stellt die richtigen Werkzeuge bereit.

**Anwendungsfälle:**

- Fragen stellen und Erklärungen bekommen
- Texte schreiben, überarbeiten, kürzen
- Ideen entwickeln und strukturieren
- Code schreiben, debuggen, reviewen
- Daten analysieren und visualisieren
- Bilder generieren und iterieren

### Mit Experten arbeiten

7 spezialisierte KI-Experten mit unterschiedlichen Stärken. Jeder Expert ändert wie die KI denkt, schreibt und welche Werkzeuge sie bevorzugt.

| Expert              | Stärke                     | Typische Aufgabe                                      |
| ------------------- | --------------------------- | ----------------------------------------------------- |
| **Allgemein**       | Vielseitig, passt sich an   | "Erklär mir..." / "Hilf mir bei..."                  |
| **Code-Assistent**  | Präzise, strukturiert      | "Schreib eine Funktion die..." / "Review diesen Code" |
| **SEO-Berater**     | Datengetrieben, priorisiert | "Analysiere die SEO meiner Seite"                     |
| **Daten-Analyst**   | Quantifiziert, visualisiert | "Werte diese Zahlen aus" / "Erstelle ein Dashboard"   |
| **Researcher**      | Gründlich, quellenbasiert  | "Recherchiere den Markt für..."                      |
| **Content Writer**  | Kreativ, kein KI-Sprech     | "Schreib einen Blogpost über..."                     |
| **Visual Designer** | Bildkonzeption, Iteration   | "Erstelle ein Headerbild für..."                     |

**Was im Hintergrund passiert:** Jeder Expert bringt eigene Persönlichkeit, Temperatur (kreativ vs. präzise), bevorzugte Skills und Tool-Zugang mit. Der Nutzer wählt nur den Expert. Der Rest konfiguriert sich selbst.

### Quicktasks nutzen

Formularbasierte Workflows für wiederkehrende Aufgaben. Kein Prompting-Wissen nötig. Formular ausfüllen, absenden, Ergebnis bekommen.

**Beispiele:**

- **KI-Bildprompt-Generator** — Bildidee beschreiben, optimierten Prompt bekommen
- **Social-Media-Mix** — Plattformen und Zielgruppe angeben, Content-Plan erhalten
- **Meeting-Vorbereitung** — Ziel und Teilnehmer eingeben, Agenda bekommen

**Nutzen:** Konsistente Ergebnisse ohne Trial-and-Error. Jeder Quicktask hat ein eigenes Modell und eigene Temperatur für optimale Resultate.

### In Projekten arbeiten

Projekte bündeln Chats mit gemeinsamem Kontext. Projekt-Instruktionen und Dokumente werden automatisch in jeden Chat injiziert.

**Beispiel:** Projekt "Website Relaunch" hat Instruktionen zum Markenstil und ein Briefing-Dokument. Jeder neue Chat in diesem Projekt kennt diese Infos, ohne dass der Nutzer sie wiederholen muss.

### Zusammenarbeiten

Die Plattform unterstützt Collaboration auf zwei Ebenen:

**Projekt-Mitglieder:**
- Projekte können mit anderen Nutzern geteilt werden (Owner/Editor-Rollen)
- Mitglieder sehen alle Chats und Dokumente im Projekt
- Owner können Mitglieder einladen und entfernen

**Chat-Sharing:**
- **Public Link:** Jeder Chat kann per Link geteilt werden (read-only, jeder mit Link kann lesen)
- **User-zu-User:** Chats können gezielt an bestimmte Nutzer freigegeben werden
- Geteilte Chats erscheinen in "Shared with me" und in der Sidebar

### User Workspace

Jeder Nutzer hat einen persönlichen Arbeitsbereich:

**Eigene Experts erstellen (KI-Wizard):**
- Geführter KI-Wizard: Nutzer beschreibt in natürlicher Sprache was er braucht
- KI stellt 2-3 Rückfragen, generiert dann Name, Description und System-Prompt
- Strukturierte Vorschau mit Inline-Edit vor dem Speichern
- KI entscheidet implizit über Tool-Auswahl — Nutzer muss keine technischen Details kennen
- Eigene Experts erscheinen im Expert-Grid mit "Mein"-Badge und "Meine"-Filter
- Sichtbar nur für den Ersteller (privat)

**Eigene Quicktasks erstellen (KI-Wizard):**
- Gleicher KI-Wizard wie für Experts
- KI generiert Quicktask mit Formular-Feldern (2-4 Felder: Text, Textarea, Select)
- Eigene Quicktasks erscheinen in der Quicktask-Übersicht mit "Mein"-Badge und "Meine"-Filter
- Geführte Eingabe über Formular — deterministische Ausführung statt Freitext-Chat

**Meine Dateien:**
- Artifact-Browser mit allen erstellten Dokumenten, Designs, Bildern, Audio-Dateien
- Filter nach Typ (Markdown, HTML, Code, Bild, Audio, Quiz, Review, Research)
- Suche und Sortierung nach Datum
- Deep-Research-Indicator für Recherche-Ergebnisse

**Persönliche Einstellungen:**
- Standard-Modell wählen
- Memory ein/ausschalten
- Suggested Replies ein/ausschalten
- Custom Instructions (gelten für alle Chats, höchste Prompt-Priorität)

---

## Was die Plattform im Hintergrund leistet

### Automatische Kontext-Assemblierung

Bei jeder Nachricht baut das System einen mehrstufigen Kontext auf. Der Nutzer merkt davon nichts. Die KI bekommt aber:

1. **Expert-Persona** — Wie soll ich mich verhalten?
2. **Tool-Instruktionen** — Welche Werkzeuge habe ich?
3. **Skill-Übersicht** — Welches Expertenwissen kann ich laden?
4. **Erinnerungen** — Was weiß ich aus früheren Gesprächen?
5. **Projekt-Kontext** — In welchem Projekt bin ich?
6. **Nutzer-Anweisungen** — Was will dieser Nutzer grundsätzlich?

Alle 6 Ebenen werden parallel geladen und in unter 200ms zusammengesetzt. Der Nutzer tippt eine Nachricht. Das System erledigt den Rest.

### Intelligente Tool-Auswahl

Die KI entscheidet selbständig, welche Werkzeuge sie einsetzt. Kein Nutzer muss sagen "nutze jetzt die Websuche" oder "erstelle ein Artifact".

| Situation                             | KI-Entscheidung                                 | Nutzer-Aufwand       |
| ------------------------------------- | ----------------------------------------------- | -------------------- |
| User fragt nach aktuellen Infos       | Startet Websuche automatisch                    | Keiner               |
| User teilt eine URL                   | Liest den Inhalt automatisch                    | Keiner               |
| User will ein Dokument                | Erstellt Artifact im Side-Panel                 | Keiner               |
| User will Feedback zu einem Konzept   | Erstellt Review mit Abschnitts-Bewertung        | Keiner               |
| KI braucht Klärung                   | Zeigt strukturierte Rückfrage (Auswahl-Widget) | Klick/Auswahl        |
| User hat mehrere Varianten erfragt    | Zeigt Tab-Ansicht zum Vergleichen               | Klick auf bevorzugte |
| User sagt "merk dir das"              | Speichert in persistentem Memory                | Keiner               |
| Relevantes Wissen aus früheren Chats | Wird automatisch eingeblendet                   | Keiner               |

### Memory: Nichts vergessen

Die Plattform erinnert sich an relevante Informationen aus früheren Gesprächen.

- **Automatisch:** Nach einem Gespräch (ab 6 Nachrichten) extrahiert das System relevante Fakten
- **Explizit:** User kann jederzeit sagen "Merk dir, dass ich Python bevorzuge"
- **Abruf:** Bei jedem neuen Chat sucht das System semantisch nach passenden Erinnerungen
- **Kontrolle:** User kann Erinnerungen einsehen, löschen und exportieren (DSGVO-konform)

**Beispiel:** User erwähnt in Chat 1, dass er für ein SaaS-Startup arbeitet. In Chat 47 fragt er nach Pricing-Strategien. Die KI weiß automatisch, dass es um SaaS geht.

### Modell-Auswahl ohne Nachdenken

Die Plattform wählt automatisch das beste Modell:

1. Quicktask hat ein eigenes Modell? → Das wird genutzt
2. Expert bevorzugt ein Modell? → Das wird genutzt
3. User hat ein Standard-Modell? → Das wird genutzt
4. Keins davon? → System-Default

Der Nutzer kann ein Standard-Modell in den Einstellungen wählen. Alles andere passiert automatisch.

---

## Tools & Capabilities im Detail

### Dokumente, Code und HTML erstellen

Die KI erstellt eigenständige Outputs als **Artifacts** im Side-Panel neben dem Chat.

| Output-Typ              | Was der Nutzer bekommt                                  | Aktionen                                        |
| ----------------------- | ------------------------------------------------------- | ----------------------------------------------- |
| **Dokument** (Markdown) | Formatierter Text mit Überschriften, Listen, Tabellen  | Kopieren, Download (.md), Bearbeiten, Drucken   |
| **HTML-Seite**          | Interaktive Webseite mit Live-Preview                   | Kopieren, Download (.html), Bearbeiten, Drucken |
| **Code**                | Syntax-gehighlighteter Code (Python, JS, TS, CSS, etc.) | Kopieren, Download (.py/.ts/...), Bearbeiten    |
| **Quiz**                | Interaktiver Wissenstest mit automatischer Auswertung   | Fragen beantworten, Feedback bekommen           |
| **Review**              | Abschnittsweise Durchsicht mit Bewertung pro Abschnitt  | Passt / Ändern / Frage / Raus pro Sektion      |
| **Bild**                | Generiertes Bild mit Variations-Galerie                 | Iterieren, kombinieren, herunterladen           |

**Bearbeiten:** Jedes Artifact hat einen integrierten Code-Editor (CodeMirror). Änderungen werden versioniert gespeichert.

### Interaktive Rückfragen

Statt unstrukturierter "Was meinst du?"-Fragen stellt die KI gezielte Rückfragen mit UI-Elementen:

- **Radio-Buttons** für Entweder-Oder-Entscheidungen
- **Checkboxen** für Mehrfachauswahl
- **Freitext** für offene Eingaben
- **Tab-Ansicht** für Varianten-Vergleich (2-5 Alternativen)

Der Chat pausiert, bis der Nutzer geantwortet hat. Dann geht es nahtlos weiter.

### Websuche und URL-Abruf

Die KI kann das Internet nutzen, ohne dass der Nutzer einen separaten Browser öffnet:

- **Websuche:** Aktuelle Informationen finden (Nachrichten, Preise, Fakten)
- **URL lesen:** Inhalte einer Webseite als sauberen Text abrufen und zusammenfassen
- **Quellen:** Ergebnisse mit Links und Snippets im Chat
- **Datum-Awareness:** Die KI kennt immer das aktuelle Datum und sucht mit korrekten Zeitangaben

### Deep Research

Umfassende, mehrstufige Recherche für komplexe Fragestellungen:

- **Automatisch:** KI erkennt Recherche-Bedarf und schlägt Deep Research vor
- **Bestätigung:** Nutzer wird vor Start über Dauer (5-12 Minuten) und Kosten informiert
- **Async:** Recherche laeuft im Hintergrund bei Google. Nutzer kann andere Chats nutzen
- **Phasen:** Live-Fortschritt zeigt Planung → Suche → Analyse → Bericht
- **Report:** Ergebnis als herunterladbares Markdown-Artifact mit Quellenangaben
- **Auffindbar:** Research-Reports sind über "Meine Dateien" → Research-Filter zugänglich

**Typische Anwendungsfälle:** Marktanalysen, Vergleichsstudien, Literaturrecherchen, Wettbewerbsanalysen, Technologie-Evaluierungen.

### Quellenverlinkung in Artifacts

Wenn die KI auf Basis von Websuche-Ergebnissen schreibt:

- **Inline-Zitate:** Hochgestellte Nummern markieren quellenbasierte Aussagen
- **Quellenverzeichnis:** Am Ende jedes Artifacts mit nummerierten Links
- **Quellen-Badge:** Im Artifact-Header sichtbar ("3 Quellen"), klickbar zum Verzeichnis
- **Metadata:** Quellen werden strukturiert gespeichert für spätere Nutzung

### Bildgenerierung

Bilder erstellen, bearbeiten und kombinieren direkt im Chat:

- **Generieren:** Beschreibung → Bild (via Gemini)
- **Iterieren:** "Mach es dunkler" / "Anderer Stil" → neue Version in derselben Galerie
- **Bearbeiten:** Bestehendes Bild hochladen + Anweisung → modifiziertes Bild
- **Kombinieren:** Mehrere Bilder hochladen → kombiniertes Ergebnis

Die KI formuliert den englischen Bildprompt automatisch (bessere Ergebnisse). Der Nutzer beschreibt auf Deutsch.

### Design Library & Prompt-Formeln

Kuratierte Galerie mit erprobten Prompt-Formeln und Beispielbildern für gezielte Bildgenerierung:

- **Galerie-Seite** (`/design-library`): Browsebar mit Filtern nach Kategorie, Suchfunktion
- **68 Prompt-Formeln:** Professionell getestete Templates mit Platzhaltern für Subjekt, Stil, Beleuchtung
- **1.000+ Beispielbilder:** Inspiration und Referenz, direkt als Edit-Startpunkt nutzbar
- **Flow A — Variante erstellen:** Formel auswählen → neuer Chat mit Formel-Kontext und Seitenverhältnis-Auswahl
- **Flow B — Bild bearbeiten:** Beispielbild als Referenz → neuer Chat mit Änderungsbeschreibung
- **GenUI-Komponente:** Vor jeder Generierung fragt ein Formular nach Seitenverhältnis (14 Formate) und Motiv-Details
- **Chat-Integration:** `search_design_library` Tool durchsucht Formeln und Beispiele direkt aus dem Chat

### YouTube-Integration

Videos suchen und analysieren direkt im Chat:

- **Suche:** Stichwortsuche mit Video-Ergebnis-Cards (Thumbnail, Titel, Kanal)
- **Analyse:** Video-URL eingeben → Transkription, Zusammenfassung oder tiefe Analyse
- **Multimodal:** Gemini analysiert Thumbnail + Transkript für kontextreiche Ergebnisse

### GenAI-Tutor (lernen.diy-Lessons)

Bei Fragen zu generativer KI bietet der Assistant passende Lessons von lernen.diy als Vertiefung an:

- **Pointer-Tutor:** Antwortet zuerst inhaltlich aus eigenem Wissen, schlägt anschließend passende Lessons als anklickbare Cards vor
- **Generative UI:** Lesson-Cards mit Cover, Disziplin-Badge, Dauer und Schwierigkeitsgrad — Klick öffnet `lernen.diy/lessons/[slug]` in neuem Tab
- **Datenquelle:** Lokal in `src/data/lessons.json` (Sync via `pnpm sync:lessons` aus dem Schwester-Repo `lernen-diy`). Keine Runtime-Abhängigkeit zu lernen.diy.
- **Tonalität:** Plattform-First — Lead-in nennt Lernplattform und Rico Loschke als Autor („Auf lernen.diy gibt es dazu eine Lesson von Rico Loschke …"). Bei methodischer Abweichung weist der Tutor darauf hin.
- **Feature-Flag:** `LESSONS_TUTOR_ENABLED=false` deaktiviert das Tool für White-Label-Instanzen ohne loschke-Bezug.

### Text-to-Speech

Texte in gesprochenes Audio umwandeln:

- **Stimmen:** 8 verschiedene Stimmen (4 weiblich, 4 männlich, verschiedene Charaktere)
- **Multi-Speaker:** 2-Sprecher-Dialoge mit automatischer Stimmenzuweisung
- **Player:** Audio direkt im Chat abspielbar, herunterladbar als WAV

### UI-Design-Generierung (Stitch)

Professionelle UI-Designs direkt im Chat erstellen:

- **Generieren:** Beschreibung → production-quality HTML mit Tailwind CSS
- **Iterieren:** Bestehende Designs mit Follow-up-Prompts verfeinern
- **Device-Targeting:** Desktop, Mobile oder Tablet-optimierte Layouts
- **Live-Preview:** Designs sofort im Artifact-Panel sichtbar und editierbar

### Dokument-Generierung (Agent Skills)

Professionelle Office-Dokumente im Chat erstellen:

- **Formate:** PowerPoint (.pptx), Excel (.xlsx), Word (.docx), PDF
- **Download:** Generierte Dateien direkt im Chat herunterladbar
- **Iteration:** Dokumente können in Folge-Nachrichten überarbeitet werden

### Session-Abschluss (Wrapup)

Am Ende eines Gesprächs kann die KI das Erarbeitete strukturiert zusammenfassen:

| Format                   | Zweck                          | Für wen                 |
| ------------------------ | ------------------------------ | ------------------------ |
| **Zusammenfassung**      | Kernpunkte, Entscheidungen, offene Fragen | Eigene Dokumentation     |
| **Action Items**         | Priorisierte nächste Schritte als Tabelle | Projektmanagement       |
| **Anforderungsdokument** | Formale Anforderungen (PRD) mit Must/Should/Could | Entwicklung, Stakeholder |

**Ausgabeformat wählbar:**
- **Text** — Markdown-Artifact (herunterladbar, editierbar)
- **Audio** — Gesprochene Zusammenfassung via TTS (natürlich formuliert, max. 4000 Zeichen)

---

## Datenschutz-Features (Business Mode)

Für regulierte Umgebungen bietet die Plattform abgestuften Datenschutz:

### PII-Erkennung

Vor dem Senden prüft das System automatisch auf sensible Daten:

- E-Mail-Adressen
- IBAN / Kreditkartennummern
- Telefonnummern (DE-Format)
- Steuer-IDs / Sozialversicherungsnummern
- IP-Adressen

### 5 Optionen bei PII-Fund

1. **Nachricht bearbeiten** — Zurueck zum Eingabefeld
2. **Maskiert senden** — Daten werden automatisch unkenntlich (`DE89 **** 00`, `m***@domain.de`)
3. **EU-Modell nutzen** — Nachricht wird an EU-gehostetes Modell (Mistral) geroutet
4. **Lokal verarbeiten** — Nachricht wird an selbstgehostetes Modell geschickt
5. **Trotzdem senden** — Bewusste Entscheidung, wird protokolliert

### Audit-Trail

Jede Datenschutz-Entscheidung wird in einem Consent-Log gespeichert (DSGVO-konform). Bei Datei-Uploads gibt es einen separaten Consent-Dialog.

---

## Was diese Plattform von ChatGPT / Claude.ai unterscheidet

| Aspekt              | ChatGPT / Claude.ai                      | Diese Plattform                                                                   |
| ------------------- | ---------------------------------------- | --------------------------------------------------------------------------------- |
| **Experten**        | Ein Assistent für alles                 | 7 spezialisierte Experten mit eigener Persönlichkeit, Temperatur und Tool-Zugang |
| **Quicktasks**      | Nur freies Chatten                       | Formularbasierte Workflows für wiederkehrende Aufgaben                           |
| **Review-Modus**    | Alles-oder-nichts-Feedback               | Abschnittsweise Bewertung (Passt/Ändern/Frage/Raus) mit Iterations-Schleifen     |
| **Projekte**        | Keine projektübergreifende Kontinuität | Projekt-Instruktionen und Dokumente automatisch in jedem Chat                     |
| **Memory**          | Begrenzt, nicht exportierbar             | Semantische Suche, explizites Speichern, DSGVO-Export und -Löschung              |
| **Datenschutz**     | Kein PII-Schutz                          | Automatische PII-Erkennung, Maskierung, EU-Routing, lokale Verarbeitung           |
| **Varianten**       | Manuell nachfragen                       | Automatische Tab-Ansicht für 2-5 Alternativen                                    |
| **Rückfragen**     | Freitext                                 | Strukturierte UI-Widgets (Radio, Checkbox, Textarea)                              |
| **Bildgenerierung** | Separates Tool                           | Integriert im Chat mit Iterations-Galerie und Bild-Kombination                    |
| **Deep Research**   | Nicht verfügbar                         | Mehrstufige Recherche (5-12 Min), async, Report mit Quellen als Artifact          |
| **YouTube**         | Nicht verfügbar                         | Video-Suche + multimodale Analyse (Transkript + Thumbnail) im Chat               |
| **Text-to-Speech**  | Nicht verfügbar                         | 8 Stimmen, Multi-Speaker-Dialoge, Audio-Player im Chat                            |
| **UI-Design**       | Nicht verfügbar                         | Stitch: production-quality HTML-Designs, iterierbar, Device-Targeting             |
| **Quellen**         | Keine Transparenz                        | Inline-Zitate + Quellenverzeichnis in Artifacts                                   |
| **Modell-Auswahl**  | Manuell                                  | Automatisch basierend auf Expert/Quicktask/User-Präferenz                        |
| **Credit-System**   | Fixe Abo-Preise                          | Transparentes Pay-as-you-go mit Model-basierten Kosten                            |
| **Wrapup**          | Manuell zusammenfassen                   | 3 strukturierte Formate (Zusammenfassung, Action Items, PRD) als Text oder Audio  |
| **Skills**          | System-Prompts manuell pflegen           | On-demand Skill-Loading, Expert-priorisiert, Admin-verwaltbar                     |
| **Google Search**   | Integriert                               | Grounded Search mit Inline-Quellen und Zitaten                                    |
| **Collaboration**   | Begrenzt                                 | Projekt-Mitglieder, Chat-Sharing (Public + User-zu-User)                          |
| **Workspace**       | Basis-Einstellungen                      | KI-Wizard für eigene Experts/Quicktasks, Dateien-Browser, Custom Instructions     |
| **Design Library**  | Nicht verfügbar                         | 68 Prompt-Formeln, 1.000+ Beispielbilder, geführter Bildgenerierungs-Workflow     |
| **Multi-Instanz**   | Nicht möglich                           | Eine Codebase, mehrere Brands, eigene Features pro Deployment                     |
| **MCP-Integration** | Nicht verfügbar                         | Externe Tools (GitHub, Slack, etc.) per Admin-Konfiguration                       |

---

## Kern-Versprechen (für Marketing)

### Für den Nutzer

- **Kein Prompt-Engineering nötig.** Expert wählen oder Quicktask-Formular ausfüllen. Die Plattform kümmert sich um den Rest.
- **Die KI vergisst nichts.** Memory-System erinnert sich an relevante Informationen aus früheren Gesprächen.
- **Ergebnisse statt Textwände.** Dokumente, Code, HTML-Seiten, Bilder und Quizzes als eigenständige Outputs. Nicht eingebettet im Chat, sondern im Side-Panel. Editierbar, downloadbar, druckbar.
- **Iteration statt Alles-Nochmal.** Review-Modus für abschnittsweises Feedback. Varianten-Ansicht für Vergleich. Bild-Galerie für visuelles Iterieren.
- **Datenschutz eingebaut.** PII-Erkennung, Maskierung, EU-Routing oder lokale Verarbeitung. Der Nutzer entscheidet, das System protokolliert.

### Für Entscheider

- **Eine Plattform, viele Einsatzzwecke.** Content, Code, SEO, Analyse, Research, Design. Ein Tool statt sieben.
- **Konfigurierbar pro Instanz.** Eigene Experts, Skills, Models, Features pro Deployment. White-Label-faehig.
- **Transparente Kosten.** Credit-System mit Model-basierten Preisen. Kein Flatrate-Risiko.
- **DSGVO-ready.** Audit-Trail, Consent-Logging, Memory-Export und -Löschung.

---

## Feature-Übersicht (kompakt, für Landingpage-Sections)

```
CHATTEN                          ERSTELLEN
├── 7+ KI-Experten (+ eigene)   ├── Dokumente (Markdown + Quellen)
├── Freies Chatten               ├── HTML-Seiten (Live-Preview)
├── Quicktask-Formulare          ├── Code (Syntax-Highlighting)
├── Strukturierte Rückfragen    ├── Quizzes (Auto-Auswertung)
├── Varianten-Vergleich          ├── Reviews (Abschnitts-Feedback)
└── Session-Wrapup (3 Formate)   ├── Bilder (Generieren, Iterieren)
                                 ├── UI-Designs (Stitch)
                                 └── Office-Dokumente (PPTX, XLSX, DOCX, PDF)

RECHERCHE                        MEDIEN
├── Deep Research (5-12 Min)     ├── Bildgenerierung + Iteration
├── Websuche mit Quellen         ├── Design Library (68 Formeln)
├── Google Search Grounding      ├── YouTube-Suche + Analyse
├── URL-Abruf                    ├── Text-to-Speech (8 Stimmen)
├── On-demand Skills             └── UI-Design-Generierung
└── Quellenverzeichnis

ZUSAMMENARBEIT                   WISSEN
├── Projekt-Mitglieder           ├── Persistentes Memory
├── Chat-Sharing (Public Link)   ├── Datum-Awareness
├── Chat-Sharing (User-zu-User)  ├── Projekt-Kontext
└── Geteilte Projekt-Dokumente   ├── Custom Instructions
                                 ├── KI-Wizard (Experts/Quicktasks)
                                 └── Meine Dateien (Artifacts)

ANPASSEN
├── Eigene Experts (KI-Wizard)
├── Eigene Quicktasks (KI-Wizard)
├── Custom Instructions
├── Standard-Modell wählen
└── Memory-Steuerung

SCHUETZEN
├── PII-Erkennung (9 Typen)
├── Automatische Maskierung
├── EU-Modell-Routing
├── Lokale Verarbeitung
├── Consent-Logging
└── Memory DSGVO-Export
```
