# Code Organization: Custom vs. Original

## Purpose of This Document

This file maps which code is from the original Vercel AI Chatbot and which is our custom extension. This is critical for:
- **Upstream Updates**: Knowing which files to accept from upstream
- **Merge Conflicts**: Understanding where conflicts are expected
- **Code Ownership**: Clear boundaries for modifications
- **Onboarding**: New developers understand project structure

## Architectural Principle

**Extension over Modification**
- Keep original code untouched where possible
- Build custom features in separate modules
- Use composition over modification
- Maintain updateability from upstream

---

## Original Code (Preserve for Updates)

### ✅ NEVER Modify - Accept Upstream Changes

These files should always be updated from upstream without modification:

#### Core AI & Chat
```
lib/ai/
├── models.ts              # AI model configurations
├── providers.ts           # LLM provider setup
├── prompts.ts            # Base system prompts
├── entitlements.ts       # AI model entitlements
└── tools/                # AI SDK tools
    ├── create-document.ts
    ├── get-weather.ts
    ├── request-suggestions.ts
    └── update-document.ts
```

**Why**: Core AI functionality from Chat SDK. Updates bring new providers, better streaming, bug fixes.

#### UI Components (shadcn/ui)
```
components/ui/
├── alert-dialog.tsx
├── avatar.tsx
├── badge.tsx
├── button.tsx
├── card.tsx
├── dropdown-menu.tsx
├── input.tsx
├── select.tsx
├── sidebar.tsx
├── textarea.tsx
└── ... (all shadcn components)
```

**Why**: Base UI primitives. Updates bring accessibility improvements and bug fixes.

#### Chat Interface Core
```
components/
├── chat.tsx              # Main chat component
├── multimodal-input.tsx  # Message input with file upload
├── messages.tsx          # Message list
├── message.tsx           # Single message
├── message-actions.tsx   # Message buttons (copy, regenerate)
├── model-selector.tsx    # AI model dropdown
└── elements/             # Message elements (code blocks, images, etc.)
```

**Why**: Core chat experience. Updates improve UX, streaming, error handling.

#### Authentication
```
app/(auth)/
├── auth.ts               # Auth.js configuration
├── auth.config.ts        # Auth provider config
├── actions.ts            # Server actions for auth
├── login/page.tsx        # Login page
└── register/page.tsx     # Register page
```

**Why**: Security updates, new auth providers, bug fixes.

#### Database Core
```
lib/db/
├── queries.ts            # Original queries (we extend this)
├── schema.ts            # Original schema (we extend this)
├── utils.ts             # DB utilities
└── helpers/             # Query helpers
```

**Why**: Core database functionality. Our extensions are additive, not modifications.

#### Artifacts System
```
artifacts/
├── actions.ts
├── code/
│   ├── client.tsx
│   └── server.ts
├── image/
│   └── client.tsx
├── sheet/
│   ├── client.tsx
│   └── server.ts
└── text/
    ├── client.tsx
    └── server.ts
```

**Why**: Complex feature from Chat SDK. Let upstream maintain it.

---

## Custom Code (Our Extensions)

### 🎨 Our Features - We Maintain These

These are our new features that don't exist in the original:

#### Component Management System
```
lib/components/          # NEW - Component CRUD logic
├── queries.ts          # Component database queries
├── validation.ts       # Zod schemas for components
└── types.ts            # Component type definitions

app/components/          # NEW - Component management UI
├── page.tsx            # Component library page
├── [id]/
│   └── page.tsx        # Component detail/edit page
└── components/
    ├── component-list.tsx
    ├── component-card.tsx
    ├── component-form.tsx
    └── component-delete-dialog.tsx

app/(chat)/api/components/  # NEW - Component API routes
├── route.ts            # GET all, POST new
└── [id]/
    └── route.ts        # GET, PATCH, DELETE single
```

#### Preset Management System
```
lib/presets/            # NEW - Preset logic
├── queries.ts          # Preset database queries
├── validation.ts       # Zod schemas for presets
└── types.ts            # Preset type definitions

app/presets/            # NEW - Preset management UI
├── page.tsx            # Preset library page
├── [id]/
│   └── page.tsx        # Preset detail/edit page
└── components/
    ├── preset-list.tsx
    ├── preset-card.tsx
    ├── preset-form.tsx
    └── preset-selector.tsx

app/(chat)/api/presets/  # NEW - Preset API routes
├── route.ts            # GET all, POST new
└── [id]/
    └── route.ts        # GET, PATCH, DELETE single
```

#### System Prompt Builder
```
lib/prompts/            # NEW - Prompt building logic
├── builder.ts          # Build system prompt from components
├── formatter.ts        # Format prompt sections
├── types.ts            # Prompt-related types
└── __tests__/          # Unit tests for prompt building
    └── builder.test.ts
```

#### Custom UI Components
```
components/component-lib/  # NEW - Our custom components
├── settings-sidebar.tsx   # Component/Preset selector sidebar
├── component-selector.tsx # Dropdown for component selection
├── preset-activator.tsx   # One-click preset activation
└── prompt-preview.tsx     # Show generated prompt
```

#### Subscription System (Future)
```
lib/subscriptions/      # NEW - Billing integration
├── polar.ts           # Polar SDK integration
├── tiers.ts           # Subscription tier definitions
├── limits.ts          # Feature limits per tier
└── webhooks.ts        # Webhook handlers

app/billing/            # NEW - Billing dashboard
├── page.tsx           # Subscription management
└── components/
    ├── plan-selector.tsx
    ├── usage-stats.tsx
    └── billing-history.tsx
```

---

## Modified Code (Careful Merge Required)

### ⚠️ Files We Extend - Manual Merge Needed

These files exist in the original but we add to them:

#### Database Schema Extension
```
lib/db/schema.ts
```
**Original Content**: Users, chats, messages, documents, votes
**Our Additions**: 
- `componentTypeEnum` - Enum for component types
- `components` table - Component storage
- `presets` table - Preset storage

**Merge Strategy**:
- Keep all original tables
- Add our new tables at the end
- Prefix our tables/enums clearly
- Never modify original table structures

**Example**:
```typescript
// Original tables (don't touch)
export const users = pgTable('users', { ... })
export const chats = pgTable('chats', { ... })

// Our extensions (at the end)
export const componentTypeEnum = pgEnum('component_type', [
  'role', 'style', 'context', 'mode'
])

export const components = pgTable('components', {
  // our schema
})
```

#### Database Queries Extension
```
lib/db/queries.ts
```
**Original Content**: Chat queries, message queries, user queries
**Our Additions**: Component queries, preset queries

**Merge Strategy**:
- Keep all original functions
- Add our new functions at the end
- Use separate comment sections
- Follow original naming patterns

#### Environment Variables
```
.env.example
```
**Original Content**: Database, Auth, AI provider keys, Blob storage
**Our Additions**: Subscription (Polar) keys (future)

**Merge Strategy**:
- Keep all original variables
- Add ours in a separate section with comments
- Document what each new variable is for

#### Chat API Route (Prompt Injection)
```
app/(chat)/api/chat/route.ts
```
**Original Content**: Full chat API with AI SDK streaming
**Our Modification**: Inject custom system prompt

**Merge Strategy**:
- Minimize changes to this file
- Only modify system prompt generation
- Keep all other functionality intact
- Test thoroughly after upstream updates

**Critical Section**:
```typescript
// Our addition (minimal):
import { getActivePreset, buildSystemPrompt } from '@/lib/prompts'

// Inside POST handler:
const activePreset = await getActivePreset(session.user.id, chatId)
const customSystemPrompt = activePreset 
  ? await buildSystemPrompt(activePreset)
  : undefined

const result = streamText({
  model: selectedModel,
  system: customSystemPrompt || systemPrompt, // Our change
  messages: coreMessages,
  // ... rest unchanged
})
```

#### Middleware (Subscription Checks - Future)
```
middleware.ts
```
**Original Content**: Auth checks
**Our Addition**: Subscription tier checks (future)

**Merge Strategy**:
- Keep original auth logic
- Add subscription checks as separate middleware
- Chain middlewares properly
- Don't break existing auth flow

#### Root Layout
```
app/layout.tsx
```
**Original Content**: Theme provider, font setup, base HTML
**Our Potential Additions**: Analytics, error tracking (future)

**Merge Strategy**:
- Keep original structure
- Add providers at the end
- Don't modify existing providers
- Test server components carefully

---

## Documentation Files

### 📚 Our Documentation - Not in Original

These are entirely our additions and won't conflict with upstream:

```
docs/
├── VISION.md              # Our product vision
├── CODING_STANDARDS.md    # Our code standards
└── UPDATE-WORKFLOW.md     # Our git workflow

memory-bank/              # Our Memory Bank
├── projectbrief.md
├── productContext.md
├── activeContext.md
├── systemPatterns.md
├── techContext.md
├── progress.md
└── codeOrganization.md   # This file

.clinerules               # Our Cline configuration
```

---

## File Classification Quick Reference

### 🟢 Accept All Upstream Changes
- `lib/ai/*` (except our additions)
- `components/ui/*`
- `components/chat.tsx`, `multimodal-input.tsx`, etc.
- `artifacts/*`
- `app/(auth)/*`
- Original `lib/db/` utilities

### 🟡 Manual Review Required
- `lib/db/schema.ts` (we extend)
- `lib/db/queries.ts` (we extend)
- `app/(chat)/api/chat/route.ts` (we modify minimally)
- `.env.example` (we add variables)
- `middleware.ts` (future modifications)

### 🔴 Never Accept Upstream Changes
- `docs/*` (our documentation)
- `memory-bank/*` (our Memory Bank)
- `lib/components/*` (doesn't exist upstream)
- `lib/presets/*` (doesn't exist upstream)
- `lib/prompts/*` (doesn't exist upstream)
- `lib/subscriptions/*` (doesn't exist upstream)
- `app/components/*` (doesn't exist upstream)
- `app/presets/*` (doesn't exist upstream)
- `components/component-lib/*` (doesn't exist upstream)
- `.clinerules` (our file)

---

## Update Workflow Summary

When merging from upstream:

1. **Fetch upstream**: `git fetch upstream`
2. **Review changes**: `git log upstream/main --oneline`
3. **Check this file**: Identify which files are affected
4. **Merge strategy**:
   - 🟢 Green files: Accept all changes
   - 🟡 Yellow files: Manual merge, careful review
   - 🔴 Red files: Keep ours, reject upstream (shouldn't happen)
5. **Test thoroughly**: Especially chat API and database
6. **Update Memory Bank**: Document any new patterns learned

For detailed merge instructions, see `docs/UPDATE-WORKFLOW.md`.

---

## Migration Strategy

### Database Migrations

**Original Migrations** (in `lib/db/migrations/`):
- `0000_keen_devos.sql` through `0007_flowery_ben_parker.sql`
- Never modify these
- Accept new ones from upstream

**Our Migrations** (future):
- `0008_*_custom_components.sql` (our first)
- `0009_*_custom_presets.sql` (our second)
- Prefix with `custom_` in description
- Keep separate from upstream

**Conflict Resolution**:
- If upstream adds migration 0008, ours becomes 0009
- Renumber our migrations accordingly
- Never conflict on same table

---

## Testing Strategy

### Test Files

**Original Tests**:
```
tests/
├── e2e/              # Keep, let upstream maintain
├── routes/           # Keep, let upstream maintain
└── prompts/          # Keep, let upstream maintain
```

**Our Tests** (to add):
```
tests/
├── components/       # NEW - Our component tests
├── presets/          # NEW - Our preset tests
└── prompts/          # NEW - Our prompt builder tests
```

### Testing After Upstream Merge

Must test:
1. Chat still works
2. Streaming still works
3. Our prompt injection still works
4. Component CRUD works
5. Preset CRUD works
6. Database queries work

---

**Key Principle**: When in doubt, check this file. It's the source of truth for what we own vs. what upstream owns.
