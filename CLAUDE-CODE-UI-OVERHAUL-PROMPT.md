# Fresh Path CRM — UI Overhaul + Google Voice Integration

## CONTEXT

This is a Next.js 14 (App Router) CRM for Fresh Path Mobile Detailing. The codebase uses TypeScript, Tailwind CSS, Shadcn UI, Prisma (SQLite), React Query, Zustand, Recharts, and Lucide icons.

**The problem:** The sidebar has 37 navigation links across 6 sections. The owner says "there's too many tabs and features but I don't know how to use it." The UI feels like enterprise bloatware instead of a clean, opinionated tool. It needs to feel like Linear meets Notion — fast, clean, discoverable, zero overwhelm.

**Second problem:** Communication (calls + two-way texting) needs to run through Google Voice — NOT Twilio. A `gmail-voice-sync.ts` service already exists that parses Google Voice notifications from Gmail. This needs to become the primary communication backbone with a proper inbox UI.

Read the following files BEFORE writing any code to understand existing patterns:

```
@components/shared/Sidebar.tsx
@app/(app)/layout.tsx
@lib/services/gmail-voice-sync.ts
@app/(app)/conversations/page.tsx
@app/(app)/dashboard/page.tsx
@components/ui/
@tailwind.config.ts
@package.json
```

Also run `tree app/(app) -L 1` and `tree components -L 2` to map the full component structure.

---

## PHASE 1: SIDEBAR NUCLEAR SIMPLIFICATION

### The Architecture

Kill the 37-item sidebar. Replace with a **10-item primary nav** that covers 100% of daily workflow. Everything else goes into Settings or contextual sub-navigation within pages.

**New sidebar structure (exactly these 10 items, in this order):**

```
[Fresh Path Logo — small, clean]

1. Dashboard        (LayoutDashboard icon)  — /dashboard
2. Jobs             (Briefcase icon)        — /jobs
3. Schedule         (Calendar icon)         — /calendar
4. Customers        (Users icon)            — /customers
5. Messages         (MessageSquare icon)    — /conversations
6. Invoicing        (Receipt icon)          — /invoices
7. Marketing        (Megaphone icon)        — /marketing  [NEW unified page]
8. Reviews          (Star icon)             — /reviews
9. Analytics        (BarChart2 icon)        — /analytics
10. Settings        (Settings icon)         — /settings   [absorbs everything else]
```

### What Gets Absorbed

**Into "Jobs" page (as tabs or filters within the page):**
- Leads → Jobs page with a "Leads" tab/filter (leads are just pre-job pipeline stage)
- Quotes → Jobs page "Quotes" tab
- Estimates → Jobs page "Estimates" tab
- Recurring Jobs → Jobs page "Recurring" tab or filter
- Field View → Jobs page toggle (list view vs. field/map view)

**Into "Customers" page (as tabs within the page):**
- Customers list (default)
- Referrals tab

**Into "Invoicing" page (as tabs):**
- Invoices (default)
- Payments tab
- Expenses tab
- Subscriptions/Plans tab

**Into "Marketing" page (NEW unified page with tabs):**
- Campaigns tab (default)
- Automations tab
- Promo Codes tab
- Content tab
- Gallery tab

**Into "Settings" page (as sections/sub-pages):**
- Services & Pricing
- Staff Management
- Templates
- Checklists
- Fleet
- Webhooks
- Intelligence
- Routes configuration
- Scheduled Messages

**Removed from nav entirely (accessible via Command Palette only):**
- Reports (merge into Analytics)
- All Comms (merge into Messages)
- Pricing (move to Settings > Services & Pricing)

### Sidebar Design Spec

```
Width: 220px expanded, 56px collapsed (icon-only mode)
Background: slate-900 (#0f172a)
Active item: emerald-500/10 bg with emerald-400 left border (2px) and emerald-400 text
Hover: slate-800 bg
Text: slate-400 default, white on active
Icons: 18px, stroke-width 1.5
Font: system default, 13px medium weight
Item height: 36px
Item padding: 0 12px
Spacing between items: 2px
Logo area: 48px height, border-b border-slate-800
Bottom section: User avatar (28px circle) + name + collapse toggle
Collapse behavior: Click chevron to toggle. On mobile, sidebar is hidden — use bottom tab bar instead.
Transition: width 200ms ease-out, opacity 150ms for labels
```

**Collapsed state rules:**
- Only show icons, centered in 56px width
- Tooltip on hover showing the label
- Logo shrinks to icon-only mark
- User section shows only avatar

**Mobile (under 768px):**
- NO sidebar at all
- Bottom tab bar with 5 items: Dashboard, Jobs, Messages, Customers, More
- "More" opens a slide-up sheet with remaining nav items
- Tab bar height: 56px, safe-area-inset-bottom padding
- Active tab: emerald-500 icon + label. Inactive: slate-400 icon only (no label)

### Files to Modify

- `components/shared/Sidebar.tsx` — Complete rewrite
- `components/shared/MobileNav.tsx` — Rewrite as bottom tab bar
- `app/(app)/layout.tsx` — Update layout structure
- Create `components/shared/BottomTabBar.tsx` if MobileNav doesn't exist or is too different
- Create `components/shared/MobileMoreSheet.tsx` — slide-up nav for "More" tab

### Implementation Rules

- Keep the existing NavItem interface structure but simplify the data
- Preserve role-based visibility (roles array on items)
- Preserve the existing auth check pattern (useSession)
- The Command Palette (`Cmd+K`) must still work for accessing ALL pages including hidden ones
- Add keyboard shortcut hints next to nav items (e.g., "G then D" for Dashboard) — show only in expanded mode
- Sidebar collapse state should persist in localStorage

---

## PHASE 2: UNIFIED PAGE CONSOLIDATION

### 2A: Jobs Hub Page

**File:** `app/(app)/jobs/page.tsx` — major rewrite

Turn the Jobs page into a unified pipeline hub with tabs:

```
[Tab Bar: All Jobs | Leads | Quotes | Estimates | Recurring]
[Filter bar: Status dropdown, Date range, Service type, Assigned to]
[View toggle: List | Kanban | Calendar | Field Map]
```

**Behavior:**
- "All Jobs" tab shows every job regardless of stage
- "Leads" tab filters to leads only (status: NEW, CONTACTED, QUALIFIED)
- "Quotes" tab shows items with quotes attached
- "Estimates" tab shows pending estimates
- "Recurring" tab shows recurring job schedules
- The Kanban view should work across all tabs (existing dnd-kit implementation)
- Calendar view links to the full /calendar page
- Field Map view shows today's jobs on a map (existing /field page logic)

**Do NOT create new API endpoints.** Reuse existing `/api/jobs`, `/api/leads`, `/api/quotes`, `/api/estimates` endpoints. Use React Query with different filter params per tab.

**Files to modify:**
- `app/(app)/jobs/page.tsx` — Add tab system and view toggles
- Keep existing Kanban components, just import them into the tabbed view
- Move lead-specific logic from `app/(app)/leads/page.tsx` into the Leads tab
- The old /leads, /quotes, /estimates, /field routes should redirect to /jobs?tab=leads, /jobs?tab=quotes, etc.

### 2B: Invoicing Hub Page

**File:** `app/(app)/invoices/page.tsx` — add tabs

```
[Tab Bar: Invoices | Payments | Expenses | Plans]
```

- Each tab loads its own data with existing API endpoints
- Move content from `/payments/page.tsx`, `/expenses/page.tsx`, `/subscriptions/page.tsx` into tab components
- Old routes redirect to /invoices?tab=payments, etc.

### 2C: Marketing Hub Page

**File:** Create `app/(app)/marketing/page.tsx` — NEW unified page

```
[Tab Bar: Campaigns | Automations | Promos | Content | Gallery]
```

- Pull content from existing pages: `/campaigns`, `/automations`, `/promo-codes`, `/content`, `/gallery`
- Each tab is a lazy-loaded component to keep initial bundle small
- Old routes redirect to /marketing?tab=campaigns, etc.

### 2D: Settings Mega Page

**File:** `app/(app)/settings/page.tsx` — expand with sub-navigation

```
Left sub-nav (within settings page, not sidebar):
- General (business info, branding)
- Services & Pricing
- Staff & Roles
- Templates
- Checklists
- Fleet & Equipment
- Routes
- Scheduled Messages
- Integrations (Google Voice, Stripe, webhooks)
- Intelligence
```

- Each section is a separate component loaded on click
- Move content from `/services`, `/staff`, `/templates`, `/checklists`, `/fleet`, `/routes`, `/scheduled-messages`, `/webhooks`, `/intelligence`, `/pricing` pages
- Old routes redirect to /settings?section=services, etc.
- Only ADMIN and OWNER roles can access Settings

### Route Redirects

Create `middleware.ts` redirects (or use Next.js `redirects` in `next.config.js`):

```javascript
const legacyRedirects = {
  '/leads': '/jobs?tab=leads',
  '/quotes': '/jobs?tab=quotes',
  '/estimates': '/jobs?tab=estimates',
  '/recurring-jobs': '/jobs?tab=recurring',
  '/field': '/jobs?view=field',
  '/payments': '/invoices?tab=payments',
  '/expenses': '/invoices?tab=expenses',
  '/subscriptions': '/invoices?tab=plans',
  '/campaigns': '/marketing?tab=campaigns',
  '/automations': '/marketing?tab=automations',
  '/promo-codes': '/marketing?tab=promos',
  '/content': '/marketing?tab=content',
  '/gallery': '/marketing?tab=gallery',
  '/services': '/settings?section=services',
  '/staff': '/settings?section=staff',
  '/templates': '/settings?section=templates',
  '/checklists': '/settings?section=checklists',
  '/fleet': '/settings?section=fleet',
  '/routes': '/settings?section=routes',
  '/scheduled-messages': '/settings?section=scheduled-messages',
  '/webhooks': '/settings?section=integrations',
  '/intelligence': '/settings?section=intelligence',
  '/pricing': '/settings?section=pricing',
  '/referrals': '/customers?tab=referrals',
  '/reports': '/analytics',
  '/communications': '/conversations',
};
```

---

## PHASE 3: GOOGLE VOICE COMMUNICATION HUB

### 3A: Enhance Gmail Voice Sync Service

**File:** `lib/services/gmail-voice-sync.ts` — enhance existing service

The sync service already parses Google Voice emails from Gmail. Enhance it:

1. **Add a sync endpoint:** `app/api/google-voice/sync/route.ts`
   - POST: Triggers a manual sync of recent Google Voice activity from Gmail
   - GET: Returns last sync timestamp and stats
   - Uses the existing `syncGoogleVoiceFromGmail()` function
   - Stores synced messages in the existing Communication model in Prisma

2. **Add a conversations endpoint:** `app/api/google-voice/conversations/route.ts`
   - GET: Returns all conversations grouped by phone number
   - Query params: search, unread, dateRange
   - Joins with Customer model to show customer name when phone matches

3. **Add a send endpoint:** `app/api/google-voice/send/route.ts`
   - POST: Opens Google Voice in a new tab for manual sending (returns a deep link)
   - Body: { phoneNumber, message? }
   - Returns: `{ url: "https://voice.google.com/u/0/messages?phoneNumber=+1XXXXXXXXXX" }`
   - This is MANUAL — we don't auto-send. We give the user a pre-filled link.

4. **Add call logging endpoint:** `app/api/google-voice/log-call/route.ts`
   - POST: Manually log a call that happened on Google Voice
   - Body: { phoneNumber, direction, duration, notes, customerId? }
   - Creates a Communication record in the database

### 3B: Messages Page (Google Voice Inbox)

**File:** `app/(app)/conversations/page.tsx` — major rewrite as Google Voice hub

This becomes the primary communication page. Design it like iMessage/WhatsApp web:

```
Layout:
├── Left panel (320px): Conversation list
│   ├── Search bar (top)
│   ├── Filter: All | Unread | Calls | Texts
│   └── Conversation cards (sorted by most recent)
│       ├── Customer name (or phone number if unknown)
│       ├── Last message preview (truncated)
│       ├── Timestamp
│       ├── Unread badge
│       └── Call/text icon indicator
│
└── Right panel (flex-1): Active conversation
    ├── Header: Customer name, phone, link to customer profile
    ├── Message thread (scrollable, newest at bottom)
    │   ├── Inbound messages: left-aligned, slate-100 bg
    │   ├── Outbound messages: right-aligned, emerald-500 bg, white text
    │   ├── Call logs: centered, muted, with duration and icon
    │   └── Voicemails: playable card with duration
    │
    ├── Quick actions bar:
    │   ├── "Text on Google Voice" button → opens voice.google.com with phone pre-filled
    │   ├── "Call on Google Voice" button → opens voice.google.com call
    │   ├── "Log a Call" button → opens quick-log modal
    │   └── "Sync Latest" button → triggers Gmail sync
    │
    └── Compose area (bottom):
        ├── Text input (for drafting — does NOT auto-send)
        ├── "Open in Google Voice to Send" button
        │   (copies message to clipboard + opens GV in new tab)
        └── Helper text: "Messages are sent manually via Google Voice"
```

**Design details:**
- Left panel bg: white. Right panel bg: slate-50.
- Conversation card hover: slate-50 bg
- Active conversation: emerald-50 bg with emerald-500 left border
- Timestamps: relative (e.g., "2h ago", "Yesterday", "Mar 15")
- Unread badge: emerald-500 circle with white count
- Empty state (no conversation selected): centered illustration + "Select a conversation or start a new one"
- Mobile: full-width conversation list. Tap to open conversation (push view, with back arrow).

**Key behavior:**
- On page load, trigger a background sync (`/api/google-voice/sync` POST)
- Show a subtle "Syncing..." indicator in the header during sync
- After sync completes, React Query invalidates and refreshes the conversation list
- "Text on Google Voice" button: `window.open(\`https://voice.google.com/u/0/messages\`, '_blank')`
- "Call on Google Voice" button: `window.open(\`https://voice.google.com/u/0/calls\`, '_blank')`
- "Log a Call" button: Opens a modal with fields: duration (minutes), direction (inbound/outbound), notes, customer auto-suggest
- "Sync Latest" button: Manually triggers sync with loading spinner

### 3C: Quick Log Call Modal

**File:** Create `components/conversations/QuickLogCallModal.tsx`

Fields:
- Customer: auto-suggest dropdown (search by name or phone)
- Phone number: auto-fills from customer selection, or manual entry
- Direction: Inbound / Outbound toggle
- Duration: minutes input
- Notes: textarea
- Save button

On save: POST to `/api/google-voice/log-call`, then invalidate conversation queries.

### 3D: Customer Profile Integration

**File:** Modify customer detail page (wherever the individual customer view is)

Add a "Communication History" tab or section to the customer profile:
- Shows all Google Voice texts, calls, and voicemails with this customer
- "Text" and "Call" quick action buttons that open Google Voice
- Timeline view mixing communications with jobs and invoices

### 3E: Remove Twilio as Primary

- Do NOT delete Twilio code (it may be useful later for automation)
- In the Settings > Integrations page, show Google Voice as the PRIMARY communication method
- Show Twilio as an optional "Automated Messaging" integration (disabled by default)
- Update any UI that shows "Send SMS" buttons to instead show "Text via Google Voice"
- The auto-responder and automated sequences from the previous prompt should still use Twilio if configured, but the manual communication flow is 100% Google Voice

---

## PHASE 4: GLOBAL UI POLISH

### 4A: Design System Tightening

Apply these design tokens consistently across EVERY page:

```
Colors:
- bg-primary: slate-900 (#0f172a) — sidebar, dark elements
- bg-page: slate-50 (#f8fafc) — page backgrounds
- bg-card: white (#ffffff) — cards and panels
- bg-hover: slate-100 (#f1f5f9) — hover states
- accent: emerald-500 (#10b981) — primary actions, active states
- accent-hover: emerald-600 (#059669)
- accent-light: emerald-50 (#ecfdf5) — active backgrounds
- text-primary: slate-900 (#0f172a)
- text-secondary: slate-500 (#64748b)
- text-muted: slate-400 (#94a3b8)
- border: slate-200 (#e2e8f0)
- success: emerald-500
- warning: amber-500
- error: red-500
- info: blue-500

Typography:
- Font: system-ui, -apple-system (DO NOT add custom fonts — keep it fast)
- Page titles: 24px, font-semibold, slate-900
- Section headers: 16px, font-semibold, slate-900
- Body: 14px, font-normal, slate-700
- Small/meta: 12px, font-normal, slate-500
- Monospace (for IDs, codes): font-mono, 13px

Spacing:
- Page padding: 24px (16px on mobile)
- Card padding: 20px (16px on mobile)
- Section gap: 24px
- Element gap within sections: 16px
- Compact lists: 8px gap

Borders & Corners:
- Cards: rounded-lg (8px), border border-slate-200
- Buttons: rounded-md (6px)
- Inputs: rounded-md (6px), border border-slate-300
- Badges: rounded-full
- NO drop shadows on cards. Use borders only. Clean and flat.
- Exception: modals and dropdowns get shadow-lg

Buttons:
- Primary: bg-emerald-500 text-white hover:bg-emerald-600, h-9, px-4, text-sm font-medium
- Secondary: bg-white border border-slate-300 text-slate-700 hover:bg-slate-50, same sizing
- Ghost: bg-transparent text-slate-600 hover:bg-slate-100
- Destructive: bg-red-500 text-white hover:bg-red-600
- Icon button: w-9 h-9 rounded-md, centered icon
- All buttons: transition-colors duration-150
```

### 4B: Dashboard Overhaul

**File:** `app/(app)/dashboard/page.tsx` — redesign

The dashboard should show ONLY what matters for today:

```
Layout (single column, max-width 1200px, centered):

Row 1: Today's Stats (4 cards in a row)
├── Jobs Today: [count] with mini calendar icon
├── Revenue Today: $[amount] with trend arrow
├── Open Leads: [count] with conversion rate
└── Unread Messages: [count] with badge

Row 2: Today's Schedule (full width card)
├── Timeline view of today's jobs
├── Each job: time, customer name, service, address, status pill
├── Click job → opens job detail
└── Empty state: "No jobs scheduled today — [Book a job] button"

Row 3: Two columns
├── Left: Action Items (things that need attention)
│   ├── Unpaid invoices overdue
│   ├── Leads not responded to in 24h+
│   ├── Jobs missing follow-up
│   ├── Review requests to send
│   └── Each item is clickable → goes to relevant page
│
└── Right: Recent Activity Feed
    ├── New lead from Google
    ├── Payment received
    ├── Review posted
    ├── Job completed
    └── Chronological, last 24 hours
```

- No giant charts on the dashboard. Charts live in Analytics.
- Dashboard loads fast — skeleton loading for each section independently
- Data refreshes every 60 seconds via React Query refetchInterval

### 4C: Loading & Empty States

Create consistent patterns for:

1. **Loading skeleton:** Create `components/shared/Skeleton.tsx` variations:
   - `TableSkeleton` — for table views
   - `CardSkeleton` — for card grids
   - `ListSkeleton` — for list items
   - `StatSkeleton` — for stat cards

2. **Empty states:** Create `components/shared/EmptyState.tsx`:
   - Props: icon, title, description, actionLabel, actionHref
   - Design: Centered, muted icon (48px), title in slate-700, description in slate-500, emerald CTA button
   - Every page/tab must have an empty state. No blank white pages.

3. **Error states:** Create `components/shared/ErrorState.tsx`:
   - Props: title, description, retryAction
   - Shows a red-tinged card with retry button
   - Used inside React Query error boundaries

### 4D: Page Header Component

Create `components/shared/PageHeader.tsx`:

```
Props: title, description?, actions? (React nodes for buttons), tabs? (tab config), breadcrumbs?

Layout:
[Breadcrumbs if provided]
[Title]                                    [Action Buttons]
[Description if provided]
[Tab bar if provided — full width, border-b]
```

Use this component on EVERY page for consistent headers. Replace all ad-hoc page headers.

### 4E: Table Component Standardization

Audit all table implementations. Ensure every table uses:
- Consistent column header style: text-xs font-medium text-slate-500 uppercase tracking-wider
- Row hover: hover:bg-slate-50
- Clickable rows with cursor-pointer where appropriate
- Proper loading skeletons
- Pagination: "Showing 1-20 of 156" with Previous/Next buttons
- Empty state when no data
- Sticky header on scroll (if table is long)

---

## PHASE 5: COMMAND PALETTE ENHANCEMENT

**File:** Modify existing `CommandPalette` component

Since we hid many pages from the sidebar, the Command Palette (`Cmd+K`) becomes the power-user navigation tool:

1. Add ALL pages to the command palette, including hidden ones
2. Group commands: Navigation, Actions, Settings
3. Actions group includes:
   - "New Job" — opens job creation
   - "New Customer" — opens customer creation
   - "New Invoice" — opens invoice creation
   - "Log a Call" — opens quick log call modal
   - "Sync Google Voice" — triggers sync
   - "Search Customers" — jumps to customer search
4. Recent pages section at the top (last 5 visited)
5. Keyboard shortcut display next to each item

---

## VERIFICATION

After all phases are complete:

1. Run `npx next lint` — fix all lint errors
2. Run `npx tsc --noEmit` — fix all TypeScript errors
3. Run `npm run build` — must build successfully with zero errors
4. Start the dev server: `npm run dev`
5. Manually verify in the browser:
   - Sidebar shows exactly 10 items
   - Clicking each nav item loads the correct page
   - Jobs page has working tabs (All Jobs, Leads, Quotes, Estimates, Recurring)
   - Invoicing page has working tabs
   - Marketing page has working tabs
   - Settings page has working sub-navigation
   - Messages page shows conversation list and thread view
   - "Text on Google Voice" and "Call on Google Voice" buttons work
   - Dashboard shows today's stats and schedule
   - Command Palette (Cmd+K) shows all pages including hidden ones
   - Mobile view (resize to 375px): bottom tab bar works, no sidebar
   - All legacy URLs redirect correctly (e.g., /leads → /jobs?tab=leads)
   - No blank pages, no console errors, no layout shifts

6. Run `git diff --stat` to confirm scope — only expected files were changed
7. Provide a summary of: files created, files modified, files that can be deleted

---

## CONSTRAINTS

- Do NOT delete any existing page files. They may be referenced elsewhere. Instead, add redirects and move the component logic into the new tab structure.
- Do NOT change the database schema or Prisma models.
- Do NOT change API endpoints — only add new ones for Google Voice.
- Do NOT modify authentication or session logic.
- Do NOT install new npm packages unless absolutely necessary. Use existing dependencies.
- Do NOT add Twilio, SendGrid, or any paid communication service. Google Voice is the channel.
- Preserve all existing functionality. This is a UI reorganization, not a feature removal.
- Keep bundle size in mind — use dynamic imports (`next/dynamic`) for tab content that isn't visible on initial load.
- All new components must be TypeScript with proper types — no `any`.
- Use existing Shadcn UI components (Dialog, Sheet, Tabs, etc.) — do not build custom primitives.
