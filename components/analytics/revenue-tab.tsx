"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "@/components/charts/bar-chart";
import { LineChart, Line } from "@/components/charts/line-chart";
import { PieChart, Pie, Cell } from "@/components/charts/pie-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { TrendingDown, Receipt, Building2 } from "lucide-react";
import { CHART_COLORS } from "@/lib/ui-constants";
import type { AnalyticsData } from "./analytics-types";

interface RevenueTabProps {
  revenue: AnalyticsData["revenue"];
  expenses: AnalyticsData["expenses"];
}

export function RevenueTab({ revenue, expenses }: RevenueTabProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Revenue by Week</CardTitle></CardHeader>
        <CardContent>
          {revenue.byWeek.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenue.byWeek}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} width={45} />
                <Tooltip formatter={(v) => [formatCurrency(Number(v)), "Revenue"]} />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Revenue by Service</CardTitle></CardHeader>
        <CardContent>
          {revenue.byService.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenue.byService.slice(0, 8)} layout="vertical" margin={{ left: 120 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} width={120} />
                <Tooltip formatter={(v) => [formatCurrency(Number(v)), "Revenue"]} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><TrendingDown className="w-4 h-4 text-emerald-500" />Revenue vs Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.profitByWeek.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={expenses.profitByWeek}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} width={50} />
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Receipt className="w-4 h-4 text-orange-500" />Expenses by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.byCategory.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No expenses</div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={expenses.byCategory} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="amount" nameKey="category">
                    {expenses.byCategory.map((_, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}
                  </Pie>
                  <Tooltip formatter={(v) => [formatCurrency(Number(v))]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {expenses.byCategory.slice(0, 6).map((item, i) => (
                  <div key={item.category} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
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

      {revenue.byLocation.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Revenue by Location</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenue.byLocation} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <YAxis type="category" dataKey="location" tick={{ fontSize: 11, fill: "#64748b" }} width={100} />
                <Tooltip formatter={(v) => [formatCurrency(Number(v)), "Revenue"]} />
                <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {revenue.commercial > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4 text-blue-500" />Commercial vs Residential</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={[{ name: "Residential", value: revenue.residential }, { name: "Commercial", value: revenue.commercial }]} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                    <Cell fill="#10b981" /><Cell fill="#3b82f6" />
                  </Pie>
                  <Tooltip formatter={(v) => [formatCurrency(Number(v))]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                <div><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-sm font-medium text-slate-700">Residential</span></div><p className="text-xl font-bold text-slate-900 ml-5">{formatCurrency(revenue.residential)}</p></div>
                <div><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500" /><span className="text-sm font-medium text-slate-700">Commercial</span></div><p className="text-xl font-bold text-slate-900 ml-5">{formatCurrency(revenue.commercial)}</p></div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
