# Generative UI — Stufenplan

> Von statischen Components bis zu dynamisch generierten, interaktiven UIs im Chat.
> Das Feature das die Plattform von einem "weiteren Chat-UI" zu einem echten Produktivitäts-Tool macht.

---

## Die Kernidee

Die meisten AI-Chats geben Text aus. Manche können Code oder HTML als Artifact in einem Seitenpanel zeigen. Aber was wäre, wenn der AI-Chat seine Antworten als echte, interaktive UI-Elemente direkt im Gesprächsfluss rendern kann — kontextbezogen, basierend auf dem Dialog, und sogar interaktiv?

Das ist kein einzelnes Feature, sondern eine Fähigkeit die in Stufen wächst.

---

## Stufe 1: Statische Tool-Components (Basis)

**Was:** Vordefinierte React-Components die durch Tool-Calls getriggert werden. Jedes Component ist hardcoded — du baust es, das Model füllt es mit Daten.

**Wie es funktioniert:**
```
User: "Wie ist das Wetter in Berlin?"
→ Model ruft show_weather Tool auf
→ Frontend rendert <WeatherCard data={result} /> inline im Chat
```

**Components:**
- `AskUser` — Strukturierte Rückfragen mit Auswahl-Optionen
- `ContentAlternatives` — Umschaltbare A/B/C Varianten
- `ConfirmAction` — Bestätigungs-Dialog
- `DataTable` — Sortierbare Tabelle
- `ChartView` — Recharts-basierte Visualisierung
- `LinkPreview` — URL-Preview Card

**Was der User sieht:** Statt "Das Wetter in Berlin ist 18°C, bewölkt..." sieht er eine hübsche Wetter-Karte mit Icon, Temperatur, und 5-Tage-Forecast. Statt "Soll ich Option A oder B nehmen?" sieht er klickbare Buttons.

**Limitation:** Du musst jedes Component vorab bauen. Das Model kann nur Components auslösen die existieren. Keine Überraschungen, aber auch keine Flexibilität.

**Aufwand:** Gering pro Component (Tool + React Component + ToolRenderer-Eintrag).

---

## Stufe 2: Kontext-bewusste Components

**Was:** Die statischen Components werden intelligenter — sie greifen auf den Chat-Kontext zu, können State über mehrere Turns halten, und reagieren auf vorherige Antworten.

**Wie es sich von Stufe 1 unterscheidet:**

Stufe 1: Component bekommt Daten vom Tool-Call, rendert sie, fertig.
Stufe 2: Component kennt den Chat-Kontext und kann darauf reagieren.

**Beispiele:**

```
User: "Vergleich mir drei Hosting-Anbieter"
→ Model generiert Vergleichsdaten via Tool
→ <ComparisonTable> rendert mit Hover-Details, Sortierung, Highlighting
→ User klickt auf "Hetzner"
→ Component sendet Follow-Up via addToolResult
→ Model antwortet kontextbezogen: "Gute Wahl. Bei Hetzner solltest du..."
```

```
User: "Erstelle mir einen Projektplan"
→ <ProjectTimeline> rendert interaktive Timeline
→ User verschiebt einen Meilenstein per Drag & Drop
→ Component sendet Update an Model
→ Model passt abhängige Meilensteine an
```

**Technisch:**
- Components bekommen nicht nur `data` sondern auch `chatContext` (vorherige Messages, aktives Project, aktiver Expert)
- Components können `addToolResult` nutzen um Interaktionen zurück ans Model zu schicken
- State-Persistenz über `useRef` oder lokalen State zwischen Re-Renders

**Neue Components:**
- `ComparisonTable` — Multi-Item Vergleich mit Interaktion
- `ProjectTimeline` — Interaktive Timeline mit Drag & Drop
- `FormBuilder` — Dynamisches Formular aus Tool-Daten
- `DecisionTree` — Geführte Entscheidungsfindung
- `CodePreview` — Live-Preview von generiertem Code mit Edit-Möglichkeit

**Aufwand:** Mittel. Die Components sind komplexer, aber das Grundmuster (Tool → Component) bleibt gleich.

---

## Stufe 3: Interaktive HTML-Artifacts

**Was:** Das Model generiert komplette HTML/CSS/JS Artifacts die als interaktive Applikationen im Artifact-Panel gerendert werden. Nicht vordefiniert — das Model schreibt den Code.

**Wie es sich von Stufe 2 unterscheidet:**

Stufe 2: Du baust die Components, Model füllt sie.
Stufe 3: Model BAUT die UI selbst als HTML-Code.

**Beispiele:**

```
User: "Erstelle mir ein interaktives Dashboard für meine Q4-Zahlen"
→ Model generiert komplettes HTML mit Chart.js, CSS, Interaktionen
→ Artifact-Panel rendert es in sandboxed iframe
→ User kann mit dem Dashboard interagieren (Filter, Hover, Drill-Down)
→ Dashboard lebt als Artifact, versioniert und editierbar
```

```
User: "Bau mir einen Kalkulator für Projekt-Kosten"
→ Model generiert HTML-Formular mit JS-Logik
→ Artifact: Interaktiver Rechner mit Eingabefeldern und Echtzeit-Berechnung
→ User nutzt ihn, kann ihn speichern und später wieder öffnen
```

**Technisch:**
- Nutzt das existierende Artifact-System (type: 'html')
- Sandboxed iframe für Security
- Model braucht guten System-Prompt für sauberes HTML/CSS/JS
- Skill-basiert: Ein `html-artifact-builder` Skill gibt dem Model Patterns und Best Practices
- Optional: postMessage Bridge für Kommunikation zwischen Artifact und Chat

**Abgrenzung zu Stufe 2:**
- Stufe 2 = predefined Components inline im Chat (ephemeral)
- Stufe 3 = model-generated HTML im Artifact Panel (persistent, versioniert)

**Was das ermöglicht:**
- Jede UI die das Model beschreiben kann, kann es bauen
- Dashboards, Rechner, Formulare, Visualisierungen, Mini-Apps
- User kann Artifacts editieren lassen ("Mach den Hintergrund dunkel", "Füge eine Export-Funktion hinzu")
- Artifacts werden versioniert — jede Iteration gespeichert

**Aufwand:** Mittel. Die Infrastruktur (Artifact-System, iframe-Rendering) existiert. Der Aufwand liegt in guten Skills/Prompts die dem Model beibringen, sauberes HTML zu generieren.

---

## Stufe 4: Declarative Generative UI

**Was:** Das Model beschreibt UIs als strukturierten JSON-Spec statt als HTML-Code. Ein generischer Renderer im Frontend interpretiert den Spec und baut daraus native React-Components mit deinem Design-System (Tailwind, shadcn/ui).

**Wie es sich von Stufe 3 unterscheidet:**

Stufe 3: Model schreibt rohen HTML/CSS/JS Code → iframe.
Stufe 4: Model beschreibt UI als JSON → nativer Renderer mit deinen Components.

**Der entscheidende Vorteil:** Die UI sieht IMMER aus wie deine App. Kein iframe, kein fremdes Styling, keine Inkonsistenzen. Das Model erfindet UIs die du nie programmiert hast, aber sie rendern mit deinen shadcn/ui Components und Tailwind-Klassen.

**Beispiel:**

```
User: "Zeig mir eine Übersicht meiner letzten 5 Projekte"

Model gibt aus (als Tool-Result):
{
  "type": "declarative-ui",
  "spec": {
    "layout": "grid",
    "columns": 1,
    "gap": "md",
    "children": [
      {
        "type": "card",
        "title": "Projekt Alpha",
        "description": "Status: Aktiv",
        "badge": { "text": "In Progress", "variant": "default" },
        "actions": [
          { "label": "Details", "action": "show_project", "params": { "id": "alpha" } },
          { "label": "Archivieren", "action": "archive_project", "params": { "id": "alpha" }, "variant": "destructive", "confirm": true }
        ]
      },
      {
        "type": "card",
        "title": "Projekt Beta",
        ...
      }
    ]
  }
}

Frontend rendert das als:
→ Grid mit shadcn/ui Cards
→ Badges, Buttons, alles natives Styling
→ Klick auf "Details" triggert Tool-Call show_project
→ Klick auf "Archivieren" zeigt Confirm-Dialog
```

**Technisch:**

Du brauchst:
1. Ein **UI-Schema** das definiert welche Component-Typen es gibt (card, table, form, chart, list, grid, text, badge, button, input, select, etc.)
2. Einen **Renderer** der den JSON-Spec rekursiv durchläuft und shadcn/ui Components rendert
3. Ein **Action-System** das Klicks/Inputs als Tool-Calls zurück ans Model sendet
4. Einen **Skill** der dem Model beibringt, validen UI-Spec zu generieren

**Schema-Entwurf (Kern-Typen):**
```typescript
type UISpec = {
  type: 'card' | 'table' | 'form' | 'chart' | 'list' | 'grid' | 'text' | 'alert' | 'tabs' | 'accordion';
  // Jeder Typ hat eigene Properties
  children?: UISpec[];
  actions?: UIAction[];
};

type UIAction = {
  label: string;
  action: string;           // Tool-Name der aufgerufen wird
  params?: Record<string, any>;
  variant?: 'default' | 'destructive' | 'outline';
  confirm?: boolean;         // Bestätigungs-Dialog vor Ausführung
};
```

**Referenz-Specs zum Studieren:**
- A2UI (Google): https://github.com/google/A2UI
- Open-JSON-UI (CopilotKit): https://docs.copilotkit.ai/generative-ui/specs/open-json-ui

**Aufwand:** Hoch. Der Renderer ist das Herzstück und muss robust sein. Aber einmal gebaut, explodiert die Flexibilität — das Model kann jede Kombination aus Cards, Tables, Forms etc. ausgeben ohne dass du je ein Component dafür gebaut hast.

**Risiken:**
- Model kann fehlerhaften JSON produzieren → braucht Validierung + Fallback
- Schema muss ausgewogen sein: zu einfach = zu limitiert, zu komplex = Model macht Fehler
- Performance: Tief verschachtelte Specs können langsam rendern

---

## Stufe 5: Skill-gesteuerte UI-Generierung

**Was:** Agent Skills können nicht nur Text-Instruktionen laden, sondern auch UI-Specs oder Component-Templates mitbringen. Ein Skill definiert nicht nur WAS der Agent weiß, sondern auch WIE er es visuell darstellt.

**Wie es sich von Stufe 4 unterscheidet:**

Stufe 4: Das Model erfindet die UI spontan basierend auf dem Schema.
Stufe 5: Skills liefern curated UI-Templates die das Model situationsgerecht einsetzt.

**Beispiel:**

```
skills/
├── seo-analysis/
│   ├── SKILL.md
│   └── ui-templates/
│       ├── keyword-results.json      # Declarative UI Spec für Keyword-Tabelle
│       ├── seo-score-card.json       # Score-Anzeige als Card
│       └── competitor-comparison.json # Vergleichs-Grid
```

```markdown
# SKILL.md — seo-analysis

## UI Templates
Wenn du SEO-Analysen anzeigst, nutze die UI-Templates in ui-templates/:
- keyword-results.json für Keyword-Listen (table mit Suchvolumen, Difficulty, Trend)
- seo-score-card.json für den SEO-Score (card mit Gauge-Chart)
- competitor-comparison.json für Wettbewerbsvergleiche (grid mit cards)

Passe die Templates an die konkreten Daten an. Ändere Spalten,
Labels und Actions basierend auf dem Kontext.
```

**Was das ermöglicht:**
- Jeder Expert hat über seine Skills nicht nur Wissen, sondern auch passende UI-Darstellungen
- SEO-Expert zeigt Ergebnisse als SEO-Dashboard, Code-Expert zeigt Ergebnisse als File-Tree + Code-Diff
- UIs sind kuratiert (du designst die Templates) aber flexibel (Model passt sie an)
- Neue UI-Patterns = neuen Skill installieren, kein Code nötig

**Aufwand:** Mittel (wenn Stufe 4 steht). Die Infrastruktur existiert, es kommen nur Templates und Skill-Integration dazu.

---

## Stufe 6: MCP Apps Integration

**Was:** Externe MCP-Server liefern komplette interaktive HTML-Apps die inline im Chat gerendert werden. Du baust keine UIs — du hostest sie.

**Wie es sich von allen anderen Stufen unterscheidet:**

Stufen 1-5: DU kontrollierst die UI (eigene Components, eigenes Schema, eigene Templates).
Stufe 6: EXTERNE Server liefern die UI. Du bist nur der Host.

**Was es bringt:**
- Sofortiger Zugang zu Third-Party UIs ohne Eigenentwicklung
- Jira-Board, Notion-Page, Analytics-Dashboard — alles inline im Chat
- Wachsendes Ökosystem: Jeder neue MCP-Server mit Apps-Support = neues Feature in deinem Chat

**Technisch:**
- `@mcp-ui/client` oder `MCPAppsMiddleware` für Host-Implementierung
- Sandboxed iframe mit postMessage Bridge (JSON-RPC)
- CSP Enforcement, Security Auditing
- Tool-Proxying: App kann über deinen Host Tools auf dem MCP-Server aufrufen

**Aufwand:** Einmalig mittel für die Host-Infrastruktur. Danach null pro neuer App.

---

## Meilensteinplan

### Phase 1: Foundation (Stufe 1)
**Zeitpunkt:** Zusammen mit dem Chat-Launch

- [ ] ToolRenderer Pattern implementieren (tool-name → component mapping)
- [ ] `AskUser` Component (Prio 1 — fundamentales UX-Pattern)
- [ ] `ContentAlternatives` Component (Prio 1 — Tabs für Varianten)
- [ ] `ConfirmAction` Component (für Tool-Approval und kritische Aktionen)
- [ ] System Prompt Guidance: Model weiß wann es Generative UI nutzt vs. Text
- [ ] 2-3 weitere Components nach Bedarf (DataTable, ChartView)

**Ergebnis:** Chat fühlt sich schon anders an als reine Text-Interfaces. User merkt: "Die KI stellt mir Fragen als Buttons, zeigt mir Alternativen zum Umschalten."

### Phase 2: Interaktion (Stufe 2)
**Zeitpunkt:** 2-4 Wochen nach Launch

- [ ] Components bekommen Chat-Kontext (vorherige Messages, aktives Project)
- [ ] Bidirektionale Interaktion: Component → addToolResult → Model reagiert
- [ ] Erste komplexere Components: ComparisonTable, FormBuilder
- [ ] Component-State über mehrere Turns (z.B. Tabelle bleibt gefiltert)
- [ ] Refactoring: Component-Registry abstrahieren, neue Components = zero config

**Ergebnis:** Components sind nicht mehr "fire-and-forget" sondern Teil eines Dialogs. User klickt in einem Component, Model reagiert darauf.

### Phase 3: HTML-Artifacts (Stufe 3)
**Zeitpunkt:** Parallel oder kurz nach Phase 2

- [ ] Artifact-Type 'html' mit Sandboxed iframe
- [ ] Agent Skill: `html-artifact-builder` (Patterns, Best Practices für sauberes HTML)
- [ ] Artifact-Versionierung (Model kann iterieren: "Mach den Header größer")
- [ ] Optional: postMessage Bridge zwischen Artifact und Chat
- [ ] Template-Bibliothek: 5-10 HTML-Artifact-Templates als Startpunkte

**Ergebnis:** User kann sagen "Bau mir einen interaktiven Rechner" und bekommt ein funktionierendes HTML-Artifact das persistent gespeichert ist.

### Phase 4: Declarative UI (Stufe 4)
**Zeitpunkt:** 4-8 Wochen nach Launch

- [ ] UI-Schema definieren (component types, properties, actions)
- [ ] Generischer Renderer: JSON-Spec → shadcn/ui Components
- [ ] Action-System: Klicks/Inputs → Tool-Calls
- [ ] Agent Skill: `declarative-ui` (Schema-Referenz, Beispiele für das Model)
- [ ] Validierung + Graceful Fallback bei fehlerhaftem JSON
- [ ] Rendering sowohl inline (im Chat) als auch im Artifact-Panel

**Ergebnis:** Model kann UIs erzeugen die nie explizit programmiert wurden. "Zeig mir eine Übersicht" → Grid mit Cards. "Erstelle ein Formular" → nativer Form mit Validierung. Alles im App-Styling.

### Phase 5: Skill-Templates (Stufe 5)
**Zeitpunkt:** 6-10 Wochen nach Launch

- [ ] UI-Template Format in Skills definieren (JSON-Specs in `ui-templates/`)
- [ ] Skill-Loader ergänzt UI-Templates zum loadSkill-Result
- [ ] Model lernt: "Wenn ich diesen Skill nutze, gibt es passende UI-Templates"
- [ ] 3-5 Skills mit UI-Templates als Referenz (SEO, Data Analysis, Reporting)
- [ ] Template-Customization: Model passt Templates an konkreten Kontext an

**Ergebnis:** Experts fühlen sich visuell unterschiedlich an. SEO-Expert zeigt Keyword-Tabellen, Analyst zeigt Dashboards — nicht weil du verschiedene UIs gebaut hast, sondern weil die Skills verschiedene Templates mitbringen.

### Phase 6: MCP Apps (Stufe 6)
**Zeitpunkt:** 8-12 Wochen nach Launch

- [ ] MCP Apps Host-Implementierung (`@mcp-ui/client` oder AppBridge)
- [ ] iframe Sandbox mit CSP Enforcement
- [ ] Tool-Proxying für bidirektionale App↔Server Kommunikation
- [ ] 2-3 kuratierte MCP-Server mit Apps-Support zum Testen
- [ ] UI-Integration: MCP Apps inline im Chat oder als Artifact-Panel

**Ergebnis:** Externe Tools bringen ihre eigene UI mit. Das Ökosystem erweitert die Plattform ohne Eigenentwicklung.

---

## Das USP in einem Satz

Andere AI-Chats geben Text aus. Deine Plattform antwortet mit der richtigen UI für die Situation — eine Tabelle wenn du Daten vergleichst, ein Formular wenn du Input brauchst, ein Dashboard wenn du analysierst, eine Entscheidungshilfe wenn du wählst. Alles im gleichen Gesprächsfluss, alles interaktiv, alles in deinem Design.

---

## Referenz-Links

| Ressource | URL |
|-----------|-----|
| AI SDK Generative UI Cookbook | https://ai-sdk.dev/cookbook/next/render-visual-interface-in-chat |
| A2UI Spec (Google) | https://github.com/google/A2UI |
| Open-JSON-UI Spec | https://docs.copilotkit.ai/generative-ui/specs/open-json-ui |
| CopilotKit Generative UI Guide | https://www.copilotkit.ai/blog/the-developer-s-guide-to-generative-ui-in-2026 |
| CopilotKit MCP Apps Integration | https://www.copilotkit.ai/blog/bring-mcp-apps-into-your-own-app-with-copilotkit-and-ag-ui |
| MCP Apps Extension | https://modelcontextprotocol.io/extensions/apps/overview |
| MCP Apps SDK | https://github.com/modelcontextprotocol/ext-apps |
| @mcp-ui/client (Host SDK) | https://mcpui.dev |
| AG-UI Protocol | https://github.com/ag-ui-protocol/ag-ui |
| Generative UI Playground (CopilotKit) | https://github.com/CopilotKit/generative-ui-playground |
