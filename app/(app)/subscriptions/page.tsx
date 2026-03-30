"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  Pause,
  Play,
  XCircle,
  TrendingUp,
  Users,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate, fetchJson } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";

interface Subscription {
  id: string;
  customerId: string;
  customer: { id: string; name: string; phone: string | null; email: string | null };
  plan: { id: string; name: string; monthlyPrice: number; frequency: string; color: string };
  vehicle: { id: string; year: number; make: string; model: string } | null;
  status: string;
  startDate: string;
  nextBillingDate: string;
  nextServiceDate: string | null;
  jobsCompleted: number;
  totalBilled: number;
}

interface Stats {
  activeCount: number;
  pausedCount: number;
  cancelledCount: number;
  mrr: number;
  churnRate: number;
  planDistribution: Record<string, number>;
}

export default function SubscriptionsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const queryClient = useQueryClient();

  const { data: subscriptions = [], isLoading, isError, refetch } = useQuery<Subscription[]>({
    queryKey: ["subscriptions", statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      return fetchJson(`/api/subscriptions?${params}`);
    },
  });

  const { data: stats } = useQuery<Stats>({
    queryKey: ["subscription-stats"],
    queryFn: () => fetchJson("/api/subscriptions/stats"),
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action, cancelReason }: { id: string; action: string; cancelReason?: string }) =>
      fetch(`/api/subscriptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, cancelReason }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-stats"] });
      toast.success("Subscription updated");
    },
  });

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-emerald-100 text-emerald-700";
      case "paused": return "bg-amber-100 text-amber-700";
      case "cancelled": return "bg-red-100 text-red-700";
      case "past_due": return "bg-orange-100 text-orange-700";
      default: return "bg-slate-100 text-slate-600";
    }
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Subscriptions</h1>
          <p className="text-sm text-slate-500 mt-1">Service plan memberships</p>
        </div>
      </div>

      {isError && <ErrorState message="Failed to load subscriptions." onRetry={refetch} />}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
              <Users className="w-3.5 h-3.5" /> Active
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats.activeCount}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
              <DollarSign className="w-3.5 h-3.5" /> MRR
            </div>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.mrr)}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
              <TrendingUp className="w-3.5 h-3.5" /> Churn Rate
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats.churnRate}%</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
              <Pause className="w-3.5 h-3.5" /> Paused
            </div>
            <div className="text-2xl font-bold text-amber-600">{stats.pausedCount}</div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {["", "active", "paused", "cancelled", "past_due"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              statusFilter === s
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {/* Subscriptions List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
              <div className="h-5 bg-slate-200 rounded w-48 mb-2" />
              <div className="h-4 bg-slate-100 rounded w-32" />
            </div>
          ))}
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No subscriptions yet</h3>
          <p className="text-sm text-slate-500">
            Start a service plan from a customer profile to create recurring revenue.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((sub) => (
            <div key={sub.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900">{sub.customer.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(sub.status)}`}>
                      {sub.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                    <span
                      className="font-medium"
                      style={{ color: sub.plan.color }}
                    >
                      {sub.plan.name} — {formatCurrency(sub.plan.monthlyPrice)}/mo
                    </span>
                    {sub.vehicle && (
                      <span>{sub.vehicle.year} {sub.vehicle.make} {sub.vehicle.model}</span>
                    )}
                    <span>Since {formatDate(sub.startDate)}</span>
                    <span>{sub.jobsCompleted} jobs completed</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Next billing: {formatDate(sub.nextBillingDate)}
                    {sub.nextServiceDate && ` · Next service: ${formatDate(sub.nextServiceDate)}`}
                  </div>
                </div>
                <div className="flex gap-2">
                  {sub.status === "active" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => actionMutation.mutate({ id: sub.id, action: "pause" })}
                    >
                      <Pause className="w-3.5 h-3.5 mr-1" /> Pause
                    </Button>
                  )}
                  {sub.status === "paused" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => actionMutation.mutate({ id: sub.id, action: "resume" })}
                    >
                      <Play className="w-3.5 h-3.5 mr-1" /> Resume
                    </Button>
                  )}
                  {(sub.status === "active" || sub.status === "paused") && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => {
                        if (confirm("Cancel this subscription?")) {
                          actionMutation.mutate({ id: sub.id, action: "cancel" });
                        }
                      }}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
