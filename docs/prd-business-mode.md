# PRD: Business Mode — Datenschutz & PII-Prüfung

> Status: **Entwurf** — zur Abstimmung im Team
> Erstellt: 2026-03-14

---

## Problem

Die Chat-Plattform arbeitet mit LLM-Providern, die nicht zwingend DSGVO-konform sind. Im B2B-Einsatz muss sichergestellt werden, dass Nutzer bewusst entscheiden, ob sie sensible Daten (Dateien, personenbezogene Daten in Textnachrichten) an diese Provider senden.

## Lösung

Der Business Mode bietet ein **abgestuftes Datenschutzkonzept** mit vier Eskalationsstufen:

1. **Erkennung** — Server-seitige PII-Detection vor dem Senden
2. **Maskierung** — Sensible Daten werden server-seitig maskiert, bevor sie das LLM erreichen
3. **EU-Routing** — Nachricht wird an einen DSGVO-konformen EU-Provider umgeleitet (z.B. Mistral)
4. **Lokale Verarbeitung** — Nachricht wird an ein selbst-gehostetes Modell gesendet (z.B. Ollama)

Dazu: Datenschutz-Dialoge bei File-Uploads und ein Audit Trail mit nachweisbarer Zustimmung.

Aktivierung per `BUSINESS_MODE_ENABLED` ENV-Variable. Wenn deaktiviert: null Impact auf die bestehende App.

---

## 1. Feature Flag & Config

### Feature Flag

`src/config/features.ts`:

```typescript
businessMode: { enabled: !!process.env.BUSINESS_MODE_ENABLED }
```

### Config

Neue Datei `src/config/business-mode.ts`:

```typescript
export const businessModeConfig = {
  enabled: !!process.env.BUSINESS_MODE_ENABLED,
  piiDetectionMode: (process.env.BUSINESS_MODE_PII_DETECTION ?? "regex") as "regex" | "llm" | "hybrid",
  privacyNoticeUrl: process.env.BUSINESS_MODE_PRIVACY_URL ?? null,
  // Privacy-Routing: Welche Modelle stehen als Alternativen bereit?
  euModelId: process.env.BUSINESS_MODE_EU_MODEL ?? null,       // z.B. "mistral/mistral-large-latest"
  localModelId: process.env.BUSINESS_MODE_LOCAL_MODEL ?? null,  // z.B. "local/llama3"
  localProviderUrl: process.env.BUSINESS_MODE_LOCAL_URL ?? null, // z.B. "http://localhost:11434/v1"
} as const
```

### Client-Awareness

Neuer Endpoint `GET /api/business-mode/status` liefert:

```typescript
{
  enabled: boolean,
  options: {
    redaction: true,                    // immer verfügbar wenn enabled
    euModel: boolean,                   // true wenn euModelId konfiguriert
    localModel: boolean,                // true wenn localModelId + localProviderUrl konfiguriert
  }
}
```

Client fetcht einmal bei App-Mount, um zu wissen welche Optionen im Dialog angeboten werden.

---

## 2. Datensouveränität — Vier Stufen

### Übersicht

```
Stufe 0: Kein Business Mode
  → Nachricht geht unverändert an den gewählten Provider (z.B. OpenAI US)

Stufe 1: Bestätigung ("Trotzdem senden")
  → User bestätigt bewusst, PII wird an Cloud-Provider gesendet
  → Consent wird geloggt (Audit Trail)
  → Daten verlassen die Infrastruktur

Stufe 2: Maskierung ("Maskiert senden")
  → PII wird server-seitig durch Platzhalter ersetzt
  → Maskierter Text geht an Cloud-Provider
  → Daten verlassen die Infrastruktur, aber ohne PII

Stufe 3: EU-Routing ("Mit EU-Modell senden")
  → Original-Text geht an EU-Provider (z.B. Mistral, Paris)
  → Daten verlassen nicht die EU
  → Qualitätsunterschied zum Cloud-Modell möglich

Stufe 4: Lokale Verarbeitung ("Lokal verarbeiten")
  → Original-Text geht an selbst-gehostetes Modell (Ollama/vLLM)
  → Daten verlassen nicht den eigenen Server
  → Qualität abhängig vom lokalen Modell
```

### Technische Umsetzung pro Stufe

| Stufe       | Was passiert                             | Wo verarbeitet       | AI SDK Integration                                      |
| ----------- | ---------------------------------------- | -------------------- | ------------------------------------------------------- |
| Bestätigung | Original an Cloud                        | Cloud (US/global)    | Normaler `streamText()` Call                            |
| Maskierung  | `redactPii()` → maskierter Text an Cloud | Cloud, aber ohne PII | `streamText()` mit maskiertem Text                      |
| EU-Routing  | Original an EU-Provider                  | EU (z.B. Paris)      | `streamText()` mit `euModelId` statt gewähltem Modell   |
| Lokal       | Original an lokales Modell               | On-Premise           | `streamText()` mit `@ai-sdk/openai-compatible` Provider |

---

## 3. Provider-Architektur für Privacy-Routing

### Recherche-Ergebnis (Stand 2026-03-14)

Das AI SDK ist provider-agnostisch. `streamText()` akzeptiert jedes `LanguageModel`-Objekt. Modell-Wechsel pro Request ist native Funktionalität.

### Evaluierte Provider-Optionen

| Provider            | Package                         | EU-Daten                 | Selbst-gehostet | AI SDK Status             |
| ------------------- | ------------------------------- | ------------------------ | --------------- | ------------------------- |
| **Mistral**         | `@ai-sdk/mistral` (first-party) | Ja (Paris)               | Nein            | Offiziell, stabil         |
| **Azure OpenAI EU** | `@ai-sdk/azure` (first-party)   | Ja (West Europe, Sweden) | Nein            | Offiziell, stabil         |
| **Ollama**          | `@ai-sdk/openai-compatible`     | N/A                      | Ja              | Offiziell (OpenAI-compat) |
| **vLLM**            | `@ai-sdk/openai-compatible`     | N/A                      | Ja              | Offiziell (OpenAI-compat) |
| **llama.cpp**       | `@ai-sdk/openai-compatible`     | N/A                      | Ja              | Offiziell (OpenAI-compat) |
| **LM Studio**       | `@ai-sdk/openai-compatible`     | N/A                      | Ja              | Offiziell (OpenAI-compat) |
| **Aleph Alpha**     | `@ai-sdk/openai-compatible`     | Ja (Deutschland)         | Nein            | OpenAI-compat API         |

### Gewählter Ansatz

**EU-Cloud:** `@ai-sdk/mistral` — first-party AI SDK Package, Daten bleiben in Paris, keine zusätzliche Infrastruktur nötig.

**Lokale Modelle:** `@ai-sdk/openai-compatible` — offizielles Package, deckt alle lokalen Server ab (Ollama, vLLM, llama.cpp, LM Studio). Ein Package für alle lokalen Optionen.

**Kein Ollama-spezifisches Package nötig.** Ollama exponiert seit v0.1.14 eine OpenAI-kompatible API unter `/v1`. `@ai-sdk/openai-compatible` reicht.

### Integration in Chat-Route

Die Chat-Route (`/api/chat`) erhält ein optionales `privacyRoute` Feld im Request-Body:

```typescript
// In der Chat-Route: Model-Resolution mit Privacy-Override
function resolveModel(modelId: string, privacyRoute?: "eu" | "local") {
  if (privacyRoute === "local" && businessModeConfig.localModelId) {
    const localProvider = createOpenAICompatible({
      name: "local-llm",
      baseURL: businessModeConfig.localProviderUrl!,
    })
    return localProvider(businessModeConfig.localModelId)
  }

  if (privacyRoute === "eu" && businessModeConfig.euModelId) {
    return mistral(businessModeConfig.euModelId.replace("mistral/", ""))
  }

  // Default: normales Model via AI Gateway
  return gateway(modelId)
}
```

**Wichtig:** AI Gateway unterstützt keine lokalen Modelle. Lokale Provider laufen direkt, ohne Gateway.

---

## 4. Package-Strategie — PII-Erkennung & Maskierung

### Recherche-Ergebnis (Stand 2026-03-14)

Kein einzelnes Node.js-Package deckt alle Anforderungen ab (Detection + Redaction + deutsche PII-Typen + Serverless-tauglich). Daher: Composite-Ansatz aus spezialisierten Packages.

### Evaluierte Packages

| Package                   | Detect         | Redact        | German                 | Serverless             | Status               | Bewertung                    |
| ------------------------- | -------------- | ------------- | ---------------------- | ---------------------- | -------------------- | ---------------------------- |
| `@redactpii/node`         | Ja             | Ja            | Nein                   | Perfekt (0 deps, <1ms) | Aktiv gepflegt       | **Basis-Package**            |
| `redact-pii`              | Ja             | Ja            | Nein (opt. Google DLP) | Ja                     | Unmaintained (3J)    | Nicht verwenden              |
| `ibantools`               | IBAN           | Nein          | Ja (alle Länder)       | Ja                     | Aktiv                | **Ergänzung für IBAN**       |
| `german-tax-id-validator` | Steuer-ID      | Nein          | Ja                     | Ja (1kB)               | Aktiv                | **Ergänzung für Steuer-ID**  |
| `PII-PALADIN`             | Ja (NER+Regex) | Ja            | Nein                   | Nein (90MB Model)      | 1 Star, keine Lizenz | Nicht verwenden              |
| Microsoft Presidio        | Best-in-class  | Best-in-class | Ja                     | Nein (Python-Service)  | Enterprise           | Zu schwer für v1             |
| Google Cloud DLP          | 150+ Typen     | Ja            | Ja                     | Ja (API-Call)          | Enterprise           | Kostenpflichtig, Vendor-Lock |

### Verworfene Optionen

- **PII-PALADIN:** 90MB NER-Model sprengt Vercel Serverless-Limits (50MB zipped). Kein Detection-only-Mode, keine Lizenz, 1 GitHub-Star. Nicht produktionsreif.
- **redact-pii:** 3 Jahre unmaintained. Riskant als Dependency.
- **Microsoft Presidio:** Bestes Detection-Ergebnis, aber Python-only. Erfordert separaten Service. Overkill für v1.
- **Google Cloud DLP / Azure AI Language:** Externe API-Calls, Kosten, Vendor-Lock-in. Möglich als spätere Erweiterung.

### Gewählter Ansatz: Composite-Stack

```
┌─────────────────────────────────────────────────┐
│  src/lib/pii/                                    │
│                                                   │
│  Layer 1: @redactpii/node (Basis)                │
│  → E-Mail, Kreditkarte, IP, SSN, URLs           │
│  → Detect + Redact, <1ms, 0 Dependencies         │
│                                                   │
│  Layer 2: ibantools (IBAN-Validierung)           │
│  → IBAN aller Länder mit Prüfziffer-Validierung  │
│  → Reduziert False Positives bei Zahlenfolgen     │
│                                                   │
│  Layer 3: german-tax-id-validator (Steuer-ID)    │
│  → 11-stellige deutsche Steuer-ID mit Checksum   │
│  → 1kB, zero-dep                                  │
│                                                   │
│  Layer 4: Eigene Regex (deutsche Lücken)         │
│  → Deutsche Telefonnummern (+49, 0xxx)            │
│  → Sozialversicherungsnummer                      │
│  → PLZ + Ortsname (Kontextmuster)                │
│                                                   │
│  Orchestrator: detectPii() + redactPii()         │
│  → Merged Findings, Deduplizierung, Sortierung    │
│  → Maskierungs-Strategien pro Entitätstyp         │
└─────────────────────────────────────────────────┘
```

**Vorteile:**

- Jedes Package macht eine Sache gut
- Gesamt < 100kB, 0 native Dependencies, Serverless-safe
- Validierungs-Packages (ibantools, german-tax-id-validator) reduzieren False Positives
- Eigene Regex nur für die Lücken, nicht für bereits gelöste Probleme

---

## 5. PII-Modul

### Erkannte Entitäten

| Entität                | Quelle                            | Maskierung                    | Priorität |
| ---------------------- | --------------------------------- | ----------------------------- | --------- |
| E-Mail                 | `@redactpii/node`                 | `r***@example.com`            | Hoch      |
| Kreditkarte            | `@redactpii/node`                 | `**** **** **** 4242`         | Hoch      |
| IP-Adresse             | `@redactpii/node`                 | `192.168.***.***`             | Mittel    |
| URL                    | `@redactpii/node`                 | `https://***`                 | Niedrig   |
| IBAN                   | `ibantools` + Regex               | `DE89 **** **** **** **** 42` | Hoch      |
| Steuer-ID              | `german-tax-id-validator` + Regex | `** *** *** ***`              | Hoch      |
| Telefon (DE)           | Eigene Regex                      | `+49 *** ****78`              | Mittel    |
| Sozialversicherungsnr. | Eigene Regex                      | `** ****** * ***`             | Hoch      |
| PLZ + Ort              | Eigene Regex                      | `0**** D******`               | Niedrig   |

### Modul-Struktur

| Datei                      | Inhalt                                                   |
| -------------------------- | -------------------------------------------------------- |
| `src/lib/pii/types.ts`     | `PiiDetectionResult`, `PiiFinding`, `PiiRedactionResult` |
| `src/lib/pii/patterns.ts`  | Eigene Regex-Definitionen (DE-Telefon, SVN, PLZ)         |
| `src/lib/pii/redaction.ts` | Maskierungs-Strategien pro Entitätstyp                   |
| `src/lib/pii/index.ts`     | `detectPii()` + `redactPii()` Orchestrator               |

### Interfaces

```typescript
interface PiiFinding {
  type: string          // "iban" | "email" | "phone" | "credit_card" etc.
  label: string         // "IBAN", "E-Mail-Adresse" (deutsch, für UI)
  value: string         // Matched text (für Dialog-Anzeige)
  redactedValue: string // Maskiert: "DE89 **** 42"
  start: number         // Position im Text (für Highlighting)
  end: number
}

interface PiiDetectionResult {
  hasPii: boolean
  findings: PiiFinding[]
}

interface PiiRedactionResult {
  redactedText: string  // Text mit allen Findings maskiert
  findings: PiiFinding[]
}
```

### Zwei Funktionen, zwei Use Cases

| Funktion          | Zweck                              | Aufrufer                              |
| ----------------- | ---------------------------------- | ------------------------------------- |
| `detectPii(text)` | Nur erkennen, Findings zurückgeben | PII-Check Endpoint (Dialog-Daten)     |
| `redactPii(text)` | Erkennen + Text maskieren          | Redact Endpoint (maskierte Nachricht) |

---

## 6. DB Schema — Consent Logs

Neue Datei `src/lib/db/schema/consent-logs.ts`:

| Spalte            | Typ            | Beschreibung                                                                          |
| ----------------- | -------------- | ------------------------------------------------------------------------------------- |
| `id`              | text PK        | nanoid(12)                                                                            |
| `user_id`         | text NOT NULL  | Logto sub                                                                             |
| `chat_id`         | text nullable  | Kann vor Chat-Erstellung leer sein                                                    |
| `consent_type`    | text NOT NULL  | `"file_upload"` \| `"pii_detected"`                                                   |
| `decision`        | text NOT NULL  | `"accepted"` \| `"rejected"` \| `"redacted"` \| `"rerouted_eu"` \| `"rerouted_local"` |
| `file_metadata`   | jsonb nullable | `[{ name, type, size }]` — nur Metadaten, nie Inhalte                                 |
| `pii_findings`    | jsonb nullable | `[{ type, label, redactedValue }]`                                                    |
| `routed_model`    | text nullable  | Model-ID bei Rerouting (z.B. `mistral/mistral-large-latest`)                          |
| `message_preview` | text nullable  | Erste 100 Zeichen (Audit-Kontext)                                                     |
| `created_at`      | timestamp w/tz | defaultNow()                                                                          |

Index auf `user_id` + `created_at` für Audit-Queries.

**Queries** (`src/lib/db/queries/consent.ts`):

- `logConsent(input)` — fire-and-forget Insert
- `getConsentLogs(userId, filters?)` — für Admin/Audit

**Decision-Werte:**

| Wert             | Bedeutung                              |
| ---------------- | -------------------------------------- |
| `accepted`       | Original unverändert an Cloud gesendet |
| `rejected`       | Abgebrochen, nichts gesendet           |
| `redacted`       | Maskierter Text an Cloud gesendet      |
| `rerouted_eu`    | Original an EU-Provider gesendet       |
| `rerouted_local` | Original an lokales Modell gesendet    |

---

## 7. API Endpoints

### `GET /api/business-mode/status`

- **Auth:** Keine (Public Config)
- **Response:** `{ enabled, options: { redaction, euModel, localModel } }`
- **Rate Limit:** 60/min

### `POST /api/business-mode/pii-check`

- **Auth:** Required (`requireAuth()`)
- **Body:** `{ text: string }`
- **Response:** `{ hasPii: boolean, findings: PiiFinding[] }`
- **Rate Limit:** 20/min

### `POST /api/business-mode/redact`

- **Auth:** Required (`requireAuth()`)
- **Body:** `{ text: string }`
- **Response:** `{ redactedText: string, findings: PiiFinding[] }`
- **Rate Limit:** 20/min

### `POST /api/business-mode/consent`

- **Auth:** Required (`requireAuth()`)
- **Body:** `{ consentType, decision, chatId?, fileMetadata?, piiFindings?, routedModel?, messagePreview? }`
- **Response:** `{ ok: true }`
- **Rate Limit:** 60/min

Alle Endpoints: Feature-Flag-Check, 404 wenn deaktiviert (bestehendes opt-in Pattern).

**Hinweis:** Kein eigener Endpoint für Privacy-Routing nötig. Die Chat-Route `/api/chat` erhält ein optionales `privacyRoute: "eu" | "local"` Feld im Request-Body und resolved das Modell entsprechend.

---

## 8. Client-Integration

### Hook

Neue Datei `src/hooks/use-business-mode.ts`:

```typescript
function useBusinessMode() {
  return {
    isEnabled,            // boolean
    availableOptions,     // { redaction, euModel, localModel }
    checkBeforeSend,      // async (text, files) => SendDecision
    fileDialogState,
    piiDialogState,
    handleFileConsent,
    handlePiiConsent,
    dismissFileDialog,
    dismissPiiDialog,
  }
}
```

`checkBeforeSend` gibt ein Objekt zurück:

```typescript
type SendDecision =
  | { action: "send"; text: string }                              // Original an Cloud
  | { action: "send_redacted"; text: string }                     // Maskiert an Cloud
  | { action: "send_eu"; text: string; privacyRoute: "eu" }      // Original an EU-Modell
  | { action: "send_local"; text: string; privacyRoute: "local" } // Original an lokales Modell
  | { action: "cancel" }                                          // Abgebrochen
```

### PII-Dialog (erweitert)

`src/components/chat/business-mode-pii-dialog.tsx`:

- shadcn/ui `AlertDialog`
- Titel: "Sensible Daten erkannt"
- Inhalt: Liste der gefundenen Entitäten mit Typ-Label und maskierter Vorschau
- **Aktionen (dynamisch basierend auf `availableOptions`):**

```
┌─────────────────────────────────────────────────────┐
│  ⚠ Sensible Daten erkannt                           │
│                                                      │
│  Folgende personenbezogene Daten wurden erkannt:     │
│                                                      │
│  • IBAN: DE89 **** **** **** **** 42                │
│  • E-Mail: r***@example.com                         │
│                                                      │
│  Diese Daten werden an einen externen KI-Provider    │
│  gesendet, der nicht DSGVO-konform ist.              │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Nachricht bearbeiten          [Sekundär-Button] │ │
│  │ Maskiert senden               [Sekundär-Button] │ │
│  │ Mit EU-Modell senden ¹        [Sekundär-Button] │ │
│  │ Lokal verarbeiten ¹           [Sekundär-Button] │ │
│  │ Trotzdem senden               [Ghost-Button]    │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ¹ nur sichtbar wenn konfiguriert                    │
└─────────────────────────────────────────────────────┘
```

Die Buttons werden dynamisch gerendert: "EU-Modell" und "Lokal verarbeiten" erscheinen nur, wenn die entsprechenden ENV-Variablen konfiguriert sind.

### Integration in ChatView

Änderung in `src/components/chat/chat-view.tsx`:

```typescript
const businessMode = useBusinessMode()

const handleSubmit = useCallback(async (message) => {
  if (!message.text.trim()) return

  if (businessMode.isEnabled) {
    const decision = await businessMode.checkBeforeSend(message.text, message.files)
    if (decision.action === "cancel") return

    // Privacy-Route wird als Extra-Body-Feld an die Chat-Route gesendet
    if ("privacyRoute" in decision) {
      // Transport muss privacyRoute im Body mitsenden
      sendMessage({ text: decision.text }, { privacyRoute: decision.privacyRoute })
    } else {
      sendMessage({ text: decision.text })
    }
  } else {
    sendMessage({ text: message.text })
  }

  setInput("")
}, [sendMessage, businessMode])
```

---

## 9. Message Flow

```
Normal (Business Mode AUS):
  User tippt → Submit → sendMessage() → /api/chat → Stream

Business Mode AN:
  User tippt + optional Files → Submit
    ↓
  [1] Files vorhanden?
    → JA: File-Privacy-Dialog anzeigen
      → "Abbrechen": Files entfernen, zurück zum Input
      → "Fortfahren": Consent loggen
    → NEIN: weiter
    ↓
  [2] PII-Check (POST /api/business-mode/pii-check)
    → Keine Findings → sendMessage(originalText)
    → Findings? → PII-Dialog anzeigen (bis zu 5 Optionen):

      → "Bearbeiten":
          Consent(rejected) loggen
          Zurück zum Input

      → "Maskiert senden":
          POST /api/business-mode/redact → redactedText
          Consent(redacted) loggen
          sendMessage(redactedText) → /api/chat → Cloud-Provider

      → "Mit EU-Modell senden":  [nur wenn euModelId konfiguriert]
          Consent(rerouted_eu, routedModel) loggen
          sendMessage(originalText, privacyRoute: "eu")
          → /api/chat → resolveModel() → Mistral (Paris)

      → "Lokal verarbeiten":  [nur wenn localModelId konfiguriert]
          Consent(rerouted_local, routedModel) loggen
          sendMessage(originalText, privacyRoute: "local")
          → /api/chat → resolveModel() → Ollama/vLLM (On-Premise)

      → "Trotzdem senden":
          Consent(accepted) loggen
          sendMessage(originalText) → /api/chat → Cloud-Provider
```

---

## 10. Design-Entscheidungen

| Entscheidung                                              | Begründung                                                                                                                                                                                          |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vier Stufen statt binär**                               | Datenschutz ist kein An/Aus-Schalter. Unterschiedliche Daten erfordern unterschiedliche Schutzniveaus. Ein Nutzer, der eine IBAN teilt, braucht andere Optionen als einer, der eine E-Mail erwähnt. |
| **`@ai-sdk/openai-compatible` für lokale Modelle**        | Offizielles first-party Package. Deckt Ollama, vLLM, llama.cpp, LM Studio mit einem Package ab. Kein Community-Package mit Wartungsrisiko.                                                          |
| **`@ai-sdk/mistral` für EU-Routing**                      | Offizielles first-party Package. Mistral ist EU-Unternehmen (Paris), Daten verlassen die EU nicht. Keine zusätzliche Infrastruktur nötig.                                                           |
| **Privacy-Route in Chat-Route, nicht separater Endpoint** | `streamText()` ist provider-agnostisch. Ein `privacyRoute`-Feld im Body reicht. Kein zweiter Streaming-Endpoint, keine Code-Duplikation.                                                            |
| **Lokaler Provider als ENV, nicht als User-Setting**      | Lokale Modelle sind Infrastruktur-Entscheidungen, keine User-Präferenzen. Admin konfiguriert, User nutzt.                                                                                           |
| **Dynamische Dialog-Buttons**                             | Nicht jede Installation hat Ollama oder Mistral. Der Dialog zeigt nur verfügbare Optionen.                                                                                                          |
| **Composite-Stack statt Monolith-Package**                | Kein einzelnes Package deckt Detection + Redaction + German ab. Spezialisierte Packages sind besser gepflegt und leichtgewichtiger.                                                                 |
| **`@redactpii/node` als Basis**                           | Aktiv gepflegt, 0 Dependencies, <1ms, Serverless-safe. Deckt internationale Standard-PII ab.                                                                                                        |
| **Validierungs-Packages für IBAN/Steuer-ID**              | `ibantools` und `german-tax-id-validator` nutzen Prüfziffer-Algorithmen. Reduziert False Positives gegenüber reinem Regex.                                                                          |
| **Server-seitige Maskierung**                             | Redaction muss auf dem Server laufen. Client könnte manipuliert werden. Server ist die einzige vertrauenswürdige Instanz für Audit-Zwecke.                                                          |
| **PII-Check ist client-initiiert, nicht server-enforced** | Business Mode = informierte Zustimmung + Audit Trail, keine Zensur. Chat-Route bleibt unverändert.                                                                                                  |
| **Consent-Logs in eigener Tabelle**                       | Überlebt Chat-Löschung, unabhängig querybar für Compliance-Reporting.                                                                                                                               |
| **Kein Eingriff in Chat-Route (außer Model-Resolution)**  | Zero-Impact-Garantie: Business Mode ist rein additiv. Einzige Änderung in der Chat-Route: optionales `privacyRoute` Feld wird ausgewertet.                                                          |

---

## 11. Dateien-Übersicht

### Neue Dateien (15)

| Datei                                               | Zweck                                               |
| --------------------------------------------------- | --------------------------------------------------- |
| `src/config/business-mode.ts`                       | Config (PII-Modus, Privacy-URLs, Model-IDs)         |
| `src/lib/db/schema/consent-logs.ts`                 | Drizzle Schema                                      |
| `src/lib/db/queries/consent.ts`                     | logConsent, getConsentLogs                          |
| `src/lib/pii/types.ts`                              | PII Interfaces                                      |
| `src/lib/pii/patterns.ts`                           | Eigene Regex-Definitionen (DE-Telefon, SVN, PLZ)    |
| `src/lib/pii/redaction.ts`                          | Maskierungs-Strategien pro Entitätstyp              |
| `src/lib/pii/index.ts`                              | detectPii() + redactPii() Orchestrator              |
| `src/lib/ai/privacy-provider.ts`                    | `resolvePrivacyModel()` — EU/Local Provider-Factory |
| `src/app/api/business-mode/status/route.ts`         | GET Status (mit verfügbaren Optionen)               |
| `src/app/api/business-mode/pii-check/route.ts`      | POST PII-Check                                      |
| `src/app/api/business-mode/redact/route.ts`         | POST Redact                                         |
| `src/app/api/business-mode/consent/route.ts`        | POST Consent-Log                                    |
| `src/hooks/use-business-mode.ts`                    | Client-Hook                                         |
| `src/components/chat/business-mode-file-dialog.tsx` | File-Upload Dialog                                  |
| `src/components/chat/business-mode-pii-dialog.tsx`  | PII-Warnung Dialog (dynamische Optionen)            |

### Geänderte Dateien (4)

| Datei                               | Änderung                                                        |
| ----------------------------------- | --------------------------------------------------------------- |
| `src/config/features.ts`            | `businessMode` Flag hinzufügen                                  |
| `src/lib/db/schema/index.ts`        | `consentLogs` Export                                            |
| `src/app/api/chat/route.ts`         | `privacyRoute` aus Body lesen, `resolvePrivacyModel()` aufrufen |
| `src/components/chat/chat-view.tsx` | `useBusinessMode` Hook integrieren, Dialoge rendern             |

### Dependencies (5 neue Packages)

| Package                     | Version | Größe         | Zweck                               |
| --------------------------- | ------- | ------------- | ----------------------------------- |
| `@redactpii/node`           | ^1.0.x  | ~15kB, 0 deps | Basis-Detection + Redaction         |
| `ibantools`                 | ^4.x    | ~50kB         | IBAN-Validierung mit Prüfziffer     |
| `german-tax-id-validator`   | ^1.x    | ~1kB          | Steuer-ID-Validierung mit Checksum  |
| `@ai-sdk/mistral`           | ^1.x    | ~20kB         | EU-Provider (Mistral, Paris)        |
| `@ai-sdk/openai-compatible` | ^0.x    | ~15kB         | Lokale Provider (Ollama, vLLM etc.) |

**Hinweis:** `@ai-sdk/mistral` und `@ai-sdk/openai-compatible` werden nur installiert wenn EU-Routing bzw. lokale Verarbeitung gewünscht ist. Sie sind optionale Dependencies.

---

## 12. ENV-Variablen

| Variable                      | Required           | Beispiel                       | Beschreibung                       |
| ----------------------------- | ------------------ | ------------------------------ | ---------------------------------- |
| `BUSINESS_MODE_ENABLED`       | Nein               | `true`                         | Feature aktivieren                 |
| `BUSINESS_MODE_PII_DETECTION` | Nein               | `regex`                        | Detection-Modus (default: `regex`) |
| `BUSINESS_MODE_PRIVACY_URL`   | Nein               | `https://...`                  | Link zur Datenschutzerklärung      |
| `BUSINESS_MODE_EU_MODEL`      | Nein               | `mistral/mistral-large-latest` | EU-Modell für Privacy-Routing      |
| `MISTRAL_API_KEY`             | Nur bei EU-Routing | `...`                          | API-Key für Mistral                |
| `BUSINESS_MODE_LOCAL_MODEL`   | Nein               | `llama3.1`                     | Modell-Name auf dem lokalen Server |
| `BUSINESS_MODE_LOCAL_URL`     | Nein               | `http://localhost:11434/v1`    | URL des lokalen Modell-Servers     |

---

## 13. Implementierungsreihenfolge

1. **Phase 1 — Infrastruktur:** Config, Feature Flag, `pnpm add` PII-Dependencies, DB Schema + Migration, PII-Modul
2. **Phase 2 — API:** Vier Business-Mode Endpoints (status, pii-check, redact, consent)
3. **Phase 3 — Client:** Hook, Dialoge (dynamische Optionen), ChatView-Integration
4. **Phase 4 — Privacy-Routing:** `resolvePrivacyModel()`, Chat-Route erweitern, `@ai-sdk/mistral` + `@ai-sdk/openai-compatible` integrieren
5. **Phase 5 — Test:** PII-Patterns, Maskierung, Consent-Logging, EU-Routing, lokale Verarbeitung, Zero-Impact bei deaktiviertem Flag

---

## 14. Akzeptanzkriterien

### PII-Erkennung & Maskierung

- [ ] `BUSINESS_MODE_ENABLED` nicht gesetzt → App verhält sich exakt wie vorher
- [ ] `BUSINESS_MODE_ENABLED=true` → Status-Endpoint gibt `{ enabled: true, options: {...} }`
- [ ] Text mit IBAN/E-Mail senden → PII-Dialog erscheint mit korrekten Findings
- [ ] PII-Dialog "Trotzdem senden" → Consent(accepted) in DB, Original-Nachricht geht raus
- [ ] PII-Dialog "Maskiert senden" → Server redacted Text, Consent(redacted) in DB
- [ ] PII-Dialog "Bearbeiten" → Consent(rejected) in DB, zurück zum Input
- [ ] Maskierung korrekt: IBAN `DE89 3704 0044 0532 0130 00` → `DE89 **** **** **** **** 00`
- [ ] PII erkennt: IBAN, E-Mail, Telefon (DE), Steuer-ID, SVN, Kreditkarte, IP
- [ ] `ibantools` validiert IBAN-Prüfziffer (keine False Positives)
- [ ] `german-tax-id-validator` validiert Steuer-ID Checksum

### File-Upload

- [ ] File-Attachment + Submit → File-Dialog erscheint mit Dateiliste
- [ ] File-Dialog Accept → Consent geloggt, Nachricht mit Files gesendet
- [ ] File-Dialog Ablehnen → Files entfernt, Consent(rejected) geloggt

### Privacy-Routing

- [ ] `BUSINESS_MODE_EU_MODEL` gesetzt → "Mit EU-Modell senden" Button erscheint im Dialog
- [ ] EU-Routing → `streamText()` nutzt Mistral-Provider, Antwort streamt korrekt
- [ ] `BUSINESS_MODE_LOCAL_MODEL` + `_LOCAL_URL` gesetzt → "Lokal verarbeiten" Button erscheint
- [ ] Lokales Routing → `streamText()` nutzt OpenAI-compatible Provider, Antwort streamt korrekt
- [ ] Consent-Log enthält `routed_model` bei Rerouting-Decisions
- [ ] Kein EU/Local-Button wenn entsprechende ENV nicht gesetzt

### Audit Trail

- [ ] `consent_logs` Tabelle enthält korrekte Einträge (userId, type, decision, routedModel, metadata)
- [ ] Alle fünf Decision-Typen werden korrekt geloggt

---

## 15. Offene Fragen für Team-Abstimmung

- [ ] Sollen Consent-Logs eine Admin-UI bekommen (Audit-Dashboard)?
- [ ] Brauchen wir einen "Always allow"-Toggle pro User (Cookie/DB-Preference)?
- [ ] Soll der PII-Check auch bei Quicktasks greifen?
- [ ] Welche PII-Entitäten sind MVP, welche können nachgeliefert werden?
- [ ] Braucht der Business Mode ein eigenes Onboarding/Banner beim ersten Besuch?
- [ ] Soll die maskierte Version im Chat visuell markiert werden (z.B. Badge "maskiert")?
- [ ] Soll der User die Maskierung pro Finding einzeln an/abwählen können?
- [ ] Soll bei EU/Local-Routing ein Hinweis erscheinen, dass die Antwortqualität abweichen kann?
- [ ] Brauchen wir ein Default-Verhalten pro Sensitivity-Level (z.B. IBAN = auto-mask, E-Mail = nur warnen)?
- [ ] Soll die Admin-UI konfigurierbar machen, welche Optionen den Nutzern angeboten werden?
