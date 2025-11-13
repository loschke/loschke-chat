# System Patterns

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js App Router                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────┐         ┌──────────────────┐            │
│  │  Chat Interface │◄────────┤ Original (SDK)   │            │
│  │  (Original)     │         │ - Auth.js        │            │
│  └────────┬───────┘         │ - shadcn/ui      │            │
│           │                  │ - AI SDK         │            │
│           │                  └──────────────────┘            │
│           │                                                   │
│           │  ┌──────────────────┐                            │
│           └─►│  Settings Sidebar │◄─┐                        │
│              │  (Custom)         │  │                        │
│              └───────┬───────────┘  │                        │
│                      │              │                        │
│              ┌───────▼────────┐    │                        │
│              │ Component      │    │                        │
│              │ Selector       │    │                        │
│              └───────┬────────┘    │                        │
│                      │              │                        │
│              ┌───────▼────────┐    │                        │
│              │ Preset         │    │                        │
│              │ Selector       │    │                        │
│              └───────┬────────┘    │                        │
│                      │              │                        │
│           ┌──────────▼──────────────▼────────┐              │
│           │     Prompt Builder (Custom)       │              │
│           │  - Combines components            │              │
│           │  - Generates system prompt        │              │
│           └──────────┬────────────────────────┘              │
│                      │                                        │
│           ┌──────────▼──────────────────────┐                │
│           │  Chat API Route (Modified)      │                │
│           │  - Injects system prompt         │                │
│           │  - Streams to AI providers       │                │
│           └──────────┬──────────────────────┘                │
│                      │                                        │
│           ┌──────────▼──────────────────────┐                │
│           │  AI SDK (Original)               │                │
│           │  - OpenAI, Anthropic, etc.       │                │
│           └──────────────────────────────────┘                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Component Relationships

```
User
  │
  ├──► Component Library
  │      │
  │      ├──► Role Components (many)
  │      ├──► Style Components (many)
  │      ├──► Context Components (many)
  │      └──► Mode Components (many)
  │
  └──► Preset Library
         │
         └──► Presets (many)
                │
                ├──► Optional: roleId → Role Component
                ├──► Optional: styleId → Style Component
                ├──► Optional: contextId → Context Component
                └──► Optional: modeId → Mode Component
```

## Key Technical Decisions

### 1. Fork Strategy: Extension over Modification

**Decision**: Build custom features as extensions, not modifications
**Rationale**: 
- Maintains updateability from Vercel AI Chatbot upstream
- Reduces merge conflicts
- Clear separation of concerns

**Implementation**:
- Original code stays in original locations
- Custom code in new directories:
  - `lib/prompts/` - Prompt building logic
  - `lib/components/` - Component management
  - `lib/presets/` - Preset management
  - `lib/subscriptions/` - Billing (future)
  - `components/component-lib/` - Custom UI components

### 2. Database: Extension Pattern

**Decision**: Extend database schema, don't modify existing tables
**Rationale**:
- Upstream updates won't conflict with our schema
- Original migrations remain intact
- Clear ownership of data

**Implementation**:
```sql
-- Original tables (from Chat SDK)
- users
- chats
- messages
- documents
- votes

-- Our extensions (new tables)
- components (user_id, type, name, content)
- presets (user_id, name, role_id, style_id, context_id, mode_id)
- subscriptions (user_id, tier, status) -- future
```

### 3. System Prompt Injection

**Decision**: Modify chat API route minimally, delegate to prompt builder
**Rationale**:
- Single point of injection
- Testable prompt building logic
- Easy to disable/enable per chat

**Implementation**:
```typescript
// In app/(chat)/api/chat/route.ts
import { buildSystemPrompt } from '@/lib/prompts/builder'

// Minimal modification:
const activePreset = await getActivePreset(userId, chatId)
const customSystemPrompt = activePreset 
  ? await buildSystemPrompt(activePreset)
  : undefined

const result = streamText({
  model: selectedModel,
  system: customSystemPrompt || defaultSystemPrompt,
  messages: coreMessages,
  // ... rest of config
})
```

### 4. Component Types: Enum vs. Table

**Decision**: Use TypeScript enum + database enum
**Rationale**:
- Type safety in code
- Database constraints
- Clear validation

**Implementation**:
```typescript
// In lib/db/schema.ts
export const componentTypeEnum = pgEnum('component_type', [
  'role',
  'style', 
  'context',
  'mode'
])

export const components = pgTable('components', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  type: componentTypeEnum('type').notNull(),
  name: text('name').notNull(),
  content: text('content').notNull(),
  // ...
})
```

### 5. Preset Flexibility: Optional Components

**Decision**: All 4 components are optional in a preset
**Rationale**:
- Maximum flexibility
- User might only need Role + Mode
- Supports gradual adoption

**Implementation**:
```typescript
export const presets = pgTable('presets', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  roleId: uuid('role_id'), // optional
  styleId: uuid('style_id'), // optional
  contextId: uuid('context_id'), // optional
  modeId: uuid('mode_id'), // optional
  // ...
})
```

## Design Patterns in Use

### 1. Repository Pattern (Database Access)

**Pattern**: Centralized database queries in `lib/db/queries.ts`
**Benefit**: Single source of truth, easy to test, consistent error handling

```typescript
// lib/db/queries.ts
export async function getComponentsByType(
  userId: string, 
  type: ComponentType
): Promise<Component[]> {
  return db.query.components.findMany({
    where: and(
      eq(components.userId, userId),
      eq(components.type, type)
    ),
    orderBy: [desc(components.usageCount)]
  })
}
```

### 2. Builder Pattern (System Prompts)

**Pattern**: Compose system prompts from components
**Benefit**: Flexible, testable, easy to extend

```typescript
// lib/prompts/builder.ts
export function buildSystemPrompt(preset: PresetWithComponents): string {
  const parts: string[] = []
  
  if (preset.role) {
    parts.push(`# Role\n${preset.role.content}`)
  }
  
  if (preset.style) {
    parts.push(`# Communication Style\n${preset.style.content}`)
  }
  
  if (preset.context) {
    parts.push(`# Context\n${preset.context.content}`)
  }
  
  if (preset.mode) {
    parts.push(`# Interaction Mode\n${preset.mode.content}`)
  }
  
  return parts.join('\n\n---\n\n')
}
```

### 3. Composition over Inheritance (UI Components)

**Pattern**: Wrap original components, don't modify them
**Benefit**: Original components stay intact, easier updates

```typescript
// components/component-lib/EnhancedChatInterface.tsx
import { Chat } from '@/components/chat' // Original

export function EnhancedChatInterface({ 
  activePreset,
  onPresetChange 
}: Props) {
  return (
    <div className="flex h-full">
      <SettingsSidebar 
        activePreset={activePreset}
        onPresetChange={onPresetChange}
      />
      <Chat /> {/* Original, unmodified */}
    </div>
  )
}
```

### 4. Optimistic UI Updates

**Pattern**: Update UI before server confirms
**Benefit**: Feels instant, better UX

```typescript
// When selecting a component
const handleComponentSelect = async (componentId: string) => {
  // Optimistic update
  setActiveComponent(componentId)
  
  // Server update
  try {
    await updateActiveComponent(componentId)
  } catch (error) {
    // Rollback on error
    setActiveComponent(previousComponentId)
    showError('Failed to update component')
  }
}
```

## Critical Implementation Paths

### Path 1: User Creates First Component

```
1. User clicks "Create Component"
   └─► ComponentCreationModal opens
   
2. User fills form (type, name, content)
   └─► Client-side validation (Zod)
   
3. User clicks "Save"
   └─► POST /api/components
       ├─► Auth check
       ├─► Validate with Zod schema
       ├─► Insert into database
       └─► Return created component
       
4. UI updates
   └─► Component appears in library
   └─► Can now be selected
```

### Path 2: User Creates Preset

```
1. User selects 1-4 components manually
   └─► UI shows selected components
   
2. User clicks "Save as Preset"
   └─► PresetCreationModal opens
   
3. User enters preset name
   └─► POST /api/presets
       ├─► Auth check
       ├─► Validate preset data
       ├─► Create preset with component references
       ├─► Increment component usage counts (transaction)
       └─► Return created preset
       
4. Preset appears in library
   └─► Can now be activated with one click
```

### Path 3: User Starts Chat with Preset

```
1. User clicks preset in sidebar
   └─► Preset becomes "active"
   
2. User types message
   └─► POST /api/chat
       ├─► Get active preset for user
       ├─► Load all referenced components
       ├─► Build system prompt from components
       ├─► Pass to AI SDK streamText()
       └─► Stream response back
       
3. AI response includes preset context
   └─► User sees value immediately
```

## Component State Management

### Client State (React)

```typescript
// Managed with React hooks
- activePreset: Preset | null
- componentLibrary: Component[]
- presetLibrary: Preset[]
- isLoading: boolean
- error: Error | null
```

### Server State (Database)

```typescript
// Persisted in Postgres
- components: Component[]
- presets: Preset[]
- user preferences
- usage statistics
```

### Synchronization Strategy

- **Optimistic Updates**: UI updates immediately
- **Server Confirmation**: Background sync validates
- **Conflict Resolution**: Server always wins
- **Retry Logic**: Auto-retry failed requests

## Error Handling Strategy

### Client-Side Errors

```typescript
try {
  await createComponent(data)
} catch (error) {
  if (error instanceof ValidationError) {
    showFormErrors(error.details)
  } else if (error instanceof NetworkError) {
    showRetryDialog()
  } else {
    showGenericError()
  }
}
```

### Server-Side Errors

```typescript
export async function POST(req: Request) {
  try {
    // ... operation
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Unexpected error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

## Performance Considerations

### Database
- Index on `(userId, type)` for component queries
- Index on `userId` for preset queries
- Use `select()` to fetch only needed fields
- Implement pagination for large lists

### API Routes
- Stream responses for LLM interactions
- Set appropriate timeout limits
- Implement rate limiting per user

### Frontend
- Server Components by default
- Lazy load heavy components
- Optimize bundle size
- Use React Server Actions where appropriate

## Security Patterns

### Authentication
- Every protected endpoint checks `await auth()`
- No operations without valid session

### Authorization
- Users can only access their own data
- Always filter by `userId` in queries
- Validate ownership before updates/deletes

### Input Validation
- Zod schemas on client and server
- Sanitize user-generated content
- Prevent XSS in component content (React escapes by default)

### Rate Limiting
- Implement for expensive operations
- Prevent abuse of free tier
- Different limits per subscription tier

---

**Key Principle**: All patterns serve the goal of maintaining updateability from upstream while providing custom functionality through clean extensions.
