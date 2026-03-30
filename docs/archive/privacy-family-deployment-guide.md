# Privacy-optimiertes Familien-Deployment — Implementierungsleitfaden

> Leitfaden für eine datenschutz- und privacy-optimierte Version der loschke-chat Plattform. Ziel: Minimale Exposition privater Eingaben, alle optionalen Drittanbieter-Services deaktiviert, EU-Hosting, automatische Datenbereinigung.

---

## 1. Analyse: Datenflüsse im Ist-Zustand

### Externe Services die Chat-Inhalte sehen

| Service | Typ | Was wird gesendet | Feature-Flag | Pflicht? |
|---------|-----|-------------------|--------------|----------|
| **Vercel AI Gateway** | AI-Routing | Alle Chat-Nachrichten, System-Prompts, Dateien | `AI_GATEWAY_API_KEY` | Ja (aktuell) |
| **Anthropic / Google / etc.** | AI-Inference | Alle Chat-Nachrichten (via Gateway) | Über Gateway | Ja |
| **Mem0 Cloud** | Semantisches Memory | Chat-Inhalte (Auto-Extraktion), Suchanfragen | `MEM0_API_KEY` | Nein |
| **Firecrawl** | Websuche/Scraping | Suchanfragen, URLs | `FIRECRAWL_API_KEY` | Nein |
| **Google Gemini** | Bildgenerierung | Bildprompts, Referenz-Bilder | `GOOGLE_GENERATIVE_AI_API_KEY` | Nein |
| **MCP Server** | Externe Tools | Tool-Aufrufe (GitHub, Slack etc.) | `MCP_ENABLED` | Nein |

### Services die Metadaten/Identität speichern

| Service | Was wird gespeichert | Feature-Flag | Pflicht? |
|---------|---------------------|--------------|----------|
| **Neon Postgres** | Alle Chats, Nachrichten, Artifacts, Usage-Logs, User-Daten | `DATABASE_URL` | Ja |
| **Logto** | E-Mail, Name, Avatar (OIDC Identity) | `LOGTO_*` | Ja |
| **Cloudflare R2** | Hochgeladene Dateien, generierte Bilder | `R2_ACCESS_KEY_ID` | Nein |

### Datenfluss-Diagramm (Ist-Zustand, alle Features aktiv)

```
User-Eingabe
  → Vercel (Hosting, sieht Server-Code + ENV)
    → Vercel AI Gateway (sieht ALLE Chat-Inhalte)
      → AI-Provider (Anthropic, Google, etc.)
    → Neon Postgres US (speichert alles unbegrenzt)
    → Mem0 Cloud US (speichert semantische Memories)
    → Firecrawl (sieht Suchanfragen)
    → Cloudflare R2 (speichert Dateien)
    → Logto Cloud EU (User-Identität)
    → MCP Server (externe Tool-Aufrufe)
    → Google Gemini (Bildprompts)
```

**Dritte die Chat-Inhalte sehen: bis zu 6 Services**

### Ziel-Datenfluss (nach Umsetzung)

```
User-Eingabe
  → Vercel EU (Hosting, kann TLS-verschlüsselte AI-Requests nicht lesen)
    → Anthropic API direkt (einziger Service der Chat-Inhalte sieht)
    → Neon Postgres EU (speichert Chats, 90-Tage Retention)
    → Logto Cloud EU (nur Identität, kein Chat-Content)
```

**Dritte die Chat-Inhalte sehen: 1 (nur Anthropic)**

---

## 2. Tier 1: ENV-Konfiguration (kein Code nötig)

Alle optionalen Services werden durch **Nicht-Setzen** der ENV-Variablen deaktiviert. Die Feature-Flags in `src/config/features.ts` prüfen automatisch auf die Existenz der Keys.

### 2.1 Deaktivierte Services

| Service | ENV-Variable | Nicht setzen → Effekt |
|---------|-------------|----------------------|
| **Mem0** | `MEM0_API_KEY` | Kein Chat-Content an Mem0 Cloud |
| **Firecrawl** | `FIRECRAWL_API_KEY` | Keine Suchanfragen an Dritte |
| **Jina** | `JINA_API_KEY` | Alternativer Suchprovider aus |
| **Tavily** | `TAVILY_API_KEY` | Alternativer Suchprovider aus |
| **Perplexity** | `PERPLEXITY_API_KEY` | Alternativer Suchprovider aus |
| **MCP** | `MCP_ENABLED` | Keine externen Tool-Integrationen |
| **Gemini** | `GOOGLE_GENERATIVE_AI_API_KEY` | Keine Bildprompts an Google |
| **R2** | `R2_ACCESS_KEY_ID` | Keine Dateien auf Cloudflare (base64-Fallback in DB) |
| **Credits** | `NEXT_PUBLIC_CREDITS_ENABLED` | Weniger Nutzungs-Metadaten |
| **Business Mode** | `NEXT_PUBLIC_BUSINESS_MODE` | Kein PII-Overhead, keine Consent-Logs |

### 2.2 Privacy-Auswirkungen je Service

**Mem0 Cloud** (höchstes Risiko)
- US-basierter Drittanbieter der Chat-Inhalte empfängt und semantische Memories speichert
- Auto-Extraktion sendet Chat-Content fire-and-forget an Mem0 nach jeder Session
- Deaktivierung: Kein Cross-Session-Memory, für Familie akzeptabel

**Firecrawl/Suchprovider**
- Suchanfragen verraten Interessen und Absichten
- Alle Provider loggen Queries serverseitig
- Deaktivierung: Kein Web-Zugriff im Chat

**MCP Server**
- Jeder MCP-Server ist ein externer Endpoint der Tool-Aufrufe empfängt
- Datenexposition hängt vom jeweiligen Server ab (GitHub Token = Repo-Zugriff)
- Deaktivierung: Kein Funktionsverlust für Familie

**Bildgenerierung (Gemini)**
- Prompts werden an Google gesendet
- Googles Datenrichtlinien für Gemini API sind breit gefasst
- Deaktivierung: Optional später einzeln aktivierbar (Bildprompts sind weniger sensitiv)

**R2 Storage**
- Cloudflare speichert hochgeladene Dateien
- Bei Deaktivierung: File-Attachments funktionieren weiter (base64 in Message-Parts)
- Trade-off: Größere DB-Einträge, keine persistenten Bild-Downloads

### 2.3 Empfohlene `.env.local` für Familien-Instanz

```env
# ============================================================
# Familien-Instanz — Privacy-optimierte Konfiguration
# ============================================================

# --- Auth (Logto) ---
LOGTO_APP_ID=<family-app-id>
LOGTO_APP_SECRET=<secret>
LOGTO_ENDPOINT=https://auth.lernen.diy
LOGTO_BASE_URL=https://family-chat.example.com
LOGTO_COOKIE_SECRET=<mindestens-32-zeichen-zufallsstring>

# --- Database (Neon EU-Region: aws-eu-central-1) ---
DATABASE_URL=<neon-eu-connection-string>?sslmode=require

# --- AI Provider (Direkt-Anthropic, KEIN Gateway) ---
# Voraussetzung: Tier 3.1 Code-Änderungen sind umgesetzt
ANTHROPIC_API_KEY=<anthropic-api-key>

# --- Model-Konfiguration (nur Anthropic, EU) ---
DEFAULT_MODEL_ID=claude-sonnet-4-6
MODELS_CONFIG=[{"modelId":"claude-sonnet-4-6","name":"Claude Sonnet 4","provider":"Anthropic","categories":["allrounder"],"region":"eu","contextWindow":200000,"maxOutputTokens":16384,"isDefault":true,"isActive":true,"capabilities":{},"inputPrice":{"per1MTokens":3},"outputPrice":{"per1MTokens":15}}]

# --- Features (nur Kern-Chat aktiv) ---
NEXT_PUBLIC_CHAT_ENABLED=true
NEXT_PUBLIC_DARK_MODE=true
NEXT_PUBLIC_DEFAULT_THEME=system

# --- Admin ---
ADMIN_EMAILS=rico@loschke.ai

# --- Retention (Cron Job, nach Tier 3.2) ---
CHAT_RETENTION_DAYS=90
CRON_SECRET=<zufalls-secret-fuer-cron-auth>

# ============================================================
# NICHT SETZEN (Features bleiben automatisch deaktiviert):
# ============================================================
# AI_GATEWAY_API_KEY          → Kein Vercel Gateway
# MEM0_API_KEY                → Kein Memory-Service
# FIRECRAWL_API_KEY           → Keine Websuche
# JINA_API_KEY                → Keine Websuche
# TAVILY_API_KEY              → Keine Websuche
# PERPLEXITY_API_KEY          → Keine Websuche
# MCP_ENABLED                 → Keine externen Tools
# GOOGLE_GENERATIVE_AI_API_KEY → Keine Bildgenerierung
# R2_ACCESS_KEY_ID            → Kein Cloud-Dateispeicher
# R2_SECRET_ACCESS_KEY
# R2_ACCOUNT_ID
# R2_BUCKET_NAME
# R2_PUBLIC_DOMAIN
# NEXT_PUBLIC_CREDITS_ENABLED → Kein Credit-System
# NEXT_PUBLIC_BUSINESS_MODE   → Kein Business Mode
# MISTRAL_API_KEY             → Kein EU-Routing (nicht nötig, da Direkt-Anthropic)
# BUSINESS_MODE_EU_MODEL
# BUSINESS_MODE_LOCAL_MODEL
# BUSINESS_MODE_LOCAL_URL
```

---

## 3. Tier 2: Infrastruktur-Konfiguration

### 3.1 Neon Datenbank in EU-Region

**Warum:** Alle gespeicherten Daten (Chats, Nachrichten, Artifacts, User) bleiben in der EU.

**Schritte:**
1. Neues Neon-Projekt erstellen: https://console.neon.tech
2. Region wählen: **aws-eu-central-1** (Frankfurt)
3. Connection String kopieren → `DATABASE_URL` in `.env.local`
4. Schema deployen:
   ```bash
   pnpm db:push
   pnpm db:seed
   ```

### 3.2 Vercel Functions in EU-Region

**Warum:** Server-seitige Verarbeitung (Chat-API, Persistenz) läuft in Frankfurt. Zusammen mit Neon EU bleibt die gesamte Datenverarbeitung in der EU.

**Schritte:**

Datei `vercel.json` im Projekt-Root erstellen:

```json
{
  "regions": ["fra1"],
  "crons": [
    {
      "path": "/api/cron/retention",
      "schedule": "0 3 * * *"
    }
  ]
}
```

- `regions: ["fra1"]` → Serverless Functions laufen in Frankfurt
- `crons` → Täglicher Retention-Job um 03:00 UTC (für Tier 3.2)

### 3.3 Logto-Konfiguration für Familie

**Empfehlung:** Logto Cloud behalten. Logto ist EU-basiert (Luxemburg) und speichert nur Identitätsdaten (E-Mail, Name), keinen Chat-Content. Der Aufwand für Self-Hosting übersteigt den Privacy-Gewinn.

**Schritte:**
1. Im Logto Dashboard eine neue Application erstellen (Traditional Web App)
2. Redirect URIs konfigurieren: `https://family-chat.example.com/api/auth/callback`
3. Post sign-out redirect: `https://family-chat.example.com`
4. App ID + Secret in `.env.local` eintragen
5. Familienmitglieder registrieren (E-Mail + OTP)

---

## 4. Tier 3: Code-Änderungen

### 3.1 Vercel AI Gateway durch Direkt-Anthropic ersetzen

**Die größte Privacy-Verbesserung.** Aktuell sieht Vercel über den AI Gateway alle Chat-Inhalte. Mit einer direkten Anthropic-Verbindung geht der Traffic TLS-verschlüsselt von Vercels Serverless Function direkt an Anthropic — Vercel kann den Content nicht mitlesen.

**Betroffene Dateien (3 Stellen):**

| Datei | Zeile | Aktuell | Neu |
|-------|-------|---------|-----|
| `src/app/api/chat/route.ts` | 194 | `gateway(finalModelId)` | `resolveModel(finalModelId)` |
| `src/app/api/chat/persist.ts` | 312 | `gateway(aiDefaults.model)` | `resolveModel(aiDefaults.model)` |
| `src/lib/ai/suggested-replies.ts` | 50 | `gateway(aiDefaults.model)` | `resolveModel(aiDefaults.model)` |

**Schritt 1: Neue Datei erstellen**

Datei: `src/lib/ai/model-resolver.ts`

```typescript
import { gateway } from "ai"
import { anthropic } from "@ai-sdk/anthropic"

/**
 * Resolve a model ID to an AI SDK model instance.
 *
 * Privacy-Modus (ANTHROPIC_API_KEY gesetzt):
 *   Direkte Verbindung zu Anthropic — kein Vercel AI Gateway dazwischen.
 *   Vercel hostet die App, kann aber den TLS-verschlüsselten AI-Traffic nicht lesen.
 *
 * Standard-Modus (AI_GATEWAY_API_KEY gesetzt):
 *   Routing über Vercel AI Gateway (Multi-Provider, Analytics).
 */
export function resolveModel(modelId: string) {
  if (process.env.ANTHROPIC_API_KEY) {
    // Gateway-Format: "anthropic/claude-sonnet-4-6" → "claude-sonnet-4-6"
    const stripped = modelId.replace(/^anthropic\//, "")
    return anthropic(stripped)
  }

  // Fallback: Vercel AI Gateway (Rückwärtskompatibilität)
  return gateway(modelId)
}
```

**Schritt 2: `src/app/api/chat/route.ts` anpassen**

```diff
- import { streamText, gateway, stepCountIs } from "ai"
+ import { streamText, stepCountIs } from "ai"
+ import { resolveModel } from "@/lib/ai/model-resolver"

  // ... (Zeile 193-194)
  const result = streamText({
-   model: privacyModel ?? gateway(finalModelId),
+   model: privacyModel ?? resolveModel(finalModelId),
    messages: modelMessages,
```

**Schritt 3: `src/app/api/chat/persist.ts` anpassen**

```diff
- import { generateText, gateway, type StreamTextOnFinishCallback } from "ai"
+ import { generateText, type StreamTextOnFinishCallback } from "ai"
+ import { resolveModel } from "@/lib/ai/model-resolver"

  // ... (Zeile 311-312)
  generateText({
-   model: gateway(aiDefaults.model),
+   model: resolveModel(aiDefaults.model),
    system: SYSTEM_PROMPTS.titleGeneration,
```

**Schritt 4: `src/lib/ai/suggested-replies.ts` anpassen**

```diff
- import { generateText, gateway } from "ai"
+ import { generateText } from "ai"
+ import { resolveModel } from "@/lib/ai/model-resolver"

  // ... (Zeile 49-50)
  const result = await Promise.race([
    generateText({
-     model: gateway(aiDefaults.model),
+     model: resolveModel(aiDefaults.model),
      system: `Du generierst Vorschläge...`,
```

**Verifikation:**
- `ANTHROPIC_API_KEY` setzen, `AI_GATEWAY_API_KEY` NICHT setzen
- Chat senden → in Vercel Function Logs prüfen dass Requests an `api.anthropic.com` gehen
- Ohne `ANTHROPIC_API_KEY` fällt die App automatisch auf den Gateway zurück

**Hinweis zur Model-ID:**
- Gateway-Format: `anthropic/claude-sonnet-4-6` (mit Provider-Prefix)
- Direkt-Format: `claude-sonnet-4-6` (ohne Prefix)
- `resolveModel()` strippt den Prefix automatisch
- `DEFAULT_MODEL_ID` und `MODELS_CONFIG` sollten für die Familien-Instanz das Format **ohne** `anthropic/` Prefix verwenden: `claude-sonnet-4-6`

### 3.2 Chat-Retention — Automatische Löschung alter Chats

**Warum:** Ohne Retention-Policy speichert Neon alle Chats unbegrenzt. Bei einem DB-Breach wäre die gesamte Chat-Historie aller Familienmitglieder exponiert.

**Schritt 1: Neue Query-Funktion**

Datei: `src/lib/db/queries/chats.ts` — am Ende hinzufügen:

```typescript
import { lt } from "drizzle-orm"
import { usageLogs } from "@/lib/db/schema/usage-logs"

/**
 * Delete expired chats and associated usage logs.
 * Pinned chats are excluded. Messages and artifacts cascade automatically.
 *
 * @param olderThanDays - Delete chats not updated in this many days
 * @returns Number of deleted chats
 */
export async function deleteExpiredChats(olderThanDays: number): Promise<number> {
  const db = getDb()
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)

  // Step 1: Find expired chat IDs (non-pinned, older than cutoff)
  const expiredChats = await db
    .select({ id: chats.id })
    .from(chats)
    .where(
      and(
        eq(chats.isPinned, false),
        lt(chats.updatedAt, cutoff)
      )
    )

  if (expiredChats.length === 0) return 0

  const expiredIds = expiredChats.map((c) => c.id)

  // Step 2: Delete usage_logs for expired chats (no CASCADE on this FK)
  for (const chatId of expiredIds) {
    await db
      .delete(usageLogs)
      .where(eq(usageLogs.chatId, chatId))
  }

  // Step 3: Delete chats (messages + artifacts CASCADE automatically)
  for (const chatId of expiredIds) {
    await db
      .delete(chats)
      .where(eq(chats.id, chatId))
  }

  return expiredIds.length
}
```

**Hinweis:** Die `messages` und `artifacts` Tabellen haben `onDelete: "cascade"` auf die `chatId` FK, werden also automatisch mitgelöscht. `usage_logs` hat `onDelete: "set null"`, daher manuelles Löschen.

**Schritt 2: Cron-Job API Route**

Datei: `src/app/api/cron/retention/route.ts` — neu erstellen:

```typescript
import { deleteExpiredChats } from "@/lib/db/queries/chats"

const DEFAULT_RETENTION_DAYS = 90

export async function GET(req: Request) {
  // Vercel Cron Auth: https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const retentionDays = parseInt(
    process.env.CHAT_RETENTION_DAYS ?? String(DEFAULT_RETENTION_DAYS),
    10
  )

  try {
    const deletedCount = await deleteExpiredChats(retentionDays)

    console.log(
      `[retention] Deleted ${deletedCount} expired chats (older than ${retentionDays} days)`
    )

    return Response.json({
      success: true,
      deletedChats: deletedCount,
      retentionDays,
    })
  } catch (error) {
    console.error("[retention] Failed:", error instanceof Error ? error.message : error)
    return Response.json({ error: "Retention job failed" }, { status: 500 })
  }
}
```

**Schritt 3: `vercel.json` mit Cron-Konfiguration**

Bereits in Tier 2 (Abschnitt 3.2) angelegt. Die Cron-Zeile `"schedule": "0 3 * * *"` führt den Job täglich um 03:00 UTC aus.

**Schritt 4: ENV-Variablen**

```env
CHAT_RETENTION_DAYS=90
CRON_SECRET=<zufalls-secret>
```

- `CRON_SECRET` in Vercel Dashboard unter Environment Variables setzen
- Vercel sendet diesen als `Authorization: Bearer <secret>` Header

**Verifikation:**
- Manuell aufrufen: `curl -H "Authorization: Bearer <secret>" https://family-chat.example.com/api/cron/retention`
- Response prüfen: `{ "success": true, "deletedChats": 0, "retentionDays": 90 }`
- Test: Chat erstellen, `CHAT_RETENTION_DAYS=0` setzen, Cron triggern → Chat gelöscht
- Gepinnte Chats bleiben erhalten

---

## 5. Optionale Erweiterungen

### 5.1 User-Datenexport und -Löschung (DSGVO)

Aktuell gibt es keinen Endpoint für vollständige Datenexporte oder Account-Löschung. Für eine Familien-Instanz ist das eine gute Praxis.

**Neue API-Route: `src/app/api/user/data/route.ts`**

```typescript
import { requireAuth } from "@/lib/api-guards"
import { getUserChats, deleteChat } from "@/lib/db/queries/chats"
import { getChatWithMessages } from "@/lib/db/queries/chats"

// GET → Datenexport als JSON
export async function GET() {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const { chats } = await getUserChats(user.id, { limit: 1000 })
  const exportData = {
    user: { id: user.id, email: user.email, name: user.name },
    exportedAt: new Date().toISOString(),
    chats: await Promise.all(
      chats.map(async (chat) => {
        const full = await getChatWithMessages(chat.id)
        return full
      })
    ),
  }

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="data-export-${user.id}.json"`,
    },
  })
}

// DELETE → Alle Daten löschen
export async function DELETE() {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const { chats } = await getUserChats(user.id, { limit: 10000 })
  for (const chat of chats) {
    await deleteChat(chat.id, user.id)
  }

  return Response.json({ success: true, deletedChats: chats.length })
}
```

### 5.2 Logto Self-Hosting (nur bei hohem Privacy-Bedarf)

Falls auch Identitätsdaten nicht bei Dritten liegen sollen:

1. Hetzner Cloud Server (CX22, 4 EUR/Monat, Standort Falkenstein/DE)
2. Logto Docker Compose: https://docs.logto.io/docs/get-started/self-hosting
3. Domain: z.B. `auth.family.example.com`
4. `LOGTO_ENDPOINT` in `.env.local` auf Self-Hosted-Instanz umstellen
5. Logto benötigt eigene Postgres-DB (kann auf dem gleichen Hetzner-Server laufen)

**Empfehlung:** Nicht nötig für Familien-Instanz. Logto Cloud ist EU-basiert und speichert nur E-Mail + Name.

### 5.3 Neon durch Self-Hosted Postgres ersetzen (nicht empfohlen)

**Aufwand:** 4-8 Stunden + laufende Wartung. Drizzle-Driver-Change von `@neondatabase/serverless` → `postgres` (node-postgres). Backup-Strategie, Connection-Pooling (PgBouncer), Updates.

**Empfehlung:** Neon EU-Region mit Retention-Policy reicht. Der Betriebsaufwand übersteigt den Privacy-Gewinn deutlich.

---

## 6. Deployment-Checkliste

### Vorbereitung

- [ ] Neon-Projekt in EU-Region (Frankfurt) erstellen
- [ ] Logto Application für Familien-Domain erstellen
- [ ] Anthropic API Key beschaffen (https://console.anthropic.com)
- [ ] Domain für Familien-Instanz vorbereiten (DNS, SSL via Vercel)

### Code-Änderungen

- [ ] `src/lib/ai/model-resolver.ts` erstellen (Tier 3.1, Schritt 1)
- [ ] `src/app/api/chat/route.ts` anpassen (Tier 3.1, Schritt 2)
- [ ] `src/app/api/chat/persist.ts` anpassen (Tier 3.1, Schritt 3)
- [ ] `src/lib/ai/suggested-replies.ts` anpassen (Tier 3.1, Schritt 4)
- [ ] `src/lib/db/queries/chats.ts` erweitern (Tier 3.2, Schritt 1)
- [ ] `src/app/api/cron/retention/route.ts` erstellen (Tier 3.2, Schritt 2)
- [ ] `vercel.json` erstellen (Tier 2)

### Konfiguration

- [ ] `.env.local` nach Vorlage aus Abschnitt 2.3 erstellen
- [ ] Vercel-Projekt erstellen und Domain zuweisen
- [ ] ENV-Variablen in Vercel Dashboard setzen
- [ ] `CRON_SECRET` generieren und in Vercel setzen

### Datenbank

- [ ] `pnpm db:push` — Schema deployen
- [ ] `pnpm db:seed` — Default Experts seeden
- [ ] Familienmitglieder in Logto registrieren

### Verifikation

- [ ] Login über Logto funktioniert
- [ ] Chat senden — Antwort kommt von Anthropic
- [ ] In Vercel Function Logs: Requests gehen an `api.anthropic.com` (nicht `gateway.ai.vercel.com`)
- [ ] Deaktivierte Features nicht in UI sichtbar (kein Web-Search, kein Memory-Toggle, keine Bildgenerierung)
- [ ] Vercel Function Region ist `fra1` (Frankfurt) — prüfen im Deployment-Dashboard
- [ ] Neon Region ist `aws-eu-central-1` — prüfen im Neon Dashboard
- [ ] Cron-Job manuell triggern und Response prüfen
- [ ] Gepinnter Chat überlebt Cron-Job
- [ ] Nicht-gepinnter alter Chat wird gelöscht

---

## 7. Zusammenfassung: Privacy-Gewinn

| Maßnahme | Aufwand | Privacy-Gewinn |
|----------|---------|---------------|
| Optionale Services deaktivieren (ENV) | 15 Min | **Hoch** — 5 Drittanbieter weniger |
| Direkt-Anthropic statt Gateway (Code) | 30 Min | **Sehr hoch** — Vercel sieht keinen Chat-Content |
| EU-Region Neon + Vercel (Config) | 10 Min | **Hoch** — alle Daten in EU |
| Chat-Retention 90 Tage (Code) | 1 Std | **Mittel** — begrenzt Breach-Risiko |
| DSGVO-Export/Löschung (Code) | 2 Std | **Mittel** — Compliance |

### Ergebnis

| Vorher | Nachher |
|--------|---------|
| 6+ Services sehen Chat-Inhalte | 1 Service (Anthropic) |
| Daten in US + EU verteilt | Alles in EU |
| Unbegrenzte Speicherung | 90-Tage Retention (pinned ausgenommen) |
| Kein Datenexport/-löschung | DSGVO-Endpoints verfügbar |

### Verbleibende Risiken

1. **Anthropic** sieht alle Chat-Inhalte — unvermeidbar bei Cloud-AI. Alternative wäre Self-Hosted LLM (z.B. Ollama), aber mit erheblichem Qualitätsverlust.
2. **Neon** speichert die DB — EU-Region + Retention-Policy minimieren das Risiko. Alternative wäre Self-Hosted Postgres.
3. **Vercel** hostet die App und hat Zugriff auf ENV-Variablen (inkl. API-Keys) — aber nicht auf den verschlüsselten AI-Traffic.
4. **Logto** kennt E-Mail + Name — EU-basiert, minimale Daten.

---

## 8. Feature-Flag Referenz

Alle Feature-Flags leben in `src/config/features.ts`. Drei Patterns:

```
Opt-out (Default aktiv):     NEXT_PUBLIC_CHAT_ENABLED, NEXT_PUBLIC_DARK_MODE, NEXT_PUBLIC_MERMAID_ENABLED
Opt-in Server (API-Key):     FIRECRAWL_API_KEY, MEM0_API_KEY, R2_ACCESS_KEY_ID, MCP_ENABLED, ADMIN_EMAILS, GOOGLE_GENERATIVE_AI_API_KEY
Opt-in Client (NEXT_PUBLIC):  NEXT_PUBLIC_BUSINESS_MODE, NEXT_PUBLIC_CREDITS_ENABLED
```

Für die Familien-Instanz: Alle Opt-in Features NICHT konfigurieren. Die App prüft beim Start automatisch und blendet nicht-konfigurierte Features in der UI aus.
