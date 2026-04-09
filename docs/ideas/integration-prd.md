# PRD: Integration Layer — Social Push, Drive Pull, Slack Trigger
**Loschke Chat (build.jetzt) — Übergabedokument für Claude Code**
**Stand: April 2026**

---

## Ziel und Kontext

Loschke Chat soll demonstrierbar und produktiv zeigen, wie KI-Agenten mit der bestehenden Toollandschaft von Nutzern verbunden werden. Dieses PRD spezifiziert drei Integrations-Kategorien als konkreten ersten Ausbauschritt:

1. **Social Push** — Inhalte direkt auf Social-Media-Plattformen publizieren (Instagram)
2. **Drive Pull** — Dokumente aus Cloud-Speichern direkt in den Chat laden (Google Drive)
3. **Slack Trigger** — Nachrichten senden und Workflows aus Slack heraus starten (Slack)

Der Integration Layer basiert auf **Composio** als managed OAuth- und Tool-Provider. Für self-hosted Deployments ist die Architektur so ausgelegt, dass Composio durch Nango oder Custom MCP-Server ersetzt werden kann (Austausch-Schnittstelle, kein Hard-Lock).

---

## Architektur-Übersicht

```
Chat-Request
    │
    ▼
buildTools() in src/app/api/chat/build-tools.ts
    │
    ├── Built-in Tools (wie bisher)
    │
    └── Integration Tools (neu)
            │
            ▼
        ComposioToolAdapter
            │ liest: user_connections-Tabelle
            │ holt: User-spezifischen Token
            ▼
        Composio SDK → Externe APIs
            (Instagram Graph API, Google Drive API, Slack API)
```

**Wichtig:** Integration Tools folgen dem bestehenden Factory-Pattern mit execute-Funktion. Sie erscheinen dem LLM wie Built-in Tools — gleiche Namenskonvention (Underscore: `instagram_post_carousel`).

---

## Neue Datenbank-Tabellen

### `user_connections` (neu)

```typescript
// src/lib/db/schema/user-connections.ts

export const userConnections = pgTable('user_connections', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  userId: text('user_id').notNull(),
  provider: text('provider').notNull(), 
  // Werte: 'instagram' | 'google_drive' | 'slack'
  
  // Composio-spezifisch
  composioConnectionId: text('composio_connection_id'),
  composioEntityId: text('composio_entity_id'),
  
  // Metadaten für UI
  accountLabel: text('account_label'), 
  // z.B. "@mein_instagram_account"
  scopes: jsonb('scopes').$type<string[]>().default([]),
  
  isActive: boolean('is_active').default(true),
  connectedAt: timestamp('connected_at').defaultNow(),
  lastUsedAt: timestamp('last_used_at'),
});

// Index für schnellen User-Lookup
// Index: userId + provider (unique per active connection)
```

### `integration_events` (neu, für Audit Trail)

```typescript
export const integrationEvents = pgTable('integration_events', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  userId: text('user_id').notNull(),
  chatId: text('chat_id'),
  provider: text('provider').notNull(),
  toolName: text('tool_name').notNull(),
  status: text('status').notNull(), 
  // 'pending' | 'approved' | 'denied' | 'success' | 'error'
  payload: jsonb('payload').$type<Record<string, unknown>>(),
  result: jsonb('result').$type<Record<string, unknown>>(),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

---

## Feature 1: Social Push (Instagram)

### Beschreibung
Nutzer verbindet Instagram-Account einmalig via OAuth. Expert kann Carousel-Posts direkt publizieren, nach explizitem Approval durch den Nutzer (ask_user als HITL-Gate).

### Betroffene Dateien

```
src/
├── app/
│   ├── api/
│   │   ├── integrations/
│   │   │   ├── connect/route.ts          (neu — OAuth-Initiation via Composio)
│   │   │   ├── callback/route.ts         (neu — OAuth-Callback-Handler)
│   │   │   └── disconnect/route.ts       (neu — Verbindung trennen)
│   │   └── chat/
│   │       └── build-tools.ts            (erweitern — Integration Tools registrieren)
│   └── (workspace)/
│       └── integrations/
│           └── page.tsx                  (neu — User-seitige Verbindungsverwaltung)
├── lib/
│   ├── db/
│   │   └── schema/
│   │       └── user-connections.ts       (neu)
│   └── integrations/
│       ├── composio-client.ts            (neu — Composio SDK Wrapper)
│       ├── tools/
│       │   └── instagram.ts              (neu — Tool-Definitionen)
│       └── adapter.ts                    (neu — Tool-Factory für build-tools.ts)
└── components/
    └── integrations/
        └── connect-button.tsx            (neu — OAuth-Trigger UI)
```

### Tool-Definition

```typescript
// src/lib/integrations/tools/instagram.ts

export function createInstagramTools(userId: string, connection: UserConnection) {
  return {
    instagram_post_carousel: tool({
      description: `Postet einen Carousel-Post auf Instagram für den verbundenen Account 
        (${connection.accountLabel}). Nur aufrufen nach expliziter Nutzer-Bestätigung via ask_user.
        Benötigt: imageUrls (Array von öffentlich zugänglichen Bild-URLs), caption (Text), 
        hashtags (optional).`,
      parameters: z.object({
        imageUrls: z.array(z.string().url()).min(2).max(10)
          .describe('Öffentliche URLs der Carousel-Bilder (JPEG/PNG, min. 2, max. 10)'),
        caption: z.string().max(2200)
          .describe('Post-Text inkl. Hashtags, max. 2200 Zeichen'),
      }),
      execute: async ({ imageUrls, caption }) => {
        // 1. Composio: Instagram Carousel Container erstellen
        // 2. Composio: Container publishen
        // 3. integration_events Eintrag schreiben
        // 4. Post-URL zurückgeben
        
        const result = await composioClient.executeAction({
          action: 'INSTAGRAM_CREATE_CAROUSEL_POST',
          entityId: connection.composioEntityId,
          params: { imageUrls, caption },
        });
        
        await logIntegrationEvent({
          userId, provider: 'instagram',
          toolName: 'instagram_post_carousel',
          status: result.success ? 'success' : 'error',
          payload: { imageUrls, caption },
          result: result.data,
        });
        
        return result.success 
          ? { success: true, postUrl: result.data.permalink }
          : { success: false, error: result.error };
      },
    }),
  };
}
```

### Flow im Chat (Expert-Instruktion)

Der Instagram-Expert-Systemprompt muss enthalten:

```
Vor dem Aufruf von instagram_post_carousel IMMER ask_user verwenden:
"Ich habe den Carousel vorbereitet. Soll ich ihn jetzt auf deinem Instagram-Account 
(@accountname) posten? Bitte bestätige bevor ich die Aktion ausführe."

Erst nach expliziter Bestätigung (nicht bei "vielleicht" oder Rückfragen) das Tool aufrufen.
instagram_post_carousel NIEMALS ohne vorherigen ask_user aufrufen.
```

### Instagram-spezifische Einschränkungen

- Nur Business/Creator-Accounts (Instagram Graph API Voraussetzung)
- Carousel: min. 2, max. 10 Slides
- Bilder müssen als öffentlich zugängliche URLs vorliegen → Artifact-Images müssen vorher in R2/S3 hochgeladen werden
- Auflösung: min. 320px, max. 1440px, Seitenverhältnis 4:5 bis 1.91:1

**Lösungsansatz für Bildexport:**
Carousel-Artifacts werden als HTML generiert. Vor dem Posting müssen sie gerendert und als PNG exportiert werden. Zwei Optionen:
- Option A (einfach): Nutzer exportiert manuell aus dem Artifact-Panel (PDF/PNG Export-Factory)
- Option B (automatisch): Serverside Playwright-Rendering als separater Microservice

**Empfehlung für MVP:** Option A. Nutzer lädt PNGs hoch, URLs werden aus R2-Storage gezogen.

---

## Feature 2: Drive Pull (Google Drive)

### Beschreibung
Nutzer verbindet Google Drive einmalig. Im Chat kann der Agent direkt auf Drive-Dokumente zugreifen — keine manuelle Upload-Notwendigkeit. Der Nutzer kann per `ask_user` Dateien auswählen, oder der Agent sucht selbst nach relevanten Dokumenten.

### Betroffene Dateien

```
src/lib/integrations/tools/
└── google-drive.ts    (neu)
```

### Tool-Definitionen

```typescript
// src/lib/integrations/tools/google-drive.ts

export function createGoogleDriveTools(userId: string, connection: UserConnection) {
  return {
    
    drive_search_files: tool({
      description: `Sucht nach Dateien im verbundenen Google Drive des Nutzers. 
        Gibt Dateiliste mit IDs zurück. Nutzen wenn Nutzer auf Drive-Dateien verweist 
        oder Dokumente als Kontext gebraucht werden.`,
      parameters: z.object({
        query: z.string()
          .describe('Suchbegriff — Dateiname, Thema oder Typ (z.B. "Q1 Report", "Präsentation")'),
        fileType: z.enum(['document', 'spreadsheet', 'presentation', 'pdf', 'any'])
          .default('any'),
        maxResults: z.number().min(1).max(20).default(5),
      }),
      execute: async ({ query, fileType, maxResults }) => {
        const result = await composioClient.executeAction({
          action: 'GOOGLEDRIVE_FIND_FILE',
          entityId: connection.composioEntityId,
          params: { query, fileType, maxResults },
        });
        return result.data; // Array von { id, name, mimeType, modifiedAt, webViewLink }
      },
    }),

    drive_read_file: tool({
      description: `Liest den Inhalt einer Google Drive Datei (Docs, Sheets, PDF). 
        Gibt den Text-Inhalt zurück. fileId aus drive_search_files verwenden.
        Maximal 50.000 Zeichen werden zurückgegeben.`,
      parameters: z.object({
        fileId: z.string()
          .describe('Google Drive File-ID aus drive_search_files'),
        format: z.enum(['text', 'markdown']).default('markdown')
          .describe('Ausgabeformat des Inhalts'),
      }),
      execute: async ({ fileId, format }) => {
        const result = await composioClient.executeAction({
          action: 'GOOGLEDRIVE_GET_FILE_CONTENT',
          entityId: connection.composioEntityId,
          params: { fileId, format },
        });
        // Token-Budget: auf 50.000 Zeichen begrenzen
        const content = result.data?.content?.substring(0, 50000);
        return { 
          content,
          truncated: (result.data?.content?.length ?? 0) > 50000,
          fileName: result.data?.name,
        };
      },
    }),

  };
}
```

### Typischer Chat-Flow

```
Nutzer: "Kannst du mir das Q1-Report aus unserem Drive zusammenfassen?"

Agent:
1. drive_search_files("Q1 Report") → findet 2 Treffer
2. ask_user: "Ich habe 2 Dateien gefunden: [Liste]. Welche soll ich lesen?"
3. drive_read_file(gewählte fileId)
4. Zusammenfassung erstellen → create_artifact
```

### Sicherheits-Hinweise

- Nur Lese-Zugriff im MVP (kein Schreiben in Drive)
- Token-Budget für Datei-Inhalt: 50.000 Zeichen (verhindert Context-Overflow)
- Keine automatische Indexierung: Agent liest nur auf explizite Anforderung
- OAuth-Scope im MVP: `drive.readonly` (minimales Privileg)

---

## Feature 3: Slack Trigger (Send & Receive)

### Beschreibung
Bidirektionale Slack-Integration: Agent kann Nachrichten in Slack-Channels senden (nach Approval), und Slack-Nachrichten können einen Chat-Workflow in Loschke Chat triggern.

### Betroffene Dateien

```
src/
├── app/
│   └── api/
│       ├── webhooks/
│       │   └── slack/route.ts        (neu — Incoming Slack Events)
│       └── integrations/
│           └── ...                   (wie oben)
└── lib/
    └── integrations/
        └── tools/
            └── slack.ts              (neu)
```

### Tool-Definitionen (Send)

```typescript
// src/lib/integrations/tools/slack.ts

export function createSlackTools(userId: string, connection: UserConnection) {
  return {
    
    slack_send_message: tool({
      description: `Sendet eine Nachricht in einen Slack-Channel oder als DM.
        Nur nach Approval via ask_user verwenden. 
        Gut für: Ergebnisse teilen, Team informieren, Zusammenfassungen senden.`,
      parameters: z.object({
        channel: z.string()
          .describe('Channel-Name (z.B. #marketing) oder User-ID für DM'),
        message: z.string().max(3000)
          .describe('Nachrichtentext (Markdown wird unterstützt)'),
        blocks: z.array(z.unknown()).optional()
          .describe('Optional: Slack Block Kit für formatierte Nachrichten'),
      }),
      execute: async ({ channel, message, blocks }) => {
        const result = await composioClient.executeAction({
          action: 'SLACK_SENDS_A_MESSAGE_TO_A_SLACK_CHANNEL',
          entityId: connection.composioEntityId,
          params: { channel, text: message, blocks },
        });
        return result.success
          ? { success: true, messageTs: result.data.ts, channelId: result.data.channel }
          : { success: false, error: result.error };
      },
    }),

    slack_get_channel_messages: tool({
      description: `Liest die letzten Nachrichten aus einem Slack-Channel.
        Nützlich um Kontext aus laufenden Gesprächen zu bekommen, bevor eine Antwort 
        formuliert wird.`,
      parameters: z.object({
        channel: z.string()
          .describe('Channel-Name oder ID'),
        limit: z.number().min(1).max(50).default(10)
          .describe('Anzahl der letzten Nachrichten'),
      }),
      execute: async ({ channel, limit }) => {
        const result = await composioClient.executeAction({
          action: 'SLACK_FETCH_CHANNEL_MESSAGES_BY_CHANNEL_NAME',
          entityId: connection.composioEntityId,
          params: { channel, limit },
        });
        return result.data?.messages ?? [];
      },
    }),

  };
}
```

### Incoming Trigger: Slack → Loschke Chat

```typescript
// src/app/api/webhooks/slack/route.ts

export async function POST(req: Request) {
  const body = await req.json();
  
  // 1. Slack-Signatur validieren
  if (!verifySlackSignature(req, body)) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Slack URL Verification Challenge
  if (body.type === 'url_verification') {
    return Response.json({ challenge: body.challenge });
  }

  // App-Mention: "@Loschke Chat [Aufgabe]"
  if (body.event?.type === 'app_mention') {
    const { user: slackUserId, text, channel, ts } = body.event;
    
    // Slack-User → Loschke-User auflösen
    const connection = await findConnectionBySlackUserId(slackUserId);
    if (!connection) return new Response('No connection', { status: 200 });
    
    // Aufgabe extrahieren (Text ohne @mention)
    const task = text.replace(/<@[^>]+>/g, '').trim();
    
    // Async: Neuen Chat erstellen und Aufgabe starten
    // (Fire-and-forget, Antwort kommt via slack_send_message zurück)
    await startAgentTask({
      userId: connection.userId,
      task,
      responseChannel: channel,
      threadTs: ts,
    });
    
    // Sofortige Bestätigung an Slack
    return Response.json({ ok: true });
  }

  return Response.json({ ok: true });
}
```

**Trigger-Flow:**

```
Slack: "@Loschke Chat Erstelle eine Zusammenfassung des Q1-Reports"
    │
    ▼
Webhook → startAgentTask()
    │
    ▼
Agent: drive_search_files("Q1 Report") → drive_read_file() → Zusammenfassung
    │
    ▼
slack_send_message("#channel", Zusammenfassung) [ohne extra Approval, da User-Initiiert]
```

### Approval-Logik für Slack

- **User-initiiert via Mention** → kein zusätzlicher Approval nötig (User hat durch den Mention zugestimmt)
- **Agent-initiiert** (Agent will proaktiv in Slack posten) → immer ask_user vorab

---

## Composio Client Wrapper

```typescript
// src/lib/integrations/composio-client.ts

import { Composio } from '@composio/core';

let composioInstance: Composio | null = null;

function getComposioClient(): Composio {
  if (!composioInstance) {
    composioInstance = new Composio({
      apiKey: process.env.COMPOSIO_API_KEY,
    });
  }
  return composioInstance;
}

export const composioClient = {
  async executeAction(params: {
    action: string;
    entityId: string;
    params: Record<string, unknown>;
  }) {
    const client = getComposioClient();
    try {
      const result = await client.actions.execute({
        actionName: params.action,
        requestBody: {
          connectedAccountId: params.entityId,
          input: params.params,
        },
      });
      return { success: true, data: result };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  async initiateConnection(params: {
    provider: string;
    entityId: string;
    redirectUrl: string;
  }) {
    const client = getComposioClient();
    return client.connectedAccounts.initiate({
      integrationId: params.provider,
      entityId: params.entityId,
      redirectUri: params.redirectUrl,
    });
  },
};
```

---

## Integration Tools in build-tools.ts registrieren

```typescript
// Erweiterung in src/app/api/chat/build-tools.ts

// Nach den bestehenden Tool-Registrierungen:

if (features.integrations?.enabled && userId) {
  const connections = await getUserConnections(userId);
  
  for (const connection of connections) {
    if (!connection.isActive) continue;
    
    switch (connection.provider) {
      case 'instagram':
        tools = { ...tools, ...createInstagramTools(userId, connection) };
        break;
      case 'google_drive':
        tools = { ...tools, ...createGoogleDriveTools(userId, connection) };
        break;
      case 'slack':
        tools = { ...tools, ...createSlackTools(userId, connection) };
        break;
    }
  }
}
```

---

## Feature-Flag

```bash
# .env — Integration Layer aktivieren
COMPOSIO_API_KEY=your_composio_api_key
NEXT_PUBLIC_INTEGRATIONS_ENABLED=true

# Für Slack Incoming Triggers:
SLACK_SIGNING_SECRET=your_slack_signing_secret
SLACK_BOT_TOKEN=your_slack_bot_token
```

**Feature-Flag in features.ts:**

```typescript
integrations: {
  enabled: !!(process.env.COMPOSIO_API_KEY && 
              process.env.NEXT_PUBLIC_INTEGRATIONS_ENABLED === 'true'),
}
```

---

## UI: Integrations-Seite im Workspace

Neue Seite unter `/workspace/integrations` (oder `/settings/integrations`).

**Inhalte:**

```
┌─────────────────────────────────────────────┐
│ Verbundene Services                         │
├─────────────────────────────────────────────┤
│ 📷 Instagram     @mein_account   [Trennen]  │
│ 📁 Google Drive  Rico's Drive    [Trennen]  │
│ 💬 Slack         —               [Verbinden]│
└─────────────────────────────────────────────┘
```

**Komponenten:**

- `IntegrationCard` — zeigt Provider, Account-Label, Status, Connect/Disconnect Button
- `ConnectButton` — initiiert OAuth-Flow via `/api/integrations/connect?provider=X`
- `DisconnectDialog` — Bestätigung vor Trennung

---

## Expert-Konfiguration

Neue Standard-Experts oder Erweiterung bestehender Experts:

**Instagram Expert** (neu):
- `allowedTools`: `['ask_user', 'create_artifact', 'generate_image', 'instagram_post_carousel']`
- Systemprompt: Carousel-Erstellung + HITL-Instruktion (s. Feature 1)
- Quicktask: "Carousel erstellen & posten"

**Drive-Assistent Expert** (Erweiterung bestehender Experts):
- `allowedTools`: alle + `drive_search_files`, `drive_read_file`
- Systemprompt-Ergänzung: "Wenn Nutzer auf Dokumente verweist, nutze drive_search_files"

**Slack-Reporter Expert** (neu):
- `allowedTools`: `['create_artifact', 'web_search', 'drive_read_file', 'slack_send_message', 'slack_get_channel_messages']`
- Systemprompt: Kontext aus Slack lesen, Ergebnisse zurücksenden

---

## Implementierungs-Reihenfolge (empfohlen)

### Phase 1 — Infrastruktur (1–2 Tage)
1. `user_connections` und `integration_events` Tabellen
2. Composio Client Wrapper (`composio-client.ts`)
3. OAuth Connect/Callback/Disconnect API-Routes
4. Feature-Flag in features.ts
5. Integrations-Seite UI (minimal)

### Phase 2 — Drive Pull (1 Tag)
1. `google-drive.ts` Tool-Definitionen
2. Integration in `build-tools.ts`
3. Manueller Test: Datei suchen und lesen

### Phase 3 — Social Push (1–2 Tage)
1. `instagram.ts` Tool-Definitionen
2. Instagram Expert + Quicktask
3. Bild-Upload-Flow (R2 + öffentliche URLs)
4. End-to-end Demo-Test

### Phase 4 — Slack Trigger (1–2 Tage)
1. `slack.ts` Tool-Definitionen (Send)
2. Webhook-Handler für Incoming Events
3. App-Mention-Flow testen
4. Slack Expert konfigurieren

---

## Offene Punkte / Entscheidungen

| Punkt | Option A | Option B | Empfehlung |
|---|---|---|---|
| Bild-Rendering für Instagram | Manueller Export | Playwright Server-Side | Option A für MVP |
| Token-Speicherung | Composio verwaltet | Eigene DB-Spalte | Composio für MVP |
| Slack-Auth | Bot-Token (admin-level) | User-OAuth per Nutzer | Bot-Token für MVP |
| Composio vs. Nango | Composio (cloud, schnell) | Nango (self-hosted) | Composio für Demo, Nango für Prod |

---

## Abhängigkeiten

```bash
npm install @composio/core
# Optional für Slack Webhook-Validierung:
npm install @slack/web-api
```

---

*Dokument: Loschke Chat — Integration Layer PRD*
*Für: Claude Code Session*
*Version: 1.0 — April 2026*
