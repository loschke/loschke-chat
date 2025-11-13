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

### Critical Finding 🔴
**Preset Components Design Error Identified**

Junior Dev's DATABASE_SCHEMA.md and API_DESIGN.md have a **critical error**:
- Preset components are defined as REQUIRED (`.notNull()`)
- Vision explicitly states: "All 4 components are optional in a preset"
- This violates Decision #5 in systemPatterns.md

**Impact**:
- Users cannot create presets with only 2-3 components
- Contradicts "gradual adoption" principle
- Blocks flexibility that is core to the value proposition

**Status**: Documented in docs/REVIEW_API_DATABASE.md
**Next Step**: Corrections must be made before implementation

### In Progress 🔄
- [ ] Junior Dev to correct API and Database schemas
- [ ] Validate corrections against VISION.md
- [ ] Proceed with database schema implementation

## Next Steps

### Immediate (This Session)
1. Complete all Memory Bank files
2. Create .clinerules with full Cline Memory Bank integration
3. Commit all new documentation to repository
4. Test Memory Bank by starting new conversation

### Short-term (Next Sessions)
1. Analyze existing database schema (`lib/db/schema.ts`)
2. Plan database extensions for components and presets
3. Design component system architecture:
   - API routes structure
   - Database schema additions
   - UI component layout
4. Create initial component CRUD implementation

### Medium-term (Next Week)
1. Implement component management:
   - Backend: API routes + database operations
   - Frontend: Component library UI
2. Implement preset management:
   - Backend: Preset CRUD operations
   - Frontend: Preset selector UI
3. Build system prompt builder logic
4. Integrate prompt builder with chat API

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
