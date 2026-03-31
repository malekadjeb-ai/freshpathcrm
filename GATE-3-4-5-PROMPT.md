# Fresh Path CRM — Gates 3 + 4 + 5 Evolution Prompt

> **Copy-paste this entire prompt into Claude Code in VSCode. It will execute all three gates sequentially.**

---

## Context

Read `CLAUDE.md` and `EVOLUTION-AUDIT-2026-03-30.md` first. This project is a Next.js 14 (App Router) CRM using TypeScript strict, Tailwind + shadcn/ui, Drizzle ORM, and Turso (libsql). Auth is NextAuth with JWT. Deployed on Vercel.

Gates 1 and 2 are already deployed. Some Gate 3+4 files may already exist from a prior session — **verify each file before creating it.** If the file exists and looks correct, skip it. If it's missing or incomplete, create/fix it. Gate 5 is entirely new.

After ALL work is complete: run `npx tsc --noEmit` and `npx next lint` and fix every error before presenting results. Do not skip this.

---

## GATE 3 — UX Polish (Optimistic Updates, Prefetch, SSE, Accessibility)

### 3.1 SSE Real-Time Notifications

**Check first:** Does `app/api/notifications/stream/route.ts` exist? If yes and it contains a ReadableStream with 3s polling + 25s close, skip. Otherwise create it.

Create `app/api/notifications/stream/route.ts`:
- `export const runtime = "nodejs"` and `export const dynamic = "force-dynamic"`
- Auth via `getServerSession(authOptions)` — return 401 if no session, 403 if no tenantId
- Create a `ReadableStream` that:
  - Sends initial `{ type: "connected" }` SSE event
  - Polls DB every 3s for notifications where `createdAt > lastChecked` for the current user
  - Sends `{ type: "notifications", data: [...] }` when new ones exist
  - Sends `{ type: "heartbeat" }` when no new notifications (keeps connection alive)
  - Closes after 25s (client EventSource auto-reconnects)
  - Cleans up on `req.signal abort`
- Return with headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `Connection: keep-alive`, `X-Accel-Buffering: no`

**Then update `components/notification-bell.tsx`:**
- Add SSE subscriber via `useEffect` with `EventSource` connecting to `/api/notifications/stream`
- On `type: "notifications"` event: deduplicate against existing React Query cache, inject new notifications into cache without refetch, show sonner toast for new bookings/payments/reviews
- Add pulse animation on the bell icon when unread count > 0
- Optimistic mark-read and mark-all-read using `onMutate` pattern (snapshot → update cache → rollback on error)
- ARIA: `aria-label` on trigger button showing unread count, `role="list"` on notification list, `role="listitem"` on each item

### 3.2 Optimistic Updates on Jobs, Leads, Tasks

**Check first:** Does `app/(app)/jobs/jobs-content.tsx` contain `onMutate`? If not, add it.

For `app/(app)/jobs/jobs-content.tsx` — find the `statusMutation` (or equivalent mutation for updating job status). Replace the `onSuccess: invalidate` pattern with:
```ts
onMutate: async ({ jobId, status }) => {
  await queryClient.cancelQueries({ queryKey: ["jobs"] });
  const prev = queryClient.getQueryData<Job[]>(["jobs", statusFilter, locationFilter]);
  queryClient.setQueryData<Job[]>(["jobs", statusFilter, locationFilter], (old = []) =>
    old.map((j) => (j.id === jobId ? { ...j, status } : j))
  );
  return { prev };
},
onError: (_, __, ctx) => {
  if (ctx?.prev) queryClient.setQueryData(["jobs", statusFilter, locationFilter], ctx.prev);
  toast.error("Failed to update job status");
},
onSettled: () => { queryClient.invalidateQueries({ queryKey: ["jobs"] }); },
```

**Check:** Does `app/(app)/leads/page.tsx` contain `onMutate`? If yes, skip. If not, add the same pattern to the lead status/pipeline mutation using `["leads", filterStatus, filterSource]` as the query key.

**Check:** Does `app/(app)/tasks/page.tsx` import `useUndoDelete`? If yes, verify the toggle mutation also has `onMutate` for optimistic completed/completedAt toggle. If not, add both.

### 3.3 Undo Delete Hook

**Check first:** Does `lib/use-undo-delete.ts` exist? If yes and complete, skip. Otherwise create it.

Create `lib/use-undo-delete.ts`:
- Generic hook: `useUndoDelete<T extends { id: string }>({ queryKey, deleteFn, label, onCommitted })`
- Returns `{ softDelete: (id: string) => string | number }` (returns toast ID)
- Flow: snapshot cache → optimistically remove item → show 5s sonner toast with "Undo" action button → if undo clicked, restore snapshot → if toast dismissed/auto-closed, call `deleteFn(id)` then `invalidateQueries`
- On deleteFn failure: restore snapshot, show error toast

Wire it into `app/(app)/tasks/page.tsx` replacing any direct `deleteMutation.mutate(id)` calls with `deleteTask(id)` from `useUndoDelete`.

### 3.4 Sidebar Prefetching

**Check first:** Does `components/shared/Sidebar.tsx` contain `PREFETCH_MAP`? If yes, verify it has `prefetchRoute(href)` and that `SidebarNavItem` fires it on `onMouseEnter` and `onFocus`. If not, add:

```ts
const PREFETCH_MAP: Record<string, { queryKey: string[]; url: string }> = {
  "/jobs": { queryKey: ["jobs", "all", "all"], url: "/api/jobs?limit=20" },
  "/customers": { queryKey: ["customers"], url: "/api/customers?limit=25" },
  "/dashboard": { queryKey: ["dashboard"], url: "/api/dashboard" },
  "/calendar": { queryKey: ["calendar-jobs"], url: "/api/calendar" },
  "/invoicing": { queryKey: ["invoices"], url: "/api/invoices?limit=25" },
  "/reviews": { queryKey: ["reviews"], url: "/api/reviews?limit=25" },
  "/analytics": { queryKey: ["analytics"], url: "/api/analytics" },
};

function prefetchRoute(href: string) {
  const entry = PREFETCH_MAP[href];
  if (!entry) return;
  queryClient.prefetchQuery({
    queryKey: entry.queryKey,
    queryFn: () => fetchJson(entry.url),
    staleTime: 60_000,
  });
}
```

Add `onMouseEnter={() => prefetchRoute(href)}` and `onFocus={() => prefetchRoute(href)}` to each sidebar nav link.

### 3.5 ARIA Accessibility

**Check first:** Verify these already exist before making changes.

- `components/pagination.tsx`: Wrapper should be `<nav aria-label="Pagination">`. Page count gets `aria-live="polite" aria-atomic="true"`. Prev/Next buttons get `aria-label`. Page buttons get `aria-label={`Go to page ${n}`}` and `aria-current="page"` when active. Icons get `aria-hidden="true"`.
- `components/shared/status-badge.tsx`: Badge span gets `role="status"` and `aria-label={`Status: ${status}`}`.

### 3.6 Onboarding Wizard Persistence

**Check first:** Does `components/shared/onboarding-wizard.tsx` contain `STORAGE_KEY`? If yes, skip. Otherwise:

- Add `const STORAGE_KEY = "fp-onboarding-progress"`
- On mount: load `step`, `businessName`, `businessPhone`, `businessEmail`, `businessAddress` from `localStorage.getItem(STORAGE_KEY)`
- On change: persist these values to localStorage via `useEffect`
- On completion: call `localStorage.removeItem(STORAGE_KEY)` before `onComplete()`

---

## GATE 4 — Infrastructure Hardening

### 4.1 DB Connection Retry

**Check first:** Does `src/db/index.ts` contain `createClientWithRetry`? If yes, skip. Otherwise:

Wrap `createClient()` in a `createClientWithRetry(maxRetries = 3)` function that catches errors and retries up to 3 times. Both `getDb` and `getDbAsync` should use it.

### 4.2 Health Check Endpoint

**Check first:** Does `app/api/health/route.ts` contain `performance.now()` and `startedAt`? If yes, skip. Otherwise:

Rewrite to:
- Track `startedAt = Date.now()` at module level for uptime
- Run `db.all(sql\`SELECT 1 as ok\`)` with `performance.now()` timing
- Return: `status`, `timestamp`, `version` (from `DEPLOY_COMMIT` env), `uptime`, `database: { status, latencyMs, driver: "turso" }`, `runtime`
- On DB error: return 503 with `status: "degraded"`

### 4.3 Request Tracing

**Check first:** Does `middleware.ts` contain `x-request-id`? If yes, skip. Otherwise:

Rewrite `middleware.ts`:
- Generate `x-request-id` via `crypto.randomUUID()` or forward existing from request headers
- Auth check using `getToken()` from `next-auth/jwt` (replaces the default `export { default } from "next-auth/middleware"`)
- Set `x-request-id` and `x-api-version: 1` on all responses
- Redirect to `/login` if no token (preserve callbackUrl)
- Keep existing `config.matcher` pattern

**Check:** Does `lib/logger.ts` contain `getRequestId`? If yes, skip. Otherwise add:
- `getRequestId()` helper reading `x-request-id` from `headers()`
- `requestId` field to `LogContext`
- `logWarn()` function
- All log functions include `requestId` in output

### 4.4 Streaming CSV Exports

**Check first:** Does `app/api/export/route.ts` contain `ReadableStream`? If yes, skip. Otherwise:

Replace the response return with a `ReadableStream` that:
- Encodes the CSV header row first
- Then encodes data rows in 500-row batches
- Sets `Content-Disposition: attachment`, `Content-Type: text/csv`, `X-Total-Rows` header
- Has proper try/catch error handling

### 4.5 Import Sanitization

**Check first:** Does `lib/sanitize-import.ts` exist? If yes, skip. Otherwise create it with:
- `sanitizeImportRecords(raw)`: validates phone (7-15 digits after normalization), timestamp (must be parseable Date), direction (inbound/outbound/missed), type (call/text/voicemail)
- `sanitizeName(raw)`: strip control chars, trim, cap at 120 chars
- `sanitizeBody(raw)`: strip non-printable (keep \n \r \t), cap at 5000 chars
- `validateEmail(email)`: regex validation
- Deduplication within batch using `phone_timestamp_type_direction` composite key
- Duration: must be non-negative number, else undefined
- Returns `{ valid: SanitizedRecord[], errors: { index, reason }[], duplicatesRemoved: number }`

Then update `app/api/import/google-voice/process/route.ts` to call `sanitizeImportRecords()` before DB operations. Return 400 if all records fail. Include `sanitized`, `validationErrors`, `duplicatesRemoved` in response.

### 4.6 CI/CD Pipeline

**Check first:** Does `.github/workflows/ci.yml` exist? If yes, skip. Otherwise create:
- 4 jobs: `lint-typecheck`, `test`, `build`, `deploy`
- lint-typecheck: `npx next lint` + `npx tsc --noEmit`
- test: `npx vitest run --reporter=verbose`
- build: `npx next build` (needs lint+test to pass first)
- deploy: Vercel deploy on push to main only (use `amondnet/vercel-action@v25`)
- Node 20, npm ci, concurrency group with cancel-in-progress

### 4.7 API Versioning

**Check first:** Does `app/api/extension/ping/route.ts` contain `x-api-version`? If yes, skip. Otherwise:

Rewrite to read `x-api-version` from client headers, compare to `CURRENT_API_VERSION = 1`, log warning on mismatch via `logWarn()`, return `apiVersion`, `versionMatch`, and warning message if mismatched.

---

## GATE 5 — Production Grade (Dark Mode, RBAC, Print, Audit Trail, Perf Budget, Docs)

### 5.1 Dark Mode

Create a theme system with toggle and system detection:

**Create `lib/theme-context.tsx`:**
```tsx
"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolved] = useState<"light" | "dark">("light");

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem("fp-theme", t);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("fp-theme") as Theme | null;
    if (stored) setThemeState(stored);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const resolve = () => {
      const isDark = theme === "dark" || (theme === "system" && mq.matches);
      setResolved(isDark ? "dark" : "light");
      document.documentElement.classList.toggle("dark", isDark);
    };
    resolve();
    mq.addEventListener("change", resolve);
    return () => mq.removeEventListener("change", resolve);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
```

**Create `components/theme-toggle.tsx`:**
- Three-state toggle: Light / System / Dark
- Use Sun, Monitor, Moon icons from lucide-react
- Segmented control style using shadcn Button group
- Show current resolved theme as active

**Wrap the app:** In `app/(app)/layout.tsx`, wrap children with `<ThemeProvider>`. Add theme toggle to the sidebar settings area or top-right header.

**Update `tailwind.config.ts`:**
- Add `darkMode: "class"` to the config

**Update global CSS (`app/globals.css`):**
- Add dark mode CSS variables:
  ```css
  .dark {
    --background: 15 23 42;        /* slate-900 */
    --foreground: 241 245 249;     /* slate-100 */
    --card: 30 41 59;              /* slate-800 */
    --card-foreground: 241 245 249;
    --popover: 30 41 59;
    --popover-foreground: 241 245 249;
    --primary: 16 185 129;         /* emerald-500 */
    --primary-foreground: 255 255 255;
    --secondary: 51 65 85;         /* slate-700 */
    --secondary-foreground: 203 213 225;
    --muted: 51 65 85;
    --muted-foreground: 148 163 184;
    --accent: 51 65 85;
    --accent-foreground: 241 245 249;
    --destructive: 239 68 68;
    --destructive-foreground: 255 255 255;
    --border: 51 65 85;
    --input: 51 65 85;
    --ring: 16 185 129;
  }
  ```
- The sidebar is already dark (#0f172a) — keep it the same in both modes

**Verify:** Toggle between light, dark, and system. Sidebar stays dark in both. Content area flips correctly. All text remains readable. Cards, inputs, modals, dropdowns all respect dark mode.

### 5.2 Multi-User RBAC

The `users` table already has a `role` field. Expand the permission system:

**Create `lib/permissions.ts`:**
```ts
export type Role = "OWNER" | "ADMIN" | "TECH" | "VIEWER";

export const ROLE_HIERARCHY: Record<Role, number> = {
  OWNER: 4,
  ADMIN: 3,
  TECH: 2,
  VIEWER: 1,
};

type Permission =
  | "jobs:read" | "jobs:write" | "jobs:delete"
  | "customers:read" | "customers:write" | "customers:delete"
  | "calendar:read" | "calendar:write"
  | "invoices:read" | "invoices:write" | "invoices:delete"
  | "estimates:read" | "estimates:write"
  | "analytics:read"
  | "settings:read" | "settings:write"
  | "billing:read" | "billing:write"
  | "users:read" | "users:write" | "users:delete"
  | "campaigns:read" | "campaigns:write"
  | "reviews:read" | "reviews:write";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  OWNER: ["*"] as unknown as Permission[], // all permissions
  ADMIN: [
    "jobs:read", "jobs:write", "jobs:delete",
    "customers:read", "customers:write", "customers:delete",
    "calendar:read", "calendar:write",
    "invoices:read", "invoices:write", "invoices:delete",
    "estimates:read", "estimates:write",
    "analytics:read",
    "settings:read",
    "campaigns:read", "campaigns:write",
    "reviews:read", "reviews:write",
    "users:read",
  ],
  TECH: [
    "jobs:read", "jobs:write",
    "customers:read",
    "calendar:read", "calendar:write",
  ],
  VIEWER: [
    "jobs:read", "customers:read", "calendar:read",
    "invoices:read", "estimates:read", "analytics:read",
    "reviews:read",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if ((perms as unknown as string[]).includes("*")) return true;
  return perms.includes(permission);
}

export function requirePermission(role: string | undefined, permission: Permission): void {
  if (!role || !hasPermission(role as Role, permission)) {
    throw new Error(`Insufficient permissions: requires ${permission}`);
  }
}
```

**Create `lib/require-permission.ts` (server-side API helper):**
```ts
import { NextResponse } from "next/server";
import { requireAuth } from "./auth";
import { hasPermission, type Role } from "./permissions";

export async function requireAuthWithPermission(permission: string) {
  const auth = await requireAuth();
  if ("error" in auth) return auth;

  const role = (auth.session.user as { role?: string }).role || "VIEWER";
  if (!hasPermission(role as Role, permission as any)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return auth;
}
```

**Create `components/permission-gate.tsx` (client-side UI gate):**
```tsx
"use client";
import { useSession } from "next-auth/react";
import { hasPermission, type Role, type Permission } from "@/lib/permissions";

export function PermissionGate({
  permission,
  children,
  fallback = null
}: {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role || "VIEWER";

  if (!hasPermission(role as Role, permission)) return <>{fallback}</>;
  return <>{children}</>;
}
```

**Wire in:** Wrap write/delete actions in the sidebar, job actions, customer delete buttons, settings page, billing page, and user management with `<PermissionGate>`. Do NOT block the entire page — only hide/disable the action buttons and forms that require write access.

### 5.3 Print-Optimized Invoices & Quotes

**Create `app/globals.css` print styles (append to existing):**
```css
@media print {
  /* Hide non-content elements */
  nav, aside, header, footer,
  .sidebar, .mobile-nav, .notification-bell,
  button:not(.print-visible),
  .no-print { display: none !important; }

  /* Full-width content */
  main, .content-area {
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
  }

  /* Clean backgrounds */
  body { background: white !important; color: black !important; }

  /* Page breaks */
  .page-break-before { page-break-before: always; }
  .page-break-after { page-break-after: always; }
  .no-break { page-break-inside: avoid; }

  /* Invoice specific */
  .invoice-container {
    padding: 0.5in !important;
    font-size: 11pt !important;
  }

  .invoice-header {
    border-bottom: 2px solid #000 !important;
    padding-bottom: 1rem !important;
    margin-bottom: 1rem !important;
  }

  .invoice-table th {
    background-color: #f3f4f6 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .invoice-total {
    font-weight: bold !important;
    border-top: 2px solid #000 !important;
  }

  /* Ensure links show URL */
  a[href]::after { content: none; }

  @page {
    size: letter;
    margin: 0.5in;
  }
}
```

**Update the invoice detail page** (`app/(app)/invoicing/[id]/page.tsx` or similar):
- Add a "Print Invoice" button with `onClick={() => window.print()}`
- Add CSS classes: `invoice-container`, `invoice-header`, `invoice-table`, `invoice-total`, `no-break`
- Add company branding (logo, business name, address) in the invoice header that's visible in print

**Do the same for quotes/estimates** detail page if it exists.

### 5.4 Audit Trail

**Add to `src/db/schema.ts`:**
```ts
export const auditLogs = sqliteTable("AuditLog", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull(),
  userId: text("user_id").notNull(),
  userEmail: text("user_email"),
  action: text("action").notNull(), // "create" | "update" | "delete"
  entity: text("entity").notNull(), // "job" | "customer" | "invoice" | etc.
  entityId: text("entity_id").notNull(),
  changes: text("changes"), // JSON string of { field: { from, to } }
  metadata: text("metadata"), // JSON string for extra context
  ipAddress: text("ip_address"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  tenantIdx: index("audit_tenant_idx").on(table.tenantId),
  entityIdx: index("audit_entity_idx").on(table.entity, table.entityId),
  userIdx: index("audit_user_idx").on(table.userId),
  createdAtIdx: index("audit_created_at_idx").on(table.createdAt),
}));
```

**Generate migration:** Run `npx drizzle-kit generate` after adding the schema.

**Create `lib/audit.ts`:**
```ts
import { getDb } from "@/src/db";
import { auditLogs } from "@/src/db/schema";

interface AuditEntry {
  tenantId: string;
  userId: string;
  userEmail?: string;
  action: "create" | "update" | "delete";
  entity: string;
  entityId: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export async function logAudit(entry: AuditEntry) {
  try {
    const db = getDb();
    await db.insert(auditLogs).values({
      tenantId: entry.tenantId,
      userId: entry.userId,
      userEmail: entry.userEmail,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      changes: entry.changes ? JSON.stringify(entry.changes) : null,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
      ipAddress: entry.ipAddress,
    });
  } catch {
    // Audit logging should never break the main operation
    console.error("Failed to write audit log");
  }
}

export function diffChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Record<string, { from: unknown; to: unknown }> | null {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of Object.keys(after)) {
    if (before[key] !== after[key]) {
      changes[key] = { from: before[key], to: after[key] };
    }
  }
  return Object.keys(changes).length > 0 ? changes : null;
}
```

**Create `app/api/audit/route.ts`:**
- GET: List audit logs for tenant with pagination, filterable by `entity`, `userId`, `dateFrom`, `dateTo`
- Requires auth + `settings:read` permission
- Returns `{ logs: AuditLog[], total: number, page: number, totalPages: number }`

**Create `app/(app)/settings/audit/page.tsx`:**
- Table view: timestamp, user, action, entity, entity ID, changes summary
- Filters: entity type dropdown, date range picker, user dropdown
- Expandable rows showing full change diff (from → to)
- Pagination
- Only visible to OWNER and ADMIN roles

**Wire audit logging into the top 5 highest-value mutation endpoints:**
1. `app/api/jobs/route.ts` (POST create, PUT update)
2. `app/api/customers/route.ts` (POST create, PUT update, DELETE)
3. `app/api/invoices/route.ts` (POST create, PUT update)
4. `app/api/settings/route.ts` (PUT update)
5. `app/api/leads/route.ts` (POST create, PUT update)

For each: capture the before state (for updates), call `logAudit()` after the DB mutation succeeds. Use `diffChanges()` for updates. Do NOT audit reads.

### 5.5 Performance Budget

**Create `scripts/bundle-check.ts`:**
```ts
import fs from "fs";
import path from "path";

const BUDGETS = {
  maxInitialJs: 200 * 1024,    // 200KB
  maxTotalJsPerPage: 500 * 1024, // 500KB
  maxFirstLoad: 300 * 1024,      // 300KB shared
};

function checkBundles() {
  const buildDir = path.join(process.cwd(), ".next");
  if (!fs.existsSync(buildDir)) {
    console.error("No .next directory found. Run `next build` first.");
    process.exit(1);
  }

  const buildManifest = JSON.parse(
    fs.readFileSync(path.join(buildDir, "build-manifest.json"), "utf-8")
  );

  let violations = 0;
  const pages = Object.keys(buildManifest.pages);

  for (const page of pages) {
    const files: string[] = buildManifest.pages[page];
    const jsFiles = files.filter((f: string) => f.endsWith(".js"));
    let totalSize = 0;

    for (const file of jsFiles) {
      const filePath = path.join(buildDir, file);
      if (fs.existsSync(filePath)) {
        totalSize += fs.statSync(filePath).size;
      }
    }

    if (totalSize > BUDGETS.maxTotalJsPerPage) {
      console.warn(`⚠️  ${page}: ${(totalSize / 1024).toFixed(1)}KB exceeds ${(BUDGETS.maxTotalJsPerPage / 1024)}KB budget`);
      violations++;
    }
  }

  console.log(`\nBundle check complete. ${violations} violation(s) found.`);
  if (violations > 0) {
    console.log("These are warnings, not failures. Address in future optimizations.");
  }
}

checkBundles();
```

**Add to `package.json` scripts:**
```json
"bundle-check": "node --loader ts-node/esm scripts/bundle-check.ts"
```

**Update `.github/workflows/ci.yml`** (if it exists): Add a step after build that runs the bundle check (as a warning, not a blocking failure).

### 5.6 Developer Documentation

**Create `docs/ARCHITECTURE.md`:**
- High-level system diagram (text-based)
- Directory structure explanation
- Data flow: Request → Middleware → Auth → Route Handler → Drizzle → Turso → Response
- Key patterns: per-request DB client, tenant isolation, React Query caching, optimistic updates
- How auth works (NextAuth + JWT + httpOnly cookies)

**Create `docs/API-REFERENCE.md`:**
- Auto-document by scanning `app/api/` directory
- For each route: method, path, auth required, description, request/response shape
- Group by domain: customers, jobs, invoices, leads, calendar, settings, etc.

**Create `docs/DEPLOYMENT.md`:**
- Environment variables needed (TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, NEXTAUTH_SECRET, NEXTAUTH_URL)
- How to deploy to Vercel
- How to run database migrations
- How to set up for local development

**Create `docs/CONTRIBUTING.md`:**
- Setup: clone, `npm install`, copy `.env.example`, run `npm run dev`
- Code standards (reference CLAUDE.md)
- PR process
- How to add a new API route (with tenant isolation + auth pattern)
- How to add a new page (with loading state + empty state pattern)

---

## Verification Checklist (DO NOT SKIP)

After all gates are complete:

1. Run `npx tsc --noEmit` — fix ALL errors (ignore pre-existing ones in truncated files if any)
2. Run `npx next lint` — fix all warnings and errors
3. Run `npx drizzle-kit generate` if schema.ts was modified (for audit trail table)
4. Verify dark mode toggle works (add `darkMode: "class"` to tailwind.config)
5. Verify print styles render correctly (check with browser print preview)
6. List all files created/modified with a one-line summary of each change

Present a final summary showing:
- Files created (count)
- Files modified (count)
- Gate 3 status
- Gate 4 status
- Gate 5 status
- Any issues or warnings
