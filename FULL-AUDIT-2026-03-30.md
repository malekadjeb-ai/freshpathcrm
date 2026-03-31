# Fresh Path CRM — Full Audit Report
**Date:** March 30, 2026
**Auditor:** Claude (Code Auditor Skill)
**Project:** Fresh Path CRM — Production mobile detailing CRM on Cloudflare Workers
**Stack:** Next.js 14 + Drizzle ORM + Turso/D1 + NextAuth + Tailwind/shadcn

---

## Overall Health Score: 5.4 / 10

| Dimension | Score | Weight | Weighted |
|---|---|---|---|
| Architecture | 5 | 20% | 1.00 |
| Code Quality | 5 | 15% | 0.75 |
| Performance | 4 | 15% | 0.60 |
| Security | 3 | 15% | 0.45 |
| UX/Conversion | 7 | 15% | 1.05 |
| Feature Completeness | 8 | 10% | 0.80 |
| Developer Experience | 3 | 10% | 0.30 |

**Verdict:** Feature-rich but structurally fragile. You've built an incredible amount of functionality — 40+ pages, 100+ API routes, AI features, booking portal, webhooks, workflows — but the foundation has critical cracks in security and performance that will bite you the moment you scale or onboard a second tenant.

---

## Action Queue

---

## #1: TENANT ISOLATION IS BROKEN — Data Leaks Across Tenants
**Dimension:** Security | **Impact:** 10/10 | **Effort:** M | **Type:** RISK
**Priority Score:** 15 (CRITICAL)

**Problem:** Your `customers`, `jobs`, `invoices`, `estimates`, `expenses`, `reviews`, `tasks`, and `communications` API routes do NOT filter by `tenantId`. Only `leads` does it correctly (`eq(leads.tenantId, tenantId)`). Every other entity is accessible to any authenticated user regardless of tenant. The moment you add a second business or team member from a different org, ALL data is shared. This is a data breach waiting to happen.

**Fix:** Add `tenantId` column to every major table (customers, jobs, invoices, vehicles, etc.) and enforce tenant filtering on every query. Alternatively, since most entities link back to customers, add tenantId to customers and filter through that join. The leads route is your reference implementation — copy that pattern everywhere.

**Claude Code Prompt:**
```
Audit every API route in app/api/ for tenant isolation. The leads route (app/api/leads/route.ts) is the correct pattern — it extracts tenantId from the session and filters with eq(leads.tenantId, tenantId).

For EVERY other route (customers, jobs, invoices, estimates, expenses, reviews, tasks, communications, etc.):
1. Add tenantId extraction from session using requireAuth() from lib/auth.ts
2. Add tenantId filtering to all SELECT queries
3. Add tenantId to all INSERT operations
4. For tables that don't have a tenantId column yet, create a new Drizzle migration adding tenant_id to: Customer, Job, Vehicle, Invoice, Estimate, Expense, Review, Task, Communication, ServiceItem, JobService, ScheduledMessage, RecurringJob, Staff, Quote, Referral, Subscription
5. Add foreign key references to Tenant table
6. Add indexes on tenant_id for each table
7. Update the schema.ts with the new columns
8. Generate the migration with: npx drizzle-kit generate

Do NOT touch the leads routes — they're already correct. Use them as the reference pattern.
```

**Expected Result:** Every API route scopes queries to the authenticated user's tenant. No cross-tenant data leakage possible.

---

## #2: N+1 QUERY CATASTROPHE IN JOBS ROUTE
**Dimension:** Performance | **Impact:** 9/10 | **Effort:** M | **Type:** BUG
**Priority Score:** 13.5

**Problem:** The `GET /api/jobs` endpoint runs `Promise.all(jobRows.map(async (job) => {...}))` — making 4 separate DB queries PER JOB (customer, vehicle, services, invoice). With the default limit of 50 jobs, that's **200+ database round-trips per request**. On Turso's edge DB, each round-trip adds latency. This will feel sluggish with any real data volume and will hammer your DB connections.

**Fix:** Replace the per-job enrichment loop with batch queries using `inArray()`. Fetch all related data in 4 bulk queries, then join in JS.

**Claude Code Prompt:**
```
Refactor app/api/jobs/route.ts GET handler to eliminate N+1 queries.

Current problem: Line ~58 does Promise.all(jobRows.map(async (job) => { ... })) which makes 4 DB queries PER job.

Fix by batching:
1. Collect all jobIds and customerIds from jobRows
2. Run 4 parallel bulk queries using inArray():
   - All customers where id IN customerIds
   - All vehicles where id IN vehicleIds (filter nulls first)
   - All jobServices + serviceItems where jobId IN jobIds
   - All invoices where jobId IN jobIds
3. Build lookup maps (Map<string, T>) from the bulk results
4. Map over jobRows and enrich from the lookup maps

Also fix the same pattern in app/api/customers/route.ts — lines 122-147 build massive OR chains with:
  or(...customerIds.map((id) => eq(vehicles.customerId, id)))
Replace ALL of these with inArray(vehicles.customerId, customerIds).

Apply the same fix to any other API route that does per-record queries in a loop. Check: estimates/route.ts, invoices/route.ts, dashboard/route.ts.
```

**Expected Result:** Jobs endpoint goes from 200+ queries to 6 queries. Customer endpoint eliminates OR chains. All list endpoints respond in <200ms.

---

## #3: API SECRETS STORED IN PLAINTEXT IN DATABASE
**Dimension:** Security | **Impact:** 9/10 | **Effort:** M | **Type:** RISK
**Priority Score:** 13.5 (CRITICAL)

**Problem:** The `businessSettings` table stores Twilio auth tokens, Stripe secret keys, Resend API keys, SMTP passwords, and Google OAuth tokens as plain text columns. Anyone with DB read access (admin panel, SQL injection, backup leak, Turso dashboard access) gets every secret. This is the #1 thing a security auditor would flag.

**Fix:** Move all third-party API keys to environment variables / Cloudflare Worker secrets. The DB should only store non-sensitive config (business name, hours, tax rate). Sensitive keys go in wrangler.jsonc secrets or Cloudflare dashboard.

**Claude Code Prompt:**
```
Move all sensitive API keys from the businessSettings database table to environment variables.

Columns to migrate OUT of the database:
- twilio_account_sid → TWILIO_ACCOUNT_SID env var
- twilio_auth_token → TWILIO_AUTH_TOKEN env var
- twilio_phone_number → TWILIO_PHONE_NUMBER env var
- resend_api_key → RESEND_API_KEY env var
- sendgrid_api_key → SENDGRID_API_KEY env var
- smtp_host, smtp_port, smtp_user, smtp_password → SMTP_* env vars
- stripe_secret_key → STRIPE_SECRET_KEY env var
- stripe_publishable_key → STRIPE_PUBLISHABLE_KEY env var (this one can stay in DB since it's public)
- stripe_webhook_secret → STRIPE_WEBHOOK_SECRET env var
- google_access_token, google_refresh_token → These are per-user OAuth tokens, keep in DB but encrypt them

Steps:
1. Add all env vars to wrangler.jsonc as secrets placeholders
2. Add to .env.example with placeholder values
3. Update every service that reads these from DB (lib/services/sms.ts, lib/services/email.ts, lib/stripe.ts, lib/google.ts) to read from process.env instead
4. Remove the sensitive columns from the businessSettings schema (keep non-sensitive config)
5. Generate a migration to drop the columns
6. Update the settings page to show "Configured via environment" for these fields instead of editable inputs

Do NOT delete the settings UI entirely — keep the non-sensitive business settings editable (name, phone, hours, tax rate, etc.).
```

**Expected Result:** Zero API keys in the database. Secrets managed through Cloudflare's encrypted secrets system.

---

## #4: WEAK NEXTAUTH SECRET + HARDCODED SEED PASSWORD
**Dimension:** Security | **Impact:** 8/10 | **Effort:** S | **Type:** BUG
**Priority Score:** 24 (QUICK WIN)

**Problem:** Three issues in one:
1. `NEXTAUTH_SECRET="freshpath-crm-secret-key-2024"` — predictable, not cryptographically random
2. `seed.ts` has `hashSync("freshpath2025", 10)` — hardcoded default password
3. `.env` file contains live Turso auth token and Google OAuth secrets (even though .gitignore covers it, it's on disk and referenced in dev tooling)

**Fix:** Generate a proper 256-bit random secret. Remove hardcoded passwords. Rotate the Turso token.

**Claude Code Prompt:**
```
Security hardening for authentication secrets:

1. Generate a new NEXTAUTH_SECRET using: openssl rand -base64 32
   Update .env and .env.example with a placeholder like NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

2. In src/db/seed.ts, remove the hardcoded password "freshpath2025". Instead:
   - Accept password as a command-line argument or environment variable
   - Add a comment: "// Set SEED_ADMIN_PASSWORD env var before running"
   - Use: const password = process.env.SEED_ADMIN_PASSWORD || (() => { throw new Error("Set SEED_ADMIN_PASSWORD") })()

3. In .env.example, add comments explaining each secret and how to generate it. Remove any real values.

4. Add a security check: create a middleware or startup check that warns if NEXTAUTH_SECRET contains common weak patterns like "secret", "key", "2024", "password".
```

**Expected Result:** No predictable secrets. No hardcoded passwords. Clear documentation for secret generation.

---

## #5: GOD PAGES — 1588-LINE COMPONENTS DOING EVERYTHING
**Dimension:** Code Quality | **Impact:** 7/10 | **Effort:** L | **Type:** DEBT
**Priority Score:** 7

**Problem:** Multiple page files are massive monoliths:
- `customers/[id]/page.tsx` — **1,588 lines** (customer detail doing EVERYTHING)
- `dashboard/page.tsx` — **1,445 lines**
- `communications/page.tsx` — **1,140 lines**
- `jobs/[id]/page.tsx` — **1,113 lines**
- `automations/page.tsx` — **1,022 lines**

These god-pages mix data fetching, state management, UI rendering, form handling, and business logic in a single file. They're nearly impossible to maintain, test, or refactor safely.

**Fix:** Extract each page into feature-based modules with separated concerns.

**Claude Code Prompt:**
```
Refactor the 5 largest page files into feature-based component architecture.

Start with app/(app)/customers/[id]/page.tsx (1588 lines):

1. Create a components/customers/ directory (already partially exists)
2. Extract these into separate components:
   - CustomerHeader.tsx (name, avatar, lifecycle badge, action buttons)
   - CustomerInfo.tsx (contact details, address, gate code, special instructions)
   - CustomerVehicles.tsx (vehicle list with add/edit)
   - CustomerJobs.tsx (job history table)
   - CustomerInvoices.tsx (invoice list)
   - CustomerCommunications.tsx (communication history)
   - CustomerNotes.tsx (notes section)
   - CustomerStats.tsx (total spent, job count, health score)
3. The page.tsx should only:
   - Fetch the customer data
   - Pass it to a CustomerDetailView component
   - Handle top-level error/loading states
4. Each extracted component should:
   - Accept typed props (not fetch its own data)
   - Be under 150 lines
   - Handle its own loading/empty states

Apply the same pattern to dashboard/page.tsx next:
   - DashboardStats.tsx (KPI cards)
   - DashboardRevenueChart.tsx
   - DashboardRecentJobs.tsx
   - DashboardUpcomingJobs.tsx
   - DashboardLeadsPipeline.tsx

Do NOT change any functionality. Only restructure. Verify the app still builds after each page refactor.
```

**Expected Result:** No page file over 300 lines. Clean separation of concerns. Each component is independently testable.

---

## #6: ZERO TESTS, ZERO CI/CD
**Dimension:** Developer Experience | **Impact:** 8/10 | **Effort:** L | **Type:** RISK
**Priority Score:** 8

**Problem:** There are zero test files in the entire project. No unit tests, no integration tests, no E2E tests. No GitHub Actions. No automated anything. Every deployment is a manual YOLO push. With 100+ API routes and 40+ pages, any change can silently break something. This is the #1 thing slowing you down — you can't refactor safely without tests.

**Fix:** Start with API route integration tests (highest ROI), then add CI.

**Claude Code Prompt:**
```
Set up a testing foundation for the Fresh Path CRM:

1. Install testing dependencies:
   pnpm add -D vitest @testing-library/react @testing-library/jest-dom happy-dom

2. Create vitest.config.ts with path aliases matching tsconfig.json

3. Write integration tests for the 5 most critical API routes:
   - app/api/customers/route.ts (GET + POST)
   - app/api/jobs/route.ts (GET + POST)
   - app/api/leads/route.ts (GET + POST)
   - app/api/invoices/route.ts (GET + POST)
   - app/api/auth (login flow)

   For each test:
   - Mock the database layer (mock getDb() to return a test db)
   - Test auth enforcement (returns 401 without session)
   - Test validation (returns 400 with bad input)
   - Test happy path (returns correct data)
   - Test pagination parameters

4. Add test scripts to package.json:
   "test": "vitest run",
   "test:watch": "vitest"

5. Create .github/workflows/ci.yml:
   - Run on push to main and PRs
   - Steps: checkout, setup node, pnpm install, lint, type-check, test, build
   - Fail the PR if any step fails

6. Add a pre-commit check: pnpm lint && pnpm test
```

**Expected Result:** Critical API routes have test coverage. CI blocks broken PRs. Safe to refactor.

---

## #7: PRISMA GHOST — DEAD CODE CREATING CONFUSION
**Dimension:** Architecture | **Impact:** 6/10 | **Effort:** S | **Type:** DEBT
**Priority Score:** 18 (QUICK WIN)

**Problem:** The migration from Prisma to Drizzle left ghosts everywhere:
- `prisma/` directory still exists (with old migrations)
- `prisma.config.ts` still exists
- `prisma/seed.ts` still exists
- `lib/prisma.ts` is repurposed as a Drizzle re-export but still named "prisma"
- `tsconfig.json` excludes `prisma/seed.ts` explicitly
- `.gitignore` has Prisma-specific entries

This creates cognitive overhead every time you (or Claude Code) work on the project. "Wait, is this Prisma or Drizzle? Which one is active?"

**Fix:** Nuke all Prisma remnants. Rename the bridge file.

**Claude Code Prompt:**
```
Clean up all Prisma remnants from the project:

1. Delete these files/directories:
   - prisma/ (entire directory)
   - prisma.config.ts

2. Rename lib/prisma.ts → lib/db.ts
   - Update every import across the entire codebase:
     from "@/lib/prisma" → from "@/lib/db"
   - Search for ALL occurrences with: grep -r "lib/prisma" --include="*.ts" --include="*.tsx"

3. Clean tsconfig.json:
   - Remove "prisma/seed.ts" from the exclude array

4. Clean .gitignore:
   - Remove "prisma/" line and the "# prisma (legacy)" comment
   - Remove "/lib/generated/prisma" line

5. Verify: pnpm lint && pnpm build
```

**Expected Result:** Zero Prisma references anywhere. Clean mental model: Drizzle is the only ORM.

---

## #8: DB SINGLETON VIOLATES YOUR OWN ARCHITECTURE RULES
**Dimension:** Architecture | **Impact:** 5/10 | **Effort:** S | **Type:** DEBT
**Priority Score:** 15 (QUICK WIN)

**Problem:** `src/db/index.ts` creates a global singleton `_db` variable, which directly violates the CLAUDE.md instruction: *"NEVER create a global Drizzle client. Create a new client per request using React cache()."* The current setup works for a single-process dev server but won't behave correctly in serverless/edge environments where you want per-request isolation.

**Fix:** Follow your own CLAUDE.md pattern. Use `cache()` from React for server components and fresh clients for API routes.

**Claude Code Prompt:**
```
Refactor src/db/index.ts to follow the per-request pattern specified in CLAUDE.md:

Replace the current singleton pattern:
```ts
let _db = null;
function initDb() { if (!_db) { ... } return _db; }
```

With the cache-based pattern for Turso (since you're using @libsql/client, not D1 directly in dev):
```ts
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { cache } from "react";
import * as schema from "./schema";

export const getDb = cache(() => {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL || "",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return drizzle(client, { schema });
});

export const getDbAsync = cache(async () => {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL || "",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return drizzle(client, { schema });
});
```

Verify: pnpm build (ensure cache import works in all contexts)
```

**Expected Result:** Per-request DB client. Correct behavior in edge/serverless. Matches your own documented architecture.

---

## #9: NO RATE LIMITING — BRUTE FORCE WELCOME MAT
**Dimension:** Security | **Impact:** 7/10 | **Effort:** M | **Type:** RISK
**Priority Score:** 10.5

**Problem:** Zero rate limiting on:
- Login endpoint (brute force the password in minutes)
- Public booking page (`/api/booking/submit`)
- Public quote acceptance (`/api/quotes/[id]/public-accept`)
- Public invoice payment (`/api/pay/[id]/checkout`)
- All API endpoints (a script could hammer your DB)

**Fix:** Add rate limiting using Cloudflare's built-in rate limiting for production, and an in-memory limiter for dev.

**Claude Code Prompt:**
```
Add rate limiting to the Fresh Path CRM:

1. Create lib/rate-limit.ts with a simple in-memory rate limiter:
   - Uses a Map<string, { count: number, resetAt: number }>
   - Exported function: rateLimit(key: string, limit: number, windowMs: number): { success: boolean, remaining: number }
   - Clean up expired entries periodically

2. Apply strict limits to auth endpoints:
   - app/api/auth/* → 5 requests per minute per IP
   - app/api/portal/auth → 5 requests per minute per IP

3. Apply moderate limits to public endpoints:
   - app/api/booking/submit → 10 per minute per IP
   - app/api/quotes/*/public-accept → 10 per minute per IP
   - app/api/pay/*/checkout → 10 per minute per IP

4. Apply general limits to all authenticated API routes:
   - 100 requests per minute per user session

5. Return proper 429 responses:
   { error: "Too many requests. Please try again later." }
   With Retry-After header

6. Add a note in CLAUDE.md about the rate limiting approach for production:
   Use Cloudflare Rate Limiting rules in the dashboard for edge-level protection.
```

**Expected Result:** Brute force attacks blocked. API abuse prevented. Proper 429 responses.

---

## #10: MIDDLEWARE PATH MISMATCH + API ROUTES UNPROTECTED
**Dimension:** Security | **Impact:** 6/10 | **Effort:** S | **Type:** BUG
**Priority Score:** 18 (QUICK WIN)

**Problem:** The middleware.ts matcher lists 40 paths manually but:
1. Missing paths that exist: `/reports`, `/marketing`, `/invoicing`
2. API routes are NOT protected by middleware — only by individual `getServerSession` checks in each handler. If a developer forgets the auth check on a new route, it's wide open.
3. Some routes use `requireAuth()` (the clean helper), others inline `getServerSession` manually — inconsistent pattern.

**Fix:** Simplify middleware to catch-all, and standardize API auth.

**Claude Code Prompt:**
```
Fix the auth middleware and standardize API route authentication:

1. Simplify middleware.ts to use a catch-all pattern:
```ts
export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    // Protect all app routes except public pages
    "/((?!api/webhooks|api/booking|api/pay|api/portal|api/quotes/[^/]+/public|api/health|login|book|quote|invoice|_next|favicon|icons|uploads).*)",
  ],
};
```

2. Standardize API auth — every authenticated API route should use requireAuth():
   Search for: getServerSession(authOptions) in app/api/
   Replace with: const auth = await requireAuth(); if ("error" in auth) return auth.error; const { session, tenantId } = auth;

   This gives you session + tenantId in one call, with consistent error handling.

3. Verify all public routes are intentionally public:
   - /api/webhooks/* (Twilio, Stripe, SendGrid callbacks)
   - /api/booking/* (public booking form)
   - /api/pay/[id]/* (public payment page)
   - /api/portal/* (customer portal)
   - /api/quotes/[id]/public* (public quote viewing)
   - /api/health (health check)

   Every other API route must require auth. No exceptions.
```

**Expected Result:** Single source of truth for auth. No unprotected routes. Consistent pattern across all 100+ API handlers.

---

## #11: DEV PAGE EXPOSED IN PRODUCTION
**Dimension:** Security | **Impact:** 5/10 | **Effort:** S | **Type:** BUG
**Priority Score:** 15 (QUICK WIN)

**Problem:** `app/(app)/dev/messages/page.tsx` is a development/debug page that's accessible in production behind auth. It likely shows raw message data, test tools, or debug info that shouldn't exist in a production app.

**Fix:** Remove it or gate it behind an environment check.

**Claude Code Prompt:**
```
Remove the dev page from production:

1. Delete app/(app)/dev/ directory entirely if it's purely for development
   OR
2. Add an environment gate at the top of the page:
   if (process.env.NODE_ENV === "production") { redirect("/dashboard"); }

3. Remove "/dev/:path*" from any navigation or sidebar links
4. Verify: pnpm build
```

**Expected Result:** No debug tooling accessible in production.

---

## #12: SCHEMA IS A 1,096-LINE MONOLITH
**Dimension:** Code Quality | **Impact:** 4/10 | **Effort:** M | **Type:** DEBT
**Priority Score:** 6

**Problem:** `src/db/schema.ts` is 1,096 lines containing every table definition. As you add features, this file only grows. It's hard to navigate, causes merge conflicts, and makes it difficult to understand which tables relate to which feature.

**Fix:** Split into domain-based schema files.

**Claude Code Prompt:**
```
Split src/db/schema.ts into domain-based files:

Create these schema files in src/db/schema/:
- auth.ts (users, tenants, passwordResets)
- settings.ts (businessSettings)
- customers.ts (customers, customerNotes, customerTags, tags)
- vehicles.ts (vehicles, vehicleTypeModifiers)
- services.ts (serviceItems, servicePlans)
- jobs.ts (jobs, jobServices, jobStatusHistory, jobChecklists)
- leads.ts (leads)
- estimates.ts (estimates, estimateItems)
- invoices.ts (invoices, payments)
- communications.ts (communications, scheduledMessages, messageTemplates)
- campaigns.ts (campaigns, campaignRecipients)
- tasks.ts (tasks, notifications)
- reviews.ts (reviews)
- expenses.ts (expenses)
- subscriptions.ts (subscriptions)
- fleet.ts (fleetContracts)
- workflows.ts (workflows, workflowLogs, automationExecutions)
- webhooks.ts (webhookEndpoints, webhookLogs)
- misc.ts (promoCodes, referrals, quotes, inspections, portalSessions, consentRecords, activities, recurringJobs, staff, socialPosts, galleryPhotos, pricingRules, scheduledReports)

Create src/db/schema/index.ts that re-exports everything:
export * from "./auth";
export * from "./customers";
// etc.

Update src/db/schema.ts to just re-export from the directory:
export * from "./schema/index";

Do the same split for relations.ts → src/db/relations/ with matching files.

Verify: pnpm build (all imports should still work since the barrel export preserves the same public API)
```

**Expected Result:** Schema organized by domain. Each file under 100 lines. Easy to find and modify.

---

## Strategic Summary

### Architecture Verdict
The foundation is **functional but fragile**. You've built an impressively feature-complete CRM with 40+ pages, 100+ API routes, AI integration, webhook system, workflow engine, booking portal, and customer portal. That's genuinely impressive for an owner-operated build. But the architecture has three structural cracks: missing tenant isolation (which means multi-tenant is broken), N+1 queries that will choke under load, and secrets stored in the database. Fix those three and the foundation becomes solid enough to scale on.

### The One Thing
**Fix tenant isolation (#1).** Everything else is secondary. If you ever onboard a second business, share the CRM with a partner, or get audited, broken tenant isolation is a data breach. It's also the hardest to retrofit later because it touches every query in every route. Do it now while the codebase is still manageable.

### Risk Assessment
**What breaks first at 10x:** The N+1 queries in jobs and customers. With 500 jobs, the jobs endpoint will make 2,000+ DB calls per request. You'll see 3-5 second load times on the jobs page. After that, the lack of caching means every dashboard load recalculates everything from scratch.

**Distance to breaking point:** With current data volumes (likely <1,000 records per table), you're fine. The moment you hit 500+ jobs or 200+ customers, performance degrades noticeably. That's probably 3-6 months of active use.

### 30-Day Recommendation

**Week 1:** Items #4 (secrets — 30 min), #7 (Prisma cleanup — 30 min), #8 (DB singleton — 20 min), #10 (middleware — 1 hr), #11 (dev page — 10 min). All quick wins. Total: ~3 hours.

**Week 2:** Item #2 (N+1 queries — 4 hrs), Item #9 (rate limiting — 3 hrs). Performance and security hardening. Total: ~7 hours.

**Week 3:** Item #1 (tenant isolation — 8 hrs). The biggest, most important refactor. Do it once, do it right.

**Week 4:** Item #3 (secrets from DB — 4 hrs), Item #6 (testing foundation — 6 hrs). Lock down the vault and start building the safety net.

Items #5 and #12 (god pages, schema split) are ongoing maintenance — tackle them as you touch each file.

### Re-Audit Trigger
Re-audit after completing items #1-#4 and #7-#10 (the critical and quick-win items). Or trigger early if you're about to onboard a second user/tenant, integrate a payment processor, or go live with the booking page.
