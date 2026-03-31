"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "@/components/charts/bar-chart";
import { PieChart, Pie, Cell } from "@/components/charts/pie-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Target, ClipboardList } from "lucide-react";
import { CHART_COLORS } from "@/lib/ui-constants";
import type { AnalyticsData } from "./analytics-types";

interface PipelineTabProps {
  leads: AnalyticsData["leads"];
  estimates: AnalyticsData["estimates"];
}

export function PipelineTab({ leads, estimates }: PipelineTabProps) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500 flex items-center gap-1"><Target className="w-3.5 h-3.5" />Total Leads</p><p className="text-2xl font-bold text-slate-900 mt-1">{leads.total}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Leads Converted</p><p className="text-2xl font-bold text-emerald-600 mt-1">{leads.converted}</p><p className="text-xs text-slate-400 mt-0.5">{leads.conversionRate}% rate</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500 flex items-center gap-1"><ClipboardList className="w-3.5 h-3.5" />Total Estimates</p><p className="text-2xl font-bold text-slate-900 mt-1">{estimates.total}</p><p className="text-xs text-slate-400 mt-0.5">{formatCurrency(estimates.totalValue)} value</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Estimates Won</p><p className="text-2xl font-bold text-emerald-600 mt-1">{estimates.converted}</p><p className="text-xs text-slate-400 mt-0.5">{estimates.conversionRate}% win rate</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Lead Pipeline</CardTitle></CardHeader>
          <CardContent>
            {leads.byStatus.length === 0 ? <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No leads</div> : (
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

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Leads by Source</CardTitle></CardHeader>
          <CardContent>
            {leads.bySource.length === 0 ? <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data</div> : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={220}>
                  <PieChart>
                    <Pie data={leads.bySource} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="count" nameKey="source">
                      {leads.bySource.map((_, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}
                    </Pie>
                    <Tooltip formatter={(v, name) => [Number(v), String(name)]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 flex-1">
                  {leads.bySource.slice(0, 6).map((item, i) => (
                    <div key={item.source} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} /><span className="text-slate-700">{item.source}</span></div>
                      <span className="font-medium text-slate-900">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Estimate Pipeline</CardTitle></CardHeader>
          <CardContent>
            {estimates.byStatus.length === 0 ? <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No estimates</div> : (
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
    </>
  );
}
