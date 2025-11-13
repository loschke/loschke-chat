# Review: API & Database Design

## Executive Summary

**Status**: Sehr gute Arbeit, aber **ein kritischer Fehler muss korrigiert werden**

**Kritisches Problem**: Preset-Komponenten sind als REQUIRED definiert, obwohl die Vision explizit sagt "All 4 components are optional"

**Andere Findings**: 
- ✅ Architektur grundsätzlich solid
- ✅ Extension over Modification wird befolgt
- ✅ Migration Strategy ist gut
- ⚠️ Einige kleinere Inkonsistenzen

---

## 🔴 Kritischer Fehler: Preset Components

### Das Problem

**DATABASE_SCHEMA.md** (Zeile ~580):
```typescript
export const preset = pgTable('Preset', {
  // ...
  roleId: uuid('roleId')
    .notNull()      // ❌ FEHLER: Ist als REQUIRED markiert
    .references(() => component.id),
  styleId: uuid('styleId')
    .notNull(),     // ❌ FEHLER: Alle 4 sind REQUIRED
  contextId: uuid('contextId')
    .notNull(),     // ❌ FEHLER
  modeId: uuid('modeId')
    .notNull(),     // ❌ FEHLER
})
```

**API_DESIGN.md** (Zeile ~320):
```typescript
const createPresetSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  roleId: z.string().uuid(),      // ❌ FEHLER: Required, nicht optional
  styleId: z.string().uuid(),     // ❌ FEHLER
  contextId: z.string().uuid(),   // ❌ FEHLER
  modeId: z.string().uuid(),      // ❌ FEHLER
})
```

### Warum das falsch ist

**VISION.md ist eindeutig** (Zeile 53):
> "All 4 components are optional in a preset"

**Rationale** (systemPatterns.md Decision #5):
> - Maximum flexibility
> - User might only need Role + Mode
> - Supports gradual adoption

**Beispiel Use Case**:
- User hat nur Role + Mode definiert → sollte Preset damit erstellen können
- User will erstmal nur mit Style experimentieren → sollte funktionieren
- "LinkedIn Quick" Preset = nur Role, kein Style/Context/Mode → muss möglich sein

### Die Korrektur

#### Database Schema (DATABASE_SCHEMA.md)

**FALSCH** (current):
```typescript
export const preset = pgTable('Preset', {
  // ...
  roleId: uuid('roleId')
    .notNull()
    .references(() => component.id),
  styleId: uuid('styleId')
    .notNull()
    .references(() => component.id),
  contextId: uuid('contextId')
    .notNull()
    .references(() => component.id),
  modeId: uuid('modeId')
    .notNull()
    .references(() => component.id),
})
```

**RICHTIG** (corrected):
```typescript
export const preset = pgTable('Preset', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  
  // ALL OPTIONAL - nullable!
  roleId: uuid('roleId')
    .references(() => component.id),
  styleId: uuid('styleId')
    .references(() => component.id),
  contextId: uuid('contextId')
    .references(() => component.id),
  modeId: uuid('modeId')
    .references(() => component.id),
  
  usageCount: integer('usageCount').notNull().default(0),
  lastUsedAt: timestamp('lastUsedAt'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})
```

**Key Changes:**
- Entfernt: `.notNull()` bei allen 4 Komponenten-IDs
- Alle 4 sind jetzt nullable
- References bleiben bestehen (für Integrität wenn gesetzt)

#### Migration (DATABASE_SCHEMA.md)

**FALSCH** (current):
```sql
CREATE TABLE "Preset" (
  -- ...
  "roleId" UUID NOT NULL REFERENCES "Component"("id"),    -- ❌
  "styleId" UUID NOT NULL REFERENCES "Component"("id"),   -- ❌
  "contextId" UUID NOT NULL REFERENCES "Component"("id"), -- ❌
  "modeId" UUID NOT NULL REFERENCES "Component"("id"),    -- ❌
```

**RICHTIG** (corrected):
```sql
CREATE TABLE "Preset" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  
  -- ALL NULLABLE
  "roleId" UUID REFERENCES "Component"("id"),
  "styleId" UUID REFERENCES "Component"("id"),
  "contextId" UUID REFERENCES "Component"("id"),
  "modeId" UUID REFERENCES "Component"("id"),
  
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "lastUsedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
```

#### API Validation (API_DESIGN.md)

**FALSCH** (current):
```typescript
const createPresetSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  roleId: z.string().uuid(),      // ❌ Required
  styleId: z.string().uuid(),     // ❌ Required
  contextId: z.string().uuid(),   // ❌ Required
  modeId: z.string().uuid(),      // ❌ Required
})
```

**RICHTIG** (corrected):
```typescript
const createPresetSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  roleId: z.string().uuid().optional(),
  styleId: z.string().uuid().optional(),
  contextId: z.string().uuid().optional(),
  modeId: z.string().uuid().optional(),
}).refine(
  (data) => {
    // At least one component must be provided
    const hasAnyComponent = !!(
      data.roleId || 
      data.styleId || 
      data.contextId || 
      data.modeId
    )
    return hasAnyComponent
  },
  {
    message: "At least one component must be provided",
  }
)
```

**Key Changes:**
- Alle 4 IDs sind `.optional()`
- Zusätzliche Validation: Mindestens 1 Komponente erforderlich
- `.refine()` prüft, dass nicht alle null sind

#### API Validation Logic (API_DESIGN.md)

**Bisherige Validation Steps** (FALSCH):
```typescript
// Verify all 4 component IDs exist
const componentIds = [
  validatedData.roleId,
  validatedData.styleId,
  validatedData.contextId,
  validatedData.modeId,
]

if (foundComponents.length !== 4) {  // ❌ Immer 4 erwartet
  return Response.json(
    { error: 'Invalid component IDs' },
    { status: 400 }
  )
}
```

**Neue Validation Steps** (RICHTIG):
```typescript
// Collect provided component IDs (filter out nulls/undefined)
const componentIds = [
  validatedData.roleId,
  validatedData.styleId,
  validatedData.contextId,
  validatedData.modeId,
].filter(Boolean) as string[]

// Must have at least one component
if (componentIds.length === 0) {
  return Response.json(
    { error: 'At least one component must be provided' },
    { status: 400 }
  )
}

// Verify provided components exist and belong to user
const foundComponents = await db.query.components.findMany({
  where: and(
    eq(components.userId, session.user.id),
    inArray(components.id, componentIds)
  )
})

if (foundComponents.length !== componentIds.length) {
  return Response.json(
    { error: 'One or more component IDs are invalid' },
    { status: 400 }
  )
}

// If a component is provided, verify it's the correct type
const typeMap = new Map(foundComponents.map(c => [c.id, c.type]))

if (validatedData.roleId && typeMap.get(validatedData.roleId) !== 'role') {
  return Response.json(
    { error: 'roleId must reference a component of type "role"' },
    { status: 400 }
  )
}
// Repeat for style, context, mode...
```

---

## 🟡 Weitere Findings

### 1. Example Data

**DATABASE_SCHEMA.md** (Sample Data Section):

**Problem**: Alle Beispiele zeigen vollständige 4-Komponenten-Presets

**Lösung**: Ergänze Beispiele mit teilweisen Presets:

```typescript
// Example 1: Full preset (all 4 components)
{
  id: "preset-full",
  name: "LinkedIn Pro",
  roleId: "comp-role-1",
  styleId: "comp-style-1",
  contextId: "comp-context-1",
  modeId: "comp-mode-1",
}

// Example 2: Minimal preset (only role + mode)
{
  id: "preset-minimal",
  name: "Quick Expert",
  roleId: "comp-role-1",
  styleId: null,
  contextId: null,
  modeId: "comp-mode-1",
}

// Example 3: Partial preset (role + style only)
{
  id: "preset-partial",
  name: "Professional Voice",
  roleId: "comp-role-1",
  styleId: "comp-style-1",
  contextId: null,
  modeId: null,
}
```

### 2. Chat API Extension

**API_DESIGN.md** (Chat Endpoint):

**Aktuell**:
```typescript
{
  id: string,
  messages: Message[],
  presetId?: string,      // Option 1
  roleId?: string,        // Option 2
  styleId?: string,
  contextId?: string,
  modeId?: string,
}
```

**Klarstellung nötig**:
- Was passiert wenn **sowohl** `presetId` als auch `roleId` angegeben sind?
- Priorität sollte klar sein: presetId > manuelle Auswahl

**Empfehlung**: Klarstellung in API_DESIGN.md ergänzen:
```typescript
// Priority logic:
// 1. If presetId is provided, use preset (ignore manual IDs)
// 2. If no presetId, use manual component IDs
// 3. If neither, use default system prompt
```

### 3. Prompt Builder

**systemPatterns.md** vs **API_DESIGN.md**:

**systemPatterns.md** zeigt:
```typescript
if (preset.role) {
  parts.push(`# Role\n${preset.role.content}`)
}
```

**Frage**: Was passiert wenn ein Preset nur 2 Komponenten hat?
- Sollte funktionieren!
- Prompt Builder muss null-checks haben
- Das ist bereits korrekt implementiert in systemPatterns.md

**Status**: ✅ Korrekt

### 4. Component Deletion Cascade

**DATABASE_SCHEMA.md**:

**Problem**: Wenn Component gelöscht wird, bleiben Presets mit null-Referenzen

**Optionen**:
1. Prevent deletion (Error 409) ← Current approach
2. Set to NULL (ON DELETE SET NULL)
3. Delete presets too (CASCADE)

**Empfehlung**: Option 2 (SET NULL) ist besser für Flexibilität

```sql
"roleId" UUID REFERENCES "Component"("id") ON DELETE SET NULL,
```

**Rationale**:
- User kann Preset behalten, auch wenn eine Komponente fehlt
- Preset wird "incomplete" aber nicht gelöscht
- UI zeigt Warnung: "Preset incomplete: Role component missing"
- User kann neue Komponente zuweisen

**Update nötig**: DATABASE_SCHEMA.md Migration korrigieren

### 5. Rate Limiting

**API_DESIGN.md**: Markiert als "Future"

**Frage**: Ist das ok für MVP?

**Antwort**: Ja, für MVP ok, ABER:
- Free tier braucht Limits (50 requests/hour?)
- Kann später hinzugefügt werden
- Chat SDK hat möglicherweise bereits Rate Limiting

**Status**: ✅ Ok für MVP

---

## ✅ Was stimmt

### Hervorragende Punkte

1. **Auth-First Pattern**: Alle Endpoints prüfen Session zuerst
2. **Zod Validation**: Konsequent auf Client und Server
3. **Error Handling**: Konsistentes Format
4. **Migration Strategy**: Klar und praktikabel
5. **Indexes**: Richtig geplant für Performance
6. **Extension over Modification**: Wird befolgt
7. **Transaction Usage**: Für Preset-Erstellung richtig implementiert
8. **JSONB for presetHistory**: Gute Wahl für MVP

### Dokumentation

- **Sehr umfassend**: Alle Aspekte abgedeckt
- **Gute Beispiele**: Request/Response Beispiele hilfreich
- **ER-Diagramme**: Klar und verständlich
- **Migration Steps**: Gut dokumentiert

---

## 📋 Änderungen Checkliste

### Kritisch (MUSS korrigiert werden)

- [ ] **DATABASE_SCHEMA.md**: Preset Schema korrigieren (alle 4 IDs nullable)
- [ ] **DATABASE_SCHEMA.md**: Migration SQL korrigieren (NOT NULL entfernen)
- [ ] **API_DESIGN.md**: Zod Schema korrigieren (alle 4 IDs optional)
- [ ] **API_DESIGN.md**: Validation Logic korrigieren (mindestens 1 erforderlich)
- [ ] **API_DESIGN.md**: Beispiele mit teilweisen Presets ergänzen

### Empfohlen (SOLLTE ergänzt werden)

- [ ] **API_DESIGN.md**: Klarstellung Priorität presetId vs. manuelle IDs
- [ ] **DATABASE_SCHEMA.md**: ON DELETE SET NULL für Component-Referenzen
- [ ] **DATABASE_SCHEMA.md**: Beispiele mit 2-Komponenten-Presets
- [ ] **API_DESIGN.md**: Error Message für "incomplete preset" Szenario

### Optional (KANN ergänzt werden)

- [ ] **API_DESIGN.md**: Rate Limiting Details (kann später kommen)
- [ ] **DATABASE_SCHEMA.md**: Soft Deletes Überlegungen (Post-MVP)

---

## Zusammenfassung für Junior Dev

**Was sehr gut gemacht wurde:**
✅ Grundlegende Architektur solid
✅ Auth und Validation konsequent
✅ Dokumentation umfassend
✅ Migration Strategy durchdacht

**Was korrigiert werden muss:**
🔴 **Kritisch**: Preset Components müssen optional sein (nicht required)
- Das ist ein fundamentaler Design-Fehler
- Widerspricht der Vision explizit
- Muss in Schema, Migration, API und Validation geändert werden

**Weitere Anpassungen:**
🟡 ON DELETE SET NULL für bessere Flexibilität
🟡 Beispiele mit teilweisen Presets ergänzen
🟡 Priorität-Logic für presetId vs. manual IDs klären

**Gesamtbewertung**: Sehr gute Arbeit, aber der Preset-Fehler ist kritisch und muss vor der Implementation korrigiert werden. Die Dokumentation ist ansonsten exzellent.

---

**Review durchgeführt von**: Cline (basierend auf VISION.md und Memory Bank)  
**Datum**: 2024-11-13  
**Nächste Schritte**: Korrekturen vornehmen, dann kann mit Implementation begonnen werden
