# Contributing

## Setup

1. Install Node.js 18+ and pnpm.
2. Clone the repo and run `pnpm install`.
3. Copy `.env.example` to `.env.local` and fill in required values (see [DEPLOYMENT.md](./DEPLOYMENT.md)).
4. Run `pnpm db:push` to sync the database schema.
5. Run `pnpm dev` to start the development server.

## Code Standards

Refer to `CLAUDE.md` in the project root for the full specification. Key points:

- **TypeScript strict mode** with zero `any` types.
- **Self-documenting code.** Only comment non-obvious logic.
- **No unnecessary abstractions.** Build for current requirements.
- **Functions under 50 lines.**
- **Page components under 300 lines** — extract into feature components in `components/`.
- **Mobile-first.** Every component must work on 375px.
- **Loading states** for all async operations. No layout shift.

## Adding a New API Route

Every API route must follow the tenant isolation pattern. Use `app/api/leads/route.ts` as the reference.

```ts
// app/api/your-entity/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { yourTable } from "@/src/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    // 1. Always authenticate
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { tenantId } = auth;

    const db = getDb();

    // 2. Always filter by tenantId
    const results = await db
      .select()
      .from(yourTable)
      .where(eq(yourTable.tenantId, tenantId))
      .orderBy(desc(yourTable.createdAt));

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session, tenantId } = auth;

    const body = await req.json();
    // Validate with Zod schema

    const db = getDb();
    const [created] = await db.insert(yourTable).values({
      ...body,
      tenantId, // Always set tenantId from auth
    }).returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

Key rules:
- **Always** call `requireAuth()` first.
- **Always** filter/set `tenantId` from auth, never from request body.
- **Never** use per-record DB queries in a loop. Use `inArray()` for batch lookups.
- **Never** create OR chains with `.map()`. Use `inArray()` from drizzle-orm.

## Adding a New Page

Every page must handle loading, empty, and error states.

```
app/(app)/your-page/
  page.tsx          # Main page component (under 300 lines)
  loading.tsx       # Loading skeleton

components/your-feature/
  YourFeatureList.tsx
  YourFeatureCard.tsx
  YourFeatureForm.tsx
```

Page pattern:
```tsx
// app/(app)/your-page/page.tsx
"use client";

import { useQuery } from "@tanstack/react-query";

export default function YourPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["your-entity"],
    queryFn: () => fetch("/api/your-entity").then(r => r.json()),
  });

  if (isLoading) return <YourPageSkeleton />;
  if (error) return <ErrorState message="Failed to load" />;
  if (!data?.length) return <EmptyState />;

  return <YourFeatureList data={data} />;
}
```

Loading skeleton:
```tsx
// app/(app)/your-page/loading.tsx
export default function Loading() {
  return (
    <div className="space-y-4 p-6">
      <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
      <div className="h-64 animate-pulse rounded bg-gray-100" />
    </div>
  );
}
```

## Workflow

1. Create a feature branch from `main`.
2. Make changes following the patterns above.
3. Run `pnpm lint && pnpm build` to verify.
4. Test locally with `pnpm dev`.
5. Open a pull request against `main`.
6. PR description should include what changed and why.

## Database Changes

1. Modify the schema in `src/db/schema.ts`.
2. Run `pnpm db:generate` to create a migration.
3. Run `pnpm db:push` to apply locally.
4. Test thoroughly before merging.
5. Production migration happens on deploy via `db:push`.
