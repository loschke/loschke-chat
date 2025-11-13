# Database Schema

## Overview

This document describes the complete database schema for the project. We build on top of the **Chat SDK's existing schema** and add our modular prompt management tables.

**Key Principle:** We extend, never modify the existing Chat SDK tables. This ensures we can upgrade Chat SDK versions without conflicts.

---

## Schema Architecture

### Existing Tables (From Chat SDK)

These tables are provided by Chat SDK and should **NOT be modified**:

```
User ─┬─ Chat ─┬─ Message_v2
      │        ├─ Vote_v2
      │        └─ Stream
      │
      ├─ Document ─── Suggestion
      │
      └─ (Our extensions below)
```

### Our Extensions

New tables we add for modular prompt management:

```
User ─┬─ Component (role, style, context, mode)
      │
      ├─ Preset (combination of 0-4 components)
      │
      └─ Subscription (Polar billing)

Chat.presetHistory (JSONB field we add)
```

---

## Existing Tables (Chat SDK)

### User

**Purpose:** User accounts managed by Auth.js

**Schema:**
```typescript
export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull(),
  password: varchar("password", { length: 64 }),
});
```

**Fields:**
- `id` - UUID, primary key
- `email` - User's email address (unique, indexed by Auth.js)
- `password` - Hashed password (nullable for OAuth users)

**Managed By:** Auth.js (we don't modify this)

**Relations:**
- → `Chat` (one user has many chats)
- → `Document` (one user has many documents)
- → `Component` (one user has many components) ← **Our addition**
- → `Preset` (one user has many presets) ← **Our addition**
- → `Subscription` (one user has one subscription) ← **Our addition**

---

### Chat

**Purpose:** Conversation threads

**Schema:**
```typescript
export const chat = pgTable("Chat", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  createdAt: timestamp("createdAt").notNull(),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
  lastContext: jsonb("lastContext").$type<AppUsage | null>(),
  
  // ⚠️ Fields we ADD (see migration section):
  // currentPresetId: uuid("currentPresetId").references(() => preset.id),
  // presetHistory: jsonb("presetHistory"),
  // totalTokens: integer("totalTokens").default(0),
  // provider: varchar("provider", { length: 32 }).default("anthropic"),
});
```

**Existing Fields:**
- `id` - UUID, primary key
- `createdAt` - Timestamp when chat was created
- `title` - Chat title (auto-generated or user-set)
- `userId` - Foreign key to User
- `visibility` - "public" or "private"
- `lastContext` - JSONB, app-specific usage data

**Fields We Add (via migration):**
- `currentPresetId` - UUID, nullable, references Preset
- `presetHistory` - JSONB array tracking preset changes
- `totalTokens` - Integer, cumulative token usage
- `provider` - String, which LLM provider ("anthropic", "openai")

**PresetHistory Structure:**
```typescript
type PresetHistoryEntry = {
  timestamp: string // ISO datetime
  presetId: string | null // null = no preset
  presetName: string
  changedComponents?: string[] // which components changed (manual mode)
}
```

**Relations:**
- → `User` (many chats belong to one user)
- → `Message_v2` (one chat has many messages)
- → `Vote_v2` (one chat has many votes)
- → `Stream` (one chat has many streams)
- → `Preset` (one chat optionally references one preset) ← **Our addition**

---

### Message_v2

**Purpose:** Chat messages with parts (new format)

**Schema:**
```typescript
export const message = pgTable("Message_v2", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(), // "user" | "assistant" | "system"
  parts: json("parts").notNull(), // Message parts (text, tool calls, etc.)
  attachments: json("attachments").notNull(), // File attachments
  createdAt: timestamp("createdAt").notNull(),
});
```

**We don't modify this table.** Messages are managed by Chat SDK.

---

### Document, Suggestion, Vote_v2, Stream

**Purpose:** Document creation, suggestions, voting, streaming metadata

**We don't use these features in MVP**, but they exist in the schema.

**Note:** Leave them as-is. They don't conflict with our additions.

---

## Our New Tables

### Component

**Purpose:** Store reusable prompt components (Role, Style, Context, Mode)

**Schema:**
```typescript
import { pgTable, uuid, text, timestamp, integer, pgEnum, index } from 'drizzle-orm/pg-core'

// Enum for component types
export const componentTypeEnum = pgEnum('component_type', [
  'role', 
  'style', 
  'context', 
  'mode'
])

export const component = pgTable('Component', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  type: componentTypeEnum('type').notNull(),
  name: text('name').notNull(),
  content: text('content').notNull(),
  description: text('description'),
  tags: text('tags').array().default([]),
  usageCount: integer('usageCount').notNull().default(0),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({
  userTypeIdx: index('component_user_type_idx').on(table.userId, table.type),
  userNameIdx: index('component_user_name_idx').on(table.userId, table.name),
}))

export type Component = InferSelectModel<typeof component>
```

**Fields:**
- `id` - UUID, primary key
- `userId` - Foreign key to User (owner)
- `type` - Enum: 'role', 'style', 'context', 'mode'
- `name` - Display name (e.g., "Marketing Expert")
- `content` - The actual prompt text
- `description` - Optional description for user reference
- `tags` - Array of strings for categorization
- `usageCount` - Track how often used (for sorting)
- `createdAt` - Timestamp when created
- `updatedAt` - Timestamp when last modified

**Indexes:**
- `(userId, type)` - Fast filtering by user and type
- `(userId, name)` - Fast search by name

**Validation Rules:**
- `name`: 1-100 characters, required
- `content`: 1-5000 characters, required
- `description`: 0-500 characters, optional
- `tags`: Array of strings, optional
- User can have unlimited components (Pro tier)
- Free tier: Max 20 components (enforced in API)

**Example Data:**
```typescript
{
  id: "uuid-123",
  userId: "user-uuid",
  type: "role",
  name: "Marketing Expert",
  content: "You are an experienced Social Media Marketing Expert with specialization on LinkedIn and Instagram. You know current trends, best practices for engagement, and understand platform algorithms. You give concrete, actionable recommendations.",
  description: "For LinkedIn and Instagram content creation",
  tags: ["marketing", "social-media", "linkedin"],
  usageCount: 47,
  createdAt: "2025-01-15T10:30:00Z",
  updatedAt: "2025-01-15T10:30:00Z"
}
```

**Relations:**
- → `User` (many components belong to one user)
- ← `Preset` (one component used in many presets)

---

### Preset

**Purpose:** Save combinations of 0-4 components for quick activation

**IMPORTANT:** All 4 component IDs are **OPTIONAL** (nullable), allowing maximum flexibility.

**Schema:**
```typescript
export const preset = pgTable('Preset', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  
  // ALL OPTIONAL - user can provide 1-4 components
  roleId: uuid('roleId')
    .references(() => component.id, { onDelete: 'set null' }),
  styleId: uuid('styleId')
    .references(() => component.id, { onDelete: 'set null' }),
  contextId: uuid('contextId')
    .references(() => component.id, { onDelete: 'set null' }),
  modeId: uuid('modeId')
    .references(() => component.id, { onDelete: 'set null' }),
  
  usageCount: integer('usageCount').notNull().default(0),
  lastUsedAt: timestamp('lastUsedAt'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({
  userIdx: index('preset_user_idx').on(table.userId),
  usageIdx: index('preset_usage_idx').on(table.usageCount),
  lastUsedIdx: index('preset_last_used_idx').on(table.lastUsedAt),
}))

export type Preset = InferSelectModel<typeof preset>
```

**Fields:**
- `id` - UUID, primary key
- `userId` - Foreign key to User (owner)
- `name` - Preset name (e.g., "LinkedIn Pro")
- `description` - Optional description
- `roleId` - **OPTIONAL** FK to Component (type='role')
- `styleId` - **OPTIONAL** FK to Component (type='style')
- `contextId` - **OPTIONAL** FK to Component (type='context')
- `modeId` - **OPTIONAL** FK to Component (type='mode')
- `usageCount` - Track usage frequency
- `lastUsedAt` - Timestamp when last used
- `createdAt` - Creation timestamp
- `updatedAt` - Last modification timestamp

**Indexes:**
- `(userId)` - Fast filtering by user
- `(usageCount)` - Sort by popularity
- `(lastUsedAt)` - Sort by recency

**Validation Rules:**
- `name`: 1-100 characters, required
- `description`: 0-500 characters, optional
- **At least 1 component ID** must be provided (enforced in API)
- **At most 4 component IDs** (one of each type)
- If provided, component IDs must reference existing components owned by same user
- If provided, component IDs must be correct type (enforced in API)
- Free tier: Max 5 presets (enforced in API)

**ON DELETE Behavior:**
- When component is deleted → `SET NULL` (preset becomes incomplete but not deleted)
- UI can show warning: "Preset incomplete: Role component missing"
- User can assign new component to fix

**Example Data:**

```typescript
// Example 1: Full preset (all 4 components)
{
  id: "preset-full",
  userId: "user-uuid",
  name: "LinkedIn Pro",
  description: "For professional LinkedIn content creation",
  roleId: "component-role-uuid",
  styleId: "component-style-uuid",
  contextId: "component-context-uuid",
  modeId: "component-mode-uuid",
  usageCount: 23,
  lastUsedAt: "2025-01-20T14:30:00Z",
  createdAt: "2025-01-15T10:00:00Z",
  updatedAt: "2025-01-15T10:00:00Z"
}

// Example 2: Minimal preset (only role + mode)
{
  id: "preset-minimal",
  userId: "user-uuid",
  name: "Quick Expert",
  description: "Fast expert mode without context",
  roleId: "component-role-uuid",
  styleId: null,
  contextId: null,
  modeId: "component-mode-uuid",
  usageCount: 12,
  lastUsedAt: "2025-01-19T09:15:00Z",
  createdAt: "2025-01-16T14:00:00Z",
  updatedAt: "2025-01-16T14:00:00Z"
}

// Example 3: Partial preset (role + style only)
{
  id: "preset-partial",
  userId: "user-uuid",
  name: "Professional Voice",
  description: "Just the professional tone",
  roleId: "component-role-uuid",
  styleId: "component-style-uuid",
  contextId: null,
  modeId: null,
  usageCount: 8,
  lastUsedAt: "2025-01-18T16:45:00Z",
  createdAt: "2025-01-17T11:30:00Z",
  updatedAt: "2025-01-17T11:30:00Z"
}
```

**Relations:**
- → `User` (many presets belong to one user)
- → `Component` (preset optionally references 1-4 components)
- ← `Chat` (preset optionally used in chats)

**Query Pattern (with components):**
```typescript
const preset = await db.query.preset.findFirst({
  where: eq(preset.id, presetId),
  with: {
    role: true,
    style: true,
    context: true,
    mode: true,
  }
})

// Result includes full component data (nulls for unused):
// {
//   id, name, description, ...
//   role: { id, name, content, ... } | null,
//   style: { id, name, content, ... } | null,
//   context: { id, name, content, ... } | null,
//   mode: { id, name, content, ... } | null
// }
```

---

### Subscription

**Purpose:** Track user subscriptions via Polar

**Schema:**
```typescript
export const subscription = pgTable('Subscription', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  
  // Polar IDs
  polarCustomerId: text('polarCustomerId').notNull().unique(),
  polarSubscriptionId: text('polarSubscriptionId').unique(),
  
  // Plan details
  plan: varchar('plan', { length: 32 }).notNull().default('free'),
  status: varchar('status', { length: 32 }).notNull().default('active'),
  
  // Billing cycle
  currentPeriodStart: timestamp('currentPeriodStart'),
  currentPeriodEnd: timestamp('currentPeriodEnd'),
  cancelAtPeriodEnd: boolean('cancelAtPeriodEnd').notNull().default(false),
  
  // Metadata
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({
  userIdx: index('subscription_user_idx').on(table.userId),
  polarCustomerIdx: index('subscription_polar_customer_idx').on(table.polarCustomerId),
}))

export type Subscription = InferSelectModel<typeof subscription>
```

**Fields:**
- `id` - UUID, primary key
- `userId` - Foreign key to User (unique - one subscription per user)
- `polarCustomerId` - Polar customer ID (unique)
- `polarSubscriptionId` - Polar subscription ID (unique, nullable)
- `plan` - Plan name: "free", "pro", "business"
- `status` - Status: "active", "cancelled", "past_due"
- `currentPeriodStart` - Billing cycle start
- `currentPeriodEnd` - Billing cycle end
- `cancelAtPeriodEnd` - User requested cancellation
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

**Indexes:**
- `(userId)` - Fast lookup by user
- `(polarCustomerId)` - Fast lookup from Polar webhooks

**Plan Limits:**
```typescript
const PLAN_LIMITS = {
  free: {
    maxPresets: 5,
    maxComponents: 20,
    tokensPerMonth: 50000,
    providers: ['openai']
  },
  pro: {
    maxPresets: Infinity,
    maxComponents: Infinity,
    tokensPerMonth: 500000,
    providers: ['openai', 'anthropic']
  },
  business: {
    maxPresets: Infinity,
    maxComponents: Infinity,
    tokensPerMonth: 2000000,
    providers: ['openai', 'anthropic']
  }
}
```

**Example Data:**
```typescript
{
  id: "subscription-uuid",
  userId: "user-uuid",
  polarCustomerId: "cus_abc123",
  polarSubscriptionId: "sub_xyz789",
  plan: "pro",
  status: "active",
  currentPeriodStart: "2025-01-01T00:00:00Z",
  currentPeriodEnd: "2025-02-01T00:00:00Z",
  cancelAtPeriodEnd: false,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z"
}
```

**Relations:**
- → `User` (one subscription belongs to one user)

---

## Entity Relationship Diagram

```
┌─────────────┐
│    User     │
│─────────────│
│ id (PK)     │
│ email       │
│ password    │
└──────┬──────┘
       │
       ├──────────────────────────────────────────┐
       │                                          │
       ▼                                          ▼
┌─────────────┐                         ┌──────────────┐
│ Component   │                         │ Subscription │
│─────────────│                         │──────────────│
│ id (PK)     │                         │ id (PK)      │
│ userId (FK) │                         │ userId (FK)  │
│ type        │◄────┐                   │ plan         │
│ name        │     │                   │ status       │
│ content     │     │                   └──────────────┘
│ ...         │     │
└─────────────┘     │
       ▲            │
       │            │
       │     ┌──────┴──────┐
       │     │             │
       │     │   Preset    │
       │     │─────────────│
       │     │ id (PK)     │
       └─────┤ userId (FK) │
             │ roleId (FK) ├──┐ (all nullable)
             │ styleId(FK) ├──┤
             │ contextId   ├──┤
             │ modeId (FK) ├──┘
             └──────┬──────┘
                    │
                    ▼
             ┌─────────────┐
             │    Chat     │
             │─────────────│
             │ id (PK)     │
             │ userId (FK) │
             │ presetId    │◄── Optional reference
             │ ...         │
             └──────┬──────┘
                    │
                    ▼
             ┌──────────────┐
             │  Message_v2  │
             │──────────────│
             │ id (PK)      │
             │ chatId (FK)  │
             │ role         │
             │ parts        │
             └──────────────┘
```

**Key Relationships:**
- User → Component (1:N)
- User → Preset (1:N)
- User → Subscription (1:1)
- User → Chat (1:N)
- Component ← Preset (N:M via 4 optional FKs)
- Preset ← Chat (1:N, optional)
- Chat → Message_v2 (1:N)

---

## Migration Strategy

### Phase 1: Add New Tables

Create migration file: `0001_add_prompt_components.sql`

```sql
-- Create enum for component types
CREATE TYPE component_type AS ENUM ('role', 'style', 'context', 'mode');

-- Create Component table
CREATE TABLE "Component" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "type" component_type NOT NULL,
  "name" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "description" TEXT,
  "tags" TEXT[] DEFAULT '{}',
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for Component
CREATE INDEX "component_user_type_idx" ON "Component"("userId", "type");
CREATE INDEX "component_user_name_idx" ON "Component"("userId", "name");

-- Create Preset table (ALL component IDs are NULLABLE)
CREATE TABLE "Preset" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "roleId" UUID REFERENCES "Component"("id") ON DELETE SET NULL,
  "styleId" UUID REFERENCES "Component"("id") ON DELETE SET NULL,
  "contextId" UUID REFERENCES "Component"("id") ON DELETE SET NULL,
  "modeId" UUID REFERENCES "Component"("id") ON DELETE SET NULL,
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "lastUsedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for Preset
CREATE INDEX "preset_user_idx" ON "Preset"("userId");
CREATE INDEX "preset_usage_idx" ON "Preset"("usageCount");
CREATE INDEX "preset_last_used_idx" ON "Preset"("lastUsedAt");

-- Create Subscription table
CREATE TABLE "Subscription" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
  "polarCustomerId" TEXT NOT NULL UNIQUE,
  "polarSubscriptionId" TEXT UNIQUE,
  "plan" VARCHAR(32) NOT NULL DEFAULT 'free',
  "status" VARCHAR(32) NOT NULL DEFAULT 'active',
  "currentPeriodStart" TIMESTAMP,
  "currentPeriodEnd" TIMESTAMP,
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for Subscription
CREATE INDEX "subscription_user_idx" ON "Subscription"("userId");
CREATE INDEX "subscription_polar_customer_idx" ON "Subscription"("polarCustomerId");
```

### Phase 2: Extend Chat Table

Create migration file: `0002_extend_chat_table.sql`

```sql
-- Add new columns to Chat table
ALTER TABLE "Chat" 
  ADD COLUMN "currentPresetId" UUID REFERENCES "Preset"("id") ON DELETE SET NULL,
  ADD COLUMN "presetHistory" JSONB DEFAULT '[]',
  ADD COLUMN "totalTokens" INTEGER DEFAULT 0,
  ADD COLUMN "provider" VARCHAR(32) DEFAULT 'anthropic';

-- Create index for preset tracking
CREATE INDEX "chat_preset_idx" ON "Chat"("currentPresetId");
```

### Phase 3: Drizzle Schema Update

Update `lib/db/schema.ts`:

```typescript
// Add to existing file
import { pgEnum } from 'drizzle-orm/pg-core'

// Add component type enum
export const componentTypeEnum = pgEnum('component_type', [
  'role', 'style', 'context', 'mode'
])

// Add Component table (see schema above)
export const component = pgTable(...)

// Add Preset table (see schema above) 
// IMPORTANT: All 4 component IDs are nullable!
export const preset = pgTable(...)

// Add Subscription table (see schema above)
export const subscription = pgTable(...)

// Extend Chat table type
export const chat = pgTable("Chat", {
  // ... existing fields ...
  currentPresetId: uuid("currentPresetId").references(() => preset.id, { onDelete: 'set null' }),
  presetHistory: jsonb("presetHistory").$type<PresetHistoryEntry[]>(),
  totalTokens: integer("totalTokens").default(0),
  provider: varchar("provider", { length: 32 }).default("anthropic"),
})
```

### Running Migrations

```bash
# Generate migration from schema
pnpm db:generate

# Review generated migration
cat lib/db/migrations/0001_*.sql

# Apply to database
pnpm db:migrate

# Or push directly in development
pnpm db:push
```

---

## Data Integrity

### Constraints

**Component Constraints:**
- `userId` must exist (FK to User)
- `type` must be one of enum values
- `name` and `content` cannot be empty
- `usageCount` cannot be negative

**Preset Constraints:**
- `userId` must exist (FK to User)
- At least 1 component ID must be provided (enforced in API, not DB)
- If provided, component IDs must exist (FK to Component)
- If provided, components must belong to same user (enforced in API)
- If provided, components must be correct types (enforced in API)
- `name` cannot be empty

**Subscription Constraints:**
- `userId` must exist and be unique (1:1 relationship)
- `polarCustomerId` must be unique
- `plan` must be valid plan name
- `status` must be valid status value

### Cascade Deletes

**When User is deleted:**
- ✅ All Components deleted (CASCADE)
- ✅ All Presets deleted (CASCADE)
- ✅ Subscription deleted (CASCADE)
- ✅ All Chats deleted (CASCADE, from Chat SDK)

**When Component is deleted:**
- ✅ Preset references set to NULL (ON DELETE SET NULL)
- Preset becomes "incomplete" but not deleted
- UI can show warning: "This preset is incomplete"
- User can assign new component to fix

**Benefits of SET NULL:**
- User doesn't lose their preset configurations
- Can rebuild preset with new components
- Preserves usage statistics
- Better user experience

---

## Indexes Strategy

### Component Indexes

**Why `(userId, type)`:**
- Most common query: Get all roles/styles/contexts/modes for user
- Fast filtering: `WHERE userId = ? AND type = ?`

**Why `(userId, name)`:**
- Search by name: `WHERE userId = ? AND name LIKE ?`
- Autocomplete functionality

### Preset Indexes

**Why `(userId)`:**
- List user's presets: `WHERE userId = ?`

**Why `(usageCount)`:**
- Sort by popularity: `ORDER BY usageCount DESC`
- Show "most used" first

**Why `(lastUsedAt)`:**
- Sort by recency: `ORDER BY lastUsedAt DESC`
- Show "recently used" section

### Performance Expectations

**With indexes:**
- User component list: <10ms
- Preset with components: <20ms
- Search components: <50ms
- Create/update operations: <50ms

**Without indexes:**
- Queries could be 10-100x slower
- Unacceptable UX at scale

---

## Query Patterns

### Get User's Components by Type

```typescript
const roles = await db.query.components.findMany({
  where: and(
    eq(components.userId, userId),
    eq(components.type, 'role')
  ),
  orderBy: [desc(components.usageCount)],
})
```

### Get Preset with All Components (handles nulls)

```typescript
const preset = await db.query.presets.findFirst({
  where: eq(presets.id, presetId),
  with: {
    role: true,      // Can be null
    style: true,     // Can be null
    context: true,   // Can be null
    mode: true,      // Can be null
  }
})

// Returns:
// {
//   id, name, description, ...
//   role: Component | null,
//   style: Component | null,
//   context: Component | null,
//   mode: Component | null
// }
```

### Check Subscription Limits

```typescript
const subscription = await db.query.subscriptions.findFirst({
  where: eq(subscriptions.userId, userId)
})

const plan = subscription?.plan || 'free'
const limits = PLAN_LIMITS[plan]

const componentCount = await db
  .select({ count: count() })
  .from(components)
  .where(eq(components.userId, userId))

if (componentCount[0].count >= limits.maxComponents) {
  throw new Error('Component limit reached')
}
```

### Track Component Usage

```typescript
await db.update(components)
  .set({
    usageCount: sql`${components.usageCount} + 1`,
    updatedAt: new Date()
  })
  .where(eq(components.id, componentId))
```

### Track Preset Usage

```typescript
await db.update(presets)
  .set({
    usageCount: sql`${presets.usageCount} + 1`,
    lastUsedAt: new Date(),
    updatedAt: new Date()
  })
  .where(eq(presets.id, presetId))
```

### Get Chat with Preset

```typescript
const chat = await db.query.chats.findFirst({
  where: eq(chats.id, chatId),
  with: {
    currentPreset: {
      with: {
        role: true,
        style: true,
        context: true,
        mode: true,
      }
    }
  }
})
```

---

## Sample Data

### Complete User Setup

```typescript
// User
{
  id: "user-123",
  email: "rico@example.com",
  password: "hashed_password"
}

// Subscription
{
  id: "sub-123",
  userId: "user-123",
  polarCustomerId: "cus_abc",
  polarSubscriptionId: "sub_xyz",
  plan: "pro",
  status: "active"
}

// Components
[
  {
    id: "comp-role-1",
    userId: "user-123",
    type: "role",
    name: "Marketing Expert",
    content: "You are a social media marketing expert...",
    usageCount: 47
  },
  {
    id: "comp-style-1",
    userId: "user-123",
    type: "style",
    name: "Professional B2B",
    content: "Use professional, concise language...",
    usageCount: 35
  },
  {
    id: "comp-context-1",
    userId: "user-123",
    type: "context",
    name: "Tech Startup",
    content: "Company: TechCorp, Product: SaaS...",
    usageCount: 23
  },
  {
    id: "comp-mode-1",
    userId: "user-123",
    type: "mode",
    name: "Ship Mode",
    content: "Focus on execution, concrete steps...",
    usageCount: 31
  }
]

// Preset (full - all 4 components)
{
  id: "preset-1",
  userId: "user-123",
  name: "LinkedIn Pro",
  description: "For LinkedIn content creation",
  roleId: "comp-role-1",
  styleId: "comp-style-1",
  contextId: "comp-context-1",
  modeId: "comp-mode-1",
  usageCount: 23,
  lastUsedAt: "2025-01-20T14:30:00Z"
}

// Preset (minimal - only 2 components)
{
  id: "preset-2",
  userId: "user-123",
  name: "Quick Expert",
  description: "Fast expert responses",
  roleId: "comp-role-1",
  styleId: null,
  contextId: null,
  modeId: "comp-mode-1",
  usageCount: 12,
  lastUsedAt: "2025-01-19T10:15:00Z"
}

// Chat with preset
{
  id: "chat-123",
  userId: "user-123",
  title: "LinkedIn post ideas",
  currentPresetId: "preset-1",
  presetHistory: [
    {
      timestamp: "2025-01-20T14:30:00Z",
      presetId: "preset-1",
      presetName: "LinkedIn Pro"
    }
  ],
  totalTokens: 1250,
  provider: "anthropic"
}
```

---

## Database Size Estimates

### Per User (Pro Plan, Heavy Usage)

**Components:** 50 components × 1 KB avg = 50 KB  
**Presets:** 20 presets × 1 KB = 20 KB  
**Chats:** 100 chats × 2 KB = 200 KB  
**Messages:** 1000 messages × 1 KB = 1 MB  
**Total per user:** ~1.3 MB

### At Scale

**1,000 users:** 1.3 GB  
**10,000 users:** 13 GB  
**100,000 users:** 130 GB

**Conclusion:** Database size is very manageable. Neon Postgres can easily handle this.

---

## Backup & Recovery

**Neon Automatic Backups:**
- Point-in-time recovery (7 days on free tier)
- Daily snapshots
- Can restore to any point in time

**Manual Backups:**
```bash
# Export schema
pg_dump $DATABASE_URL --schema-only > schema.sql

# Export data
pg_dump $DATABASE_URL --data-only > data.sql

# Export specific tables
pg_dump $DATABASE_URL -t Component -t Preset -t Subscription > our_tables.sql
```

---

## Security Considerations

### Row-Level Security (Future)

For multi-tenant in future (Phase 2), enable RLS:

```sql
-- Enable RLS on Component
ALTER TABLE "Component" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own components
CREATE POLICY "Users see own components"
  ON "Component"
  FOR SELECT
  USING (auth.uid() = "userId");
```

**For MVP:** Not needed since we check `userId` in application code.

### Data Encryption

**At Rest:** Neon encrypts all data at rest (AES-256)  
**In Transit:** All connections use TLS/SSL  
**Application:** Hash passwords with bcrypt (Auth.js handles this)

### Sensitive Data

**Never store:**
- Plain text passwords (Auth.js handles hashing)
- API keys in database (use environment variables)
- Credit card data (Polar handles this)

**Component content:**
- May contain client names, project details
- NOT encrypted (would prevent search)
- Deleted when user deletes account (CASCADE)

---

## Monitoring & Maintenance

### Queries to Monitor

**Slow queries:**
```sql
SELECT * FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

**Table sizes:**
```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Index usage:**
```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Maintenance Tasks

**Vacuum (automatic in Neon):**
- Reclaims space from deleted rows
- Updates statistics for query planner

**Analyze (automatic in Neon):**
- Gathers statistics about data distribution
- Helps query planner choose optimal plans

**Reindex (manual if needed):**
```sql
REINDEX TABLE "Component";
REINDEX TABLE "Preset";
```

---

## Testing Data

### Seed Script for Development

```typescript
// lib/db/seed.ts
import { db } from './index'
import { user, component, preset, subscription } from './schema'

export async function seed() {
  // Create test user
  const [testUser] = await db.insert(user).values({
    email: 'test@example.com',
    password: 'hashed_password'
  }).returning()
  
  // Create subscription
  await db.insert(subscription).values({
    userId: testUser.id,
    polarCustomerId: 'test_customer',
    plan: 'pro',
    status: 'active'
  })
  
  // Create components
  const [role] = await db.insert(component).values({
    userId: testUser.id,
    type: 'role',
    name: 'Marketing Expert',
    content: 'You are a social media marketing expert...'
  }).returning()
  
  const [style] = await db.insert(component).values({
    userId: testUser.id,
    type: 'style',
    name: 'Professional',
    content: 'Use professional tone...'
  }).returning()
  
  const [context] = await db.insert(component).values({
    userId: testUser.id,
    type: 'context',
    name: 'Tech Startup',
    content: 'Company info...'
  }).returning()
  
  const [mode] = await db.insert(component).values({
    userId: testUser.id,
    type: 'mode',
    name: 'Ship Mode',
    content: 'Focus on execution...'
  }).returning()
  
  // Create full preset
  await db.insert(preset).values({
    userId: testUser.id,
    name: 'LinkedIn Pro',
    description: 'Full preset example',
    roleId: role.id,
    styleId: style.id,
    contextId: context.id,
    modeId: mode.id
  })
  
  // Create minimal preset (only role + mode)
  await db.insert(preset).values({
    userId: testUser.id,
    name: 'Quick Expert',
    description: 'Minimal preset example',
    roleId: role.id,
    styleId: null,
    contextId: null,
    modeId: mode.id
  })
  
  console.log('Database seeded!')
}
```

Run with: `tsx lib/db/seed.ts`

---

## Summary

### What We Have

✅ **Existing Chat SDK Tables** - Users, Chats, Messages, etc.  
✅ **Our 3 New Tables** - Component, Preset, Subscription  
✅ **Extended Chat Table** - Preset tracking fields  
✅ **Proper Indexes** - For performance  
✅ **Cascading Deletes** - For data integrity  
✅ **ON DELETE SET NULL** - For preset flexibility  
✅ **Type Safety** - Drizzle ORM generates types  
✅ **Optional Components** - All 4 preset components are nullable

### Key Design Decisions

🎯 **Preset Flexibility** - 1-4 components allowed (not all 4 required)  
🎯 **SET NULL on Delete** - Presets survive component deletion  
🎯 **Extension Pattern** - New tables, don't modify existing  
🎯 **Type Safety** - Enums for component types  
🎯 **Usage Tracking** - For analytics and sorting

### What We Don't Have (Yet)

⏳ **Row-Level Security** - Not needed for single-user MVP  
⏳ **Soft Deletes** - Hard deletes are fine for MVP  
⏳ **Audit Logs** - Track changes (post-MVP)  
⏳ **Archiving** - Old data cleanup (post-MVP)

### Migration Checklist

- [ ] Add 3 new tables via migration
- [ ] Extend Chat table via migration
- [ ] Update Drizzle schema file
- [ ] Generate TypeScript types
- [ ] Test queries in development
- [ ] Seed test data
- [ ] Deploy to production

**Next Steps:** See `API_DESIGN.md` for how to interact with this schema.
