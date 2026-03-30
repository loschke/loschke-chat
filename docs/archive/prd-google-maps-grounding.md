# PRD: Google Maps Grounding

**Status:** Draft
**Prioritaet:** Niedrig (Nice-to-have)
**Bereich:** Google Search Grounding / AI-Response-Pipeline

---

## 1. Kontext

Die Gemini API bietet seit Maerz 2026 neben Google Search auch **Google Maps als Grounding-Quelle** an. Damit kann Gemini Antworten mit verifizierten Standortdaten anreichern: Places, Bewertungen, Oeffnungszeiten, Routing, Kontaktdaten.

Unsere Plattform nutzt bereits Google Search Grounding (`google_search` Tool via `google-search-grounding.ts`). Maps Grounding folgt dem gleichen Pattern und kann als zweite Grounding-Quelle neben Search registriert werden.

**API-Docs:** https://ai.google.dev/gemini-api/docs/maps-grounding

---

## 2. Entscheidung: Variante B — Integriert in Search

Maps wird **nicht** als eigenes Tool gebaut, sondern als zweite Grounding-Quelle im bestehenden `google_search`-Tool registriert. Gemini entscheidet autonom, ob Maps-Daten fuer eine Anfrage relevant sind.

### Begruendung

- **Kein neues UI-Element** — Ergebnisse fliessen in die bestehende Search-Grounding-Anzeige ein
- **Kein eigenes Feature-Flag** — nutzt den vorhandenen `GOOGLE_GENERATIVE_AI_API_KEY`
- **Minimaler Aufwand** — ~2-3h, weil das Pattern 1:1 wiederverwendbar ist
- **Autointelligent** — Gemini entscheidet selbst, wann Maps-Daten Mehrwert liefern

### Alternativen (verworfen)

| Variante                      | Warum verworfen                                            |
| ----------------------------- | ---------------------------------------------------------- |
| A: Eigenes `maps_search` Tool | Overengineering fuer den tatsaechlichen Bedarf             |
| C: Expert-spezifisch          | Unnoetige Komplexitaet, Gemini kann das selbst entscheiden |
| D: Nicht bauen                | Feature ist zu einfach integrierbar um es zu ignorieren    |

---

## 3. Business Cases

Der User fragt nie explizit "suche auf Maps". Er stellt eine normale Frage, und Gemini reichert die Antwort automatisch mit Standortdaten an.

### 3.1 Wettbewerbs- und Marktrecherche

| User-Prompt                                                     | Was Maps liefert                                     |
| --------------------------------------------------------------- | ---------------------------------------------------- |
| "Welche Agenturen fuer Employer Branding gibt es in Hamburg?"   | Verifizierte Firmennamen, Adressen, Bewertungsscores |
| "Erstelle eine Wettbewerbsanalyse fuer Yoga-Studios in Dresden" | Reale Studios mit Bewertungen und Standorten         |
| "Vergleiche die Beratungslandschaft in Muenchen vs. Berlin"     | Standortbasierte Marktdichte mit echten Daten        |

**Mehrwert gegenueber reinem Search:** Search liefert SEO-optimierte Listicles. Maps liefert verifizierte Fakten (existiert, Bewertung, Oeffnungszeiten).

### 3.2 Standortentscheidungen

| User-Prompt                                                             | Was Maps liefert                                     |
| ----------------------------------------------------------------------- | ---------------------------------------------------- |
| "Bewerte die Adresse Friedrichstrasse 123 Berlin als Workshop-Location" | Umgebungsanalyse: Hotels, OEPNV, Gastronomie         |
| "Wir planen ein Team-Offsite in der Saechsischen Schweiz fuer 15 Leute" | Reale Locations mit Kapazitaet, Bewertungen, Anfahrt |
| "Was spricht fuer Leipzig Suedvorstadt vs. Zentrum als Buerostandort?"  | Infrastrukturvergleich mit echten POI-Daten          |

### 3.3 Content-Erstellung mit Lokalbezug

| User-Prompt                                               | Was Maps liefert                                            |
| --------------------------------------------------------- | ----------------------------------------------------------- |
| "Schreib einen Blogpost ueber die Tech-Szene in Dresden"  | Reale Orte: Coworking Spaces, Meetup-Locations, Tech-Firmen |
| "Erstelle eine Uebersicht der AI-Hotspots in Deutschland" | Echte Cluster-Daten statt halluzinierte Allgemeinplaetze    |

**Mehrwert:** Content wird faktisch korrekt, weil echte Places referenziert werden.

### 3.4 Kunden- und Vertriebsvorbereitung

| User-Prompt                                                                     | Was Maps liefert                                              |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| "Ich besuche morgen Kunde X in der Hafencity Hamburg. Briefing."                | Standort-Kontext: Umgebung, Parken, Optionen fuer Kundenessen |
| "Plane meine Kundenbesuche in Frankfurt: 3 Termine an verschiedenen Standorten" | Routenoptimierung basierend auf echten Fahrzeiten             |

### 3.5 Branchen-Recherche

| User-Prompt                                                    | Was Maps liefert                                         |
| -------------------------------------------------------------- | -------------------------------------------------------- |
| "Wie dicht ist die Physiotherapie-Versorgung in Berlin-Mitte?" | Reale Praxen-Dichte, Bewertungen als Qualitaetsindikator |
| "Wo sind die groessten Logistik-Hubs in Sachsen?"              | Verifizierte Standorte statt Allgemeinwissen             |

---

## 4. Technische Umsetzung

### 4.1 Grounding-Erweiterung

**Datei:** `src/lib/ai/google-search-grounding.ts`

Maps als zweites Tool im `generateText`-Call registrieren:

```typescript
// Vorher:
tools: { google_search: google.tools.googleSearch({}) }

// Nachher:
tools: {
  google_search: google.tools.googleSearch({}),
  google_maps: google.tools.googleMaps({})
}
```

### 4.2 GroundingResult erweitern

```typescript
export interface GroundingPlace {
  placeId: string
  name: string
  uri: string        // Google Maps Link
}

export interface GroundingResult {
  answer: string
  sources: GroundingSource[]        // Web-Quellen (bestehend)
  places: GroundingPlace[]          // NEU: Maps-Quellen
  searchQueries: string[]
}
```

Maps-Chunks aus `groundingMetadata.groundingChunks` extrahieren — analog zu Web-Chunks, aber mit `maps`-Property statt `web`.

### 4.3 Tool-Output erweitern

**Datei:** `src/lib/ai/tools/google-search.ts`

`places` Array zum Return-Objekt hinzufuegen:

```typescript
return {
  query,
  answer: result.answer,
  sources: result.sources,
  places: result.places,          // NEU
  searchQueries: result.searchQueries,
}
```

### 4.4 UI: Places-Links in Search-Grounding-Komponente

**Datei:** `src/components/generative-ui/search-grounding-results.tsx`

Wenn `places` vorhanden: Unter den Web-Quellen eine "Orte"-Sektion mit klickbaren Google Maps Links anzeigen. Kein Karten-Widget, nur Text-Links mit Place-Name.

---

## 5. Scope-Grenzen (Out of Scope)

- **Kein Karten-Widget** — Keine eingebettete Google Maps Karte in der UI
- **Keine Echtzeit-Navigation** — Kein Routing oder Verkehrsdaten
- **Kein eigenes Tool** — Keine `maps_search` Funktion im Tool-System
- **Kein Feature-Flag** — Aktiviert wenn Google Search aktiv ist
- **Kein `latLng`-Kontext** — Kein User-Standort-Tracking (Privacy, kein Mehrwert im B2B-Kontext)
- **Keine `enableWidget`-Option** — Kein Places-Widget-Token (wuerde Google Maps Embed erfordern)

---

## 6. Akzeptanzkriterien

| ID   | Kriterium                                             | Testfall                                              |
| ---- | ----------------------------------------------------- | ----------------------------------------------------- |
| AC-1 | Maps-Tool ist im Grounding-Call registriert           | Code-Review: `googleMaps` in tools config             |
| AC-2 | Standortbezogene Fragen liefern Places-Daten          | "Coworking Spaces in Dresden" → Places im Output      |
| AC-3 | Places werden in der UI als klickbare Links angezeigt | Orte-Sektion unter den Web-Quellen sichtbar           |
| AC-4 | Nicht-standortbezogene Fragen bleiben unveraendert    | "Was ist TypeScript?" → Keine Places, nur Web-Quellen |
| AC-5 | Credits werden korrekt abgerechnet                    | Gleiche Credits wie Google Search (kein Aufschlag)    |
| AC-6 | Keine Regression bei bestehendem Google Search        | Alle bestehenden Search-Tests bestehen weiterhin      |

---

## 7. Offene Fragen

| #    | Frage                                                                                                                 | Owner       |
| ---- | --------------------------------------------------------------------------------------------------------------------- | ----------- |
| OQ-1 | Unterstuetzt `@ai-sdk/google` bereits `google.tools.googleMaps()`? API-Docs pruefen vor Implementation.               | Engineering |
| OQ-2 | Wie sehen die `groundingChunks` fuer Maps aus — gleiche Struktur wie Web oder eigenes Format?                         | Engineering |
| OQ-3 | Soll das Tool umbenannt werden von `google_search` zu `google_grounded_search` um die erweiterte Funktion abzubilden? | Product     |
