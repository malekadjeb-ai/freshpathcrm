# Fresh Path CRM — Production-Grade UI Perfection Prompt

## CONTEXT

Fresh Path CRM is a Next.js 14 (App Router) CRM for a mobile detailing business. The sidebar consolidation, hub pages, and dashboard redesign are done. The app works — but the UI is inconsistent across pages. This prompt makes every page look like it belongs in the same app. Think Linear, Vercel, or Raycast — fast, clean, zero jank.

Read CLAUDE.md before starting. Then read these files to understand existing patterns:
```
@components/shared/page-header.tsx
@components/error-state.tsx
@components/empty-state.tsx
@components/page-skeleton.tsx
@components/ui/card.tsx
@components/ui/tabs.tsx
@components/ui/button.tsx
@app/(app)/dashboard/page.tsx        ← reference for the new design direction
@app/(app)/layout.tsx
@tailwind.config.ts
@app/globals.css
```

Run `wc -l app/(app)/**/page.tsx | sort -rn | head -30` to see page sizes.

---

## DESIGN SYSTEM (enforce everywhere)

These tokens are already in tailwind.config.ts and globals.css. The problem is pages don't use them consistently.

```
Page backgrounds:     bg-slate-50 (already set as --background)
Cards/panels:         bg-white, border border-slate-200, rounded-lg — NO shadows on cards
Modals/dropdowns:     shadow-lg (ONLY place shadows are allowed)
Page padding:         p-4 md:p-6 pb-24 md:pb-6 (pb-24 for mobile bottom nav)
Max content width:    max-w-[1200px] mx-auto (on list/dashboard pages)
Section gaps:         space-y-6
Card internal:        p-5 (20px)
Page titles:          text-2xl font-semibold text-slate-900
Section headers:      text-base font-semibold text-slate-900
Body text:            text-sm text-slate-700
Muted text:           text-xs text-slate-500 or text-slate-400
Table headers:        text-xs font-medium text-slate-500 uppercase tracking-wider
Buttons primary:      bg-emerald-500 text-white hover:bg-emerald-600 h-9 px-4 text-sm font-medium rounded-md
Buttons secondary:    bg-white border border-slate-300 text-slate-700 hover:bg-slate-50
Buttons ghost:        bg-transparent text-slate-600 hover:bg-slate-100
Buttons destructive:  bg-red-500 text-white hover:bg-red-600
Status badges:        text-xs px-2 py-0.5 rounded-full font-medium
Font:                 system-ui (already configured — no Google Fonts import)
```

---

## PHASE 1: SHARED STATUS/PRIORITY COLOR MAPS (do this first)

Create `lib/ui-constants.ts` — a single source of truth for all status/priority colors used across the app:

```typescript
// Status colors used in jobs, calendar, kanban, etc.
export const JOB_STATUS_STYLES: Record<string, string> = {
  Scheduled:  "bg-blue-50 text-blue-700",
  "In Progress": "bg-amber-50 text-amber-700",
  Completed:  "bg-emerald-50 text-emerald-700",
  Invoiced:   "bg-purple-50 text-purple-700",
  Paid:       "bg-green-50 text-green-700",
  Cancelled:  "bg-red-50 text-red-700",
};

export const LEAD_STATUS_STYLES: Record<string, string> = {
  New:        "bg-blue-50 text-blue-600",
  Contacted:  "bg-amber-50 text-amber-600",
  Qualified:  "bg-purple-50 text-purple-600",
  Booked:     "bg-emerald-50 text-emerald-600",
  Lost:       "bg-red-50 text-red-600",
};

export const PRIORITY_STYLES: Record<string, string> = {
  low:    "bg-slate-100 text-slate-600",
  medium: "bg-amber-50 text-amber-700",
  high:   "bg-red-50 text-red-700",
  urgent: "bg-red-100 text-red-800",
};

export const INVOICE_STATUS_STYLES: Record<string, string> = {
  Draft:    "bg-slate-100 text-slate-600",
  Sent:     "bg-blue-50 text-blue-700",
  Overdue:  "bg-red-50 text-red-700",
  Paid:     "bg-emerald-50 text-emerald-700",
  Void:     "bg-slate-100 text-slate-500",
};

export const REVIEW_STATUS_STYLES: Record<string, string> = {
  pending:   "bg-amber-50 text-amber-700",
  sent:      "bg-blue-50 text-blue-700",
  completed: "bg-emerald-50 text-emerald-700",
  declined:  "bg-red-50 text-red-700",
};

// Chart colors (for recharts in analytics)
export const CHART_COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#f97316", "#ec4899",
];
```

Then find-and-replace all inline status color maps across every page to import from this file. Key files with duplicate color maps:
- `app/(app)/jobs/jobs-content.tsx` (kanban column colors)
- `app/(app)/calendar/page.tsx` (job status colors)
- `app/(app)/leads/page.tsx` (lead status badges)
- `app/(app)/reviews/page.tsx` (review status badges)
- `app/(app)/tasks/page.tsx` (priority badges)
- `app/(app)/invoices/page.tsx` (invoice status)
- `app/(app)/analytics/page.tsx` (chart COLORS array)
- `lib/utils.ts` (JOB_STATUS_COLORS, JOB_STATUS_LABELS — keep labels there, move colors to ui-constants)

**Verification:** `grep -rn "bg-blue-50 text-blue" app/(app)/ | wc -l` should decrease significantly after this phase. Run `npm run build` — must pass.

---

## PHASE 2: STANDARDIZE ALL PAGE LAYOUTS

Every list page must follow this exact structure:

```tsx
<div className="p-4 md:p-6 pb-24 md:pb-6 max-w-[1200px] mx-auto space-y-6">
  <PageHeader title="..." description="..." actions={<Button>...</Button>} />
  {/* Filter/search bar if applicable */}
  {/* Content: table, cards, or tabs */}
</div>
```

### Pages that need PageHeader adoption (currently use ad-hoc h1 headers):
- `app/(app)/customers/page.tsx`
- `app/(app)/reviews/page.tsx`
- `app/(app)/tasks/page.tsx`
- `app/(app)/analytics/page.tsx`
- `app/(app)/referrals/page.tsx`
- `app/(app)/reports/page.tsx`
- `app/(app)/scheduled-messages/page.tsx`
- `app/(app)/expenses/page.tsx`
- `app/(app)/payments/page.tsx`

For each, replace the ad-hoc header block with:
```tsx
import { PageHeader } from "@/components/shared/page-header";
// ...
<PageHeader title="Customers" actions={<Button>New Customer</Button>} />
```

### Hub pages (jobs, invoicing, marketing, settings) — standardize tab styling:
Currently each hub has slightly different tab styling. Create a consistent pattern:
```tsx
<div className="border-b border-slate-200">
  <div className="flex gap-6 px-1">
    {tabs.map(tab => (
      <button
        key={tab.key}
        className={cn(
          "pb-3 text-sm font-medium border-b-2 transition-colors -mb-px",
          activeTab === tab.key
            ? "border-emerald-500 text-emerald-600"
            : "border-transparent text-slate-500 hover:text-slate-700"
        )}
        onClick={() => setActiveTab(tab.key)}
      >
        {tab.label}
      </button>
    ))}
  </div>
</div>
```

Apply this exact pattern to:
- `app/(app)/jobs/page.tsx`
- `app/(app)/invoicing/page.tsx`
- `app/(app)/marketing/page.tsx`
- `app/(app)/settings/page.tsx`

### Add `max-w-[1200px] mx-auto` to these pages that are missing it:
Grep for pages that have `p-4 md:p-6` but no `max-w` and add it. On very wide monitors, content should not stretch to the edges.

**Verification:** Visually, every page should have the same header style, same padding, same max-width. Run `npm run build`.

---

## PHASE 3: LOADING / EMPTY / ERROR STATES

### Every page must have all three states. Audit and fix:

**Loading:** Use `animate-pulse` skeleton blocks that match the page layout. A table page should show skeleton rows. A card grid should show skeleton cards. Do NOT use spinners or "Loading..." text.

Pattern for table pages:
```tsx
if (isLoading) return (
  <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-[1200px] mx-auto space-y-6">
    <div className="h-10 w-48 bg-slate-100 rounded-lg animate-pulse" />
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />
      ))}
    </div>
  </div>
);
```

**Empty state:** Use the existing `EmptyState` component from `@/components/empty-state`. Every page/tab with data must have one.

**Error state:** Use the existing `ErrorState` component from `@/components/error-state`. Must include a retry button.

### Pages missing loading skeletons (add them):
- `app/(app)/conversations/page.tsx`
- `app/(app)/calendar/page.tsx`
- `app/(app)/analytics/page.tsx`
- `app/(app)/reviews/page.tsx`
- `app/(app)/leads/page.tsx`

### Pages missing empty states (add them):
- `app/(app)/conversations/page.tsx` (for "no conversations yet")
- `app/(app)/calendar/page.tsx` (for "no jobs this week")
- `app/(app)/analytics/page.tsx` (for "not enough data yet")

### Pages missing error states (add them):
- `app/(app)/conversations/page.tsx`
- `app/(app)/invoicing/page.tsx` (currently relies on child components)
- `app/(app)/marketing/page.tsx` (currently relies on child components)

**Verification:** For each page, simulate: loading (skeleton visible), no data (empty state visible), error (error state visible). Run `npm run build`.

---

## PHASE 4: TABLE STANDARDIZATION

Every table in the app must follow this pattern:

```tsx
<div className="overflow-x-auto">
  <table className="w-full">
    <thead>
      <tr className="border-b border-slate-200">
        <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-4">
          Column Name
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-100">
      <tr className="hover:bg-slate-50 transition-colors cursor-pointer">
        <td className="py-3 px-4 text-sm text-slate-900">...</td>
      </tr>
    </tbody>
  </table>
</div>
```

Rules:
- Header: `text-xs font-medium text-slate-500 uppercase tracking-wider`
- Row hover: `hover:bg-slate-50`
- Clickable rows: `cursor-pointer` and wrap in Link or onClick
- Cell padding: `py-3 px-4`
- Dividers: `divide-y divide-slate-100` on tbody (light, not harsh borders)
- No Card wrapping around tables — tables should be in their own `border rounded-lg bg-white overflow-hidden` container

### Key table pages to audit and standardize:
- `app/(app)/customers/page.tsx`
- `app/(app)/leads/page.tsx`
- `app/(app)/invoices/page.tsx`
- `app/(app)/expenses/page.tsx`
- `app/(app)/payments/page.tsx`
- `app/(app)/staff/page.tsx`
- `app/(app)/services/page.tsx`
- `app/(app)/templates/page.tsx`

For each, check that the header styling and row patterns match. Fix any that deviate.

**Verification:** All tables should look identical in style. Headers, spacing, hover states. Run `npm run build`.

---

## PHASE 5: GOD PAGE DECOMPOSITION

Three pages are over 1000 lines and need extraction into components:

### 5A: `app/(app)/customers/[id]/page.tsx` (1588 lines)
Extract into:
- `components/customers/customer-header.tsx` — avatar, name, contact info, action buttons
- `components/customers/customer-details.tsx` — contact details, address, notes
- `components/customers/customer-vehicles.tsx` — vehicle list + add vehicle
- `components/customers/customer-jobs.tsx` — job history table
- `components/customers/customer-invoices.tsx` — invoice history
- `components/customers/customer-communications.tsx` — communication timeline
- `components/customers/customer-activity.tsx` — activity log

The page.tsx should be under 200 lines — just layout, data fetching, and component composition.

### 5B: `app/(app)/jobs/[id]/page.tsx` (1113 lines)
Extract into:
- `components/jobs/job-header.tsx` — status badge, customer, total, action buttons
- `components/jobs/job-details.tsx` — services, vehicle, schedule, notes
- `components/jobs/job-checklist.tsx` — checklist items
- `components/jobs/job-photos.tsx` — before/after photos
- `components/jobs/job-invoice.tsx` — related invoice
- `components/jobs/job-communications.tsx` — communications for this job

### 5C: `app/(app)/communications/page.tsx` (1140 lines)
This page is inside the settings hub now. Extract into:
- `components/communications/comm-filters.tsx` — search, type filter, date range
- `components/communications/comm-table.tsx` — communication log table
- `components/communications/comm-detail-modal.tsx` — detail view modal

### Also decompose these 700+ line pages if time permits:
- `app/(app)/automations/page.tsx` (1022 lines)
- `app/(app)/analytics/page.tsx` (859 lines)
- `app/(app)/campaigns/page.tsx` (721 lines)
- `app/(app)/jobs/new/page.tsx` (712 lines)
- `app/(app)/leads/page.tsx` (704 lines)

**Rule:** After extraction, no page.tsx file should exceed 300 lines. Components can be up to 200 lines each. If a component exceeds 200 lines, split it further.

**Verification:** `wc -l app/(app)/**/page.tsx | awk '$1 > 300'` should return zero results. Run `npm run build`.

---

## PHASE 6: MICRO POLISH

### 6A: Badge component consistency
Create a shared `StatusBadge` component in `components/shared/status-badge.tsx`:
```tsx
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  colorMap: Record<string, string>;
  className?: string;
}

export function StatusBadge({ status, colorMap, className }: StatusBadgeProps) {
  return (
    <span className={cn(
      "text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap",
      colorMap[status] ?? "bg-slate-100 text-slate-600",
      className
    )}>
      {status}
    </span>
  );
}
```

Use this everywhere statuses are displayed instead of inline badge JSX.

### 6B: Consistent currency display
All currency values should use `formatCurrency()` from `lib/utils.ts`. Grep for `\$\{` and any manual dollar formatting and replace with `formatCurrency()`.

### 6C: Consistent date/time display
All dates should use `timeAgo()` for relative times and `formatDate()` for absolute. No raw `new Date().toLocaleDateString()` calls.

### 6D: Mobile responsiveness check
Every page's main content should have `pb-24 md:pb-6` to account for the bottom tab bar on mobile. Grep for pages that have `p-6` without `pb-24` and fix them.

### 6E: Transition consistency
All interactive elements should have `transition-colors` (already in globals.css for buttons/links). Cards that are clickable should have `hover:border-slate-300` transition. Ensure no jarring instant state changes.

### 6F: Focus states
All interactive elements should show the emerald ring on keyboard focus: `focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2`. This is already in globals.css via `outline-color: rgb(var(--ring))` but verify shadcn components inherit it.

---

## VERIFICATION CHECKLIST

After all phases:

1. `npm run lint` — zero errors
2. `npm run build` — zero errors
3. `wc -l app/(app)/**/page.tsx | awk '$1 > 300'` — zero results (all pages under 300 lines)
4. `grep -rn "Loading\.\.\." app/(app)/ | wc -l` — zero (no "Loading..." text)
5. `grep -rn "bg-blue-50 text-blue" app/(app)/ | wc -l` — minimal (only in shared constants)
6. Every page has: loading skeleton, empty state, error state with retry
7. Every table uses the standardized header/row pattern
8. All status badges use StatusBadge + imported color maps
9. Mobile: every page has pb-24, bottom nav doesn't overlap content
10. No layout shift on page load — skeletons match final layout dimensions

---

## CONSTRAINTS

- Do NOT change API endpoints or database schema
- Do NOT change authentication or middleware logic
- Do NOT install new npm packages
- Do NOT change the sidebar or hub page structure (already done)
- Do NOT change the dashboard layout (already redesigned)
- Preserve all existing functionality — this is cosmetic only
- Keep components in the same directory structure (components/ for shared, inline for page-specific)
- Use existing shadcn/ui components — do not create custom primitives
- Run `npm run build` after EVERY phase — do not proceed if build fails
- Do NOT commit. I will review the diff and commit myself.

---

## EXECUTION ORDER

Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

Each phase has a build gate. Do not skip phases.

After completing all phases, provide:
1. `git diff --stat` showing all changed files
2. Summary of what changed per phase
3. Any issues you couldn't resolve and why
