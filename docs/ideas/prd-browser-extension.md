# PRD: Browser Extension — Context Bridge

> Chrome Extension als Addon zur loschke-chat Plattform. Macht die aktuelle Browser-Seite zum impliziten KI-Kontext.
> **Status:** Entwurf
> **Prioritaet:** Hoch
> **Stand:** 2026-03-31

---

## 1. Kontext und Ziel

### Problem

Business-User verbringen den Grossteil ihrer Arbeitszeit im Browser — auf Wettbewerber-Seiten, in Google Analytics, beim Lesen von Artikeln, beim Schreiben von E-Mails. Die loschke-chat Plattform bietet starke KI-Tools (Experten, Quicktasks, Web-Analyse, Memory), aber der Nutzer muss immer den Kontext wechseln: Tab oeffnen, URL kopieren, Inhalt beschreiben, Expert waehlen. Diese Huerde verhindert Micro-Interactions und spontane Nutzung.

### Loesung

Eine **Chrome Extension** als Kontextbruecke zwischen dem aktuellen Browser-Tab und der Plattform. Kernprinzip: **Die aktuelle Seite ist immer der implizite Kontext.** Der Nutzer muss nichts kopieren oder beschreiben — die Extension weiss, wo er gerade ist, und macht alle Plattform-Features kontextuell verfuegbar.

### Warum jetzt

- Alle APIs existieren bereits (`/api/chat`, `/api/web/scrape`, `/api/experts`, `/api/skills/quicktasks`)
- Chat-Streaming (SSE) funktioniert in Extension-Popups
- Quicktask-System hat `{{variable}}` Template-Ersetzung — erweiterbar um `{{page_content}}`
- Expert-System liefert kontextuelle Kompetenz (SEO Expert fuer Wettbewerber-Seiten, etc.)
- Kein neues Backend noetig — Extension ist reiner Client

---

## 2. User Experience

### 2.1 Page-Aware Popup Chat

Der Nutzer klickt auf das Extension-Icon (oder drueckt `Ctrl+Shift+K`). Ein Popup oeffnet sich:

```
┌─────────────────────────────────┐
│ 🌐 Page: "Acme Corp — Pricing"  │  ← aktuelle Seite als Kontext-Badge
│ [✓ Seitenkontext nutzen]        │  ← Toggle (default: an)
│ ─────────────────────────────── │
│ Expert: [General ▾]             │  ← Expert-Dropdown
│ ─────────────────────────────── │
│                                 │
│  (Chat-Verlauf, Streaming)      │
│                                 │
│ ─────────────────────────────── │
│ [Nachricht eingeben...    ] [→] │
│                                 │
│ [Im Chat oeffnen ↗]            │  ← uebergibt an Plattform
└─────────────────────────────────┘
```

**Verhalten:**

- Bei aktivem Seitenkontext wird der Seiten-Content (Titel, URL, extrahierter Text) als Kontext-Message vorangestellt
- Der Chat ist **ephemeral** (nicht persistiert) — erst bei "Im Chat oeffnen" wird ein persistenter Chat auf der Plattform erstellt
- Expert-Auswahl wirkt sofort (aendert System-Prompt)
- Streaming-Responses wie auf der Plattform

**"Im Chat oeffnen":**

- Erstellt einen neuen Chat auf der Plattform via `/api/chat`
- Uebergibt bisherige Messages + Seitenkontext
- Oeffnet Plattform-Tab mit dem neuen Chat

### 2.2 Page-Aware Quicktasks

Zweiter Tab im Popup: Quicktask-Launcher.

```
┌─────────────────────────────────┐
│ [Chat] [Quicktasks] [Aktionen]  │  ← Tab-Navigation
│ ─────────────────────────────── │
│ 🌐 Page: "Acme Corp — Pricing"  │
│ ─────────────────────────────── │
│ 🔍 Quicktask suchen...          │
│                                 │
│ Marketing                       │
│  ├─ Social-Media-Mix            │
│  ├─ SEO-Analyse          ⭐     │  ← Empfohlen fuer diese Seite
│  └─ Content-Bewertung    ⭐     │
│ Produktivitaet                  │
│  ├─ Meeting-Vorbereitung        │
│  └─ Zusammenfassung             │
│                                 │
└─────────────────────────────────┘
```

**Bei Klick auf Quicktask:**

- Formular oeffnet sich im Popup
- Felder die `{{page_content}}` oder `{{page_url}}` enthalten sind vorausgefuellt
- Falls der Quicktask ein Textfeld hat und kein spezielles Page-Mapping: Option "Seiteninhalt einfuegen"
- Ergebnis wird im Popup angezeigt (Markdown-Rendering)
- Option "Als Artifact oeffnen" → Plattform-Tab

**Smart-Empfehlung (⭐):**

- Extension analysiert die aktuelle URL/Domain und empfiehlt passende Quicktasks
- Heuristik: URL-Patterns → Quicktask-Kategorie
  - `*.youtube.com` → YouTube-bezogene Tasks
  - `analytics.google.com` → Data-Analyse Tasks
  - Blog/Artikel (erkannt via Meta-Tags) → Content-Bewertung, SEO-Analyse
  - Competitor-Domains (falls in Memory/Projekt definiert) → Wettbewerbs-Analyse

### 2.3 Send to Chat (Kontextmenue)

Rechtsklick auf markierten Text oder auf der Seite:

```
Rechtsklick auf markierten Text:
  └─ "An loschke-chat senden"
      ├─ "Im Popup besprechen"     → Popup oeffnet mit Text als Kontext
      ├─ "Neuen Chat starten"      → Plattform-Tab mit Text + URL
      └─ "Quicktask ausfuehren..." → Quicktask-Auswahl mit Text als Input
```

**Verhalten:**

- Markierter Text wird als expliziter Kontext gesendet (zusaetzlich zum optionalen Seiten-Kontext)
- URL der Quelle wird immer mitgesendet
- Bei "Neuen Chat starten": Plattform oeffnet sich mit vorausgefuellter Nachricht

### 2.4 Page Actions (Schnellaktionen)

Dritter Tab im Popup — One-Click-Aktionen fuer die aktuelle Seite:

```
┌─────────────────────────────────┐
│ [Chat] [Quicktasks] [Aktionen]  │
│ ─────────────────────────────── │
│ 🌐 Page: "Acme Corp — Pricing"  │
│ ─────────────────────────────── │
│                                 │
│ [📝 Seite zusammenfassen]       │
│ [🎯 Key Takeaways]              │
│ [❓ Frage zu dieser Seite]      │  → wechselt zu Chat-Tab
│ [🔍 SEO-Check]                  │  → startet SEO-Quicktask
│                                 │
│ ─────────────── Ergebnis ────── │
│                                 │
│ ## Zusammenfassung               │
│ Acme Corp bietet drei Preis-    │
│ stufen an: Starter ($29/Mo),    │
│ Pro ($99/Mo) und Enterprise...  │
│                                 │
│ [Kopieren] [Im Chat oeffnen ↗] │
└─────────────────────────────────┘
```

**Aktionen:**

- **Zusammenfassen** — Seiten-Content extrahieren, Summary generieren (ephemeral, kein Chat)
- **Key Takeaways** — Bullet-Point-Extraktion
- **Frage stellen** — Wechselt zum Chat-Tab mit Seitenkontext
- **SEO-Check** — Startet den SEO-Analyse Quicktask mit der Seite als Input
- **Dynamische Aktionen** — Basierend auf Seiten-Typ werden relevante Aktionen hervorgehoben

---

## 3. Technische Architektur

### 3.1 Extension-Struktur (Manifest V3)

```
extension/
├── manifest.json              — Manifest V3, Permissions
├── service-worker.ts          — Background: API-Calls, Auth, Context Menu
├── popup/                     — Popup UI (React/Preact, ~100KB Budget)
│   ├── App.tsx                — Tab-Router (Chat, Quicktasks, Actions)
│   ├── ChatView.tsx           — Ephemeral Streaming Chat
│   ├── QuicktaskView.tsx      — Quicktask-Launcher + Formulare
│   ├── ActionsView.tsx        — One-Click Page Actions
│   └── SettingsView.tsx       — Extension-Einstellungen
├── content-script.ts          — Page-Content-Extraktion
├── options/                   — Settings-Seite (Auth, Prefs)
└── lib/
    ├── page-context.ts        — Readability-basierte Extraktion
    ├── api-client.ts          — Plattform-API Wrapper
    ├── stream-parser.ts       — SSE Stream Parser (AI SDK Data Protocol)
    └── expert-heuristics.ts   — URL → Expert/Quicktask Mapping
```

### 3.2 Page Context Extraction

**Strategie: Lokal zuerst, API als Fallback**

1. **Content Script** extrahiert direkt aus dem DOM:
   
   - `document.title` — Seitentitel
   - `window.location.href` — URL
   - `document.querySelector('meta[name="description"]')` — Meta-Description
   - **Readability-Algorithmus** (Mozilla Readability, ~15KB) — extrahiert Hauptinhalt als Clean Text
   - `document.querySelector('article')` oder `main` als Fallback

2. **Fallback via API:** Wenn Content Script nicht greifen kann (z.B. CSP, PDF):
   
   - `/api/web/scrape` mit der URL aufrufen
   - Ergebnis cachen fuer die Session

3. **Token-Budget:** Max 8000 Zeichen aus der Seite (ca. 2000 Tokens)
   
   - Readability-Output truncaten
   - Titel + URL immer enthalten (auch wenn Inhalt gekuerzt)

4. **Spezialbehandlung:**
   
   - **YouTube:** URL erkennen, nur `videoId` extrahieren → Plattform nutzt `youtube_analyze`
   - **PDF im Browser:** Content Script kann nicht greifen → API Fallback
   - **SPAs:** MutationObserver fuer dynamisch geladene Inhalte

### 3.3 Auth-Strategie

**Primaer: API-Token (empfohlen)**

Warum nicht Cookie-Reuse:

- Cookies sind `httpOnly` und auf die Plattform-Domain gescopet
- Extension auf `chrome-extension://` Origin hat keinen Zugriff
- CORS-Preflight wuerde fehlschlagen

**Loesung: Persoenlicher API-Token**

1. Neues DB-Feld: `users.apiToken` (nanoid, 32 Zeichen, nullable)
2. Neuer Endpoint: `GET /api/user/token` — generiert/zeigt Token
3. Neuer Endpoint: `POST /api/auth/token-verify` — validiert Token, gibt User zurueck
4. Extension-Settings: User traegt Token ein (einmalig)
5. Alle API-Calls: `Authorization: Bearer <token>` Header

**Auth-Middleware Erweiterung:**

```typescript
// In requireAuth(): Token-basierte Auth als Alternative zu Cookie
const authHeader = req.headers.get("authorization")
if (authHeader?.startsWith("Bearer ")) {
  const token = authHeader.slice(7)
  const user = await getUserByApiToken(token)
  if (user) return { user, error: null }
}
```

**Token-Verwaltung:**

- Token generieren/regenerieren in User-Settings auf der Plattform
- Token widerrufen invalidiert Extension sofort
- Rate-Limiting gilt pro User (wie bisher)

### 3.4 API-Integration (bestehende Endpoints)

| Feature                | Endpoint                       | Methode    | Anpassung noetig?                        |
| ---------------------- | ------------------------------ | ---------- | ---------------------------------------- |
| Popup Chat             | `/api/chat`                    | POST (SSE) | Nein — `chatId` optional, dann ephemeral |
| Expert-Liste           | `/api/experts`                 | GET        | Nein                                     |
| Quicktask-Liste        | `/api/skills/quicktasks`       | GET        | Nein                                     |
| Page Scrape (Fallback) | `/api/web/scrape`              | POST       | Nein                                     |
| PII-Check              | `/api/business-mode/pii-check` | POST       | Nein                                     |
| Memory speichern       | `/api/user/memories`           | POST       | Nein                                     |
| User-Prefs             | `/api/user/instructions`       | GET        | Nein                                     |

### 3.5 Neue API-Endpoints

#### `POST /api/extension/quick-action`

Leichtgewichtiger Endpoint fuer Page Actions (Summary, Takeaways) ohne Chat-Persistierung:

```typescript
// Schema
{
  action: "summary" | "takeaways" | "analyze",
  pageContext: {
    url: string,
    title: string,
    content: string,      // max 8000 chars
    selection?: string     // markierter Text
  },
  expertId?: string,       // optionaler Expert
  modelId?: string
}

// Response: SSE Stream (gleiche AI SDK Data Protocol)
```

**Warum eigener Endpoint:**

- Kein Chat wird erstellt (kein chatId, keine Persistierung)
- Festes System-Prompt fuer jede Action (kein Expert-Layer noetig bei Summary)
- Schneller (kein resolve-context, kein onFinish)
- Rate-Limit: eigenes Preset (`extension: 30/min`)

#### `POST /api/extension/handoff`

Erstellt einen Chat auf der Plattform und uebergibt den Popup-Verlauf:

```typescript
// Schema
{
  messages: UIMessage[],       // bisheriger Popup-Verlauf
  pageContext?: PageContext,    // Seiten-Kontext
  expertId?: string,
  modelId?: string
}

// Response
{
  chatId: string,
  url: string                  // z.B. "/c/abc123"
}
```

#### `GET /api/user/token`

Token-Verwaltung (siehe 3.3 Auth):

```typescript
// GET: Existierenden Token anzeigen (maskiert) oder neuen generieren
// POST: Token regenerieren (alter wird invalidiert)
// DELETE: Token widerrufen
```

### 3.6 Datenfluss: Page Context → Chat/Quicktask

**Popup Chat mit Seitenkontext:**

```
Content Script                    Service Worker                  Platform API
     │                                 │                               │
     │ ── extractPageContext() ──→      │                               │
     │ ← { title, url, content } ──    │                               │
     │                                 │                               │
     │    User tippt Nachricht         │                               │
     │ ──────────────────────────→     │                               │
     │                                 │ ── POST /api/chat ──────────→ │
     │                                 │    messages: [                 │
     │                                 │      { role: "user",          │
     │                                 │        content: [             │
     │                                 │          { type: "text",      │
     │                                 │            text: "Kontext:\n  │
     │                                 │            Seite: {title}\n   │
     │                                 │            URL: {url}\n       │
     │                                 │            Inhalt: {content}" │
     │                                 │          },                   │
     │                                 │          { type: "text",      │
     │                                 │            text: "{userMsg}"  │
     │                                 │          }                    │
     │                                 │        ]                      │
     │                                 │      }                        │
     │                                 │    ]                          │
     │                                 │ ← SSE Stream ────────────────│
     │ ← Streaming Response ──────    │                               │
```

**Quicktask mit Seitenkontext:**

```
1. User waehlt Quicktask "SEO-Analyse"
2. Extension laedt Quicktask-Fields via /api/skills/quicktasks
3. Formular zeigt Felder an:
   - "URL" → vorausgefuellt mit page.url
   - "Seiteninhalt" → vorausgefuellt mit page.content (readonly)
   - Weitere Felder → User fuellt aus
4. Submit: POST /api/chat mit quicktaskSlug + quicktaskData
   - quicktaskData["page_url"] = page.url
   - quicktaskData["page_content"] = page.content (truncated)
```

**Quicktask-Schema Erweiterung:**

Neue Field-Option `autoFill`:

```typescript
{
  key: "url",
  label: "URL",
  type: "text",
  autoFill: "page_url"     // Extension fuellt automatisch
}
{
  key: "content",
  label: "Seiteninhalt",
  type: "textarea",
  autoFill: "page_content"  // Extension fuellt automatisch
}
```

Admin kann bei Quicktask-Fields `autoFill` setzen. Die Extension erkennt das und befuellt. Rueckwaertskompatibel — auf der Plattform wird `autoFill` ignoriert.

---

## 4. Scope und Phasen

### Phase 1 — MVP: Context Bridge (Ziel: 2-3 Wochen)

**In Scope:**

- [ ] Extension-Grundgeruest (Manifest V3, Popup mit 3 Tabs)
- [ ] Page Context Extraction (Content Script + Readability)
- [ ] API-Token Auth (`/api/user/token`, Bearer-Auth in `requireAuth()`)
- [ ] Popup Chat (ephemeral, Streaming, Expert-Select, Seitenkontext-Toggle)
- [ ] Send to Chat (Kontextmenue: markierter Text → Popup oder Plattform)
- [ ] Page Actions: Zusammenfassen + Key Takeaways (`/api/extension/quick-action`)
- [ ] "Im Chat oeffnen" Handoff (`/api/extension/handoff`)

**Backend-Aenderungen Phase 1:**

- `users` Tabelle: `apiToken` Feld hinzufuegen
- `requireAuth()`: Bearer-Token als Alternative zu Cookie
- Neuer Endpoint: `/api/user/token` (GET/POST/DELETE)
- Neuer Endpoint: `/api/extension/quick-action` (POST, SSE)
- Neuer Endpoint: `/api/extension/handoff` (POST)
- Rate-Limit Preset: `extension: 30/min`

### Phase 2 — Quicktasks + Smart Context (2-3 Wochen)

- [ ] Quicktask-Launcher im Popup (Laden, Filtern, Kategorien)
- [ ] Quicktask-Formulare mit autoFill fuer Seitenkontext
- [ ] Smart-Empfehlung (URL-Heuristik → passende Quicktasks/Experten)
- [ ] Quicktask-Schema: `autoFill` Property im Skills-System
- [ ] Ergebnis-Rendering im Popup (Markdown)
- [ ] "Als Artifact oeffnen" → Plattform-Tab
- [ ] YouTube-Erkennung (URL → Popup zeigt YouTube-spezifische Aktionen)

### Phase 3 — Polish + Business Mode (1-2 Wochen)

- [ ] Keyboard Shortcuts (Ctrl+Shift+K: Popup, Ctrl+Shift+S: Seite zusammenfassen)
- [ ] PII-Check vor dem Senden (nutzt `/api/business-mode/pii-check`)
- [ ] Extension-Settings (Default-Expert, Shortcuts, Seitenkontext-Default)
- [ ] Popup-Chat History (letzte 5 ephemeral Chats in Extension Storage)
- [ ] Badge-Icon mit Status (authentifiziert/nicht authentifiziert)
- [ ] Onboarding-Flow (Token einrichten, erste Aktion)

### Explizit NICHT in Scope (spaeter):

- Inline Assist (Textfeld-Overlay) → Phase 4, eigenes PRD
- Research Companion (Multi-Tab Sessions) → Phase 5
- Firefox/Safari Support → nach Chrome-Validierung
- Offline-Funktionalitaet
- Eigene Chat-Persistierung in der Extension
- Notifications/Push

---

## 5. Datenmodell-Aenderungen

### Neue Felder

```sql
-- users Tabelle
ALTER TABLE users ADD COLUMN api_token TEXT UNIQUE;
CREATE INDEX idx_users_api_token ON users(api_token) WHERE api_token IS NOT NULL;
```

### Neue Skill-Field Property

```typescript
// In skills.fields Schema erweitern:
{
  key: string,
  label: string,
  type: "text" | "textarea" | "select",
  required?: boolean,
  options?: string[],
  autoFill?: "page_url" | "page_content" | "page_title" | "selection"  // NEU
}
```

---

## 6. Architektur-Regeln (nicht verhandelbar)

### Regel 1: Isolation — Kein Touch an bestehende Chat-Route

Die Extension bekommt eigene Endpoints unter `/api/extension/`. Die bestehende `/api/chat` Route wird **nicht modifiziert**. Grund: Die Chat-Route ist der kritischste Pfad der Plattform (Streaming, Persistierung, Credit-Abrechnung, Memory, onFinish-Pipeline). Jede Aenderung dort betrifft alle Nutzer, nicht nur Extension-User.

**Konkret:**

- Ephemeral Page Actions laufen ueber `/api/extension/quick-action` (eigener Endpoint, eigene Logik)
- Chat-Handoff erstellt einen regulaeren Chat ueber `/api/extension/handoff`, nicht durch Modifikation der Chat-Route
- Eigenes Rate-Limit-Preset `extension` — unabhaengig vom Chat-Preset
- Kein `ephemeral: true` Flag in der Chat-Route — stattdessen eigener Endpoint

### Regel 2: Auth als separater Code-Pfad

Bearer-Token-Validierung wird als eigene Funktion `validateBearerToken()` implementiert, **nicht in die Logto-Cookie-Logik eingebaut**. Grund: Zwei Auth-Mechanismen in einer Funktion vermischt erhoehen die Angriffsflaeche. Ein Bug in der Token-Logik darf nicht die Cookie-Auth beeinflussen und umgekehrt.

**Konkret:**

- `validateBearerToken(req)` — eigene Funktion in `src/lib/auth/token.ts`
- `requireAuth()` ruft zuerst Cookie-Auth auf, dann als Fallback `validateBearerToken()`
- Beide Pfade returnen dasselbe Format `{ user, error }`, aber teilen keinen Code ausser dem Return-Type
- Token-spezifische Logik (Hashing, Lookup, Cache) lebt in eigenem Modul, nicht in `api-guards.ts`

---

## 7. Risiken und Mitigations

### Plattform-Stabilitaet: Niedrig

| Risiko                                                           | Bewertung      | Mitigation                                                              |
| ---------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------- |
| Aenderungen an Chat-Route destabilisieren Plattform              | Ausgeschlossen | Regel 1: Eigene Endpoints, kein Touch                                   |
| DB-Load durch Token-Lookup bei jedem Request                     | Niedrig        | In-Memory-Cache mit 30s TTL auf `getUserByApiToken()`                   |
| Request-Spikes durch One-Click Actions (viele User gleichzeitig) | Niedrig-Mittel | Eigenes Rate-Limit-Preset, ggf. strenger (15/min)                       |
| Ephemeral Chats ohne Usage-Log/Credit-Abrechnung                 | Niedrig        | `quick-action` Endpoint loggt Usage separat, Credits werden abgerechnet |

### Sicherheit: Mittel (beherrschbar)

| Risiko                                        | Bewertung | Mitigation                                                                                                                                |
| --------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| API-Token in Extension-Storage kompromittiert | Mittel    | Token gehashed in DB, nur einmal im Klartext. Token-Rotation und Widerruf in User-Settings. Kein Zugriff auf Admin-Funktionen ueber Token |
| Auth-Bypass durch Bug in Token-Validierung    | Mittel    | Regel 2: Separater Code-Pfad. Automatisierte Tests fuer valid/invalid/expired Token                                                       |
| CORS-Oeffnung erweitert Angriffsflaeche       | Niedrig   | Service Worker als Proxy — keine CORS-Aenderung an der Plattform noetig                                                                   |
| Content Script liest sensible Seiteninhalte   | Niedrig   | Nur `activeTab` Permission (kein permanenter Zugriff), kein Zugriff auf Formulare/Passwoerter                                             |

### Wartung und Betrieb: Mittel

| Risiko                                                                 | Bewertung      | Mitigation                                                                                                           |
| ---------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------- |
| Chrome Extension API aendert sich (Manifest V3 Policies)               | Mittel         | Extension ist Bonus-Feature, kein kritischer Pfad. Kann bei Breaking Changes pausiert werden                         |
| Chrome Web Store Review-Prozess verzoegert Updates                     | Niedrig-Mittel | Initiale Review kann Wochen dauern. Fuer Testzwecke: interner .crx Download                                          |
| Page Context Extraktion versagt auf bestimmten Seiten (SPAs, Paywalls) | Mittel         | Graceful Degradation: Fallback auf API-Scrape, dann auf Titel+URL only. Kein Plattform-Risiko, nur UX-Einschraenkung |
| Popup schliesst bei Klick ausserhalb, Stream bricht ab                 | Mittel         | Offene Frage: Side Panel statt Popup (siehe Abschnitt 11). Kurzfristig: letzte Response in Extension-Storage cachen  |

### Gesamt-Einschaetzung

Die Extension ist als **Bonus-Feature** konzipiert und darf die Plattform-Stabilitaet nicht gefaehrden. Durch die zwei Architektur-Regeln (Isolation + separater Auth-Pfad) bleibt das Risiko fuer die bestehende Plattform **niedrig**. Das hoechste Risiko liegt im Wartungsaufwand der Extension selbst, nicht in der Plattform-Integration.

---

## 8. Security

- **API-Token:** 32-Zeichen nanoid, gehashed in DB (`crypto.subtle.digest`), nur einmal im Klartext angezeigt
- **Token-Scope:** Gleiche Rechte wie Session-Auth (gleicher User)
- **Rate-Limiting:** Eigenes Extension-Preset, zaehlt gegen User-Gesamt-Limits
- **Content Script:** Kein Zugriff auf Passwort-Felder oder Formular-Inhalte — nur Seiten-Content
- **CORS:** Extension-Origin in API-CORS-Headers erlauben (oder via Service Worker proxyen)
- **Permissions:** `activeTab` (Seiteninhalt nur bei Klick), `contextMenus`, `storage`
- **PII-Check:** Optional vor jedem Send (wenn Business Mode aktiv)
- **Kein Tracking:** Extension sendet keine Analytics, nur API-Calls an eigene Plattform

---

## 9. Kritische Dateien

### Backend (zu aendern)

| Datei                                         | Aenderung                            |
| --------------------------------------------- | ------------------------------------ |
| `src/lib/db/schema/users.ts`                  | `apiToken` Feld                      |
| `src/lib/api-guards.ts`                       | Bearer-Token Auth in `requireAuth()` |
| `src/app/api/user/token/route.ts`             | NEU: Token CRUD                      |
| `src/app/api/extension/quick-action/route.ts` | NEU: Ephemeral Page Actions          |
| `src/app/api/extension/handoff/route.ts`      | NEU: Chat-Handoff                    |
| `src/lib/rate-limit.ts`                       | `extension` Preset hinzufuegen       |
| `src/lib/db/queries/users.ts`                 | `getUserByApiToken()` Query          |

### Extension (neu)

| Datei                               | Funktion                       |
| ----------------------------------- | ------------------------------ |
| `extension/manifest.json`           | Manifest V3, Permissions       |
| `extension/service-worker.ts`       | API-Client, Auth, Context Menu |
| `extension/content-script.ts`       | Page Content Extraction        |
| `extension/popup/App.tsx`           | Tab-Router                     |
| `extension/popup/ChatView.tsx`      | Ephemeral Streaming Chat       |
| `extension/popup/QuicktaskView.tsx` | Quicktask-Launcher             |
| `extension/popup/ActionsView.tsx`   | Quick Page Actions             |
| `extension/lib/page-context.ts`     | Readability-Extraktion         |
| `extension/lib/api-client.ts`       | Plattform-API Wrapper          |
| `extension/lib/stream-parser.ts`    | SSE Parsing                    |

---

## 10. Verifikation

### Manuelle Tests Phase 1

1. **Auth:** Token auf Plattform generieren → in Extension eintragen → API-Call erfolgreich
2. **Page Context:** Artikel-Seite oeffnen → Popup → Seitenkontext wird angezeigt (Titel, URL, Auszug)
3. **Popup Chat:** Frage stellen mit Seitenkontext → Streaming-Antwort bezieht sich auf die Seite
4. **Expert-Switch:** Expert wechseln → naechste Antwort nutzt anderen Ton/Stil
5. **Seitenkontext-Toggle:** Toggle aus → Frage stellen → Antwort hat keinen Seiten-Bezug
6. **Send to Chat:** Text markieren → Rechtsklick → "Im Popup besprechen" → Popup oeffnet mit markiertem Text
7. **Page Action:** "Zusammenfassen" klicken → Summary erscheint im Popup
8. **Handoff:** "Im Chat oeffnen" klicken → Plattform-Tab oeffnet sich mit dem bisherigen Verlauf
9. **Rate-Limit:** 31 Quick Actions in 1 Minute → 429 Response
10. **Kein Token:** Extension ohne Token → alle API-Calls zeigen "Bitte Token eintragen" Meldung

### Automatisierte Tests

- API-Token-Auth Unit Tests (valid token, invalid token, expired token)
- Quick-Action Endpoint Integration Tests
- Handoff Endpoint Integration Tests
- Rate-Limit Tests fuer Extension-Preset

---

## 11. Offene Fragen fuer Team-Besprechung

1. **Branding:** Extension unter loschke-chat Brand oder neutral fuer White-Label?
2. **Distribution:** Chrome Web Store (public) oder nur interner .crx Download?
3. **Monetarisierung:** Extension als Premium-Feature oder Basis-Angebot?
4. **Ephemeral Chat Credits:** Zaehlen ephemeral Popup-Chats gegen das Credit-Budget?
5. **Side Panel vs Popup:** Chrome Side Panel (persistent, groesser) statt Popup (kleiner, schliesst bei Klick ausserhalb)?
6. **Repo-Struktur:** Extension als Monorepo-Package oder eigenes Repository?
