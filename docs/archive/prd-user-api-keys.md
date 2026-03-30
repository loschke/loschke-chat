# PRD: User API Keys (Bring Your Own Key)

> Nutzer koennen eigene API-Keys fuer externe Services hinterlegen. Platform-Keys (ENV) dienen als Default, User-Keys als Override.

---

## 1. Problem

Externe Service-Tools (Stitch, YouTube, Firecrawl, etc.) sind heute ausschliesslich ueber Instance-Level ENV-Variablen konfiguriert. Das fuehrt zu drei Einschraenkungen:

1. **Alles-oder-nichts:** Entweder der Admin stellt einen Key bereit, oder das Feature existiert nicht.
2. **Keine Kostentrennung:** Alle Nutzer teilen sich denselben API-Key und dasselbe Kontingent.
3. **Kein Self-Service:** Nutzer, die eigene Accounts bei Google/Firecrawl/etc. haben, koennen diese nicht nutzen.

## 2. Ziel

Ein generisches System, bei dem:
- **Platform-Keys** (ENV) als Default fuer alle Nutzer gelten
- **User-Keys** den Platform-Key pro Service ueberschreiben
- Tools dynamisch den effektiven Key ermitteln: `userKey ?? platformKey ?? disabled`
- Das System erweiterbar ist fuer zukuenftige Services ohne Schema-Aenderungen

## 3. Scope

### In Scope

- Generisches Key-Value-Speichermodell fuer User-API-Keys
- Verschluesselung at rest (AES-256-GCM)
- Settings-UI zum Hinterlegen und Loeschen von Keys
- Key-Resolution in `build-tools.ts`: User > Platform > Disabled
- Stitch als erster konkreter Service (bereits integriert)

### Out of Scope

- OAuth-basierte Service-Verbindungen (z.B. "Mit Google verbinden")
- Key-Validierung beim Speichern (kein API-Call zum Pruefen)
- Key-Sharing zwischen Nutzern oder Teams
- Admin-Sicht auf User-Keys (Privacy by Design)
- Rate-Limiting pro User-Key (liegt beim externen Service)

---

## 4. Architektur

### Datenmodell: Generisches Key-Value

Statt einzelner Spalten pro Service eine flexible `user_api_keys` Tabelle:

```sql
CREATE TABLE user_api_keys (
  id          text PRIMARY KEY,           -- nanoid
  user_id     text NOT NULL,              -- Logto sub
  service     text NOT NULL,              -- z.B. "stitch", "firecrawl", "youtube"
  encrypted_key text NOT NULL,            -- AES-256-GCM verschluesselt
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, service)               -- Ein Key pro Service pro User
);
```

**Vorteile gegenueber Spalten auf `users`:**
- Neue Services ohne Migration
- Kein Null-Spalten-Bloat auf der users-Tabelle
- Keys isoliert loeschbar
- Einfach zu auditen und zu exportieren (DSGVO)

### Service-Registry

Zentrale Definition welche Services User-Keys unterstuetzen:

```typescript
// src/config/user-api-keys.ts
export const USER_KEY_SERVICES = {
  stitch: {
    label: "Google Stitch",
    description: "API-Key fuer UI-Design-Generierung",
    placeholder: "AIza...",
    envFallback: "STITCH_API_KEY",
    docsUrl: "https://stitch.withgoogle.com/",
  },
  firecrawl: {
    label: "Firecrawl",
    description: "API-Key fuer Websuche und Scraping",
    placeholder: "fc-...",
    envFallback: "FIRECRAWL_API_KEY",
    docsUrl: "https://firecrawl.dev/",
  },
  youtube: {
    label: "YouTube Data API",
    description: "API-Key fuer YouTube-Suche",
    placeholder: "AIza...",
    envFallback: "YOUTUBE_API_KEY",
    docsUrl: "https://console.cloud.google.com/",
  },
  google_ai: {
    label: "Google AI (Gemini)",
    description: "API-Key fuer Bildgenerierung, TTS, YouTube-Analyse",
    placeholder: "AIza...",
    envFallback: "GOOGLE_GENERATIVE_AI_API_KEY",
    docsUrl: "https://aistudio.google.com/",
  },
} as const satisfies Record<string, ServiceDefinition>
```

Neue Services: Eine Zeile in der Registry, keine Migration.

### Verschluesselung

```typescript
// src/lib/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

const ALGORITHM = "aes-256-gcm"
const KEY = Buffer.from(process.env.API_KEY_ENCRYPTION_SECRET!, "hex") // 32 bytes

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  // Format: iv:tag:ciphertext (alle hex)
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`
}

export function decrypt(stored: string): string {
  const [ivHex, tagHex, encHex] = stored.split(":")
  const decipher = createDecipheriv(ALGORITHM, Buffer.from(ivHex, "hex"))
  decipher.setAuthTag(Buffer.from(tagHex, "hex"))
  return decipher.update(encHex, "hex", "utf8") + decipher.final("utf8")
}
```

**ENV:** `API_KEY_ENCRYPTION_SECRET` — 64-stelliger Hex-String (256 Bit). Generieren: `openssl rand -hex 32`

### Key-Resolution

Zentrale Funktion die den effektiven Key ermittelt:

```typescript
// src/lib/user-api-keys.ts
export async function resolveApiKey(
  userId: string,
  service: keyof typeof USER_KEY_SERVICES
): Promise<string | null> {
  // 1. User-Key aus DB (cached)
  const userKey = await getUserApiKey(userId, service)
  if (userKey) return userKey

  // 2. Platform-Key aus ENV
  const envVar = USER_KEY_SERVICES[service].envFallback
  const platformKey = process.env[envVar]
  if (platformKey) return platformKey

  // 3. Nicht verfuegbar
  return null
}
```

### Integration in build-tools.ts

```typescript
// Statt: if (features.stitch.enabled) { ... }
// Neu:
const stitchKey = await resolveApiKey(userId, "stitch")
if (stitchKey) {
  tools.generate_design = generateDesignTool(chatId, userId, stitchKey)
  tools.edit_design = editDesignTool(chatId, userId, stitchKey)
}
```

Tools erhalten den aufgeloesten Key als Parameter statt ihn aus ENV zu lesen.

### Tool-Aenderung (am Beispiel Stitch)

```typescript
// generate-design.ts — vorher:
import { stitch } from "@google/stitch-sdk"

// nachher:
import { StitchToolClient } from "@google/stitch-sdk"

export function generateDesignTool(chatId: string, userId: string, apiKey: string) {
  // Client pro Request mit dem effektiven Key
  const client = new StitchToolClient({ apiKey })
  // ...
}
```

---

## 5. API-Design

### User API Keys CRUD

```
GET    /api/user/api-keys           → [{ service, hasKey, createdAt }]
PUT    /api/user/api-keys/:service  → { key: "..." }  (speichert verschluesselt)
DELETE /api/user/api-keys/:service  → Loescht den Key
```

**Wichtig:** GET gibt niemals den Key zurueck — nur ob einer gesetzt ist (`hasKey: true/false`).

### Response-Format

```json
// GET /api/user/api-keys
{
  "keys": [
    { "service": "stitch", "hasKey": true, "updatedAt": "2026-03-26T..." },
    { "service": "firecrawl", "hasKey": false },
    { "service": "youtube", "hasKey": false },
    { "service": "google_ai", "hasKey": false }
  ]
}
```

---

## 6. UI/UX

### Settings-Sektion "API-Keys"

Im bestehenden Settings-Dialog (oder eigene Route `/settings/api-keys`):

```
┌─────────────────────────────────────────────┐
│ API-Keys                                     │
│                                              │
│ Eigene API-Keys hinterlegen. Wenn gesetzt,  │
│ werden diese statt der Platform-Keys genutzt.│
│                                              │
│ ┌─ Google Stitch ───────────────────────┐   │
│ │ ●  Key hinterlegt (aktualisiert: 26.3)│   │
│ │ [Aendern]  [Entfernen]               │   │
│ └────────────────────────────────────────┘   │
│                                              │
│ ┌─ Firecrawl ───────────────────────────┐   │
│ │ ○  Kein eigener Key (Platform-Default) │   │
│ │ [Key hinzufuegen]                     │   │
│ └────────────────────────────────────────┘   │
│                                              │
│ ┌─ YouTube Data API ────────────────────┐   │
│ │ ○  Kein eigener Key (nicht verfuegbar) │   │
│ │ [Key hinzufuegen]                     │   │
│ └────────────────────────────────────────┘   │
│                                              │
│ Hinweis: Keys werden verschluesselt          │
│ gespeichert und nie im Klartext angezeigt.   │
└─────────────────────────────────────────────┘
```

**Status-Anzeige pro Service:**
- **Gruener Punkt + "Key hinterlegt"** — User-Key aktiv
- **Grauer Punkt + "Platform-Default"** — ENV-Key wird genutzt, funktioniert
- **Grauer Punkt + "Nicht verfuegbar"** — Weder User- noch Platform-Key, Feature deaktiviert

---

## 7. Kandidaten fuer User-Keys

### Phase 1 (mit Stitch-Launch)

| Service | ENV-Fallback | Tools | Sinnvoll? |
|---------|-------------|-------|-----------|
| **Stitch** | `STITCH_API_KEY` | `generate_design`, `edit_design` | Ja — eigenes Stitch-Konto, eigene Projekte |

### Phase 2 (spaeter, bei Bedarf)

| Service | ENV-Fallback | Tools | Sinnvoll? |
|---------|-------------|-------|-----------|
| **Google AI** | `GOOGLE_GENERATIVE_AI_API_KEY` | `generate_image`, `youtube_analyze`, `text_to_speech` | Ja — eigenes Kontingent |
| **YouTube** | `YOUTUBE_API_KEY` | `youtube_search` | Bedingt — Quota-Sharing ist selten ein Problem |
| **Firecrawl** | `FIRECRAWL_API_KEY` | `web_search`, `web_fetch`, `extract_branding` | Bedingt — nur bei Heavy-Usern |

### Nicht sinnvoll als User-Key

| Service | Grund |
|---------|-------|
| **AI Gateway** | Model-Routing ist Platform-Entscheidung, nicht User-konfigurierbar |
| **Mem0** | Memory ist an die Plattform-Instanz gebunden |
| **R2 Storage** | Infrastructure, kein User-facing Service |
| **Logto** | Auth-System, nicht delegierbar |

---

## 8. Betroffene Dateien

### Neue Dateien

| Datei | Zweck |
|-------|-------|
| `src/lib/db/schema/user-api-keys.ts` | Tabellen-Schema |
| `src/lib/db/queries/user-api-keys.ts` | CRUD + Caching |
| `src/lib/crypto.ts` | AES-256-GCM Encrypt/Decrypt |
| `src/config/user-api-keys.ts` | Service-Registry |
| `src/lib/user-api-keys.ts` | `resolveApiKey()` Funktion |
| `src/app/api/user/api-keys/route.ts` | GET (Liste) |
| `src/app/api/user/api-keys/[service]/route.ts` | PUT + DELETE |
| `src/components/settings/api-keys-settings.tsx` | UI-Komponente |

### Bestehende Dateien (Aenderungen)

| Datei | Aenderung |
|-------|-----------|
| `src/app/api/chat/build-tools.ts` | `resolveApiKey()` statt `features.stitch.enabled` |
| `src/app/api/chat/resolve-context.ts` | User-Keys in Context laden |
| `src/lib/ai/tools/generate-design.ts` | API-Key als Parameter statt Singleton |
| `src/lib/ai/tools/edit-design.ts` | API-Key als Parameter statt Singleton |
| `.env.example` | `API_KEY_ENCRYPTION_SECRET` dokumentieren |

---

## 9. Implementierungs-Reihenfolge

### Phase 1: Infrastruktur

| # | Schritt | Abhaengigkeit |
|---|---------|---------------|
| 1 | `crypto.ts` (encrypt/decrypt) | `API_KEY_ENCRYPTION_SECRET` ENV |
| 2 | Schema + Migration (`user_api_keys`) | — |
| 3 | Queries (CRUD + Cache) | 1, 2 |
| 4 | Service-Registry (`user-api-keys.ts`) | — |
| 5 | `resolveApiKey()` | 3, 4 |

### Phase 2: API + Integration

| # | Schritt | Abhaengigkeit |
|---|---------|---------------|
| 6 | API Routes (GET, PUT, DELETE) | 3 |
| 7 | Stitch-Tools auf Key-Parameter umstellen | 5 |
| 8 | `build-tools.ts` nutzt `resolveApiKey()` | 5, 7 |

### Phase 3: UI

| # | Schritt | Abhaengigkeit |
|---|---------|---------------|
| 9 | Settings-UI Komponente | 6 |
| 10 | Integration in bestehende Settings | 9 |

---

## 10. Sicherheit

### Verschluesselung

- AES-256-GCM mit per-Ciphertext IV (12 Bytes)
- Authentication Tag (16 Bytes) verhindert Manipulation
- Server-seitiges Secret (`API_KEY_ENCRYPTION_SECRET`) nur in ENV, nie in DB
- **Key-Rotation:** Neues Secret → alle Keys muessen re-encrypted werden (Migration-Script)

### API-Schutz

- `requireAuth()` auf allen Endpoints
- Rate-Limiting (5 Writes/Minute, 30 Reads/Minute)
- Keys werden nie im Klartext zurueckgegeben (nur `hasKey: boolean`)
- Zod-Validierung auf Service-Name (nur registrierte Services)

### DSGVO

- Keys sind personenbezogene Daten → Teil des Datenexports
- Loeschung: `DELETE /api/user/api-keys/:service` oder Bulk via Account-Deletion
- Verschluesselung erfuellt "angemessene technische Massnahmen"

---

## 11. Risiken

| Risiko | Schwere | Mitigation |
|--------|---------|------------|
| Encryption-Secret verloren | Kritisch | Backup-Prozess dokumentieren, Key-Rotation-Script |
| User-Key ungueltig | Gering | Tool gibt Fehler zurueck, User kann Key aendern |
| Stitch-SDK Singleton vs. per-Request | Mittel | `StitchToolClient` statt `stitch` Singleton nutzen |
| Cache-Invalidierung bei Key-Aenderung | Gering | `clearUserApiKeyCache(userId)` nach PUT/DELETE |
| Performance (Decrypt pro Request) | Gering | AES-256-GCM ist <0.1ms, Cache reduziert DB-Calls |

---

## 12. Offene Entscheidungen

1. **Settings-Platzierung:** Eigene Route `/settings/api-keys` oder Tab im bestehenden Settings-Dialog?
2. **Key-Validierung:** Beim Speichern einen Test-Call machen (z.B. `stitch.projects()`)? Pro: Fruehes Feedback. Contra: Langsam, abhaengig von externem Service.
3. **Benachrichtigung:** Nutzer informieren wenn Platform-Key verfuegbar wird/wegfaellt?

---

## Referenzen

- Bestehende User-Settings: `src/app/api/user/instructions/route.ts`
- Tool-Registrierung: `src/app/api/chat/build-tools.ts`
- Stitch SDK Client: `@google/stitch-sdk` → `StitchToolClient`
