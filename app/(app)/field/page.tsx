"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { Plus } from "lucide-react";
import { fetchJson } from "@/lib/utils";
import { format } from "date-fns";
import type { FieldJob, FieldTab } from "@/components/field/types";
import { FieldTodayTab } from "@/components/field/field-today-tab";
import { FieldRouteTab } from "@/components/field/field-route-tab";
import { FieldNotificationsTab } from "@/components/field/field-notifications-tab";
import { FieldQuickExpense } from "@/components/field/field-quick-expense";
import { FieldBottomNav } from "@/components/field/field-bottom-nav";

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function FieldViewPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<FieldTab>("today");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");

  const today = format(new Date(), "yyyy-MM-dd");

  const { data: jobs = [], isLoading, isError, refetch } = useQuery<FieldJob[]>({
    queryKey: ["field-jobs", today],
    queryFn: () => fetchJson<FieldJob[]>(`/api/jobs?date=${today}&limit=20`),
    refetchInterval: 30000,
  });

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: () => fetchJson("/api/notifications"),
    refetchInterval: 60000,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ jobId, status }: { jobId: string; status: string }) => {
      const res = await fetch(`/api/jobs/${jobId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["field-jobs"] });
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const expenseMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: expenseDesc,
          amount: parseFloat(expenseAmount),
          category: "SUPPLIES",
          date: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Expense added");
      setExpenseDesc("");
      setExpenseAmount("");
      setShowQuickAdd(false);
    },
    onError: () => toast.error("Failed to add expense"),
  });

  const sortedJobs = [...jobs].sort((a, b) => {
    const statusOrder: Record<string, number> = { InProgress: 0, EnRoute: 1, Scheduled: 2, Completed: 3, Invoiced: 4, Paid: 5 };
    const aOrder = statusOrder[a.status] ?? 6;
    const bOrder = statusOrder[b.status] ?? 6;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return new Date(a.scheduledAt || "").getTime() - new Date(b.scheduledAt || "").getTime();
  });

  const activeJobs = sortedJobs.filter((j) => !["Completed", "Invoiced", "Paid", "Cancelled"].includes(j.status));
  const completedJobs = sortedJobs.filter((j) => ["Completed", "Invoiced", "Paid"].includes(j.status));
  const unreadNotifications = notifications.filter((n) => !n.read).length;

  const googleMapsUrl = activeJobs
    .filter((j) => j.address)
    .map((j) => encodeURIComponent(j.address!))
    .join("/");

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-6">
      <div className="bg-slate-950 text-white px-4 py-4 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">FP</span>
            </div>
            <div>
              <div className="font-bold text-sm">Field View</div>
              <div className="text-slate-400 text-xs">{format(new Date(), "EEEE, MMM d")}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right text-xs">
              <div className="text-slate-400">{activeJobs.length} active</div>
              <div className="text-emerald-400 font-medium">{sortedJobs.length} total</div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4">
        {tab === "today" && (
          <FieldTodayTab
            isLoading={isLoading}
            isError={isError}
            refetch={refetch}
            activeJobs={activeJobs}
            completedJobs={completedJobs}
            sortedJobs={sortedJobs}
            onStatusChange={(jobId, status) => statusMutation.mutate({ jobId, status })}
            isStatusPending={statusMutation.isPending}
          />
        )}

        {tab === "route" && (
          <FieldRouteTab activeJobs={activeJobs} googleMapsUrl={googleMapsUrl} />
        )}

        {tab === "notifications" && (
          <FieldNotificationsTab notifications={notifications} />
        )}
      </div>

      <FieldQuickExpense
        show={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        expenseDesc={expenseDesc}
        onDescChange={setExpenseDesc}
        expenseAmount={expenseAmount}
        onAmountChange={setExpenseAmount}
        onSubmit={() => expenseMutation.mutate()}
        isPending={expenseMutation.isPending}
      />

      <button
        onClick={() => setShowQuickAdd(!showQuickAdd)}
        className="fixed bottom-24 right-4 z-30 w-14 h-14 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/30 flex items-center justify-center text-white hover:bg-emerald-600 transition-colors"
      >
        <Plus className="w-6 h-6" />
      </button>

      <FieldBottomNav
        tab={tab}
        onTabChange={setTab}
        unreadNotifications={unreadNotifications}
      />
    </div>
  );
}
