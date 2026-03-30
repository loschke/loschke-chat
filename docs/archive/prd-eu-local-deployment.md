# PRD: EU/Local-Deployment-Profil

> Status: Entwurf — interne Abstimmung ausstehend
> Erstellt: 2026-03-29
> Autor: Rico Loschke + Claude Code Analyse

---

## Problemstellung

Bei Kundenpräsentationen ist die häufigste Frage: "Geht das DSGVO-konform? EU-Provider? Lokal?" Aktuell fehlt eine deploybare Antwort — die Plattform läuft nur als SaaS auf Vercel mit US-Cloud-Providern.

## Ziel

Eine deploybare EU/Local-Version der Plattform als "Option aus der Schublade". Bombenfeste Auskunft bei Compliance-Fragen. Keine separate Codebasis.

## Zielgruppen

- **Kunden-Deployments**: On-premise oder in Kunden-Cloud (DE/EU)
- **Eigene EU-Instanz**: Für Rico und Familie
- **Perspektivisch**: Self-Hosted-Angebot für Dritte

---

## Strategie: Single Codebase + Deployment Profiles

**Entscheidung**: Weder Fork noch separater Branch. Eine Codebasis, unterschiedliche ENV-Konfiguration.

**Begründung**:

- Fork/Branch = doppelte Pflege, Merge-Konflikte, Drift
- Die Architektur ist bereits ~70% EU/Local-ready durch Feature Flags
- Alle Gemini-Features (Bild, Audio, Research, Search, YouTube, Stitch) sind opt-in
- R2 nutzt S3-kompatible API (MinIO-tauglich)
- Logto und Postgres sind self-hostable

```
┌─────────────────────────────────────┐
│          loschke-chat (main)         │
│                                      │
│  ┌──────────┐     ┌──────────────┐  │
│  │ SaaS     │     │ EU/Local     │  │
│  │ Profile  │     │ Profile      │  │
│  │          │     │              │  │
│  │ Vercel   │     │ Docker       │  │
│  │ Gateway  │     │ LiteLLM      │  │
│  │ R2       │     │ MinIO        │  │
│  │ Neon     │     │ Local PG     │  │
│  │ Gemini   │     │ (optional)   │  │
│  │ Mem0     │     │ Mem0 local   │  │
│  └──────────┘     └──────────────┘  │
└─────────────────────────────────────┘
```

---

## Ist-Analyse: Blocker und Ready-Status

### Bereits EU/Local-ready (kein Code nötig)

| Komponente                | Status               | Bei EU/Local                             |
| ------------------------- | -------------------- | ---------------------------------------- |
| Image Generation (Gemini) | Opt-in Flag          | Nicht aktivieren oder bewusst zuschalten |
| TTS (Gemini)              | Opt-in Flag          | Nicht aktivieren oder bewusst zuschalten |
| Deep Research (Gemini)    | Opt-in Flag          | Nicht aktivieren oder bewusst zuschalten |
| Google Search Grounding   | Opt-in Flag          | Nicht aktivieren                         |
| YouTube Search/Analyze    | Opt-in Flag          | Nicht aktivieren                         |
| Stitch Design Gen         | Opt-in Flag          | Nicht aktivieren                         |
| Anthropic Agent Skills    | Opt-in Flag          | Nicht aktivieren                         |
| Logto Auth                | OIDC Standard        | Logto ist self-hostable                  |
| Neon Postgres             | Standard PG          | Jede Postgres-Instanz funktioniert       |
| Web Search                | Provider-Architektur | Jina als EU-Alternative verfügbar        |

### Echte Blocker (Code-Änderungen nötig)

| Blocker               | Problem                                    | Lösung                                    |
| --------------------- | ------------------------------------------ | ----------------------------------------- |
| **Vercel AI Gateway** | Zentraler Chat-Router, nicht self-hostbar  | Model Resolver mit direct/litellm Routing |
| **R2 Endpoint**       | ENV-Naming auf Cloudflare zugeschnitten    | Generische S3-ENVs als Aliase             |
| **Mem0 Host**         | Self-Hosting-Parameter nicht durchgereicht | 2-3 Zeilen Code für `host` ENV            |
| **Kein SearXNG**      | Kein self-hostbarer Search Provider        | Neuer Provider (~100 Zeilen)              |
| **Kein Dockerfile**   | Nur Vercel-Deployment                      | Multi-stage Dockerfile + Compose          |
| **Vercel Cron**       | Chat-Retention Cron an Vercel gebunden     | Systemd-Timer oder node-cron              |

---

## Umsetzungsplan (7 Schritte)

### Schritt 1: Gateway-Abstraktion — Model Resolver

**Aufwand**: ~2-3h

Neues Modul `src/lib/ai/model-resolver.ts` mit `resolveModel()`:

- Neue ENV: `LLM_ROUTING` = `"gateway"` | `"direct"` | `"litellm"`
- `"gateway"` (Default) — Vercel AI Gateway wie bisher, kein Breaking Change
- `"direct"` — Provider-SDK direkt aus modelId-Prefix (mistral/..., ollama/..., ionos/...)
- `"litellm"` — OpenAI-kompatible URL (LiteLLM als self-hosted Gateway)

Bestehende Infrastruktur nutzen:

- `custom-providers.ts` (Ionos-Pattern für Ollama)
- `privacy-provider.ts` (Mistral + Local-Route existieren)

### Schritt 2: Ollama als Provider

**Aufwand**: ~30min

Nach Ionos-Pattern in `custom-providers.ts`:

- ENV: `OLLAMA_BASE_URL` (Default: `http://localhost:11434/v1`)
- Model-Format: `ollama/llama3.1`, `ollama/mistral`
- DB-Seed mit gängigen Ollama-Modellen

### Schritt 3: Storage-ENVs generalisieren

**Aufwand**: ~30min

- Generische S3-ENVs als Aliase: `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, etc.
- Fallback-Chain: S3_* → R2_*
- MinIO-Kompatibilität validieren

### Schritt 4: Mem0 Self-Hosting

**Aufwand**: ~15min

Mem0 ist Open Source (Apache-2.0). `mem0ai` Package hat `host` Parameter:

```typescript
new MemoryClient({ apiKey, host: process.env.MEM0_BASE_URL })
```

Mem0 Docker: `mem0ai/mem0:latest` mit Postgres-Backend.

### Schritt 5: SearXNG Search Provider

**Aufwand**: ~1h

Neuer Provider nach Plugin-Pattern:

- `src/lib/search/providers/searxng.ts` (~100-150 Zeilen)
- `SEARCH_PROVIDER=searxng` + `SEARXNG_URL`
- Komplett self-hostbar, kein API-Key

### Schritt 6: Dockerfile + Docker Compose

**Aufwand**: ~2h

```yaml
services:
  app:        # Next.js (standalone)
  postgres:   # PostgreSQL 17
  minio:      # S3-kompatibler Storage
  searxng:    # Self-hosted Websuche
  mem0:       # Memory (optional)
  logto:      # OIDC Auth (optional)
```

Plus `.env.eu.example` mit vollständigem EU/Local-Profil.

### Schritt 7: Datenfluss-Transparenz + Admin-UI

**Aufwand**: ~1.5h

Dokumentation und UI-Hinweise die pro Feature zeigen wohin Daten fließen:

| Feature          | Daten            | Ziel                      | Sensitivität               |
| ---------------- | ---------------- | ------------------------- | -------------------------- |
| Chat (EU/Local)  | Prompt + Kontext | Mistral EU / Ollama lokal | Keine ext. Übertragung     |
| Chat (Gateway)   | Prompt + Kontext | Vercel → Provider         | Mittel                     |
| Deep Research    | Suchquery        | Google Gemini (US)        | Gering (öffentliche Suche) |
| Image Generation | Text-Prompt      | Google Gemini (US)        | Gering (Beschreibung)      |
| TTS              | Sprechtext       | Google Gemini (US)        | Mittel                     |
| Web Search       | Suchquery        | SearXNG lokal / Provider  | Je nach Setup              |
| Memory           | Chat-Extrakte    | Mem0 lokal / Cloud        | Je nach Setup              |
| File Upload      | Dateien          | MinIO lokal / R2          | Je nach Setup              |

Admin-UI: Farbcodierte Info-Badges (Grün=lokal, Gelb=EU, Rot=US) bei Feature-Toggles.

---

## Feature-Matrix: SaaS vs EU/Local

| Feature                 | SaaS (Vercel) | EU/Local | Anmerkung                          |
| ----------------------- |:-------------:|:--------:| ---------------------------------- |
| Chat (Multi-Model)      | ✅             | ✅        | Mistral/Ionos/Ollama statt Gateway |
| Artifacts               | ✅             | ✅        | Komplett lokal                     |
| Skills/Experts          | ✅             | ✅        | DB-basiert                         |
| Web Search              | ✅             | ✅        | SearXNG (self-hosted)              |
| File Upload             | ✅             | ✅        | MinIO statt R2                     |
| Memory                  | ✅             | ✅        | Mem0 self-hosted (Docker)          |
| Credits System          | ✅             | ✅        | Komplett lokal                     |
| Admin UI                | ✅             | ✅        | Komplett lokal                     |
| MCP Server              | ✅             | ✅        | Self-hosted MCP möglich            |
| Quiz/Review             | ✅             | ✅        | Komplett lokal                     |
| Image Generation        | ✅             | ❌*       | *Optional zuschaltbar (Gemini Key) |
| TTS                     | ✅             | ❌*       | *Optional zuschaltbar (Gemini Key) |
| Deep Research           | ✅             | ❌*       | *Optional zuschaltbar (Gemini Key) |
| Google Search Grounding | ✅             | ❌        | Gemini-locked                      |
| YouTube Analyze         | ✅             | ❌        | Gemini-locked                      |
| Stitch Design Gen       | ✅             | ❌        | Google-locked                      |
| Anthropic Agent Skills  | ✅             | ❌        | Anthropic-locked                   |

**12 von 17 Features funktionieren EU/lokal.** Die fehlenden 5 sind Premium-Features.

### Hybrid-Modell

Kunden können den EU/Local-Kern betreiben UND bewusst einzelne Premium-Features aktivieren (z.B. Deep Research sendet nur Suchqueries an Google, keine internen Dokumente). Transparente Datenfluss-Dokumentation ermöglicht informierte Entscheidung.

---

## Perspektivisch (nicht in Scope)

| Feature          | Lokale Alternative         | Aufwand |
| ---------------- | -------------------------- | ------- |
| Image Generation | Flux/SDXL via ComfyUI API  | Mittel  |
| TTS              | Piper TTS / Coqui          | Mittel  |
| Deep Research    | Agent-Loop mit lokalem LLM | Hoch    |
| YouTube Search   | Invidious API              | Gering  |

---

## LLM-Provider für EU/Local

| Provider    | Hosting        | Modelle                      | Besonderheit                  |
| ----------- | -------------- | ---------------------------- | ----------------------------- |
| **Mistral** | EU (Paris)     | Mistral Large, Medium, Small | DSGVO-konform, API            |
| **Ionos**   | DE (Frankfurt) | Llama 3.3, Mistral, GPT-OSS  | Bereits integriert            |
| **Ollama**  | Self-hosted    | Llama, Mistral, Phi, Gemma   | Komplett lokal, kein Internet |

Alle drei als wählbare Optionen. Default je nach Deployment-Szenario konfigurierbar.

---

## Geschätzter Gesamtaufwand

~7-8 Stunden Entwicklung. Kein Breaking Change für bestehende SaaS-Instanz.

---

## Offene Punkte für interne Abstimmung

1. **Pricing**: Wird EU/Local als separates Produkt/Tier angeboten oder als Deployment-Option?
2. **Support**: Wer hilft Kunden beim Self-Hosting? Managed Service vs. Anleitung?
3. **Updates**: Wie bekommen EU/Local-Instanzen Updates? Docker-Image-Releases?
4. **Premium-Features**: Separates Pricing für Gemini-Zuschaltung im EU/Local-Profil?
5. **Compliance-Zertifizierung**: Reicht die Datenfluss-Doku oder braucht es formale Audits?

---

## Verifikation (nach Umsetzung)

1. `docker-compose up` startet App + Postgres + MinIO + SearXNG
2. Chat funktioniert mit Ollama-Modell (ohne Internet)
3. Web Search funktioniert über SearXNG
4. File Upload speichert in MinIO
5. Memory funktioniert mit self-hosted Mem0
6. Gemini-Features deaktiviert: keine Fehler, keine leeren UI-Elemente
7. Admin UI zeigt nur verfügbare Features
8. Credits-Berechnung funktioniert mit lokalen Model-Preisen
