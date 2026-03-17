# PRD: Memory-System für die AI-Chat-Plattform

> Product Requirements Document für die Integration eines persistenten Memory-Layers.
> Zielgruppe: Entwickler (Claude Code), die das Feature implementieren.

---

## 1. Zusammenfassung

Die Plattform erhält ein Memory-System, das Kontext über Chat-Sessions hinweg speichert. Memories werden automatisch aus Konversationen extrahiert und können zusätzlich von Experts explizit mit strukturierten Metadaten geschrieben werden. Alle Experts profitieren vom selben Memory-Pool — es gibt keinen getrennten Speicher pro Expert.

**Technologie:** Mem0 (Open Source, Apache 2.0)
- GitHub: https://github.com/mem0ai/mem0
- Docs: https://docs.mem0.ai
- npm: `mem0ai` / pip: `mem0ai`
- Start mit Mem0 Cloud Service, späterer Wechsel auf On-Prem möglich

**AI SDK Integration:** https://ai-sdk.dev/docs/agents/memory#mem0

---

## 2. Ziele

1. Jede Chat-Session baut auf dem Wissen aus früheren Sessions auf — kein "Goldfisch-Effekt" mehr.
2. Experts können Memories über Sessions hinweg nutzen, ohne dass der User alles wiederholen muss.
3. Memories sind nicht an einzelne Experts gebunden — Wissen fließt natürlich zwischen Experts (z.B. Lernfortschritt wird für Content-Erstellung nutzbar).
4. Experts können optional strukturierte Memories mit Metadaten schreiben, um domänenspezifischen Kontext präzise abrufbar zu machen.
5. Der User hat volle Transparenz und Kontrolle über seine Memories.

---

## 3. Architektur

### Memory-Pool

Ein flacher Pool pro User. Keine Trennung nach Expert, kein Scoping. Mem0s semantische Suche sorgt dafür, dass jeder Expert die für seinen Kontext relevanten Memories bekommt.

### Zwei Memory-Mechanismen

```
┌─────────────────────────────────────────────────┐
│                  Memory Pool (Mem0)              │
│                                                  │
│  ┌──────────────┐    ┌────────────────────────┐ │
│  │  Automatisch  │    │  Explizit (via Tool)   │ │
│  │               │    │                        │ │
│  │  Nach jedem   │    │  Expert schreibt       │ │
│  │  Chat: Mem0   │    │  strukturierte         │ │
│  │  extrahiert   │    │  Memories mit          │ │
│  │  relevante    │    │  Metadaten             │ │
│  │  Fakten       │    │                        │ │
│  └──────────────┘    └────────────────────────┘ │
│                                                  │
│  Abruf: Semantische Suche + Metadata-Filter     │
└─────────────────────────────────────────────────┘
```

#### Mechanismus 1: Automatische Extraktion

Nach jedem Chat (wenn Memory aktiviert ist) sendet die Plattform die Konversation an Mem0. Mem0 nutzt ein LLM im Hintergrund, um erinnerungswürdige Fakten zu extrahieren.

**Trigger:** Chat wird beendet oder nach einer konfigurierbaren Inaktivitätszeit.
**Input:** Alle Messages der Session.
**Output:** Mem0 speichert extrahierte Memories automatisch.

```typescript
// Nach Chat-Ende (pseudocode)
await memory.add(messages, { 
  user_id: userId
});
```

Keine Änderung an Experts nötig. Kein neues Tool. Funktioniert mit jedem Modell.

#### Mechanismus 2: Explizite Memories via Tool

Ein neues Tool `save_memory`, das Experts aufrufen können, um strukturierte Informationen mit Metadaten zu speichern. Besonders nützlich für Experts, die domänenspezifischen Kontext über Sessions hinweg tracken wollen.

**Wann:** Der Expert entscheidet selbst (gesteuert durch System-Prompt).
**Wie:** Normaler Tool-Call, wie `ask_user` oder `create_artifact`.

```typescript
// Tool-Definition
{
  name: "save_memory",
  description: "Speichert eine strukturierte Information im User-Memory für spätere Sessions.",
  parameters: {
    memory: {
      type: "string",
      description: "Die zu speichernde Information als natürlicher Satz."
    },
    metadata: {
      type: "object",
      description: "Optionale Metadaten für gezielteres Abrufen.",
      properties: {
        type: { type: "string" },
        topic: { type: "string" },
        // Freiformat — Experts definieren ihre eigenen Keys
      }
    }
  }
}
```

**Beispiel: Lernbegleiter speichert Lernstand**
```json
{
  "memory": "User versteht Few-Shot-Prompting und kann es eigenständig anwenden",
  "metadata": {
    "type": "skill_assessment",
    "topic": "prompt-engineering",
    "subtopic": "few-shot",
    "level": "anwenden",
    "assessed_at": "2026-03-15"
  }
}
```

**Beispiel: SEO-Berater speichert Website-Kontext**
```json
{
  "memory": "Die Website des Users ist example.com, ein B2B-SaaS für HR",
  "metadata": {
    "type": "project_context",
    "domain": "example.com"
  }
}
```

### Memory-Abruf bei Session-Start

Wenn ein neuer Chat gestartet wird, ruft die Plattform relevante Memories ab und injiziert sie in den System-Prompt.

```typescript
// Bei Chat-Start (pseudocode)
const relevantMemories = await memory.search(
  query: firstUserMessage,  // oder Expert-Description als Suchkontext
  user_id: userId,
  limit: 10
);

// In System-Prompt einfügen
const memoryBlock = formatMemories(relevantMemories);
systemPrompt = `${expertPrompt}\n\n## Kontext aus früheren Sessions\n${memoryBlock}`;
```

**Platzierung im Prompt-Assembly:**

```
Layer 1: Expert System-Prompt
Layer 2: Artifact-Anweisungen
Layer 3: Web-Tool-Hinweise
Layer 4: Skills-Übersicht ODER Quicktask-Prompt
Layer 5: Memory-Kontext (NEU)
Layer 6: Projekt-Instruktionen
Layer 7: User Custom Instructions (höchste Prio)
```

Memory kommt als neuer Layer 5 dazu. Er steht nach den Skills aber vor den User Custom Instructions, damit der User über seinen eigenen Kontext bestimmen kann.

### Dynamisches Nachladen

Zusätzlich zum initialen Memory-Block bei Session-Start könnte der Expert im Verlauf eines Chats gezielt Memories abrufen, wenn sich das Thema ändert. Dafür ein optionales Lese-Tool:

```typescript
{
  name: "recall_memory",
  description: "Sucht in den User-Memories nach relevantem Kontext.",
  parameters: {
    query: { type: "string", description: "Wonach soll gesucht werden?" },
    metadata_filter: { 
      type: "object", 
      description: "Optionaler Filter auf Metadaten.",
    },
    limit: { type: "number", default: 5 }
  }
}
```

**Beispiel: Lernbegleiter ruft gezielt Lernstand ab**
```json
{
  "query": "Lernfortschritt Prompt Engineering",
  "metadata_filter": { "type": "skill_assessment", "topic": "prompt-engineering" },
  "limit": 10
}
```

Dies ist optional für Phase 1. Die automatische Injektion bei Session-Start reicht als MVP.

---

## 4. User-Kontrolle & Transparenz

### Memory-Einstellungen (Settings-Page)

**Globaler Toggle:**
- Memory ein/aus (Default: ein)
- Wenn aus: Keine automatische Extraktion, kein Memory-Abruf, Tools `save_memory` und `recall_memory` deaktiviert.

**Inkognito-Modus pro Chat:**
- Toggle beim Chat-Start oder während des Chats
- Wenn aktiv: Diese Session wird nicht an Mem0 gesendet und es werden keine Memories abgerufen.
- Visueller Indikator im Chat (z.B. kleines Icon)

### Memory-Verwaltung (eigene Seite oder Tab in Settings)

**Ansicht:**
- Liste aller gespeicherten Memories
- Gruppierbar nach Zeitraum oder Typ
- Suchbar
- Anzeige der Metadaten wo vorhanden

**Aktionen:**
- Einzelne Memories löschen
- Alle Memories löschen
- Export (JSON) — für DSGVO-Auskunftsrecht

### Erster Kontakt

Beim ersten Chat mit aktivem Memory zeigt die Plattform einen einmaligen Hinweis:
"Diese Plattform merkt sich Kontext aus deinen Gesprächen, damit zukünftige Sessions besser auf dich zugeschnitten sind. Du kannst das jederzeit in den Einstellungen deaktivieren oder einzelne Erinnerungen löschen."

Kein Blocking-Dialog — ein Inline-Banner, das sich nach Bestätigung nicht mehr zeigt.

---

## 5. Integration mit Experts

### Keine Pflicht

Memory ist ein passives Feature. Kein bestehender Expert muss geändert werden. Die automatische Extraktion und Injektion funktioniert ohne Anpassung.

### Opt-in für explizite Memories

Experts, die `save_memory` und `recall_memory` nutzen wollen, referenzieren die Tools in ihrem System-Prompt:

```markdown
## Deine Tools

- **save_memory** — Wenn du etwas Wichtiges über den Lernenden erfährst 
  (Vorwissen, Fortschritt, Schwächen, Ziele), speichere es für die 
  nächste Session.
- **recall_memory** — Wenn ein neues Thema aufkommt, prüfe ob es 
  bereits Kontext aus früheren Sessions gibt.
```

Die Tool-Beschreibung im System ist bewusst kurz gehalten. Das Modell entscheidet selbst, wann es sinnvoll ist zu speichern oder abzurufen.

### allowedTools

`save_memory` und `recall_memory` werden zur Liste der verfügbaren Tools hinzugefügt. Experts können sie via `allowedTools` einschränken oder erlauben.

---

## 6. Mem0-Konfiguration

### Service-Setup

**Phase 1: Mem0 Cloud**
```typescript
import { createMem0 } from '@mem0/vercel-ai-provider';

const mem0 = createMem0({
  provider: 'anthropic',  // oder 'openai' — für die Extraktion
  mem0ApiKey: process.env.MEM0_API_KEY,
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

**Später: On-Prem**
Mem0 ist Apache 2.0 und kann self-hosted betrieben werden. Der Wechsel erfordert nur eine Änderung der Konfiguration (API-URL), keine Code-Änderungen.

### LLM für Extraktion

Mem0 braucht ein LLM für die automatische Memory-Extraktion. Das sollte ein kleines, schnelles Modell sein — nicht das teure Hauptmodell. Empfehlung: `gpt-4.1-nano` oder `claude-haiku` — günstig, schnell, gut genug für Faktenextraktion.

### Kosten-Überlegung

Die automatische Extraktion nach jedem Chat verursacht zusätzliche LLM-Kosten. Bei einem günstigen Modell (Haiku/Nano) sind das Centbeträge pro Chat. Trotzdem sollte die Extraktion konfigurierbar sein:
- Nur für bestimmte Experts (z.B. nur die mit `save_memory` in allowedTools)
- Nur ab einer Mindest-Konversationslänge (z.B. > 4 Messages)
- Rate-Limit pro User (z.B. max 50 Extraktionen/Tag)

---

## 7. Phasenplan

### Phase 1 — MVP

**Automatische Extraktion:**
- Nach jedem Chat (wenn Memory aktiviert) an Mem0 senden
- Bei Session-Start relevante Memories abrufen und in System-Prompt injizieren
- Neuer Layer 5 im Prompt-Assembly

**User-Kontrolle:**
- Globaler Memory-Toggle in Settings
- Inkognito-Toggle pro Chat
- Memory-Verwaltung: Liste, Suche, Löschen
- Einmaliger Onboarding-Hinweis

**Konfiguration:**
- Mindest-Konversationslänge für Extraktion konfigurierbar
- Extraktions-LLM konfigurierbar

### Phase 2 — Explizite Tools

**`save_memory` Tool:**
- Experts können strukturiert speichern mit Metadaten
- Tool ist optional, muss im Expert-Prompt referenziert werden

**`recall_memory` Tool:**
- Experts können gezielt nach Memories suchen
- Unterstützt Metadata-Filter

**Erweiterungen:**
- Memory-Export (JSON) für DSGVO
- Gruppenansicht in der Verwaltung (nach Typ, Expert, Zeitraum)

### Phase 3 — Optimierung

- Analytics: Welche Memories werden tatsächlich abgerufen?
- Automatisches Aufräumen: Veraltete Memories erkennen und archivieren
- Memory-Konflikte: Widersprüchliche Memories erkennen und User fragen
- On-Prem Migration falls gewünscht

---

## 8. Offene Fragen

1. **Timing der automatischen Extraktion:** Nach Chat-Ende oder nach jeder N-ten Message? Chat-Ende ist einfacher, aber was ist "Chat-Ende" — letzter Message + Timeout? Expliziter Button?

2. **Memory-Limit pro User:** Wie viele Memories soll Mem0 maximal pro User speichern? Zu viele = Rauschen bei der Suche, zu wenige = Informationsverlust.

3. **Kontext-Fenster-Budget:** Wie viel Platz im System-Prompt ist für den Memory-Block reserviert? Zu viele Memories injiziert = weniger Platz für den eigentlichen Chat.

4. **Multi-Tenancy:** Wenn mehrere Unternehmen die Plattform nutzen, sind die Memory-Pools strikt getrennt? Bei Mem0 Cloud vermutlich ja (via API-Key), bei On-Prem muss das explizit konfiguriert werden.

5. **Memory-Qualität:** Wie gut ist Mem0s automatische Extraktion in der Praxis? Empfehlung: In Phase 1 stichprobenartig prüfen, was extrahiert wird, und ggf. die Extraktions-Prompts anpassen.
