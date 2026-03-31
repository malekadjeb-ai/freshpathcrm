# Architecture

## System Overview

Fresh Path CRM is a production-grade CRM for Fresh Path Mobile Detailing, built with Next.js 14 (App Router), Drizzle ORM, Turso (LibSQL), and deployed on Vercel. It serves as the internal operations platform for managing customers, jobs, invoices, leads, communications, and analytics.

## Tech Stack

| Layer       | Technology                          |
| ----------- | ----------------------------------- |
| Framework   | Next.js 14 (App Router)             |
| Language    | TypeScript (strict mode)            |
| Styling     | Tailwind CSS + shadcn/ui            |
| Database    | Turso (LibSQL) / Cloudflare D1      |
| ORM         | Drizzle ORM                         |
| Auth        | NextAuth with Credentials + JWT     |
| Deployment  | Vercel (primary), Cloudflare ready  |
| Icons       | Lucide React                        |
| Charts      | Recharts                            |
| PDF         | jsPDF                               |
| Dates       | date-fns                            |

## Directory Structure

```
app/
  (app)/              # Authenticated dashboard layout group
    dashboard/        # Main dashboard page
    customers/        # Customer management pages
    jobs/             # Job management pages
    invoices/         # Invoice management pages
    leads/            # Lead pipeline pages
    estimates/        # Estimate management pages
    communications/   # Messaging hub
    settings/         # Business settings
    ...
  api/                # Route Handlers (REST API)
    customers/        # CRUD + search, segments, bulk ops
    jobs/             # CRUD + status, photos, checklists
    invoices/         # CRUD + send, checkout, bulk
    leads/            # CRUD + convert, bulk
    analytics/        # Dashboard analytics
    auth/             # NextAuth endpoints
    ...
  book/               # Public booking page
  invoice/            # Public invoice view
  pay/                # Public payment page
  portal/             # Customer portal
  login/              # Auth login page

components/
  ui/                 # shadcn/ui primitives (Button, Dialog, etc.)
  shared/             # Shared components (CommandPalette, Sidebar, etc.)
  customers/          # Customer-specific feature components
  jobs/               # Job-specific feature components
  invoices/           # Invoice-specific feature components
  ...

lib/
  auth.ts             # NextAuth config + requireAuth() helper
  audit.ts            # Audit trail logging utility
  validations/        # Zod schemas for form/API validation
  services/           # Business logic services (workflow engine, etc.)
  hooks/              # Custom React hooks
  utils.ts            # Shared utility functions

src/
  db/
    index.ts          # Drizzle client factory (getDb / getDbAsync)
    schema.ts         # Drizzle table definitions
    migrations/       # SQL migration files
```

## Data Flow

1. **Server Components** render pages using `getDb()` to query Turso directly on the server.
2. **Client Components** use React Query (`@tanstack/react-query`) to fetch data from API routes via `fetch()`.
3. **API Routes** (`app/api/`) authenticate via `requireAuth()`, query the database with Drizzle, and return JSON.
4. **Mutations** use either Server Actions or API route POST/PUT/DELETE handlers.
5. **Optimistic Updates** are handled by React Query's `onMutate` / `onError` / `onSettled` callbacks on the client.

## Key Patterns

### Per-Request Database Client

The Drizzle client is created per-request using React `cache()` to avoid global singletons:

```ts
import { cache } from "react";
export const getDb = cache(() => {
  const client = createClient({ url, authToken });
  return drizzle(client, { schema });
});
```

### Tenant Isolation

Every database query MUST filter by `tenantId` from the authenticated session. The `requireAuth()` helper extracts this:

```ts
const auth = await requireAuth();
if ("error" in auth) return auth.error;
const { tenantId } = auth;

// Every query includes tenant filter
const results = await db.select().from(table).where(eq(table.tenantId, tenantId));
```

### React Query Data Fetching

Client components use React Query for server state management:

```ts
const { data, isLoading } = useQuery({
  queryKey: ["customers", filters],
  queryFn: () => fetch("/api/customers?" + params).then(r => r.json()),
});
```

### Optimistic Updates

Mutations use optimistic updates for instant UI feedback:

```ts
const mutation = useMutation({
  mutationFn: (data) => fetch("/api/resource", { method: "POST", body: JSON.stringify(data) }),
  onMutate: async (newData) => {
    await queryClient.cancelQueries({ queryKey: ["resource"] });
    const previous = queryClient.getQueryData(["resource"]);
    queryClient.setQueryData(["resource"], (old) => [...old, newData]);
    return { previous };
  },
  onError: (_err, _new, context) => {
    queryClient.setQueryData(["resource"], context?.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ["resource"] });
  },
});
```

## Auth Flow

1. User submits credentials on `/login`.
2. NextAuth `CredentialsProvider` validates email/password against the `User` table (bcrypt).
3. On success, a JWT is issued containing `id`, `email`, `role`, and `tenantId`.
4. The JWT is stored in an httpOnly cookie managed by NextAuth.
5. API routes call `requireAuth()` which calls `getServerSession()` to decode the JWT.
6. If no valid session or no `tenantId`, a 401/403 response is returned.
7. The `tenantId` from the session is used to scope all database queries.
