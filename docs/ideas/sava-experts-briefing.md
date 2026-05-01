# Briefing: SAVA-Expert-Familie in build.jetzt

> **Adressat:** Claude Code Agent in `build-jetzt/`.
> **Auftraggeber:** Rico Loschke.
> **Erstellt:** 2026-04-30 vom Hub-Bau-Agent.
> **Goal:** Eine Expert-Familie designen und implementieren, die das SAVA-MCP-Wissen adressatengerecht ausspielt — Generalist plus Spezialisten.

---

## 1. Kontext: Was steht schon

- **`mcp.loschke.ai`** läuft live (Vercel + Custom Domain). Hub-Code: `github.com/loschke/loschke-mcp-hub`.
- **MCP-Server `sava-agent-context`** ist in build.jetzt registriert via `seeds/mcp-servers/sava.md`. Admin-UI zeigt 7 Tools, Health-Check grün.
- **SAVA-Inhalt**: `github.com/loschke/sava-agent-context` (private). ~50 Markdown-Files, frontmatter-getaggt mit `scope` (`mission` oder `projekt:<name>`) und `domain`. Folder-Struktur:
  - `00_Mission/` — Vision, Stakeholder, Glossar (`scope: mission`)
  - `01_Framework/` — generisches Agent-Modell (`scope: mission, domain: ai-agents`)
  - `02_AOK-Kontext/` — AOK-Stammdaten (`scope: mission, domain: aok`)
  - `03_SAVA-Architektur/` — generisches Modell × AOK-Realität (`scope: mission`)
  - `04_Kommunikation/` — Wording + Transparenz (`scope: mission`)
  - `05_Methodik/` — Phase-0-Discovery-Bausteine (`scope: mission`)
  - `90_Projekte/Pflegeassistent/` — erstes Pilot-Projekt (`scope: projekt:pflegeassistent`)
- **Tool-Prefix in Konversationen:** `sava-agent-context__` (z.B. `sava-agent-context__kb_read_file`).
- **Working today:** `kb_list_tree`, `kb_read_file`, `kb_get_frontmatter`, `kb_read_multiple`.
- **Waiting on GitHub-Indexing (24–72h):** `kb_search`, `kb_find_backlinks`, `kb_filter_by_frontmatter`. Diese liefern aktuell `total: 0` — kein Bug, GitHub indexiert frische Private-Repos verzögert.

## 2. Ziel dieser Session

Eine Expert-Familie für build.jetzt mit Mischung aus:

- **1–2 Generalisten** mit Vollzugriff auf den ganzen SAVA-Scope
- **3–5 Spezialisten** mit System-Prompt-Framing auf einen Teilbereich (Folder oder `scope`-Wert) plus ggf. `enabledTools`-Restriktion auf dem MCP-Server-Eintrag

Spezialisten-Hypothesen (nicht final, in Phase 1 zu validieren):

- SAVA-Framework-Coach (`01_Framework/`)
- Pflegeassistent-Konzepter (`90_Projekte/Pflegeassistent/` + `scope: mission`)
- AOK-Kontext-Lotse (`02_AOK-Kontext/`, `03_SAVA-Architektur/`)
- SAVA-Methodik-Buddy (`05_Methodik/` für neue-Projekt-Discovery)
- SAVA-Kommunikator (`04_Kommunikation/`)

## 3. Pflichtlektüre vor Code

In dieser Reihenfolge:

1. `CLAUDE.md` — build.jetzt-spezifische Conventions
2. `src/lib/db/schema/experts.ts` — Expert-DB-Schema, alle Felder
3. `src/lib/validations/expert.ts` — Zod-Constraints
4. `seeds/experts/` — alle bestehenden Expert-Seed-Files als Vorbild
5. `src/lib/db/seed/seed-experts-from-md.ts` — wie das Seeding funktioniert
6. `src/config/mcp.ts` — `getActiveMCPServersForExpert(mcpServerIds)`-Filter
7. `seeds/mcp-servers/sava.md` — der schon registrierte MCP-Server-Eintrag

Externe Read-only-Referenzen:

- `github.com/loschke/sava-agent-context` — Scope-Konvention im `_MOC.md`, Folder-Struktur als Spezialisierungsraum
- `github.com/loschke/loschke-mcp-hub/blob/main/README.md` — Tool-Beschreibungen + Sicherheitsgarantien

## 4. Phasen (bindend)

### Phase 1 — Analyse + Vorschlag (KEIN Code)

Schreibe `docs/ideas/sava-experts-proposal.md` mit:

- **Expert-Taxonomie als Tabelle:** Name · serverId-fähiger Slug · Zielgruppe · Scope-Fokus (Folder + `scope`-Wert) · Modell-Wahl · `enabledTools` (oder `null` für alle) · Voice-Hinweis
- **Begründung pro Experte:** Was unterscheidet ihn vom Nachbarn? Wann würde Rico ihn statt einen Generalisten wählen?
- **System-Prompt-Skizze pro Experte:** 6–12 Zeilen, mit Scope-Anweisung wie *"Du nutzt ausschließlich Inhalte aus dem MCP-Server `sava-agent-context`. Fokussiere dich auf Pfade unter `01_Framework/`. Falls eine Frage außerhalb deines Bereichs liegt, verweise auf den SAVA-Generalisten."*
- **Tool-Strategie:** wann welche `kb_*`-Tools — insbesondere: was tun, solange `kb_search`/`kb_filter_by_frontmatter` noch 0 Hits liefern? Empfohlener Fallback: `kb_list_tree` + Pfad-basiertes Heuristik-Browsing
- **Offene Fragen** an Rico: Modellwahl, Voice-Konsistenz mit anderen build.jetzt-Experten, Pricing-Klassifizierung

**Stop-Punkt.** Diesen Vorschlag Rico zur Freigabe vorlegen. Keine Seed-Files schreiben, keine DB-Inserts. Erwarte Iteration.

### Phase 2 — Implementation (nach Rico-OK auf Phase 1)

Pro freigegebener Expert-Definition:

- Seed-Markdown unter `seeds/experts/sava-<slug>.md` nach dem Muster bestehender Experten
- `pnpm db:seed` (oder isolierter Aufruf wie wir's für MCP-Server gemacht haben — siehe Code-Vorbild in `src/lib/db/seed/seed-experts-from-md.ts`)
- Verifizierung in der Admin-UI

### Phase 3 — Empirisch testen

Pro Experte 2–3 typische Domain-Fragen stellen. Beobachten:

- Welche `kb_*`-Tools werden gerufen, in welcher Reihenfolge?
- Werden die richtigen Files gelesen?
- Antworten-Qualität gegen den hinterlegten Inhalt plausibel?
- Tool-Latenz im Korridor (kalt 1–2s, warm <500ms)?

Kurz-Report `docs/ideas/sava-experts-test-report.md` an Rico.

## 5. Was du NICHT tun sollst

- **Keine Änderungen am MCP-Hub** (`loschke-mcp-hub`-Repo). Falls dir was fehlt im Tool-Set: stoppen, mit Rico besprechen, nicht eigenmächtig erweitern.
- **Keine Änderungen am SAVA-Inhalt** (`sava-agent-context`-Repo). Inhalt ist Eingabe, nicht Konfig.
- **Keine neuen Felder am Expert-Schema** ohne explizite Notwendigkeit. Bestehende Felder + `mcpServerIds` + System-Prompt + `enabledTools` auf MCP-Server-Ebene reichen für Scope-Restriktion.
- **Keine Hardcodes von SAVA-spezifischer Logik in den Core-Code.** SAVA-Spezifika gehören in die Expert-Definitionen.
- **Keine echten Modell-Switches** (z.B. von Sonnet auf Opus für teure Experten) ohne Rico-Rückfrage. Pricing-Implikationen.

## 6. Konstanten (eine Schreibweise überall)

| Bezug | Wert |
|---|---|
| MCP-Server-ID | `sava-agent-context` |
| Tool-Prefix in LLM-Konversationen | `sava-agent-context__` |
| Hub-URL | `https://mcp.loschke.ai/mcp/sava-agent-context` |
| ENV-Var-Gate (build.jetzt) | `SAVA_MCP_TOKEN` |
| SAVA `scope`-Werte (Stand heute) | `mission`, `projekt:pflegeassistent` |
| SAVA `domain`-Werte (Stand heute) | `ai-agents`, `sava`, `aok` |

## 7. Was Rico am Ende der Session sieht

1. `docs/ideas/sava-experts-proposal.md` (Phase 1)
2. N neue Files unter `seeds/experts/sava-*.md` (Phase 2)
3. `docs/ideas/sava-experts-test-report.md` (Phase 3)

Bei Unklarheit: stoppen und Rückfrage stellen. Lieber 5min Klärung als 30min Reverse-Engineering.

---

*Briefing geschrieben vom Hub-Bau-Agent am 2026-04-30. Bei Hub-internen Fragen: dort weitermachen, nicht hier.*
