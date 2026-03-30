"use client";

import { useQuery } from "@tanstack/react-query";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Heart, TrendingUp, DollarSign, Users, Target, Zap, ArrowUp, ArrowDown,
  Minus, Crown, ThumbsUp, AlertTriangle, Snowflake, Thermometer,
} from "lucide-react";
import { fetchJson, formatCurrency } from "@/lib/utils";
import { PageSkeleton } from "@/components/page-skeleton";
import { ErrorState } from "@/components/error-state";

const HEALTH_COLORS: Record<string, string> = {
  Champion: "#10b981",
  Healthy: "#3b82f6",
  "At Risk": "#f59e0b",
  Cooling: "#f97316",
  Cold: "#ef4444",
};

const HEALTH_ICONS: Record<string, typeof Crown> = {
  Champion: Crown,
  Healthy: ThumbsUp,
  "At Risk": AlertTriangle,
  Cooling: Thermometer,
  Cold: Snowflake,
};

const CONFIDENCE_STYLES: Record<string, string> = {
  high: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-600",
};

export default function IntelligencePage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: healthData, isLoading: healthLoading, error: healthError, refetch: healthRefetch } = useQuery<any>({
    queryKey: ["health-scores"],
    queryFn: () => fetchJson("/api/intelligence/health-scores"),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: forecastData, isLoading: forecastLoading } = useQuery<any>({
    queryKey: ["forecast"],
    queryFn: () => fetchJson("/api/intelligence/forecast?months=3"),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pricingData, isLoading: pricingLoading } = useQuery<any>({
    queryKey: ["pricing-intelligence"],
    queryFn: () => fetchJson("/api/intelligence/pricing"),
  });

  const isLoading = healthLoading || forecastLoading || pricingLoading;
  if (isLoading) return <PageSkeleton />;
  if (healthError) return <ErrorState message="Failed to load intelligence data" onRetry={healthRefetch} />;

  const segments = healthData?.segments || {};
  const scores = healthData?.scores || [];
  const forecast = forecastData?.forecast || [];
  const historical = forecastData?.historical || [];
  const trend = forecastData?.trend || {};
  const pipeline = forecastData?.pipeline || {};
  const suggestions = pricingData?.suggestions || [];

  // Chart data: combine historical + forecast
  const revenueChartData = [
    ...historical.slice(-6).map((h: { month: string; revenue: number }) => ({
      month: h.month.slice(5),
      revenue: h.revenue,
      type: "actual",
    })),
    ...forecast.map((f: { month: string; revenue: number }) => ({
      month: f.month.slice(5),
      forecast: f.revenue,
      type: "forecast",
    })),
  ];

  // Segment pie data
  const segmentData = [
    { name: "Champions", value: segments.champions || 0, color: HEALTH_COLORS.Champion },
    { name: "Healthy", value: segments.healthy || 0, color: HEALTH_COLORS.Healthy },
    { name: "At Risk", value: segments.atRisk || 0, color: HEALTH_COLORS["At Risk"] },
    { name: "Cooling", value: segments.cooling || 0, color: HEALTH_COLORS.Cooling },
    { name: "Cold", value: segments.cold || 0, color: HEALTH_COLORS.Cold },
  ].filter((d) => d.value > 0);

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Zap className="w-6 h-6 text-amber-500" /> Business Intelligence
        </h1>
        <p className="text-sm text-slate-500">AI-powered insights for your business</p>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Heart className="w-4 h-4 text-pink-500" />
              <span className="text-xs font-medium text-slate-500 uppercase">Avg Health</span>
            </div>
            <span className="text-2xl font-bold text-slate-900">{healthData?.avgScore || 0}</span>
            <span className="text-xs text-slate-400 ml-1">/ 100</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              {trend.direction === "up" ? <ArrowUp className="w-4 h-4 text-emerald-500" /> :
               trend.direction === "down" ? <ArrowDown className="w-4 h-4 text-red-500" /> :
               <Minus className="w-4 h-4 text-slate-400" />}
              <span className="text-xs font-medium text-slate-500 uppercase">Trend</span>
            </div>
            <span className="text-2xl font-bold text-slate-900">{formatCurrency(trend.avgMonthlyRevenue || 0)}</span>
            <span className="text-xs text-slate-400 ml-1">/mo</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-slate-500 uppercase">Pipeline</span>
            </div>
            <span className="text-2xl font-bold text-slate-900">{formatCurrency(pipeline.value || 0)}</span>
            <span className="text-xs text-slate-400 ml-1">{pipeline.count || 0} jobs</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-medium text-slate-500 uppercase">Active Leads</span>
            </div>
            <span className="text-2xl font-bold text-slate-900">{forecastData?.activeLeads || 0}</span>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Forecast Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-5 h-5 text-emerald-500" /> Revenue Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Actual" dot={{ r: 4 }} />
              <Line type="monotone" dataKey="forecast" stroke="#10b981" strokeWidth={2} strokeDasharray="8 4" name="Forecast" dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
          {forecast.length > 0 && (
            <div className="flex gap-4 mt-4 justify-center">
              {forecast.map((f: { month: string; revenue: number; confidence: string }) => (
                <div key={f.month} className="text-center">
                  <span className="text-sm font-semibold text-slate-700">{formatCurrency(f.revenue)}</span>
                  <div className="flex items-center gap-1 mt-1 justify-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${CONFIDENCE_STYLES[f.confidence]}`}>
                      {f.confidence} confidence
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">{f.month}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Health Segments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="w-5 h-5 text-pink-500" /> Customer Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            {segmentData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={segmentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                      {segmentData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-4">
                  {Object.entries(HEALTH_COLORS).map(([label, color]) => {
                    const count = scores.filter((s: { label: string }) => s.label === label).length;
                    if (count === 0) return null;
                    const Icon = HEALTH_ICONS[label];
                    return (
                      <div key={label} className="flex items-center gap-3">
                        <Icon className="w-4 h-4" style={{ color }} />
                        <span className="text-sm font-medium flex-1">{label}</span>
                        <span className="text-sm text-slate-500">{count} customers</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400 text-center py-8">No customer data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Smart Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="w-5 h-5 text-emerald-500" /> Smart Pricing
            </CardTitle>
          </CardHeader>
          <CardContent>
            {suggestions.length > 0 ? (
              <div className="space-y-3">
                {suggestions.slice(0, 8).map((s: {
                  serviceId: string; name: string; count: number;
                  avg: number; median: number; min: number; max: number; suggested: number;
                }) => (
                  <div key={s.serviceId} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div>
                      <span className="text-sm font-medium text-slate-700">{s.name}</span>
                      <div className="text-xs text-slate-400">
                        {s.count} jobs — Range: {formatCurrency(s.min)}–{formatCurrency(s.max)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-emerald-600">{formatCurrency(s.suggested)}</span>
                      <div className="text-xs text-slate-400">
                        avg {formatCurrency(s.avg)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-8">Need more job data for pricing suggestions</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Customers by Health Score */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer Health Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          {scores.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-medium text-slate-400 uppercase border-b border-slate-100">
                    <th className="text-left pb-2">Customer</th>
                    <th className="text-center pb-2">Score</th>
                    <th className="text-center pb-2">Segment</th>
                    <th className="text-right pb-2">Jobs</th>
                    <th className="text-right pb-2">Spend</th>
                    <th className="text-right pb-2">Referrals</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.slice(0, 15).map((s: {
                    id: string; name: string; score: number; label: string;
                    jobCount: number; totalSpend: number; referralCount: number;
                  }) => (
                    <tr key={s.id} className="border-b border-slate-50">
                      <td className="py-2 font-medium text-slate-700">{s.name}</td>
                      <td className="py-2 text-center">
                        <span className="inline-flex items-center gap-1">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: HEALTH_COLORS[s.label] || "#94a3b8" }}
                          />
                          {s.score}
                        </span>
                      </td>
                      <td className="py-2 text-center">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor: `${HEALTH_COLORS[s.label]}20`,
                            color: HEALTH_COLORS[s.label],
                          }}
                        >
                          {s.label}
                        </span>
                      </td>
                      <td className="py-2 text-right text-slate-500">{s.jobCount}</td>
                      <td className="py-2 text-right text-slate-700 font-medium">{formatCurrency(s.totalSpend)}</td>
                      <td className="py-2 text-right text-slate-500">{s.referralCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">No customer data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
