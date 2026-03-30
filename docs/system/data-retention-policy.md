# Data Retention Policy

> Loeschfristen und Aufbewahrungsregeln fuer alle Datentypen der KI-Chat-Plattform.
> Stand: 2026-03-30

---

## Grundsatz

Daten werden nur so lange gespeichert, wie sie fuer den jeweiligen Zweck erforderlich sind (Datenminimierung nach Art. 5 Abs. 1 lit. c DSGVO). Wo moeglich, erfolgt die Loeschung automatisiert.

---

## 1. Retention-Fristen nach Datentyp

### 1.1 Chat-Daten

| Datentyp | Frist | Mechanismus | Konfiguration |
|----------|-------|-------------|---------------|
| **Chats (nicht angepinnt)** | 90 Tage (Default) | Automatisch via Cron-Job | `CHAT_RETENTION_DAYS=90` |
| **Chats (angepinnt)** | Unbegrenzt | Kein automatisches Loeschen | User muss manuell loeschen |
| **Messages** | An Chat gekoppelt | Cascade Delete bei Chat-Loeschung | Automatisch |
| **Artifacts** | An Chat gekoppelt | Cascade Delete bei Chat-Loeschung | Automatisch |

**Cron-Job:** `/api/cron/retention` laeuft taeglich um 3:00 Uhr (konfiguriert in `vercel.json`). Geschuetzt durch `CRON_SECRET` Bearer Token.

**Angepinnte Chats:** User koennen Chats anpinnen, um sie von der automatischen Loeschung auszunehmen. Dies respektiert die User-Entscheidung, bestimmte Gespraeche dauerhaft zu behalten.

### 1.2 User-Daten

| Datentyp | Frist | Mechanismus |
|----------|-------|-------------|
| **User-Konto** | Bis zur Loeschung | Manuell durch Admin oder User-Request |
| **Custom Instructions** | An Konto gekoppelt | Mit Konto geloescht |
| **Profildaten** (Name, E-Mail, Avatar) | An Konto gekoppelt | Mit Konto geloescht |
| **User-Einstellungen** | An Konto gekoppelt | Mit Konto geloescht |

### 1.3 Projekt-Daten

| Datentyp | Frist | Mechanismus |
|----------|-------|-------------|
| **Projekte** | Bis zur Loeschung durch User | Manuell |
| **Projekt-Dokumente** | An Projekt gekoppelt | Cascade Delete bei Projekt-Loeschung |
| **Projekt-Mitgliedschaften** | An Projekt gekoppelt | Cascade Delete bei Projekt-Loeschung |

### 1.4 Abrechnungs- und Nutzungsdaten

| Datentyp | Frist | Begruendung |
|----------|-------|-------------|
| **Usage-Logs** | 12 Monate | Abrechnungsnachvollziehbarkeit, danach Archivierung empfohlen |
| **Credit-Transaktionen** | 24 Monate | Steuerrechtliche Aufbewahrung (bei kommerzieller Nutzung) |

**Hinweis:** Usage-Logs enthalten keine Nachrichteninhalte, sondern nur Token-Zaehler, Modell-IDs und Zeitstempel.

### 1.5 Compliance- und Audit-Daten

| Datentyp | Frist | Begruendung |
|----------|-------|-------------|
| **Consent-Logs** | 36 Monate (3 Jahre) | Nachweis der Einwilligungen nach Art. 7 Abs. 1 DSGVO |

### 1.6 Memory-Daten

| Datentyp | Frist | Mechanismus |
|----------|-------|-------------|
| **User-Memories** (Mem0) | Bis zur Loeschung durch User | `deleteAllMemories()` — User kann jederzeit alle Memories loeschen |
| **Memory-Toggle** | Sofortige Wirkung | Deaktivierung stoppt neue Extraktion, bestehende Memories bleiben bis zur expliziten Loeschung |

### 1.7 Sharing-Daten

| Datentyp | Frist | Mechanismus |
|----------|-------|-------------|
| **Public Shares** | Bis zum Widerruf | User kann Share jederzeit deaktivieren |
| **User-zu-User Shares** | An Chat gekoppelt | Geloescht mit dem Chat |

---

## 2. Automatische Loeschung

### 2.1 Chat Retention Cron

Der primaere automatische Loeschmechanismus:

```
Endpunkt:  GET /api/cron/retention
Zeitplan:  Taeglich 03:00 UTC (vercel.json)
Auth:      Bearer {CRON_SECRET}
Verhalten: Loescht alle nicht-angepinnten Chats aelter als CHAT_RETENTION_DAYS
Cascade:   Messages, Artifacts werden automatisch mitgeloescht (DB Foreign Keys)
```

**Konfiguration:**

| Variable | Default | Beschreibung |
|----------|---------|-------------|
| `CHAT_RETENTION_DAYS` | 90 | Tage bis zur Loeschung (0 = deaktiviert) |
| `CRON_SECRET` | — | Bearer Token zum Schutz des Endpunkts |

### 2.2 Empfohlene zusaetzliche Automatisierungen

Aktuell nicht implementiert, aber fuer den Produktivbetrieb empfohlen:

| Datentyp | Empfohlene Aktion | Prioritaet |
|----------|-------------------|------------|
| Usage-Logs > 12 Monate | Archivierung oder Loeschung | Mittel |
| Credit-Transaktionen > 24 Monate | Archivierung | Niedrig |
| Consent-Logs > 36 Monate | Loeschung | Niedrig |
| Inaktive User-Konten > 12 Monate | Benachrichtigung + optionale Loeschung | Mittel |
| Verwaiste R2-Dateien | Cleanup-Job (Dateien ohne DB-Referenz) | Niedrig |

---

## 3. Manuelle Loeschung

### 3.1 Durch User

| Aktion | Weg | Scope |
|--------|-----|-------|
| Chat loeschen | Chat-Sidebar → Loeschen | Chat + Messages + Artifacts |
| Share widerrufen | Share-Dialog → Deaktivieren | Share-Token wird ungueltig |
| Memories loeschen | Einstellungen → Memory → Alle loeschen | Alle Mem0-Eintraege |
| Projekt loeschen | Projekt-Settings → Loeschen | Projekt + Dokumente + Mitgliedschaften |

### 3.2 Durch Admin

| Aktion | Weg | Scope |
|--------|-----|-------|
| User sperren | Admin → User-Management → Status: rejected | Zugang gesperrt, Daten erhalten |
| User-Daten loeschen | Manuell in DB (oder kuenftiges Admin-Feature) | Alle User-bezogenen Daten |
| Credit-Anpassung | Admin → Credits → Grant/Adjust | Nur Credit-Balance |

---

## 4. Loeschung bei Kontobeendigung

Bei vollstaendiger Kontolöschung eines Users werden geloescht:

1. **Sofort:** User-Profil, Custom Instructions, Einstellungen
2. **Cascade:** Alle Chats (→ Messages, Artifacts), Projekte (→ Dokumente, Mitgliedschaften)
3. **Extern:** Mem0-Memories (via `deleteAllMemories`)
4. **Extern:** R2-Dateien (Cleanup-Job empfohlen)
5. **Erhalten:** Usage-Logs und Credit-Transaktionen (Abrechnungsrelevanz, anonymisiert ohne Kontobezug)
6. **Erhalten:** Consent-Logs (Compliance-Nachweispflicht)

---

## 5. Backup-Retention

| Backup-Typ | Frist | Provider |
|------------|-------|----------|
| Neon DB-Backups | 7 Tage (Standard), bis 30 Tage (Pro) | Neon |
| Point-in-Time Recovery | 7 Tage (Standard), bis 30 Tage (Pro) | Neon |

**Hinweis:** Geloeschte Daten koennen innerhalb des Backup-Fensters theoretisch wiederhergestellt werden. Nach Ablauf der Backup-Retention sind sie unwiderruflich geloescht.

---

## 6. Aktualisierung

Diese Policy wird aktualisiert bei:
- Neuen Datentypen oder Speicherorten
- Aenderungen an gesetzlichen Aufbewahrungsfristen
- Neuen automatischen Loeschmechanismen

Letzte Aktualisierung: 2026-03-30
