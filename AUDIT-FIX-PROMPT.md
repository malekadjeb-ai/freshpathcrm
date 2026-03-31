# Fresh Path CRM — Audit Fix Mega-Prompt

> **Instructions:** Paste this into Claude Code. It executes all 12 audit findings in dependency order across 5 phases. Each phase has a verification gate — do NOT proceed to the next phase until the gate passes. This is designed for a single session but can be split at any phase boundary.

---

## Pre-Flight

Read these files before touching anything. Do not skip this step:
- `@CLAUDE.md` (project rules — follow every rule listed under "Critical Rules")
- `@src/db/schema.ts` (full database schema)
- `@src/db/index.ts` (current DB client pattern)
- `@lib/auth.ts` (auth helper — requireAuth is the pattern to use everywhere)
- `@lib/prisma.ts` (legacy bridge file — about to be removed)
- `@app/api/leads/route.ts` (reference implementation for tenant-isolated API routes)
- `@app/api/customers/route.ts` (example of broken route — no tenant isolation, N+1 queries, OR chains)
- `@app/api/jobs/route.ts` (example of broken route — N+1 per-job enrichment loop)
- `@middleware.ts` (current auth middleware)

Run `find app/api -name "route.ts" | wc -l` to understand the scope — there are 100+ route handlers.

---

## Phase 1: Quick Wins — Dead Code, Secrets, Patterns (30 minutes)

Do all of the following. These are independent changes with zero risk of breaking each other.

### 1A. Nuke Prisma Remnants

Delete these files:
- `prisma/` (entire directory and everything in it)
- `prisma.config.ts`

Rename `lib/prisma.ts` → `lib/db.ts`. Then find and replace EVERY import across the entire codebase:
```
from "@/lib/prisma" → from "@/lib/db"
```

Search with: `grep -r "lib/prisma" --include="*.ts" --include="*.tsx" -l` to find all files.

Clean `tsconfig.json`: remove `"prisma/seed.ts"` from the `exclude` array.

Clean `.gitignore`: remove the line `prisma/` and the line `/lib/generated/prisma` and the comment `# prisma (legacy — migrated to Drizzle)`.

### 1B. Fix DB Client — Kill the Singleton

Replace the entire contents of `src/db/index.ts` with:

```typescript
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

This follows the per-request pattern from CLAUDE.md. No global singleton. No `_db` variable.

### 1C. Harden the NextAuth Secret

In `src/db/seed.ts`, replace the hardcoded password:

```typescript
// BEFORE:
const passwordHash = hashSync("freshpath2025", 10);

// AFTER:
const password = process.env.SEED_ADMIN_PASSWORD;
if (!password) {
  console.error("ERROR: Set SEED_ADMIN_PASSWORD environment variable before running seed.");
  process.exit(1);
}
const passwordHash = hashSync(password, 12);
```

Note: bump bcrypt rounds from 10 to 12 (stronger hashing, negligible speed difference for a seed script).

In `.env.example`, update:
```
NEXTAUTH_SECRET="<generate with: openssl rand -base64 32>"
SEED_ADMIN_PASSWORD="<your admin password>"
```

### 1D. Remove Dev Page from Production

Delete the entire directory: `app/(app)/dev/`

If you determine there's valuable debug tooling in there, instead add this guard at the top of `app/(app)/dev/messages/page.tsx`:
```typescript
import { redirect } from "next/navigation";

export default function DevMessagesPage() {
  if (process.env.NODE_ENV === "production") {
    redirect("/dashboard");
  }
  // ... rest of the component
}
```

### Phase 1 Verification Gate

Run:
```bash
pnpm lint && pnpm build
```

Both must pass with zero errors. If the build fails:
1. Check that all `@/lib/prisma` imports were updated to `@/lib/db`
2. Check that the `cache` import from `react` works in the current Next.js version
3. Fix any remaining Prisma references

**Do NOT proceed to Phase 2 until `pnpm build` succeeds.**

---

## Phase 2: Security Hardening — Middleware, Auth, Rate Limiting (2 hours)

### 2A. Simplify Middleware to Catch-All

Replace the entire contents of `middleware.ts` with:

```typescript
export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - Public API webhooks (Twilio, Stripe, SendGrid)
     * - Public booking/quote/invoice/payment pages
     * - Customer portal
     * - Health check
     * - Login page
     * - Static assets and Next.js internals
     */
    "/((?!api/webhooks/twilio|api/webhooks/stripe|api/webhooks/sendgrid|api/booking|api/pay|api/portal|api/quotes/[^/]+/public|api/invoices/[^/]+/public|api/health|login|book|quote|invoice|pay|portal|_next|favicon\\.ico|icons|uploads|fonts|manifest\\.json).*)",
  ],
};
```

This catches everything by default and explicitly allowlists only the routes that must be public. Much safer than maintaining a manual list of 40+ protected paths.

### 2B. Standardize ALL API Routes to Use requireAuth()

This is a mechanical find-and-replace across every authenticated API route. For every route handler in `app/api/` that currently does:

```typescript
const session = await getServerSession(authOptions);
if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

Replace with:

```typescript
const auth = await requireAuth();
if ("error" in auth) return auth.error;
const { session, tenantId } = auth;
```

And update the import line to include `requireAuth`:
```typescript
import { requireAuth } from "@/lib/auth";
```

Remove the old import:
```typescript
// DELETE: import { getServerSession } from "next-auth";
// DELETE: import { authOptions } from "@/lib/auth";
```

Apply this to EVERY route in `app/api/` that is NOT intentionally public. Here's how to find them all:

```bash
grep -rl "getServerSession" app/api/ --include="*.ts"
```

Replace every occurrence. There should be zero remaining `getServerSession` imports in `app/api/` when you're done — only `requireAuth`.

**Exceptions — routes that must stay public (no auth):**
- `app/api/webhooks/twilio/*` — Twilio callbacks
- `app/api/webhooks/stripe/route.ts` — Stripe webhook
- `app/api/webhooks/sendgrid/route.ts` — SendGrid webhook
- `app/api/booking/*` — Public booking form
- `app/api/pay/[id]/*` — Public payment page
- `app/api/portal/*` — Customer portal
- `app/api/quotes/[id]/public/route.ts` — Public quote view
- `app/api/quotes/[id]/public-accept/route.ts` — Public quote accept
- `app/api/invoices/[id]/public/route.ts` — Public invoice view
- `app/api/health/route.ts` — Health check

### 2C. Add Rate Limiting

Create `lib/rate-limit.ts`:

```typescript
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Clean up expired entries every 60 seconds
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitMap) {
      if (now > value.resetAt) rateLimitMap.delete(key);
    }
  }, 60_000);
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { success: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

export function rateLimitResponse() {
  return Response.json(
    { error: "Too many requests. Please try again later." },
    { status: 429, headers: { "Retry-After": "60" } }
  );
}
```

Apply rate limiting to these routes:

1. **Login** (`app/api/auth/[...nextauth]/route.ts` or wherever NextAuth handles POST): wrap with 5 req/min per IP
2. **Forgot password** (`app/api/auth/forgot-password/route.ts`): 3 req/min per IP
3. **Public booking submit** (`app/api/booking/submit/route.ts`): 10 req/min per IP
4. **Public quote accept** (`app/api/quotes/[id]/public-accept/route.ts`): 10 req/min per IP

Usage pattern for each route:

```typescript
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const { success } = rateLimit(`login:${ip}`, 5, 60_000);
  if (!success) return rateLimitResponse();

  // ... rest of handler
}
```

### Phase 2 Verification Gate

```bash
pnpm lint && pnpm build
```

Then manually verify:
```bash
grep -r "getServerSession" app/api/ --include="*.ts" | grep -v "node_modules"
```

This should return ZERO results (all replaced with requireAuth). If any remain, fix them.

**Do NOT proceed to Phase 3 until build passes and zero getServerSession calls remain in app/api/.**

---

## Phase 3: Performance — Kill N+1 Queries and OR Chains (3 hours)

### 3A. Fix Jobs Route — Eliminate N+1

Rewrite the GET handler in `app/api/jobs/route.ts`.

The current code does this (lines ~58-99):
```typescript
const enriched = await Promise.all(
  jobRows.map(async (job) => {
    const [customerRows, vehicleRows, serviceRows, invoiceRows] = await Promise.all([...]);
    // 4 queries PER JOB
  })
);
```

Replace with batch-query pattern:

```typescript
// Collect IDs
const jobIds = jobRows.map(j => j.id);
const customerIds = [...new Set(jobRows.map(j => j.customerId))];
const vehicleIds = [...new Set(jobRows.map(j => j.vehicleId).filter(Boolean))] as string[];

// 4 parallel BATCH queries (not per-job)
const [allCustomers, allVehicles, allServices, allInvoices] = await Promise.all([
  customerIds.length
    ? db.select({ id: customers.id, name: customers.name, phone: customers.phone })
        .from(customers)
        .where(inArray(customers.id, customerIds))
    : Promise.resolve([]),
  vehicleIds.length
    ? db.select().from(vehicles).where(inArray(vehicles.id, vehicleIds))
    : Promise.resolve([]),
  jobIds.length
    ? db.select({
        id: jobServices.id,
        jobId: jobServices.jobId,
        serviceItemId: jobServices.serviceItemId,
        price: jobServices.price,
        quantity: jobServices.quantity,
        serviceItem: {
          id: serviceItems.id,
          name: serviceItems.name,
          basePrice: serviceItems.basePrice,
          category: serviceItems.category,
        },
      })
      .from(jobServices)
      .leftJoin(serviceItems, eq(jobServices.serviceItemId, serviceItems.id))
      .where(inArray(jobServices.jobId, jobIds))
    : Promise.resolve([]),
  jobIds.length
    ? db.select({ id: invoices.id, invoiceNumber: invoices.invoiceNumber, status: invoices.status, jobId: invoices.jobId })
        .from(invoices)
        .where(inArray(invoices.jobId, jobIds))
    : Promise.resolve([]),
]);

// Build lookup maps
const customerMap = new Map(allCustomers.map(c => [c.id, c]));
const vehicleMap = new Map(allVehicles.map(v => [v.id, v]));
const servicesByJob = new Map<string, typeof allServices>();
for (const s of allServices) {
  const list = servicesByJob.get(s.jobId) || [];
  list.push(s);
  servicesByJob.set(s.jobId, list);
}
const invoiceByJob = new Map(allInvoices.map(i => [i.jobId, i]));

// Enrich in memory — zero additional queries
const enriched = jobRows.map(job => ({
  ...job,
  customer: customerMap.get(job.customerId) ?? null,
  vehicle: job.vehicleId ? vehicleMap.get(job.vehicleId) ?? null : null,
  services: servicesByJob.get(job.id) ?? [],
  invoice: invoiceByJob.get(job.id) ?? null,
}));
```

Add `inArray` to the drizzle-orm imports at the top of the file.

### 3B. Fix Customers Route — Kill OR Chains

In `app/api/customers/route.ts`, the enrichment block (lines ~122-147) builds OR chains:

```typescript
// BEFORE — generates massive SQL: WHERE id = ? OR id = ? OR id = ? ... (N times)
or(...customerIds.map((id) => eq(vehicles.customerId, id)))
```

Replace ALL four enrichment queries with `inArray()`:

```typescript
const [allTags, allVehicles, allJobs, allCustomerTagRows] = await Promise.all([
  customerIds.length
    ? db.select().from(tags)
        .innerJoin(customerTags, eq(tags.id, customerTags.tagId))
        .where(inArray(customerTags.customerId, customerIds))
    : Promise.resolve([]),
  customerIds.length
    ? db.select().from(vehicles)
        .where(inArray(vehicles.customerId, customerIds))
    : Promise.resolve([]),
  customerIds.length
    ? db.select({
        customerId: jobs.customerId,
        total: jobs.total,
        completedAt: jobs.completedAt,
        status: jobs.status,
        createdAt: jobs.createdAt,
      })
      .from(jobs)
      .where(and(
        isNull(jobs.deletedAt),
        inArray(jobs.customerId, customerIds)
      ))
    : Promise.resolve([]),
  customerIds.length
    ? db.select().from(customerTags)
        .where(inArray(customerTags.customerId, customerIds))
    : Promise.resolve([]),
]);
```

Add `inArray` to the imports from `drizzle-orm`.

### 3C. Audit ALL Other Routes for N+1 and OR Chains

Run this search to find any remaining OR-chain patterns:
```bash
grep -rn "\.map.*eq(" app/api/ --include="*.ts" | grep -v node_modules
```

And this to find per-record query loops:
```bash
grep -rn "\.map(async" app/api/ --include="*.ts" | grep -v node_modules
```

Fix every occurrence using the same inArray() batch pattern. Priority routes to check:
- `app/api/estimates/route.ts`
- `app/api/invoices/route.ts`
- `app/api/dashboard/route.ts`
- `app/api/customers/[id]/route.ts`
- `app/api/conversations/route.ts`
- `app/api/reports/route.ts`
- `app/api/analytics/route.ts`

### Phase 3 Verification Gate

```bash
pnpm lint && pnpm build
```

Then confirm no N+1 patterns remain:
```bash
grep -rn "\.map(async" app/api/ --include="*.ts" | grep -v node_modules | wc -l
```

Target: zero (or very close — some legitimate async maps may exist for non-DB operations). Every `map(async` that does a DB query inside should be eliminated.

Also verify no OR-chain patterns remain:
```bash
grep -rn "or(\.\.\." app/api/ --include="*.ts" | grep -v node_modules | wc -l
```

Target: zero.

**Do NOT proceed to Phase 4 until build passes and N+1 patterns are eliminated.**

---

## Phase 4: Tenant Isolation — The Critical Security Fix (4 hours)

This is the most important phase. Read `app/api/leads/route.ts` as the reference — it correctly extracts `tenantId` from the session and filters all queries with `eq(leads.tenantId, tenantId)`.

### 4A. Add tenantId Column to Major Tables

The `customers` table currently has NO tenantId column. Neither do `jobs`, `invoices`, `vehicles`, `estimates`, `expenses`, `reviews`, `tasks`, `communications`, `serviceItems`, or `quotes`.

**Option A (recommended if single-tenant now, multi-tenant later):** Add `tenantId` to the `customers` table only, and enforce that all other entities inherit tenant scope through their customer relationship. This is simpler — most entities already have a `customerId` foreign key.

**Option B (full multi-tenant):** Add `tenantId` to every major table.

**Go with Option A for now.** Add to `src/db/schema.ts` in the customers table:

```typescript
tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
```

Add an index:
```typescript
tenantIdIdx: index("Customer_tenantId_idx").on(table.tenantId),
```

Also add `tenantId` to these entity tables that can exist WITHOUT a customer relationship:
- `serviceItems` (services are per-tenant)
- `expenses` (expenses can be non-customer-specific)
- `messageTemplates` (templates are per-tenant)
- `tags` (tags are per-tenant)
- `staff` (staff are per-tenant)

Generate and apply the migration:
```bash
npx drizzle-kit generate
npx wrangler d1 migrations apply fresh-path-crm --local
```

### 4B. Enforce Tenant Filtering on All Routes

For every route that was already converted to `requireAuth()` in Phase 2, you now have `tenantId` available. Add tenant filtering:

**Pattern for customer-scoped routes (jobs, invoices, estimates, vehicles, etc.):**

```typescript
// After: const { session, tenantId } = auth;

// For list endpoints — join through customer to verify tenant
const conditions = [
  isNull(jobs.deletedAt),
  eq(customers.tenantId, tenantId),  // tenant scope through customer
];

// For single-record endpoints — verify the customer belongs to this tenant
const customer = await db.select().from(customers)
  .where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))
  .limit(1);
if (!customer[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
```

**Pattern for directly tenant-scoped routes (services, templates, tags, expenses):**

```typescript
// List: filter by tenantId
const results = await db.select().from(serviceItems)
  .where(eq(serviceItems.tenantId, tenantId));

// Create: set tenantId on insert
await db.insert(serviceItems).values({ ...data, tenantId });
```

Apply to ALL routes in `app/api/`. Start with these high-priority routes:
1. `app/api/customers/route.ts` — add `eq(customers.tenantId, tenantId)` to conditions
2. `app/api/customers/[id]/route.ts` — verify customer.tenantId matches
3. `app/api/jobs/route.ts` — join through customer or add tenantId to jobs
4. `app/api/invoices/route.ts` — same
5. `app/api/estimates/route.ts` — same
6. `app/api/expenses/route.ts` — direct tenantId filter
7. `app/api/services/route.ts` — direct tenantId filter
8. `app/api/templates/route.ts` — direct tenantId filter
9. `app/api/reviews/route.ts` — through customer
10. `app/api/tasks/route.ts` — through customer or lead
11. `app/api/communications/route.ts` — through customer
12. `app/api/conversations/route.ts` — through customer
13. `app/api/tags/route.ts` — direct tenantId filter
14. `app/api/staff/route.ts` — direct tenantId filter
15. `app/api/analytics/route.ts` — scope all aggregations to tenant
16. `app/api/dashboard/route.ts` — scope all aggregations to tenant
17. `app/api/reports/route.ts` — scope all aggregations to tenant
18. `app/api/settings/route.ts` — scope by tenantId

### 4C. Backfill Existing Data

Create a one-time script at `scripts/backfill-tenant-ids.ts` that:
1. Reads the first tenant from the Tenant table
2. Updates all customers, serviceItems, expenses, messageTemplates, tags, and staff to set tenantId = that tenant's ID
3. Only run this in dev/staging, never blindly in production

```typescript
import { getDb } from "../src/db";
import { customers, serviceItems, expenses, messageTemplates, tags, staff, tenants } from "../src/db/schema";
import { isNull } from "drizzle-orm";

async function backfill() {
  const db = getDb();
  const [tenant] = await db.select().from(tenants).limit(1);
  if (!tenant) throw new Error("No tenant found. Run seed first.");

  console.log(`Backfilling tenantId=${tenant.id} for tenant: ${tenant.name}`);

  const tables = [customers, serviceItems, expenses, messageTemplates, tags, staff];
  for (const table of tables) {
    // Only update records that don't have a tenantId yet
    const result = await db.update(table).set({ tenantId: tenant.id }).where(isNull(table.tenantId));
    console.log(`  Updated ${table} records`);
  }
  console.log("Done.");
}

backfill().catch(console.error);
```

### Phase 4 Verification Gate

```bash
pnpm lint && pnpm build
```

Then verify tenant isolation is complete:
```bash
# Every API route should reference tenantId
grep -rL "tenantId" app/api/*/route.ts app/api/*/*/route.ts 2>/dev/null | grep -v webhooks | grep -v booking | grep -v pay | grep -v portal | grep -v health | grep -v quotes.*public
```

This lists routes that DON'T reference tenantId. The only results should be intentionally public routes (webhooks, booking, pay, portal, health, public quote views).

**Do NOT proceed to Phase 5 until build passes and all authenticated routes reference tenantId.**

---

## Phase 5: Secrets Migration — API Keys Out of the Database (2 hours)

### 5A. Move Secrets to Environment Variables

Update `.env` and `.env.example` with these new variables:
```
# Twilio
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_PHONE_NUMBER=""

# Email (Resend)
RESEND_API_KEY=""

# Email (SendGrid)
SENDGRID_API_KEY=""

# Email (SMTP)
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASSWORD=""

# Stripe
STRIPE_SECRET_KEY=""
STRIPE_PUBLISHABLE_KEY=""
STRIPE_WEBHOOK_SECRET=""
```

### 5B. Update Service Files to Read from Environment

Update these files to read from `process.env` instead of querying businessSettings for secrets:

1. **`lib/services/sms.ts`** — Replace any `settings.twilioAccountSid` / `settings.twilioAuthToken` / `settings.twilioPhoneNumber` with `process.env.TWILIO_ACCOUNT_SID` etc.

2. **`lib/services/email.ts`** — Replace `settings.resendApiKey` / `settings.sendgridApiKey` / `settings.smtpHost` etc. with `process.env.*`

3. **`lib/stripe.ts`** — Replace `settings.stripeSecretKey` with `process.env.STRIPE_SECRET_KEY`

4. **`app/api/webhooks/twilio/route.ts`** — Replace the DB lookup for `settings.twilioAuthToken` with `process.env.TWILIO_AUTH_TOKEN`

5. **`app/api/webhooks/stripe/route.ts`** — Replace the DB lookup for webhook secret with `process.env.STRIPE_WEBHOOK_SECRET`

6. **Any other file** that reads API keys from businessSettings — search with:
```bash
grep -rn "twilioA\|resendApi\|sendgridApi\|stripeSecret\|stripeWebhook\|smtpPassword\|smtpHost\|smtpUser" lib/ app/ --include="*.ts" | grep -v schema | grep -v node_modules
```

### 5C. Remove Secret Columns from Schema

In `src/db/schema.ts`, remove these columns from the `businessSettings` table:
- `twilioAccountSid`
- `twilioAuthToken`
- `twilioPhoneNumber`
- `resendApiKey`
- `sendgridApiKey`
- `smtpHost`
- `smtpPort`
- `smtpUser`
- `smtpPassword`
- `stripeSecretKey`
- `stripeWebhookSecret`

Keep `stripePublishableKey` in the DB — it's a public key and the frontend needs it.

Keep `googleAccessToken` and `googleRefreshToken` in the DB — these are per-user OAuth tokens (not static secrets). But add a comment noting they should be encrypted at rest in a future pass.

Generate and apply the migration:
```bash
npx drizzle-kit generate
npx wrangler d1 migrations apply fresh-path-crm --local
```

### 5D. Update Settings Page

In `app/(app)/settings/page.tsx` (or `settings-content.tsx`):
- Remove the input fields for all migrated secrets
- Replace with a read-only indicator: "✓ Configured via environment" (if the env var is set) or "✗ Not configured" (if missing)
- Add a helper note: "Manage API keys in your Cloudflare Worker settings or .env file"

### Phase 5 Verification Gate

```bash
pnpm lint && pnpm build
```

Then verify no secrets remain in schema:
```bash
grep -n "twilio_account_sid\|twilio_auth_token\|resend_api_key\|sendgrid_api_key\|smtp_password\|stripe_secret_key\|stripe_webhook_secret" src/db/schema.ts
```

Target: zero results (all removed).

Verify services read from env:
```bash
grep -rn "settings\.\(twilioA\|resendApi\|sendgridApi\|stripeSecret\|stripeWebhook\|smtpPassword\)" lib/ app/ --include="*.ts" | grep -v node_modules
```

Target: zero results.

---

## Post-Completion Summary

After all 5 phases pass their verification gates, run the final check:

```bash
pnpm lint && pnpm build
```

Then print a summary of everything that changed:
```bash
git diff --stat
```

Tell me:
1. How many files were modified
2. How many API routes were updated with requireAuth()
3. How many N+1 patterns were eliminated
4. How many routes now have tenant isolation
5. Any issues encountered and how they were resolved

Do NOT commit. I will review the diff and commit myself.
