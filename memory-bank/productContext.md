# Product Context

## Why This Project Exists

### The Pain Point

Every professional who uses LLMs regularly experiences the same frustration:

**Example: Marketing Consultant starting a new chat:**
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

### The Impact
- **Time Loss**: 2-5 minutes per chat × 10-50 chats/week = 20-250 minutes/week wasted
- **Quality Inconsistency**: Small variations in wording → varying AI output quality
- **Cognitive Load**: Remembering what to include for each context
- **Friction**: Slows down actual work, reduces flow state

## How It Should Work

### User Journey: First Time User

1. **Immediate Access**: Sign up → Start chatting (no forced onboarding)
2. **Discovery**: Notice settings icon, explore at own pace
3. **First Component**: Create a "Marketing Expert" role (takes <2 minutes)
4. **Aha Moment**: Next chat uses role → saves time → sees value
5. **Building Library**: Gradually adds more components
6. **Power User**: Creates presets for frequent combinations

### User Journey: Power User

**Morning**: 
- One-click activate "LinkedIn Pro" preset (Role + Style + Client A Context + Ship Mode)
- 10 focused chats about content strategy
- Save 20+ minutes vs. manual context entry

**Afternoon**:
- Switch to "Code Review" preset (Senior Dev + Technical Style + Project X Context)
- Review PRs with AI assistance
- Consistent, high-quality feedback

**Evening**:
- Quick "Brainstorm Mode" session for new ideas
- No preset needed, just select Mode component
- Flexibility when experimentation is needed

## Problems We Solve

### 1. Context Re-entry
**Before**: Copy-paste prompts from notes, adjust each time
**After**: One-click preset activation

### 2. Consistency
**Before**: Slight variations → inconsistent quality
**After**: Reusable components → reliable output

### 3. Multi-Context Work
**Before**: Confusing different client contexts, mixing details
**After**: Clear contexts, easy switching

### 4. Knowledge Capture
**Before**: Expertise stays in heads or scattered notes
**After**: Components = reusable knowledge library

### 5. Onboarding
**Before**: New team members need to learn "good prompts"
**After**: Share preset library (future team feature)

## Problems We DON'T Solve

- We don't train custom AI models
- We don't create content (AI does)
- We don't replace domain expertise
- We don't work offline (web-only)
- We don't integrate with Slack/Discord (MVP)

## Value Proposition

### For Individual Users

**Time Savings**
- 17-200 hours per year saved
- ROI: $9/month easily justified

**Quality Improvement**
- Consistent prompts → better AI responses
- No more "forgot to mention X"

**Flexibility**
- Works with multiple LLM providers
- Not locked into one ecosystem
- Can switch mid-conversation

**Knowledge Building**
- Component library grows over time
- Capture expertise in reusable form

### Competitive Differentiation

**vs. Custom GPTs (OpenAI)**
- ❌ They're locked to OpenAI
- ❌ Static (set once, can't change)
- ✅ We're multi-provider
- ✅ Dynamic switching

**vs. Claude Projects (Anthropic)**
- ❌ They're locked to Claude
- ❌ Project-level only
- ✅ We're multi-provider
- ✅ Modular components

**vs. ChatGPT Teams**
- ❌ They're expensive ($25-30/mo)
- ❌ No modular prompts
- ✅ We're affordable ($9/mo)
- ✅ Flexible combinations

## Product Principles

### 1. Chat First
The chat interface is primary. Everything else is secondary.
- Settings enhance but don't block
- Familiar interface (looks like ChatGPT/Claude)
- Zero friction to first message

### 2. Progressive Disclosure
Reveal complexity gradually.
- New users: Simple chat
- Curious users: Discover settings
- Power users: Advanced features

### 3. Flexibility Over Prescription
Don't force rigid workflows.
- Optional settings (not required)
- Manual OR preset mode (user choice)
- Build library at own pace

### 4. Multi-Provider by Design
Never lock users in.
- Support Anthropic, OpenAI, others
- User can switch per chat
- Future-proof as landscape evolves

### 5. Professional Focus
Built for work, not entertainment.
- B2B/professional use cases
- Serious UI (not playful)
- Productivity-focused features

## User Experience Goals

### Onboarding
- **Goal**: <30 seconds from signup to first chat
- **Measure**: Time to first message
- **Why**: Zero friction is critical

### Component Creation
- **Goal**: <2 minutes to create first component
- **Measure**: Time from "create" click to saved
- **Why**: Low barrier to adoption

### Preset Creation
- **Goal**: <1 minute from selection to saved preset
- **Measure**: Workflow completion time
- **Why**: Easy workflow capture

### Daily Usage
- **Goal**: Component/preset used in >70% of chats
- **Measure**: Active usage rate
- **Why**: Feature must provide real value

## Success Metrics

### Activation (Value Understanding)
- >60% of signups create ≥1 component
- Tracks days to first component creation

### Engagement (Feature Adoption)
- >70% of chats use components/presets
- Percentage of chats with settings active

### Retention (Product Stickiness)
- >50% 7-day retention
- Users returning after first week

### Conversion (Willingness to Pay)
- >10% Free → Pro conversion
- Percentage upgrading within 30 days

## What Makes This Special

This isn't just another chat wrapper. We're solving a real, daily pain point.

**Why it matters:**
- LLMs are becoming as common as search engines
- Context quality = output quality
- Time saved compounds exponentially
- Professionals need consistency

**Why now:**
- LLMs mature enough for daily professional use
- Multiple viable providers (not just OpenAI)
- Market ready for "next generation" interfaces
- Vercel Chat SDK makes solid foundation accessible

**Why us:**
- Deep understanding (daily LLM users ourselves)
- Technical expertise (building with Claude Code)
- Clear professional use cases
- Lean approach validates fast
