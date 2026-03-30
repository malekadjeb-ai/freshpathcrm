"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  DollarSign, Briefcase, TrendingUp, CreditCard, Calendar, AlertCircle,
  Plus, ArrowRight, Phone, MessageSquare, Mail, StickyNote, AlertTriangle,
  Receipt, TrendingDown, CheckCircle2, Clock, Target, Users, ClipboardList,
  Voicemail, PhoneMissed, ArrowDownLeft, ArrowUpRight, Star, Repeat,
  ArrowUp, ArrowDown, ListTodo, Crown, UserX,
} from "lucide-react";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  cn, formatCurrency, formatTime, formatDate, timeAgo, fetchJson,
  JOB_STATUS_LABELS, JOB_STATUS_COLORS, type JobStatus,
  LOCATION_LABELS,
} from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import { AIActionButton } from "@/components/ai/ai-action-button";
import { format } from "date-fns";
import { useSession } from "next-auth/react";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];
const LOCATION_COLORS: Record<string, string> = {
  Richmond: "#10b981",
  Katy: "#3b82f6",
  SugarLand: "#f59e0b",
  Other: "#6b7280",
};

interface DashboardData {
  kpis: {
    todayRevenue: number;
    monthRevenue: number;
    totalJobs: number;
    avgTicket: number;
    weekJobs: number;
    outstandingTotal: number;
    pendingEstimates: number;
    pendingEstimateTotal: number;
    monthExpenses: number;
    todayExpenses: number;
    monthProfit: number;
  };
  charts: {
    dailyRevenue: { date: string; revenue: number }[];
    jobsByService: { name: string; value: number }[];
    locationRevenue: { location: string; revenue: number }[];
    topCustomers: { name: string; value: number }[];
  };
  activity: {
    recentJobs: {
      id: string;
      status: string;
      total: number;
      updatedAt: string;
      customer: { name: string };
    }[];
    upcomingJobs: {
      id: string;
      scheduledAt: string;
      total: number;
      customer: { name: string };
      services: { serviceItem: { name: string } | null; customName?: string | null }[];
      vehicle: { make: string; model: string; year: number } | null;
    }[];
    recentPayments: {
      id: string;
      amount: number;
      method: string;
      createdAt: string;
      invoice: { job: { customer: { name: string } } };
    }[];
    recentCommunications: {
      id: string;
      type: string;
      direction: string;
      status: string;
      summary: string | null;
      createdAt: string;
      customer: { name: string };
    }[];
    needsFollowUp: {
      id: string;
      name: string;
      phone: string | null;
      lastVisit: string | null;
    }[];
  };
  reviews: {
    pending: number;
    completed: number;
    recent: {
      id: string;
      status: string;
      rating: number | null;
      createdAt: string;
      customer: { name: string };
      job: { id: string } | null;
    }[];
  };
  recurring: {
    activeCount: number;
    upcoming: {
      id: string;
      frequency: string;
      nextRunDate: string | null;
      customer: { name: string };
    }[];
  };
  revenueGoal?: {
    goal: number;
    current: number;
    percentage: number;
  };
  pipeline?: {
    count: number;
    total: number;
  };
  funnel?: {
    leads: number;
    quoted: number;
    won: number;
    leadToQuoteRate: number;
    quoteToWinRate: number;
  };
  upcoming48h?: {
    id: string;
    scheduledAt: string;
    total: number;
    customer: { name: string };
    vehicle: { make: string; model: string; year: number } | null;
    services: string[];
    address: string | null;
  }[];
  revenueComparison?: {
    thisMonth: number;
    lastMonth: number;
    changePercent: number;
  };
  milestones?: {
    highValueCount: number;
    dormantCount: number;
  };
  tasksDue?: {
    dueToday: number;
    overdue: number;
    tasks: {
      id: string;
      title: string;
      dueDate: string | null;
      priority: string;
    }[];
  };
}

const COMM_ICONS: Record<string, React.ReactNode> = {
  call: <Phone className="w-3.5 h-3.5" />,
  sms: <MessageSquare className="w-3.5 h-3.5" />,
  email: <Mail className="w-3.5 h-3.5" />,
  note: <StickyNote className="w-3.5 h-3.5" />,
  voicemail: <Voicemail className="w-3.5 h-3.5" />,
};
const COMM_COLORS: Record<string, string> = {
  call: "bg-blue-50 text-blue-600",
  sms: "bg-green-50 text-green-600",
  email: "bg-purple-50 text-purple-600",
  note: "bg-amber-50 text-amber-600",
  voicemail: "bg-amber-50 text-amber-700",
};

function KPICard({
  title,
  value,
  icon: Icon,
  color,
  sub,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">{title}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
            {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-lg ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface FollowUpItem {
  id: string;
  type: string;
  summary: string;
  followUpDate: string;
  followUpDone: boolean;
  customer: { id: string; name: string; phone: string | null };
}

function RevenueGoalRing({ goal, current, percentage }: { goal: number; current: number; percentage: number }) {
  const ringColor = percentage >= 80 ? "#10b981" : percentage >= 50 ? "#f59e0b" : "#ef4444";
  const emptyColor = "#e2e8f0";
  const filled = Math.min(100, percentage);
  const pieData = [
    { name: "filled", value: filled },
    { name: "empty", value: 100 - filled },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-500" />
          Revenue Goal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          <div className="relative w-40 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill={ringColor} />
                  <Cell fill={emptyColor} />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs text-slate-500 font-medium">
                {formatCurrency(current)}
              </span>
              <span className="text-[10px] text-slate-400">
                / {formatCurrency(goal)}
              </span>
            </div>
          </div>
          <p className="text-sm font-semibold mt-1" style={{ color: ringColor }}>
            {percentage}% of goal
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface WeatherData {
  forecast: {
    date: string;
    tempMax: number;
    tempMin: number;
    precipitationProbability: number;
    weatherIcon: string;
    weatherLabel: string;
    riskLevel: "clear" | "caution" | "rain";
  }[];
}

const RISK_COLORS = {
  clear: "text-emerald-600 bg-emerald-50",
  caution: "text-amber-600 bg-amber-50",
  rain: "text-red-600 bg-red-50",
};

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: () => fetchJson<DashboardData>("/api/dashboard"),
    refetchInterval: 5 * 60_000,
  });

  const { data: recentLeads = [] } = useQuery<{
    id: string;
    name: string;
    status: string;
    source: string;
    phone: string | null;
    createdAt: string;
  }[]>({
    queryKey: ["recent-leads"],
    queryFn: () => fetchJson<{ id: string; name: string; status: string; source: string; phone: string | null; createdAt: string }[]>("/api/leads?limit=5"),
  });

  const { data: followUps = [] } = useQuery<FollowUpItem[]>({
    queryKey: ["follow-ups"],
    queryFn: () => fetchJson<FollowUpItem[]>("/api/activities/follow-ups"),
  });

  const markDoneMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/activities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followUpDone: true }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
      toast.success("Follow-up marked done");
    },
  });

  const snoozeMutation = useMutation({
    mutationFn: async ({ id, days }: { id: string; days: number }) => {
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + days);
      const res = await fetch(`/api/activities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followUpDate: newDate.toISOString() }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
      toast.success("Follow-up snoozed");
    },
  });

  const markTaskDoneMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Task marked complete");
    },
  });

  const { data: weatherData } = useQuery<WeatherData>({
    queryKey: ["weather"],
    queryFn: () => fetchJson<WeatherData>("/api/weather"),
    staleTime: 30 * 60_000,
    retry: 1,
  });

  const { data: session } = useSession();
  const today = format(new Date(), "EEEE, MMMM d");
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = session?.user?.name?.split(" ")[0] || "";

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) return <ErrorState message="Failed to load dashboard data." onRetry={refetch} />;
  if (!data) return null;

  const { kpis, charts, activity, reviews, recurring } = data;

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting}{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <AIActionButton type="daily_briefing" label="AI Briefing" />
          <AIActionButton type="revenue_opportunities" label="AI: Revenue" />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Link href="/leads/new">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Target className="w-3.5 h-3.5 text-emerald-500" />
            New Lead
          </Button>
        </Link>
        <Link href="/customers/new">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Users className="w-3.5 h-3.5 text-blue-500" />
            New Customer
          </Button>
        </Link>
        <Link href="/estimates/new">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ClipboardList className="w-3.5 h-3.5 text-purple-500" />
            New Estimate
          </Button>
        </Link>
        <Link href="/jobs/new">
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5" size="sm">
            <Plus className="w-3.5 h-3.5" />
            New Job
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Today's Revenue"
          value={formatCurrency(kpis.todayRevenue)}
          icon={DollarSign}
          color="bg-emerald-500"
          sub={kpis.todayExpenses > 0 ? `${formatCurrency(kpis.todayExpenses)} expenses` : undefined}
        />
        <KPICard
          title="Month Revenue"
          value={formatCurrency(kpis.monthRevenue)}
          icon={TrendingUp}
          color="bg-blue-500"
        />
        <KPICard
          title="Month Expenses"
          value={formatCurrency(kpis.monthExpenses)}
          icon={Receipt}
          color="bg-orange-500"
        />
        <KPICard
          title="Month Profit"
          value={formatCurrency(kpis.monthProfit)}
          icon={kpis.monthProfit >= 0 ? TrendingUp : TrendingDown}
          color={kpis.monthProfit >= 0 ? "bg-emerald-600" : "bg-red-500"}
          sub={kpis.monthRevenue > 0 ? `${((kpis.monthProfit / kpis.monthRevenue) * 100).toFixed(0)}% margin` : undefined}
        />
        <KPICard
          title="Pending Estimates"
          value={formatCurrency(kpis.pendingEstimateTotal)}
          icon={ClipboardList}
          color="bg-violet-500"
          sub={`${kpis.pendingEstimates} awaiting response`}
        />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Jobs Completed"
          value={kpis.totalJobs.toString()}
          icon={Briefcase}
          color="bg-slate-700"
          sub="All time"
        />
        <KPICard
          title="Avg Ticket"
          value={formatCurrency(kpis.avgTicket)}
          icon={CreditCard}
          color="bg-purple-500"
        />
        <KPICard
          title="This Week"
          value={kpis.weekJobs.toString()}
          icon={Calendar}
          color="bg-amber-500"
          sub="Jobs booked"
        />
        <KPICard
          title="Outstanding"
          value={formatCurrency(kpis.outstandingTotal)}
          icon={AlertCircle}
          color={kpis.outstandingTotal > 0 ? "bg-red-500" : "bg-slate-400"}
          sub="Unpaid invoices"
        />
      </div>

      {/* Weather Widget */}
      {weatherData?.forecast && weatherData.forecast.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-lg">{weatherData.forecast[0]?.weatherIcon}</span>
              5-Day Forecast
              {weatherData.forecast[0]?.riskLevel === "rain" && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                  Bad for detailing today
                </span>
              )}
              {weatherData.forecast[0]?.riskLevel === "caution" && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                  Watch conditions
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
              {weatherData.forecast.slice(0, 5).map((day, i) => (
                <div
                  key={day.date}
                  className={cn(
                    "text-center rounded-lg p-2 border",
                    i === 0 ? "border-emerald-200 bg-emerald-50/50" : "border-slate-100"
                  )}
                >
                  <div className="text-xs text-slate-500 font-medium mb-1">
                    {i === 0 ? "Today" : format(new Date(day.date + "T12:00:00"), "EEE")}
                  </div>
                  <div className="text-xl mb-1">{day.weatherIcon}</div>
                  <div className="text-sm font-bold text-slate-900">{day.tempMax}°</div>
                  <div className="text-xs text-slate-400">{day.tempMin}°</div>
                  <div className={cn(
                    "text-[10px] font-medium mt-1 px-1 py-0.5 rounded",
                    RISK_COLORS[day.riskLevel]
                  )}>
                    {day.precipitationProbability}% rain
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Follow-Ups Due */}
      {followUps.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Follow-Ups Due
                <span className="ml-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                  {followUps.length}
                </span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {followUps.slice(0, 8).map((fu) => {
                const isOverdue = new Date(fu.followUpDate) < new Date(new Date().toDateString());
                return (
                  <div
                    key={fu.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5",
                      isOverdue ? "bg-red-50 border border-red-100" : "bg-white border border-slate-100"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/customers/${fu.customer.id}`}
                          className="text-sm font-medium text-slate-800 hover:text-emerald-600 truncate"
                        >
                          {fu.customer.name}
                        </Link>
                        {isOverdue && (
                          <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">
                            Overdue
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{fu.summary}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Due: {formatDate(fu.followUpDate)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-emerald-600"
                        onClick={() => markDoneMutation.mutate(fu.id)}
                        title="Mark done"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </Button>
                      {fu.customer.phone && (
                        <a href={`tel:${fu.customer.phone}`}>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" title="Call">
                            <Phone className="w-3.5 h-3.5" />
                          </Button>
                        </a>
                      )}
                      <div className="flex gap-0.5">
                        {[1, 3, 7].map((d) => (
                          <Button
                            key={d}
                            variant="ghost"
                            size="sm"
                            className="h-7 px-1.5 text-[10px] text-slate-500"
                            onClick={() => snoozeMutation.mutate({ id: fu.id, days: d })}
                            title={`Snooze ${d} day${d > 1 ? "s" : ""}`}
                          >
                            +{d}d
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Leads */}
      {recentLeads.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-500" />
                Recent Leads
              </CardTitle>
              <Link href="/leads" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentLeads.map((lead) => (
                <Link key={lead.id} href={`/leads/${lead.id}`}>
                  <div className="flex items-center justify-between py-2 hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap",
                        lead.status === "New" ? "bg-blue-50 text-blue-600" :
                        lead.status === "Contacted" ? "bg-amber-50 text-amber-600" :
                        lead.status === "Qualified" ? "bg-purple-50 text-purple-600" :
                        lead.status === "Booked" ? "bg-emerald-50 text-emerald-600" :
                        lead.status === "Lost" ? "bg-red-50 text-red-600" :
                        "bg-slate-100 text-slate-600"
                      )}>
                        {lead.status}
                      </span>
                      <span className="text-sm font-medium text-slate-900">{lead.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{lead.source}</span>
                      <span className="text-xs text-slate-400">{timeAgo(lead.createdAt)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue line chart */}
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue — Last 30 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={charts.dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickFormatter={(v) => format(new Date(v), "MMM d")}
                  interval={4}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  width={45}
                />
                <Tooltip
                  formatter={(v) => [formatCurrency(Number(v)), "Revenue"]}
                  labelFormatter={(l) => format(new Date(l), "MMM d, yyyy")}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Jobs by service donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Jobs by Service</CardTitle>
          </CardHeader>
          <CardContent>
            {charts.jobsByService.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={charts.jobsByService}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {charts.jobsByService.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [Number(v), "Jobs"]} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="grid grid-cols-1 gap-1 mt-2">
              {charts.jobsByService.slice(0, 4).map((item, i) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-slate-600 truncate max-w-32">{item.name}</span>
                  </div>
                  <span className="font-medium text-slate-700">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Revenue by location */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue by Location</CardTitle>
          </CardHeader>
          <CardContent>
            {charts.locationRevenue.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={charts.locationRevenue} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="location"
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    tickFormatter={(v) => LOCATION_LABELS[v as keyof typeof LOCATION_LABELS] ?? v}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    width={45}
                  />
                  <Tooltip
                    formatter={(v) => [formatCurrency(Number(v)), "Revenue"]}
                    labelFormatter={(l) => LOCATION_LABELS[l as keyof typeof LOCATION_LABELS] ?? l}
                  />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {charts.locationRevenue.map((entry) => (
                      <Cell key={entry.location} fill={LOCATION_COLORS[entry.location] ?? "#6b7280"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top customers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Customers by LTV</CardTitle>
          </CardHeader>
          <CardContent>
            {charts.topCustomers.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={charts.topCustomers}
                  layout="vertical"
                  barSize={20}
                  margin={{ left: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    width={80}
                  />
                  <Tooltip formatter={(v) => [formatCurrency(Number(v)), "Lifetime Value"]} />
                  <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent jobs */}
        <Card className="xl:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <Link href="/jobs" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {activity.recentJobs.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No recent jobs</p>
            ) : (
              <div className="space-y-2">
                {activity.recentJobs.slice(0, 6).map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}`}>
                    <div className="flex items-center justify-between py-2 hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors">
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                            JOB_STATUS_COLORS[job.status as JobStatus] ?? "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {JOB_STATUS_LABELS[job.status as JobStatus] ?? job.status}
                        </span>
                        <span className="text-sm font-medium text-slate-900">{job.customer.name}</span>
                      </div>
                      <span className="font-semibold text-slate-900">{formatCurrency(job.total)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming today */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Upcoming Today</CardTitle>
              <Link href="/calendar" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                Calendar →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {activity.upcomingJobs.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No jobs today</p>
            ) : (
              <div className="space-y-3">
                {activity.upcomingJobs.slice(0, 5).map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}`}>
                    <div className="bg-slate-50 hover:bg-slate-100 rounded-lg p-3 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-slate-900">{job.customer.name}</span>
                        <span className="text-xs font-semibold text-emerald-600">{formatCurrency(job.total)}</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {job.services.map((s) => s.serviceItem?.name || s.customName || "Custom").join(", ")}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {formatTime(job.scheduledAt)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Calls & Communications */}
      {activity.recentCommunications.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-500" />
                Recent Calls & Messages
              </CardTitle>
              <Link href="/communications" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activity.recentCommunications.filter((c) => c?.customer).map((comm) => {
                const isMissed = comm.direction === "missed" || comm.status === "missed";
                return (
                  <div
                    key={comm.id}
                    className={cn(
                      "flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-slate-50 transition-colors",
                      isMissed && "bg-red-50/50"
                    )}
                  >
                    <div className={`p-1.5 rounded-md ${isMissed ? "bg-red-50 text-red-500" : (COMM_COLORS[comm.type] ?? "bg-slate-100 text-slate-600")}`}>
                      {isMissed ? <PhoneMissed className="w-3.5 h-3.5" /> : COMM_ICONS[comm.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-slate-900">{comm.customer.name}</span>
                        {comm.direction === "inbound" && !isMissed && (
                          <ArrowDownLeft className="w-3 h-3 text-blue-400" />
                        )}
                        {comm.direction === "outbound" && (
                          <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                        )}
                        {isMissed && (
                          <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">
                            Missed
                          </span>
                        )}
                      </div>
                      {comm.summary && (
                        <p className="text-xs text-slate-500 truncate">{comm.summary}</p>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap">{timeAgo(comm.createdAt)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews & Recurring Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Review Requests */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" />
                Review Requests
              </CardTitle>
              <Link href="/reviews" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <div className="flex-1 bg-amber-50 border border-amber-100 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-amber-700">{reviews.pending}</div>
                <div className="text-xs text-amber-600">Pending</div>
              </div>
              <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-emerald-700">{reviews.completed}</div>
                <div className="text-xs text-emerald-600">Completed</div>
              </div>
              <div className="flex-1 bg-blue-50 border border-blue-100 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-700">
                  {reviews.completed > 0 ? Math.round((reviews.completed / (reviews.pending + reviews.completed)) * 100) : 0}%
                </div>
                <div className="text-xs text-blue-600">Response Rate</div>
              </div>
            </div>
            {reviews.recent.length > 0 ? (
              <div className="space-y-2">
                {reviews.recent.map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-2 px-2 -mx-2 rounded-lg hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        r.status === "pending" ? "bg-amber-400" : r.status === "completed" ? "bg-emerald-400" : "bg-slate-300"
                      )} />
                      <span className="text-sm font-medium text-slate-900">{r.customer.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.rating && (
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: r.rating }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      )}
                      <span className="text-xs text-slate-400 capitalize">{r.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">No review requests yet</p>
            )}
          </CardContent>
        </Card>

        {/* Recurring Jobs */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Repeat className="w-4 h-4 text-blue-500" />
                Recurring Jobs
              </CardTitle>
              <Link href="/recurring-jobs" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <div className="flex-1 bg-blue-50 border border-blue-100 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-700">{recurring.activeCount}</div>
                <div className="text-xs text-blue-600">Active Plans</div>
              </div>
              <div className="flex-1 bg-purple-50 border border-purple-100 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-purple-700">{recurring.upcoming.length}</div>
                <div className="text-xs text-purple-600">Due This Week</div>
              </div>
            </div>
            {recurring.upcoming.length > 0 ? (
              <div className="space-y-2">
                {recurring.upcoming.map((rj) => (
                  <div key={rj.id} className="flex items-center justify-between py-2 px-2 -mx-2 rounded-lg hover:bg-slate-50">
                    <div>
                      <span className="text-sm font-medium text-slate-900">{rj.customer.name}</span>
                      <span className="text-xs text-slate-400 ml-2 capitalize">{rj.frequency}</span>
                    </div>
                    {rj.nextRunDate && (
                      <span className="text-xs text-slate-500">{formatDate(rj.nextRunDate)}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">No recurring jobs scheduled this week</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Needs Follow-Up */}
      {activity.needsFollowUp && activity.needsFollowUp.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <CardTitle className="text-base">
                Needs Follow-Up ({activity.needsFollowUp.length} customers, 60+ days)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {activity.needsFollowUp.map((c) => (
                <Link
                  key={c.id}
                  href={`/customers/${c.id}`}
                  className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 hover:bg-amber-100 transition-colors"
                >
                  <div>
                    <span className="font-medium text-sm text-slate-900">{c.name}</span>
                    {c.phone && (
                      <p className="text-xs text-slate-500 mt-0.5">{c.phone}</p>
                    )}
                  </div>
                  {c.lastVisit && (
                    <span className="text-xs text-amber-700 font-medium">
                      {Math.floor((Date.now() - new Date(c.lastVisit).getTime()) / (1000 * 60 * 60 * 24))}d ago
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* === NEW WIDGETS === */}

      {/* Revenue Goal, Pipeline, Revenue Comparison row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Goal Ring */}
        {data.revenueGoal && (
          <RevenueGoalRing
            goal={data.revenueGoal.goal}
            current={data.revenueGoal.current}
            percentage={data.revenueGoal.percentage}
          />
        )}

        {/* Pipeline Value Card */}
        {data.pipeline && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-violet-500" />
                Pipeline Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-6">
                <p className="text-3xl font-bold text-slate-900">
                  {formatCurrency(data.pipeline.total)}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  {data.pipeline.count} estimate{data.pipeline.count !== 1 ? "s" : ""} pending
                </p>
                <Link href="/estimates" className="mt-4">
                  <Button variant="outline" size="sm" className="gap-1.5 text-violet-600 border-violet-200 hover:bg-violet-50">
                    View Estimates <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Revenue Comparison */}
        {data.revenueComparison && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                Month vs Last Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-center">
                    <p className="text-xs text-slate-400 mb-1">This Month</p>
                    <p className="text-xl font-bold text-slate-900">
                      {formatCurrency(data.revenueComparison.thisMonth)}
                    </p>
                  </div>
                  <span className="text-slate-300 text-lg">vs</span>
                  <div className="text-center">
                    <p className="text-xs text-slate-400 mb-1">Last Month</p>
                    <p className="text-xl font-bold text-slate-500">
                      {formatCurrency(data.revenueComparison.lastMonth)}
                    </p>
                  </div>
                </div>
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold",
                  data.revenueComparison.changePercent >= 0
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                )}>
                  {data.revenueComparison.changePercent >= 0 ? (
                    <ArrowUp className="w-4 h-4" />
                  ) : (
                    <ArrowDown className="w-4 h-4" />
                  )}
                  {Math.abs(data.revenueComparison.changePercent)}%
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Conversion Funnel & Tasks Due row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel Mini */}
        {data.funnel && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-500" />
                Conversion Funnel
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const funnel = data.funnel!;
                const maxVal = Math.max(funnel.leads, funnel.quoted, funnel.won, 1);
                const stages = [
                  { label: "Leads", count: funnel.leads, color: "bg-blue-500" },
                  { label: "Quoted", count: funnel.quoted, color: "bg-amber-500" },
                  { label: "Won", count: funnel.won, color: "bg-emerald-500" },
                ];
                return (
                  <div className="space-y-4">
                    {stages.map((stage, i) => (
                      <div key={stage.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-700">{stage.label}</span>
                          <span className="text-sm font-bold text-slate-900">{stage.count}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3">
                          <div
                            className={cn("h-3 rounded-full transition-all", stage.color)}
                            style={{ width: `${Math.max(4, (stage.count / maxVal) * 100)}%` }}
                          />
                        </div>
                        {i < stages.length - 1 && (
                          <div className="flex justify-end mt-1">
                            <span className="text-[10px] text-slate-400 font-medium">
                              {i === 0
                                ? `${funnel.leadToQuoteRate}% quote rate`
                                : `${funnel.quoteToWinRate}% win rate`
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Tasks Due Widget */}
        {data.tasksDue && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-blue-500" />
                  Tasks Due
                </CardTitle>
                <div className="flex items-center gap-2">
                  {(data.tasksDue.overdue ?? 0) > 0 && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                      {data.tasksDue.overdue} overdue
                    </span>
                  )}
                  {(data.tasksDue.dueToday ?? 0) > 0 && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                      {data.tasksDue.dueToday} today
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(data.tasksDue.tasks?.length ?? 0) === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                  <CheckCircle2 className="w-8 h-8 mb-2" />
                  <p className="text-sm">All caught up!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.tasksDue.tasks.map((task) => {
                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date(new Date().toDateString());
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 border",
                          isOverdue ? "bg-red-50 border-red-100" : "bg-white border-slate-100"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-800 truncate">
                              {task.title}
                            </span>
                            <span className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded font-medium",
                              task.priority === "high" ? "bg-red-100 text-red-600" :
                              task.priority === "medium" ? "bg-amber-100 text-amber-600" :
                              "bg-slate-100 text-slate-500"
                            )}>
                              {task.priority}
                            </span>
                            {isOverdue && (
                              <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">
                                Overdue
                              </span>
                            )}
                          </div>
                          {task.dueDate && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Due: {formatDate(task.dueDate)}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 shrink-0"
                          onClick={() => markTaskDoneMutation.mutate(task.id)}
                          disabled={markTaskDoneMutation.isPending}
                          title="Mark complete"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Done
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Upcoming 48h & Customer Milestones row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Jobs 48h */}
        {data.upcoming48h && data.upcoming48h.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  Upcoming Jobs (Next 48 Hours)
                </CardTitle>
                <Link href="/calendar" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
                  Calendar <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.upcoming48h.map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}`}>
                    <div className="bg-slate-50 hover:bg-slate-100 rounded-lg p-3 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-slate-900">{job.customer.name}</span>
                        <span className="text-xs font-semibold text-emerald-600">{formatCurrency(job.total)}</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {job.services.join(", ")}
                      </p>
                      {job.vehicle && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {job.vehicle.year} {job.vehicle.make} {job.vehicle.model}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-slate-400">
                          {format(new Date(job.scheduledAt), "EEE, MMM d 'at' h:mm a")}
                        </p>
                        {job.address && (
                          <p className="text-[10px] text-slate-400 truncate max-w-40">
                            {job.address}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Customer Milestones */}
        {data.milestones && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" />
                Customer Milestones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-lg p-4">
                  <div className="p-2 bg-emerald-100 rounded-lg shrink-0">
                    <Crown className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-700">
                      {data.milestones.highValueCount}
                    </p>
                    <p className="text-xs text-emerald-600 mt-0.5">
                      customers with $1,000+ lifetime value
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-lg p-4">
                  <div className="p-2 bg-amber-100 rounded-lg shrink-0">
                    <UserX className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-700">
                      {data.milestones.dormantCount}
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      customers haven&apos;t booked in 90+ days
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
