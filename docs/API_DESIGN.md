# API Design

## Overview

This document describes all API endpoints for the modular prompt platform. We extend the Chat SDK's existing `/api/chat` endpoint and add new endpoints for component and preset management.

**Base URL:** `https://your-app.vercel.app`  
**API Version:** v1 (implicit, no versioning in URLs yet)  
**Content-Type:** `application/json`  
**Authentication:** Session-based via Auth.js

---

## Authentication

### Overview

All API endpoints (except webhooks) require authentication via Auth.js session.

**Session Cookie:** `next-auth.session-token` (httpOnly)  
**Validation:** Every request checks for valid session  
**User ID:** Extracted from session for data scoping

### Getting Session

```typescript
import { auth } from '@/auth'

export async function GET(req: Request) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const userId = session.user.id
  // ... use userId for queries
}
```

### Unauthenticated Response

```json
{
  "error": "Unauthorized"
}
```

Status: `401 Unauthorized`

---

## Common Patterns

### Request Headers

```
GET /api/components
Host: your-app.vercel.app
Cookie: next-auth.session-token=...
Accept: application/json
```

### Response Format

**Success:**
```json
{
  "id": "uuid",
  "name": "Component Name",
  // ... data fields
}
```

**Error:**
```json
{
  "error": "Error message",
  "details": [] // Optional, for validation errors
}
```

### Validation

All input validated with Zod schemas before processing.

**Validation Error Response:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "path": ["name"],
      "message": "String must contain at least 1 character(s)"
    },
    {
      "path": ["content"],
      "message": "Required"
    }
  ]
}
```

Status: `400 Bad Request`

### Pagination (Future)

Not implemented in MVP, but prepared for:

```
GET /api/components?limit=20&offset=40
```

```json
{
  "data": [...],
  "pagination": {
    "limit": 20,
    "offset": 40,
    "total": 150,
    "hasMore": true
  }
}
```

---

## Component Endpoints

### GET /api/components

List all components for authenticated user, optionally filtered by type.

**URL:** `/api/components`  
**Method:** `GET`  
**Auth:** Required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | No | Filter by type: 'role', 'style', 'context', 'mode' |
| `search` | string | No | Search in name and content (future) |
| `tags` | string | No | Filter by tags, comma-separated (future) |

**Request Example:**

```
GET /api/components?type=role
Cookie: next-auth.session-token=...
```

**Response Example:**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user-uuid",
    "type": "role",
    "name": "Marketing Expert",
    "content": "You are an experienced Social Media Marketing Expert with specialization on LinkedIn and Instagram. You know current trends, best practices for engagement, and understand platform algorithms.",
    "description": "For LinkedIn and Instagram content creation",
    "tags": ["marketing", "social-media", "linkedin"],
    "usageCount": 47,
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  },
  {
    "id": "650e8400-e29b-41d4-a716-446655440001",
    "type": "role",
    "name": "Senior Developer",
    "content": "You are a senior fullstack developer with expertise in Next.js, TypeScript, and modern web development. You write clean, maintainable code and explain technical decisions clearly.",
    "description": "For code reviews and technical discussions",
    "tags": ["development", "nextjs", "typescript"],
    "usageCount": 34,
    "createdAt": "2025-01-14T09:20:00.000Z",
    "updatedAt": "2025-01-14T09:20:00.000Z"
  }
]
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized

**Implementation:**

```typescript
// app/(chat)/api/components/route.ts
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { components } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'

export async function GET(req: Request): Promise<Response> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')

    const userComponents = await db.query.components.findMany({
      where: type
        ? and(
            eq(components.userId, session.user.id),
            eq(components.type, type)
          )
        : eq(components.userId, session.user.id),
      orderBy: [desc(components.usageCount), desc(components.updatedAt)],
    })

    return Response.json(userComponents)
  } catch (error) {
    console.error('Error fetching components:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

### POST /api/components

Create a new component for authenticated user.

**URL:** `/api/components`  
**Method:** `POST`  
**Auth:** Required

**Request Body:**

```typescript
{
  type: 'role' | 'style' | 'context' | 'mode', // Required
  name: string,        // Required, 1-100 chars
  content: string,     // Required, 1-5000 chars
  description?: string, // Optional, max 500 chars
  tags?: string[]      // Optional
}
```

**Validation Schema:**

```typescript
import { z } from 'zod'

const createComponentSchema = z.object({
  type: z.enum(['role', 'style', 'context', 'mode']),
  name: z.string().min(1).max(100),
  content: z.string().min(1).max(5000),
  description: z.string().max(500).optional(),
  tags: z.array(z.string()).optional(),
})
```

**Request Example:**

```json
POST /api/components
Content-Type: application/json
Cookie: next-auth.session-token=...

{
  "type": "role",
  "name": "Marketing Expert",
  "content": "You are an experienced Social Media Marketing Expert with specialization on LinkedIn and Instagram.",
  "description": "For LinkedIn content creation",
  "tags": ["marketing", "linkedin", "social-media"]
}
```

**Response Example:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-uuid",
  "type": "role",
  "name": "Marketing Expert",
  "content": "You are an experienced Social Media Marketing Expert with specialization on LinkedIn and Instagram.",
  "description": "For LinkedIn content creation",
  "tags": ["marketing", "linkedin", "social-media"],
  "usageCount": 0,
  "createdAt": "2025-01-20T14:30:00.000Z",
  "updatedAt": "2025-01-20T14:30:00.000Z"
}
```

**Status Codes:**
- `201` - Created
- `400` - Validation error
- `401` - Unauthorized
- `403` - Subscription limit reached
- `500` - Server error

**Limit Checking:**

Before creating, check subscription limits:

```typescript
// Check component limit
const subscription = await db.query.subscriptions.findFirst({
  where: eq(subscriptions.userId, session.user.id)
})

const plan = subscription?.plan || 'free'
const limits = PLAN_LIMITS[plan]

const componentCount = await db
  .select({ count: count() })
  .from(components)
  .where(eq(components.userId, session.user.id))

if (componentCount[0].count >= limits.maxComponents) {
  return Response.json(
    { error: 'Component limit reached. Upgrade to create more.' },
    { status: 403 }
  )
}
```

**Implementation:**

```typescript
export async function POST(req: Request): Promise<Response> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate body
    const body = await req.json()
    const validatedData = createComponentSchema.parse(body)

    // Check limits (see above)
    
    // Create component
    const [component] = await db.insert(components).values({
      userId: session.user.id,
      type: validatedData.type,
      name: validatedData.name,
      content: validatedData.content,
      description: validatedData.description,
      tags: validatedData.tags || [],
    }).returning()

    return Response.json(component, { status: 201 })
  } catch (error) {
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

---

### GET /api/components/[id]

Get a single component by ID.

**URL:** `/api/components/{id}`  
**Method:** `GET`  
**Auth:** Required

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Component ID |

**Request Example:**

```
GET /api/components/550e8400-e29b-41d4-a716-446655440000
Cookie: next-auth.session-token=...
```

**Response Example:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-uuid",
  "type": "role",
  "name": "Marketing Expert",
  "content": "You are an experienced Social Media Marketing Expert...",
  "description": "For LinkedIn content creation",
  "tags": ["marketing", "linkedin"],
  "usageCount": 47,
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T10:30:00.000Z"
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `404` - Component not found or not owned by user

---

### PATCH /api/components/[id]

Update an existing component. Only the owner can update.

**URL:** `/api/components/{id}`  
**Method:** `PATCH`  
**Auth:** Required

**Request Body:** (all fields optional)

```typescript
{
  name?: string,        // 1-100 chars
  content?: string,     // 1-5000 chars
  description?: string, // max 500 chars
  tags?: string[]
}
```

**Validation Schema:**

```typescript
const updateComponentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  content: z.string().min(1).max(5000).optional(),
  description: z.string().max(500).optional(),
  tags: z.array(z.string()).optional(),
})
```

**Request Example:**

```json
PATCH /api/components/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json
Cookie: next-auth.session-token=...

{
  "name": "Marketing Expert (Updated)",
  "description": "Updated description"
}
```

**Response Example:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-uuid",
  "type": "role",
  "name": "Marketing Expert (Updated)",
  "content": "You are an experienced Social Media Marketing Expert...",
  "description": "Updated description",
  "tags": ["marketing", "linkedin"],
  "usageCount": 47,
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-20T15:45:00.000Z"
}
```

**Status Codes:**
- `200` - Success
- `400` - Validation error
- `401` - Unauthorized
- `404` - Component not found or not owned by user

**Implementation:**

```typescript
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const validatedData = updateComponentSchema.parse(body)

    // Update with ownership check
    const [updated] = await db
      .update(components)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(components.id, params.id),
          eq(components.userId, session.user.id)
        )
      )
      .returning()

    if (!updated) {
      return Response.json(
        { error: 'Component not found' },
        { status: 404 }
      )
    }

    return Response.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error updating component:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

### DELETE /api/components/[id]

Delete a component. Sets preset references to NULL if component is used.

**URL:** `/api/components/{id}`  
**Method:** `DELETE`  
**Auth:** Required

**Request Example:**

```
DELETE /api/components/550e8400-e29b-41d4-a716-446655440000
Cookie: next-auth.session-token=...
```

**Response Example:**

```json
{
  "success": true,
  "message": "Component deleted",
  "affectedPresets": 3
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `404` - Component not found

**Behavior:**
- Component is deleted
- Preset references are set to NULL (ON DELETE SET NULL)
- Presets become "incomplete" but are not deleted
- UI can warn user about incomplete presets

**Implementation:**

```typescript
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check how many presets will be affected
    const affectedPresets = await db.query.presets.findMany({
      where: or(
        eq(presets.roleId, params.id),
        eq(presets.styleId, params.id),
        eq(presets.contextId, params.id),
        eq(presets.modeId, params.id)
      )
    })

    // Delete component (CASCADE SET NULL handles preset refs)
    const result = await db
      .delete(components)
      .where(
        and(
          eq(components.id, params.id),
          eq(components.userId, session.user.id)
        )
      )
      .returning()

    if (result.length === 0) {
      return Response.json(
        { error: 'Component not found' },
        { status: 404 }
      )
    }

    return Response.json({
      success: true,
      message: 'Component deleted',
      affectedPresets: affectedPresets.length
    })
  } catch (error) {
    console.error('Error deleting component:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## Preset Endpoints

### GET /api/presets

List all presets for authenticated user with full component data.

**URL:** `/api/presets`  
**Method:** `GET`  
**Auth:** Required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | string | No | Sort by: 'recent', 'popular', 'name' (default: 'recent') |

**Request Example:**

```
GET /api/presets?sort=popular
Cookie: next-auth.session-token=...
```

**Response Example:**

```json
[
  {
    "id": "preset-uuid-1",
    "userId": "user-uuid",
    "name": "LinkedIn Pro",
    "description": "For professional LinkedIn content creation",
    "roleId": "role-uuid",
    "styleId": "style-uuid",
    "contextId": "context-uuid",
    "modeId": "mode-uuid",
    "usageCount": 23,
    "lastUsedAt": "2025-01-20T14:30:00.000Z",
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z",
    "role": {
      "id": "role-uuid",
      "name": "Marketing Expert",
      "content": "You are an experienced Social Media Marketing Expert...",
      "type": "role"
    },
    "style": {
      "id": "style-uuid",
      "name": "Professional B2B",
      "content": "Use professional, concise language...",
      "type": "style"
    },
    "context": {
      "id": "context-uuid",
      "name": "Tech Startup",
      "content": "Company: TechCorp, Product: SaaS platform...",
      "type": "context"
    },
    "mode": {
      "id": "mode-uuid",
      "name": "Ship Mode",
      "content": "Focus on execution, provide concrete steps...",
      "type": "mode"
    }
  },
  {
    "id": "preset-uuid-2",
    "userId": "user-uuid",
    "name": "Quick Expert",
    "description": "Minimal preset with only role and mode",
    "roleId": "role-uuid",
    "styleId": null,
    "contextId": null,
    "modeId": "mode-uuid",
    "usageCount": 12,
    "lastUsedAt": "2025-01-19T10:15:00.000Z",
    "createdAt": "2025-01-16T09:00:00.000Z",
    "updatedAt": "2025-01-16T09:00:00.000Z",
    "role": {
      "id": "role-uuid",
      "name": "Marketing Expert",
      "content": "You are an experienced Social Media Marketing Expert...",
      "type": "role"
    },
    "style": null,
    "context": null,
    "mode": {
      "id": "mode-uuid",
      "name": "Ship Mode",
      "content": "Focus on execution, provide concrete steps...",
      "type": "mode"
    }
  }
]
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized

**Implementation:**

```typescript
export async function GET(req: Request): Promise<Response> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const sort = searchParams.get('sort') || 'recent'

    let orderBy
    switch (sort) {
      case 'popular':
        orderBy = [desc(presets.usageCount)]
        break
      case 'name':
        orderBy = [asc(presets.name)]
        break
      case 'recent':
      default:
        orderBy = [desc(presets.lastUsedAt), desc(presets.updatedAt)]
    }

    const userPresets = await db.query.presets.findMany({
      where: eq(presets.userId, session.user.id),
      with: {
        role: true,      // Can be null
        style: true,     // Can be null
        context: true,   // Can be null
        mode: true,      // Can be null
      },
      orderBy,
    })

    return Response.json(userPresets)
  } catch (error) {
    console.error('Error fetching presets:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

### POST /api/presets

Create a new preset from 1-4 components.

**IMPORTANT:** All component IDs are **optional**. At least 1 must be provided.

**URL:** `/api/presets`  
**Method:** `POST`  
**Auth:** Required

**Request Body:**

```typescript
{
  name: string,          // Required, 1-100 chars
  description?: string,  // Optional, max 500 chars
  roleId?: string,       // Optional, UUID
  styleId?: string,      // Optional, UUID
  contextId?: string,    // Optional, UUID
  modeId?: string        // Optional, UUID
}
```

**Validation Schema:**

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

**Request Examples:**

**Full preset (all 4 components):**
```json
POST /api/presets
Content-Type: application/json
Cookie: next-auth.session-token=...

{
  "name": "LinkedIn Pro",
  "description": "For professional LinkedIn content",
  "roleId": "550e8400-e29b-41d4-a716-446655440000",
  "styleId": "650e8400-e29b-41d4-a716-446655440001",
  "contextId": "750e8400-e29b-41d4-a716-446655440002",
  "modeId": "850e8400-e29b-41d4-a716-446655440003"
}
```

**Minimal preset (only role + mode):**
```json
{
  "name": "Quick Expert",
  "description": "Fast expert responses",
  "roleId": "550e8400-e29b-41d4-a716-446655440000",
  "modeId": "850e8400-e29b-41d4-a716-446655440003"
}
```

**Response Example:**

```json
{
  "id": "preset-uuid",
  "userId": "user-uuid",
  "name": "LinkedIn Pro",
  "description": "For professional LinkedIn content",
  "roleId": "550e8400-e29b-41d4-a716-446655440000",
  "styleId": "650e8400-e29b-41d4-a716-446655440001",
  "contextId": "750e8400-e29b-41d4-a716-446655440002",
  "modeId": "850e8400-e29b-41d4-a716-446655440003",
  "usageCount": 0,
  "lastUsedAt": null,
  "createdAt": "2025-01-20T15:00:00.000Z",
  "updatedAt": "2025-01-20T15:00:00.000Z"
}
```

**Status Codes:**
- `201` - Created
- `400` - Validation error or invalid component IDs
- `401` - Unauthorized
- `403` - Preset limit reached
- `500` - Server error

**Validation Steps:**

```typescript
export async function POST(req: Request): Promise<Response> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const validatedData = createPresetSchema.parse(body)

    // Collect provided component IDs (filter out nulls/undefined)
    const componentIds = [
      validatedData.roleId,
      validatedData.styleId,
      validatedData.contextId,
      validatedData.modeId,
    ].filter(Boolean) as string[]

    // Verify provided components exist and belong to user
    if (componentIds.length > 0) {
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

      // Verify each component is the correct type
      const typeMap = new Map(foundComponents.map(c => [c.id, c.type]))

      if (validatedData.roleId && typeMap.get(validatedData.roleId) !== 'role') {
        return Response.json(
          { error: 'roleId must reference a component of type "role"' },
          { status: 400 }
        )
      }

      if (validatedData.styleId && typeMap.get(validatedData.styleId) !== 'style') {
        return Response.json(
          { error: 'styleId must reference a component of type "style"' },
          { status: 400 }
        )
      }

      if (validatedData.contextId && typeMap.get(validatedData.contextId) !== 'context') {
        return Response.json(
          { error: 'contextId must reference a component of type "context"' },
          { status: 400 }
        )
      }

      if (validatedData.modeId && typeMap.get(validatedData.modeId) !== 'mode') {
        return Response.json(
          { error: 'modeId must reference a component of type "mode"' },
          { status: 400 }
        )
      }
    }

    // Check preset limit
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, session.user.id)
    })

    const plan = subscription?.plan || 'free'
    const limits = PLAN_LIMITS[plan]

    const presetCount = await db
      .select({ count: count() })
      .from(presets)
      .where(eq(presets.userId, session.user.id))

    if (presetCount[0].count >= limits.maxPresets) {
      return Response.json(
        { error: 'Preset limit reached. Upgrade to create more.' },
        { status: 403 }
      )
    }

    // Create preset using transaction to track component usage
    const result = await db.transaction(async (tx) => {
      // Create preset
      const [preset] = await tx.insert(presets).values({
        userId: session.user.id,
        name: validatedData.name,
        description: validatedData.description,
        roleId: validatedData.roleId || null,
        styleId: validatedData.styleId || null,
        contextId: validatedData.contextId || null,
        modeId: validatedData.modeId || null,
      }).returning()

      // Increment usage count for each provided component
      for (const componentId of componentIds) {
        await tx.update(components)
          .set({ 
            usageCount: sql`${components.usageCount} + 1`,
            updatedAt: new Date()
          })
          .where(eq(components.id, componentId))
      }

      return preset
    })

    return Response.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error creating preset:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

### GET /api/presets/[id]

Get a single preset with full component data (including nulls).

**URL:** `/api/presets/{id}`  
**Method:** `GET`  
**Auth:** Required

**Response Example:**

```json
{
  "id": "preset-uuid",
  "userId": "user-uuid",
  "name": "Quick Expert",
  "description": "Minimal preset example",
  "roleId": "role-uuid",
  "styleId": null,
  "contextId": null,
  "modeId": "mode-uuid",
  "usageCount": 12,
  "lastUsedAt": "2025-01-19T10:15:00.000Z",
  "createdAt": "2025-01-16T09:00:00.000Z",
  "updatedAt": "2025-01-16T09:00:00.000Z",
  "role": {
    "id": "role-uuid",
    "name": "Marketing Expert",
    "content": "You are an experienced Social Media Marketing Expert...",
    "type": "role"
  },
  "style": null,
  "context": null,
  "mode": {
    "id": "mode-uuid",
    "name": "Ship Mode",
    "content": "Focus on execution...",
    "type": "mode"
  }
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `404` - Preset not found

---

### PATCH /api/presets/[id]

Update a preset. Can change name, description, or any of the 4 component IDs.

**URL:** `/api/presets/{id}`  
**Method:** `PATCH`  
**Auth:** Required

**Request Body:** (all fields optional)

```typescript
{
  name?: string,
  description?: string,
  roleId?: string | null,      // Can set to null to remove
  styleId?: string | null,
  contextId?: string | null,
  modeId?: string | null
}
```

**Validation Schema:**

```typescript
const updatePresetSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  roleId: z.string().uuid().nullable().optional(),
  styleId: z.string().uuid().nullable().optional(),
  contextId: z.string().uuid().nullable().optional(),
  modeId: z.string().uuid().nullable().optional(),
}).refine(
  (data) => {
    // If all 4 component fields are explicitly set to null, reject
    if (
      data.roleId === null &&
      data.styleId === null &&
      data.contextId === null &&
      data.modeId === null
    ) {
      return false
    }
    return true
  },
  {
    message: "Cannot remove all components from preset",
  }
)
```

**Status Codes:**
- `200` - Success
- `400` - Validation error
- `401` - Unauthorized
- `404` - Preset not found

---

### DELETE /api/presets/[id]

Delete a preset. Safe to delete - doesn't affect past chats.

**URL:** `/api/presets/{id}`  
**Method:** `DELETE`  
**Auth:** Required

**Response Example:**

```json
{
  "success": true,
  "message": "Preset deleted"
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `404` - Preset not found

**Note:** Deleting a preset doesn't affect past chats that used it. The `presetHistory` field in Chat table preserves the preset name.

**Implementation:**

```typescript
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await db
      .delete(presets)
      .where(
        and(
          eq(presets.id, params.id),
          eq(presets.userId, session.user.id)
        )
      )
      .returning()

    if (result.length === 0) {
      return Response.json(
        { error: 'Preset not found' },
        { status: 404 }
      )
    }

    return Response.json({
      success: true,
      message: 'Preset deleted'
    })
  } catch (error) {
    console.error('Error deleting preset:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## Chat Endpoint (Extended)

### POST /api/chat

**This endpoint is extended from Chat SDK**, not created from scratch.

**URL:** `/api/chat`  
**Method:** `POST`  
**Auth:** Required

**Original Chat SDK Body:**
```typescript
{
  id: string,           // Chat ID
  messages: Message[],  // Conversation history
}
```

**Our Extensions:**

```typescript
{
  id: string,           // Chat ID (existing)
  messages: Message[],  // Conversation history (existing)
  
  // Option 1: Use preset
  presetId?: string,    // UUID of preset (NEW)
  
  // Option 2: Manual component selection
  roleId?: string,      // UUID (NEW)
  styleId?: string,     // UUID (NEW)
  contextId?: string,   // UUID (NEW)
  modeId?: string,      // UUID (NEW)
  
  // Provider selection (NEW)
  provider?: 'anthropic' | 'openai', // Default: 'anthropic'
}
```

**Priority Logic:**
1. If `presetId` is provided → Use preset (ignore manual IDs even if provided)
2. If no `presetId` → Use manual component IDs (if provided)
3. If neither → Use default Chat SDK system prompt

**Request Example (with preset):**

```json
POST /api/chat
Content-Type: application/json
Cookie: next-auth.session-token=...

{
  "id": "chat-uuid",
  "messages": [
    {
      "role": "user",
      "content": "Help me write a LinkedIn post about AI"
    }
  ],
  "presetId": "preset-uuid",
  "provider": "anthropic"
}
```

**Request Example (manual):**

```json
{
  "id": "chat-uuid",
  "messages": [
    {
      "role": "user",
      "content": "Help me write a LinkedIn post"
    }
  ],
  "roleId": "role-uuid",
  "modeId": "mode-uuid",
  "provider": "anthropic"
}
```

**Response:**

Server-sent events stream (from AI SDK's `toDataStreamResponse()`):

```
0:"..."
0:"text chunk 1"
0:"text chunk 2"
d:{"finishReason":"stop","usage":{"promptTokens":123,"completionTokens":456}}
```

**Implementation:**

```typescript
// app/(chat)/api/chat/route.ts
import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { buildSystemPrompt } from '@/lib/prompts/builder'
import { eq, and, inArray } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

export async function POST(req: Request): Promise<Response> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      id: chatId,
      messages,
      presetId,
      roleId,
      styleId,
      contextId,
      modeId,
      provider = 'anthropic'
    } = await req.json()

    // Load components based on priority
    let components: {
      role?: Component | null
      style?: Component | null
      context?: Component | null
      mode?: Component | null
    } = {}

    if (presetId) {
      // Priority 1: Load preset with all components
      const preset = await db.query.presets.findFirst({
        where: and(
          eq(presets.id, presetId),
          eq(presets.userId, session.user.id)
        ),
        with: {
          role: true,
          style: true,
          context: true,
          mode: true,
        }
      })

      if (preset) {
        components = {
          role: preset.role,
          style: preset.style,
          context: preset.context,
          mode: preset.mode,
        }
      }
    } else {
      // Priority 2: Load individual components
      const componentIds = [roleId, styleId, contextId, modeId].filter(Boolean) as string[]
      
      if (componentIds.length > 0) {
        const loadedComponents = await db.query.components.findMany({
          where: and(
            eq(components.userId, session.user.id),
            inArray(components.id, componentIds)
          )
        })

        // Map to components object
        for (const comp of loadedComponents) {
          components[comp.type] = comp
        }
      }
    }

    // Build system prompt (handles nulls gracefully)
    const customSystemPrompt = buildSystemPrompt(components)

    // Select model
    const model = provider === 'anthropic'
      ? anthropic('claude-sonnet-4-20250514')
      : openai('gpt-4-turbo')

    // Get default system prompt from Chat SDK
    const { systemPrompt: defaultSystemPrompt } = await import('@/lib/ai/prompts')

    // Stream response
    const result = await streamText({
      model,
      system: customSystemPrompt || defaultSystemPrompt,
      messages,
      maxTokens: 4000,
      temperature: 0.7,
      onFinish: async ({ text, usage }) => {
        // Track preset usage
        if (presetId) {
          await db.update(presets)
            .set({
              usageCount: sql`${presets.usageCount} + 1`,
              lastUsedAt: new Date(),
              updatedAt: new Date()
            })
            .where(eq(presets.id, presetId))
        }

        // Track component usage
        const usedComponents = Object.values(components).filter(Boolean)
        for (const component of usedComponents) {
          await db.update(components)
            .set({
              usageCount: sql`${components.usageCount} + 1`,
              updatedAt: new Date()
            })
            .where(eq(components.id, component.id))
        }

        // Update chat
        await db.update(chats)
          .set({
            currentPresetId: presetId || null,
            totalTokens: sql`${chats.totalTokens} + ${usage.totalTokens}`,
            provider,
            updatedAt: new Date()
          })
          .where(eq(chats.id, chatId))
      }
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error('Error in chat:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## Subscription Endpoints

(Subscription endpoints remain unchanged from original - they are correct)

---

## API Summary

### Endpoints Overview

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/components` | GET | List components |
| `/api/components` | POST | Create component |
| `/api/components/[id]` | GET | Get single component |
| `/api/components/[id]` | PATCH | Update component |
| `/api/components/[id]` | DELETE | Delete component |
| `/api/presets` | GET | List presets |
| `/api/presets` | POST | Create preset (1-4 components) |
| `/api/presets/[id]` | GET | Get single preset |
| `/api/presets/[id]` | PATCH | Update preset |
| `/api/presets/[id]` | DELETE | Delete preset |
| `/api/chat` | POST | Chat with AI (extended) |
| `/api/subscription` | GET | Get subscription |
| `/api/subscription/checkout` | POST | Create checkout |
| `/api/webhooks/polar` | POST | Polar webhooks |

### Key Design Decisions

✅ **Preset Flexibility** - All 4 component IDs are optional  
✅ **At Least One** - Minimum 1 component required (validated with .refine())  
✅ **Type Validation** - Each component must be correct type  
✅ **SET NULL on Delete** - Presets survive component deletion  
✅ **Priority Logic** - presetId > manual IDs > default prompt  
✅ **Usage Tracking** - Atomic increments with SQL  
✅ **Transaction Safety** - Preset creation uses transaction

### Quick Reference

**Authentication:** Session-based, all endpoints except webhooks  
**Content-Type:** `application/json`  
**Validation:** Zod schemas with .refine() for complex rules  
**Error Format:** `{ error: string, details?: unknown }`  
**Preset Components:** 1-4 allowed (all optional, minimum 1 required)

---

## Next Steps

With this corrected API design:
1. Implement endpoints in order: Components → Presets → Chat extension
2. Test with minimal presets (1-2 components) to validate flexibility
3. Test with full presets (all 4 components)
4. Verify ON DELETE SET NULL behavior
5. Add integration tests for edge cases

**See:** `DATABASE_SCHEMA.md` for the corrected database schema.
