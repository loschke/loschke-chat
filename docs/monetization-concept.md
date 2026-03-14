# Monetarisierungs-Konzept: Credit-basiertes Tier-Modell

> Stand: 2026-03-14 | Status: Konzept | Autor: Rico Loschke

---

## 1. Tier-Modell

Drei Stufen. Free als Einstieg, Pro als Haupt-Revenue, Enterprise als Platzhalter für später.

### Feature-Matrix

| Feature                 | Free                | Pro           | Enterprise         |
| ----------------------- | ------------------- | ------------- | ------------------ |
| **Chat**                | ✓                   | ✓             | ✓                  |
| **Credits/Monat**       | 5.000               | 100.000       | Custom             |
| **Modelle**             | fast-Kategorie      | Alle          | Alle + Custom      |
| **Experts**             | Default (6 globale) | Alle + eigene | Alle + Team-shared |
| **Quicktasks**          | 3/Tag               | Unbegrenzt    | Unbegrenzt         |
| **Skills**              | Basis-Set           | Alle          | Alle + Custom      |
| **Web Search/Fetch**    | ✗                   | ✓             | ✓                  |
| **Artifacts**           | View only           | Create + Edit | Create + Edit      |
| **MCP-Server**          | ✗                   | ✗             | ✓                  |
| **File Upload (R2)**    | 5 MB Limit          | 50 MB Limit   | Custom             |
| **Rate Limit (Chat)**   | 10 req/min          | 30 req/min    | 60 req/min         |
| **Custom Instructions** | ✗                   | ✓             | ✓                  |
| **Chat-History**        | 30 Tage             | Unbegrenzt    | Unbegrenzt         |
| **Support**             | Community           | Email         | Dedicated          |

### Preisrahmen (Empfehlung)

| Tier       | Preis         | Zielgruppe                                  |
| ---------- | ------------- | ------------------------------------------- |
| Free       | 0 €           | Ausprobieren, Studenten, Gelegenheitsnutzer |
| Pro        | 19–29 €/Monat | Professionals, Content Creator, Berater     |
| Enterprise | Auf Anfrage   | Teams, Agenturen (ab 5 Seats)               |

---

## 2. Credit-System

### Grundprinzip

1 Credit = 1.000 Input-Tokens bei einem Standard-Modell. Output-Tokens sind teurer (Faktor 3–5x je nach Modell). Reasoning-Tokens werden wie Output-Tokens berechnet.

### Modell-Multiplikatoren

Jedes Modell bekommt einen Kosten-Multiplikator relativ zum günstigsten Modell. Die Multiplikatoren spiegeln die realen API-Kosten wider.

| Kategorie  | Beispiel-Modell           | Input-Multiplikator | Output-Multiplikator |
| ---------- | ------------------------- | -------------------:| --------------------:|
| fast       | Claude Haiku, GPT-4o-mini | 1x                  | 1x                   |
| allrounder | Claude Sonnet             | 3x                  | 5x                   |
| creative   | Claude Sonnet             | 3x                  | 5x                   |
| coding     | Claude Sonnet             | 3x                  | 5x                   |
| analysis   | Claude Sonnet             | 3x                  | 5x                   |
| enterprise | Claude Opus, GPT-4o       | 15x                 | 25x                  |

### Credit-Berechnung pro Request

```
credits = (inputTokens × inputMultiplier + outputTokens × outputMultiplier
          + reasoningTokens × outputMultiplier) / 1000
          - (cachedInputTokens × inputMultiplier × 0.9) / 1000
```

Cached Tokens bekommen 90% Rabatt (sie kosten real ~10% des Preises).

### Credit-Pakete (Add-on für Pro)

| Paket    | Credits | Preis   | Preis/1K Credits |
| -------- | -------:| -------:| ----------------:|
| Starter  | 50.000  | 4,99 €  | 0,10 €           |
| Standard | 200.000 | 14,99 € | 0,075 €          |
| Power    | 500.000 | 29,99 € | 0,06 €           |

Add-on Credits verfallen nicht (im Gegensatz zum monatlichen Kontingent).

---

## 3. Feature-Gating Architektur

### DB-Schema-Erweiterungen

**users-Tabelle** — Neue Felder:

```typescript
// src/lib/db/schema/users.ts — Erweiterungen
tier: text("tier").default("free").notNull(),           // "free" | "pro" | "enterprise"
creditsBalance: integer("credits_balance").default(0).notNull(),
creditsMonthly: integer("credits_monthly").default(5000).notNull(),
creditsMonthlyUsed: integer("credits_monthly_used").default(0).notNull(),
creditsCycleStart: timestamp("credits_cycle_start", { withTimezone: true }),
stripeCustomerId: text("stripe_customer_id"),
stripeSubscriptionId: text("stripe_subscription_id"),
tierExpiresAt: timestamp("tier_expires_at", { withTimezone: true }),
```

**Neue Tabelle: credit_transactions**

```typescript
// src/lib/db/schema/credit-transactions.ts
export const creditTransactions = pgTable("credit_transactions", {
  id: text("id").primaryKey(),                          // nanoid
  userId: text("user_id").notNull(),
  type: text("type").notNull(),                         // "usage" | "monthly_grant" | "purchase" | "refund" | "admin_adjust"
  amount: integer("amount").notNull(),                  // Negativ bei Verbrauch
  balance: integer("balance").notNull(),                // Balance nach Transaktion
  description: text("description"),
  referenceId: text("reference_id"),                    // usageLog.id, stripe payment intent etc.
  modelId: text("model_id"),                            // Bei usage
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})
```

### TierConfig als Code

```typescript
// src/config/tiers.ts
export interface TierConfig {
  id: "free" | "pro" | "enterprise"
  name: string
  monthlyCredits: number
  allowedModelCategories: ModelCategory[]
  maxExperts: number                     // -1 = unbegrenzt
  quicktasksPerDay: number              // -1 = unbegrenzt
  features: {
    webSearch: boolean
    artifactCreate: boolean
    customInstructions: boolean
    fileUpload: boolean
    fileUploadMaxMb: number
    mcpServers: boolean
  }
  rateLimits: {
    chat: { maxRequests: number; windowMs: number }
    api: { maxRequests: number; windowMs: number }
  }
  chatHistoryDays: number               // -1 = unbegrenzt
}

export const TIERS: Record<string, TierConfig> = {
  free: {
    id: "free",
    name: "Free",
    monthlyCredits: 5_000,
    allowedModelCategories: ["fast"],
    maxExperts: 0,
    quicktasksPerDay: 3,
    features: {
      webSearch: false,
      artifactCreate: false,
      customInstructions: false,
      fileUpload: true,
      fileUploadMaxMb: 5,
      mcpServers: false,
    },
    rateLimits: {
      chat: { maxRequests: 10, windowMs: 60_000 },
      api: { maxRequests: 30, windowMs: 60_000 },
    },
    chatHistoryDays: 30,
  },
  pro: { ... },
  enterprise: { ... },
}
```

### Guard-Pattern

Zentraler Gate-Check als Utility, kein verstreutes `if (tier === "pro")`:

```typescript
// src/lib/tier-guard.ts
export async function checkTierAccess(
  userId: string,
  requirement: TierRequirement
): Promise<{ allowed: boolean; reason?: string; upgradeNeeded?: boolean }> {
  const user = await getUserTier(userId)
  const config = TIERS[user.tier]

  // Feature-Check
  if (requirement.feature && !config.features[requirement.feature]) {
    return { allowed: false, reason: "Feature nicht im aktuellen Plan verfügbar", upgradeNeeded: true }
  }

  // Model-Check
  if (requirement.modelCategory && !config.allowedModelCategories.includes(requirement.modelCategory)) {
    return { allowed: false, reason: "Modell nicht im aktuellen Plan verfügbar", upgradeNeeded: true }
  }

  // Credit-Check
  if (requirement.estimatedCredits) {
    const available = user.creditsMonthly - user.creditsMonthlyUsed + user.creditsBalance
    if (available < requirement.estimatedCredits) {
      return { allowed: false, reason: "Nicht genügend Credits", upgradeNeeded: false }
    }
  }

  return { allowed: true }
}
```

### Gate-Stellen im Code

| Stelle              | Datei                                     | Was wird geprüft                             |
| ------------------- | ----------------------------------------- | -------------------------------------------- |
| Chat-Request        | `src/app/api/chat/route.ts`               | Credits verfügbar, Model erlaubt, Rate Limit |
| Model-Auswahl       | `src/config/models.ts`                    | `getModels()` filtert nach Tier              |
| Tool-Verfügbarkeit  | `src/app/api/chat/route.ts`               | web_search, web_fetch nur wenn Tier erlaubt  |
| Expert-Auswahl      | `src/components/chat/expert-selector.tsx` | Eigene Experts nur Pro+                      |
| Quicktask-Limit     | `src/app/api/chat/route.ts`               | Tages-Counter für Free                       |
| Artifact-Erstellung | `src/lib/ai/tools/create-artifact.ts`     | Create nur Pro+                              |
| File Upload         | `src/app/api/upload/route.ts`             | Size-Limit per Tier                          |
| Custom Instructions | `src/app/api/user/instructions/route.ts`  | Nur Pro+                                     |
| Chat-History        | `src/lib/db/queries/chats.ts`             | Retention per Tier                           |

---

## 4. Bestehende Infrastruktur nutzen

### usage_logs → Credit-Deduktion

Die `usage_logs`-Tabelle (`src/lib/db/schema/usage-logs.ts`) erfasst bereits alle relevanten Token-Metriken. Der Credit-Abzug kann direkt im bestehenden `onFinish`-Callback der Chat-Route stattfinden:

```
onFinish (bestehend)
  → usage_logs INSERT (bestehend)
  → Credit-Berechnung (NEU): inputTokens, outputTokens, reasoningTokens, cachedInputTokens + Modell-Multiplikator
  → credit_transactions INSERT (NEU)
  → users.creditsMonthlyUsed UPDATE (NEU)
```

Kein zusätzlicher API-Call nötig. Die Token-Daten sind bereits da.

### Feature-Flags erweitern

`src/config/features.ts` bleibt für ENV-basierte Feature-Flags (ob ein Feature auf der Instanz überhaupt existiert). Tier-Gating ist eine zweite Schicht darüber:

```
Schicht 1: features.ts — Ist das Feature auf dieser Instanz aktiviert? (ENV)
Schicht 2: tiers.ts   — Darf dieser User das Feature nutzen? (DB)
```

Beispiel: `features.search.enabled` prüft ob ein Search-Provider-Key gesetzt ist. `TIERS[user.tier].features.webSearch` prüft ob der User den Tier dafür hat. Beide müssen true sein.

### experts.allowedTools → Tier-Enforcement

Das Feld `allowedTools` in der experts-Tabelle (`src/lib/db/schema/experts.ts`) existiert bereits, wird aber nicht enforced. Dies kann für Tier-basiertes Tool-Gating genutzt werden:

1. Expert definiert `allowedTools: ["web_search", "create_artifact"]`
2. Chat-Route filtert Tools gegen Tier-Erlaubnis: `expert.allowedTools.filter(t => tierAllows(t))`
3. Free-User bekommt Expert ohne web_search, Pro-User bekommt alles

### Rate-Limits per Tier

`src/lib/rate-limit.ts` nutzt bereits `RateLimitConfig` mit `maxRequests` und `windowMs`. Die bestehende `RATE_LIMITS`-Konstante wird durch Tier-abhängige Limits ersetzt:

```typescript
// Vorher (statisch)
export const RATE_LIMITS = {
  chat: { maxRequests: 20, windowMs: 60_000 },
}

// Nachher (Tier-basiert)
export function getRateLimit(type: string, tier: string): RateLimitConfig {
  return TIERS[tier].rateLimits[type] ?? RATE_LIMITS[type]
}
```

---

## 5. UI-Konzept

### Credit-Anzeige

**Header (persistent):**

- Kompakter Credit-Counter neben dem User-Avatar
- Farb-Coding: Grün (>50%), Gelb (10–50%), Rot (<10%)
- Tooltip: "X von Y Credits verbraucht. Erneuert am DD.MM."

**Nach jedem Chat-Response:**

- Dezente Token/Credit-Info unter der Nachricht (wie jetzt schon Token-Count möglich)
- Nur auf Hover oder als Toggle in Settings

**Settings-Seite:**

- Credit-Verlauf (Tabelle oder kleines Chart)
- Verbrauch nach Modell aufgeschlüsselt
- Aktueller Abrechnungszeitraum mit Fortschrittsbalken

### Upgrade-Prompts (UX-kritisch)

Nicht aggressiv. Upgrade-Hinweise nur an drei Stellen:

1. **Credit-Limit erreicht:** Modal mit "Credits aufgebraucht. Nächste Erneuerung am DD.MM. oder jetzt upgraden."
2. **Feature gesperrt:** Inline-Hinweis an der gesperrten UI-Stelle. Z.B. bei Model-Selector ein Lock-Icon mit Tooltip "Verfügbar im Pro-Plan".
3. **Settings/Billing:** Eigener Tab mit Plan-Vergleich und Upgrade-Button.

Kein Banner, kein Popup bei Login, keine Unterbrechung des Workflows.

### Billing-Seite

Neue Route: `/settings/billing` (oder Tab in bestehendem Settings-Dialog)

- Aktueller Plan mit Features
- Credit-Übersicht (monatlich + Add-on)
- Verbrauchshistorie
- Plan wechseln / kündigen
- Zahlungsmethode verwalten (via Stripe Customer Portal)
- Rechnungen (via Stripe)

---

## 6. Technische Umsetzung

### Neue Dateien

| Datei                                        | Beschreibung                                      |
| -------------------------------------------- | ------------------------------------------------- |
| `src/config/tiers.ts`                        | TierConfig Interface + TIERS Konstante            |
| `src/lib/db/schema/credit-transactions.ts`   | credit_transactions Schema                        |
| `src/lib/tier-guard.ts`                      | checkTierAccess(), getUserTier(), tierAllows()    |
| `src/lib/credits.ts`                         | calculateCredits(), deductCredits(), getBalance() |
| `src/app/api/billing/route.ts`               | Stripe Checkout Session erstellen                 |
| `src/app/api/billing/webhook/route.ts`       | Stripe Webhook Handler                            |
| `src/app/api/billing/portal/route.ts`        | Stripe Customer Portal Link                       |
| `src/app/api/credits/route.ts`               | GET Balance + History                             |
| `src/components/layout/credit-indicator.tsx` | Header Credit-Counter                             |
| `src/components/billing/`                    | Billing UI Komponenten                            |

### Bestehende Dateien (Änderungen)

| Datei                                     | Änderung                                                |
| ----------------------------------------- | ------------------------------------------------------- |
| `src/lib/db/schema/users.ts`              | Tier + Credit-Felder                                    |
| `src/lib/db/schema/index.ts`              | credit_transactions Export                              |
| `src/app/api/chat/route.ts`               | Tier-Check vor streamText, Credit-Deduktion in onFinish |
| `src/config/models.ts`                    | getModels() filtert nach Tier                           |
| `src/config/features.ts`                  | Bleibt unverändert (ENV-Schicht)                        |
| `src/lib/rate-limit.ts`                   | getRateLimit() mit Tier-Parameter                       |
| `src/components/layout/chat-header.tsx`   | Credit-Indicator einbinden                              |
| `src/components/chat/expert-selector.tsx` | Lock-Icons für Tier-gesperrte Experts                   |

### Payment-Integration

**Empfehlung: Stripe** (nicht LemonSqueezy). Gründe:

- Bessere API, bessere Docs, mehr Flexibilität
- Customer Portal (Rechnungen, Kündigung) out-of-the-box
- Metered Billing für Credit-Pakete möglich
- EU-SCA-konform

**Webhook-Flow:**

```
User klickt "Upgrade" → POST /api/billing → Stripe Checkout Session
  → User zahlt bei Stripe
  → Stripe sendet Webhook → POST /api/billing/webhook
    → checkout.session.completed:
        users.tier = "pro"
        users.stripeCustomerId = session.customer
        users.stripeSubscriptionId = session.subscription
        users.creditsMonthly = TIERS.pro.monthlyCredits
        users.creditsMonthlyUsed = 0
        users.creditsCycleStart = now
    → invoice.paid (monatlich):
        users.creditsMonthlyUsed = 0
        users.creditsCycleStart = now
        credit_transactions INSERT (type: "monthly_grant")
    → customer.subscription.deleted:
        users.tier = "free"
        users.creditsMonthly = TIERS.free.monthlyCredits
```

### Cron-Job: Monatliches Reset

Für das monatliche Credit-Reset gibt es zwei Optionen:

**Option A: Stripe-Webhook-gesteuert (empfohlen)**

- `invoice.paid` Event setzt `creditsMonthlyUsed = 0`
- Automatisch mit Billing-Zyklus synchron
- Kein eigener Cron nötig

**Option B: Eigener Cron (für Free-Tier)**

- Free-User haben keinen Stripe-Subscription-Zyklus
- Täglicher Cron prüft `creditsCycleStart + 30 Tage < now`
- Vercel Cron Job oder externe Lösung (z.B. Pipedream)

### Migrations-Reihenfolge

1. DB-Schema erweitern (users + credit_transactions)
2. `src/config/tiers.ts` + `src/lib/tier-guard.ts` + `src/lib/credits.ts`
3. Chat-Route: Tier-Check + Credit-Deduktion einbauen
4. Model-Gating (getModels mit Tier-Filter)
5. UI: Credit-Indicator, Upgrade-Prompts
6. Stripe-Integration (Checkout, Webhook, Portal)
7. Billing-UI
8. Free-Tier Cron

---

## 7. Offene Fragen

### 1. Free-Tier Großzügigkeit

**Frage:** 5.000 Credits/Monat — zu viel oder zu wenig?

**Empfehlung:** Starte mit 5.000. Das sind ca. 10–15 Gespräche mit fast-Modellen. Genug zum Testen, zu wenig für tägliche Nutzung. Kann jederzeit angepasst werden.

### 2. Artifact-Gating

**Frage:** Sollen Free-User Artifacts gar nicht sehen, nur lesen, oder auch erstellen?

**Empfehlung:** Free-User können Artifacts **sehen** (read-only), aber nicht erstellen. Das zeigt den Wert und motiviert zum Upgrade.

### 3. Credit-Verfall

**Frage:** Verfallen ungenutzte monatliche Credits?

**Empfehlung:** Ja, monatliche Credits verfallen. Add-on Credits nicht. Standard in der Branche, verhindert Akkumulation.

### 4. Enterprise Scope

**Frage:** Wann und wie Enterprise bauen?

**Empfehlung:** Enterprise erst wenn es Nachfrage gibt. Aktuell reicht ein "Kontakt aufnehmen"-Button. Team-Features (shared Experts, gemeinsame Credits) sind ein eigenes Projekt.

### 5. Credit-Transparenz

**Frage:** Wie viel Credit-Detail zeigen?

**Empfehlung:** Einfach halten. "X Credits verbraucht" pro Nachricht. Detail-Aufschlüsselung (Input/Output/Reasoning) nur in Settings > Verbrauch. User wollen keine Token-Mathematik im Chat.

### 6. Modell-Gating Granularität

**Frage:** Nach Kategorie oder nach einzelnem Modell gaten?

**Empfehlung:** Nach Kategorie. Das ist konsistent mit der bestehenden Model-Registry und einfacher zu kommunizieren. "Fast-Modelle im Free-Plan, alle Modelle im Pro-Plan."

### 7. Payment-Provider

**Frage:** Stripe oder LemonSqueezy?

**Empfehlung:** Stripe. LemonSqueezy ist einfacher für reines SaaS, aber Stripe ist flexibler für Credit-Pakete, Metered Billing und Custom Flows. Der Mehraufwand ist überschaubar.

### 8. Multi-Instanz Kompatibilität

**Frage:** Wie verhält sich Monetarisierung bei White-Label-Instanzen?

**Empfehlung:** Monetarisierung ist opt-in via ENV (`STRIPE_SECRET_KEY`). Ohne Stripe-Keys ist alles unbegrenzt (wie jetzt). TierConfig kann per Instanz überschrieben werden. So können Kunden-Instanzen ohne Billing laufen.

### 9. Downgrade-Handling

**Frage:** Was passiert bei Downgrade Pro → Free?

**Empfehlung:** Bestehende Chats bleiben erhalten (auch >30 Tage), aber es werden keine neuen geladen. Eigene Experts werden deaktiviert (nicht gelöscht). Custom Instructions bleiben gespeichert, werden aber nicht angewendet. Sanfter Übergang, kein Datenverlust.

### 10. Credit-Estimation

**Frage:** Soll vor dem Absenden eine Credit-Schätzung angezeigt werden?

**Empfehlung:** Nein. Die Schätzung wäre zu ungenau (hängt von Response-Länge und Tool-Calls ab). Stattdessen: Credit-Verbrauch nach der Antwort anzeigen. Warnung nur wenn Balance unter 10% ist.
