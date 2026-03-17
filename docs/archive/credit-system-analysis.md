# Credit System — Analyse & Pricing

> Stand: 2026-03-16. Basiert auf realen Testdaten mit 7 Modellen.

---

## Formel

```
creditCost = max(1, ceil(
  (inputTokens × inputPrice/1M
   + outputTokens × outputPrice/1M
   + reasoningTokens × outputPrice/1M
   - cachedInputTokens × inputPrice/1M × 0.9)
  × CREDITS_PER_DOLLAR
))
```

- `CREDITS_PER_DOLLAR` = 100.000 (konfigurierbar via ENV)
- 100.000 Credits = $1 API-Kosten
- Minimum: 1 Credit pro Request

## Was bepreist wird

| Token-Typ | Quelle | Bepreisung |
|-----------|--------|------------|
| inputTokens | Prompt + System-Prompt + Chat-History + Tool-Results | inputPrice/1M |
| outputTokens | Antwort + Tool-Calls | outputPrice/1M |
| reasoningTokens | Extended Thinking (o1, Claude Thinking) | outputPrice/1M |
| cachedInputTokens | Prompt-Caching Hits (Anthropic) | 90% Rabatt auf inputPrice |

## Was NICHT bepreist wird (in Marge einkalkuliert)

- Title-Generierung (~30 Tokens, separater generateText Call)
- Mem0 Memory Search/Extract (fixer Monatspreis)
- Firecrawl Web Search/Fetch (eigenes Credit-Budget)
- MCP Server Calls (self-hosted oder eigene Kontingente)

---

## Model-Preise (Stand 2026-03)

| Modell | Input/1M | Output/1M | Kategorie |
|--------|----------|-----------|-----------|
| Gemini Flash | $0.15 | $0.60 | Fast |
| Haiku | $0.80 | $4.00 | Fast |
| GPT 5 Instant | $0.40 | $1.60 | Fast |
| Gemini Pro | $1.25 | $10.00 | Allrounder |
| Mistral Large | $2.00 | $6.00 | Allrounder |
| Sonnet | $3.00 | $15.00 | Allrounder |
| Opus | $15.00 | $75.00 | Enterprise |

Preise in `models`-Tabelle via `seed-model-prices.ts`. Ohne Preise greifen Fallbacks ($1/$5 per 1M).

---

## Testdaten

### Phase 1: Ohne Model-Preise (Fallback $1/$5)

Alle Modelle lieferten fast identische Credit-Kosten, weil der Fallback keine Preisdifferenzierung hat.

| Modell | Text-only | Tool-Calls | Steps |
|--------|-----------|------------|-------|
| Gemini Flash | 920 | 3.000 | 3 |
| Haiku | 568 | 3.318 | 3 |
| Sonnet | 571 | 1.937 | 2 |
| Mistral Large | 506 | 2.048 | 2 |
| Opus | 600 | 2.400 | 2 |

**Problem:** Opus kostete fast gleich viel wie Gemini Flash. Keine brauchbare Grundlage fuer Pricing.

### Phase 2: Mit echten Model-Preisen

| Modell | Text-only | Tool-Calls | Faktor Text vs. Tool |
|--------|-----------|------------|---------------------|
| Gemini Flash | ~100-200 | ~3.000 | ~20x |
| Opus | ~9.500 | ~30.000 | ~3x |

**Spreizung Opus vs. Flash: ~47x** — entspricht der echten Preisdifferenz.

### Rohdaten (Usage Logs)

```
Opus Text-only:    in: 3.448  out: 573   → 9.470 Credits
Opus Tool-Call:    in: 18.908 out: 920   → ~30.000 Credits (3 Steps)
Flash Text-only:   in: 1.865  out: 762   → 102 Credits
Flash Tool-Call:   in: 17.432 out: 1.507 → 2.987 Credits (4 Steps)
Sonnet Text-only:  in: 3.450  out: 458   → 574 Credits
Sonnet Tool-Call:  in: 20.017 out: 992   → 1.937 Credits (3 Steps, 6.230 cached)
```

---

## Kostentreiber

### 1. Model-Preis (groesster Hebel)

Der Preisunterschied zwischen Modellen ist der dominante Faktor:

| Vergleich | Faktor |
|-----------|--------|
| Gemini Flash vs. Sonnet | ~20x |
| Gemini Flash vs. Opus | ~47x |
| Haiku vs. Opus | ~18x |

### 2. Tool-Calls (Step-Multiplikator)

Jeder Tool-Call ist ein zusaetzlicher Step. Pro Step wird der **komplette Kontext** (System-Prompt + History + bisherige Tool-Results) nochmal als Input gesendet.

- 1 Step (Text-only): ~3.500 Input-Tokens
- 3 Steps (2 Tool-Calls): ~18.000 Input-Tokens (5x mehr)
- Input dominiert die Kosten bei Tool-Calls

### 3. Chat-Laenge (kumulativer Input)

Bei jedem Turn wird die komplette Chat-History als Input mitgeschickt. Das waechst linear:

| Nachricht Nr. | Input (geschaetzt) | Opus Credits |
|---------------|-------------------|-------------|
| 1 | ~3.500 | ~9.500 |
| 5 | ~15.000 | ~25.000 |
| 10 | ~35.000 | ~55.000 |
| 20 | ~80.000 | ~125.000 |

**Aktuell kein Message-Limit implementiert.** Lange Chats senden die komplette History.

### 4. Prompt Caching (Kostenreduktion)

Anthropic-Models erhalten `cacheControl` auf dem System-Prompt. Bei aufeinanderfolgenden Requests mit gleichem System-Prompt werden gecachte Tokens 90% guenstiger berechnet. Sichtbar in Usage Logs als `cachedInputTokens`.

Beispiel: Sonnet mit 6.230 cached von 20.017 Input → spart ~30% der Input-Kosten.

Caching greift NICHT bei: anderem Expert, anderem Chat, abgelaufenem Cache (~5 Min TTL).

---

## Nutzungsprofile (geschaetzt)

| Profil | Chats/Tag | Model-Mix | Credits/Tag | Credits/Monat |
|--------|-----------|-----------|-------------|---------------|
| Gelegenheit | 5-10 | Flash/Haiku | 1.000-5.000 | 30.000-150.000 |
| Normal | 20-30 | Sonnet + Flash | 20.000-50.000 | 600.000-1.500.000 |
| Power | 40-60 | Sonnet + Opus + Tools | 100.000-300.000 | 3.000.000-9.000.000 |

---

## Fixkosten pro User/Monat (Infrastruktur)

| Posten | Geschaetzt |
|--------|-----------|
| Neon (DB) | ~$0.50 |
| Vercel (Hosting) | ~$1.00 |
| Mem0 (Memory) | ~$2-5 |
| Firecrawl (Web) | ~$1-2 |
| **Summe** | **~$5-8** |

Diese Kosten sind NICHT in den Credits abgebildet, sondern muessen ueber die Marge im Paketpreis gedeckt werden.

---

## Paket-Vorschlag

### Einfach starten: Ein Paket

| Paket | Credits | API-Kosten | + Fixkosten | Verkaufspreis | Marge |
|-------|---------|-----------|-------------|---------------|-------|
| Standard | 2.000.000 | $20 | +$7 | **39€** | ~45% |

### Spaeter: Drei Pakete

| Paket | Credits | Verkaufspreis | Reicht fuer (Sonnet) |
|-------|---------|---------------|---------------------|
| Starter | 500.000 | 15€ | ~250 Chats |
| Standard | 2.000.000 | 39€ | ~1.000 Chats |
| Power | 5.000.000 | 89€ | ~2.500 Chats |

"Chats" = einzelne Nachrichten in neuen Chats. Laengere Dialoge und Tool-Calls verbrauchen mehr.

### Preisanker fuer Kommunikation

- "Ab 0,01 Cent pro Nachricht" (Gemini Flash, einfache Frage)
- "Durchschnittlich 2-3 Cent pro Nachricht" (Sonnet, normaler Chat)
- Premium-Modelle wie Opus kosten mehr, aber liefern bessere Qualitaet

---

## Offene Punkte / Spaetere Optimierungen

### Message-Window
Aktuell kein Limit. Optionen:
- Letzte N Nachrichten senden (z.B. 20), aeltere abschneiden
- Aeltere Nachrichten durch KI-Zusammenfassung ersetzen
- Ab X Nachrichten automatisch auf guenstigeres Modell wechseln

### CREDITS_PER_DOLLAR Kalibrierung
Aktuell 100.000. Nach 2-4 Wochen realer Nutzung mit zahlenden Usern pruefen:
- Sind die Pakete zu schnell aufgebraucht? → Wert erhoehen
- Haben User am Monatsende viel uebrig? → Wert senken oder Paketpreis anpassen

### Analyse-Tools
- `src/lib/db/seed/query-usage.ts` — Schnelle Usage-Analyse
- `src/lib/db/seed/seed-model-prices.ts` — Model-Preise aktualisieren
- Drizzle Studio (`pnpm db:studio`) — Direkte DB-Inspektion

### Stripe-Integration (nicht in MVP)
- Checkout + Webhook fuer Paket-Kauf
- Automatische Credit-Aufladung nach Zahlung
- Billing Portal fuer Rechnungen
