# Datenschutz-Uebersicht

> Verarbeitungsverzeichnis-artige Dokumentation fuer die KI-Chat-Plattform build-jetzt.
> Rechtsgrundlage, Datenkategorien, Zwecke, Speicherfristen und Auftragsverarbeiter.
> Stand: 2026-03-30

---

## 1. Verantwortlicher

| Feld | Wert |
|------|------|
| Name | [Betreiber der Instanz eintragen] |
| Adresse | [Adresse eintragen] |
| Kontakt | [E-Mail eintragen] |
| Datenschutzbeauftragter | [Falls bestellt, eintragen] |

**Hinweis:** Diese Plattform ist Multi-Instanz-faehig. Jeder Betreiber einer Instanz ist eigenstaendiger Verantwortlicher und muss dieses Dokument fuer seine Instanz anpassen.

---

## 2. Verarbeitungstaetigkeiten

### 2.1 Benutzerkonten und Authentifizierung

| Aspekt | Details |
|--------|---------|
| **Zweck** | Benutzerverwaltung, Zugriffskontrolle, Rollensteuerung |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b DSGVO (Vertragserfuellung) |
| **Datenkategorien** | E-Mail, Name, Avatar-URL, Rolle, Status, Freischaltungszeitpunkt |
| **Speicherort** | `users` Tabelle (Neon Postgres) |
| **Speicherfrist** | Bis zur Kontolöschung durch User oder Admin |
| **Empfaenger** | Logto (Auth-Provider), Neon (DB-Hosting) |

### 2.2 Chat-Kommunikation

| Aspekt | Details |
|--------|---------|
| **Zweck** | KI-gestuetzte Textgenerierung, Beratung, Content-Erstellung |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b DSGVO (Vertragserfuellung) |
| **Datenkategorien** | Chat-Titel, Nachrichten-Inhalte (Text, Bilder, Dateien), Rolle (User/Assistent) |
| **Speicherort** | `chats` + `messages` Tabellen (Neon Postgres) |
| **Speicherfrist** | Konfigurierbar via `CHAT_RETENTION_DAYS` (Default: 90 Tage fuer nicht-angepinnte Chats) |
| **Empfaenger** | AI-Provider (transient, fuer Inference), Neon (DB-Hosting) |

**Besonderheit:** Chat-Inhalte werden an den konfigurierten AI-Provider zur Verarbeitung gesendet. Die Inhalte werden dort nicht dauerhaft gespeichert (transiente Verarbeitung). Bei Nutzung des EU- oder Local-Profils verlassen die Daten den konfigurierten Rechtsraum nicht.

### 2.3 Generierte Inhalte (Artifacts)

| Aspekt | Details |
|--------|---------|
| **Zweck** | Persistierung generierter Inhalte (Code, HTML, Dokumente) |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b DSGVO (Vertragserfuellung) |
| **Datenkategorien** | Artifact-Typ, Titel, Inhalt, Sprache, Datei-URL, Versionshistorie |
| **Speicherort** | `artifacts` Tabelle (Neon), Dateien in R2/S3 |
| **Speicherfrist** | An Chat-Lebenszyklus gekoppelt (Cascade Delete) |
| **Empfaenger** | Neon (DB), Cloudflare R2 / S3-Provider (Storage) |

### 2.4 Projekte und Dokumente

| Aspekt | Details |
|--------|---------|
| **Zweck** | Projekt-Kontext fuer zielgerichtetere KI-Antworten |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b DSGVO (Vertragserfuellung) |
| **Datenkategorien** | Projektname, Beschreibung, Instruktionen, Dokument-Inhalte, Mitgliedschaften |
| **Speicherort** | `projects`, `project_documents`, `project_members` Tabellen |
| **Speicherfrist** | Bis zur Loeschung durch User |
| **Empfaenger** | Neon (DB-Hosting) |

### 2.5 Nutzungserfassung und Credits

| Aspekt | Details |
|--------|---------|
| **Zweck** | Abrechnung, Verbrauchstransparenz, Kostensteuerung |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b DSGVO (Vertragserfuellung) |
| **Datenkategorien** | Token-Verbrauch (Input/Output/Cached/Reasoning), Modell-ID, Zeitstempel, Credit-Transaktionen |
| **Speicherort** | `usage_logs` + `credit_transactions` Tabellen |
| **Speicherfrist** | Unbegrenzt (Abrechnungsrelevanz). Empfehlung: Archivierung nach 12 Monaten |
| **Empfaenger** | Neon (DB-Hosting) |

**Hinweis:** Usage-Logs enthalten keine Nachrichteninhalte, nur Metadaten (Token-Zaehler, Modell, Zeitpunkt).

### 2.6 PII-Erkennung und Consent (Business Mode)

| Aspekt | Details |
|--------|---------|
| **Zweck** | Erkennung personenbezogener Daten in Eingaben, Einwilligungsdokumentation, Datenschutz-Routing |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. f DSGVO (Berechtigtes Interesse: Datenschutz-Compliance) |
| **Datenkategorien** | Consent-Typ, Entscheidung, erkannte PII-Typen, geroutetes Modell, Nachrichten-Vorschau (100 Zeichen) |
| **Speicherort** | `consent_logs` Tabelle |
| **Speicherfrist** | 3 Jahre (Nachweis der Einwilligungen) |
| **Empfaenger** | Neon (DB-Hosting) |

**Hinweis:** Die PII-Erkennung laeuft lokal (Regex), es werden keine Daten an externe Dienste gesendet.

### 2.7 Memory-System

| Aspekt | Details |
|--------|---------|
| **Zweck** | Kontextuelle Erinnerungen fuer personalisierte KI-Antworten |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. a DSGVO (Einwilligung — User aktiviert Memory explizit) |
| **Datenkategorien** | Extrahierte Fakten/Praeferenzen als Vektor-Embeddings |
| **Speicherort** | Mem0 (Cloud oder Self-Hosted) |
| **Speicherfrist** | Bis zur Loeschung durch User (`deleteAllMemories`) |
| **Empfaenger** | Mem0-Service (Cloud oder Self-Hosted) |

**Datensouveraenitaet:** Bei Self-Hosted Mem0 verlassen die Daten die eigene Infrastruktur nicht.

### 2.8 Chat-Sharing

| Aspekt | Details |
|--------|---------|
| **Zweck** | Teilen von Chats mit anderen Usern oder oeffentlich |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. a DSGVO (Einwilligung — User teilt aktiv) |
| **Datenkategorien** | Share-Token, Chat-Referenz, Empfaenger-User-ID |
| **Speicherort** | `shared_chats` + `chat_shares` Tabellen |
| **Speicherfrist** | Bis zum Widerruf durch User |
| **Empfaenger** | Oeffentlich zugaenglich (bei Public Share) |

**Hinweis:** Oeffentliche Shares machen den gesamten Chat-Verlauf ohne Authentifizierung lesbar. User muessen dies aktiv ausloesen und koennen es jederzeit widerrufen.

---

## 3. Datenkategorien-Matrix

| Datenkategorie | Tabelle(n) | Personenbezug | Sensibilitaet |
|----------------|-----------|---------------|---------------|
| Identitaet (E-Mail, Name) | `users` | Direkt | Mittel |
| Auth-Credentials | Extern (Logto) | Direkt | Hoch |
| Chat-Inhalte | `messages` | Indirekt (userabhaengig) | Variabel |
| Dokument-Inhalte | `project_documents` | Indirekt (userabhaengig) | Variabel |
| Generierte Artifacts | `artifacts` | Gering | Niedrig |
| Nutzungsverhalten | `usage_logs` | Indirekt (via userId) | Niedrig |
| Finanzdaten (Credits) | `credit_transactions`, `users` | Indirekt | Mittel |
| PII-Findings | `consent_logs` | Direkt (erkannte PII) | Hoch |
| Memories | Extern (Mem0) | Indirekt | Mittel |
| Share-Tokens | `shared_chats` | Gering | Niedrig |

---

## 4. Empfaenger und Auftragsverarbeiter

### 4.1 Auftragsverarbeiter (Art. 28 DSGVO)

| Dienstleister | Zweck | Datenarten | Region | AVV-Status |
|---------------|-------|------------|--------|------------|
| **Neon Inc.** | Datenbank-Hosting | Alle DB-Daten | US/EU (waehlbar) | [ ] Abzuschliessen |
| **Vercel Inc.** | App-Hosting | Request/Response-Daten | Global | [ ] Abzuschliessen |
| **Logto** | Authentifizierung | Credentials, Sessions | Abhaengig vom Setup | [ ] Abzuschliessen |
| **Mem0** (optional) | Memory-Service | User-Memories | Cloud/Self-Hosted | [ ] Abzuschliessen |
| **Cloudflare** (optional) | Object Storage (R2) | Datei-Uploads | Global | [ ] Abzuschliessen |
| **Firecrawl** (optional) | Web Search/Scrape | Suchanfragen | US | [ ] Abzuschliessen |

### 4.2 AI-Provider (Datenverarbeitung im Auftrag)

| Provider | Typ | Datentransfer | Speicherung |
|----------|-----|---------------|-------------|
| Vercel AI Gateway | Proxy | US (Vercel Edge) | Transient (kein Logging) |
| Anthropic | LLM | US | Transient (API Terms) |
| Google (Gemini) | LLM + Bild + TTS + Search | US | Transient |
| Mistral | LLM (EU-Routing) | EU (Frankreich) | Transient |
| IONOS | LLM (EU-Alternative) | EU (Deutschland) | Transient |
| Ollama (Self-Hosted) | LLM (Local) | Lokal | Kein externer Transfer |

**Hinweis:** "Transient" bedeutet, dass Daten nur waehrend der Inference verarbeitet und nicht dauerhaft gespeichert werden. Dies basiert auf den API-Nutzungsbedingungen der jeweiligen Provider. Bei Business-Nutzung sollten die aktuellen Data Processing Agreements der Provider geprueft werden.

---

## 5. Drittlandtransfers (Art. 44-49 DSGVO)

| Dienstleister | Drittland | Garantie |
|---------------|-----------|----------|
| Neon | US (oder EU) | EU-Standardvertragsklauseln (SCCs) / EU-Region waehlbar |
| Vercel | US | EU-Standardvertragsklauseln (SCCs) |
| Anthropic | US | EU-Standardvertragsklauseln (SCCs) |
| Google | US | EU-Standardvertragsklauseln (SCCs) |

**EU/Local-Profile:** Bei Nutzung des EU- oder Local-Deployment-Profils koennen Drittlandtransfers vollstaendig vermieden werden (Neon EU-Region + EU-Provider + Self-Hosted Memory).

---

## 6. Betroffenenrechte (Art. 15-22 DSGVO)

| Recht | Technische Umsetzung |
|-------|---------------------|
| **Auskunft** (Art. 15) | Admin kann User-Daten exportieren; User sieht eigene Chats, Artifacts, Credits |
| **Berichtigung** (Art. 16) | User kann Profildaten (Name, Custom Instructions) aendern |
| **Loeschung** (Art. 17) | Chat-Loeschung durch User, Memory-Loeschung (`deleteAllMemories`), Konto-Loeschung durch Admin |
| **Einschraenkung** (Art. 18) | Admin kann User-Status auf `rejected` setzen (Zugang gesperrt, Daten erhalten) |
| **Datenportabilitaet** (Art. 20) | Chat-Export moeglich (Share-Funktion); vollstaendiger Datenexport als Admin-Feature empfohlen |
| **Widerspruch** (Art. 21) | Memory kann deaktiviert werden; Business Mode Consent kann abgelehnt werden |
| **Widerruf Einwilligung** | Memory-Deaktivierung + Loeschung; Share-Widerruf jederzeit |

---

## 7. Datenschutz-Folgenabschaetzung (DPIA)

Eine DPIA nach Art. 35 DSGVO wird empfohlen wenn:

- Die Plattform fuer Business-Kunden mit sensiblen Daten eingesetzt wird
- Systematische Verarbeitung besonderer Datenkategorien stattfindet
- Umfangreiche Profiling-aehnliche Verarbeitung (Memory-System) aktiv ist

Die bestehenden technischen Massnahmen (PII-Detection, Privacy-Routing, EU/Local-Profile) adressieren bereits zentrale DPIA-Risiken.

---

## 8. Aktualisierung

Dieses Dokument wird aktualisiert bei:
- Neuen Verarbeitungstaetigkeiten oder Datenkategorien
- Wechsel oder Hinzufuegen von Auftragsverarbeitern
- Aenderungen an Speicherfristen oder Loeschkonzepten
- Wesentlichen technischen Architektur-Aenderungen

Letzte Aktualisierung: 2026-03-30
