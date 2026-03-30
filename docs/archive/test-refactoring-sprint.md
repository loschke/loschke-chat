# Testleitfaden: Tool-Architektur & Skill-Ressourcen Refactoring

> Branch: `refactor/tool-architecture-skill-resources`
> 7 Phasen, reines Refactoring + neue Features (Skill-Ressourcen, ZIP-Import)

---

## Voraussetzungen

```bash
pnpm dev
```

Stelle sicher, dass `.env` korrekt konfiguriert ist (mindestens Auth + DB + AI Gateway).

---

## 1. Chat-Grundfunktionen

Diese Tests pruefen, dass das Refactoring keine Regressionen verursacht hat.

### 1.1 Neuen Chat starten

- [ ] Landing Page laden, Expert waehlen
- [ ] Nachricht senden, Antwort wird gestreamt
- [ ] Titel wird automatisch generiert (in Sidebar sichtbar)
- [ ] URL wechselt zu `/c/[chatId]`

### 1.2 Artifact erstellen

- [ ] "Erstelle eine HTML-Seite ueber Katzen" → Artifact-Panel oeffnet sich waehrend Streaming
- [ ] Panel zeigt HTML-Preview korrekt an
- [ ] Artifact-Card in der Chat-Nachricht klickbar
- [ ] Code-Editor ueber Edit-Button erreichbar
- [ ] Speichern im Editor funktioniert

### 1.3 Chat-History

- [ ] Bestehenden Chat aus Sidebar laden → Nachrichten + Artifacts korrekt
- [ ] Neuer Chat → alter Chat in Sidebar sichtbar

---

## 2. Tool-Status & Icons (Phase 3: Registry)

### 2.1 Websuche

- [ ] "Suche nach aktuellen KI-Nachrichten" → ToolStatus zeigt "Websuche" mit Search-Icon
- [ ] Collapsible: Parameter und Ergebnis aufklappbar

### 2.2 Memory (wenn aktiviert)

- [ ] "Merke dir, dass ich TypeScript bevorzuge" → ToolStatus "Erinnerung speichern" mit Bookmark-Icon
- [ ] "Was weisst du ueber mich?" → ToolStatus "Erinnerung abrufen" mit Brain-Icon

### 2.3 MCP-Tools (wenn konfiguriert)

- [ ] MCP-Tool aufrufen → ToolStatus mit Plug-Icon + Server-Badge
- [ ] Label zeigt Tool-Name (Underscores als Leerzeichen)

---

## 3. Custom-Rendered Tools (Phase 4: Renderer Registry)

### 3.1 Bildgenerierung (wenn Gemini-Key gesetzt)

- [ ] "Generiere ein Bild von einem Sonnenuntergang" → ArtifactCard erscheint
- [ ] Waehrend Generierung: Streaming-Indikator
- [ ] Nach Fertigstellung: Bild im Artifact-Panel sichtbar

### 3.2 YouTube (wenn YouTube-API-Key gesetzt)

- [ ] "Suche YouTube Videos ueber Next.js" → Video-Cards inline im Chat
- [ ] Skeleton waehrend Laden, dann Ergebnisse mit Thumbnails

### 3.3 Text-to-Speech (wenn Gemini-Key gesetzt)

- [ ] "Lies diesen Text vor: Hallo Welt" → AudioPlayer inline
- [ ] Skeleton waehrend Generierung, dann Player mit Play-Button

### 3.4 Google Search (wenn aktiviert)

- [ ] "Google: Was ist das Wetter in Dresden?" → SearchGroundingResults inline
- [ ] Antwort mit Quellen-Links

### 3.5 Deep Research (wenn aktiviert)

- [ ] "Recherchiere gruendlich: Trends in AI Agents 2026" → DeepResearchProgress
- [ ] Polling-Indikator, dann Markdown-Artifact

### 3.6 Interactive Tools

- [ ] Quiz: "Erstelle ein Quiz ueber JavaScript" → ArtifactCard → QuizRenderer im Panel
- [ ] Review: "Pruefe diesen Text: ..." → ArtifactCard mit Review-Modus
- [ ] Rueckfrage: Eine Anfrage stellen, die Rueckfragen ausloest → AskUser-Widget
- [ ] Varianten: "Gib mir 3 Varianten fuer eine Ueberschrift" → ContentAlternatives-Tabs

### 3.7 Design (wenn Stitch-Key gesetzt)

- [ ] "Erstelle ein Dashboard-Design" → ArtifactCard mit HTML-Preview

### 3.8 Branding (wenn Firecrawl-Key gesetzt)

- [ ] "Extrahiere das Branding von example.com" → ArtifactCard

---

## 4. Expert-System

- [ ] Expert mit `allowedTools` Filter waehlen → nur erlaubte Tools verfuegbar
- [ ] Expert mit Skills → `load_skill` funktioniert (ToolStatus "Skill laden")
- [ ] Quicktask ausfuehren → Ergebnis korrekt, kein `load_skill` verfuegbar

---

## 5. Skill-Ressourcen (Phase 5: Neues Feature)

### 5.1 load_skill mit Ressourcen

- [ ] Skill mit Ressourcen in DB anlegen (via Admin oder Seed)
- [ ] Im Chat den Skill laden → Response enthaelt `resources` Array mit Dateinamen
- [ ] Response enthaelt `hint` Text

### 5.2 load_skill ohne Ressourcen

- [ ] Normalen Skill laden → Response wie bisher: `{ skill, content }` ohne `resources`

### 5.3 load_skill_resource

- [ ] Nach load_skill: AI ruft load_skill_resource mit Dateinamen auf
- [ ] Response enthaelt `files` Array mit `{ filename, content }`
- [ ] Fehlermeldung bei ungueltigem Skill-Slug oder Dateiname

---

## 6. ZIP-Import (Phase 7: Neues Feature)

### 6.1 ZIP erstellen und importieren

Erstelle eine Test-ZIP-Datei:

```
test-skill/
  SKILL.md          ← Frontmatter + Content
  shared/
    base.css        ← Beliebiger CSS-Inhalt
  specs/
    test-spec.md    ← Beliebiger Markdown
```

`SKILL.md` Beispiel:

```yaml
---
name: Test Skill
slug: test-skill-zip
description: Test fuer ZIP-Import
mode: skill
---
Dies ist ein Test-Skill mit Ressourcen.

## Ressourcen
Nutze load_skill_resource um Dateien zu laden.
- shared/base.css
- specs/test-spec.md
```

```bash
# ZIP erstellen (aus dem Verzeichnis heraus)
cd test-skill && zip -r ../test-skill.zip . && cd ..
```

### 6.2 Import testen

```bash
curl -X POST http://localhost:3000/api/admin/skills/import-zip \
  -H "Cookie: <admin-session-cookie>" \
  -F "file=@test-skill.zip"
```

- [ ] Response: `{ id, slug: "test-skill-zip", name: "Test Skill", resourceCount: 2 }`
- [ ] Skill in Admin-UI sichtbar
- [ ] Ressourcen in Drizzle Studio (`pnpm db:studio`) in `skill_resources` Tabelle

### 6.3 Re-Import (Idempotenz)

- [ ] Gleiche ZIP nochmal importieren → Skill wird aktualisiert, Ressourcen ersetzt
- [ ] Keine Duplikate in der Datenbank

---

## 7. Seed-Script (Phase 7)

```bash
pnpm db:seed
```

- [ ] Bestehende `.md`-Skills werden weiterhin korrekt geseeded
- [ ] Falls Skill-Verzeichnisse in `seeds/skills/` existieren: Skill + Ressourcen geseeded
- [ ] Idempotent: Mehrfach ausfuehren erzeugt keine Duplikate

---

## 8. Credits (wenn aktiviert)

- [ ] Chat-Nachricht senden → Credit-Abzug korrekt
- [ ] Credit-Anzeige in der UI aktualisiert sich

---

## 9. Fehlerverhalten

- [ ] Seite neu laden waehrend Streaming → Chat-History korrekt geladen
- [ ] API-Fehler (z.B. falscher API-Key) → Fehlermeldung im Chat, kein Crash
- [ ] Console: Keine neuen Warnings oder Errors (ausser bekannte)

---

## Zusammenfassung

| Bereich                  | Kritikalitaet | Phasen  |
| ------------------------ | ------------- | ------- |
| Chat + Artifacts         | Hoch          | 1, 4, 6 |
| Tool-Status Labels/Icons | Mittel        | 3       |
| Custom Tool Rendering    | Hoch          | 4       |
| Expert + Skills          | Mittel        | 3, 5    |
| Skill-Ressourcen         | Neu           | 2, 5    |
| ZIP-Import               | Neu           | 7       |
| Seed-Script              | Niedrig       | 7       |
| Credits                  | Mittel        | 6       |

**Wenn Chat + Artifacts + Tool-Rendering funktionieren, ist das Refactoring erfolgreich.**
Die neuen Features (Skill-Ressourcen, ZIP-Import) sind additiv und brechen nichts Bestehendes.
