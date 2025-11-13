# Tech Context

## Technology Stack

### Frontend Framework
- **Next.js 14** (App Router)
  - Server Components by default
  - Server Actions for mutations
  - Streaming and Suspense
  - File-based routing

### UI Layer
- **React 18**
  - Server and Client Components
  - Hooks (useState, useEffect, custom hooks)
  - Suspense boundaries

- **shadcn/ui**
  - Headless component library
  - Built on Radix UI primitives
  - Tailwind CSS styling
  - Copy-paste component pattern

- **Tailwind CSS v4**
  - Utility-first CSS
  - JIT compilation
  - Custom design tokens

### AI Integration
- **AI SDK (Vercel)**
  - Multi-provider abstraction layer
  - Streaming support
  - Tool/function calling
  - Unified API across providers

- **LLM Providers**
  - xAI (Grok) - default via AI Gateway
  - OpenAI (GPT-4, GPT-4 Turbo)
  - Anthropic (Claude 3.5 Sonnet)
  - Extensible to others

- **AI Gateway (Vercel)**
  - Provider routing
  - OIDC authentication (automatic on Vercel)
  - Rate limiting
  - Cost optimization

### Database
- **Neon Serverless Postgres**
  - Serverless PostgreSQL
  - Automatic scaling
  - Branching for dev/staging
  - Connection pooling

- **Drizzle ORM**
  - Type-safe query builder
  - Schema migrations
  - Postgres-first
  - Excellent TypeScript integration

### Authentication
- **Auth.js (NextAuth.js v5)**
  - Multiple providers (OAuth, credentials)
  - Session management
  - JWT tokens
  - Middleware protection

### Code Quality
- **TypeScript**
  - Strict mode enabled
  - No implicit any
  - Explicit return types

- **Biome**
  - Fast linter and formatter
  - Replaces ESLint + Prettier
  - AI-friendly error messages
  - Configured via biome.jsonc

- **Ultracite**
  - AI-ready formatter rules
  - Located in `.cursor/rules/ultracite.mdc`
  - Accessibility checks
  - Code complexity rules

### Testing (Existing Setup)
- **Playwright**
  - E2E testing
  - Browser automation
  - Test files in `tests/`

- **Vitest** (Chat SDK uses it)
  - Unit testing
  - Fast test runner
  - Mock support

### Build & Development
- **pnpm**
  - Fast package manager
  - Efficient disk usage
  - Strict dependency management

- **Turborepo** (potentially, if Chat SDK uses it)
  - Monorepo build system
  - Cached builds

## Development Setup

### Prerequisites
- Node.js 18+ (LTS recommended)
- pnpm 8+
- Git
- Code editor (VS Code recommended)

### Environment Variables

Required in `.env.local`:

```bash
# Database (Neon)
DATABASE_URL="postgresql://..."
POSTGRES_PRISMA_URL="postgresql://..."
POSTGRES_URL_NON_POOLING="postgresql://..."

# Auth (Auth.js)
AUTH_SECRET="..." # Generate with: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000" # Production: your domain

# AI Providers (via AI Gateway or direct)
# Option 1: AI Gateway (Vercel)
# No API key needed on Vercel (OIDC)
# For local: AI_GATEWAY_API_KEY="..."

# Option 2: Direct providers
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."

# Blob Storage (Vercel Blob)
BLOB_READ_WRITE_TOKEN="..."

# Custom (to be added)
# Future: Billing integration
# POLAR_API_KEY="..."
```

### Local Development

```bash
# Install dependencies
pnpm install

# Run database migrations
pnpm db:migrate

# Start development server
pnpm dev

# Open browser
# http://localhost:3000

# Run tests
pnpm test

# Lint code
pnpm lint

# Format code
pnpm format
```

### Database Migrations

```bash
# Generate new migration
pnpm drizzle-kit generate:pg

# Apply migrations
pnpm db:migrate

# Studio (visual database editor)
pnpm drizzle-kit studio
```

## Technical Constraints

### Next.js App Router Constraints
- **No useRouter() in Server Components**
  - Use `redirect()` from `next/navigation` instead

- **No useState() in Server Components**
  - Add `'use client'` directive if state needed
  - Or use Server Actions

- **Async Server Components**
  - Can be async functions
  - Can await data directly

### AI SDK Constraints
- **Streaming Required**
  - LLM responses must stream
  - Use `streamText()` not `generateText()`
  - Return `.toDataStreamResponse()`

- **Message Format**
  - Specific format for messages array
  - Tool calls have special structure
  - System prompts separate from messages

### Database Constraints
- **Connection Pooling**
  - Neon serverless requires pooled connection
  - Use `POSTGRES_PRISMA_URL` not `DATABASE_URL`

- **Migration Strategy**
  - Forward-only migrations
  - No rollbacks in production
  - Test migrations on branch first

### Deployment Constraints (Vercel)
- **Serverless Functions**
  - Max execution time: 60s (Pro), 10s (Hobby)
  - Max payload: 4.5 MB
  - Cold starts

- **Edge Runtime**
  - Subset of Node.js APIs
  - Faster cold starts
  - Geo-distributed

## Dependencies

### Core Dependencies (package.json)
```json
{
  "ai": "^3.4.0", // AI SDK
  "next": "15.0.3",
  "react": "19.0.0-rc.0",
  "drizzle-orm": "^0.38.3",
  "@neondatabase/serverless": "^0.10.3",
  "next-auth": "5.0.0-beta.25",
  "zod": "^3.23.8", // Validation
  "@vercel/blob": "^0.27.0",
  "sharp": "^0.33.5", // Image processing
  // ... shadcn/ui components
}
```

### Dev Dependencies
```json
{
  "typescript": "^5.7.2",
  "@biomejs/biome": "^1.9.4",
  "drizzle-kit": "^0.30.1",
  "playwright": "^1.49.0",
  "@playwright/test": "^1.49.0",
  // ... type definitions
}
```

### To Be Added (Our Extensions)
```json
{
  "@polar-sh/sdk": "^1.0.0", // Billing (future)
  // Potentially: analytics, error tracking
}
```

## Tool Usage Patterns

### Drizzle ORM Patterns

**Query:**
```typescript
// Use query builder
const components = await db.query.components.findMany({
  where: eq(components.userId, userId),
  with: { user: true } // Relations
})

// Or SQL-like builder
const components = await db
  .select()
  .from(components)
  .where(eq(components.userId, userId))
```

**Insert:**
```typescript
const [component] = await db.insert(components)
  .values({ userId, type, name, content })
  .returning()
```

**Update:**
```typescript
await db.update(components)
  .set({ name: 'New Name', updatedAt: new Date() })
  .where(eq(components.id, id))
```

**Transactions:**
```typescript
await db.transaction(async (tx) => {
  await tx.insert(presets).values({ ... })
  await tx.update(components).set({ ... })
})
```

### AI SDK Patterns

**Streaming:**
```typescript
import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

const result = streamText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  system: systemPrompt,
  messages: coreMessages,
  maxTokens: 4096,
  temperature: 1,
})

return result.toDataStreamResponse()
```

**Tools:**
```typescript
const result = streamText({
  model,
  messages,
  tools: {
    getWeather: {
      description: 'Get weather for location',
      parameters: z.object({
        location: z.string(),
      }),
      execute: async ({ location }) => {
        // Tool implementation
      }
    }
  }
})
```

### Auth.js Patterns

**Server Components:**
```typescript
import { auth } from '@/auth'

export default async function Page() {
  const session = await auth()
  if (!session) {
    redirect('/login')
  }
  // ...
}
```

**API Routes:**
```typescript
import { auth } from '@/auth'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ...
}
```

**Middleware:**
```typescript
export { auth as middleware } from '@/auth'

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

## VS Code Configuration

### Recommended Extensions
- TypeScript and JavaScript Language Features (built-in)
- Tailwind CSS IntelliSense
- Biome (biomejs.biome)
- Playwright Test for VSCode
- GitLens
- Error Lens

### Workspace Settings (`.vscode/settings.json`)
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "biomejs.biome",
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

## CI/CD Pipeline

### GitHub Actions (Existing)
- **Lint**: Runs on every PR
  - `.github/workflows/lint.yml`
  - Checks code quality with Biome

- **Playwright Tests**: Runs on every PR
  - `.github/workflows/playwright.yml`
  - E2E tests in browser

### Deployment (Vercel)
- **Automatic Deployments**
  - Every push to `main` → Production
  - Every PR → Preview deployment
  - Branch previews

- **Environment Variables**
  - Set in Vercel dashboard
  - Separate for preview/production

## Performance Characteristics

### Build Times
- **Cold Build**: ~2-3 minutes (first time)
- **Incremental Build**: ~30-60 seconds
- **Hot Reload**: <1 second (dev mode)

### Runtime Performance
- **Initial Page Load**: Target <2s
- **Time to Interactive**: Target <3s
- **LLM Stream Start**: Target <500ms
- **Database Queries**: Target <50ms

### Scalability
- **Neon**: Auto-scales with demand
- **Vercel Functions**: Auto-scales, pay per use
- **AI Gateway**: Handles rate limiting

---

**Important**: This tech stack is inherited from Chat SDK. Our custom features integrate seamlessly by following the same patterns and tools.
