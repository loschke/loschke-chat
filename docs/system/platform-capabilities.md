# Plattform-Capabilities: Was die KI-Chat-Plattform kann

Uebersicht aller Faehigkeiten aus Nutzer-Perspektive. Grundlage fuer Landingpage-Texte, Feature-Listen und Vorteilsargumentation.

---

## Was Nutzer mit der Plattform tun koennen

### Frei chatten

Offene Konversation mit KI. Keine Vorkenntnisse noetig. Die Plattform waehlt automatisch das passende Modell, laedt relevanten Kontext und stellt die richtigen Werkzeuge bereit.

**Anwendungsfaelle:**

- Fragen stellen und Erklaerungen bekommen
- Texte schreiben, ueberarbeiten, kuerzen
- Ideen entwickeln und strukturieren
- Code schreiben, debuggen, reviewen
- Daten analysieren und visualisieren
- Bilder generieren und iterieren

### Mit Experten arbeiten

7 spezialisierte KI-Experten mit unterschiedlichen Staerken. Jeder Expert aendert wie die KI denkt, schreibt und welche Werkzeuge sie bevorzugt.

| Expert              | Staerke                     | Typische Aufgabe                                      |
| ------------------- | --------------------------- | ----------------------------------------------------- |
| **Allgemein**       | Vielseitig, passt sich an   | "Erklaer mir..." / "Hilf mir bei..."                  |
| **Code-Assistent**  | Praezise, strukturiert      | "Schreib eine Funktion die..." / "Review diesen Code" |
| **SEO-Berater**     | Datengetrieben, priorisiert | "Analysiere die SEO meiner Seite"                     |
| **Daten-Analyst**   | Quantifiziert, visualisiert | "Werte diese Zahlen aus" / "Erstelle ein Dashboard"   |
| **Researcher**      | Gruendlich, quellenbasiert  | "Recherchiere den Markt fuer..."                      |
| **Content Writer**  | Kreativ, kein KI-Sprech     | "Schreib einen Blogpost ueber..."                     |
| **Visual Designer** | Bildkonzeption, Iteration   | "Erstelle ein Headerbild fuer..."                     |

**Was im Hintergrund passiert:** Jeder Expert bringt eigene Persoenlichkeit, Temperatur (kreativ vs. praezise), bevorzugte Skills und Tool-Zugang mit. Der Nutzer waehlt nur den Expert. Der Rest konfiguriert sich selbst.

### Quicktasks nutzen

Formularbasierte Workflows fuer wiederkehrende Aufgaben. Kein Prompting-Wissen noetig. Formular ausfuellen, absenden, Ergebnis bekommen.

**Beispiele:**

- **KI-Bildprompt-Generator** — Bildidee beschreiben, optimierten Prompt bekommen
- **Social-Media-Mix** — Plattformen und Zielgruppe angeben, Content-Plan erhalten
- **Meeting-Vorbereitung** — Ziel und Teilnehmer eingeben, Agenda bekommen

**Nutzen:** Konsistente Ergebnisse ohne Trial-and-Error. Jeder Quicktask hat ein eigenes Modell und eigene Temperatur fuer optimale Resultate.

### In Projekten arbeiten

Projekte buendeln Chats mit gemeinsamem Kontext. Projekt-Instruktionen und Dokumente werden automatisch in jeden Chat injiziert.

**Beispiel:** Projekt "Website Relaunch" hat Instruktionen zum Markenstil und ein Briefing-Dokument. Jeder neue Chat in diesem Projekt kennt diese Infos, ohne dass der Nutzer sie wiederholen muss.

### Zusammenarbeiten

Die Plattform unterstuetzt Collaboration auf zwei Ebenen:

**Projekt-Mitglieder:**
- Projekte koennen mit anderen Nutzern geteilt werden (Owner/Editor-Rollen)
- Mitglieder sehen alle Chats und Dokumente im Projekt
- Owner koennen Mitglieder einladen und entfernen

**Chat-Sharing:**
- **Public Link:** Jeder Chat kann per Link geteilt werden (read-only, jeder mit Link kann lesen)
- **User-zu-User:** Chats koennen gezielt an bestimmte Nutzer freigegeben werden
- Geteilte Chats erscheinen in "Shared with me" und in der Sidebar

### User Workspace

Jeder Nutzer hat einen persoenlichen Arbeitsbereich:

**Eigene Experts erstellen:**
- Persoenliche KI-Assistenten mit eigenem System-Prompt, Temperatur und Tool-Konfiguration
- Sichtbar nur fuer den Ersteller (oder oeffentlich fuer alle)
- Funktionieren genauso wie globale Experts, aber individuell angepasst

**Eigene Skills erstellen** (wenn aktiviert):
- SKILL.md-Format wie globale Skills
- Namenskollision: Eigene Skills haben Vorrang vor globalen bei gleichem Slug
- Optional als oeffentlich markierbar

**Meine Dateien:**
- Artifact-Browser mit allen erstellten Dokumenten, Designs, Bildern, Audio-Dateien
- Filter nach Typ (Markdown, HTML, Code, Bild, Audio, Quiz, Review, Research)
- Suche und Sortierung nach Datum
- Deep-Research-Indicator fuer Recherche-Ergebnisse

**Persoenliche Einstellungen:**
- Standard-Modell waehlen
- Memory ein/ausschalten
- Suggested Replies ein/ausschalten
- Custom Instructions (gelten fuer alle Chats, hoechste Prompt-Prioritaet)

---

## Was die Plattform im Hintergrund leistet

### Automatische Kontext-Assemblierung

Bei jeder Nachricht baut das System einen mehrstufigen Kontext auf. Der Nutzer merkt davon nichts. Die KI bekommt aber:

1. **Expert-Persona** — Wie soll ich mich verhalten?
2. **Tool-Instruktionen** — Welche Werkzeuge habe ich?
3. **Skill-Uebersicht** — Welches Expertenwissen kann ich laden?
4. **Erinnerungen** — Was weiss ich aus frueheren Gespraechen?
5. **Projekt-Kontext** — In welchem Projekt bin ich?
6. **Nutzer-Anweisungen** — Was will dieser Nutzer grundsaetzlich?

Alle 6 Ebenen werden parallel geladen und in unter 200ms zusammengesetzt. Der Nutzer tippt eine Nachricht. Das System erledigt den Rest.

### Intelligente Tool-Auswahl

Die KI entscheidet selbststaendig, welche Werkzeuge sie einsetzt. Kein Nutzer muss sagen "nutze jetzt die Websuche" oder "erstelle ein Artifact".

| Situation                             | KI-Entscheidung                                 | Nutzer-Aufwand       |
| ------------------------------------- | ----------------------------------------------- | -------------------- |
| User fragt nach aktuellen Infos       | Startet Websuche automatisch                    | Keiner               |
| User teilt eine URL                   | Liest den Inhalt automatisch                    | Keiner               |
| User will ein Dokument                | Erstellt Artifact im Side-Panel                 | Keiner               |
| User will Feedback zu einem Konzept   | Erstellt Review mit Abschnitts-Bewertung        | Keiner               |
| KI braucht Klaerung                   | Zeigt strukturierte Rueckfrage (Auswahl-Widget) | Klick/Auswahl        |
| User hat mehrere Varianten erfragt    | Zeigt Tab-Ansicht zum Vergleichen               | Klick auf bevorzugte |
| User sagt "merk dir das"              | Speichert in persistentem Memory                | Keiner               |
| Relevantes Wissen aus frueheren Chats | Wird automatisch eingeblendet                   | Keiner               |

### Memory: Nichts vergessen

Die Plattform erinnert sich an relevante Informationen aus frueheren Gespraechen.

- **Automatisch:** Nach einem Gespraech (ab 6 Nachrichten) extrahiert das System relevante Fakten
- **Explizit:** User kann jederzeit sagen "Merk dir, dass ich Python bevorzuge"
- **Abruf:** Bei jedem neuen Chat sucht das System semantisch nach passenden Erinnerungen
- **Kontrolle:** User kann Erinnerungen einsehen, loeschen und exportieren (DSGVO-konform)

**Beispiel:** User erwaehnt in Chat 1, dass er fuer ein SaaS-Startup arbeitet. In Chat 47 fragt er nach Pricing-Strategien. Die KI weiss automatisch, dass es um SaaS geht.

### Modell-Auswahl ohne Nachdenken

Die Plattform waehlt automatisch das beste Modell:

1. Quicktask hat ein eigenes Modell? → Das wird genutzt
2. Expert bevorzugt ein Modell? → Das wird genutzt
3. User hat ein Standard-Modell? → Das wird genutzt
4. Keins davon? → System-Default

Der Nutzer kann ein Standard-Modell in den Einstellungen waehlen. Alles andere passiert automatisch.

---

## Tools & Capabilities im Detail

### Dokumente, Code und HTML erstellen

Die KI erstellt eigenstaendige Outputs als **Artifacts** im Side-Panel neben dem Chat.

| Output-Typ              | Was der Nutzer bekommt                                  | Aktionen                                        |
| ----------------------- | ------------------------------------------------------- | ----------------------------------------------- |
| **Dokument** (Markdown) | Formatierter Text mit Ueberschriften, Listen, Tabellen  | Kopieren, Download (.md), Bearbeiten, Drucken   |
| **HTML-Seite**          | Interaktive Webseite mit Live-Preview                   | Kopieren, Download (.html), Bearbeiten, Drucken |
| **Code**                | Syntax-gehighlighteter Code (Python, JS, TS, CSS, etc.) | Kopieren, Download (.py/.ts/...), Bearbeiten    |
| **Quiz**                | Interaktiver Wissenstest mit automatischer Auswertung   | Fragen beantworten, Feedback bekommen           |
| **Review**              | Abschnittsweise Durchsicht mit Bewertung pro Abschnitt  | Passt / Aendern / Frage / Raus pro Sektion      |
| **Bild**                | Generiertes Bild mit Variations-Galerie                 | Iterieren, kombinieren, herunterladen           |

**Bearbeiten:** Jedes Artifact hat einen integrierten Code-Editor (CodeMirror). Aenderungen werden versioniert gespeichert.

### Interaktive Rueckfragen

Statt unstrukturierter "Was meinst du?"-Fragen stellt die KI gezielte Rueckfragen mit UI-Elementen:

- **Radio-Buttons** fuer Entweder-Oder-Entscheidungen
- **Checkboxen** fuer Mehrfachauswahl
- **Freitext** fuer offene Eingaben
- **Tab-Ansicht** fuer Varianten-Vergleich (2-5 Alternativen)

Der Chat pausiert, bis der Nutzer geantwortet hat. Dann geht es nahtlos weiter.

### Websuche und URL-Abruf

Die KI kann das Internet nutzen, ohne dass der Nutzer einen separaten Browser oeffnet:

- **Websuche:** Aktuelle Informationen finden (Nachrichten, Preise, Fakten)
- **URL lesen:** Inhalte einer Webseite als sauberen Text abrufen und zusammenfassen
- **Quellen:** Ergebnisse mit Links und Snippets im Chat
- **Datum-Awareness:** Die KI kennt immer das aktuelle Datum und sucht mit korrekten Zeitangaben

### Deep Research

Umfassende, mehrstufige Recherche fuer komplexe Fragestellungen:

- **Automatisch:** KI erkennt Recherche-Bedarf und schlaegt Deep Research vor
- **Bestaetigung:** Nutzer wird vor Start ueber Dauer (5-12 Minuten) und Kosten informiert
- **Async:** Recherche laeuft im Hintergrund bei Google. Nutzer kann andere Chats nutzen
- **Phasen:** Live-Fortschritt zeigt Planung → Suche → Analyse → Bericht
- **Report:** Ergebnis als herunterladbares Markdown-Artifact mit Quellenangaben
- **Auffindbar:** Research-Reports sind ueber "Meine Dateien" → Research-Filter zugaenglich

**Typische Anwendungsfaelle:** Marktanalysen, Vergleichsstudien, Literaturrecherchen, Wettbewerbsanalysen, Technologie-Evaluierungen.

### Quellenverlinkung in Artifacts

Wenn die KI auf Basis von Websuche-Ergebnissen schreibt:

- **Inline-Zitate:** Hochgestellte Nummern markieren quellenbasierte Aussagen
- **Quellenverzeichnis:** Am Ende jedes Artifacts mit nummerierten Links
- **Quellen-Badge:** Im Artifact-Header sichtbar ("3 Quellen"), klickbar zum Verzeichnis
- **Metadata:** Quellen werden strukturiert gespeichert fuer spaetere Nutzung

### Bildgenerierung

Bilder erstellen, bearbeiten und kombinieren direkt im Chat:

- **Generieren:** Beschreibung → Bild (via Gemini)
- **Iterieren:** "Mach es dunkler" / "Anderer Stil" → neue Version in derselben Galerie
- **Bearbeiten:** Bestehendes Bild hochladen + Anweisung → modifiziertes Bild
- **Kombinieren:** Mehrere Bilder hochladen → kombiniertes Ergebnis

Die KI formuliert den englischen Bildprompt automatisch (bessere Ergebnisse). Der Nutzer beschreibt auf Deutsch.

### YouTube-Integration

Videos suchen und analysieren direkt im Chat:

- **Suche:** Stichwortsuche mit Video-Ergebnis-Cards (Thumbnail, Titel, Kanal)
- **Analyse:** Video-URL eingeben → Transkription, Zusammenfassung oder tiefe Analyse
- **Multimodal:** Gemini analysiert Thumbnail + Transkript fuer kontextreiche Ergebnisse

### Text-to-Speech

Texte in gesprochenes Audio umwandeln:

- **Stimmen:** 8 verschiedene Stimmen (4 weiblich, 4 maennlich, verschiedene Charaktere)
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
- **Iteration:** Dokumente koennen in Folge-Nachrichten ueberarbeitet werden

### Session-Abschluss (Wrapup)

Am Ende eines Gespraechs kann die KI das Erarbeitete strukturiert zusammenfassen:

| Format                   | Zweck                          | Fuer wen                 |
| ------------------------ | ------------------------------ | ------------------------ |
| **Zusammenfassung**      | Kernpunkte, Entscheidungen, offene Fragen | Eigene Dokumentation     |
| **Action Items**         | Priorisierte naechste Schritte als Tabelle | Projektmanagement       |
| **Anforderungsdokument** | Formale Anforderungen (PRD) mit Must/Should/Could | Entwicklung, Stakeholder |

**Ausgabeformat waehlbar:**
- **Text** — Markdown-Artifact (herunterladbar, editierbar)
- **Audio** — Gesprochene Zusammenfassung via TTS (natuerlich formuliert, max. 4000 Zeichen)

---

## Datenschutz-Features (Business Mode)

Fuer regulierte Umgebungen bietet die Plattform abgestuften Datenschutz:

### PII-Erkennung

Vor dem Senden prueft das System automatisch auf sensible Daten:

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
| **Experten**        | Ein Assistent fuer alles                 | 7 spezialisierte Experten mit eigener Persoenlichkeit, Temperatur und Tool-Zugang |
| **Quicktasks**      | Nur freies Chatten                       | Formularbasierte Workflows fuer wiederkehrende Aufgaben                           |
| **Review-Modus**    | Alles-oder-nichts-Feedback               | Abschnittsweise Bewertung (Passt/Aendern/Frage/Raus) mit Iterations-Schleifen     |
| **Projekte**        | Keine projektuebergreifende Kontinuitaet | Projekt-Instruktionen und Dokumente automatisch in jedem Chat                     |
| **Memory**          | Begrenzt, nicht exportierbar             | Semantische Suche, explizites Speichern, DSGVO-Export und -Loeschung              |
| **Datenschutz**     | Kein PII-Schutz                          | Automatische PII-Erkennung, Maskierung, EU-Routing, lokale Verarbeitung           |
| **Varianten**       | Manuell nachfragen                       | Automatische Tab-Ansicht fuer 2-5 Alternativen                                    |
| **Rueckfragen**     | Freitext                                 | Strukturierte UI-Widgets (Radio, Checkbox, Textarea)                              |
| **Bildgenerierung** | Separates Tool                           | Integriert im Chat mit Iterations-Galerie und Bild-Kombination                    |
| **Deep Research**   | Nicht verfuegbar                         | Mehrstufige Recherche (5-12 Min), async, Report mit Quellen als Artifact          |
| **YouTube**         | Nicht verfuegbar                         | Video-Suche + multimodale Analyse (Transkript + Thumbnail) im Chat               |
| **Text-to-Speech**  | Nicht verfuegbar                         | 8 Stimmen, Multi-Speaker-Dialoge, Audio-Player im Chat                            |
| **UI-Design**       | Nicht verfuegbar                         | Stitch: production-quality HTML-Designs, iterierbar, Device-Targeting             |
| **Quellen**         | Keine Transparenz                        | Inline-Zitate + Quellenverzeichnis in Artifacts                                   |
| **Modell-Auswahl**  | Manuell                                  | Automatisch basierend auf Expert/Quicktask/User-Praeferenz                        |
| **Credit-System**   | Fixe Abo-Preise                          | Transparentes Pay-as-you-go mit Model-basierten Kosten                            |
| **Wrapup**          | Manuell zusammenfassen                   | 3 strukturierte Formate (Zusammenfassung, Action Items, PRD) als Text oder Audio  |
| **Skills**          | System-Prompts manuell pflegen           | On-demand Skill-Loading, Expert-priorisiert, Admin-verwaltbar                     |
| **Google Search**   | Integriert                               | Grounded Search mit Inline-Quellen und Zitaten                                    |
| **Collaboration**   | Begrenzt                                 | Projekt-Mitglieder, Chat-Sharing (Public + User-zu-User)                          |
| **Workspace**       | Basis-Einstellungen                      | Eigene Experts, Skills, Dateien-Browser, Custom Instructions                      |
| **Multi-Instanz**   | Nicht moeglich                           | Eine Codebase, mehrere Brands, eigene Features pro Deployment                     |
| **MCP-Integration** | Nicht verfuegbar                         | Externe Tools (GitHub, Slack, etc.) per Admin-Konfiguration                       |

---

## Kern-Versprechen (fuer Marketing)

### Fuer den Nutzer

- **Kein Prompt-Engineering noetig.** Expert waehlen oder Quicktask-Formular ausfuellen. Die Plattform kuemmert sich um den Rest.
- **Die KI vergisst nichts.** Memory-System erinnert sich an relevante Informationen aus frueheren Gespraechen.
- **Ergebnisse statt Textwaende.** Dokumente, Code, HTML-Seiten, Bilder und Quizzes als eigenstaendige Outputs. Nicht eingebettet im Chat, sondern im Side-Panel. Editierbar, downloadbar, druckbar.
- **Iteration statt Alles-Nochmal.** Review-Modus fuer abschnittsweises Feedback. Varianten-Ansicht fuer Vergleich. Bild-Galerie fuer visuelles Iterieren.
- **Datenschutz eingebaut.** PII-Erkennung, Maskierung, EU-Routing oder lokale Verarbeitung. Der Nutzer entscheidet, das System protokolliert.

### Fuer Entscheider

- **Eine Plattform, viele Einsatzzwecke.** Content, Code, SEO, Analyse, Research, Design. Ein Tool statt sieben.
- **Konfigurierbar pro Instanz.** Eigene Experts, Skills, Models, Features pro Deployment. White-Label-faehig.
- **Transparente Kosten.** Credit-System mit Model-basierten Preisen. Kein Flatrate-Risiko.
- **DSGVO-ready.** Audit-Trail, Consent-Logging, Memory-Export und -Loeschung.

---

## Feature-Uebersicht (kompakt, fuer Landingpage-Sections)

```
CHATTEN                          ERSTELLEN
├── 7+ KI-Experten (+ eigene)   ├── Dokumente (Markdown + Quellen)
├── Freies Chatten               ├── HTML-Seiten (Live-Preview)
├── Quicktask-Formulare          ├── Code (Syntax-Highlighting)
├── Strukturierte Rueckfragen    ├── Quizzes (Auto-Auswertung)
├── Varianten-Vergleich          ├── Reviews (Abschnitts-Feedback)
└── Session-Wrapup (3 Formate)   ├── Bilder (Generieren, Iterieren)
                                 ├── UI-Designs (Stitch)
                                 └── Office-Dokumente (PPTX, XLSX, DOCX, PDF)

RECHERCHE                        MEDIEN
├── Deep Research (5-12 Min)     ├── Bildgenerierung + Iteration
├── Websuche mit Quellen         ├── YouTube-Suche + Analyse
├── Google Search Grounding      ├── Text-to-Speech (8 Stimmen)
├── URL-Abruf                    └── UI-Design-Generierung
├── On-demand Skills
└── Quellenverzeichnis

ZUSAMMENARBEIT                   WISSEN
├── Projekt-Mitglieder           ├── Persistentes Memory
├── Chat-Sharing (Public Link)   ├── Datum-Awareness
├── Chat-Sharing (User-zu-User)  ├── Projekt-Kontext
└── Geteilte Projekt-Dokumente   ├── Custom Instructions
                                 ├── Eigene Skills & Experts
                                 └── Meine Dateien (Artifacts)

SCHUETZEN
├── PII-Erkennung (9 Typen)
├── Automatische Maskierung
├── EU-Modell-Routing
├── Lokale Verarbeitung
├── Consent-Logging
└── Memory DSGVO-Export
```
