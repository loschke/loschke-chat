# Roadmap: Ausbaustufen nach M10

> Konsolidierte Planung fuer alle offenen Features. Priorisiert nach Nutzer-Mehrwert und Risiko.
> Einzelne PRDs in `docs/features/` bleiben als Detail-Referenz erhalten.

---

## Plattform-Status

Alle 10 Original-Meilensteine plus Post-M10-Erweiterungen sind abgeschlossen.

### Abgeschlossene Meilensteine

| #    | Meilenstein      | Kern-Features                                |
| ---- | ---------------- | -------------------------------------------- |
| M1   | Foundation       | Auth (Logto), Chat-Persistenz, Basic UI      |
| M2   | Chat Features    | Streaming, Model Selection, Empty State      |
| M3   | Artifact System  | HTML, Markdown, Code Rendering + Editor      |
| M4   | Experts & Skills | 7 Experten, Skill-System, Quicktasks         |
| M4.5 | Admin & Web      | Admin-UI, Web Search/Fetch (Firecrawl)       |
| M5   | File Upload      | 10MB Pre-Signed R2 Upload, Multimodal        |
| M6   | Projects         | Gebundelte Chats mit Kontext-Dokumenten      |
| M7   | MCP Integration  | Externe Tool-Server (GitHub, Slack etc.)     |
| M8   | Memory           | Mem0 Cloud, Auto-Extraktion, Semantic Search |
| M9   | Business Mode    | PII-Erkennung, EU-Routing, Consent-Logging   |
| M10  | Credits          | Token-basierte Abrechnung, Admin-Vergabe     |

### Post-M10 (bereits umgesetzt)

| Feature                 | Beschreibung                                        |
| ----------------------- | --------------------------------------------------- |
| Image Generation        | Gemini Bildgenerierung mit Iterations-Galerie       |
| Admin Roles             | DB-basiertes Rollensystem (user/admin/superadmin)   |
| Sidebar Infinite Scroll | Automatisches Nachladen beim Scrollen               |
| Chat Retention Cron     | Automatische Loesch-Policy fuer alte Chats          |
| Adaptive Thinking       | Extended Thinking fuer Anthropic-Modelle            |
| Landing Page            | Feature-Uebersicht mit Beta-CTA                     |
| Performance             | Message-Limit 50, Artifact Lazy Loading, API Enrich |
| Chat umbenennen         | Rename-Dialog im Sidebar-Dropdown                   |
| Chat teilen             | Token-basierter Share-Link, read-only, widerrufbar  |
| Tool-Accordions         | Eingeklappt bei Chat-History und Share-Ansicht      |
| YouTube Search          | YouTube-Video-Suche mit HTML-Artifact-Ergebnissen   |
| YouTube Analyze         | Video-Transkription/Analyse via Gemini Multimodal   |
| Text-to-Speech          | Gemini TTS mit Audio-Artifact und Player im Panel   |
| Stitch Design Gen.      | UI-Design via Google Stitch (generate + edit + Device-Targeting) |
| Artifact-Panel Resize   | Drag-Handle fuer stufenlose Breitenanpassung (25%-75%) |
| Artifact-Panel Fullscreen | Vollbild-Modus mit ESC-Toggle                     |
| Deep Research             | Gemini Deep Research Agent mit async Polling + Artifact |
| Quellenverlinkung         | Inline-Zitate + Quellenverzeichnis in Artifacts   |
| Datum im System-Prompt    | Aktuelles Datum verhindert veraltete Suchstrings  |
| Research-Filter           | "Research"-Tab in Meine Dateien fuer Deep Research Reports |

---

## Offene PRDs: Status-Audit

| PRD                    | Fertig | Offen                                          | Referenz                                   |
| ---------------------- | ------ | ---------------------------------------------- | ------------------------------------------ |
| Admin Roles            | 100%   | —                                              | `prd-admin-roles.md`                       |
| Generative UI Tools    | 100%   | —                                              | `generative-ui-tools-guide.md`             |
| Gemini Features        | 90%    | Google Search Grounding (optional)             | `prd-gemini-features.md`                   |
| Stitch Design Gen.     | 80%    | Screenshot-Thumbnail, Design-Varianten (spaeter) | `features/prd-stitch-design-generation.md` |
| Anthropic Agent Skills | 80%    | PDF-Preview im Panel (spaeter)                  | `PRD-anthropic-agent-skills.md`            |
| Deep Research          | 100%   | —                                              | `prd-deep-research.md`                     |
| Quellenverlinkung      | 100%   | —                                              | `prd-quellenverlinkung-in-artifacts.md`    |
| Performance/Caching    | 90%    | Client-Virtualisierung (spaeter)               | `performance-caching-concept.md`           |
| Privacy/Family         | 50%    | EU-Config, DSGVO-Export                        | `privacy-family-deployment-guide.md`       |
| Notes/Second Brain     | 0%     | Komplettes Feature                             | `prd-notes-second-brain-v2.md`             |
| lernen.diy             | 30%    | Content-Pipeline, Lernbegleiter                | `prd-lernen-diy-v1.md`                     |
| Teams & Organisations  | 0%     | Komplettes Feature (4 Tabellen, RBAC, Invites) | `features/prd-teams.md`                    |

---

## Ausbaustufen

### Stufe 1: Plattform-Haertung

> Bestehende Features robuster machen. Keine neuen Abhaengigkeiten.

| Feature                   | Beschreibung                                                       | Quelle          | Status |
| ------------------------- | ------------------------------------------------------------------ | --------------- | ------ |
| Message-Limit (50)        | Chat laedt nur letzte 50 Messages, aeltere on-demand               | Performance PRD | Done   |
| Artifact Lazy Loading     | Artifact-Komponenten per `next/dynamic` geladen                    | Performance PRD | Done   |
| Expert/Projekt Enrichment | API liefert Namen direkt mit, keine Extra-Fetches                  | Performance PRD | Done   |
| Chat umbenennen           | Inline-Rename im Sidebar-Dropdown                                  | Neu             | Done   |
| Chat teilen               | Token-basierter Share-Link, read-only, widerrufbar, ohne Login     | Neu             | Done   |
| Lange User-Messages       | Collapsible User-Messages mit Mehr/Weniger-Toggle ab 200px         | Neu             | Done   |
| EU-Deployment-Checkliste  | Dokumentation fuer Neon EU, Vercel fra1, ENV-Vorlage               | Privacy PRD     | Offen  |
| DSGVO-Datenexport         | User exportiert eigene Daten als JSON (Chats, Artifacts, Memories) | Privacy PRD     | Offen  |

**Aufwand:** Verbleibend ~1 Tag (Compliance-Themen)
**Risiko:** Minimal
**Mehrwert:** Performance, UX, Sharing-Faehigkeit

---

### Stufe 2: YouTube + TTS ✅

> Gemini-Erweiterung um die drei meistgewuenschten Features.

| Feature                 | Beschreibung                                                     | Quelle     | Status |
| ----------------------- | ---------------------------------------------------------------- | ---------- | ------ |
| YouTube Search          | Tool `youtube_search`: Stichwortsuche, HTML-Artifact mit Cards   | Gemini PRD | Done   |
| YouTube Analyze         | Tool `youtube_analyze`: URL → Transkript/Zusammenfassung/Analyse | Gemini PRD | Done   |
| Text-to-Speech          | Tool `text_to_speech`: Audio-Generierung inkl. 2-Speaker-Dialog  | Gemini PRD | Done   |
| TTS Quicktask           | Quicktask "Text zu Sprache" mit Stimmen- und Modus-Auswahl       | Gemini PRD | Done   |
| Audio Artifact          | Neuer Artifact-Typ "audio" mit Player im Panel                   | Gemini PRD | Done   |
| Google Search Grounding | Optional: Faktencheck ueber Gemini Search (Scope offen)          | Gemini PRD | Offen  |

**Abhaengigkeiten:** `YOUTUBE_API_KEY` (YouTube Search), `GOOGLE_GENERATIVE_AI_API_KEY` (Analyze + TTS), R2 Storage (TTS Audio)

---

### Stufe 2b: Stitch Design Generation

> Hochwertige UI-Design-Generierung und -Iteration direkt im Chat. Google Stitch als spezialisiertes Design-Backend.

| Feature              | Beschreibung                                                           | Quelle               | Status |
| -------------------- | ---------------------------------------------------------------------- | -------------------- | ------ |
| Design generieren    | Tool `generate_design`: Prompt → production-quality HTML via Stitch    | Stitch PRD Phase 1   | Done   |
| Design iterieren     | Tool `edit_design`: Bestehendes Design mit Follow-up-Prompt verfeinern | Stitch PRD Phase 2   | Done   |
| Device-Targeting     | Desktop/Mobile/Tablet-Auswahl bei Generierung                          | Stitch PRD Phase 1   | Done   |
| Metadata-Feld        | `metadata` JSONB auf Artifacts (fuer Stitch Project/Screen-Zuordnung)  | Stitch PRD Phase 1   | Done   |
| Screenshot-Thumbnail | Stitch-Screenshot als Vorschau-Bild in der Chat-Message                | Stitch PRD Phase 3   | Offen  |
| Design-Varianten     | Mehrere Layout/Farb/Font-Varianten auf einen Klick                     | Stitch PRD (spaeter) | Offen  |

**Aufwand:** 1-2 Tage
**Risiko:** Niedrig — komplett additiv, nutzt bestehenden HTML-Artifact-Typ und HtmlPreview. Kein Breaking Change am Chat-Core.
**Mehrwert:** Hoch — sofortige Qualitaetssteigerung bei UI-Designs, Iteration ermoeglicht Design-Workflow
**Abhaengigkeiten:** `STITCH_API_KEY` (Google), `@google/stitch-sdk` npm Package
**Detail-PRD:** `docs/features/prd-stitch-design-generation.md`

---

### Stufe 3: Anthropic Agent Skills

> Dokument-Generierung direkt im Chat. PPTX, XLSX, DOCX, PDF ueber Anthropic Code Execution.

| Feature              | Beschreibung                                                    | Quelle                   | Status |
| -------------------- | --------------------------------------------------------------- | ------------------------ | ------ |
| Code Execution Tool  | `code_execution` fuer Anthropic-Modelle registrieren            | Agent Skills PRD Phase 1 | Done   |
| Skills-Config        | Standard-Skills (pptx, xlsx, docx, pdf) + Custom Skills per ENV | Agent Skills PRD Phase 1 | Done   |
| Files API Proxy      | `/api/files/[fileId]` Route zum Download generierter Dateien    | Agent Skills PRD Phase 1 | Done   |
| Download-Card        | Neue `FileDownloadCard` Komponente fuer Binaer-Formate im Chat  | Agent Skills PRD Phase 2 | Done   |
| PDF R2-Persistenz    | PDF-Dateien von Files API nach R2 + Artifact persistieren       | Agent Skills PRD Phase 3 | Done   |
| Multi-Turn Container | Container-ID zwischen Steps weiterleiten (`prepareStep`)        | Agent Skills PRD Phase 1 | Done   |
| PDF-Preview Panel    | PDF-Preview im ArtifactPanel via `<embed>` Tag                  | Agent Skills PRD Phase 3 | Offen  |

**Aufwand:** 3-4 Tage
**Risiko:** Mittel — Gateway-Kompatibilitaet muss getestet werden
**Mehrwert:** Hoch — Dokument-Generierung ist ein Killer-Feature (PowerPoint, Excel, PDF)
**Einschraenkung:** Nur mit Anthropic-Modellen, nicht ZDR-faehig (kein Privacy-Routing)
**Abhaengigkeiten:** `ANTHROPIC_API_KEY` (fuer Files-API-Downloads), kein zusaetzlicher API-Key noetig
**Detail-PRD:** `docs/features/PRD-anthropic-agent-skills.md`

---

### Stufe 3b: Deep Research + Quellenverlinkung ✅

> Umfassende Recherche via Gemini Deep Research Agent, Quellenangaben in Artifacts, aktuelles Datum im System-Prompt.

| Feature                 | Beschreibung                                                           | Quelle             | Status |
| ----------------------- | ---------------------------------------------------------------------- | ------------------ | ------ |
| Deep Research Tool      | `deep_research`: Async Recherche via Gemini Interactions API           | Deep Research PRD  | Done   |
| Polling-Architektur     | Client pollt `/api/deep-research/[id]`, Phasen-Timeline in Chat       | Deep Research PRD  | Done   |
| Artifact-Erstellung     | Report als Markdown-Artifact mit `metadata.deepResearch: true`         | Deep Research PRD  | Done   |
| User-Scoping            | In-Memory Ownership-Map verhindert Cross-User-Zugriff                  | Security Review    | Done   |
| Bestaetigungsdialog     | `ask_user` vor Start mit Kostenhinweis (~50.000 Credits)               | Deep Research PRD  | Done   |
| Thought Summaries       | `agent_config.thinking_summaries: "auto"` fuer Live-Phasen-Updates     | Deep Research PRD  | Done   |
| Research-Filter         | "Research"-Tab in Meine Dateien (Artifacts) mit Metadata-Filter        | Neu                | Done   |
| Quellenverlinkung       | Unicode-Superscript-Zitate `⁽¹⁾` + `## Quellen` Verzeichnis          | Quellenverlinkung PRD | Done |
| Sources-Metadata        | `create_artifact` akzeptiert `sources`-Parameter                       | Quellenverlinkung PRD | Done |
| Quellen-Badge           | Badge im Artifact-Header mit Scroll-to-Quellen                        | Quellenverlinkung PRD | Done |
| Datum im System-Prompt  | Aktuelles Datum als Layer 0 verhindert veraltete Suchstrings           | Neu                | Done   |

**Abhaengigkeiten:** `GOOGLE_GENERATIVE_AI_API_KEY` (bereits vorhanden) + `DEEP_RESEARCH_ENABLED=true`
**Detail-PRDs:** `docs/prd-deep-research.md`, `docs/prd-quellenverlinkung-in-artifacts.md`

---

### Stufe 4: Notes System

> Persoenliches Wissensmanagement. Grundlage fuer lernen.diy.

| Phase                 | Beschreibung                                                            | Quelle              |
| --------------------- | ----------------------------------------------------------------------- | ------------------- |
| Phase 1: Schema + API | `notes` Tabelle, Tags, CRUD-Routes, Feature-Flag                        | Notes PRD Phase 1-2 |
| Phase 2: UI           | Notes-Seite, CodeMirror-Editor, Tag-Autocomplete, Sidebar-Link          | Notes PRD Phase 3   |
| Phase 3: AI-Tools     | `search_notes`, `read_note`, `create_note`, `update_note`, `list_notes` | Notes PRD Phase 4   |

**Aufwand:** 3-4 Tage
**Risiko:** Mittel — neues DB-Schema, aber isoliert vom Chat-Core
**Mehrwert:** Hoch — persoenliche Wissensbasis, strategisch fuer lernen.diy
**Detail-PRD:** `docs/features/prd-notes-second-brain-v2.md`

---

### Stufe 5: lernen.diy Launch

> Erste oeffentliche Lern-Instanz. Abhaengig von Stufe 4 (Notes).

| Feature              | Beschreibung                                                  | Quelle                 |
| -------------------- | ------------------------------------------------------------- | ---------------------- |
| Content-Pipeline     | Brainsidian → Skills-Transformation (30-40 Skills)            | lernen.diy PRD Phase 1 |
| Lernbegleiter-Expert | Didaktischer System-Prompt, aktive Lernfortschritt-Verfolgung | lernen.diy PRD Phase 2 |
| Skill-basierte UX    | Lernpfade ueber Quicktasks, Curriculum-Struktur               | lernen.diy PRD Phase 3 |
| Lern-Notizbuch       | Notes als persoenliches Lerntagebuch (Stufe 3 Voraussetzung)  | lernen.diy PRD Phase 4 |

**Aufwand:** 5-7 Tage
**Risiko:** Mittel — Content-Qualitaet entscheidend, technisch auf bestehender Infrastruktur
**Mehrwert:** Neues Produkt — eigenstaendige Lern-Plattform
**Blocker:** Stufe 4 (Notes System)
**Detail-PRD:** `docs/features/prd-lernen-diy-v1.md`

---

### Stufe 5b: Teams & Organisations

> Team-Collaboration fuer Workshops und B2B-Szenarien. Querschnitts-Feature mit Auswirkung auf Experts, Skills, Credits, Sharing und Sidebar.

| Feature               | Beschreibung                                                           | Quelle            |
| --------------------- | ---------------------------------------------------------------------- | ----------------- |
| Team CRUD             | Teams erstellen, verwalten, loeschen mit Slug-basierter Identifikation | Teams PRD Phase A |
| Invite-System         | Token-basierte Einladungen mit Ablaufdatum und optionaler E-Mail       | Teams PRD Phase A |
| RBAC                  | Drei Rollen: Owner, Admin, Member mit abgestuften Berechtigungen       | Teams PRD Phase A |
| Three-Tier-Resolution | Experts/Skills: personal > team > global Priorisierung                 | Teams PRD Phase B |
| Dual-Credit-Pool      | Team-Budget mit Fallback auf persoenliches Budget                      | Teams PRD Phase B |
| Team-Switcher UI      | Kontext-Wechsel in Sidebar zwischen Personal und Teams                 | Teams PRD Phase C |
| Team-Management-Seite | Members, Resources, Credits verwalten unter `/teams/[teamId]`          | Teams PRD Phase C |
| Team-Chat-Sharing     | Chats gezielt mit Teams teilen (neben oeffentlichem Share)             | Teams PRD Phase C |

**Aufwand:** 8-12 Tage (4 Phasen: Backend → Integration → Frontend → Admin)
**Risiko:** Mittel-Hoch — Querschnitts-Feature, aendert 12+ bestehende Dateien (resolve-context, persist, Experts, Skills, Credits, Sidebar)
**Mehrwert:** B2B/Workshop-Faehigkeit, Team-Collaboration, Grundlage fuer skalierte Nutzung
**Abhaengigkeiten:** Stabile Credit-Architektur, Feature-Flag `NEXT_PUBLIC_TEAMS_ENABLED`
**Detail-PRD:** `docs/features/prd-teams.md`

---

### Stufe 6: Monetarisierung + Skalierung

> Plattform fuer zahlende Nutzer vorbereiten.

| Feature                | Beschreibung                                       | Quelle          |
| ---------------------- | -------------------------------------------------- | --------------- |
| Stripe-Integration     | Abo-Tiers mit Credit-Kontingenten, Checkout-Flow   | Neu             |
| Usage-Dashboard        | Nutzer sieht eigenen Verbrauch, Kosten-Transparenz | Neu             |
| Redis-Cache            | Verteilter Cache fuer Multi-Instance-Betrieb       | Performance PRD |
| Client-Virtualisierung | react-window fuer lange Chat-Historien             | Performance PRD |

**Aufwand:** 5-7 Tage
**Risiko:** Hoeher — Payment-Integration, Infrastruktur-Aenderungen
**Mehrwert:** Revenue-Faehigkeit, Skalierbarkeit

---

## Bewusst offen gelassen

| Feature                   | Grund                                                      |
| ------------------------- | ---------------------------------------------------------- |
| Direct Anthropic Provider | AI Gateway bleibt primaer. Kein akuter Bedarf fuer Bypass. |
| Speech-to-Text            | Geringe Prioritaet, kein akuter Einsatz.                   |
| Redis-Cache (Phase 1-5)   | Module-Level-Cache reicht fuer aktuelle Last.              |

---

## Referenzen

| Dokument                   | Pfad                                               |
| -------------------------- | -------------------------------------------------- |
| Original-PRD               | `docs/PRD-ai-chat-platform.md`                     |
| Technische Architektur     | `docs/technical-architecture.md`                   |
| Feature-Flags              | `docs/feature-flags-konfiguration.md`              |
| Admin-Handbuch             | `docs/admin-handbuch.md`                           |
| Gemini PRD                 | `docs/features/prd-gemini-features.md`             |
| Notes PRD                  | `docs/features/prd-notes-second-brain-v2.md`       |
| lernen.diy PRD             | `docs/features/prd-lernen-diy-v1.md`               |
| Performance-Konzept        | `docs/features/performance-caching-concept.md`     |
| Privacy-Guide              | `docs/features/privacy-family-deployment-guide.md` |
| Anthropic Agent Skills PRD | `docs/PRD-anthropic-agent-skills.md`               |
| Stitch Design PRD          | `docs/features/prd-stitch-design-generation.md`    |
| Teams PRD                  | `docs/features/prd-teams.md`                       |
| Deep Research PRD          | `docs/prd-deep-research.md`                        |
| Quellenverlinkung PRD      | `docs/prd-quellenverlinkung-in-artifacts.md`       |
