# Active Context

## Current Focus

**Phase**: Project initialization and setup
**Sprint**: Setting up Memory Bank, .clinerules, and development environment

## Recently Completed

### Repository Setup ✅
- [x] Forked Vercel AI Chatbot to https://github.com/loschke/loschke-chat
- [x] Git remotes configured:
  - `origin`: Your fork for custom changes
  - `upstream`: Vercel original for updates
- [x] All original files imported (200 files)
- [x] VISION.md preserved and committed

### Documentation ✅
- [x] Moved documentation to `docs/` folder:
  - `docs/VISION.md` - Comprehensive product vision
  - `docs/CODING_STANDARDS.md` - Code standards and best practices
  - `docs/UPDATE-WORKFLOW.md` - Git strategy for upstream updates
- [x] Memory Bank structure planned and being implemented

## Current Work

### Recently Completed ✅
- [x] Complete Memory Bank structure created
- [x] .clinerules with full Memory Bank integration
- [x] Review of API_DESIGN.md and DATABASE_SCHEMA.md from Junior Dev
- [x] Critical design error identified and documented
- [x] DATABASE_SCHEMA.md corrected (all preset components nullable)
- [x] API_DESIGN.md corrected (Zod validation with .refine())
- [x] Examples with partial presets added (2-component, 3-component)
- [x] Priority logic clarified (presetId > manual > default)
- [x] All corrections committed and pushed

### Key Corrections Made ✅
**Preset Components Design - FIXED**

**Changes Applied**:
- ✅ Database Schema: All 4 component IDs are now nullable
- ✅ Migration SQL: Removed NOT NULL constraints
- ✅ ON DELETE behavior: SET NULL (presets survive component deletion)
- ✅ Zod Schema: All IDs .optional() with .refine() for minimum 1
- ✅ API Validation: Type checking for each provided component
- ✅ Examples: Added 2-component and 3-component preset examples

**Now Aligned With**:
- ✅ VISION.md: "All 4 components are optional in a preset"
- ✅ systemPatterns.md Decision #5: Maximum flexibility
- ✅ Product Principle: Progressive disclosure and gradual adoption

### Current Status 🎯
- Documentation complete and correct
- Database schema design finalized
- API design finalized
- Ready for implementation phase

## Next Steps

### Current Development Plan: Backend-First Approach ✅

**Decision made**: We follow a **Backend-First Development Strategy**.

**Rationale**:
- Complex Chat SDK integration requires real backend behavior
- System prompt injection logic needs real-time streaming
- Database relations (ON DELETE SET NULL) must be tested with real data
- Validation logic (1-4 components, type checking) needs practical verification
- Usage tracking with transactions requires real database operations

### Phase 1: Backend Foundation (Week 1-2) 🎯

**Priority**: Funktionierende Datenbank und API

1. **Database Setup** ✅ (Documented)
   - [x] Migration SQL created (DATABASE_SCHEMA.md)
   - [x] Query patterns defined
   - [x] Usage tracking queries documented
   - [ ] Execute migrations in Neon
   - [ ] Create seed script
   - [ ] Test connection

2. **Component CRUD**
   - [ ] `/api/components` (GET, POST, PATCH, DELETE)
   - [ ] Zod validation schemas
   - [ ] Subscription limits enforcement
   - [ ] Type validation (role must be type='role')

3. **Preset CRUD**
   - [ ] `/api/presets` (GET, POST, PATCH, DELETE)
   - [ ] 1-4 Component validation (.refine())
   - [ ] Type checking per component
   - [ ] Transaction for component usage tracking

4. **Chat Extension**
   - [ ] System Prompt Builder (`lib/prompts/builder.ts`)
   - [ ] Modify `/api/chat` route
   - [ ] Priority Logic (preset > manual > default)
   - [ ] Usage tracking in `onFinish` callback

5. **Usage Dashboard** 🆕
   - [ ] `/api/usage` endpoint
   - [ ] Token aggregation per billing cycle
   - [ ] Alert thresholds (80%, 90%, 95%, 100%)
   - [ ] Limit checking logic

**Nach Phase 1 haben wir:**
- ✅ Funktionierendes Backend
- ✅ Testbare API (Postman/Insomnia)
- ✅ Echte AI-Responses mit custom prompts
- ✅ Validierte Geschäftslogik
- ✅ Token Tracking und Limits

### Phase 2: UI Implementation (Week 3-4)

**Priority**: Benutzerfreundliche Oberfläche

1. **Component Library UI**
   - [ ] `/app/components/page.tsx`
   - [ ] Component Cards mit Edit/Delete
   - [ ] Create Component Form
   - [ ] Type-Filter (Role/Style/Context/Mode)

2. **Preset Manager UI**
   - [ ] `/app/presets/page.tsx`
   - [ ] Preset Cards
   - [ ] Component Selector (1-4 Dropdowns)
   - [ ] One-Click Activation

3. **Chat Interface Extension**
   - [ ] Settings Sidebar (collapsible)
   - [ ] Manual Mode (4 separate dropdowns)
   - [ ] Preset Mode (single dropdown)
   - [ ] Mid-conversation switching

4. **Usage Dashboard UI** 🆕
   - [ ] Token usage visualization
   - [ ] Progress bar (shadcn/ui)
   - [ ] Plan limits display
   - [ ] Alert system
   - [ ] Upgrade CTA

**Nach Phase 2 haben wir:**
- ✅ Vollständig funktionale App
- ✅ Testing mit echten Daten
- ✅ Keine Mock-zu-Real Migration
- ✅ User kann Token-Verbrauch sehen

### Phase 3: Polish & Features (Week 5+)

1. **UX Improvements**
   - [ ] Empty States mit Onboarding
   - [ ] Keyboard Shortcuts
   - [ ] Toast Notifications
   - [ ] Loading States

2. **Search & Filter**
   - [ ] Component search by name/tags
   - [ ] Preset filtering
   - [ ] Sort options

3. **Analytics**
   - [ ] Daily usage charts
   - [ ] Usage by preset
   - [ ] Heavy chat detection

4. **Optimization**
   - [ ] Query performance testing
   - [ ] Index verification
   - [ ] Caching strategy

## Active Decisions

### Architectural
- **Extension over Modification**: Never modify Chat SDK core files directly
- **Separation of Concerns**: Custom code in separate modules (`lib/prompts/`, `lib/components/`, etc.)
- **Database Strategy**: Extend schema with new tables, don't modify existing ones
- **Update Strategy**: Monthly upstream merges with careful conflict resolution

### Technical
- **TypeScript Strict Mode**: Always enabled, no exceptions
- **No `any` Types**: Use `unknown` with type guards instead
- **Input Validation**: Zod schemas for all user input
- **Auth Pattern**: Check authentication first in every protected endpoint

### Documentation
- **Memory Bank**: Primary context preservation system
- **Git Strategy**: Maintain clean separation between custom and original code
- **Coding Standards**: Follow existing patterns from Chat SDK

## Important Patterns & Preferences

### Code Organization
- Custom features in isolated modules
- Use composition over modification
- Leverage Chat SDK's existing infrastructure
- Maintain updateability from upstream

### Development Workflow
1. Plan in PLAN MODE
2. Implement in ACT MODE
3. Update Memory Bank after significant changes
4. Start new sessions with "follow your custom instructions"

### Git Workflow
- Commit messages follow conventional commits format
- Branch names: `<type>/<description>` (e.g., `feature/component-system`)
- Regular upstream updates: `git fetch upstream && git merge upstream/main`

## Project Insights & Learnings

### What's Working Well
- **Fork Strategy**: Clean separation between our work and upstream
- **Documentation First**: Setting up Memory Bank and docs before coding
- **Existing Foundation**: Chat SDK provides solid base (auth, UI, AI integration)

### Key Realizations
- **Chat SDK is feature-rich**: Many components we can reuse (sidebar, chat interface, model selector)
- **Ultracite Rules**: Already in place for code quality (`.cursor/rules/ultracite.mdc`)
- **Database Setup**: Drizzle ORM with migrations already configured
- **Auth Ready**: Auth.js fully configured with login/register pages

### Technical Considerations
- **System Prompt Injection**: Need to modify chat API route carefully to inject built prompts
- **Component Storage**: Database schema needs 4 component types (role, style, context, mode)
- **Preset Relations**: Presets link to 4 optional component IDs
- **Usage Tracking**: Track component/preset usage for analytics

## Context for Next Session

When resuming work, remember:
1. This is a fork of Vercel AI Chatbot - maintain updateability
2. Memory Bank is now set up - always read it at session start
3. Custom code goes in separate modules, not in Chat SDK core
4. Follow docs/CODING_STANDARDS.md for all new code
5. Check docs/UPDATE-WORKFLOW.md before upstream merges

## Questions & Open Items

### Technical Questions
- How to best inject system prompts into streaming responses?
- Should components be user-specific only, or allow sharing later?
- Pagination strategy for component lists?
- Rate limiting for expensive operations?

### Product Questions
- Default components to create for new users?
- Maximum components per user (free vs. pro)?
- Should presets auto-update when components change?

### Infrastructure
- Need to set up:
  - Environment variables (.env.local)
  - Neon database connection
  - API keys for LLM providers
  - Billing integration (Polar)

---

**Last Updated**: 2024-11-13 (Initial creation during Memory Bank setup)
**Next Update**: After completing component system architecture
