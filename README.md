# Fresh Path CRM

Production CRM for **Fresh Path Mobile Detailing** — a premium mobile car detailing business serving Richmond, Katy, Sugar Land, Fulshear, Missouri City, and Stafford TX.

Single-owner SaaS-tier internal tool. Handles leads, jobs, scheduling, invoicing, payments, recurring service plans, fleet contracts, marketing automations, communications inbox (SMS/email/voice), customer portal, online booking, and reporting.

Live: **https://fresh-path-crm.vercel.app**

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict, zero `any`) |
| Styling | Tailwind CSS + shadcn/ui + Radix primitives |
| Database | Turso (libSQL / SQLite at the edge) |
| ORM | Drizzle ORM (no Prisma) |
| Auth | NextAuth v4 (credentials + JWT sessions) |
| Email | Resend |
| SMS / Voice | Twilio |
| Payments | Square (customer invoices) + Stripe (SaaS billing only) |
| Maps / Geo | Google Maps APIs |
| AI | Anthropic Claude (optional) |
| Hosting | Vercel |
| Cron | Vercel Cron |

---

## Quick Start

```bash
# 1. Install
pnpm install   # or npm / yarn

# 2. Configure env
cp .env.example .env.local
# fill in DATABASE_URL, NEXTAUTH_SECRET, etc.

# 3. Generate + push schema (dev DB)
pnpm db:generate
pnpm db:push

# 4. Seed (optional)
pnpm db:seed

# 5. Dev server
pnpm dev
```

App runs at http://localhost:3000.

### Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` | Next.js dev server |
| `pnpm build` | Production build |
| `pnpm start` | Run built app |
| `pnpm lint` | ESLint |
| `pnpm db:generate` | Generate Drizzle migrations from `src/db/schema.ts` |
| `pnpm db:push` | Push schema to DB (dev) |
| `pnpm db:studio` | Drizzle Studio (DB GUI) |
| `pnpm db:seed` | Seed dev DB |

---

## Environment Variables

Required (see `.env.example`):

```bash
DATABASE_URL=              # Turso libSQL URL or file:./dev.db for local
DATABASE_AUTH_TOKEN=       # Turso auth token (production)
NEXTAUTH_URL=              # http://localhost:3000 in dev
NEXTAUTH_SECRET=           # openssl rand -base64 32
```

Optional / feature-gated:

```bash
ANTHROPIC_API_KEY=         # enables AI features
GOOGLE_CLIENT_ID=          # Google Voice sync + OAuth
GOOGLE_CLIENT_SECRET=
RESEND_API_KEY=            # transactional email
TWILIO_ACCOUNT_SID=        # SMS + voice
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
SQUARE_ACCESS_TOKEN=       # customer payment links
SQUARE_LOCATION_ID=
STRIPE_SECRET_KEY=         # SaaS billing (separate from Square)
CRON_SECRET=               # required for /api/cron/* — see CRON-SECRET-SETUP.md
UPSTASH_REDIS_REST_URL=    # distributed rate limiting (recommended)
UPSTASH_REDIS_REST_TOKEN=
SENTRY_DSN=                # error tracking (not yet wired)
```

In production, set all of these in **Vercel → Project Settings → Environment Variables**.

---

## Project Structure

```
app/
  (app)/              Authenticated dashboard routes (jobs, leads, customers, ...)
  api/                Route handlers (REST API surface)
    cron/             Vercel-scheduled jobs (auth-gated by CRON_SECRET)
    webhooks/         Twilio, Stripe, Square inbound webhooks
    integrations/     QuickBooks, Google, third-party OAuth callbacks
  book/               Public booking funnel
  portal/             Customer-facing portal (separate auth)
  invoice/ pay/ quote/ Public document views & payment links

src/db/
  schema.ts           Drizzle schema (source of truth)
  relations.ts        Drizzle relations
  index.ts            DB client factory
  seed.ts             Dev seed data

lib/
  auth.ts             requireAuth() — use this in EVERY API route
  tenant.ts           Tenant-isolation helpers
  cron-auth.ts        Bearer-token guard for cron endpoints
  rate-limit.ts       In-memory limiter (TODO: swap for Upstash)
  permissions.ts      RBAC helpers
  db.ts               Drizzle client (per-request, cached)
  services/           Domain services (jobs, invoicing, messaging, ...)
  validations/        Zod schemas
  schemas/            Shared TS types

components/           shadcn/ui + feature components
```

---

## Cron Jobs

Defined in `vercel.json`. Each handler verifies `Authorization: Bearer ${CRON_SECRET}` via `lib/cron-auth.ts`.

| Path | Schedule | Purpose |
|---|---|---|
| `/api/cron/process-messages` | `*/5 * * * *` | Send queued/scheduled SMS + email |
| `/api/cron/overdue-invoices` | `0 9 * * *` | Daily 9am — mark overdue, send reminders |
| `/api/cron/recurring-expenses` | `0 0 1 * *` | Monthly — generate recurring expense records |
| `/api/cron/sync-voice` | `*/5 * * * *` | Pull Google Voice messages/calls |

Setup steps in [`CRON-SECRET-SETUP.md`](./CRON-SECRET-SETUP.md).

---

## Critical Conventions

Read these before editing — they exist because we got burned without them.

1. **Auth.** Every API route uses `requireAuth()` from `lib/auth.ts`. Never inline `getServerSession`. The leads route is the reference implementation.
2. **Tenant isolation.** Every query filters by `tenantId`. Use helpers in `lib/tenant.ts`.
3. **No N+1.** Never query the DB per record in a loop. Use Drizzle's `inArray()` for batch lookups.
4. **No OR-chains from `.map()`.** Same rule — use `inArray()`.
5. **No secrets in DB.** API keys live in env vars / Vercel secrets, never `businessSettings` rows.
6. **Page components stay under 300 lines.** Extract feature components.
7. **Drizzle only.** No raw SQL unless Drizzle genuinely can't express it.
8. **Per-request DB client.** Use the `getDb()` / `getDbAsync()` factory — never a module-level singleton.
9. **Strict TS.** Zero `any`. Lint + build must pass before merge.
10. **Mobile-first UI.** Every component works at 375px.

Full design + code standards are in [`CLAUDE.md`](./CLAUDE.md).

---

## Deployment

Hosted on Vercel, project `fresh-path-crm` (org `maleks-projects-bcdc415e`).

```bash
# Standard deploy (preview)
vercel

# Production deploy
vercel --prod
```

Database migrations against production Turso:

```bash
pnpm db:generate                  # generate migration
# inspect generated SQL in ./drizzle/
turso db shell <db> < drizzle/<file>.sql
```

CI runs lint + build + tests on PRs via `.github/workflows/ci.yml`.

---

## Known Open Items

Tracked from the most recent audit. Pick these up in priority order.

**Security / correctness**
- N+1 queries in `app/api/jobs/route.ts` and `app/api/customers/route.ts` enrichment loops — convert to `inArray()`.
- Tenant-isolation audit incomplete on customers, jobs, invoices, estimates, expenses routes.
- `businessSettings` still stores API secrets in plaintext — migrate to env vars.
- In-memory rate limiter doesn't survive across serverless invocations — wire `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`.

**Infra**
- No Sentry — needs account + `SENTRY_DSN`.
- NextAuth v4 on Next.js 14 — Auth.js v5 migration deferred (breaking, dedicated sprint).
- Cache headers added to 20 GET routes; ~155 others still uncached.

**Tests**
- 3 pre-existing failures in `__tests__/business-flows.test.ts` referencing removed `RATE_LIMITS` export.
- No E2E suite (Playwright deferred).

**UI**
- `app/(app)/automations/page.tsx` is still oversized — needs decomposition (Sprint 2).

---

## Domain Notes

- **Owner:** single admin user (Malek). Schema is multi-tenant-ready; multi-tech support is planned.
- **Services:** Interior, Exterior, Full Detail, Ceramic Coating, Paint Correction, plus add-ons.
- **Payment split:** Square is for **customer** payments (detailing invoices). Stripe is **only** for SaaS billing if the CRM is ever sold to other detailing businesses. Don't conflate the two.

---

## License

Private. Internal tool for Fresh Path Mobile Detailing.
