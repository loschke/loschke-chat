# Product Vision

## The Problem We're Solving

Professionals who use LLMs (Large Language Models) daily face a repetitive problem: **context re-entry**.

Every new chat requires manually typing the same information:
- Role assignment ("You are a marketing expert...")
- Writing style preferences ("Use professional tone...")
- Domain/project knowledge ("Working on Project X with...")
- Interaction mode ("Focus on execution...")

**This is:**
- Time-consuming (2-5 minutes per chat)
- Error-prone (inconsistent wording → varying quality)
- Not scalable (multi-client work needs different contexts)
- Friction that slows down actual work

### Real-World Example

**Marketing Consultant starting a new chat:**
```
"Du bist ein Social Media Marketing Experte mit Spezialisierung auf LinkedIn 
und B2B-Kommunikation. Nutze professionelle, aber nicht steife Sprache. 
Sei konkret und umsetzungsorientiert.

Kontext: Ich arbeite mit einem SaaS-Startup an deren LinkedIn-Strategie. 
Zielgruppe sind CTOs in Unternehmen mit 100-1000 Mitarbeitern.
Budget: 10h/Woche für Content Creation.

Mode: Ship Mode - gib mir konkrete, sofort umsetzbare Ideen mit Zeitplan."
```

This gets typed (or copy-pasted with variations) **dozens of times per week**.

---

## Our Solution

### Modular System Prompts

Break context into **4 reusable components** that can be defined once and combined flexibly:

**1. Role** - Who is the AI assistant?
- Examples: "Marketing Expert", "Senior Developer", "Business Strategist"
- User defines once, reuses across chats

**2. Style** - How should it communicate?
- Examples: "Professional B2B", "Casual & Authentic", "Technical & Precise"
- Ensures consistent tone

**3. Context** - What domain knowledge is relevant?
- Examples: Project details, client info, technical specs, company knowledge
- Can have multiple contexts (per project, per client)

**4. Mode** - What's the interaction style?
- Examples: "Brainstorm Mode" (exploratory), "Ship Mode" (execution-focused)
- Changes how the AI approaches problems

### Two Usage Patterns

**Manual Mode (Flexible)**
- Select 0-4 components individually via dropdowns
- Mix and match on the fly
- Quick adjustments during conversation
- Example: "Just need Role + Mode for this chat"

**Preset Mode (Fast)**
- Save frequently used combinations with a name
- One-click activation
- Examples:
  - "LinkedIn Pro" = Marketing Expert + Professional Style + Client A Context + Ship Mode
  - "Code Review" = Senior Dev + Technical Style + Project X Context + Analytical Mode

### Key Principle: Optional Enhancement

**CRITICAL:** The chat works immediately without any setup.
- Settings are an **enhancement**, not a requirement
- Users can start chatting right after signup
- Components/Presets improve the experience but aren't mandatory
- Progressive disclosure: complexity revealed gradually

---

## Target Users

### Primary Personas

**1. Content Creators & Marketing Professionals**
- Create content for multiple brands/clients
- Need consistent brand voice
- Switch between channels (LinkedIn, Blog, Email)
- Use Case: Different presets per client

**2. Freelance Consultants**
- Work with multiple clients simultaneously
- Each client has unique terminology/processes
- Need quick context switching
- Use Case: Client-specific contexts

**3. Developers & Technical Writers**
- Multiple projects with different tech stacks
- Need context about architecture, conventions
- Switch between coding and documentation
- Use Case: Project-specific technical contexts

**4. Startup Founders**
- Wear many hats (strategy, marketing, product)
- Need different interaction modes
- Fast-paced, iterative work
- Use Case: Mode switching (brainstorm vs execution)

### User Characteristics

- Already heavy LLM users (not beginners)
- Work across multiple contexts/projects/clients
- Value efficiency and consistency
- Willing to invest setup time for long-term gains
- Primarily professional use (not casual/entertainment)

---

## Value Proposition

### For Users

**Time Savings**
- 2-5 minutes saved per chat
- 10-50 chats per week = 20-250 minutes/week saved
- That's 17-200 hours per year

**Quality Improvement**
- Consistent, well-crafted prompts
- No more "forgot to mention X"
- Better AI responses from better prompts

**Flexibility**
- Works across providers (not locked to one LLM)
- Can switch mid-conversation
- Adapts to different work modes

**Knowledge Building**
- Component library grows over time
- Capture expertise in reusable form
- Share knowledge (future: team features)

### For the Business

**Clear Monetization**
- Free tier: Validate value proposition
- Pro tier ($9/mo): Individual professionals
- Business tier ($29/mo): Heavy users

**Differentiation**
- No competitor offers modular prompts across providers
- Custom GPTs/Claude Projects are static and provider-locked
- We're dynamic, flexible, multi-provider

**Scalability**
- Start single-user, expand to teams later
- Built on solid foundation (Vercel Chat SDK)
- Clear expansion path (collaboration, marketplace)

---

## Product Principles

### 1. Chat First
The chat interface is the primary experience. Everything else is secondary.
- Settings enhance but don't block
- Zero friction onboarding
- Familiar interface (looks like ChatGPT/Claude)

### 2. Progressive Disclosure
Reveal complexity gradually as users need it.
- New users see simple chat
- Subtle hints guide discovery
- Advanced features available but not prominent
- Empty states teach without overwhelming

### 3. Flexibility Over Prescription
Don't force users into rigid workflows.
- Optional settings (not required)
- Manual OR preset mode (user choice)
- Switch anytime during conversation
- Build library at own pace

### 4. Multi-Provider by Design
Never lock users to one LLM provider.
- Support Anthropic, OpenAI, and more
- User can switch per chat
- Abstract away provider differences
- Future-proof as LLM landscape evolves

### 5. Professional Focus
Built for work, not entertainment.
- B2B/professional use cases
- Serious UI (not playful)
- Productivity-focused features
- Enterprise expansion path

---

## Success Criteria

### Product Metrics (MVP Phase)

**Activation**
- Goal: >60% of signups create at least 1 component
- Measure: Days to first component creation
- Why: Indicates value understanding

**Engagement**
- Goal: >70% of chats use components or presets
- Measure: % chats with settings active
- Why: Indicates feature adoption

**Retention**
- Goal: >50% 7-day retention
- Measure: Users returning after 7 days
- Why: Indicates product stickiness

**Conversion**
- Goal: >10% Free → Pro conversion
- Measure: % free users upgrading within 30 days
- Why: Indicates willingness to pay

### User Experience Metrics

**Time to First Message**
- Goal: <30 seconds from signup to first chat
- Why: Zero friction onboarding

**Component Creation Time**
- Goal: <2 minutes to create first component
- Why: Low setup barrier

**Preset Creation Time**
- Goal: <1 minute from manual selection to saved preset
- Why: Easy workflow capture

### Business Metrics (Post-Launch)

**MRR Growth**
- Goal: 20% month-over-month in first 6 months
- Measure: Monthly Recurring Revenue

**Churn Rate**
- Goal: <5% monthly churn
- Measure: % subscribers cancelling

**LTV:CAC Ratio**
- Goal: >3:1 within 12 months
- Measure: Lifetime Value vs Customer Acquisition Cost

---

## MVP Scope

### ✅ In Scope (Version 1)

**Must-Have Features**
- [x] User authentication (Auth.js from Chat SDK)
- [x] Component library (CRUD for 4 types: role, style, context, mode)
- [x] Preset management (CRUD, one-click activation)
- [x] Chat interface with optional settings sidebar
- [x] Multi-provider support (Anthropic Claude, OpenAI GPT)
- [x] In-chat component switching (change during conversation)
- [x] Usage tracking (component/preset popularity)
- [x] Subscription management (Free, Pro, Business via Polar)

**UI/UX**
- [x] Chat interface (from Chat SDK, looks familiar)
- [x] Settings sidebar (collapsible, manual + preset modes)
- [x] Component manager page
- [x] Preset library page
- [x] Billing/subscription dashboard
- [x] Empty states with guidance

### ❌ Out of Scope (Post-MVP)

**Multi-Tenant Features** (Version 2)
- Organizations/Teams
- Sharing components/presets
- Collaboration features
- Permission management
- Team billing

**Advanced Features** (Version 2+)
- Chat branching (Git-like conversation trees)
- Component versioning (v1, v2, etc.)
- A/B testing presets
- Advanced analytics dashboard
- Template marketplace
- Public API for integrations
- Mobile native apps

**Enterprise Features** (Version 3+)
- SSO (SAML, OIDC)
- Custom branding
- Audit logs
- Compliance features (GDPR, SOC2)
- On-premise deployment
- Dedicated support SLA

---

## Non-Goals

Things we explicitly **will not** do in MVP:

❌ **AI Training/Fine-tuning** - We use existing models, don't train custom ones  
❌ **Image Generation** - Focus on text chat only  
❌ **Voice Input/Output** - Text-based interface only  
❌ **Social Features** - No feed, likes, comments, etc.  
❌ **Content Moderation** - Trust users, add only if needed  
❌ **Mobile Apps** - Web-first, responsive design sufficient  
❌ **White-label/Reseller** - B2C SaaS only  
❌ **Integrations** - No Slack/Discord/etc. in MVP

---

## Competitive Positioning

### Existing Solutions

**Custom GPTs (OpenAI)**
- ❌ Locked to OpenAI only
- ❌ Static configuration (set once, can't change)
- ❌ No mid-conversation switching
- ❌ No modular components
- ✅ Easy to create

**Claude Projects (Anthropic)**
- ❌ Locked to Claude only
- ❌ Project-level only (not modular)
- ❌ No flexible combinations
- ✅ Good for project context
- ✅ Knowledge base features

**Character.ai, Poe**
- ❌ Fixed character roles
- ❌ Consumer/entertainment focused
- ❌ Not professional/business oriented

**ChatGPT Teams, Claude for Work**
- ✅ Team features
- ❌ Still no modular prompts
- ❌ Provider-locked
- ❌ Expensive for individuals

### Our Unique Value

✅ **Provider-Agnostic** - Works with multiple LLMs, not locked-in  
✅ **Modular** - Mix and match components freely  
✅ **Dynamic** - Switch components mid-conversation  
✅ **Professional Focus** - Built for work, not play  
✅ **Personal Library** - Build expertise over time  
✅ **Affordable** - $9/mo vs $25-30/mo for alternatives

---

## Long-Term Vision (Beyond MVP)

### Phase 1: Single User (MVP)
Individual professionals managing their own prompt library.

### Phase 2: Teams (6-12 months)
- Organizations with multiple members
- Shared component libraries
- Role-based permissions
- Team billing

### Phase 3: Marketplace (12-18 months)
- Public template library
- Users share/sell preset collections
- Industry-specific starter packs
- Community-driven content

### Phase 4: Enterprise (18-24 months)
- SSO and compliance features
- Custom integrations
- Dedicated support
- White-glove onboarding

### Phase 5: Platform (24+ months)
- Public API
- Third-party integrations
- Plugin ecosystem
- Become the "prompt layer" for LLM applications

---

## Risks & Mitigation

### Technical Risks

**Risk:** OpenAI/Anthropic APIs change, break our integration  
**Mitigation:** Use Vercel AI SDK which abstracts providers, monitor changelogs

**Risk:** Chat SDK changes break our extensions  
**Mitigation:** Pin SDK version, keep extensions loosely coupled, monitor updates

**Risk:** Database costs escalate with growth  
**Mitigation:** Neon serverless scales efficiently, can optimize queries, add caching

### Business Risks

**Risk:** OpenAI/Anthropic launch similar modular prompt feature  
**Mitigation:** Our multi-provider approach hedges this, move fast to build moat

**Risk:** Low willingness to pay for "just better prompts"  
**Mitigation:** Free tier validates value, target heavy users who feel pain most

**Risk:** Difficult user acquisition in crowded market  
**Mitigation:** Niche focus (professionals), word-of-mouth, community building

### Product Risks

**Risk:** Feature is too complex, users don't understand value  
**Mitigation:** Optional settings, progressive disclosure, clear empty states

**Risk:** Setup friction discourages adoption  
**Mitigation:** Chat works immediately, components enhance (not required)

**Risk:** Not enough differentiation from Custom GPTs  
**Mitigation:** Dynamic switching and multi-provider are clear differentiators

---

## Guiding Questions for Development

When making decisions during development, ask:

1. **Does this block the user from chatting?** → If yes, make it optional
2. **Does this add complexity to onboarding?** → If yes, defer or simplify
3. **Does this lock users to one provider?** → If yes, redesign
4. **Would a professional user value this daily?** → If no, deprioritize
5. **Can we leverage Chat SDK for this?** → If yes, don't rebuild

---

## What Makes This Project Special

This isn't just another chat wrapper. It's solving a real pain point that every professional LLM user faces daily.

**Why it matters:**
- LLMs are becoming as common as search engines
- Context quality determines output quality
- Professionals need consistency across conversations
- Time saved compounds exponentially

**Why now:**
- LLMs are mature enough for daily professional use
- Multiple viable providers (not just OpenAI anymore)
- Vercel Chat SDK makes building on solid foundation easy
- Market is ready for "next generation" chat interfaces

**Why us:**
- Deep understanding of the problem (Rico uses LLMs daily)
- Technical expertise to execute (working with Claude Code)
- Clear vision of professional use cases
- Lean approach to validate fast

---

## Success Looks Like

### 3 Months Post-Launch
- 500+ active users
- 50+ paying subscribers
- >60% weekly retention
- Users report saving 30+ minutes/week

### 6 Months Post-Launch
- 2,000+ active users
- 250+ paying subscribers ($2,250 MRR)
- Feature requests for team functionality
- Profitable on operating costs

### 12 Months Post-Launch
- 10,000+ active users
- 1,000+ paying subscribers ($10,000+ MRR)
- Launch team features (Phase 2)
- Recognized as "the tool" for professional LLM use

---

## Conclusion

This project solves a real, painful problem for a growing market of LLM power users. By building on Vercel's Chat SDK and adding modular prompt management, we create a tool that saves time, improves consistency, and scales across providers and use cases.

The MVP is achievable, the market is ready, and the path to monetization is clear.

**Let's build this.** 🚀
