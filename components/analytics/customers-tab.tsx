"use client";

import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "@/components/charts/bar-chart";
import { PieChart, Pie, Cell } from "@/components/charts/pie-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import { CHART_COLORS } from "@/lib/ui-constants";
import type { AnalyticsData } from "./analytics-types";

interface CustomersTabProps {
  customers: AnalyticsData["customers"];
}

export function CustomersTab({ customers }: CustomersTabProps) {
  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
                        <Cell key={i} fill={CHART_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, name) => [Number(v), String(name)]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3 min-w-32">
                  {customers.newVsReturning.map((item, i) => (
                    <div key={item.name}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
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
    </>
  );
}
