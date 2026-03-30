import { getDbAsync } from "@/src/db";
import {
  customers, jobs, invoices, leads, tasks, serviceItems,
  reviews, campaigns, expenses, estimates,
  vehicles, communications, tags, customerTags,
} from "@/src/db/schema";
import { eq, and, gte, lte, lt, isNull, not, inArray, count, asc, desc } from "drizzle-orm";
import { subDays, format, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";

export interface BusinessSnapshot {
  totalCustomers: number;
  activeCustomers: number;
  atRiskCustomers: number;
  churnedCustomers: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  jobsThisMonth: number;
  avgTicket: number;
  outstandingInvoices: number;
  outstandingAmount: number;
  openLeads: number;
  overdueTasks: number;
  todayJobs: number;
}

export interface AIContext {
  businessSnapshot: BusinessSnapshot;
  relevantCustomers?: Record<string, unknown>[];
  relevantJobs?: Record<string, unknown>[];
  relevantLeads?: Record<string, unknown>[];
  financialSummary?: Record<string, unknown>;
  todaySchedule?: Record<string, unknown>[];
  overdueItems?: {
    tasks: Record<string, unknown>[];
    invoices: Record<string, unknown>[];
    estimates: Record<string, unknown>[];
  };
  serviceCatalog?: Record<string, unknown>[];
  recentActivity?: Record<string, unknown>[];
}

async function getBusinessSnapshot(): Promise<BusinessSnapshot> {
  const db = await getDbAsync();
  const now = new Date();
  const sixtyDaysAgo = subDays(now, 60);
  const ninetyDaysAgo = subDays(now, 90);
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subDays(thisMonthStart, 1));
  const lastMonthEnd = endOfMonth(lastMonthStart);
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const completedStatuses = ["Completed", "Invoiced", "Paid"];

  const [
    totalCustomersCount,
    allCustomersWithJobs,
    jobsThisMonthRows,
    jobsLastMonthRows,
    unpaidInvoices,
    openLeadsCount,
    overdueTasksCount,
    todayJobsCount,
  ] = await Promise.all([
    db.select({ count: count() }).from(customers).where(isNull(customers.deletedAt)).then((r) => r[0]?.count ?? 0),
    db.select({ id: customers.id, lastJobAt: customers.lastJobAt })
      .from(customers)
      .where(isNull(customers.deletedAt)),
    db.select({ total: jobs.total })
      .from(jobs)
      .where(
        and(
          inArray(jobs.status, completedStatuses),
          gte(jobs.scheduledAt, thisMonthStart.toISOString()),
          lte(jobs.scheduledAt, thisMonthEnd.toISOString())
        )
      ),
    db.select({ total: jobs.total })
      .from(jobs)
      .where(
        and(
          inArray(jobs.status, completedStatuses),
          gte(jobs.scheduledAt, lastMonthStart.toISOString()),
          lte(jobs.scheduledAt, lastMonthEnd.toISOString())
        )
      ),
    db.select({ total: invoices.total })
      .from(invoices)
      .where(inArray(invoices.status, ["Sent", "Overdue"])),
    db.select({ count: count() })
      .from(leads)
      .where(inArray(leads.status, ["New", "Contacted", "Quoted"]))
      .then((r) => r[0]?.count ?? 0),
    db.select({ count: count() })
      .from(tasks)
      .where(and(eq(tasks.completed, false), lt(tasks.dueDate, now.toISOString())))
      .then((r) => r[0]?.count ?? 0),
    db.select({ count: count() })
      .from(jobs)
      .where(
        and(
          gte(jobs.scheduledAt, todayStart.toISOString()),
          lte(jobs.scheduledAt, todayEnd.toISOString()),
          not(eq(jobs.status, "Cancelled"))
        )
      )
      .then((r) => r[0]?.count ?? 0),
  ]);

  let activeCount = 0;
  let atRiskCount = 0;
  let churnedCount = 0;

  allCustomersWithJobs.forEach((c) => {
    const lastJob = c.lastJobAt;
    if (!lastJob) return;
    const lastJobDate = new Date(lastJob);
    if (lastJobDate >= sixtyDaysAgo) activeCount++;
    else if (lastJobDate >= ninetyDaysAgo) atRiskCount++;
    else churnedCount++;
  });

  const revenueThisMonth = jobsThisMonthRows.reduce((s, j) => s + j.total, 0);
  const revenueLastMonth = jobsLastMonthRows.reduce((s, j) => s + j.total, 0);
  const avgTicket = jobsThisMonthRows.length > 0 ? revenueThisMonth / jobsThisMonthRows.length : 0;

  return {
    totalCustomers: totalCustomersCount,
    activeCustomers: activeCount,
    atRiskCustomers: atRiskCount,
    churnedCustomers: churnedCount,
    revenueThisMonth,
    revenueLastMonth,
    jobsThisMonth: jobsThisMonthRows.length,
    avgTicket,
    outstandingInvoices: unpaidInvoices.length,
    outstandingAmount: unpaidInvoices.reduce((s, i) => s + i.total, 0),
    openLeads: openLeadsCount,
    overdueTasks: overdueTasksCount,
    todayJobs: todayJobsCount,
  };
}

function detectQueryIntent(query: string): string[] {
  const q = query.toLowerCase();
  const intents: string[] = [];

  if (/customer|client/i.test(q)) intents.push("customers");
  if (/revenue|money|income|sales|earn/i.test(q)) intents.push("financial");
  if (/today|schedule|calendar|upcoming/i.test(q)) intents.push("schedule");
  if (/lead|prospect/i.test(q)) intents.push("leads");
  if (/pric|cost|rate|quote/i.test(q)) intents.push("pricing");
  if (/market|campaign|promo|review/i.test(q)) intents.push("marketing");
  if (/task|todo|overdue|focus|should i/i.test(q)) intents.push("actionable");
  if (/churn|risk|losing|dormant/i.test(q)) intents.push("churn");
  if (/invoice|payment|owe|unpaid|outstanding/i.test(q)) intents.push("invoices");
  if (/estimate|quote|proposal/i.test(q)) intents.push("estimates");
  if (/forecast|project|predict/i.test(q)) intents.push("forecast");
  if (/upsell|add-on|addon|suggest/i.test(q)) intents.push("upsell");

  // Default: general briefing
  if (intents.length === 0) intents.push("actionable", "schedule", "financial");

  return intents;
}

async function fetchContextForIntents(intents: string[]): Promise<Partial<AIContext>> {
  const db = await getDbAsync();
  const ctx: Partial<AIContext> = {};
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const fetches: Promise<void>[] = [];

  if (intents.includes("customers") || intents.includes("churn")) {
    fetches.push(
      db.select()
        .from(customers)
        .where(isNull(customers.deletedAt))
        .orderBy(desc(customers.updatedAt))
        .limit(20)
        .then((c) => { ctx.relevantCustomers = c as unknown as Record<string, unknown>[]; })
    );
  }

  if (intents.includes("schedule")) {
    const futureEnd = endOfDay(subDays(todayEnd, -3));
    fetches.push(
      db.select()
        .from(jobs)
        .where(
          and(
            gte(jobs.scheduledAt, todayStart.toISOString()),
            lte(jobs.scheduledAt, futureEnd.toISOString()),
            not(eq(jobs.status, "Cancelled"))
          )
        )
        .orderBy(asc(jobs.scheduledAt))
        .limit(20)
        .then((j) => { ctx.todaySchedule = j as unknown as Record<string, unknown>[]; })
    );
  }

  if (intents.includes("financial") || intents.includes("forecast")) {
    fetches.push(
      (async () => {
        const thirtyDaysAgo = subDays(now, 30);
        const [recentJobs, recentExpenses] = await Promise.all([
          db.select({ total: jobs.total, scheduledAt: jobs.scheduledAt })
            .from(jobs)
            .where(
              and(
                inArray(jobs.status, ["Completed", "Invoiced", "Paid"]),
                gte(jobs.scheduledAt, thirtyDaysAgo.toISOString())
              )
            ),
          db.select({ amount: expenses.amount, category: expenses.category })
            .from(expenses)
            .where(gte(expenses.date, thirtyDaysAgo.toISOString())),
        ]);
        const totalRevenue = recentJobs.reduce((s, j) => s + j.total, 0);
        const totalExpenses = recentExpenses.reduce((s, e) => s + e.amount, 0);
        ctx.financialSummary = {
          last30DaysRevenue: totalRevenue,
          last30DaysExpenses: totalExpenses,
          last30DaysProfit: totalRevenue - totalExpenses,
          profitMargin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue * 100).toFixed(1) : "0",
          jobCount: recentJobs.length,
          expenseBreakdown: recentExpenses.reduce((acc: Record<string, number>, e) => {
            acc[e.category] = (acc[e.category] ?? 0) + e.amount;
            return acc;
          }, {}),
        };
      })()
    );
  }

  if (intents.includes("leads")) {
    fetches.push(
      db.select()
        .from(leads)
        .where(inArray(leads.status, ["New", "Contacted", "Quoted", "Follow-Up"]))
        .orderBy(desc(leads.createdAt))
        .limit(15)
        .then((l) => { ctx.relevantLeads = l as unknown as Record<string, unknown>[]; })
    );
  }

  if (intents.includes("pricing") || intents.includes("upsell")) {
    fetches.push(
      db.select({
        id: serviceItems.id,
        name: serviceItems.name,
        basePrice: serviceItems.basePrice,
        category: serviceItems.category,
        description: serviceItems.description,
      })
        .from(serviceItems)
        .where(eq(serviceItems.isActive, true))
        .orderBy(asc(serviceItems.category))
        .then((s) => { ctx.serviceCatalog = s as unknown as Record<string, unknown>[]; })
    );
  }

  if (intents.includes("actionable")) {
    fetches.push(
      (async () => {
        const [pendingTasks, unpaidInvoices, pendingEstimates] = await Promise.all([
          db.select().from(tasks).where(eq(tasks.completed, false)).orderBy(asc(tasks.dueDate)).limit(10),
          db.select().from(invoices).where(inArray(invoices.status, ["Sent", "Overdue"])).orderBy(asc(invoices.dueDate)).limit(10),
          db.select().from(estimates).where(inArray(estimates.status, ["Draft", "Sent"])).orderBy(desc(estimates.createdAt)).limit(10),
        ]);
        ctx.overdueItems = {
          tasks: pendingTasks as unknown as Record<string, unknown>[],
          invoices: unpaidInvoices as unknown as Record<string, unknown>[],
          estimates: pendingEstimates as unknown as Record<string, unknown>[],
        };
      })()
    );
  }

  if (intents.includes("marketing")) {
    fetches.push(
      (async () => {
        const [recentReviews, recentCampaigns] = await Promise.all([
          db.select({
            rating: reviews.rating,
            content: reviews.content,
            platform: reviews.platform,
            createdAt: reviews.createdAt,
          }).from(reviews).orderBy(desc(reviews.createdAt)).limit(10),
          db.select({
            name: campaigns.name,
            status: campaigns.status,
            sentCount: campaigns.sentCount,
            openedCount: campaigns.openedCount,
            convertedCount: campaigns.convertedCount,
          }).from(campaigns).orderBy(desc(campaigns.createdAt)).limit(5),
        ]);
        ctx.recentActivity = [
          ...recentReviews.map((r) => ({ type: "review", ...r })),
          ...recentCampaigns.map((c) => ({ type: "campaign", ...c })),
        ] as unknown as Record<string, unknown>[];
      })()
    );
  }

  if (intents.includes("invoices")) {
    fetches.push(
      db.select()
        .from(invoices)
        .where(inArray(invoices.status, ["Draft", "Sent", "Overdue"]))
        .orderBy(desc(invoices.createdAt))
        .limit(15)
        .then((inv) => {
          if (!ctx.overdueItems) ctx.overdueItems = { tasks: [], invoices: [], estimates: [] };
          ctx.overdueItems.invoices = inv as unknown as Record<string, unknown>[];
        })
    );
  }

  if (intents.includes("estimates")) {
    fetches.push(
      db.select()
        .from(estimates)
        .where(inArray(estimates.status, ["Draft", "Sent"]))
        .orderBy(desc(estimates.createdAt))
        .limit(15)
        .then((est) => {
          if (!ctx.overdueItems) ctx.overdueItems = { tasks: [], invoices: [], estimates: [] };
          ctx.overdueItems.estimates = est as unknown as Record<string, unknown>[];
        })
    );
  }

  await Promise.all(fetches);
  return ctx;
}

export async function buildAIContext(query: string): Promise<AIContext> {
  const intents = detectQueryIntent(query);
  const [snapshot, intentData] = await Promise.all([
    getBusinessSnapshot(),
    fetchContextForIntents(intents),
  ]);

  return {
    businessSnapshot: snapshot,
    ...intentData,
  };
}

export function buildSystemPrompt(ctx: AIContext): string {
  const s = ctx.businessSnapshot;
  const today = format(new Date(), "EEEE, MMMM d, yyyy");

  let prompt = `You are the AI assistant for Fresh Path Mobile Detailing, a premium mobile car detailing business in Richmond/Katy/Sugar Land, TX.

TODAY: ${today}

BUSINESS SNAPSHOT:
- Total customers: ${s.totalCustomers}
- Active customers (job in last 60 days): ${s.activeCustomers}
- At-risk customers (60-90 days no service): ${s.atRiskCustomers}
- Churned customers (90+ days): ${s.churnedCustomers}
- Revenue this month: $${s.revenueThisMonth.toFixed(2)}
- Revenue last month: $${s.revenueLastMonth.toFixed(2)}
- Jobs completed this month: ${s.jobsThisMonth}
- Average ticket: $${s.avgTicket.toFixed(2)}
- Outstanding invoices: ${s.outstandingInvoices} ($${s.outstandingAmount.toFixed(2)})
- Open leads: ${s.openLeads}
- Overdue tasks: ${s.overdueTasks}
- Jobs scheduled today: ${s.todayJobs}

INSTRUCTIONS:
- Be direct and actionable. No fluff.
- Be revenue-focused — always think about how to grow the business.
- Be premium-brand aware — never suggest discounting below value.
- Use specific numbers, customer names, and concrete recommendations.
- When suggesting actions, be specific: "Text John Smith about rebooking" not "reach out to customers."
- Format responses with markdown for readability.
- If you suggest an action the user can take in the CRM, mention it clearly.
`;

  if (ctx.todaySchedule && ctx.todaySchedule.length > 0) {
    prompt += `\nTODAY'S SCHEDULE:\n${JSON.stringify(ctx.todaySchedule, null, 2)}\n`;
  }

  if (ctx.relevantCustomers && ctx.relevantCustomers.length > 0) {
    prompt += `\nCUSTOMER DATA:\n${JSON.stringify(ctx.relevantCustomers, null, 2)}\n`;
  }

  if (ctx.relevantLeads && ctx.relevantLeads.length > 0) {
    prompt += `\nOPEN LEADS:\n${JSON.stringify(ctx.relevantLeads, null, 2)}\n`;
  }

  if (ctx.financialSummary) {
    prompt += `\nFINANCIAL SUMMARY (Last 30 Days):\n${JSON.stringify(ctx.financialSummary, null, 2)}\n`;
  }

  if (ctx.overdueItems) {
    const { tasks: t, invoices: i, estimates: e } = ctx.overdueItems;
    if (t.length > 0) prompt += `\nPENDING TASKS:\n${JSON.stringify(t, null, 2)}\n`;
    if (i.length > 0) prompt += `\nOUTSTANDING INVOICES:\n${JSON.stringify(i, null, 2)}\n`;
    if (e.length > 0) prompt += `\nPENDING ESTIMATES:\n${JSON.stringify(e, null, 2)}\n`;
  }

  if (ctx.serviceCatalog && ctx.serviceCatalog.length > 0) {
    prompt += `\nSERVICE CATALOG:\n${JSON.stringify(ctx.serviceCatalog, null, 2)}\n`;
  }

  if (ctx.recentActivity && ctx.recentActivity.length > 0) {
    prompt += `\nRECENT ACTIVITY:\n${JSON.stringify(ctx.recentActivity, null, 2)}\n`;
  }

  return prompt;
}

export async function buildCustomerContext(customerId: string): Promise<string> {
  const db = await getDbAsync();

  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
  if (!customer) return "Customer not found.";

  // Fetch related data
  const { jobServices: _jobServices } = await import("@/src/db/schema");
  const customerJobs = await db
    .select()
    .from(jobs)
    .where(eq(jobs.customerId, customerId))
    .orderBy(desc(jobs.scheduledAt))
    .limit(10);

  const customerVehicles = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.customerId, customerId));

  const _customerInvoices = await db
    .select()
    .from(invoices)
    .where(eq(invoices.customerId, customerId))
    .orderBy(desc(invoices.createdAt))
    .limit(5);

  const customerComms = await db
    .select()
    .from(communications)
    .where(eq(communications.customerId, customerId))
    .orderBy(desc(communications.createdAt))
    .limit(10);

  const customerTagRows = await db
    .select({ name: tags.name })
    .from(customerTags)
    .innerJoin(tags, eq(customerTags.tagId, tags.id))
    .where(eq(customerTags.customerId, customerId));

  const totalSpent = customerJobs
    .filter((j) => ["Completed", "Invoiced", "Paid"].includes(j.status))
    .reduce((s, j) => s + j.total, 0);

  return `CUSTOMER PROFILE:
Name: ${customer.name}
Phone: ${customer.phone || "N/A"}
Email: ${customer.email || "N/A"}
City: ${customer.city || "N/A"}
Lifecycle: ${customer.lifecycleStage}
Source: ${customer.source}
Tags: ${customerTagRows.map((t) => t.name).join(", ") || "None"}
Total Spent (LTV): $${totalSpent.toFixed(2)}
Job Count: ${customerJobs.length}
Vehicles: ${customerVehicles.map((v) => `${v.year} ${v.make} ${v.model} (${v.color || ""})`).join(", ") || "None"}

RECENT JOBS:
${customerJobs.map((j) => `- ${j.scheduledAt ? format(new Date(j.scheduledAt), "MMM d, yyyy") : "Unscheduled"}: $${j.total} (${j.status})`).join("\n")}

RECENT COMMUNICATIONS:
${customerComms.map((c) => `- ${format(new Date(c.createdAt), "MMM d")}: [${c.channel || c.type}] ${c.direction === "outbound" ? "→" : "←"} ${c.body?.substring(0, 100) || c.summary || ""}`).join("\n") || "None"}
`;
}
