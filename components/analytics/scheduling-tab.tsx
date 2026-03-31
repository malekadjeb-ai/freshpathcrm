"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "@/components/charts/bar-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Calendar } from "lucide-react";
import type { AnalyticsData } from "./analytics-types";

interface SchedulingTabProps {
  scheduling: AnalyticsData["scheduling"];
}

export function SchedulingTab({ scheduling }: SchedulingTabProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
  );
}
