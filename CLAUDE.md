# Project: Fresh Path CRM

Production-grade CRM for Fresh Path Mobile Detailing. Premium mobile car detailing business serving Richmond TX, Katy TX, Sugar Land TX, and Houston TX. This is a paid SaaS-tier internal tool ($300/month value) deployed globally on Cloudflare Workers.

## Tech Stack

- Framework: Next.js 14 (App Router) with OpenNext Cloudflare adapter (@opennextjs/cloudflare)
- Language: TypeScript (strict mode, zero `any` types)
- Styling: Tailwind CSS + shadcn/ui
- Database: Cloudflare D1 (serverless SQLite on the edge)
- ORM: Drizzle ORM (NOT Prisma — Drizzle is lighter, zero dependencies, native D1 support, no binary engine needed)
- Auth: JWT with httpOnly cookies (single admin user, expandable to multi-user later)
- Deployment: Cloudflare Workers via OpenNext adapter + Wrangler CLI
- Icons: Lucide React
- Charts: Recharts
- Date handling: date-fns
- PDF generation: jsPDF (for invoices)
- Configuration: wrangler.jsonc for Cloudflare bindings

## Architecture

- App Router with server components by default, client components only when interactivity is required
- API routes in app/api/ using Route Handlers
- Database access through Drizzle client via a getDb() helper that uses getCloudflareContext()
- NEVER create a global Drizzle client. Create a new client per request using React cache():
  ```ts
  import { getCloudflareContext } from "@opennextjs/cloudflare";
  import { drizzle } from "drizzle-orm/d1";
  import { cache } from "react";
  import * as schema from "./schema";

  export const getDb = cache(() => {
    const { env } = getCloudflareContext();
    return drizzle(env.DB, { schema });
  });

  export const getDbAsync = cache(async () => {
    const { env } = await getCloudflareContext({ async: true });
    return drizzle(env.DB, { schema });
  });
  ```
- Use getDb() for dynamic server components and API routes
- Use getDbAsync() for static/ISR routes
- Server Actions for mutations, Route Handlers for complex API logic
- All forms use React Hook Form + Zod validation
- Environment variables via Cloudflare bindings in wrangler.jsonc, NOT .env files in production

## Code Standards

- Self-documenting code. No boilerplate comments.
- Only add comments where logic is genuinely non-obvious.
- No unnecessary abstractions. Build for current requirements.
- Error handling at system boundaries (user input, D1 queries, external APIs).
- TypeScript strict mode. Zero `any` types.
- Prefer composition over inheritance.
- Keep functions under 50 lines.
- All database queries go through Drizzle schema definitions.
- No raw SQL unless Drizzle genuinely cannot express the query.

## UI Standards

- No generic AI aesthetic. No purple gradients. No default rounded cards with Inter font.
- Design direction: Clean, modern, premium feel. Think Linear or Vercel dashboard.
- Color palette: Dark sidebar (#0f172a), white/gray content area, emerald (#10b981) for success/primary actions, amber (#f59e0b) for warnings, red (#ef4444) for errors.
- Typography: Geist Sans (primary), Geist Mono (code/numbers). Fall back to system fonts.
- Spacing: 4px base unit via Tailwind defaults.
- Corners: rounded-lg (8px) for cards, rounded-md (6px) for buttons and inputs.
- Shadows: subtle, shadow-sm for cards, shadow-md for modals.
- Mobile-first. Every component must work on 375px.
- Loading states for all async operations. No layout shift.
- Semantic HTML. Keyboard accessible.

## Database Migration Approach

- Drizzle schema defined in src/db/schema.ts
- Migrations generated with: `npx drizzle-kit generate`
- Migrations applied locally with: `npx wrangler d1 migrations apply fresh-path-crm --local`
- Migrations applied to production with: `npx wrangler d1 migrations apply fresh-path-crm --remote`
- drizzle.config.ts uses d1-http driver for remote operations

## Workflow

- Read files before editing: understand existing patterns first
- After changes: `pnpm lint && pnpm build`
- Fix all lint/type errors before presenting work
- Test locally with: `pnpm preview` (runs in workerd runtime via wrangler)
- Do not touch files outside the current task scope
- If you think something else needs to change, tell me instead of doing it

## Critical Rules (from 2026-03-30 Audit)

- EVERY API route MUST use requireAuth() from lib/auth.ts — never inline getServerSession
- EVERY query MUST filter by tenantId — leads route is the reference implementation
- NEVER use per-record DB queries in a loop — use inArray() for batch lookups
- NEVER store API keys in the database — use env vars / Cloudflare secrets
- NEVER create OR chains with .map() — use inArray() from drizzle-orm
- Page components MUST stay under 300 lines — extract into feature components
- The Prisma migration is COMPLETE — no Prisma references should exist (lib/prisma.ts is now lib/db.ts)
- DB client uses React cache() per-request pattern — no global singletons

## Known Technical Debt

- Tenant isolation incomplete on customers, jobs, invoices, estimates, expenses routes (leads is correct)
- N+1 queries in jobs/route.ts and customers/route.ts (enrichment loops)
- No tests, no CI/CD pipeline
- businessSettings stores API secrets in plaintext — needs migration to env vars
- 5 god-pages over 1000 lines: customers/[id], dashboard, communications, jobs/[id], automations

## Context

- Owner: Malek (single admin user for now, multi-tech support planned)
- Services: Interior, Exterior, Full Detail, Ceramic Coating, Paint Correction, add-ons
- Service areas: Richmond TX, Katy TX, Sugar Land TX, Fulshear TX, Missouri City TX, Stafford TX
- Database: Drizzle ORM + Turso (dev) / Cloudflare D1 (production)
- Auth: NextAuth with credentials provider + JWT sessions
- Migration from Prisma is complete — all DB access through Drizzle

## Behavior

- Be persistent. Complete tasks fully.
- Prefer "do first, ask after" for local reversible actions.
- Ask before: deleting files, force-pushing, modifying production database.
- When stuck after 3 attempts, try a fundamentally different strategy.
- After completing a task, summarize what changed in 2-3 sentences.
