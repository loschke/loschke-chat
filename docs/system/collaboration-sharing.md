# Collaboration & Sharing

Projektarbeit, Chat-Sharing und Zugriffssteuerung. Beschreibt wie Nutzer zusammenarbeiten und Inhalte teilen koennen.

---

## Ueberblick

Die Plattform bietet drei Collaboration-Mechanismen:

| Mechanismus          | Zweck                               | Zugriff                              |
| -------------------- | ----------------------------------- | ------------------------------------ |
| **Projekt-Mitglieder** | Gemeinsam in Projekten arbeiten   | Owner + Editors sehen alle Chats/Docs |
| **Chat-Sharing Public** | Chat per Link teilen             | Jeder mit Link (read-only)           |
| **Chat-Sharing User** | Chat mit bestimmten Nutzern teilen | Nur eingeladene Nutzer               |

---

## Projekt-Collaboration

### Konzept

Projekte buendeln Chats mit gemeinsamem Kontext. Ueber Projekt-Mitglieder koennen mehrere Nutzer im selben Projekt arbeiten.

### Rollen

| Rolle      | Kann Chats sehen | Kann Docs verwalten | Kann Mitglieder einladen | Kann Mitglieder entfernen | Kann archivieren |
| ---------- | ---------------- | ------------------- | ------------------------ | ------------------------- | ---------------- |
| **Owner**  | Ja               | Ja                  | Ja                       | Ja                        | Ja               |
| **Editor** | Ja               | Ja                  | Ja                       | Nein                      | Nein             |

### Mitglieder verwalten

**Einladen:**
1. Projekt oeffnen → Mitglieder-Bereich
2. E-Mail-Adresse des Nutzers eingeben
3. Rolle waehlen (Editor ist Standard)
4. System sucht Nutzer in der Datenbank (muss existieren)

**Einschraenkungen:**
- Nutzer muss bereits in der Plattform registriert sein
- Sich selbst einladen ist nicht moeglich
- Owner-Mitglieder koennen nicht entfernt werden
- Einladung ist idempotent (doppelte Einladung ueberschreibt nicht)

### Projekt-Dokumente

Jedes Projekt kann bis zu 10 Dokumente enthalten (konfigurierbar via ENV):

| Limit                | ENV                          | Default  |
| -------------------- | ---------------------------- | -------- |
| Max Dokumente        | `PROJECT_DOCS_MAX_COUNT`     | `10`     |
| Token-Budget         | `PROJECT_DOCS_TOKEN_BUDGET`  | `8000`   |
| Max Dateigroesse     | `PROJECT_DOCS_MAX_FILE_SIZE` | `512000` |

Erlaubte Formate: `.md`, `.txt`. Dokument-Inhalte werden als System-Prompt-Layer 5 in jeden Chat des Projekts injiziert.

---

## Chat-Sharing: Public Link

### Funktionsweise

1. Chat-Owner erstellt einen Public Link
2. System generiert einen 24-Zeichen-Token (nanoid)
3. Jeder mit der URL `/share/{token}` kann den Chat lesen
4. Keine Authentifizierung noetig

### Einschraenkungen

- **Read-only:** Geteilte Chats koennen nicht bearbeitet werden
- **Letzte 50 Messages:** Nur die letzten 50 Nachrichten werden angezeigt
- **Kein Echtzeit:** Snapshot zum Zeitpunkt des Aufrufs
- **Widerrufbar:** Owner kann den Link jederzeit deaktivieren

### API-Endpoints

| Methode  | Route                         | Auth     | Beschreibung                    |
| -------- | ----------------------------- | -------- | ------------------------------- |
| `GET`    | `/api/chats/{id}/share`       | Required | Share-Status pruefen            |
| `POST`   | `/api/chats/{id}/share`       | Required | Link erstellen (idempotent)     |
| `DELETE`  | `/api/chats/{id}/share`       | Required | Link widerrufen                 |
| `GET`    | `/api/share/{token}`          | Public   | Geteilten Chat laden            |

---

## Chat-Sharing: User-zu-User

### Funktionsweise

1. Chat-Owner gibt Chat fuer bestimmte Nutzer frei (per E-Mail)
2. Freigegebene Chats erscheinen in "Shared with me" des Empfaengers
3. Empfaenger sieht den Chat auch in der Sidebar

### Einschraenkungen

- Nur Chat-Owner kann Freigaben erstellen/widerrufen
- Nutzer muss in der Plattform registriert sein
- Sich selbst freigeben ist nicht moeglich
- Freigabe ist idempotent (Unique Constraint auf chatId + sharedWithId)

### API-Endpoints

| Methode  | Route                                  | Auth     | Beschreibung                    |
| -------- | -------------------------------------- | -------- | ------------------------------- |
| `GET`    | `/api/chats/{id}/share-with`           | Required | Empfaenger auflisten            |
| `POST`   | `/api/chats/{id}/share-with`           | Required | Chat mit Nutzer teilen          |
| `DELETE`  | `/api/chats/{id}/share-with/{shareId}` | Required | Freigabe widerrufen             |
| `GET`    | `/api/chats/shared`                    | Required | Eigene geteilte Chats           |
| `GET`    | `/api/chats/shared-with-me`            | Required | Mit mir geteilte Chats          |

---

## Zugriffssteuerung

### Chat-Zugriff (canAccessChat)

Prueft ob ein Nutzer auf einen Chat zugreifen darf. Drei Pfade, in Reihenfolge:

| Pfad              | Ergebnis                                              |
| ----------------- | ----------------------------------------------------- |
| Chat-Owner        | `hasAccess: true, isOwner: true, via: "owner"`        |
| Projekt-Mitglied  | `hasAccess: true, isOwner: false, via: "project_member"` |
| Chat-Share        | `hasAccess: true, isOwner: false, via: "chat_share"`  |
| Kein Zugriff      | `hasAccess: false`                                    |

### Projekt-Zugriff (canAccessProject)

| Pfad              | Ergebnis                                              |
| ----------------- | ----------------------------------------------------- |
| Projekt-Owner     | `hasAccess: true, isOwner: true, role: "owner"`       |
| Projekt-Mitglied  | `hasAccess: true, isOwner: false, role: "editor"`     |
| Kein Zugriff      | `hasAccess: false`                                    |

### Wichtige Regeln

- **Nur Owner** koennen: Chats/Projekte loeschen, Mitglieder entfernen, Public Links widerrufen
- **Editors** koennen: Chats lesen, Dokumente verwalten, Mitglieder einladen
- **Public Links** sind: Unauthentifiziert, read-only, widerrufbar
- **Cascade Deletes:** Chat-Loeschung loescht auch shared_chats und chat_shares

---

## Datenbank-Schema

### shared_chats (Public Links)

```
shared_chats
├── id (PK, nanoid)
├── chatId (FK → chats, CASCADE DELETE)
├── userId (text — Chat-Owner)
├── token (unique, 24 Zeichen)
└── createdAt
    Index: token, chatId, userId
```

### chat_shares (User-zu-User)

```
chat_shares
├── id (PK, nanoid)
├── chatId (FK → chats, CASCADE DELETE)
├── ownerId (text — Chat-Owner)
├── sharedWithId (text — Empfaenger)
└── createdAt
    Unique: (chatId, sharedWithId)
    Index: sharedWithId, chatId
```

### project_members

```
project_members
├── id (PK, nanoid)
├── projectId (FK → projects, CASCADE DELETE)
├── userId (text)
├── role ("owner" | "editor")
├── addedBy (text)
└── createdAt
    Unique: (projectId, userId)
    Index: userId, projectId
```

---

## Kern-Dateien

| Datei                                         | Beschreibung                           |
| --------------------------------------------- | -------------------------------------- |
| `src/lib/db/schema/shared-chats.ts`           | Public Sharing Schema                  |
| `src/lib/db/schema/chat-shares.ts`            | User-zu-User Sharing Schema            |
| `src/lib/db/schema/project-members.ts`        | Projekt-Mitglieder Schema              |
| `src/lib/db/queries/shared-chats.ts`          | Public Sharing Queries                 |
| `src/lib/db/queries/chat-shares.ts`           | User-zu-User Sharing Queries           |
| `src/lib/db/queries/project-members.ts`       | Mitglieder-Queries                     |
| `src/lib/db/queries/access.ts`                | Zugriffspruefung (canAccessChat/Project)|
| `src/app/api/chats/[chatId]/share/route.ts`   | Public Share API                       |
| `src/app/api/chats/[chatId]/share-with/`      | User Share API                         |
| `src/app/api/projects/[projectId]/members/`   | Mitglieder API                         |
