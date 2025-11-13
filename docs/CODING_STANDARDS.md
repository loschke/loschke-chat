# Coding Standards

## Philosophy

Write code that is:
- **Clear** over clever
- **Simple** over sophisticated
- **Consistent** with Chat SDK patterns
- **Type-safe** always
- **Maintainable** for future developers

---

## General Principles

### 1. Follow Chat SDK Conventions
Since we build on Chat SDK, match their existing patterns:
- Use their folder structure
- Follow their naming conventions
- Use their components where possible
- Match their code style

### 2. TypeScript Strict Mode
**Always enabled.** No exceptions.

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true
  }
}
```

### 3. No `any` Types
Use `unknown` with type guards instead.

```typescript
// ❌ Bad
function handleData(data: any) {
  return data.name
}

// ✅ Good
function handleData(data: unknown) {
  if (isValidData(data)) {
    return data.name
  }
  throw new Error('Invalid data')
}

function isValidData(data: unknown): data is { name: string } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'name' in data &&
    typeof data.name === 'string'
  )
}
```

### 4. Explicit Return Types
All functions must declare return types.

```typescript
// ❌ Bad
async function getPreset(id: string) {
  return db.query.presets.findFirst({
    where: eq(presets.id, id)
  })
}

// ✅ Good
async function getPreset(id: string): Promise<Preset | undefined> {
  return db.query.presets.findFirst({
    where: eq(presets.id, id)
  })
}
```

---

## File Organization

### Naming Conventions

**Files:**
- Components: `PascalCase.tsx` (e.g., `PresetSelector.tsx`)
- Utils/Helpers: `kebab-case.ts` (e.g., `build-system-prompt.ts`)
- API Routes: `route.ts` (Next.js convention)
- Types: `types.ts` or co-located with usage

**Variables & Functions:**
- Variables: `camelCase` (e.g., `currentPreset`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_COMPONENTS`)
- Functions: `camelCase` (e.g., `buildSystemPrompt`)
- Components: `PascalCase` (e.g., `PresetSelector`)
- Types/Interfaces: `PascalCase` (e.g., `ComponentType`)

### Import Organization

Always order imports in this sequence:

```typescript
// 1. React & Next.js
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// 2. External libraries
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

// 3. Internal utils/lib
import { db } from '@/lib/db'
import { auth } from '@/auth'

// 4. UI Components
import { Button } from '@/components/ui/button'
import { PresetSelector } from '@/components/preset-selector'

// 5. Types
import type { Preset, Component } from '@/lib/db/schema'

// 6. Styles (if any)
import styles from './component.module.css'
```

Use `@/` path alias for imports (configured in `tsconfig.json`).

---

## Component Patterns

### React Components

**Structure:**
```typescript
// 1. Imports
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { Preset } from '@/lib/db/schema'

// 2. Types/Interfaces
interface PresetSelectorProps {
  presets: Preset[]
  currentPresetId?: string
  onSelect: (presetId: string) => void
  disabled?: boolean
}

// 3. Component
export function PresetSelector({
  presets,
  currentPresetId,
  onSelect,
  disabled = false,
}: PresetSelectorProps) {
  // 3a. Hooks first
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  
  // 3b. Derived state
  const currentPreset = presets.find(p => p.id === currentPresetId)
  
  // 3c. Effects
  useEffect(() => {
    // ...
  }, [])
  
  // 3d. Event handlers
  const handleSelect = (id: string) => {
    onSelect(id)
    setIsOpen(false)
  }
  
  // 3e. Early returns for loading/error states
  if (presets.length === 0) {
    return <EmptyState />
  }
  
  // 3f. Main render
  return (
    <div>
      {/* ... */}
    </div>
  )
}
```

### Server Components vs Client Components

**Default: Server Components**
```typescript
// No 'use client' needed
export default async function PresetLibraryPage() {
  const session = await auth()
  const presets = await db.query.presets.findMany({
    where: eq(presets.userId, session.user.id)
  })
  
  return <PresetList presets={presets} />
}
```

**Client Components: Only When Needed**
```typescript
'use client'

// Use client directive only for:
// - State management (useState, useReducer)
// - Effects (useEffect)
// - Event handlers (onClick, onChange)
// - Browser APIs (window, document)
// - Third-party libraries that need browser context

export function PresetSelector({ presets }: Props) {
  const [selected, setSelected] = useState<string>()
  // ...
}
```

### Component Documentation

Add JSDoc for complex components:

```typescript
/**
 * PresetSelector - Allows users to select a preset for their chat.
 * 
 * Features:
 * - Search/filter presets by name
 * - Shows preset preview on hover
 * - Displays recently used presets first
 * 
 * @param presets - List of available presets
 * @param currentPresetId - Currently selected preset (optional)
 * @param onSelect - Callback when preset is selected
 * @param disabled - Disables selection (optional)
 */
export function PresetSelector({ ... }: Props) {
  // ...
}
```

---

## API Route Patterns

### Standard Structure

```typescript
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { components } from '@/lib/db/schema'
import { z } from 'zod'
import { eq } from 'drizzle-orm'

// 1. Input validation schema
const createComponentSchema = z.object({
  type: z.enum(['role', 'style', 'context', 'mode']),
  name: z.string().min(1).max(100),
  content: z.string().min(1).max(5000),
  description: z.string().max(500).optional(),
  tags: z.array(z.string()).optional(),
})

// 2. GET handler
export async function GET(req: Request): Promise<Response> {
  try {
    // 2a. Auth check (always first)
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // 2b. Parse query params
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    
    // 2c. Database query
    const userComponents = await db.query.components.findMany({
      where: type
        ? and(
            eq(components.userId, session.user.id),
            eq(components.type, type)
          )
        : eq(components.userId, session.user.id),
      orderBy: (components, { desc }) => [desc(components.usageCount)],
    })
    
    // 2d. Return response
    return Response.json(userComponents)
    
  } catch (error) {
    // 2e. Error handling
    console.error('Error fetching components:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 3. POST handler
export async function POST(req: Request): Promise<Response> {
  try {
    // 3a. Auth check
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // 3b. Parse and validate body
    const body = await req.json()
    const validatedData = createComponentSchema.parse(body)
    
    // 3c. Business logic / database mutation
    const [component] = await db.insert(components).values({
      userId: session.user.id,
      type: validatedData.type,
      name: validatedData.name,
      content: validatedData.content,
      description: validatedData.description,
      tags: validatedData.tags || [],
    }).returning()
    
    // 3d. Return created resource
    return Response.json(component, { status: 201 })
    
  } catch (error) {
    // 3e. Error handling with type checking
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error creating component:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### Authentication Pattern

**Always check auth first:**

```typescript
export async function GET(req: Request) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Rest of handler...
}
```

### Input Validation with Zod

**Define schemas at top of file:**

```typescript
import { z } from 'zod'

const updatePresetSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  roleId: z.string().uuid().optional(),
  styleId: z.string().uuid().optional(),
  contextId: z.string().uuid().optional(),
  modeId: z.string().uuid().optional(),
})

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const data = updatePresetSchema.parse(body)
    // Use validated data
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors }, { status: 400 })
    }
  }
}
```

### Error Responses

**Use consistent error format:**

```typescript
// Single error
return Response.json(
  { error: 'Resource not found' },
  { status: 404 }
)

// Validation errors
return Response.json(
  { 
    error: 'Validation failed',
    details: [
      { field: 'name', message: 'Required' },
      { field: 'email', message: 'Invalid format' }
    ]
  },
  { status: 400 }
)
```

**Status codes:**
- `200` - OK
- `201` - Created
- `204` - No Content
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (logged in but no access)
- `404` - Not Found
- `409` - Conflict (duplicate, etc.)
- `500` - Internal Server Error

---

## Database Patterns (Drizzle)

### Query Patterns

**Simple query:**
```typescript
const component = await db.query.components.findFirst({
  where: eq(components.id, componentId)
})
```

**Query with relations:**
```typescript
const preset = await db.query.presets.findFirst({
  where: eq(presets.id, presetId),
  with: {
    role: true,
    style: true,
    context: true,
    mode: true,
  }
})
```

**Query with multiple conditions:**
```typescript
import { and, or, eq, like, desc } from 'drizzle-orm'

const results = await db.query.components.findMany({
  where: and(
    eq(components.userId, userId),
    eq(components.type, 'role'),
    or(
      like(components.name, `%${search}%`),
      like(components.content, `%${search}%`)
    )
  ),
  orderBy: [desc(components.usageCount), desc(components.createdAt)],
  limit: 20,
  offset: page * 20,
})
```

### Insert Patterns

**Single insert:**
```typescript
const [component] = await db.insert(components).values({
  userId: session.user.id,
  type: 'role',
  name: 'Marketing Expert',
  content: '...',
}).returning()
```

**Batch insert:**
```typescript
await db.insert(components).values([
  { userId, type: 'role', name: 'Expert 1', content: '...' },
  { userId, type: 'style', name: 'Style 1', content: '...' },
])
```

### Update Patterns

**Update with object:**
```typescript
await db.update(components)
  .set({
    name: 'New Name',
    updatedAt: new Date(),
  })
  .where(eq(components.id, componentId))
```

**Increment counter:**
```typescript
import { sql } from 'drizzle-orm'

await db.update(components)
  .set({
    usageCount: sql`${components.usageCount} + 1`
  })
  .where(eq(components.id, componentId))
```

### Delete Pattern

```typescript
await db.delete(components)
  .where(
    and(
      eq(components.id, componentId),
      eq(components.userId, session.user.id) // Ensure ownership
    )
  )
```

### Transactions

**Use for multiple related operations:**

```typescript
await db.transaction(async (tx) => {
  // Create preset
  const [preset] = await tx.insert(presets).values({
    userId: session.user.id,
    name: 'New Preset',
    roleId,
    styleId,
    contextId,
    modeId,
  }).returning()
  
  // Update component usage counts
  await tx.update(components)
    .set({ usageCount: sql`${components.usageCount} + 1` })
    .where(eq(components.id, roleId))
  
  return preset
})
```

### Type Safety

**Use inferred types from schema:**

```typescript
import type { Component, Preset } from '@/lib/db/schema'

// These types are automatically generated by Drizzle
type ComponentInsert = typeof components.$inferInsert
type ComponentSelect = typeof components.$inferSelect

// Use them
function createComponent(data: ComponentInsert): Promise<Component> {
  return db.insert(components).values(data).returning()
}
```

---

## Error Handling

### Try-Catch Blocks

**Wrap risky operations:**

```typescript
export async function processData(data: unknown) {
  try {
    const validated = schema.parse(data)
    const result = await riskyOperation(validated)
    return result
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.message}`)
    }
    if (error instanceof DatabaseError) {
      throw new Error(`Database error: ${error.message}`)
    }
    throw error // Re-throw unknown errors
  }
}
```

### Error Logging

**Log errors with context:**

```typescript
try {
  // ... operation
} catch (error) {
  console.error('Error creating preset:', {
    userId: session.user.id,
    data: sanitizedData, // Remove sensitive info
    error: error instanceof Error ? error.message : String(error),
  })
  throw error
}
```

**Never log:**
- Passwords
- API keys
- Session tokens
- Credit card info
- Any PII unnecessarily

---

## Async/Await Patterns

### Always Use Async/Await

**Never use `.then()` chains:**

```typescript
// ❌ Bad
function getUser(id: string) {
  return db.query.users.findFirst({ where: eq(users.id, id) })
    .then(user => {
      return user
    })
    .catch(error => {
      console.error(error)
    })
}

// ✅ Good
async function getUser(id: string): Promise<User | undefined> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, id)
    })
    return user
  } catch (error) {
    console.error('Error fetching user:', error)
    throw error
  }
}
```

### Parallel Operations

**Use `Promise.all` for independent operations:**

```typescript
// ❌ Bad: Sequential (slow)
async function loadData(userId: string) {
  const components = await db.query.components.findMany({
    where: eq(components.userId, userId)
  })
  const presets = await db.query.presets.findMany({
    where: eq(presets.userId, userId)
  })
  return { components, presets }
}

// ✅ Good: Parallel (fast)
async function loadData(userId: string) {
  const [components, presets] = await Promise.all([
    db.query.components.findMany({
      where: eq(components.userId, userId)
    }),
    db.query.presets.findMany({
      where: eq(presets.userId, userId)
    }),
  ])
  return { components, presets }
}
```

---

## Testing (Future)

When we add tests, follow these patterns:

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from '@/lib/prompt-builder'

describe('buildSystemPrompt', () => {
  it('combines all components', () => {
    const components = {
      role: { content: 'You are an expert' },
      style: { content: 'Be concise' },
      context: { content: 'Project X' },
      mode: { content: 'Ship mode' },
    }
    
    const result = buildSystemPrompt(components)
    
    expect(result).toContain('You are an expert')
    expect(result).toContain('Be concise')
  })
  
  it('handles missing components', () => {
    const result = buildSystemPrompt({})
    expect(result).toBeUndefined()
  })
})
```

### Integration Tests

```typescript
import { describe, it, expect } from 'vitest'
import { POST } from '@/app/api/components/route'

describe('POST /api/components', () => {
  it('creates a component', async () => {
    const req = new Request('http://localhost/api/components', {
      method: 'POST',
      body: JSON.stringify({
        type: 'role',
        name: 'Test Role',
        content: 'Test content',
      }),
    })
    
    const res = await POST(req)
    expect(res.status).toBe(201)
    
    const data = await res.json()
    expect(data.name).toBe('Test Role')
  })
})
```

---

## Comments

### When to Comment

**Comment WHY, not WHAT:**

```typescript
// ❌ Bad: Obvious comment
// Set the user ID
const userId = session.user.id

// ✅ Good: Explains reasoning
// We need to check usage count before the preset is deleted
// because we use it for analytics later
const usageCount = preset.usageCount
await db.delete(presets).where(eq(presets.id, presetId))
```

**Complex logic needs comments:**

```typescript
// ✅ Good: Explains non-obvious logic
// Build system prompt from components in specific order.
// Order matters: Role sets context, Style refines tone,
// Context adds knowledge, Mode determines behavior.
const systemPrompt = [
  components.role?.content,
  components.style?.content,
  components.context?.content,
  components.mode?.content,
]
  .filter(Boolean)
  .join('\n\n---\n\n')
```

### JSDoc for Public Functions

```typescript
/**
 * Builds a system prompt from component pieces.
 * 
 * Combines up to 4 components (role, style, context, mode) into
 * a formatted system prompt for the LLM. Returns undefined if
 * no components are provided.
 * 
 * @param components - Object with optional component content
 * @returns Formatted system prompt or undefined
 * 
 * @example
 * ```ts
 * const prompt = buildSystemPrompt({
 *   role: { content: 'You are an expert' },
 *   mode: { content: 'Ship mode' }
 * })
 * // Returns: "# Role\nYou are an expert\n\n---\n\n# Mode\nShip mode"
 * ```
 */
export function buildSystemPrompt(
  components: PromptComponents
): string | undefined {
  // ...
}
```

### TODO Comments

**Include issue number:**

```typescript
// TODO(#123): Implement rate limiting per user
// TODO(#456): Add pagination for component list
```

---

## Performance Best Practices

### Database

**1. Use indexes:**
```typescript
// In schema.ts
export const components = pgTable('components', {
  // ... fields
}, (table) => ({
  userTypeIdx: index('components_user_type_idx').on(
    table.userId,
    table.type
  ),
}))
```

**2. Select only needed fields:**
```typescript
// ❌ Bad: Selects all fields
const components = await db.query.components.findMany()

// ✅ Good: Selects only needed fields
const components = await db
  .select({
    id: components.id,
    name: components.name,
    type: components.type,
  })
  .from(components)
```

**3. Implement pagination:**
```typescript
const limit = 20
const offset = page * limit

const results = await db.query.components.findMany({
  limit,
  offset,
})
```

### API Routes

**1. Use streaming for LLM responses:**
```typescript
// Already done by Chat SDK's streamText function
const result = await streamText({ ... })
return result.toDataStreamResponse()
```

**2. Set timeouts:**
```typescript
// In API route config
export const maxDuration = 60 // seconds
```

### Frontend

**1. Server Components by default:**
```typescript
// No 'use client' unless necessary
export default async function Page() {
  const data = await fetchData()
  return <View data={data} />
}
```

**2. Lazy load heavy components:**
```typescript
import dynamic from 'next/dynamic'

const HeavyComponent = dynamic(() => import('./heavy-component'), {
  loading: () => <Skeleton />,
})
```

---

## Security Best Practices

### Input Validation

**Always validate user input:**

```typescript
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
})

const validated = schema.parse(userInput)
```

### SQL Injection Prevention

**Drizzle prevents this automatically, but still:**

```typescript
// ✅ Good: Parameterized queries (Drizzle does this)
await db.query.components.findFirst({
  where: eq(components.id, userProvidedId)
})

// ❌ Bad: Never do raw SQL with user input
// await db.execute(`SELECT * FROM components WHERE id = ${userProvidedId}`)
```

### XSS Prevention

**React escapes by default, but still:**

```typescript
// ✅ Good: React escapes automatically
<div>{userContent}</div>

// ❌ Bad: dangerouslySetInnerHTML with user content
<div dangerouslySetInnerHTML={{ __html: userContent }} />
```

### Authentication

**Check auth on every protected endpoint:**

```typescript
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ...
}
```

### Rate Limiting

**Implement for expensive operations:**

```typescript
// Chat SDK handles this, but for custom endpoints:
import { Ratelimit } from '@upstash/ratelimit'

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
})

const { success } = await ratelimit.limit(userId)
if (!success) {
  return Response.json({ error: 'Rate limit exceeded' }, { status: 429 })
}
```

---

## Git Commit Conventions

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style (formatting, no logic change)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding/updating tests
- `chore`: Build process, dependencies, etc.

**Examples:**

```bash
feat(presets): add preset creation form

Implement full preset creation flow with:
- 4-step component selection
- Name and description fields
- Validation with Zod

Closes #123

---

fix(api): handle missing components in preset

Check if all 4 components exist before allowing
preset creation. Return 400 if any are missing.

Fixes #456

---

docs(readme): add setup instructions

Add detailed setup steps for:
- Environment variables
- Database migrations
- Running locally
```

### Branch Naming

```
<type>/<short-description>

Examples:
- feature/preset-selector-ui
- fix/component-delete-bug
- docs/api-documentation
- refactor/prompt-builder
```

---

## Code Review Checklist

Before submitting code, verify:

### Functionality
- [ ] Code works as intended
- [ ] Edge cases handled
- [ ] Error states handled
- [ ] Loading states implemented

### Code Quality
- [ ] TypeScript types are correct
- [ ] No `any` types
- [ ] Functions have return types
- [ ] Input validation with Zod
- [ ] Error handling with try-catch

### Security
- [ ] Auth check on protected endpoints
- [ ] User input validated
- [ ] No SQL injection risks
- [ ] No XSS vulnerabilities

### Performance
- [ ] Database queries optimized
- [ ] No N+1 query problems
- [ ] Proper use of indexes
- [ ] Pagination for large lists

### Consistency
- [ ] Follows Chat SDK patterns
- [ ] Matches existing code style
- [ ] Uses standard naming conventions
- [ ] Proper file organization

### Documentation
- [ ] Complex logic commented
- [ ] Public functions have JSDoc
- [ ] README updated if needed
- [ ] API changes documented

---

## Tools & Plugins

### Recommended VSCode Extensions

- ESLint
- Prettier
- TypeScript
- Tailwind CSS IntelliSense
- Prisma (works with Drizzle too)
- GitLens

### Editor Settings

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

---

## Summary

### Do's ✅

- Follow Chat SDK conventions
- Use TypeScript strict mode
- Validate all input with Zod
- Check auth on every protected endpoint
- Use Server Components by default
- Comment WHY, not WHAT
- Write explicit return types
- Handle errors properly
- Use async/await (not .then())
- Keep functions small (<50 lines)

### Don'ts ❌

- Use `any` types
- Skip input validation
- Forget auth checks
- Use `.then()` chains
- Put logic in components (extract to utils)
- Commit console.logs
- Ignore TypeScript errors
- Skip error handling
- Use raw SQL with user input
- Make huge commits

---

**These standards ensure:**
- Code is consistent with Chat SDK
- Type safety at every level
- Security by default
- Maintainable codebase
- Fast code review
- Easy onboarding for future developers

**Next Steps:** See `DATABASE_SCHEMA.md` for database structure.
