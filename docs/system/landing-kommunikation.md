# Landing Page — Kommunikation und Positionierung

Kommunikative Grundlage für die Außendarstellung der Plattform. Ergänzt die technische Dokumentation um Perspektive, Tonalität und Argumentationslinien für Landing Pages, Pitches und Gespräche mit Interessierten.

---

## Positionierung

### Kernaussage

**KI sollte sich anfühlen wie ein gutes Team.** Nicht wie ein Textfeld das auf Befehle wartet. Sondern wie ein Kollege der mitdenkt, die richtigen Werkzeuge greift und trotzdem fragt bevor er Entscheidungen trifft.

### Entstehung

Die Plattform ist aus der eigenen Arbeit entstanden. Aus dem täglichen Umgang mit Claude und Gemini (beide als Pro-Account) und dem Wunsch, das Beste aus beiden Welten zusammenzuführen und mit dem zu ergänzen, was in der Praxis fehlt.

### Balance-Prinzip

Eine KI die autonom handelt wo es sinnvoll ist und Kontrolle abgibt wo der Mensch sie braucht. Die KI entscheidet welche Tools sie nutzt. Aber sie entscheidet nicht über Daten, Ergebnisse oder Arbeitsrichtung.

---

## Use Cases: "Du fragst — Die KI macht"

Zentrale Darstellungsform für die Landing Page. Zeigt anhand konkreter Situationen wie das Zusammenspiel von Nutzer und KI funktioniert.

### Tiefenrecherche

**Du fragst:** "Recherchiere den aktuellen Stand von KI-Regulierung in der EU"

**Die KI:**
- Startet eine Deep Research (5-12 Minuten Tiefenanalyse über mehrere Quellen)
- Erstellt einen strukturierten Report mit Quellenverzeichnis als eigenständiges Dokument
- Du kannst den Report im Side-Panel lesen, editieren und downloaden

**Involvierte Tools:** `deep_research`, `create_artifact`

### Tagesaktuelle Informationen

**Du fragst:** "Was sind die neuesten Entwicklungen bei Anthropic?"

**Die KI:**
- Nutzt Google Search Grounding für tagesaktuelle Informationen
- Zeigt Inline-Quellen im Antworttext, direkt verlinkt und nachprüfbar

**Involvierte Tools:** `google_search`

### Design-Generierung

**Du fragst:** "Erstell mir eine Landing Page für einen Workshop"

**Die KI:**
- Generiert ein production-ready HTML-Design mit Tailwind CSS
- Zeigt es als Live-Preview im Side-Panel. Du sagst "mach den Header größer" und sie iteriert

**Involvierte Tools:** `generate_design`

### Bildgenerierung

**Du fragst:** "Ich brauche ein Headerbild für einen Artikel über Remote Work"

**Die KI:**
- Generiert Bildvarianten. Nicht zufrieden? "Weniger Stock-Foto, mehr illustrativ" und sie iteriert
- Galerie-Ansicht mit allen Versionen. Zwei Bilder kombinieren geht auch

**Involvierte Tools:** `generate_image`

### Website-Analyse (agentisches Zusammenspiel)

**Du fragst:** "Schau dir mal die Website meines Kunden an und sag mir was auffällt"

**Die KI:**
- Ruft die Seite ab, liest den Inhalt, analysiert Struktur und Messaging
- Extrahiert bei Bedarf das Branding (Farben, Fonts, Bildsprache) als Grundlage für weitere Arbeit
- Kann von dort aus weiterarbeiten: SEO-Analyse starten, Verbesserungsvorschläge als Dokument erstellen oder direkt einen Redesign-Entwurf generieren

**Involvierte Tools:** `web_fetch`, `extract_branding`, `create_artifact`, `generate_design`

### Session-Zusammenfassung

**Du fragst:** "Fass das Gespräch als Action Items zusammen"

**Die KI:**
- Analysiert den gesamten Chat und erstellt eine priorisierte Tabelle. Als Dokument oder als Audio für unterwegs

**Involvierte Tools:** `create_artifact` oder `text_to_speech` (je nach gewähltem Format)

### Video-Analyse

**Du fragst:** "Findest du ein gutes YouTube-Video zu dem Thema?"

**Die KI:**
- Durchsucht YouTube, zeigt Ergebnisse mit Thumbnails. Du wählst ein Video
- Die KI analysiert das Video multimodal (Transkript + Visuelles) und fasst die Kernaussagen zusammen

**Involvierte Tools:** `youtube_search`, `youtube_analyze`

---

## Warum eine eigene Plattform

### Intro-Tonalität

Nicht gegen andere Tools argumentieren. Aus der Ich-Perspektive sprechen. Claude und Gemini sind hervorragend. Diese Plattform vereint das Beste aus beiden und ergänzt es um das, was in der Praxis gefehlt hat.

### Sechs Argumente

**1. Integrierte Werkzeuge für den ganzen Arbeitsalltag**
Recherchieren, gestalten, schreiben und analysieren an einem Ort. 21 Werkzeuge die die KI autonom einsetzt wenn die Aufgabe es erfordert. Bildgenerierung, YouTube-Analyse, Google Search Grounding, UI-Design-Generierung.

**2. Spezialisierte Experten für unterschiedliche Aufgaben**
Ich arbeite anders wenn ich Code schreibe als wenn ich einen Blogpost formuliere. Spezialisierte Experten mit eigener Temperatur, eigenen Skills und eigenem Tool-Zugang. Plus die Möglichkeit eigene zu erstellen.

**3. Geführte Eingaben für wiederholbare Qualität**
Quicktasks: Formular ausfüllen, absenden, qualitätsgesichertes Ergebnis. Das Prompt-Engineering steckt im System. Wiederholbar, konsistent, und jeder im Team kann sie nutzen.

**4. Flexibles Output-System**
Artifacts als eigenständige Outputs: HTML, Code, Bilder, Audio, UI-Designs, Office-Dokumente. Auch im Chat selbst passt sich die Darstellung dem Inhalt an — Rückfragen als Auswahlfelder, YouTube-Ergebnisse mit Thumbnails, Varianten als Tabs.

**5. Eingebauter Datenschutz**
Automatische PII-Erkennung vor dem Senden. Maskierung, EU-Modell-Routing oder lokale Verarbeitung. Jede Entscheidung wird protokolliert.

**6. Kontext der mitwächst**
Persistentes Memory, Projekt-Kontext und Custom Instructions. Drei Mechanismen die zusammenarbeiten, damit nicht jeder Chat bei null startet.

### Persönliche Motivation (sekundär, nicht prominent)

**Kompetenz:** Als KI-Berater verstehen wie agentische Systeme funktionieren. Nicht aus Blogposts, sondern aus eigener Entwicklung.

**Kundenlücke:** Viele Unternehmen haben noch keine KI-Infrastruktur und brauchen etwas Konfigurierbares für den Einstieg oder die Zeit der Begleitung.

---

## Deployment-Kommunikation

### Faustregel

Je mehr Datensouveränität, desto weniger externe Werkzeuge. Der Kern — Chat, Experten, Skills, Projekte, Artifacts, Memory, Datenschutz — funktioniert in jedem Modus.

### Drei Modi

| Modus | Versprechen | Einschränkung |
|-------|-------------|---------------|
| **Cloud** | Voller Funktionsumfang, alle 21 Tools | — |
| **EU-Only** | Kein US-Datenfluss, DSGVO | Kein Google Grounding, kein Gemini TTS/Bilder |
| **Self-Hosted** | Maximale Datensouveränität, Air-Gapped möglich | Keine Websuche, kein YouTube, keine externen APIs |

### Multi-Instanz (ohne eigene Brands nennen)

Eine Codebase, beliebig viele Instanzen. Eigenes Branding, eigene Domain, eigene Features, eigene Datenbank. 21 Feature-Flags steuern granular was aktiv ist.

---

## Call-to-Action

Zwei gleichwertige CTAs:

**Ausprobieren:** Geschlossene Beta. Kein Sales-Call, kein Funnel. Freischaltung und ausprobieren.

**Mitbauen:** Bisher Solo-Projekt. Technologie steht. Entwickler, Designer, Product-Leute gesucht die am Problem interessiert sind.

---

## Tonalität-Regeln für die Landing Page

- Aus der Ich-Perspektive sprechen, nicht aus der Unternehmens-Perspektive
- Keine Vergleiche mit anderen Tools ("das kann Claude nicht")
- Keine KI-Buzzwords (revolutionär, Game-Changer, next-level)
- Keine Superlative (das beste, das einzige)
- Features über konkrete Situationen zeigen, nicht über Feature-Listen
- Ehrlich über Einschränkungen sein (Self-Hosted = weniger Tools)
- Direkt, kein Bullshit. Konstruktiv, nicht weich
