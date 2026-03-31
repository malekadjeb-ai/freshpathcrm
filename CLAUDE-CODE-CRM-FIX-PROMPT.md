# Claude Code Mega-Prompt: Fresh Path CRM — Full Audit Fix

Copy everything below into Claude Code CLI. This is a phase-gated build that fixes all critical issues identified in the March 27 audit.

---

## COPY FROM HERE ↓

---

You are a staff-level full-stack engineer fixing a production CRM for Fresh Path Mobile Detailing. This is a Next.js 14 App Router project with Prisma (SQLite), NextAuth, Stripe, Twilio, Shadcn UI, Recharts, React Query, Zustand, and dnd-kit.

Read these files first to understand the codebase patterns before writing any code:

- @CLAUDE.md (if it exists)
- @package.json
- @prisma/schema.prisma
- @lib/auth.ts
- @middleware.ts
- @lib/services/workflow-engine.ts
- @app/(app)/dashboard/page.tsx (gold standard for how pages should be built)

Then run `tree app/(app) -L 1` and `tree lib/services -L 1` to orient yourself.

Execute all 4 phases below in order. Do NOT start the next phase until the current one compiles and the dev server runs without errors. After every significant change, run `npx next build --no-lint` to catch TypeScript errors early.

---

## PHASE 1: CRITICAL REVENUE FIXES (Do first)

### Fix 1.1 — Analytics Page (BLANK RENDER)

**Bug:** `/analytics` page renders completely blank. The main content area is empty.
**File:** `app/(app)/analytics/page.tsx`
**Expected:** Full analytics dashboard with revenue charts, service breakdown, customer segments, lead conversion funnel, expense tracking.

Read the file. The issue is likely one of:
- A client-side fetch error failing silently (no error boundary or fallback)
- An API endpoint returning unexpected shape
- A React Query hook failing without error state
- A missing `"use client"` directive

Check the corresponding API: `app/api/analytics/route.ts`

Fix the render. Make sure:
- Loading state shows skeleton/spinner while data fetches
- Error state shows a helpful message (not blank screen)
- Empty state shows "No data yet" if no records exist
- All charts render with real data from the API
- Date range filter works (7d, 30d, 90d, YTD, custom)

Do NOT redesign the page. Fix the render bug with minimal changes.

---

### Fix 1.2 — Seed Automation Templates + Verify Engine

**Problem:** 0 active workflows, 0 runs. Automation engine is scaffolded but empty.
**Files:**
- `app/api/workflows/seed/route.ts` (has 3 basic templates — expand to 7)
- `lib/services/workflow-engine.ts` (the execution engine)
- `app/(app)/automations/page.tsx` (the UI)

**Step A:** Expand the seed endpoint to include these 7 production-ready workflow templates:

```
1. INSTANT LEAD RESPONSE
   Trigger: lead.created
   Actions:
   - Wait 0 minutes
   - Send SMS to lead: "Hey {{firstName}}! Thanks for reaching out to Fresh Path Mobile Detailing. I'm Malek — I'll personally take care of your {{vehicleInfo}}. What day works best for you this week?"
   - Wait 5 minutes
   - Send SMS: "I can usually fit new clients in within 24-48 hours. Just reply with a preferred day and I'll lock you in 🔒"
   - Create task: "Follow up with {{name}} if no response in 2 hours"

2. QUOTE FOLLOW-UP SEQUENCE
   Trigger: estimate.sent (when estimate status changes to "Sent")
   Actions:
   - Wait 4 hours
   - Send SMS: "Hi {{firstName}}, just wanted to make sure you got the estimate I sent over. Any questions about the services or pricing? Happy to walk through it."
   - Wait 48 hours
   - Send SMS: "Hey {{firstName}} — still interested in getting your {{vehicleInfo}} detailed? I have a couple openings this week if you want to lock one in."
   - Wait 120 hours (5 days total)
   - Send SMS: "Last check-in on your detail estimate, {{firstName}}. The quote is valid for 7 more days. Let me know if you'd like to book or if anything changed!"
   - Update lead status to "Follow-Up" if no response

3. POST-JOB REVIEW REQUEST
   Trigger: job.completed
   Actions:
   - Wait 120 minutes (2 hours after completion)
   - Send SMS: "Hi {{firstName}}! Thanks for choosing Fresh Path for your {{serviceName}}. If you loved the results, a Google review would mean the world to me: {{reviewLink}}"
   - Create review record with status "requested"
   - Wait 72 hours
   - If review not completed: Send SMS: "Hey {{firstName}}, quick reminder — your Google review really helps small businesses like mine grow. Takes 30 seconds: {{reviewLink}} 🙏"

4. PAYMENT REMINDER SEQUENCE
   Trigger: invoice.overdue (invoice past dueDate and status != "Paid")
   Actions:
   - Wait 0 (trigger immediately when overdue)
   - Send SMS: "Hi {{firstName}}, friendly reminder that invoice {{invoiceNumber}} for ${{total}} is due. You can pay securely here: {{paymentLink}}"
   - Wait 72 hours
   - Send SMS: "Hey {{firstName}}, just following up on invoice {{invoiceNumber}} (${{total}}). Please let me know if you have any questions. Pay here: {{paymentLink}}"
   - Wait 168 hours (7 days total)
   - Send email: Professional overdue notice with invoice details and payment link
   - Create task: "Call {{name}} about overdue invoice {{invoiceNumber}}"

5. REACTIVATION CAMPAIGN
   Trigger: customer.inactive (no jobs in 60 days)
   Actions:
   - Send SMS: "Hey {{firstName}}! It's been a while since your last detail. Your {{vehicleInfo}} is probably ready for some love 🚗✨ Want me to get you on the schedule?"
   - Wait 168 hours (7 days)
   - If no response: Send SMS: "{{firstName}}, I'm offering $25 off your next full detail as a welcome-back special. Valid this month only. Just reply BOOK to schedule!"
   - Create task: "Reactivation call to {{name}}"

6. BOOKING CONFIRMATION + REMINDERS
   Trigger: job.scheduled
   Actions:
   - Wait 0 minutes
   - Send SMS: "Your detail is confirmed! 📋\n\nDate: {{scheduledDate}}\nService: {{serviceName}}\nAddress: {{address}}\n\nI'll text you when I'm on my way. See you then! — Malek, Fresh Path"
   - Wait until 24 hours before scheduled time
   - Send SMS: "Reminder: Your {{serviceName}} is tomorrow at {{scheduledTime}}. Please make sure the vehicle is accessible. See you soon!"
   - Wait until 1 hour before scheduled time
   - Send SMS: "Heading your way shortly! ETA about {{etaMinutes}} minutes. 🚙"

7. NEW CUSTOMER WELCOME
   Trigger: customer.created (when lead converts to customer)
   Actions:
   - Wait 0 minutes
   - Send SMS: "Welcome to the Fresh Path family, {{firstName}}! 🎉 You'll get appointment confirmations, reminders, and your service history right from your phone. Save this number!"
   - Create task: "Add {{name}} to recurring service discussion during next visit"
```

**Step B:** Make the seed endpoint idempotent — check if templates already exist before creating duplicates. Add `isTemplate: true` flag to all seeded workflows.

**Step C:** Call the seed endpoint: `curl -X POST http://localhost:3000/api/workflows/seed`

**Step D:** Verify the automations page now shows the 7 templates under the "Templates" tab.

**Step E:** Test the workflow engine by triggering a test event:
- Read `lib/services/workflow-engine.ts`
- Verify that `triggerWorkflows("lead.created", data)` actually finds matching workflows and creates an AutomationExecution record
- Check that the SMS action in the workflow actually calls the communication service
- If the engine only logs but doesn't send, wire it to `lib/services/sms.ts` and `lib/services/communication.ts`

---

### Fix 1.3 — Auto-Responder for New Leads

**Problem:** When a new lead is created via API or the UI, no automatic response is sent.
**File:** `app/api/leads/route.ts`

The POST handler already calls `triggerWorkflows("lead.created", ...)`. The fix is:
1. Ensure the "Instant Lead Response" workflow (from Fix 1.2) actually fires
2. Verify the workflow engine resolves template variables ({{firstName}}, {{vehicleInfo}})
3. If the workflow engine can't send SMS yet (Twilio not configured), make it create a ScheduledMessage as fallback and log the intended action

Also ensure:
- The auto-response fires for leads created via the `/book` public booking page
- The auto-response fires for leads created via the CRM "New Lead" button
- The auto-response does NOT fire for bulk-imported leads (check for a `source: "import"` flag)

---

### Fix 1.4 — Auto Review Request After Job Completion

**File:** `app/api/jobs/[id]/status/route.ts`

When job status changes to "Completed":
1. Verify it triggers `triggerWorkflows("job.completed", ...)`
2. The "Post-Job Review Request" workflow (from Fix 1.2) should handle the rest
3. Ensure it creates a Review record in the database with status "requested"
4. If workflow engine isn't ready, add a direct call:

```typescript
// After setting completedAt and creating statusHistory
if (status === 'Completed' && job.customerId) {
  // Trigger review request workflow
  await triggerWorkflows('job.completed', {
    jobId: job.id,
    customerId: job.customerId,
    tenantId: session.user.tenantId,
  })
}
```

Run `npx next build --no-lint` to verify no TypeScript errors. Then start the dev server and check that the automations page shows 7 templates.

---

## PHASE 2: OPERATIONAL FIXES

### Fix 2.1 — Calendar Timestamp Bug

**Bug:** All jobs on the calendar show "10:42 PM" regardless of actual scheduled time.
**Files:**
- `app/(app)/calendar/page.tsx` — the calendar component
- `prisma/seed.ts` (or wherever seed data lives) — check if seed data has proper timestamps

Investigate:
1. Read the calendar page and see how it displays `scheduledAt`
2. Check the seed data — if all jobs have the same timestamp, fix the seed to distribute times across 8am-6pm
3. If the display code is wrong (timezone conversion issue), fix the date formatting
4. Use `date-fns` format functions (already in the project) for consistent time display
5. After fixing, verify different jobs show different times on the calendar

---

### Fix 2.2 — Automated Payment Reminders

**File:** `app/api/invoices/[id]/route.ts` + create new `app/api/cron/overdue-invoices/route.ts`

Build an overdue invoice checker:

1. Create `app/api/cron/overdue-invoices/route.ts`:
   - GET handler (can be called by cron or manually)
   - Query all invoices where `status != 'Paid'` AND `dueDate < now()`
   - For each overdue invoice, trigger `triggerWorkflows("invoice.overdue", { invoiceId, customerId })`
   - The "Payment Reminder Sequence" workflow (from Fix 1.2) handles the actual messaging
   - Return count of overdue invoices processed

2. Also update the invoice PATCH handler:
   - When an invoice is marked overdue (status change), trigger the workflow immediately
   - When an invoice is paid, cancel any active AutomationExecution for that invoice

---

### Fix 2.3 — Password Reset Flow

**Files to create:**
- `app/api/auth/forgot-password/route.ts`
- `app/api/auth/reset-password/route.ts`
- `app/(auth)/forgot-password/page.tsx` (or add to login page)

Implementation:
1. POST `/api/auth/forgot-password` — takes email, generates a secure token (crypto.randomUUID), stores it with expiry (1 hour), sends reset email via the existing email service
2. POST `/api/auth/reset-password` — takes token + new password, validates token not expired, hashes password with bcrypt, updates user, invalidates token
3. Add "Forgot password?" link on the login page
4. Use the existing `lib/services/email.ts` service to send the reset email

Add a `PasswordResetToken` field to the User model or create a simple table:
```prisma
model PasswordReset {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}
```

Run `npx prisma db push` after schema change (SQLite dev, no migration needed).

---

### Fix 2.4 — Add Pagination to Heavy Queries

**Files:**
- `app/api/analytics/route.ts` (407 lines, pulls ALL records)
- `app/api/dashboard/route.ts` (407 lines, same issue)
- `app/api/customers/route.ts`
- `app/api/jobs/route.ts`
- `app/api/leads/route.ts`
- `app/api/invoices/route.ts`

For each list endpoint:
1. Add `page` and `limit` query params (default: page=1, limit=50)
2. Add `skip` and `take` to Prisma queries
3. Return total count in response: `{ data: [...], total: number, page: number, limit: number }`
4. For analytics/dashboard, keep pulling all records but add date range filtering to limit the dataset size (not full table scans)

Pattern:
```typescript
const page = parseInt(searchParams.get('page') || '1')
const limit = parseInt(searchParams.get('limit') || '50')
const skip = (page - 1) * limit

const [data, total] = await Promise.all([
  prisma.customer.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
  prisma.customer.count({ where })
])

return NextResponse.json({ data, total, page, limit })
```

Do NOT break existing frontend code. The frontend should still work if it doesn't pass pagination params (defaults kick in).

---

## PHASE 3: SECURITY & STABILITY

### Fix 3.1 — Role-Based UI Restrictions

**Files:**
- `lib/auth.ts` — session already includes role
- `app/(app)/layout.tsx` — sidebar navigation
- Every page that should be admin-only

Implement:
1. Create a `useRole()` hook or utility that reads the session role
2. In the sidebar, hide admin-only links for non-admin users:
   - Settings → ADMIN/OWNER only
   - Staff → ADMIN/OWNER only
   - Webhooks → ADMIN only
   - Pricing rules → ADMIN/OWNER only
   - Intelligence → ADMIN/OWNER only
3. On admin-only pages, add a role check at the top that redirects to dashboard if unauthorized
4. In API routes, add role checks for destructive operations (DELETE customer, DELETE invoice, etc.)

Pattern for pages:
```typescript
const session = await getServerSession(authOptions)
if (!session || !['ADMIN', 'OWNER'].includes(session.user.role)) {
  redirect('/dashboard')
}
```

Pattern for API routes:
```typescript
if (!['ADMIN', 'OWNER'].includes(session.user.role)) {
  return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
}
```

---

### Fix 3.2 — Tenant Isolation Enforcement

**Problem:** Routes filter by tenantId but don't validate that a requested record belongs to the current tenant.

**Fix:** In every API route that takes an `[id]` param, add tenant verification:

```typescript
const record = await prisma.customer.findFirst({
  where: {
    id: params.id,
    tenantId: session.user.tenantId  // Enforce tenant isolation
  }
})

if (!record) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
```

Apply this pattern to ALL `[id]` routes:
- customers/[id], leads/[id], jobs/[id], invoices/[id], estimates/[id], quotes/[id]
- webhooks/[id], workflows/[id], campaigns/[id]
- Any other parameterized route

Do a grep for `findUnique` in API routes and replace with `findFirst` + tenantId filter where the model has a tenantId field.

---

### Fix 3.3 — Fix Estimate Line Item Conversion Bug

**File:** `app/api/estimates/[id]/convert/route.ts`

**Bug:** Line with `.filter(item => item.serviceId)` silently drops estimate line items that have null serviceId (custom line items).

**Fix:** Convert ALL line items, not just ones with serviceId:
```typescript
// Before (buggy):
const services = estimate.lineItems.filter(item => item.serviceId)

// After (correct):
const services = estimate.lineItems.map(item => ({
  serviceItemId: item.serviceId || null,
  name: item.name,
  price: item.price,
  quantity: item.quantity,
}))
```

Also add validation: if the estimate has zero line items, return a 400 error instead of creating an empty job.

---

### Fix 3.4 — Stripe Webhook Idempotency

**File:** `app/api/webhooks/stripe/route.ts`

**Bug:** Payment could be double-counted if Stripe retries the webhook.

**Fix:** Before processing a payment event, check if a Payment record with that Stripe paymentIntentId already exists:

```typescript
const existingPayment = await prisma.payment.findFirst({
  where: { notes: { contains: event.data.object.payment_intent } }
})

if (existingPayment) {
  return NextResponse.json({ received: true, duplicate: true })
}
```

Or better: add a `stripePaymentIntentId` field to the Payment model for proper dedup:

```prisma
model Payment {
  // ... existing fields
  stripePaymentIntentId String? @unique
}
```

---

## PHASE 4: VERIFICATION

After completing all fixes:

1. Run `npx prisma db push` to apply any schema changes
2. Run `npx next build --no-lint` — must complete with zero errors
3. Start dev server: `npm run dev`
4. Seed the automation templates: `curl -X POST http://localhost:3000/api/workflows/seed`
5. Navigate to `http://localhost:3000/analytics` — should render charts (not blank)
6. Navigate to `http://localhost:3000/automations` — should show 7 templates
7. Navigate to `http://localhost:3000/calendar` — jobs should show different times
8. Check `http://localhost:3000/settings` — verify it still works

Run `git diff --stat` to see all files changed.

Provide a summary:
```
FIXES COMPLETED:
1. [Fix name] — [status: ✅ done / ⚠️ partial / ❌ blocked]
2. ...

FILES MODIFIED: [count]
FILES CREATED: [count]
SCHEMA CHANGES: [list]

REMAINING ISSUES: [anything that couldn't be fixed and why]
```

---

## CONSTRAINTS

- Follow existing codebase patterns. Read neighboring files before creating new patterns.
- Use existing services (`lib/services/communication.ts`, `lib/services/sms.ts`, `lib/services/email.ts`) — do NOT create duplicate communication logic.
- Use existing Zod schemas in `lib/schemas/` for validation — do NOT inline validation.
- Use existing Shadcn UI components — do NOT install new UI libraries.
- Do NOT modify the Prisma migration history. Use `npx prisma db push` for schema changes (SQLite dev environment).
- Do NOT touch the dashboard page. It works perfectly.
- Do NOT refactor working pages. Only fix what's broken or missing.
- Do NOT add features beyond what's specified in each fix.
- If something needs Twilio/Stripe credentials to test, mock the external call and log the intended action. Mark it as "needs credentials to verify live."
- TypeScript strict mode. No `any` types.
- Self-documenting code. Comments only where logic is non-obvious.
