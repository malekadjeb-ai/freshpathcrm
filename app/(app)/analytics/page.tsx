"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate, fetchJson } from "@/lib/utils";
import {
  AlertTriangle, Receipt, TrendingDown, Navigation, Target, ClipboardList,
  Megaphone, Calendar, Building2,
} from "lucide-react";
import { ErrorState } from "@/components/error-state";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#f97316", "#ec4899"];

interface AnalyticsData {
  revenue: {
    byWeek: { week: string; revenue: number }[];
    byService: { name: string; revenue: number }[];
    byLocation: { location: string; revenue: number }[];
    total: number;
    commercial: number;
    residential: number;
  };
  expenses: {
    total: number;
    profit: number;
    profitMargin: number;
    byCategory: { category: string; amount: number }[];
    profitByWeek: { week: string; revenue: number; expenses: number; profit: number }[];
  };
  performance: {
    avgTicket: number;
    totalJobs: number;
    addOnAttachRate: number;
    addOnRevenue: number;
  };
  customers: {
    newVsReturning: { name: string; value: number }[];
    ltvDistribution: { range: string; count: number }[];
    churnedCount: number;
    churnedCustomers: {
      id: string;
      name: string;
      lastService: string | null;
      totalSpent: number;
    }[];
  };
  route: {
    totalMileage: number;
    totalTravelTime: number;
    avgMileagePerJob: number;
    mileageCost: number;
    jobsTracked: number;
  };
  leads: {
    total: number;
    converted: number;
    conversionRate: number;
    byStatus: { status: string; count: number }[];
    bySource: { source: string; count: number }[];
  };
  estimates: {
    total: number;
    converted: number;
    conversionRate: number;
    totalValue: number;
    byStatus: { status: string; count: number }[];
  };
  scheduling: {
    byDayOfWeek: { day: string; jobs: number; revenue: number }[];
    byHour: { hour: number; jobs: number; revenue: number }[];
  };
  campaigns: {
    total: number;
    sent: number;
    totalSent: number;
    totalOpened: number;
    totalClicked: number;
    totalConverted: number;
  };
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("30d");

  const { data, isLoading, isError, refetch } = useQuery<AnalyticsData>({
    queryKey: ["analytics", period],
    queryFn: () => fetchJson(`/api/analytics?period=${period}`),
  });

  if (isError) return <ErrorState message="Failed to load analytics." onRetry={refetch} />;

  if (isLoading || !data) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
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

  const { revenue, expenses, performance, customers, route, leads, estimates, scheduling, campaigns } = data;

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-slate-500 text-sm mt-0.5">Business performance overview</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(String(v ?? "30d"))}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Performance KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Total Revenue</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(revenue.total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Total Expenses</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(expenses.total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Net Profit</p>
            <p className={`text-2xl font-bold mt-1 ${expenses.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrency(expenses.profit)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{expenses.profitMargin.toFixed(1)}% margin</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Avg Ticket Value</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(performance.avgTicket)}</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Jobs Completed</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{performance.totalJobs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Add-On Attach Rate</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{performance.addOnAttachRate.toFixed(0)}%</p>
            <p className="text-xs text-slate-400 mt-0.5">{formatCurrency(performance.addOnRevenue)} add-on rev</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Lead Conversion</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{leads.conversionRate}%</p>
            <p className="text-xs text-slate-400 mt-0.5">{leads.converted} of {leads.total} leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Estimate Win Rate</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{estimates.conversionRate}%</p>
            <p className="text-xs text-slate-400 mt-0.5">{estimates.converted} of {estimates.total} estimates</p>
          </CardContent>
        </Card>
      </div>

      {/* Route & Mileage KPIs */}
      {route.jobsTracked > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-slate-500 flex items-center gap-1">
                <Navigation className="w-3.5 h-3.5" />
                Total Mileage
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{route.totalMileage} mi</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-slate-500">Avg Miles/Job</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{route.avgMileagePerJob} mi</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-slate-500">Total Travel Time</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {Math.floor(route.totalTravelTime / 60)}h {route.totalTravelTime % 60}m
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-slate-500">Mileage Cost (IRS)</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(route.mileageCost)}</p>
              <p className="text-xs text-slate-400 mt-0.5">@ $0.67/mi</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-slate-500">Jobs Tracked</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{route.jobsTracked}</p>
              <p className="text-xs text-slate-400 mt-0.5">of {performance.totalJobs} total</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabbed sections */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
        </TabsList>

        {/* REVENUE TAB */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Revenue by week */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Revenue by Week</CardTitle>
              </CardHeader>
              <CardContent>
                {revenue.byWeek.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={revenue.byWeek}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                        width={45}
                      />
                      <Tooltip formatter={(v) => [formatCurrency(Number(v)), "Revenue"]} />
                      <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Revenue by service */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Revenue by Service</CardTitle>
              </CardHeader>
              <CardContent>
                {revenue.byService.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={revenue.byService.slice(0, 8)} layout="vertical" margin={{ left: 120 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                      />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} width={120} />
                      <Tooltip formatter={(v) => [formatCurrency(Number(v)), "Revenue"]} />
                      <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Revenue vs Expenses trend */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-emerald-500" />
                  Revenue vs Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                {expenses.profitByWeek.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={expenses.profitByWeek}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                        width={50}
                      />
                      <Tooltip formatter={(v) => [formatCurrency(Number(v))]} />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={false} name="Revenue" />
                      <Line type="monotone" dataKey="expenses" stroke="#f97316" strokeWidth={2} dot={false} name="Expenses" />
                      <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={2} dot={false} name="Profit" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Expenses by Category */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-orange-500" />
                  Expenses by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                {expenses.byCategory.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No expenses</div>
                ) : (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="50%" height={200}>
                      <PieChart>
                        <Pie
                          data={expenses.byCategory}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="amount"
                          nameKey="category"
                        >
                          {expenses.byCategory.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => [formatCurrency(Number(v))]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 flex-1">
                      {expenses.byCategory.slice(0, 6).map((item, i) => (
                        <div key={item.category} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="text-slate-700 truncate">{item.category}</span>
                          </div>
                          <span className="font-medium text-slate-900">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Revenue by Location */}
            {revenue.byLocation.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Revenue by Location</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={revenue.byLocation} layout="vertical" margin={{ left: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                      />
                      <YAxis type="category" dataKey="location" tick={{ fontSize: 11, fill: "#64748b" }} width={100} />
                      <Tooltip formatter={(v) => [formatCurrency(Number(v)), "Revenue"]} />
                      <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Commercial vs Residential */}
            {revenue.commercial > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-500" />
                    Commercial vs Residential
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width="50%" height={200}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Residential", value: revenue.residential },
                            { name: "Commercial", value: revenue.commercial },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#3b82f6" />
                        </Pie>
                        <Tooltip formatter={(v) => [formatCurrency(Number(v))]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-emerald-500" />
                          <span className="text-sm font-medium text-slate-700">Residential</span>
                        </div>
                        <p className="text-xl font-bold text-slate-900 ml-5">{formatCurrency(revenue.residential)}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                          <span className="text-sm font-medium text-slate-700">Commercial</span>
                        </div>
                        <p className="text-xl font-bold text-slate-900 ml-5">{formatCurrency(revenue.commercial)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* PIPELINE TAB */}
        <TabsContent value="pipeline" className="space-y-6">
          {/* Lead & Estimate KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-slate-500 flex items-center gap-1">
                  <Target className="w-3.5 h-3.5" />
                  Total Leads
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{leads.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-slate-500">Leads Converted</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{leads.converted}</p>
                <p className="text-xs text-slate-400 mt-0.5">{leads.conversionRate}% rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-slate-500 flex items-center gap-1">
                  <ClipboardList className="w-3.5 h-3.5" />
                  Total Estimates
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{estimates.total}</p>
                <p className="text-xs text-slate-400 mt-0.5">{formatCurrency(estimates.totalValue)} value</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-slate-500">Estimates Won</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{estimates.converted}</p>
                <p className="text-xs text-slate-400 mt-0.5">{estimates.conversionRate}% win rate</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Lead Funnel by Status */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Lead Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                {leads.byStatus.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No leads</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={leads.byStatus}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="status" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} width={30} />
                      <Tooltip formatter={(v) => [Number(v), "Leads"]} />
                      <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Leads by Source */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Leads by Source</CardTitle>
              </CardHeader>
              <CardContent>
                {leads.bySource.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data</div>
                ) : (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="50%" height={220}>
                      <PieChart>
                        <Pie
                          data={leads.bySource}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="count"
                          nameKey="source"
                        >
                          {leads.bySource.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v, name) => [Number(v), String(name)]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 flex-1">
                      {leads.bySource.slice(0, 6).map((item, i) => (
                        <div key={item.source} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="text-slate-700">{item.source}</span>
                          </div>
                          <span className="font-medium text-slate-900">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Estimate Pipeline */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Estimate Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                {estimates.byStatus.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No estimates</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={estimates.byStatus}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="status" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} width={30} />
                      <Tooltip formatter={(v) => [Number(v), "Estimates"]} />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* CUSTOMERS TAB */}
        <TabsContent value="customers" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* New vs Returning */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">New vs Returning Customers</CardTitle>
              </CardHeader>
              <CardContent>
                {customers.newVsReturning.every((c) => c.value === 0) ? (
                  <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data</div>
                ) : (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={customers.newVsReturning}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {customers.newVsReturning.map((_, i) => (
                            <Cell key={i} fill={COLORS[i]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v, name) => [Number(v), String(name)]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-3 min-w-32">
                      {customers.newVsReturning.map((item, i) => (
                        <div key={item.name}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                            <span className="text-sm font-medium text-slate-700">{item.name}</span>
                          </div>
                          <p className="text-xl font-bold text-slate-900 ml-5">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* LTV Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Customer LTV Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={customers.ltvDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="range" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} width={30} />
                    <Tooltip formatter={(v) => [Number(v), "Customers"]} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Churn risk */}
          {customers.churnedCount > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <CardTitle className="text-base">
                    Re-engagement Needed ({customers.churnedCount} customers silent 60+ days)
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {customers.churnedCustomers.map((c) => (
                    <Link
                      key={c.id}
                      href={`/customers/${c.id}`}
                      className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 hover:bg-amber-100 transition-colors"
                    >
                      <div>
                        <span className="font-medium text-sm text-slate-900">{c.name}</span>
                        {c.lastService && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            Last seen: {formatDate(c.lastService)}
                          </p>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-emerald-600">{formatCurrency(c.totalSpent)} LTV</span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* SCHEDULING TAB */}
        <TabsContent value="scheduling" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Jobs by Day of Week */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  Jobs by Day of Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={scheduling.byDayOfWeek}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} width={30} />
                    <Tooltip
                      formatter={(v, name) => [
                        name === "revenue" ? formatCurrency(Number(v)) : Number(v),
                        name === "revenue" ? "Revenue" : "Jobs",
                      ]}
                    />
                    <Bar dataKey="jobs" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue by Day of Week */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Revenue by Day of Week</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={scheduling.byDayOfWeek}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                      width={45}
                    />
                    <Tooltip formatter={(v) => [formatCurrency(Number(v)), "Revenue"]} />
                    <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Jobs by Hour */}
            <Card className="xl:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Jobs by Time of Day</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={scheduling.byHour}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="hour"
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      tickFormatter={(h) => `${h > 12 ? h - 12 : h}${h >= 12 ? "pm" : "am"}`}
                    />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} width={30} />
                    <Tooltip
                      labelFormatter={(h) => `${Number(h) > 12 ? Number(h) - 12 : h}:00 ${Number(h) >= 12 ? "PM" : "AM"}`}
                      formatter={(v, name) => [
                        name === "revenue" ? formatCurrency(Number(v)) : Number(v),
                        name === "revenue" ? "Revenue" : "Jobs",
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="jobs" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Jobs" />
                    <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* MARKETING TAB */}
        <TabsContent value="marketing" className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-slate-500 flex items-center gap-1">
                  <Megaphone className="w-3.5 h-3.5" />
                  Campaigns Sent
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{campaigns.sent}</p>
                <p className="text-xs text-slate-400 mt-0.5">{campaigns.total} total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-slate-500">Messages Sent</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{campaigns.totalSent.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-slate-500">Open Rate</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {campaigns.totalSent > 0 ? ((campaigns.totalOpened / campaigns.totalSent) * 100).toFixed(1) : 0}%
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{campaigns.totalOpened.toLocaleString()} opened</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-slate-500">Conversions</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{campaigns.totalConverted}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {campaigns.totalSent > 0 ? ((campaigns.totalConverted / campaigns.totalSent) * 100).toFixed(1) : 0}% rate
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Campaign funnel visualization */}
          {campaigns.totalSent > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Campaign Funnel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: "Sent", value: campaigns.totalSent, color: "bg-slate-400" },
                    { label: "Opened", value: campaigns.totalOpened, color: "bg-blue-500" },
                    { label: "Clicked", value: campaigns.totalClicked, color: "bg-amber-500" },
                    { label: "Converted", value: campaigns.totalConverted, color: "bg-emerald-500" },
                  ].map((step) => (
                    <div key={step.label} className="flex items-center gap-3">
                      <span className="text-sm text-slate-600 w-20">{step.label}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                        <div
                          className={`h-full ${step.color} rounded-full flex items-center justify-end pr-2`}
                          style={{
                            width: `${campaigns.totalSent > 0 ? Math.max((step.value / campaigns.totalSent) * 100, 3) : 0}%`,
                          }}
                        >
                          <span className="text-xs font-medium text-white">{step.value.toLocaleString()}</span>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500 w-14 text-right">
                        {campaigns.totalSent > 0 ? ((step.value / campaigns.totalSent) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
