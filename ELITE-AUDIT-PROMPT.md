# Fresh Path CRM — Elite Audit & Competitive Domination Prompt

Paste this into a new Claude Code conversation to run a full audit of the CRM.

---

## Prompt

You are performing an elite-tier audit of Fresh Path CRM — a production Next.js 14 CRM for a mobile auto detailing business deployed on Vercel with Turso (SQLite). The goal: make this the #1 CRM in the mobile detailing / field service space that absolutely destroys every competitor (Jobber, Housecall Pro, ServiceTitan, Urable, DetailPro).

This is NOT a code review. This is a product & engineering audit to find every gap, every missing feature, every broken flow, every UX failure, and every opportunity to leapfrog the competition.

## What You Have Access To

- **47 pages** in `app/(app)/`
- **173 API routes** in `app/api/`
- **54 database tables** in `src/db/schema.ts`
- **15 service modules** in `lib/services/`
- **Integrations:** Stripe, Twilio, Google Voice/Gmail, Resend/SendGrid
- **AI features:** Chat copilot, call summaries, data extraction, social post generation
- **Chrome extension** for lead capture

## Audit Scope — Check EVERYTHING

### 1. FEATURE COMPLETENESS AUDIT
Compare against the top 5 competitors in field service CRM. For each, identify:
- Features we have that they don't (our moat)
- Features they have that we're missing (gaps to close)
- Features nobody has yet (opportunity to innovate)

Focus areas:
- Customer lifecycle (lead → quote → job → invoice → payment → review → referral → repeat)
- Scheduling & dispatch (calendar, route optimization, crew management)
- Financial (estimates, invoices, payments, expenses, P&L, tax)
- Communications (SMS, email, voice, in-app chat, notifications)
- Marketing (campaigns, automations, reviews, referrals, social)
- Reporting & analytics (KPIs, forecasting, customer insights)
- Mobile experience (field tech app, customer portal, booking page)
- Integrations (QuickBooks, Google Calendar, Zapier, social media)

### 2. UX/UI AUDIT
Read every page component in `app/(app)/`. For each major page, evaluate:
- Does the layout make sense for a detailer using this on a phone between jobs?
- Are there loading states, empty states, error states?
- Is the information hierarchy correct (most important info first)?
- Are there unnecessary clicks or confusing flows?
- Does the mobile experience work at 375px?
- Are forms too long? Are there smart defaults?
- Is the navigation intuitive? Can a non-technical detailer figure it out?

### 3. DATA MODEL AUDIT
Read `src/db/schema.ts` and `src/db/relations.ts`. Check:
- Are there missing fields that competitors track?
- Are relationships properly modeled?
- Are there orphaned tables or unused columns?
- Is the schema optimized for the queries we run?
- Are indexes on the right columns?
- Multi-tenant readiness — is tenantId consistently enforced?

### 4. API & BUSINESS LOGIC AUDIT
Spot-check 20-30 critical API routes for:
- Missing input validation (Zod schemas)
- Missing auth checks
- N+1 query patterns
- Missing error handling
- Race conditions (double-submit, concurrent updates)
- Missing pagination on list endpoints
- Inconsistent response formats

### 5. INTEGRATION AUDIT
For each integration (Stripe, Twilio, Google, SendGrid):
- Is the webhook handler robust (idempotency, signature verification)?
- Are we handling all relevant events?
- Are there retry mechanisms for failed operations?
- Are credentials stored securely?

### 6. PERFORMANCE AUDIT
- Are there heavy queries that should be cached?
- Are list pages paginated?
- Are images optimized?
- Are there unnecessary client-side re-renders?
- Bundle size concerns?

### 7. SECURITY AUDIT
- Auth bypass risks
- SQL injection (even through Drizzle)
- XSS vectors in user-generated content
- CSRF protection
- Rate limiting on sensitive endpoints
- Secrets exposure in client bundles
- CORS configuration

### 8. AUTOMATION & WORKFLOW AUDIT
Read `lib/services/workflow-engine.ts`:
- What triggers are supported?
- What actions can workflows execute?
- Are there missing trigger/action combinations?
- Is the engine reliable (retry, error handling, logging)?

### 9. AI FEATURES AUDIT
Read the AI API routes and `components/ai/`:
- Are AI features actually useful or just gimmicks?
- What AI features would genuinely save a detailer time?
- Is the AI context (ai-context.ts) providing enough data?

### 10. MISSING KILLER FEATURES
Think like a mobile detailing business owner. What would make them choose this over Jobber/Housecall Pro?
- Real-time GPS tracking of field techs?
- Before/after photo comparison tool?
- Chemical/supply inventory tracking?
- Profit margin calculator per job?
- Customer lifetime value dashboard?
- Automatic weather-based rescheduling?
- Smart upsell suggestions at checkout?
- Loyalty program / punch card system?
- Vehicle condition scoring (paint meter readings)?
- Integration with coating manufacturer warranties?

## Output Format

Structure your audit as:

```
## CRITICAL (Must Fix — Broken or Missing Fundamentals)
1. [Issue] — [Impact] — [Suggested Fix]

## HIGH PRIORITY (Competitive Gaps — Features Competitors Have)
1. [Feature Gap] — [Which Competitor Has It] — [Implementation Approach]

## MEDIUM PRIORITY (Polish & Optimization)
1. [Issue] — [Impact] — [Fix]

## LOW PRIORITY (Nice to Have)
1. [Enhancement] — [Value]

## INNOVATION OPPORTUNITIES (Nobody Has This Yet)
1. [Feature Idea] — [Why It's a Game Changer] — [Implementation Complexity]

## SCORES
- Feature Completeness: X/10
- UX/UI Quality: X/10
- Code Quality: X/10
- Security: X/10
- Performance: X/10
- Mobile Experience: X/10
- Integration Depth: X/10
- AI Utilization: X/10
- Overall Competitive Position: X/10
```

Be brutally honest. Don't sugarcoat. If something sucks, say it sucks and say exactly how to fix it. The goal is to make this CRM so good that a detailer would be insane to use anything else.

Read CLAUDE.md first for project standards, then systematically go through every file that matters.
