# PRD: Projektverwaltung als Kollaborationsspace

> Status: Entwurf — Zur Diskussion im Team

---

## Ausgangslage

Die Projektverwaltung existiert als Single-User-Feature. Projekte gruppieren Chats, haben Instructions + Dokumente (max 10 Files, 8000 Token Budget), einen Default-Expert und werden in der Sidebar als Akkordeon dargestellt. Alles ist userId-scoped. Es gibt kein Team-Konzept, kein Sharing innerhalb von Projekten, kein Projekt-Memory.

---

## Zielbild

Ein Kollaborationsspace, in dem kleine Teams (5-20 Personen) gemeinsam in einem Projektkontext mit KI arbeiten. Nicht alle Chats automatisch geteilt. Wissen akkumuliert sich projektbezogen ueber Gespraeche hinweg.

---

## Business-Probleme

| Problem                             | Wie es heute aussieht                                                                           | Loesung                                                                 |
| ----------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Wissenssilos**                    | Teammitglied entdeckt gutes Pattern oder KI-Ergebnis, Insight stirbt im privaten Chat           | Shared Chats + Projekt-Memory machen Erkenntnisse sichtbar              |
| **Kontext-Verlust bei Teamwechsel** | Neues Teammitglied startet bei Null, kein Zugang zu bisherigen Erkenntnissen                    | Projekt-Dokumente, Memory und Chat-History geben sofort Kontext         |
| **Inkonsistente KI-Qualitaet**      | Jeder bekommt andere Ergebnisse weil unterschiedliche Experten/Instructions                     | Projekt-Level Expert + Instructions sorgen fuer einheitliches Verhalten |
| **Doppelte Arbeit**                 | Team stellt der KI unabhaengig dieselben Fragen                                                 | Shared Chats zeigen was schon erforscht wurde                           |
| **Kollaborationsbarriere**          | Kunden-Team bekommt keinen Zugang zum Projektkontext, Ergebnisse muessen manuell geteilt werden | Invite-by-Email ermoeglicht direkte Zusammenarbeit                      |

---

## Architektur-Entscheidungen

### 1. Projekt = Kollaborationsgrenze

Kein separates "Team" oder "Workspace"-Entity. Das Projekt selbst ist die Zusammenarbeitseinheit. Jedes Projekt hat eigene Mitgliedschaft.

**Begruendung:** Vermeidet Hierarchie-Komplexitaet (Platform > Workspace > Project > Chat). Matcht Consulting-Realitaet wo Projektteams ueberlappen aber nicht identisch sind. Rico arbeitet mit Kunde A an 3 Projekten — er laedt das Team pro Projekt ein, nicht in einen globalen Workspace.

### 2. Chat-Sichtbarkeit: Privat als Default

Zwei States: `private` (nur Ersteller) und `project` (alle Mitglieder). Kein feingranulares ACL pro Chat. Der User entscheidet aktiv per Toggle, welche Chats geteilt werden.

**Begruendung:** "Nicht alle Chats sollen automatisch geshared sein." Einfaches Modell, klar verstaendlich.

### 3. Projekt-Memory in Postgres, nicht Mem0

Mem0 ist user-scoped und extern. Projekt-Memories werden als einfache Text-Eintraege lokal in der DB gespeichert und komplett (budget-capped) in den System-Prompt geladen.

**Begruendung:** Kein semantischer Search noetig bei der Projektgroesse. Volle Kontrolle, keine Abhaengigkeit von Mem0-Limitierungen. Einfacher als Mem0 mit synthetischen User-IDs zu hacken.

### 4. Kein Realtime-Collab auf Chats

Ein Chat wird von einer Person gefuehrt, andere lesen. Kein gleichzeitiges Bearbeiten.

**Begruendung:** KI-Chat ist kein Google Docs. Vermeidet WebSocket/CRDT-Komplexitaet komplett.

### 5. Credits bleiben per-User

Keine Projekt-Credit-Pools. Jeder nutzt seine eigenen Credits.

**Begruendung:** Billing-Logik fuer Teams ist eigenstaendig komplex. Kann spaeter als separate Erweiterung kommen.

---

## Rollen-Modell

| Rolle      | Projekte sehen | Shared Chats lesen | Shared Chats fortfuehren | Dokumente/Memory verwalten | Mitglieder verwalten | Projekt loeschen |
| ---------- | -------------- | ------------------ | ------------------------ | -------------------------- | -------------------- | ---------------- |
| **Owner**  | Ja             | Ja                 | Ja                       | Ja                         | Ja                   | Ja               |
| **Editor** | Ja             | Ja                 | Ja                       | Ja                         | Nein                 | Nein             |
| **Viewer** | Ja             | Ja                 | Nein                     | Nein                       | Nein                 | Nein             |

Jeder kann private Chats im Projektkontext erstellen (bekommt Projekt-Dokumente + Memory als Kontext). Nur geteilte Chats sind fuer andere sichtbar.

---

## Datenmodell-Aenderungen

### Neue Tabellen

#### `project_members`

| Spalte    | Typ         | Beschreibung                  |
| --------- | ----------- | ----------------------------- |
| id        | text PK     | nanoid                        |
| projectId | text FK     | -> projects.id CASCADE        |
| userId    | text        | Logto sub claim               |
| role      | text        | 'owner' / 'editor' / 'viewer' |
| invitedBy | text        | Wer eingeladen hat            |
| createdAt | timestamptz |                               |
| updatedAt | timestamptz |                               |

Unique Constraint: (projectId, userId)

#### `project_invites`

| Spalte     | Typ         | Beschreibung                     |
| ---------- | ----------- | -------------------------------- |
| id         | text PK     | nanoid                           |
| projectId  | text FK     | -> projects.id CASCADE           |
| email      | text        | Eingeladene E-Mail               |
| role       | text        | 'editor' / 'viewer'              |
| token      | text UNIQUE | 24-char nanoid, fuer Invite-Link |
| invitedBy  | text        | Wer eingeladen hat               |
| expiresAt  | timestamptz | Default +7 Tage                  |
| acceptedAt | timestamptz | null bis akzeptiert              |
| createdAt  | timestamptz |                                  |

#### `project_memories`

| Spalte       | Typ         | Beschreibung                            |
| ------------ | ----------- | --------------------------------------- |
| id           | text PK     | nanoid                                  |
| projectId    | text FK     | -> projects.id CASCADE                  |
| content      | text        | Memory-Inhalt                           |
| source       | text        | 'auto' (aus Chat extrahiert) / 'manual' |
| sourceChatId | text        | Herkunfts-Chat (nullable)               |
| createdBy    | text        | Wer erstellt hat                        |
| createdAt    | timestamptz |                                         |
| updatedAt    | timestamptz |                                         |

### Modifizierte Tabellen

#### `chats` — neues Feld

| Spalte     | Typ                    | Beschreibung             |
| ---------- | ---------------------- | ------------------------ |
| visibility | text DEFAULT 'private' | 'private' oder 'project' |

Bestehende Chats bleiben privat (Default). Kein Breaking Change.

---

## Chat-Sichtbarkeitsmodell

### Zugriffslogik

```
Lesen:
  Owner des Chats                                          → immer
  Projektmitglied + Chat ist "project" + Chat hat projectId → ja

Schreiben/Fortfuehren:
  Owner des Chats                                          → immer
  Editor/Owner im Projekt + Chat ist "project"              → ja
  Viewer im Projekt                                         → nein
```

### UI-Verhalten

- Chat-Input zeigt Toggle: Schloss-Icon (Privat) / Personen-Icon (Geteilt mit Projekt)
- Neue Chats sind immer privat
- User kann Sichtbarkeit jederzeit aendern
- Sidebar zeigt unter Projekt-Akkordeon: eigene private Chats + alle geteilten Chats anderer Mitglieder

---

## Projekt-Memory

### Woher kommen Memories?

1. **Automatisch:** Nach jedem geteilten Chat extrahiert das System Projekt-relevante Erkenntnisse (Entscheidungen, Fakten, Patterns) per LLM-Call
2. **Manuell:** Projektmitglieder (Editor+) koennen Memories in den Projekteinstellungen hinzufuegen, bearbeiten, loeschen

Fuer private Chats: Keine Projekt-Memory-Extraktion. Privat bleibt privat.

### Wie werden Memories genutzt?

In den System-Prompt integriert (Layer 5, nach Projekt-Dokumenten):

```
## Projekt-Kontext
{Projekt-Instructions}

## Projekt-Dokumente
{Dokumente wie bisher}

## Projekt-Wissen
Erkenntnisse und Entscheidungen aus dem Projekt:
- Entscheidung: API nutzt REST statt GraphQL wegen Team-Expertise
- Pattern: Kunden bevorzugen Bullet-Points statt Fliesstext
- Fakt: Budget-Grenze liegt bei 50k EUR fuer Phase 1
```

Token-Budget: 2000 Tokens (separat vom Dokument-Budget). Neueste Memories zuerst, aelteste werden abgeschnitten wenn Budget ueberschritten.

---

## Einladungs-Flow

1. Projekt-Owner oeffnet Projekteinstellungen → Tab "Mitglieder"
2. Gibt E-Mail-Adresse ein + waehlt Rolle (Editor/Viewer)
3. System generiert Invite-Link mit Token (gueltig 7 Tage)
4. Link wird angezeigt (Copy-to-Clipboard) — optional per E-Mail
5. Eingeladener klickt Link → wird zu Login/Signup weitergeleitet
6. Nach Login: Invite wird automatisch akzeptiert, Projekt erscheint in Sidebar
7. Owner sieht in Mitglieder-Tab: aktive Members + ausstehende Einladungen

---

## Migration bestehender Daten

Zero Breaking Changes:

1. `project_members` Tabelle erstellen
2. Backfill: Fuer jedes bestehende Projekt einen Owner-Eintrag anlegen
3. `visibility` Spalte an `chats` mit Default `'private'`
4. Alle bestehenden Queries funktionieren weiter, werden schrittweise auf Membership umgestellt

---

## Phasenvorschlag

### Phase 1: Membership + Access Control

Mehrere User koennen Mitglieder eines Projekts sein. Zugriffslogik umgestellt. Chats noch alle privat. Members werden initial per API hinzugefuegt (kein Invite-UI).

### Phase 2: Chat-Sharing + Sidebar

Visibility-Toggle. Sidebar zeigt geteilte Chats anderer Mitglieder. Lese- und Schreibrechte nach Rolle.

### Phase 3: Projekt-Memory

Auto-Extraktion aus geteilten Chats. Manuelle Memory-Verwaltung. System-Prompt-Integration.

### Phase 4: Einladungen + UI-Polish

Self-Service Invite-by-Email. Mitglieder-Management UI. Rollen aendern/entfernen.

---

## Offene Fragen fuer Team-Diskussion

1. **Rollen:** Reichen Owner/Editor/Viewer oder brauchen wir weitere Abstufungen?
2. **Notifications:** Sollen Mitglieder benachrichtigt werden wenn ein neuer Chat geteilt wird? (E-Mail, In-App, beides?)
3. **Memory-Curation:** Wer darf Projekt-Memories loeschen? Nur Owner oder auch Editors?
4. **Chat-Fortfuehrung:** Sollen Editors geteilte Chats anderer fortfuehren koennen, oder nur lesen + eigene erstellen?
5. **Projekt-Limits:** Max Mitglieder pro Projekt? Max Projekte pro User?
6. **Archivierung:** Was passiert mit Memberships wenn ein Projekt archiviert wird?
7. **Billing:** Soll es perspektivisch Projekt-Credit-Budgets geben? Oder reicht per-User?
8. **Gastrolle:** Brauchen wir eine "Guest"-Rolle fuer externe Stakeholder die nur bestimmte Chats sehen sollen?
