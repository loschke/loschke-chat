# Claude Agent Teams — Guide & Referenz

> Interne Referenz fuer Claude Code. Beschreibt wann und wie Agent Teams effizient und sicher eingesetzt werden.
> Quelle: https://code.claude.com/docs/de/agent-teams

---

## Status

**Experimentell.** Standardmaessig deaktiviert. Aktivierung ueber ENV oder `settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

Erfordert Claude Code >= v2.1.32.

---

## Wann Agent Teams verwenden?

Agent Teams lohnen sich wenn:

- **Parallele Exploration echten Wert bietet** — nicht fuer sequenzielle Arbeit
- **Teammates unabhaengig arbeiten koennen** — verschiedene Dateien, verschiedene Module
- **Kommunikation zwischen Agenten noetig ist** — gegenseitige Reviews, Hypothesen-Debatte

### Starke Anwendungsfaelle

| Use Case | Warum Teams? |
|----------|-------------|
| Recherche & Review | Mehrere Aspekte gleichzeitig untersuchen, Erkenntnisse austauschen |
| Neue Module/Features | Jeder Teammate besitzt separates Stueck, keine Konflikte |
| Debugging mit Hypothesen | Konkurrierende Theorien parallel testen, gegenseitig widerlegen |
| Schichtuebergreifende Koordination | Frontend, Backend, Tests jeweils von anderem Teammate |

### Wann NICHT verwenden

- Sequenzielle Aufgaben mit Abhaengigkeiten
- Bearbeitungen in derselben Datei (fuehrt zu Ueberschreibungen)
- Routineaufgaben — einzelne Sitzung ist kostenguenstiger
- Einfache fokussierte Tasks → Subagents reichen

---

## Subagents vs. Agent Teams

| Aspekt | Subagents | Agent Teams |
|--------|-----------|-------------|
| **Kontext** | Eigenes Fenster, Ergebnisse zurueck zum Aufrufer | Eigenes Fenster, vollstaendig unabhaengig |
| **Kommunikation** | Nur an Hauptagent | Direkt zwischen Teammates |
| **Koordination** | Hauptagent verwaltet alles | Gemeinsame Aufgabenliste, Selbstkoordination |
| **Token-Kosten** | Niedriger (Zusammenfassung) | Hoeher (jeder = separate Instanz) |
| **Einsatz** | Fokussierte Tasks, nur Ergebnis zaehlt | Komplexe Arbeit mit Diskussion |

**Faustregel:** Subagents wenn Worker nur berichten. Teams wenn Workers sich austauschen, hinterfragen, selbst koordinieren muessen.

---

## Architektur

```
┌─────────────────────────────────────────────┐
│  Team Lead (Haupt-Claude-Code-Sitzung)      │
│  - erstellt Team, erzeugt Teammates         │
│  - koordiniert Arbeit, synthetisiert         │
├────────┬────────┬────────┬──────────────────┤
│ Mate A │ Mate B │ Mate C │  ...             │
│ (eigen │ (eigen │ (eigen │                  │
│  Ctx)  │  Ctx)  │  Ctx)  │                  │
└────┬───┴────┬───┴────┬───┘                  │
     │        │        │                       │
     ▼        ▼        ▼                       │
  ┌──────────────────────────┐                 │
  │  Gemeinsame Aufgabenliste │                │
  │  ~/.claude/tasks/{team}/ │                 │
  └──────────────────────────┘                 │
  ┌──────────────────────────┐                 │
  │  Mailbox (Inter-Agent)   │                 │
  └──────────────────────────┘                 │
└─────────────────────────────────────────────┘
```

| Komponente | Rolle |
|-----------|-------|
| **Team Lead** | Haupt-Sitzung. Erstellt Team, erzeugt Teammates, koordiniert |
| **Teammates** | Separate Claude-Code-Instanzen mit eigenen Aufgaben |
| **Aufgabenliste** | Gemeinsame Tasks mit Status: ausstehend → in Bearbeitung → abgeschlossen |
| **Mailbox** | Nachrichten zwischen Agenten |

Dateien lokal:
- Team-Config: `~/.claude/teams/{team-name}/config.json`
- Aufgaben: `~/.claude/tasks/{team-name}/`

---

## Kontrolle

### Team starten

Natuerlichsprachig beschreiben. Aufgabe + gewuenschte Teamstruktur:

```
Create an agent team to review PR #142. Spawn three reviewers:
- One focused on security implications
- One checking performance impact
- One validating test coverage
Have them each review and report findings.
```

### Anzeigemodi

| Modus | Beschreibung | Voraussetzung |
|-------|-------------|---------------|
| **In-Process** (Default) | Alle im Hauptterminal. `Shift+Down` zum Wechseln | Keins |
| **Split Panes** | Jeder Teammate eigener Pane | tmux oder iTerm2 |

Modus setzen in `settings.json`:

```json
{ "teammateMode": "in-process" }
```

Oder per Flag: `claude --teammate-mode in-process`

**Hinweis:** Split Panes funktionieren NICHT in VS Code Terminal, Windows Terminal oder Ghostty.

### Teammates und Modelle angeben

```
Create a team with 4 teammates to refactor these modules in parallel.
Use Sonnet for each teammate.
```

### Plan-Genehmigung erzwingen

Fuer riskante Aufgaben — Teammate bleibt im Read-Only-Plan-Modus bis Lead genehmigt:

```
Spawn an architect teammate to refactor the authentication module.
Require plan approval before they make any changes.
```

Genehmigungskriterien im Prompt mitgeben:
- "Genehmige nur Plaene mit Testabdeckung"
- "Lehne Plaene ab die das DB-Schema aendern"

### Direkt mit Teammates sprechen

- **In-Process:** `Shift+Down` zum Wechseln, tippen zum Nachricht senden. `Enter` = Sitzung anzeigen, `Escape` = Turn unterbrechen, `Ctrl+T` = Aufgabenliste
- **Split Panes:** In Pane klicken, direkt interagieren

### Aufgaben zuweisen

- **Lead weist zu:** "Gib Aufgabe X an Teammate Y"
- **Selbst beanspruchen:** Teammate nimmt naechste freie Aufgabe nach Abschluss (Dateisperrung gegen Race Conditions)
- Aufgaben koennen Abhaengigkeiten haben — blockierte Tasks werden automatisch entsperrt

### Herunterfahren

```
Ask the researcher teammate to shut down
```

Teammate kann zustimmen oder mit Erklaerung ablehnen.

### Bereinigen

```
Clean up the team
```

**Wichtig:** Immer ueber Lead bereinigen, nie ueber Teammates. Erst alle Teammates herunterfahren.

---

## Berechtigungen

- Teammates starten mit Berechtigungseinstellungen des Leads
- `--dangerously-skip-permissions` beim Lead → gilt auch fuer alle Teammates
- Pro-Teammate-Modi erst NACH Erzeugung aenderbar, nicht beim Spawn
- Haeufige Operationen VOR dem Spawnen in Berechtigungseinstellungen genehmigen (reduziert Unterbrechungen)

---

## Kontext und Kommunikation

**Was Teammates erben:**
- CLAUDE.md, MCP Servers, Skills (Projektkontext)
- Spawn-Prompt vom Lead

**Was Teammates NICHT erben:**
- Gespraechshistorie des Leads

**Kommunikationswege:**
- **message:** an bestimmten Teammate
- **broadcast:** an alle gleichzeitig (sparsam nutzen — Kosten skalieren mit Teamgroesse)
- **Automatische Lieferung:** Nachrichten werden sofort zugestellt, kein Polling noetig
- **Untaetigkeitsbenachrichtigung:** Teammate benachrichtigt Lead automatisch wenn fertig

---

## Qualitaetsgates mit Hooks

Zwei relevante Hook-Events:

| Hook | Trigger | Feedback-Mechanismus |
|------|---------|---------------------|
| `TeammateIdle` | Teammate wird untaetig | Exit Code 2 → Feedback senden, Teammate arbeitet weiter |
| `TaskCompleted` | Aufgabe als abgeschlossen markiert | Exit Code 2 → Fertigstellung verhindern, Feedback senden |

---

## Best Practices

### 1. Genug Kontext im Spawn-Prompt

Teammates haben keinen Zugriff auf die Lead-Historie. Alles Relevante in den Prompt packen:

```
Spawn a security reviewer teammate with the prompt: "Review the authentication
module at src/auth/ for security vulnerabilities. Focus on token handling,
session management, and input validation. The app uses JWT tokens stored in
httpOnly cookies. Report any issues with severity ratings."
```

### 2. Teamgroesse: 3-5 Teammates

- Token-Kosten skalieren linear
- Koordinationsaufwand steigt ueberproportional
- 5-6 Aufgaben pro Teammate ist ein guter Schnitt
- 3 fokussierte Teammates > 5 verstreute

### 3. Aufgaben richtig dimensionieren

| Problem | Symptom |
|---------|---------|
| Zu klein | Koordinationsaufwand > Nutzen |
| Zu gross | Zu lange ohne Check-ins, verschwendete Arbeit |
| Richtig | In sich geschlossene Einheit mit klarem Ergebnis (Funktion, Testdatei, Review) |

### 4. Lead zum Warten anweisen

Lead beginnt manchmal selbst zu implementieren statt zu delegieren:

```
Wait for your teammates to complete their tasks before proceeding
```

### 5. Mit Recherche/Review starten

Fuer Einsteiger: erst Read-Only-Tasks (PR Review, Library-Recherche, Bug-Untersuchung). Zeigt den Wert ohne Koordinations-Risiko.

### 6. Dateikonflikte vermeiden

Zwei Teammates an derselben Datei = Ueberschreibungen. Arbeit so aufteilen dass jeder Teammate eigene Dateien besitzt.

### 7. Ueberwachen und lenken

Fortschritt pruefen, Ansaetze umleiten, Erkenntnisse synthetisieren. Zu lange unbeaufsichtigt = verschwendete Arbeit.

---

## Anwendungsbeispiele fuer dieses Projekt

### Paralleles Code Review

```
Create an agent team to review the chat API route at src/app/api/chat/.
Spawn three reviewers:
- Security: Auth, Input-Validierung, SSRF, Credits
- Performance: Streaming, DB-Queries, Caching
- Code Quality: TypeScript Types, Error Handling, Patterns
Have them each review and report findings.
```

### Feature-Implementierung mit Schichten

```
Create an agent team to implement [Feature X]. Spawn teammates:
- Backend: API Route + DB Schema/Queries
- Frontend: React Components + Hooks
- Tests: Integration Tests + Edge Cases
Assign separate files to each. Wait for all to complete.
```

### Debugging mit Hypothesen

```
Users report [Bug]. Spawn 3 agent teammates to investigate:
- Hypothesis A: [erste Vermutung]
- Hypothesis B: [zweite Vermutung]
- Hypothesis C: [dritte Vermutung]
Have them talk to each other to disprove theories.
Update findings when consensus emerges.
```

---

## Fehlerbehebung

| Problem | Loesung |
|---------|---------|
| Teammates erscheinen nicht | `Shift+Down` pruefen (In-Process). Aufgabe komplex genug? tmux installiert (`which tmux`)? |
| Zu viele Berechtigungsabfragen | Haeufige Ops vorher in Permissions erlauben |
| Teammates stoppen bei Fehlern | Direkt Anweisungen geben oder Ersatz-Teammate spawnen |
| Lead faehrt zu frueh herunter | "Warte auf Teammates" anweisen |
| Verwaiste tmux-Sitzungen | `tmux ls` → `tmux kill-session -t <name>` |

---

## Einschraenkungen

- **Keine Sitzungswiederaufnahme:** `/resume` und `/rewind` stellen In-Process-Teammates nicht wieder her
- **Aufgabenstatus kann verzoegert sein:** Manuell pruefen wenn Tasks blockiert scheinen
- **Langsame Abschaltung:** Teammates beenden laufende Anfragen erst
- **Ein Team pro Sitzung:** Bereinigen vor neuem Team
- **Keine verschachtelten Teams:** Nur Lead kann Teams/Teammates verwalten
- **Lead ist fest:** Keine Befoerderung oder Fuehrungsuebertragung
- **Split Panes:** Nicht in VS Code Terminal, Windows Terminal, Ghostty
