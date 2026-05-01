# Vorschlag: SAVA-Expert-Familie für build.jetzt

> **Adressat:** Rico Loschke
> **Erstellt:** 2026-04-30, build-jetzt-Agent
> **Phase:** 1 (Analyse + Vorschlag, kein Code)
> **Vorgänger:** `docs/ideas/sava-experts-briefing.md`

---

## 1. Kontext

Der MCP-Server `sava-agent-context` ist live in build.jetzt registriert (Hub: `mcp.loschke.ai`, 7 Tools, 4 davon heute funktionsfähig — `kb_search` & Co warten 24–72h auf GitHub-Indexing). Der SAVA-Korpus (~50 Markdown-Files) deckt Mission, Framework, AOK-Kontext, Architektur, Kommunikation, Methodik und das Pilotprojekt Pflegeassistent ab.

Ohne Experten-Framing müssten Nutzer bei jeder Frage selbst entscheiden, in welchen Folder sie greifen. Die Familie aus 1 Generalist + 3 Spezialisten verlagert diese Routing-Logik vom Nutzer in den System-Prompt — und macht spätere Erweiterungen (z.B. weitere Pilotprojekte) zu einem reinen Seed-File.

---

## 2. Designentscheidungen

### 2.1 Scope-Restriktion: System-Prompt-only, NICHT Tool-Allowlist

Die 7 `kb_*` Tools sind allesamt Read-Only-Knowledge-Access. Keine Teilmenge mappt auf einen Folder-Scope. Tool-Allowlist pro Spezialist würde nur N quasi-identische MCP-Server-Registrierungen erzwingen, ohne realen Restriktions-Effekt.

**Entscheidung:** Alle SAVA-Experten bekommen identisches Toolset und identische `mcpServerIds: ["sava-agent-context"]`. Spezialisierung lebt **ausschließlich im System-Prompt** (Pfad-Fokus + Verweis auf Geschwister-Experten außerhalb des Bereichs).

Konsequenz: Ein neuer Spezialist später = ein neues Seed-File, keine MCP-Server-Mutation.

### 2.1.1 Internes Tooling bleibt vollständig verfügbar

`mcpServerIds` filtert **nur** MCP-Server, nicht interne Tools. Solange `allowedTools: []` (Default, also nicht gesetzt) bleibt, behalten die SAVA-Experten Zugriff auf die volle build.jetzt-Toolbox:

- **Klärung & Output:** `ask_user`, `content_alternatives`, `create_artifact` (markdown/html/code), `create_review`, `create_quiz`
- **Externe Recherche:** `web_search`, `web_fetch`, `deep_research`, `youtube_search`, `youtube_analyze`
- **Wissen MCP:** `kb_list_tree`, `kb_read_file`, `kb_read_multiple`, `kb_get_frontmatter` (heute) + `kb_search`, `kb_filter_by_frontmatter`, `kb_find_backlinks` (sobald indexiert)
- **Sonstige:** `generate_image`, `text_to_speech`, `save_memory`, `load_skill`

Sinnvolles Zusammenspiel: SAVA-Korpus als **Primärquelle**, externe Tools für **Ergänzung & Output** — z.B. `ask_user` für Methodik-Discovery, `web_search` wenn der Korpus eine Lücke hat ("Wie lösen andere Krankenkassen das?"), `create_artifact` für Konzept-Drafts und Pflegeassistent-Coaching-Dokumente.

Code-Beleg: `src/app/api/chat/build-tools.ts` + `src/lib/ai/CLAUDE.md` ("Expert `allowedTools` filtert die finale Tool-Liste. Leer = alle.").

### 2.2 Familienzuschnitt: 1 + 3 (nach Triage mit Rico)

Die initiale Hypothese im Briefing nannte 5 Spezialisten. Nach Rücksprache:

- **Generalist → SAVA Mission Expert** — Vollzugriff = ganze Mission AOK Sachsen-Anhalt.
- **Framework + Architektur zusammen → SAVA Agent Expert** — `01_Framework/` ist generisches Agent-Modell, `03_SAVA-Architektur/` füllt es mit SAVA-Spezifika. Beides zusammen ergibt das konkrete SAVA-Agent-Modell. Trennung wäre artifiziell.
- **Methodik bleibt eigenständig → SAVA Methodik Buddy** — Phase-0-Discovery für *neue* Projekte. Andere Konversationsdynamik (sokratisch, offen) als Architektur-Erklärung.
- **Pflegeassistent eigenständig → Pflegeassistent Coach** — Begleitung durch das laufende Pilotprojekt. "Mehr als Konzept" — Coaching-Framing.
- **Kommunikator vertagt** — gehört nicht in diese Familie. Eher ein queo-interner Beratungsexperte (Hilfe bei Formulierungen, Präsentationen, Konzepten *für den Kunden*), braucht eigenes Drumrum (Voice-Bausteine, Templates), nicht nur SAVA-Korpus-Lookup. Eigenes Folge-Briefing.
- **AOK-Kontext-Lotse entfällt** — mit Agent Expert jetzt auf `03_SAVA-Architektur/` ausgedehnt und Pflegeassistent-Coach mit `02_AOK-Kontext`-Bezug ist die separate Lotse-Rolle redundant.

### 2.3 Naming-Konvention

| Suffix     | Wann                         | Begründung                              |
| ---------- | ---------------------------- | --------------------------------------- |
| **Expert** | Mission Expert, Agent Expert | Wissensbreite, Auskunft, Erklärung      |
| **Buddy**  | Methodik Buddy               | Sokratische Begleitung in offener Phase |
| **Coach**  | Pflegeassistent Coach        | Aktive Projekt-Begleitung über Zeit     |

`sava-`-Prefix als Familien-Marker im Slug. Erkennbar in der Admin-UI und in Sidebar-Listen.

---

## 3. Expert-Taxonomie

| #   | Name                  | Slug                         | Zielgruppe                                                                                              | Scope-Fokus (Pfade)                                                                     | `mcpServerIds`           | Modell            | sortOrder |
| --- | --------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------ | ----------------- | --------- |
| 1   | SAVA Mission Expert   | `sava-mission-expert`        | Wer den Überblick braucht: Stakeholder, neue Teammitglieder, Quereinsteiger                             | alle Folder, `scope: mission` + `scope: projekt:*`                                      | `["sava-agent-context"]` | (offen, siehe §7) | 20        |
| 2   | SAVA Methodik Buddy   | `sava-methodik-buddy`        | Wer ein **neues** SAVA-Projekt startet und Phase-0-Discovery braucht                                    | `05_Methodik/`                                                                          | `["sava-agent-context"]` | (offen)           | 21        |
| 3   | SAVA Agent Expert     | `sava-agent-expert`          | Wer das SAVA-Agent-Modell verstehen oder erweitern will (Architektur, Bausteine, Generik vs. Spezifika) | `01_Framework/` + `03_SAVA-Architektur/`                                                | `["sava-agent-context"]` | (offen)           | 22        |
| 4   | Pflegeassistent Coach | `sava-pflegeassistent-coach` | Wer am Pilotprojekt Pflegeassistent arbeitet (Konzeption, Iteration, Entscheidungen)                    | `90_Projekte/Pflegeassistent/` mit Bezug auf `02_AOK-Kontext/` + `03_SAVA-Architektur/` | `["sava-agent-context"]` | (offen)           | 23        |

`sortOrder 20+`: positioniert die SAVA-Familie hinter den Allzweck-Experten (general=0, lernbegleiter=1, code=1, analyst=3, …, writer=5). SAVA bleibt thematisch gebündelt am Ende der Liste.

### Slug-Constraint-Check

Validation: `^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]{1,2}$`, max 80 Zeichen. Längster Slug: `sava-pflegeassistent-coach` (26). Alle ✓.

`mcpServerIds`-Item-Length: max 21 chars. `sava-agent-context` = 18. ✓

---

## 4. Begründung pro Experte — wann statt Generalist?

### 4.1 SAVA Mission Expert

**Wann:** "Was ist SAVA?", "Welche Stakeholder?", "Wie hängen Mission und Pilotprojekt zusammen?"
**Statt Generalist:** Ist hier sogar identisch mit dem Generalisten. Der Mission Expert *ist* der Generalist — mit explizitem Routing-Wissen über die anderen drei.

### 4.2 SAVA Methodik Buddy

**Wann:** Neues Projekt startet. Discovery-Workshops, Stakeholder-Mapping, Use-Case-Findung. Offene, generative Phase.
**Statt Mission Expert:** Andere Dialogform. Nicht "erkläre", sondern "stelle die richtigen Fragen". Sokratisch, geduldig, methodisch. Würde im Mission-Expert-Prompt verwässern, weil dort Erklär-Modus dominiert.

### 4.3 SAVA Agent Expert

**Wann:** "Wie funktioniert das Agent-Modell?", "Was unterscheidet die SAVA-Architektur vom generischen Framework?", "Welche Bausteine gibt es?"
**Statt Mission Expert:** Tiefer Korpus-Bezug, dauerhaft beim Architektur-Lernen. Mission Expert gibt Übersicht; Agent Expert geht ins Detail und macht das Generik-vs-Spezifika-Mapping zur Routine.

### 4.4 Pflegeassistent Coach

**Wann:** Wer aktiv am Pflegeassistent-Projekt arbeitet — Iteration, Reviews, Entscheidungs-Sparring.
**Statt Mission Expert:** Projekt-zentriert. Liest defaultmäßig `90_Projekte/Pflegeassistent/`, nicht den ganzen Korpus. Nimmt sich beim Verweis auf AOK-Kontext oder SAVA-Architektur die Mühe, die Verbindung zum aktuellen Projektstand zu ziehen — nicht abstrakt zu erklären.

---

## 5. System-Prompt-Skizzen

> Skizzen, keine fertigen Prompts. Ausformulierung in Phase 2 mit voller Tools-Sektion analog zu bestehenden Seeds.

### 5.1 SAVA Mission Expert (`sava-mission-expert`)

```
Du bist Vollzugriff-Experte für die SAVA-Mission (AOK Sachsen-Anhalt).
Du gibst Überblick und routest gezielt — nicht jede Frage gehört zu dir.

## Prinzipien
- Du nutzt ausschließlich Inhalte aus dem MCP-Server `sava-agent-context`.
  Ohne Korpus-Beleg sagst du es. Keine Halluzinationen.
- Du belegst Aussagen mit Pfad-Verweis ("aus `03_SAVA-Architektur/...`").
- Du trennst Mission-Wissen (`scope: mission`) von Projekt-Wissen
  (`scope: projekt:*`) wenn relevant.

## Routing — wann verweist du weiter?
- Phase-0-Discovery für neues Projekt → SAVA Methodik Buddy
- Tiefe Architektur-/Framework-Fragen → SAVA Agent Expert
- Konkrete Pflegeassistent-Arbeit → Pflegeassistent Coach

## Vorgehen
Bei jeder neuen Frage: `kb_list_tree` (Wurzel) → Pfade identifizieren →
`kb_read_multiple` für die passenden Files. Sobald `kb_search` Treffer
liefert (Hub indexiert nach 24–72h): ab dann primär `kb_search`.
```

### 5.2 SAVA Methodik Buddy (`sava-methodik-buddy`)

```
Du begleitest Phase-0-Discovery für neue SAVA-Projekte.
Du fragst, bevor du erklärst.

## Prinzipien
- Sokratisch: zuerst Fragen stellen, dann Methode anbieten.
  Discovery ist offen — keine vorzeitige Lösung.
- Du arbeitest aus `05_Methodik/`. Andere Folder nur, wenn der Nutzer
  explizit Verbindungen ziehen will.
- Du machst Methodik praktisch: kein abstraktes Framework-Geplänkel,
  sondern "Was wäre der nächste konkrete Schritt?"

## Vorgehen
1. `kb_list_tree` auf `05_Methodik/` — Bausteine kennen
2. Verstehen, wo der Nutzer im Discovery-Prozess steht
3. Passenden Methodik-Baustein per `kb_read_file` öffnen, durcharbeiten

## Außerhalb deines Bereichs
Architektur-/Framework-Fragen → SAVA Agent Expert. Übersicht zur
Mission → SAVA Mission Expert. Pflegeassistent-spezifisch → Coach.
```

### 5.3 SAVA Agent Expert (`sava-agent-expert`)

```
Du erklärst das SAVA-Agent-Modell: das generische Framework und seine
konkrete SAVA-Ausprägung. Du machst beides zugänglich und zeigst, wo
sie sich treffen.

## Prinzipien
- Pfad-Fokus: `01_Framework/` (Generik) und `03_SAVA-Architektur/`
  (SAVA-Realität). Andere Folder nur als Quer-Verweis.
- Triade-Pattern: bei "wie funktioniert X"-Fragen erst Framework-Konzept
  zeigen, dann SAVA-Spezifika gegenüberstellen, dann Synthese.
- Du erfindest keine Architektur-Bausteine. Was nicht im Korpus steht,
  benennst du als Lücke — das ist eine wertvolle Aussage.

## Vorgehen
`kb_list_tree` auf `01_Framework/` UND `03_SAVA-Architektur/` →
relevante Files via `kb_read_multiple` parallel lesen. Bei großen Files
zuerst `kb_get_frontmatter` zur Triage.

## Außerhalb deines Bereichs
Discovery / Methodik → Methodik Buddy. Pflegeassistent-Konkretes →
Coach. Mission-Übersicht → Mission Expert.
```

### 5.4 Pflegeassistent Coach (`sava-pflegeassistent-coach`)

```
Du begleitest das Pilotprojekt Pflegeassistent durch alle Phasen.
Du coachst — du konzipierst nicht für den Nutzer.

## Prinzipien
- Coaching-Modus: Sparring, Strukturierung, Entscheidungen vorbereiten.
  Du nimmst Arbeit nicht ab, du machst sie verhandelbar.
- Primär-Korpus: alle Files mit `domain: pflege` (Projekt-Inhalt) und
  `domain: aok` (AOK-weite Stammdaten). Cross-Lookup via Pfad-Prefix
  `03_SAVA-Architektur/` für Modell-Bezüge bei aktuellen Designfragen.
- Du beziehst dich auf den aktuellen Projektstand, nicht auf abstrakte
  Theorie. Was steht heute? Was ist offen?

## Vorgehen
Quick-Path sobald `kb_filter_by_frontmatter` produktiv ist:
`{ field: "domain", op: "in", value: ["pflege", "aok"] }` zieht
projekt-spezifischen Inhalt + AOK-Stammdaten in einem Aufruf.
Bis dahin: `kb_list_tree` auf `90_Projekte/Pflegeassistent/` zu Beginn
jeder neuen Anfrage → Stand verstehen. Quer-Lesen in `02_AOK-Kontext/`
oder `03_SAVA-Architektur/` nur dort, wo der Nutzer die Verbindung
anstößt.

## Außerhalb deines Bereichs
Generisches Framework → SAVA Agent Expert. Discovery für *anderes*
Projekt → Methodik Buddy.
```

---

## 6. Tool-Strategie

### 6.1 Heute funktionsfähig — Pfad-Heuristik

Solange `kb_search`, `kb_filter_by_frontmatter` und `kb_find_backlinks` durch GitHub-Indexing-Lag (24–72h) Null-Treffer liefern, hängt alles an:

1. **`kb_list_tree`** auf den eigenen Scope-Root (Generalist: Wurzel)
2. Pfad-Heuristik via sprechende Filenames (SAVA-Konvention)
3. **`kb_read_multiple`** für mehrere relevante Files in einem Rutsch — günstiger als N × `kb_read_file`
4. **`kb_get_frontmatter`** für Triage großer Files vor dem Volllesen

**Wichtige Folgerung:** Spezialisten mit engem Folder-Fokus haben **kleineren Suchraum** und tragen die Pfad-Heuristik länger und verlässlicher als der Mission Expert. Das ist ein zusätzliches Argument für die Familie *gerade jetzt*, vor dem Indexing-Switch.

### 6.2 Sobald `kb_search` live ist

Im System-Prompt aller vier Experten als bedingte Anweisung formuliert:

> *"Wenn `kb_search` Treffer liefert (Hub indexiert nach 24–72h), nutze es als primären Einstieg. Bis dahin Pfad-Heuristik via `kb_list_tree`."*

Dadurch ist kein Re-Seed nötig, wenn die Indexierung läuft — die Experten schalten von selbst um.

### 6.3 SAVA-Repo-Anpassung (mit Rico-Freigabe erfolgt)

Die Scope-Map (`sava-agent-context/00_Mission/Scope-Map.md`) kannte vor der Familie nur zwei Konsumenten-Typen — "Mission-only" und "Projekt-Konsument". Drei der vier SAVA-Experten waren darin nicht abgebildet (Vollzugriff-Konsument fehlte komplett, Sub-Mission-Pattern für Methodik-Buddy/Agent-Expert war undokumentiert). Außerdem trug `90_Projekte/Pflegeassistent/*` `domain: sava`, womit der Pflegeassistent-Coach keinen sauberen Frontmatter-Filter auf "Projektinhalt + AOK-Stammdaten" hatte. Mit Rico-Go heute angepasst:

1. **`02_AOK-Kontext/*` umgestellt** auf `domain: aok` (vorher `domain: sava`). Betrifft `ABOUT_AOK-SAN.md` und `STAMMBLATT_AOK-SAN.md`. Bedeutung: AOK-weite Stammdaten, projektübergreifend gültig.
2. **`90_Projekte/Pflegeassistent/*` umgestellt** auf `domain: pflege` (vorher `domain: sava`). Betrifft 5 Files (`Steckbrief.md`, `Use-Case-Bewertung.md`, `Intentions-Mining.md`, `Daten-Inventar.md`, `_MOC-Pflegeassistent.md`). Damit hat das Pilotprojekt einen eigenen Schlagwort-domain-Wert; der Coach filtert via `kb_filter_by_frontmatter({ domain: { in: ["pflege", "aok"] }})` Projektinhalt + AOK-Stammdaten in einem Aufruf.
3. **`domain` als offene Liste deklariert** — Konvention erweitert: jedes Projekt unter `90_Projekte/` bekommt einen eigenen Schlagwort-domain-Wert (heute `pflege`, später z. B. `schwangerschaft`, `diabetes`, `reha`). README-Frontmatter-Schema entsprechend angepasst (`domain: <ai-agents|sava|aok|<projekt>>`). `domain: sava` wird damit auf den projekt-übergreifenden SAVA-Mission-Kern reduziert (Mission, Architektur, Kommunikation, Methodik).
4. **Scope-Map erweitert** um (a) `domain` als dokumentierte Filter-Achse mit Folder-Mapping inkl. neuer Werte, (b) Vollzugriff-Konsument als dritten Grundtyp, (c) explizites Sub-Mission-Konsumenten-Pattern (scope-Filter + domain ODER Pfad-Prefix), (d) Beispiel-Mapping-Tabelle der vier SAVA-Experten als erste produktive Konsumentengruppe, (e) Hinweis auf `domain`-Mehrwertigkeit als technisch erlaubt aber heute nicht produktiv.

Damit ist die Scope-Map nicht stille-Post-Übergabe sondern living document, das die Familie reflektiert. Künftige Konsumenten erweitern die Tabelle direkt — und künftige AOK-Teilprojekte bekommen ihre eigene domain ohne Konventions-Drift.

### 6.4 Was wird **nicht** getan

- **Kein eigenes Tool-Schema gebaut.** Tool-Allowlist bleibt am MCP-Server-Eintrag (`seeds/mcp-servers/sava.md`) — heute null Restriktion, alle 7 Tools verfügbar.
- **Kein Hub-Tooling-Wunsch geäußert.** Falls in Tests etwas fehlt, separat mit Rico besprechen.
- **Keine weiteren SAVA-Inhaltsänderungen** über die zwei oben genannten Files hinaus. Inhalt bleibt Eingabe.

---

## 7. Offene Fragen an Rico

### 7.1 Modellwahl

Soll für die SAVA-Familie ein bestimmtes Modell vorgegeben werden (`modelPreference`)? Default-Vorschlag: **leer lassen** — User-Default greift, identisch zum Verhalten aller anderen build.jetzt-Experten. Pricing-neutral, keine Überraschung in der Credits-Abrechnung.

### 7.2 Voice-Konsistenz

Die Skizzen folgen der bestehenden Konvention (Du-Form, Sektionen Prinzipien / Tools / Vorgehen / Grenzen, Klartext-Voice). Sollten SAVA-Experten *zusätzlich* etwas Eigenes haben — z.B. festen Eröffnungssatz "Ich antworte aus dem SAVA-Korpus" als Transparenz-Marker?

### 7.3 Temperature

Default-Vorschlag: **0.4** für alle vier (zwischen `analyst: 0.3` und `general: 0.5`). Wissensbasiert, nicht kreativ. Methodik Buddy könnte argumentativ höher (0.5) sein, weil offener Dialog. Eher uniform halten und später iterieren?

### 7.4 Pricing-Klassifizierung

Ohne `modelPreference`-Override fällt die Familie in den Default-Tier — keine separate Kategorisierung nötig. Falls später Opus für Coach gewünscht: Rückfrage.

### 7.5 Kommunikator als Folge-Briefing

Bestätigung, dass der Kommunikator **nicht** in dieser Session entsteht, sondern als eigenständiger queo-interner Beratungsexperte später separat designt wird. Dort dann mit eigenem Drumrum (Voice-Bausteine, Templates), eventuell ohne SAVA-Korpus-Bezug.

### 7.6 isPublic

Alle vier Experten als globale `isPublic: true` (Standard für `seeds/`-Definierte). OK so?

---

## 8. Nächste Schritte (nach Approval dieses Vorschlags)

### Phase 2 — Implementation

1. **4 Seed-Files anlegen** unter `seeds/experts/sava-*.md`:
   
   - `sava-mission-expert.md`
   - `sava-methodik-buddy.md`
   - `sava-agent-expert.md`
   - `sava-pflegeassistent-coach.md`
   
   Format: Frontmatter (Name, Slug, Description, Icon, skillSlugs, temperature, mcpServerIds, sortOrder, isPublic) + System-Prompt als Body. Vorbild: existierende Files in `seeds/experts/`. Voll ausformulierte Prompts (~80–150 Zeilen pro Datei) mit allen Sektionen analog zu bestehenden Experten.

2. **Seeden:** `pnpm db:seed` (Idempotent via `upsertExpertBySlug`). Konsole sollte `+ SAVA Mission Expert (sava-mission-expert) -> <id>` für alle vier zeigen.

3. **Verifikation in der Admin-UI:**
   
   - `/admin/experts` listet alle vier
   - sortOrder korrekt (20–23, hinter den Allzweck-Experten)
   - MCP-Server-Zuweisung sichtbar (`sava-agent-context` ✓)
   - In der Chat-Sidebar als auswählbare Experten verfügbar

4. **Icon-Auswahl** (Lucide-Names): Vorschlag — `Compass` (Mission Expert), `Lightbulb` (Methodik Buddy), `Cog` (Agent Expert), `HeartHandshake` (Pflegeassistent Coach). In Phase 2 final festlegen.

### Phase 3 — Empirisch testen

Pro Experte 2–3 typische Domain-Fragen stellen (echte Konversationen via build.jetzt-UI):

- **Mission Expert:** "Worum geht's bei SAVA?" / "Wer sind die Stakeholder?" / "Wie hängt der Pflegeassistent zur Mission?"
- **Methodik Buddy:** "Ich starte ein neues KI-Projekt bei AOK — wo fangen wir an?"
- **Agent Expert:** "Erklär mir das SAVA-Agent-Modell." / "Was unterscheidet das Framework von der SAVA-Architektur?"
- **Pflegeassistent Coach:** "Welche offenen Fragen hat das Pflegeassistent-Projekt aktuell?"

Beobachten:

- Welche `kb_*`-Tools werden gerufen, in welcher Reihenfolge?
- Werden die richtigen Files gelesen?
- Antworten-Qualität gegen den hinterlegten Inhalt plausibel?
- Tool-Latenz im Korridor (kalt 1–2s, warm <500ms)?
- Routing-Verhalten: Verweisen die Experten korrekt auf Geschwister, wenn die Frage außerhalb ihres Bereichs liegt?

Kurz-Report nach `docs/ideas/sava-experts-test-report.md`. Bei Schwächen: System-Prompts iterieren, neuer `pnpm db:seed`-Lauf (idempotent).

### Was in Phase 2/3 NICHT passiert

- Keine Änderung am MCP-Hub (`loschke-mcp-hub`)
- Keine *weiteren* Änderungen am SAVA-Inhalt (`sava-agent-context`) über die zwei in §6.3 dokumentierten Anpassungen hinaus
- Keine neuen Felder am Expert-Schema
- Keine Hardcodes von SAVA-Logik im Core-Code
- Kein Modell-Switch ohne explizite Rückfrage

---

## 9. Stop-Punkt

Dieser Vorschlag wartet auf Rico-Freigabe. Phase 2 erst nach explizitem Go.

Bei Rückfragen oder gewünschten Anpassungen: lieber jetzt iterieren als Phase 2 mit unscharfer Basis starten.
