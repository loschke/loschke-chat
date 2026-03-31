# Feature-Flags & Konfiguration

Vollstaendige Uebersicht aller konfigurierbaren Features, Environment Variables und Deployment-Optionen. Grundlage fuer die Planung von Monetarisierungs-Tiers.

---

## 1. Feature-Flag-Registry

Alle Flags leben in `src/config/features.ts`. 21 Flags in drei Aktivierungsmustern:

### Opt-Out (Standard aktiv, explizit deaktivierbar)

| Flag       | ENV Variable                  | Default | Beschreibung                                   |
| ---------- | ----------------------------- | ------- | ---------------------------------------------- |
| `chat`     | `NEXT_PUBLIC_CHAT_ENABLED`    | `true`  | Kern-Chat-Funktionalitaet (Sidebar + Fullpage) |
| `mermaid`  | `NEXT_PUBLIC_MERMAID_ENABLED` | `true`  | Diagramm-Rendering in Chat-Antworten           |
| `darkMode` | `NEXT_PUBLIC_DARK_MODE`       | `true`  | Light/Dark Mode Toggle im Header               |

Deaktivierung: ENV auf `"false"` setzen.

### Opt-In Server (aktiv wenn API-Key/ENV gesetzt)

| Flag              | ENV Variable                                                                      | Beschreibung                                            |
| ----------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `web`             | `FIRECRAWL_API_KEY`                                                               | Firecrawl Web-Services (Search, Scrape, Crawl, Extract) |
| `search`          | `FIRECRAWL_API_KEY` \| `JINA_API_KEY` \| `TAVILY_API_KEY` \| `PERPLEXITY_API_KEY` \| `SEARXNG_URL` | Web-Such-Tools im Chat (mindestens ein Provider)        |
| `storage`         | `R2_ACCESS_KEY_ID` \| `S3_ACCESS_KEY_ID`                                          | S3-kompatibler File-Upload/Download (R2 oder MinIO)     |
| `mcp`             | `MCP_ENABLED`                                                                     | Model Context Protocol (externe Tool-Server)            |
| `admin`           | `ADMIN_EMAILS` \| `SUPERADMIN_EMAIL`                                              | Admin-UI fuer Skills/Experts/Models/MCP/Credits/Users   |
| `memory`          | `MEM0_API_KEY` \| `MEM0_BASE_URL`                                                 | Persistentes Memory ueber Sessions hinweg (Cloud/Self-Hosted) |
| `imageGeneration` | `GOOGLE_GENERATIVE_AI_API_KEY`                                                    | Bildgenerierung via Gemini                              |
| `youtube`         | `YOUTUBE_API_KEY`                                                                 | YouTube-Video-Suche im Chat                             |
| `tts`             | `GOOGLE_GENERATIVE_AI_API_KEY`                                                    | Text-to-Speech (Gemini TTS)                             |
| `branding`        | `FIRECRAWL_API_KEY`                                                               | Branding-Extraktion von Webseiten                       |
| `stitch`          | `STITCH_API_KEY`                                                                  | UI-Design-Generierung via Google Stitch                 |
| `deepResearch`    | `GOOGLE_GENERATIVE_AI_API_KEY` + `DEEP_RESEARCH_ENABLED=true`                     | Deep Research (Gemini Interactions API, Doppel-Gate)     |
| `googleSearch`    | `GOOGLE_GENERATIVE_AI_API_KEY` + `GOOGLE_SEARCH_ENABLED=true`                     | Google Search Grounding (Gemini, Doppel-Gate)            |
| `anthropicSkills` | `ANTHROPIC_SKILLS_ENABLED` (Default: `true`, opt-out)                             | Code Execution fuer Office-Dokumente (Anthropic)        |

Aktivierung: Zugehoerigen API-Key oder ENV-Variable setzen.

### Opt-In Client (Build-Zeit, im Client-Bundle)

| Flag           | ENV Variable                  | Default | Beschreibung                                             |
| -------------- | ----------------------------- | ------- | -------------------------------------------------------- |
| `businessMode` | `NEXT_PUBLIC_BUSINESS_MODE`        | `false` | PII-Erkennung, Privacy-Routing, Consent-Logging          |
| `credits`      | `NEXT_PUBLIC_CREDITS_ENABLED`      | `false` | Credit-System mit Balance-Tracking und Verbrauchsanzeige |
| `userSkills`   | `NEXT_PUBLIC_USER_SKILLS_ENABLED`  | `false` | User-eigene Skills erstellen und verwalten               |

Aktivierung: ENV auf `"true"` setzen. Aenderung erfordert Re-Build (Build-Zeit-Inlining).

---

## 2. Environment Variables (vollstaendig)

### Core (Pflicht fuer jede Instanz)

| Variable              | Typ            | Beschreibung                                                 |
| --------------------- | -------------- | ------------------------------------------------------------ |
| `LOGTO_APP_ID`        | String         | Logto OIDC Application ID                                    |
| `LOGTO_APP_SECRET`    | String         | Logto Application Secret                                     |
| `LOGTO_ENDPOINT`      | URL            | Logto Auth-Endpoint (z.B. `https://auth.lernen.diy`)         |
| `LOGTO_BASE_URL`      | URL            | App-Base-URL fuer Redirects (`http://localhost:3000` in Dev) |
| `LOGTO_COOKIE_SECRET` | String         | Session-Verschluesselung (min. 32 Zeichen)                   |
| `DATABASE_URL`        | PostgreSQL URI | Neon-Datenbankverbindung mit `?sslmode=require`              |
| `AI_GATEWAY_API_KEY`  | String         | Vercel AI Gateway API Key                                    |

### Branding

| Variable            | Typ                                                        | Default  | Beschreibung                              |
| ------------------- | ---------------------------------------------------------- | -------- | ----------------------------------------- |
| `NEXT_PUBLIC_BRAND` | `lernen` \| `unlearn` \| `loschke` \| `prototype` \| `aok` | `lernen` | Brand-Identitaet und Domain-Konfiguration |

### AI & Chat

| Variable                    | Typ                           | Default                       | Beschreibung                                 |
| --------------------------- | ----------------------------- | ----------------------------- | -------------------------------------------- |
| `DEFAULT_MODEL_ID`          | String                        | `anthropic/claude-sonnet-4-6` | Standard-Modell wenn User keins gewaehlt hat |
| `MODELS_CONFIG`             | JSON Array                    | —                             | Fallback Model-Definitionen wenn DB leer     |
| `NEXT_PUBLIC_DEFAULT_THEME` | `light` \| `dark` \| `system` | `light`                       | Initiales Theme beim ersten Besuch           |

### Storage (S3-kompatibel: Cloudflare R2 oder MinIO)

| Variable               | Typ    | Beschreibung                                       |
| ---------------------- | ------ | -------------------------------------------------- |
| `R2_ACCOUNT_ID`        | String | Cloudflare Account ID (nur R2)                     |
| `R2_ACCESS_KEY_ID`     | String | R2 API Key (aktiviert Storage-Feature)             |
| `R2_SECRET_ACCESS_KEY` | String | R2 API Secret                                      |
| `R2_BUCKET_NAME`       | String | S3-Bucket-Name                                     |
| `R2_PUBLIC_DOMAIN`     | String | Oeffentliche CDN-Domain (z.B. `assets.lernen.diy`) |
| `R2_S3_ENDPOINT`       | URL    | R2 S3-kompatibler Endpoint                         |
| `S3_ACCESS_KEY_ID`     | String | Alternativer S3-Key (MinIO/AWS, aktiviert Storage) |
| `S3_SECRET_ACCESS_KEY` | String | Alternativer S3-Secret                             |
| `S3_ENDPOINT`          | URL    | S3-kompatibler Endpoint (z.B. MinIO)               |
| `S3_BUCKET_NAME`       | String | S3-Bucket-Name (Alternative zu R2)                 |
| `S3_PUBLIC_DOMAIN`     | String | Oeffentliche Domain fuer S3-Assets                 |

### Web-Services

| Variable             | Typ    | Beschreibung                                                                |
| -------------------- | ------ | --------------------------------------------------------------------------- |
| `FIRECRAWL_API_KEY`  | String | Firecrawl (Search, Scrape, Crawl, Extract)                                  |
| `JINA_API_KEY`       | String | Alternativer Web-Fetch-Provider                                             |
| `TAVILY_API_KEY`     | String | Alternativer Web-Search-Provider                                            |
| `PERPLEXITY_API_KEY` | String | Alternativer Web-Search-Provider                                            |
| `SEARXNG_URL`        | URL    | SearXNG Self-Hosted Suchmaschine (EU/Local Alternative)                     |
| `SEARCH_PROVIDER`    | String | Default: `firecrawl`. Steuert welcher Provider fuer Chat-Tools genutzt wird |
| `FETCH_PROVIDER`     | String | Separater Provider fuer web_fetch (z.B. `jina`)                             |

### Memory (Mem0)

| Variable              | Typ     | Default | Beschreibung                             |
| --------------------- | ------- | ------- | ---------------------------------------- |
| `MEM0_API_KEY`        | String  | —       | Mem0 Cloud API Key (Feature-Gate)        |
| `MEM0_BASE_URL`       | URL     | —       | Self-Hosted Mem0 URL (Alternative zu Cloud, Feature-Gate) |
| `MEMORY_SEARCH_LIMIT` | Integer | `10`    | Max Memories im System-Prompt            |
| `MEMORY_MIN_MESSAGES` | Integer | `6`     | Min Messages vor Auto-Extraktion         |

### Credit-System

| Variable                      | Typ     | Default  | Beschreibung                             |
| ----------------------------- | ------- | -------- | ---------------------------------------- |
| `NEXT_PUBLIC_CREDITS_ENABLED` | Boolean | `false` | Aktiviert Credit-Tracking                |
| `CREDITS_PER_DOLLAR`          | Integer | `100`   | Credits pro Dollar (100 = 1 Credit = 1 Cent) |
| `FALLBACK_INPUT_PRICE`        | Float   | `1.0`   | Default Input-Token-Preis pro 1M ($/1M)  |
| `FALLBACK_OUTPUT_PRICE`       | Float   | `5.0`   | Default Output-Token-Preis pro 1M ($/1M) |
| `IMAGE_GENERATION_CREDITS`    | Integer | `8`     | Flat-Rate Credits pro Bildgenerierung    |
| `YOUTUBE_SEARCH_CREDITS`      | Integer | `1`     | Flat-Rate Credits pro YouTube-Suche      |
| `YOUTUBE_ANALYZE_CREDITS`     | Integer | `5`     | Flat-Rate Credits pro YouTube-Analyse    |
| `TTS_CREDITS`                 | Integer | `3`     | Flat-Rate Credits pro TTS-Generierung    |
| `BRANDING_CREDITS`            | Integer | `1`     | Flat-Rate Credits pro Branding-Extrakt.  |
| `STITCH_GENERATION_CREDITS`   | Integer | `5`     | Flat-Rate Credits pro Stitch-Design      |
| `DEEP_RESEARCH_CREDITS`       | Integer | `400`   | Flat-Rate Credits pro Deep Research      |
| `GOOGLE_SEARCH_CREDITS`       | Integer | `1`     | Flat-Rate Credits pro Google Search      |

### Business Mode

| Variable                      | Typ     | Default | Beschreibung                                      |
| ----------------------------- | ------- | ------- | ------------------------------------------------- |
| `NEXT_PUBLIC_BUSINESS_MODE`   | Boolean | `false` | Aktiviert PII-Erkennung und Privacy-Routing       |
| `BUSINESS_MODE_PII_DETECTION` | String  | `regex` | PII-Erkennungsmethode                             |
| `BUSINESS_MODE_PRIVACY_URL`   | URL     | —       | Link zur Datenschutzerklaerung                    |
| `BUSINESS_MODE_EU_MODEL`      | String  | —       | EU-konformes Modell (z.B. `mistral-large-latest`) |
| `MISTRAL_API_KEY`             | String  | —       | Mistral API Key fuer EU-Routing                   |
| `BUSINESS_MODE_LOCAL_MODEL`   | String  | —       | Lokales Modell (z.B. `llama3.1`)                  |
| `BUSINESS_MODE_LOCAL_URL`     | URL     | —       | OpenAI-kompatibler Endpoint (z.B. Ollama)         |

### MCP (Model Context Protocol)

| Variable             | Typ        | Beschreibung                             |
| -------------------- | ---------- | ---------------------------------------- |
| `MCP_ENABLED`        | Boolean    | Aktiviert MCP-Client-Support             |
| `MCP_SERVERS_CONFIG` | JSON Array | Fallback MCP-Server-Configs wenn DB leer |

### Google AI (Gemini)

| Variable                       | Typ    | Beschreibung                                                          |
| ------------------------------ | ------ | --------------------------------------------------------------------- |
| `GOOGLE_GENERATIVE_AI_API_KEY` | String | Gemini API Key (aktiviert Bildgenerierung, TTS, YouTube-Analyse, Deep Research) |

### YouTube

| Variable          | Typ    | Beschreibung                             |
| ----------------- | ------ | ---------------------------------------- |
| `YOUTUBE_API_KEY` | String | YouTube Data API v3 Key (youtube_search) |

### Deep Research

| Variable                 | Typ     | Default | Beschreibung                           |
| ------------------------ | ------- | ------- | -------------------------------------- |
| `DEEP_RESEARCH_ENABLED`  | Boolean | —       | Explizites Opt-in (Feature ist teuer)  |
| `DEEP_RESEARCH_CREDITS`  | Integer | `400`   | Flat-Rate Credits pro Recherche        |

### Stitch Design

| Variable        | Typ    | Beschreibung                              |
| --------------- | ------ | ----------------------------------------- |
| `STITCH_API_KEY` | String | Google Stitch API Key (UI-Design-Generierung) |

### Admin

| Variable          | Typ            | Beschreibung                                              |
| ----------------- | -------------- | --------------------------------------------------------- |
| `ADMIN_EMAILS`    | Kommasepariert | Email-Adressen mit Admin-Zugang (case-insensitive)        |
| `SUPERADMIN_EMAIL` | String        | Super-Admin mit User-Management-Berechtigung              |

### Google Search

| Variable                 | Typ     | Default | Beschreibung                              |
| ------------------------ | ------- | ------- | ----------------------------------------- |
| `GOOGLE_SEARCH_ENABLED`  | Boolean | —       | Explizites Opt-in (Doppel-Gate mit Gemini Key) |
| `GOOGLE_SEARCH_CREDITS`  | Integer | `1`     | Flat-Rate Credits pro Google Search       |

### User Skills

| Variable                          | Typ     | Default | Beschreibung                               |
| --------------------------------- | ------- | ------- | ------------------------------------------ |
| `NEXT_PUBLIC_USER_SKILLS_ENABLED` | Boolean | `false` | Erlaubt Nutzern eigene Skills zu erstellen |

### Projekt-Dokumente (Limits)

| Variable                     | Typ     | Default  | Beschreibung                               |
| ---------------------------- | ------- | -------- | ------------------------------------------ |
| `PROJECT_DOCS_MAX_COUNT`     | Integer | `10`     | Max Dokumente pro Projekt                  |
| `PROJECT_DOCS_TOKEN_BUDGET`  | Integer | `8000`   | Max Tokens fuer Dokument-Kontext im Prompt |
| `PROJECT_DOCS_MAX_FILE_SIZE` | Integer | `512000` | Max Dateigroesse pro Dokument (Bytes)      |

---

## 3. Config-Dateien (`src/config/`)

| Datei              | Steuert                                                                              | Konfigurierbar ueber             |
| ------------------ | ------------------------------------------------------------------------------------ | -------------------------------- |
| `features.ts`      | Feature-Flag-Registry (19 Flags)                                                     | ENV                              |
| `ai.ts`            | Default-Modell, Temperature (0.7), Projekt-Dokument-Limits                           | ENV                              |
| `brand.ts`         | 5 Brands mit Name, Domain, Beschreibung                                              | `NEXT_PUBLIC_BRAND` ENV          |
| `models.ts`        | Model-Registry mit Preisen, Regionen, Capabilities                                   | DB → ENV → Hardcoded Fallback    |
| `chat.ts`          | Upload-Limits (5 Files, 4MB, MIME-Types), Max-Tokens (16384)                         | Hardcoded                        |
| `prompts/`         | System-Prompt-Aufbau (7 Layer), Default-Persona, Artifact-Regeln, Tool-Instruktionen | Hardcoded + DB (Experts, Skills) |
| `credits.ts`       | Credit-Skala, Tool-Flatrates, Display-Schwellenwerte                                 | ENV                              |
| `memory.ts`        | Mem0-Client, Search-Limit, Min-Messages                                              | ENV                              |
| `mcp.ts`           | MCP-Server-Registry mit 60s Cache                                                    | DB → ENV → leer                  |
| `business-mode.ts` | PII-Config, Privacy-Routing, EU/Lokal-Modelle                                        | ENV                              |
| `wrapup.ts`        | 3 Session-Wrapup-Templates (Zusammenfassung, Action Items, PRD)                      | Hardcoded                        |

---

## 4. Multi-Instanz-Setup

### Brands

Die App unterstuetzt 5 Brands ueber `NEXT_PUBLIC_BRAND`:

| Brand       | Domain         | Zielgruppe      | Beschreibung                              |
| ----------- | -------------- | --------------- | ----------------------------------------- |
| `lernen`    | lernen.diy     | Practitioner    | Praxisorientierte KI-Lernmodule (Default) |
| `unlearn`   | unlearn.how    | C-Level, HR     | KI-Beratung und Workshops                 |
| `loschke`   | loschke.ai     | Follower, Peers | AI Transformation Insights                |
| `prototype` | localhost      | Entwicklung     | Prototyp-Anwendung                        |
| `aok`       | aok.lernen.diy | AOK-Mitarbeiter | Client-spezifische Instanz                |

### Was macht eine Instanz einzigartig?

| Aspekt                | Steuerung                                   | Scope                                       |
| --------------------- | ------------------------------------------- | ------------------------------------------- |
| **Brand/Name/Domain** | `NEXT_PUBLIC_BRAND` ENV                     | Build-Zeit                                  |
| **Auth-System**       | Eigene Logto-App pro Instanz (`LOGTO_*`)    | Runtime                                     |
| **Datenbank**         | Eigene Neon-DB pro Instanz (`DATABASE_URL`) | Runtime                                     |
| **Admin-Zugang**      | `ADMIN_EMAILS` pro Instanz                  | Runtime                                     |
| **Feature-Set**       | Feature-Flags per `.env`                    | Build-Zeit (NEXT_PUBLIC) / Runtime (Server) |
| **Model-Auswahl**     | DB-Seed oder `MODELS_CONFIG` ENV            | Runtime                                     |
| **Experts/Skills**    | DB-Seed oder Admin-Import                   | Runtime                                     |
| **MCP-Server**        | DB oder `MCP_SERVERS_CONFIG` ENV            | Runtime                                     |
| **Speicher**          | Eigener R2-Bucket pro Instanz               | Runtime                                     |

### Deployment-Muster

```
Codebase (ein Repository)
    │
    ├── Vercel Projekt A (lernen.diy)
    │   ├── .env: BRAND=lernen, Credits ON, Memory ON, Storage ON
    │   ├── DB: Neon DB A
    │   └── Auth: Logto App A
    │
    ├── Vercel Projekt B (aok.lernen.diy)
    │   ├── .env: BRAND=aok, Credits OFF, Memory OFF, BusinessMode ON
    │   ├── DB: Neon DB B
    │   └── Auth: Logto App B
    │
    └── Vercel Projekt C (unlearn.how)
        ├── .env: BRAND=unlearn, Credits ON, Memory ON, MCP ON
        ├── DB: Neon DB C
        └── Auth: Logto App C
```

---

## 5. Gating-Verhalten

### API-Ebene

Deaktivierte Features geben `404` zurueck:

| Feature       | API-Route              | Deaktiviert-Verhalten           |
| ------------- | ---------------------- | ------------------------------- |
| Chat          | `/api/chat`            | 404: "Chat ist deaktiviert"     |
| Credits       | `/api/credits`         | 404: "Credits sind deaktiviert" |
| Storage       | `/api/upload`          | 404: "Storage is disabled"      |
| Web           | `/api/web/*`           | 404 pro Route                   |
| Business Mode | `/api/business-mode/*` | 404: "Not found"                |

### Tool-Ebene (Chat)

Tools werden in `build-tools.ts` nur registriert wenn das Feature aktiv ist:

| Tool                                                                                                | Bedingung                                                   |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `web_search`, `web_fetch`                                                                           | `features.search.enabled`                                   |
| `save_memory`, `recall_memory`                                                                      | `features.memory.enabled` UND `user.memoryEnabled`          |
| `generate_image`                                                                                    | `features.imageGeneration.enabled` UND kein Privacy-Routing |
| `youtube_search`                                                                                    | `features.youtube.enabled`                                  |
| `youtube_analyze`                                                                                   | `features.imageGeneration.enabled` (Gemini Multimodal)      |
| `text_to_speech`                                                                                    | `features.tts.enabled`                                      |
| `extract_branding`                                                                                  | `features.branding.enabled`                                 |
| `generate_design`                                                                                   | `features.stitch.enabled`                                   |
| `deep_research`                                                                                     | `features.deepResearch.enabled` UND kein Privacy-Routing    |
| `google_search`                                                                                     | `features.googleSearch.enabled` UND kein Privacy-Routing    |
| `code_execution`                                                                                    | Anthropic-Modell UND `features.anthropicSkills.enabled`     |
| `load_skill_resource`                                                                               | Skills mit Resources vorhanden                              |
| MCP-Tools (`server__tool`)                                                                          | `features.mcp.enabled` UND Server erreichbar                |
| `create_artifact`, `create_quiz`, `create_review`, `content_alternatives`, `ask_user`, `load_skill` | Immer verfuegbar                                            |

### UI-Ebene

| Feature       | Deaktiviert-Verhalten                                              |
| ------------- | ------------------------------------------------------------------ |
| Dark Mode     | Theme-Provider wrapped nicht, Toggle unsichtbar                    |
| Credits       | Credit-Indicator im Header ausgeblendet                            |
| Business Mode | PII-Dialog und Privacy-Badges nicht gerendert                      |
| Admin         | Admin-Link im User-Menu ausgeblendet, `/admin/*` redirected zu `/` |
| Storage       | File-Upload-Button funktional (data-URLs statt R2)                 |

### Graceful Degradation

| Feature         | Fallback wenn deaktiviert                             |
| --------------- | ----------------------------------------------------- |
| Storage (R2)    | Dateien als data-URLs in DB statt R2-Upload           |
| Bildgenerierung | Bilder als base64-data-URL statt R2-Upload            |
| Memory          | Kein Memory-Kontext im Prompt, Tools nicht verfuegbar |
| Web-Tools       | Tools nicht im Chat verfuegbar, keine Websuche        |
| MCP             | Keine externen Tools, Chat funktioniert normal        |

---

## 6. Admin-Faehigkeiten

### Zugang

- Gesteuert ueber `ADMIN_EMAILS` (kommasepariert, case-insensitive)
- Doppelter Schutz: Layout-Redirect + `requireAdmin()` API-Guard
- Admin-Link im User-Dropdown-Menu

### Was Admins per UI steuern koennen

| Bereich        | UI-Route                       | Faehigkeiten                                                            |
| -------------- | ------------------------------ | ----------------------------------------------------------------------- |
| **Skills**     | `/admin/skills`                | Erstellen, Bearbeiten (SKILL.md), Import, Aktiv-Toggle, Loeschen        |
| **Experts**    | `/admin/experts`               | Erstellen, Bearbeiten (JSON), Import, Loeschen. Inkl. globale Experts   |
| **Models**     | `/admin/models`                | Erstellen, Bearbeiten (JSON/CodeMirror), Import, Aktiv-Toggle, Loeschen |
| **MCP-Server** | `/admin/mcp-servers`           | Erstellen, Bearbeiten, Import, Health-Check, Aktiv-Toggle, Loeschen     |
| **Credits**    | `/api/admin/credits` (nur API) | User-Balances einsehen, Credits vergeben                                |
| **Export**     | `/api/admin/export/*`          | Bulk-Export aller Entitaeten als JSON/SKILL.md                          |

### DB-gesteuerte Toggles

| Entitaet       | Toggle                               | Auswirkung                                             |
| -------------- | ------------------------------------ | ------------------------------------------------------ |
| **Skills**     | `isActive` (Boolean)                 | Inaktive Skills nicht in Discovery, nicht ladbar       |
| **Models**     | `isActive` (Boolean)                 | Inaktive Models nicht in Model-Picker, nicht waehlbar  |
| **Experts**    | `isPublic` (Boolean)                 | Nicht-oeffentliche Experts nur fuer Ersteller sichtbar |
| **MCP-Server** | `isActive` (Boolean) + `envVar` Gate | Server muss aktiv UND ENV-Variable gesetzt sein        |

---

## 7. Credit-System

### Formel

```
credits = max(1, ceil(
  (inputTokens × inputPrice
   + outputTokens × outputPrice
   + reasoningTokens × outputPrice
   - cachedInputTokens × inputPrice × 0.9)
  ÷ 1.000.000 × CREDITS_PER_DOLLAR
))
```

### Konfigurierbare Parameter

| Parameter             | ENV                        | Default  | Beschreibung                  |
| --------------------- | -------------------------- | -------- | ----------------------------- |
| Credits pro Dollar    | `CREDITS_PER_DOLLAR`       | `100`    | 1 Credit = 1 Cent             |
| Input-Preis Fallback  | `FALLBACK_INPUT_PRICE`     | `1.0` $/1M | Wenn Model keinen Preis hat |
| Output-Preis Fallback | `FALLBACK_OUTPUT_PRICE`    | `5.0` $/1M | Wenn Model keinen Preis hat |

### Flat-Rate Tool-Kosten

| Tool                | ENV                          | Default | Beschreibung              |
| ------------------- | ---------------------------- | ------- | ------------------------- |
| Bildgenerierung     | `IMAGE_GENERATION_CREDITS`   | `8`     | Pro Bild (8 Cent)         |
| Deep Research       | `DEEP_RESEARCH_CREDITS`      | `400`   | Pro Recherche (4,00 EUR)  |
| Stitch Design       | `STITCH_GENERATION_CREDITS`  | `5`     | Pro Design (5 Cent)       |
| YouTube Suche       | `YOUTUBE_SEARCH_CREDITS`     | `1`     | Pro Suche (1 Cent)        |
| YouTube Analyse     | `YOUTUBE_ANALYZE_CREDITS`    | `5`     | Pro Analyse (5 Cent)      |
| TTS                 | `TTS_CREDITS`                | `3`     | Pro Sprachausgabe (3 Cent)|
| Branding            | `BRANDING_CREDITS`           | `1`     | Pro Extraktion (1 Cent)   |
| Google Search       | `GOOGLE_SEARCH_CREDITS`      | `1`     | Pro Suche (1 Cent)        |

### Regeln

- **Minimum:** 1 Credit pro Request (nie kostenlos)
- **Cache-Rabatt:** Cached Input-Tokens bekommen 90% Rabatt
- **Zero Balance:** Soft Block (402 bei Balance <= 0, laufende Requests duerfen ins Negative)
- **Nicht bepreist:** Title Generation, Mem0, Firecrawl, MCP (in Marge einkalkuliert)
- **Model-Preise:** Pro Model in DB (`inputPrice.per1m`, `outputPrice.per1m`)
- **Balance-Farben:** Gruen >100 Credits (>1€), Gelb >20 Credits (>0,20€), Rot <=20

### Deduktion

Credits werden NACH dem Chat abgezogen (in `persist.ts`):

1. Usage-Logging (Token-Zaehlung)
2. Credit-Berechnung (Formel)
3. Atomare DB-Transaktion (Balance-Update + Audit-Log)
4. Pre-flight Check: 402 bei Balance <= 0 VOR Chat-Start

---

## 8. Rate-Limiting

In-Memory Token-Bucket pro User-ID (`src/lib/rate-limit.ts`):

| Preset   | Max Requests | Fenster | Verwendung                                                        |
| -------- | ------------ | ------- | ----------------------------------------------------------------- |
| `chat`   | 20/min       | 60s     | `/api/chat`                                                       |
| `api`    | 60/min       | 60s     | `/api/chats`, `/api/models`, `/api/experts`, `/api/credits`, etc. |
| `web`    | 30/min       | 60s     | `/api/web/*`                                                      |
| `upload` | 10/min       | 60s     | `/api/upload` (POST)                                              |

Limitation: In-Memory, wird bei Serverless-Instanz-Neustart zurueckgesetzt. Fuer Produktion mit mehreren Usern: Upstash Redis empfohlen.

---

## 9. Tier-Baukasten fuer Monetarisierung

### Feature-Matrix nach moeglichen Tiers

Basierend auf den vorhandenen Feature-Flags lassen sich verschiedene Tier-Kombinationen konfigurieren. Jeder Tier ist eine `.env`-Konfiguration:

| Feature                         | Free           | Pro               | Enterprise             |
| ------------------------------- | -------------- | ----------------- | ---------------------- |
| **Chat (Kern)**                 | Ja             | Ja                | Ja                     |
| **Experts (7 Default)**         | Ja             | Ja                | Ja                     |
| **Skills/Quicktasks**           | Ja             | Ja                | Ja                     |
| **Dark Mode**                   | Ja             | Ja                | Ja                     |
| **Mermaid-Diagramme**           | Ja             | Ja                | Ja                     |
| **Session Wrapup (3 Formate)**  | Ja             | Ja                | Ja                     |
| **Projekte**                    | —              | Ja                | Ja                     |
| **Custom Instructions**         | —              | Ja                | Ja                     |
| **Web-Suche (Chat-Tools)**      | —              | Ja                | Ja                     |
| **File-Upload (R2)**            | —              | Ja                | Ja                     |
| **Bildgenerierung (Gemini)**    | —              | Ja                | Ja                     |
| **Memory (Mem0)**               | —              | —                 | Ja                     |
| **Google Search (Grounding)**   | —              | Ja                | Ja                     |
| **User-eigene Skills/Experts**  | —              | Ja                | Ja                     |
| **Collaboration (Sharing)**     | —              | Ja                | Ja                     |
| **MCP (externe Tools)**         | —              | —                 | Ja                     |
| **Business Mode (PII/Privacy)** | —              | —                 | Ja                     |
| **Admin-UI**                    | —              | —                 | Ja                     |
| **Credit-System**               | Ja (mit Limit) | Ja (mehr Credits) | Ja (unbegrenzt/custom) |

### ENV-Beispiel: Free Tier

```bash
NEXT_PUBLIC_BRAND=lernen
NEXT_PUBLIC_CREDITS_ENABLED=true
CREDITS_PER_DOLLAR=100
# Keine weiteren Feature-Keys → alles opt-in bleibt aus
```

### ENV-Beispiel: Pro Tier

```bash
NEXT_PUBLIC_BRAND=lernen
NEXT_PUBLIC_CREDITS_ENABLED=true
CREDITS_PER_DOLLAR=100
FIRECRAWL_API_KEY=fc-xxx          # Web-Suche
R2_ACCESS_KEY_ID=xxx              # File-Upload
GOOGLE_GENERATIVE_AI_API_KEY=xxx  # Bildgenerierung
```

### ENV-Beispiel: Enterprise Tier

```bash
NEXT_PUBLIC_BRAND=aok
NEXT_PUBLIC_CREDITS_ENABLED=false           # Kein Credit-Limit
NEXT_PUBLIC_BUSINESS_MODE=true              # PII-Schutz
BUSINESS_MODE_EU_MODEL=mistral-large-latest # EU-Routing
MISTRAL_API_KEY=xxx
FIRECRAWL_API_KEY=fc-xxx
R2_ACCESS_KEY_ID=xxx
GOOGLE_GENERATIVE_AI_API_KEY=xxx
MEM0_API_KEY=xxx                            # Memory
MCP_ENABLED=true                            # Externe Tools
ADMIN_EMAILS=admin@kunde.de                 # Eigene Admins
```

### Aktuell NICHT per Feature-Flag steuerbar (Luecken)

Folgende Aspekte sind derzeit **nicht** ueber Feature-Flags oder ENV konfigurierbar und muessten fuer ein Tier-System ergaenzt werden:

| Aspekt                    | Aktueller Stand                   | Fuer Tiers noetig                                   |
| ------------------------- | --------------------------------- | --------------------------------------------------- |
| **Custom Instructions**   | Immer verfuegbar                  | Toggle pro Tier                                     |
| **Projekte**              | Immer verfuegbar (wenn M6 fertig) | Toggle oder Limit pro Tier                          |
| **Max Experts**           | Unbegrenzt                        | Limit pro Tier (z.B. Free: nur Default-Experts)     |
| **Max Skills**            | Unbegrenzt                        | Limit pro Tier                                      |
| **Max Chats**             | Unbegrenzt                        | Limit pro Tier                                      |
| **Max Messages pro Chat** | 50 pro Request (Validierung)      | Taeglich/monatliches Limit                          |
| **Model-Zugang**          | Alle aktiven Models               | Whitelist pro Tier (z.B. Free: nur schnelle Models) |
| **Upload-Groesse**        | 4MB fest                          | Konfigurierbar pro Tier                             |
| **Rate-Limits**           | Fest (20 chat/min)                | Konfigurierbar pro Tier                             |
| **Wrapup-Types**          | Alle 3 verfuegbar                 | Subset pro Tier                                     |
| **Credit-Startguthaben**  | Nur Admin-Grant                   | Automatisch bei Registrierung                       |
| **Stripe/Billing**        | Nicht implementiert               | Payment + Auto-Topup                                |

### Empfohlene naechste Schritte

1. **User-Tier-Feld:** `users.tier` Spalte (`free` | `pro` | `enterprise`) mit DB-Migration
2. **Tier-Config:** Neue Config-Datei `src/config/tiers.ts` mit Feature-Matrix pro Tier
3. **Tier-Guard:** Middleware/Helper `requireTier(minTier)` analog zu `requireAdmin()`
4. **Model-Whitelist:** `models.tier` oder `models.minTier` Feld fuer Model-Zugangssteuerung
5. **Credit-Grants:** Automatisches Startguthaben bei Registrierung (Tier-abhaengig)
6. **Stripe Integration:** Checkout, Webhook, Billing Portal (M10 Erweiterung)

---

## 10. Kern-Dateien

| Datei                         | Beschreibung                                                     |
| ----------------------------- | ---------------------------------------------------------------- |
| `src/config/features.ts`      | Feature-Flag-Registry (21 Flags, 3 Patterns)                     |
| `src/config/brand.ts`         | 5 Brands mit Domain-Konfiguration                                |
| `src/config/ai.ts`            | AI-Defaults (Model, Temperature, Dokument-Limits)                |
| `src/config/models.ts`        | Model-Registry mit Preisen und Cache                             |
| `src/config/chat.ts`          | Upload-Limits und Max-Tokens                                     |
| `src/config/prompts/`         | System-Prompt-Aufbau (siehe `docs/system/system-prompt-architektur.md`) |
| `src/config/credits.ts`       | Credit-Skala, Tool-Flatrates, Display-Schwellenwerte             |
| `src/config/memory.ts`        | Mem0 Client und Limits                                           |
| `src/config/mcp.ts`           | MCP-Server-Registry                                              |
| `src/config/business-mode.ts` | Privacy/PII-Konfiguration                                        |
| `src/config/wrapup.ts`        | 3 Session-Wrapup-Templates                                       |
| `src/lib/credits.ts`          | Credit-Berechnungsformel                                         |
| `src/lib/rate-limit.ts`       | Rate-Limiting (Token Bucket)                                     |
| `src/lib/admin-guard.ts`      | Admin-Email-Pruefung                                             |
| `src/lib/api-guards.ts`       | Auth-Guard (`requireAuth()`)                                     |
| `.env.example`                | Vollstaendige ENV-Referenz                                       |
