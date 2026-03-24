# Deployment Guide

Anleitung zum Aufsetzen einer neuen Instanz der KI-Chat-Plattform. Beschreibt sowohl das Cloud-Setup (Vercel + Managed Services) als auch die Self-Hosted-Alternative mit Open-Source-Komponenten.

---

## Architektur-Ueberblick

Die App besteht aus einer Next.js-Anwendung und mehreren externen Services:

```
┌─────────────────────────────────────────────────┐
│  Next.js App (App Router, Node.js Runtime)      │
│  ├── Frontend (React, Tailwind, shadcn/ui)      │
│  ├── API Routes (/api/*)                        │
│  └── Proxy (Auth Guard, statt Middleware)        │
└──────────┬──────────┬──────────┬────────────────┘
           │          │          │
    ┌──────┴──┐  ┌────┴────┐  ┌─┴──────────┐
    │ Postgres │  │  Logto  │  │ AI Gateway │
    │   (DB)   │  │ (Auth)  │  │  (LLMs)    │
    └─────────┘  └─────────┘  └────────────┘
           │
    ┌──────┴──────────────────────────────┐
    │  Optionale Services                  │
    │  ├── Cloudflare R2 (Storage)         │
    │  ├── Mem0 Cloud (Memory)             │
    │  ├── Firecrawl (Web Search/Scrape)   │
    │  ├── Gemini (Bildgenerierung)        │
    │  ├── Mistral (EU Privacy-Routing)    │
    │  └── MCP Server (externe Tools)      │
    └──────────────────────────────────────┘
```

---

## Cloud-Setup (Vercel + Managed Services)

### Voraussetzungen

- Node.js 20+
- pnpm (Package Manager)
- Git Repository mit dem Quellcode
- Accounts bei: Vercel, Neon (Postgres), Logto Cloud

### Schritt 1: Repository klonen und Dependencies installieren

```bash
git clone <repository-url>
cd loschke-chat
pnpm install
```

### Schritt 2: Neon-Datenbank anlegen

1. Neon Dashboard oeffnen → neues Projekt erstellen
2. Connection String kopieren (Format: `postgresql://user:pass@host/db?sslmode=require`)
3. Notieren als `DATABASE_URL`

### Schritt 3: Logto-App konfigurieren

1. Logto Dashboard oeffnen → neue Application erstellen (Type: "Traditional Web")
2. Redirect URI setzen: `https://deine-domain.com/api/auth/callback`
3. Post Sign-Out URI setzen: `https://deine-domain.com`
4. Notieren: `LOGTO_APP_ID`, `LOGTO_APP_SECRET`, `LOGTO_ENDPOINT`
5. Sign-In Experience konfigurieren (Email OTP empfohlen)

### Schritt 4: Environment Variables setzen

Minimale `.env.local` fuer eine funktionierende Instanz:

```bash
# Brand
NEXT_PUBLIC_BRAND=lernen

# Auth (Pflicht)
LOGTO_APP_ID=deine-app-id
LOGTO_APP_SECRET=dein-app-secret
LOGTO_ENDPOINT=https://dein-logto.logto.app
LOGTO_BASE_URL=http://localhost:3000
LOGTO_COOKIE_SECRET=mindestens-32-zeichen-langer-geheimer-schluessel

# Datenbank (Pflicht)
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# AI Gateway (Pflicht fuer Chat)
AI_GATEWAY_API_KEY=dein-gateway-key

# Admin (empfohlen)
ADMIN_EMAILS=admin@example.com
```

### Schritt 5: Datenbank initialisieren

```bash
# Schema an DB pushen (fuer Erstaufbau / Entwicklung)
pnpm db:push

# Default-Daten seeden (Experts, Skills, Models)
pnpm db:seed
```

Fuer Produktion mit Migration-History:

```bash
# Migrations generieren (erstellt SQL-Dateien in drizzle/)
pnpm db:generate

# Migrations ausfuehren
pnpm db:migrate
```

### Schritt 6: Lokal testen

```bash
pnpm dev
# App laeuft auf http://localhost:3000
```

### Schritt 7: Vercel Deployment

1. Vercel Dashboard → neues Projekt aus Git-Repository
2. Environment Variables aus `.env.local` uebertragen
3. `LOGTO_BASE_URL` auf die Produktions-Domain aendern
4. Logto Redirect URI auf Produktions-Domain aktualisieren
5. Erster Build deployt automatisch
6. Nach dem Deployment: `pnpm db:seed` lokal ausfuehren (mit Produktions-`DATABASE_URL`)

### Schritt 8: Optionale Features aktivieren

Features werden durch Setzen der entsprechenden ENV-Variablen aktiviert:

| Feature         | Benoetigte ENV-Variablen                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------- |
| File-Upload     | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_DOMAIN`, `R2_S3_ENDPOINT` |
| Web-Suche       | `FIRECRAWL_API_KEY` (oder `JINA_API_KEY`, `TAVILY_API_KEY`, `PERPLEXITY_API_KEY`)                                   |
| Memory          | `MEM0_API_KEY`                                                                                                      |
| Bildgenerierung | `GOOGLE_GENERATIVE_AI_API_KEY`                                                                                      |
| Business Mode   | `NEXT_PUBLIC_BUSINESS_MODE=true` (+ optional: `MISTRAL_API_KEY`, `BUSINESS_MODE_EU_MODEL`)                          |
| Credits         | `NEXT_PUBLIC_CREDITS_ENABLED=true` (+ optional: `CREDITS_PER_DOLLAR`)                                               |
| MCP             | `MCP_ENABLED=true` (+ Server-spezifische ENV-Variablen)                                                             |

Vollstaendige ENV-Referenz: `docs/feature-flags-konfiguration.md`

---

## Self-Hosted / On-Premises

Alle externen Services der Plattform basieren auf Open-Source-Projekten und koennen selbst gehostet werden. Das erlaubt volle Datensouveraenitaet ohne Abhaengigkeit von Cloud-Anbietern.

### Komponenten-Alternativen

| Komponente          | Cloud-Service     | Self-Hosted Alternative                  | Lizenz              |
| ------------------- | ----------------- | ---------------------------------------- | ------------------- |
| **App-Hosting**     | Vercel            | Node.js Server, Docker, Coolify, Dokploy | —                   |
| **Datenbank**       | Neon              | PostgreSQL (Standard-Installation)       | PostgreSQL License  |
| **Auth**            | Logto Cloud       | Logto OSS (Docker)                       | MPL-2.0             |
| **Storage**         | Cloudflare R2     | MinIO (S3-kompatibel)                    | AGPL-3.0            |
| **Memory**          | Mem0 Cloud        | Mem0 OSS (Docker)                        | Apache-2.0          |
| **Web-Suche**       | Firecrawl Cloud   | Firecrawl OSS (Docker)                   | AGPL-3.0            |
| **LLM-Provider**    | Vercel AI Gateway | LiteLLM, OpenRouter, oder direkt         | MIT (LiteLLM)       |
| **Bildgenerierung** | Google Gemini     | Comfy UI, Stable Diffusion               | —                   |
| **EU-Modell**       | Mistral API       | vLLM, Ollama mit Mistral-Gewichten       | Apache-2.0 (Ollama) |

### Next.js ohne Vercel

Die App laeuft als Standard-Node.js-Server:

```bash
# Build
pnpm build

# Start (Port 3000)
pnpm start

# Oder mit Custom Port
PORT=8080 pnpm start
```

Kein `vercel.json` oder Vercel-spezifische Features noetig. Die App nutzt keine Edge Functions oder Vercel-exklusive APIs.

### Docker (Beispiel)

Kein Dockerfile im Repository enthalten. Ein minimales Setup:

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

Hinweis: `output: "standalone"` muss in `next.config.ts` aktiviert werden fuer Docker-Deployments.

### PostgreSQL statt Neon

Die App nutzt den Standard-PostgreSQL-Treiber (`@neondatabase/serverless`). Fuer Self-Hosted PostgreSQL:

1. PostgreSQL 15+ installieren
2. Datenbank und User anlegen
3. `DATABASE_URL` auf lokale Instanz setzen: `postgresql://user:pass@localhost:5432/chatdb`
4. `?sslmode=require` entfernen wenn kein SSL konfiguriert

Der Neon-Treiber ist mit Standard-PostgreSQL kompatibel. Bei Performance-Problemen kann auf `postgres` (node-postgres) gewechselt werden — erfordert Anpassung in `src/lib/db/index.ts`.

### Logto Self-Hosted

Logto bietet ein offizielles Docker-Image:

```bash
docker run -d \
  --name logto \
  -p 3001:3001 \
  -p 3002:3002 \
  -e DB_URL=postgresql://user:pass@host/logto \
  ghcr.io/logto-io/logto:latest
```

- Port 3001: Admin Console
- Port 3002: Auth Endpoint (fuer `LOGTO_ENDPOINT`)
- Benoetigt eigene PostgreSQL-Datenbank

Dann in der App:

```bash
LOGTO_ENDPOINT=http://localhost:3002  # oder interne Docker-Netzwerk-URL
```

### MinIO statt Cloudflare R2

MinIO ist S3-kompatibel. Die App nutzt `@aws-sdk/client-s3`:

```bash
docker run -d \
  --name minio \
  -p 9000:9000 \
  -p 9001:9001 \
  minio/minio server /data --console-address ":9001"
```

ENV-Konfiguration:

```bash
R2_S3_ENDPOINT=http://localhost:9000
R2_ACCESS_KEY_ID=minioadmin
R2_SECRET_ACCESS_KEY=minioadmin
R2_BUCKET_NAME=chat-uploads
R2_ACCOUNT_ID=local          # beliebig, wird nur fuer Namengebung genutzt
R2_PUBLIC_DOMAIN=localhost:9000/chat-uploads  # oder Reverse-Proxy-Domain
```

### LLM-Provider ohne Gateway

Fuer Self-Hosted LLMs (Ollama, vLLM) kann das Business-Mode-Local-Routing genutzt werden:

```bash
BUSINESS_MODE_LOCAL_MODEL=llama3.1
BUSINESS_MODE_LOCAL_URL=http://localhost:11434/v1
```

Fuer einen vollstaendigen Gateway-Ersatz: **LiteLLM** als Proxy vor lokalen oder Cloud-Modellen:

```bash
# LiteLLM als Gateway
pip install litellm
litellm --model ollama/llama3.1 --port 4000

# In der App
AI_GATEWAY_API_KEY=sk-litellm-key
# Model-Registry anpassen auf LiteLLM-kompatible IDs
```

### Mem0 Self-Hosted

Mem0 bietet ein Docker-Image fuer Self-Hosting:

```bash
docker run -d \
  --name mem0 \
  -p 8080:8080 \
  -e MEM0_BACKEND=postgres \
  -e DATABASE_URL=postgresql://user:pass@host/mem0 \
  mem0ai/mem0:latest
```

Die App nutzt das `mem0ai` npm-Package. Fuer Self-Hosted muss ggf. der API-Endpoint konfiguriert werden (in `src/config/memory.ts` anpassen).

---

## Multi-Instanz-Deployment

### Eine Codebase, mehrere Deployments

Jede Instanz ist ein separates Deployment (Vercel-Projekt oder Docker-Container) mit eigenen ENV-Variablen:

```
Repository (eine Codebase)
    │
    ├── Instanz A: lernen.diy
    │   ├── NEXT_PUBLIC_BRAND=lernen
    │   ├── DATABASE_URL=neon-db-a
    │   ├── LOGTO_*=logto-app-a
    │   └── Features: Credits ON, Memory ON, Web ON
    │
    ├── Instanz B: aok.lernen.diy (Kunden-Instanz)
    │   ├── NEXT_PUBLIC_BRAND=aok
    │   ├── DATABASE_URL=neon-db-b
    │   ├── LOGTO_*=logto-app-b
    │   └── Features: BusinessMode ON, Credits OFF
    │
    └── Instanz C: unlearn.how
        ├── NEXT_PUBLIC_BRAND=unlearn
        ├── DATABASE_URL=neon-db-c
        ├── LOGTO_*=logto-app-c
        └── Features: MCP ON, Memory ON
```

### Was pro Instanz getrennt ist

| Aspekt                | Getrennt? | Beschreibung                                |
| --------------------- | --------- | ------------------------------------------- |
| Datenbank             | Ja        | Eigene Neon-DB oder PostgreSQL-Instanz      |
| Auth                  | Ja        | Eigene Logto-App (eigene User-Basis)        |
| Storage               | Optional  | Eigener R2-Bucket oder gemeinsam mit Prefix |
| Features              | Ja        | Eigene ENV-Variablen pro Instanz            |
| Admin                 | Ja        | `ADMIN_EMAILS` pro Instanz                  |
| Experts/Skills/Models | Ja        | In DB gespeichert, per Admin-UI verwaltbar  |

### Was geteilt werden kann

| Aspekt         | Teilbar? | Beschreibung                                                             |
| -------------- | -------- | ------------------------------------------------------------------------ |
| Codebase       | Ja       | Ein Git-Repository fuer alle Instanzen                                   |
| AI Gateway Key | Ja       | Ein Key fuer alle Instanzen moeglich                                     |
| Mem0 Account   | Nein     | User-IDs sind Logto-spezifisch, Separation noetig                        |
| Logto-Instanz  | Moeglich | Mehrere Apps in einer Logto-Instanz, aber getrennte User-Pools empfohlen |

---

## Datenbank-Management

### Entwicklung: `db:push`

```bash
pnpm db:push
```

Pusht das Schema direkt an die Datenbank. Schnell, aber erzeugt keine Migration-History. Nur fuer Entwicklung.

### Produktion: `db:generate` + `db:migrate`

```bash
# Schema-Aenderung im Code vornehmen (src/lib/db/schema/)

# Migration generieren (erstellt SQL in drizzle/)
pnpm db:generate

# Migration ausfuehren
pnpm db:migrate
```

Migrations sind idempotent und koennen sicher mehrfach ausgefuehrt werden.

### Seeding

```bash
pnpm db:seed
```

Fuehrt nacheinander aus:

1. **Experts** — 7 Default-Experts (upsert by slug)
2. **Skills** — Importiert `skills/*/SKILL.md` Dateien (upsert by slug)
3. **Models** — Aus `MODELS_CONFIG` ENV oder Fallback (upsert by modelId)
4. **MCP-Server** — Aus `MCP_SERVERS_CONFIG` ENV (upsert by serverId)

Idempotent: kann beliebig oft ausgefuehrt werden. Bestehende Eintraege werden aktualisiert, nicht dupliziert.

### Drizzle Studio (DB Browser)

```bash
pnpm db:studio
```

Oeffnet eine Web-UI zum Durchsuchen und Bearbeiten der Datenbank. Nuetzlich fuer Debugging und manuelle Datenkorrekturen.

---

## Auth-Flow

### Ablauf

```
User besucht /
    │
    ▼
Landing Page (public)
    │ Klick auf "Jetzt starten"
    ▼
proxy.ts prueft Session-Cookie
    │
    ├── Cookie vorhanden + gueltig → App laden
    │
    └── Kein Cookie → Redirect zu Logto
        │
        ▼
    Logto Hosted UI (Email OTP / Social Login)
        │ Login erfolgreich
        ▼
    Redirect zu /api/auth/callback
        │
        ▼
    handleSignIn() tauscht Code gegen Token
        │
        ▼
    Session-Cookie gesetzt → Redirect zu /(app)/
```

### Dev-Bypass

Wenn `LOGTO_APP_ID` nicht gesetzt ist, laesst der Proxy alle Requests durch. Erlaubt lokale Entwicklung ohne Auth-Setup.

### LOGTO_BASE_URL pro Umgebung

| Umgebung   | LOGTO_BASE_URL               | Logto Redirect URI                             |
| ---------- | ---------------------------- | ---------------------------------------------- |
| Lokal      | `http://localhost:3000`      | `http://localhost:3000/api/auth/callback`      |
| Staging    | `https://staging.domain.com` | `https://staging.domain.com/api/auth/callback` |
| Produktion | `https://domain.com`         | `https://domain.com/api/auth/callback`         |

Redirect URI muss in der Logto-App-Konfiguration eingetragen sein, sonst schlaegt der Callback fehl.

---

## Checkliste: Neue Instanz

### Minimal (Chat funktioniert)

- [ ] Repository klonen, `pnpm install`
- [ ] Neon-DB anlegen (oder PostgreSQL bereitstellen)
- [ ] Logto-App anlegen (oder Logto Self-Hosted aufsetzen)
- [ ] AI Gateway Key beschaffen (oder LiteLLM aufsetzen)
- [ ] `.env.local` mit Pflicht-Variablen erstellen
- [ ] `pnpm db:push` (Schema)
- [ ] `pnpm db:seed` (Default-Daten)
- [ ] `pnpm dev` (lokal testen)
- [ ] Vercel-Projekt anlegen oder Docker-Build

### Empfohlen (vollstaendiges Setup)

- [ ] `ADMIN_EMAILS` setzen fuer Admin-Zugang
- [ ] R2-Bucket oder MinIO fuer File-Storage
- [ ] Firecrawl-Key fuer Web-Suche
- [ ] Mem0-Key fuer Memory
- [ ] Models via Admin-UI oder `MODELS_CONFIG` konfigurieren
- [ ] Experts via Admin-UI anpassen
- [ ] Skills via Admin-UI importieren

### Enterprise (maximale Features)

- [ ] `NEXT_PUBLIC_BUSINESS_MODE=true` fuer PII-Schutz
- [ ] Mistral-Key fuer EU-Routing
- [ ] `NEXT_PUBLIC_CREDITS_ENABLED=true` fuer Credit-System
- [ ] MCP-Server konfigurieren (GitHub, Slack, etc.)
- [ ] Gemini-Key fuer Bildgenerierung
- [ ] Rate-Limiting auf Upstash Redis umstellen

---

## Troubleshooting

| Problem                      | Ursache                                              | Loesung                                                   |
| ---------------------------- | ---------------------------------------------------- | --------------------------------------------------------- |
| Auth-Callback schlaegt fehl  | Redirect URI nicht in Logto konfiguriert             | URI in Logto-App-Settings eintragen                       |
| "Chat ist deaktiviert" (404) | `NEXT_PUBLIC_CHAT_ENABLED=false`                     | ENV-Variable entfernen oder auf `true` setzen             |
| Kein Admin-Link sichtbar     | `ADMIN_EMAILS` nicht gesetzt oder Email stimmt nicht | ENV pruefen, Gross-/Kleinschreibung egal                  |
| CSS-Fehler nach Update       | Turbopack-Cache stale                                | `.next/` Ordner loeschen, `pnpm dev` neu starten          |
| MCP-Server timeout           | ENV-Variable fuer Server nicht gesetzt               | `envVar`-Feld der Server-Config pruefen                   |
| Credits nicht abgezogen      | Feature-Flag nicht aktiv                             | `NEXT_PUBLIC_CREDITS_ENABLED=true` setzen (Build noetig)  |
| Memory-Suche liefert nichts  | Circuit Breaker offen (5 Fehler)                     | 5 Minuten warten oder App neu starten                     |
| File-Upload gibt 404         | R2 nicht konfiguriert                                | `R2_ACCESS_KEY_ID` setzen oder Storage-Feature ignorieren |
| Bilder nur als data-URL      | R2 nicht konfiguriert                                | Funktioniert trotzdem, nur groessere Messages in DB       |
