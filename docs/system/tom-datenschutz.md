# Technische und Organisatorische Massnahmen (TOMs)

> Dokumentation nach Art. 32 DSGVO fuer die KI-Chat-Plattform build-jetzt.
> Stand: 2026-03-30

---

## 1. Vertraulichkeit

### 1.1 Zugriffskontrolle (Authentifizierung)

| Massnahme | Umsetzung |
|-----------|-----------|
| Authentifizierung | Logto OIDC (OpenID Connect) mit Session-Cookies |
| Passwort-Speicherung | Keine — Credentials werden ausschliesslich bei Logto verwaltet |
| Session-Management | Signiertes Cookie (`logto_{appId}`), Cookie-Secret min. 32 Zeichen |
| Dev-Bypass | Nur bei fehlendem `LOGTO_APP_ID` UND `NODE_ENV=development`. In Production: 503-Fehler |
| CSRF-Schutz | Origin-Check fuer alle mutierenden Requests in `src/proxy.ts` |

### 1.2 Berechtigungskontrolle (Autorisierung)

| Massnahme | Umsetzung |
|-----------|-----------|
| Rollenmodell | 3 Stufen: `user`, `admin`, `superadmin` |
| Route-Guards | `requireAuth()` (User), `requireAdmin()` (Admin), `requireSuperAdmin()` (User-Management) |
| userId-Scoping | Alle DB-Mutations pruefen `WHERE userId = ?` (Defense-in-Depth) |
| Feature-Gating | Deaktivierte Features liefern HTTP 404 |
| User-Freischaltung | Default: Admin muss neue User freischalten. Optional: offene Registrierung |

### 1.3 Transportverschluesselung

| Massnahme | Umsetzung |
|-----------|-----------|
| HTTPS | Erzwungen via HSTS (`max-age=63072000; includeSubDomains; preload`) |
| Datenbank-Verbindung | TLS 1.2/1.3, `sslmode=require` in Connection String |
| API-Kommunikation | Alle externen APIs ueber HTTPS |

### 1.4 Verschluesselung ruhender Daten

| Massnahme | Umsetzung |
|-----------|-----------|
| Datenbank (Neon Postgres) | AES-256 (XTS-AES-256 auf NVMe SSDs), Schluessel via AWS KMS mit automatischer Rotation |
| Backups | Taeglich verschluesselte Backups ueber mehrere Availability Zones |
| Object Storage (R2/S3) | Serverseitige Verschluesselung (Provider-Standard) |
| Audit-Logging | AWS CloudTrail fuer Datenbank-Zugriffe |

**Hinweis:** Application-Level Field Encryption wird bewusst nicht eingesetzt. Die Infrastruktur-Verschluesselung durch Neon (AES-256) deckt den Schutzbedarf fuer die verarbeiteten Datenkategorien ab. Eine zusaetzliche Feld-Verschluesselung wuerde Indexierung, Suche und Query-Performance zerstoeren, ohne proportionalen Sicherheitsgewinn.

---

## 2. Integritaet

### 2.1 Eingabekontrolle

| Massnahme | Umsetzung |
|-----------|-----------|
| Chat-ID Validierung | Max. 20 Zeichen, nur `[a-zA-Z0-9_-]` |
| Nachrichtenlaenge | Max. 2.000 Zeichen pro User-Nachricht |
| Body-Size Limit | Max. 5 MB |
| Message-Limit | Max. 50 Messages pro Request |
| Model-Validierung | Gegen Model-Registry geprueft |
| Upload-Limit | Rate Limit: 10 Uploads/Minute |

### 2.2 SSRF-Schutz

| Massnahme | Umsetzung |
|-----------|-----------|
| URL-Validierung | `isAllowedUrl()` fuer web_fetch und MCP-URLs |
| Interne Netzwerke | Blockiert (private IP-Bereiche, localhost) |

### 2.3 Content Security

| Header | Wert |
|--------|------|
| Content-Security-Policy | `default-src 'self'`; Script/Style/Font/Media restriktiv |
| X-Frame-Options | `DENY` |
| X-Content-Type-Options | `nosniff` |
| Permissions-Policy | camera, geolocation, browsing-topics deaktiviert |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Artifact-Sandbox | HTML-Preview in iframe mit `sandbox="allow-scripts"` + CSP Meta-Tag |

---

## 3. Verfuegbarkeit

### 3.1 Rate Limiting

| Bereich | Limit | Window |
|---------|-------|--------|
| Chat | 20 Requests | 60 Sekunden |
| API | 60 Requests | 60 Sekunden |
| Web (Search/Scrape) | 30 Requests | 60 Sekunden |
| Upload | 10 Requests | 60 Sekunden |

Implementierung: In-Memory Token Bucket mit automatischer Bereinigung alle 5 Minuten.

### 3.2 Infrastruktur

| Massnahme | Umsetzung |
|-----------|-----------|
| Hosting | Vercel (Edge Network, automatisches Scaling) |
| Datenbank | Neon Serverless Postgres (Auto-Suspend, Auto-Scale) |
| DB-Backups | Taeglich, verschluesselt, Multi-AZ |
| Connection Pooling | Module-Level Singleton, kein Pool-Leak |

---

## 4. Datenschutz-spezifische Massnahmen

### 4.1 PII-Erkennung und -Schutz (Business Mode)

| Massnahme | Umsetzung |
|-----------|-----------|
| PII-Detection | Lokale Regex-basierte Erkennung (kein externer API-Call) |
| Erkannte Typen | E-Mail, IBAN, Kreditkarte, Telefon (DE), Steuer-ID, SVN, PLZ, IP, URL |
| Redaktion | Automatische Maskierung mit typ-spezifischen Strategien |
| Privacy-Routing | Wahlweise EU-Modell (Mistral) oder lokales Modell (Ollama) |
| Consent-Logging | Audit-Trail in `consent_logs` (Typ, Entscheidung, Zeitpunkt) |
| Feature-Toggle | `NEXT_PUBLIC_BUSINESS_MODE=true` aktiviert den gesamten Flow |

### 4.2 Deployment-Profile

| Profil | Datenverarbeitung | Geeignet fuer |
|--------|-------------------|---------------|
| **SaaS (Gateway)** | Vercel AI Gateway, Neon (Region waehlbar), Cloud-Provider | Standard-Nutzung |
| **EU (Direct)** | EU-Provider direkt (Mistral, IONOS), Neon EU-Region | EU-Datenschutzanforderungen |
| **Local** | Self-hosted (Ollama/LiteLLM), eigene DB, kein externer Transfer | Maximale Datensouveraenitaet |

### 4.3 Trennungskontrolle

| Massnahme | Umsetzung |
|-----------|-----------|
| Mandantentrennung | userId-Scoping auf allen DB-Queries |
| Projekt-Isolation | Projekt-Mitglieder nur mit expliziter Einladung |
| Admin-Trennung | Separate Guards und Routes fuer Admin-Operationen |

---

## 5. Organisatorische Massnahmen

### 5.1 Zugangsberechtigungen

- Datenbankzugriff nur ueber Application Layer (Drizzle ORM), keine direkten SQL-Verbindungen im Normalbetrieb
- Admin-Zugang durch Rollenmodell beschraenkt
- Superadmin-Rolle fuer User-Management separat konfiguriert

### 5.2 Logging und Nachvollziehbarkeit

| Log-Typ | Speicherort | Inhalt |
|---------|-------------|--------|
| Usage-Logs | `usage_logs` Tabelle | Token-Verbrauch, Modell, Zeitpunkt (keine Inhalte) |
| Credit-Transaktionen | `credit_transactions` Tabelle | Betrag, Typ, Referenz |
| Consent-Logs | `consent_logs` Tabelle | PII-Entscheidungen, Routing |
| Infra-Logs | AWS CloudTrail (Neon), Vercel Logs | Zugriffe auf Infrastruktur |

### 5.3 Datensparsamkeit

- Keine Passwort-Speicherung (extern bei Logto)
- PII-Redaktion vor Verarbeitung moeglich (Business Mode)
- Chat Retention: Automatische Loeschung nach konfigurierbarer Frist
- Memory-System: Explizite Loesch-Funktion (`deleteAllMemories`)

---

## 6. Unterauftragnehmer (Auftragsverarbeiter)

| Dienstleister | Funktion | Datenarten | Standort | Verschluesselung |
|---------------|----------|------------|----------|------------------|
| **Neon** | Datenbank-Hosting | Alle DB-Daten | US/EU (waehlbar) | AES-256 at rest, TLS in transit |
| **Vercel** | App-Hosting, Edge Network | Request-Daten, Logs | Global (Edge) | TLS in transit |
| **Logto** | Authentifizierung | Credentials, Session | Abhaengig von Logto-Setup | Provider-Standard |
| **Mem0** (optional) | Memory-Service | User-Memories als Embeddings | Cloud oder Self-Hosted | Provider-Standard |
| **AI-Provider** (variabel) | LLM-Inference | Chat-Inhalte (transient) | Abhaengig vom Provider | TLS in transit |
| **Cloudflare R2** (optional) | Object Storage | Uploads, Artifacts | Global | Serverseitig |
| **Firecrawl** (optional) | Web Search/Scrape | Suchanfragen | US | TLS in transit |

**Empfehlung:** Fuer jeden aktiven Auftragsverarbeiter sollte ein Auftragsverarbeitungsvertrag (AVV) nach Art. 28 DSGVO abgeschlossen werden.

---

## 7. Regelmaessige Ueberpruefung

Diese Dokumentation wird bei wesentlichen Aenderungen an der Architektur oder den eingesetzten Diensten aktualisiert. Eine Ueberpruefung sollte mindestens halbjaehrlich erfolgen.

| Aspekt | Zyklus | Verantwortlich |
|--------|--------|----------------|
| TOM-Review | Halbjaehrlich | Betreiber |
| Dependency-Updates | Laufend | Entwicklung |
| Zugriffsrechte-Review | Quartalsweise | Betreiber |
| Auftragsverarbeiter-Pruefung | Jaehrlich | Betreiber |
