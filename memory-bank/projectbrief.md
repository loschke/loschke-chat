# Project Brief: loschke-chat

## What We're Building

A professional AI chat application with **modular system prompts** that solves the context re-entry problem faced by LLM power users.

## The Core Problem

Professionals using LLMs daily waste 2-5 minutes per chat manually re-entering the same context:
- Role assignment ("You are a marketing expert...")
- Writing style preferences ("Use professional tone...")
- Domain/project knowledge ("Working on Project X...")
- Interaction mode ("Focus on execution...")

This is time-consuming, error-prone, and not scalable for multi-client work.

## Our Solution

### Modular System Prompts
Break context into **4 reusable components**:

1. **Role** - Who is the AI assistant? (e.g., "Marketing Expert", "Senior Developer")
2. **Style** - How should it communicate? (e.g., "Professional B2B", "Technical & Precise")
3. **Context** - What domain knowledge is relevant? (Project details, client info, technical specs)
4. **Mode** - What's the interaction style? (e.g., "Brainstorm Mode", "Ship Mode")

### Two Usage Patterns
- **Manual Mode**: Select 0-4 components individually on the fly
- **Preset Mode**: Save frequently used combinations for one-click activation

### Key Principle: Optional Enhancement
The chat works immediately without any setup. Components and presets enhance the experience but aren't mandatory.

## Technical Foundation

**Base**: Fork of [Vercel AI Chatbot](https://github.com/vercel/ai-chatbot)
- Next.js App Router
- AI SDK (multi-provider support)
- Auth.js for authentication
- Neon Serverless Postgres
- shadcn/ui components

**Our Extensions**:
- Component management system (CRUD for 4 types)
- Preset management (save/load combinations)
- System prompt builder
- Subscription/billing integration (Polar)

## Architectural Principle

**Extension over Modification**
- Keep Chat SDK core untouched where possible
- Build new features in separate modules
- Maintain updateability from upstream
- Clear separation: custom vs. original code

## Target Users

- Content creators & marketing professionals
- Freelance consultants
- Developers & technical writers
- Startup founders

All are heavy LLM users who work across multiple contexts/projects/clients.

## Success Criteria (MVP)

- **Activation**: >60% of signups create at least 1 component
- **Engagement**: >70% of chats use components or presets
- **Retention**: >50% 7-day retention
- **Time Savings**: Users report saving 30+ minutes/week

## Monetization

- Free tier: Validate value proposition
- Pro tier ($9/mo): Individual professionals
- Business tier ($29/mo): Heavy users

## Project Status

**Phase**: Initial setup and architecture planning
**Repository**: https://github.com/loschke/loschke-chat
**Upstream**: https://github.com/vercel/ai-chatbot

## Key Documents

- Vision: `docs/VISION.md` (comprehensive product vision)
- Coding Standards: `docs/CODING_STANDARDS.md`
- Update Workflow: `docs/UPDATE-WORKFLOW.md` (upstream merge strategy)
- This Memory Bank: `memory-bank/` (context preservation)
