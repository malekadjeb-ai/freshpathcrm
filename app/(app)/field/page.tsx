"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import {
  Phone,
  MapPin,
  Play,
  Square,
  Send,
  Timer,
  Navigation2,
  CheckCircle,
  Clock,
  Plus,
  Bell,
  Route,
  Loader2,
  Car,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency, fetchJson, JOB_STATUS_LABELS, JOB_STATUS_COLORS, type JobStatus } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import { format } from "date-fns";

interface FieldJob {
  id: string;
  status: string;
  scheduledAt: string | null;
  startedAt: string | null;
  total: number;
  address: string | null;
  city: string | null;
  notes: string | null;
  estimatedDuration: number | null;
  customer: {
    id: string;
    name: string;
    phone: string | null;
  };
  vehicle: {
    year: number;
    make: string;
    model: string;
    color: string | null;
    vehicleType: string;
  } | null;
  services: {
    serviceItem: { name: string } | null;
    customName?: string | null;
    price: number;
  }[];
}

type FieldTab = "today" | "route" | "notifications";

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

  const { data: notifications = [] } = useQuery<{ id: string; title: string; message: string; read: boolean; createdAt: string }[]>({
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
      {/* Header */}
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
        {/* TODAY TAB */}
        {tab === "today" && (
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
              </div>
            ) : isError ? (
              <ErrorState message="Failed to load jobs." onRetry={refetch} />
            ) : sortedJobs.length === 0 ? (
              <div className="text-center py-16">
                <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No jobs today</p>
                <p className="text-slate-400 text-sm mt-1">Enjoy your day off!</p>
              </div>
            ) : (
              <>
                {activeJobs.length > 0 && (
                  <div>
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Active</h2>
                    {activeJobs.map((job) => (
                      <FieldJobCard
                        key={job.id}
                        job={job}
                        onStatusChange={(status) => statusMutation.mutate({ jobId: job.id, status })}
                        isPending={statusMutation.isPending}
                      />
                    ))}
                  </div>
                )}
                {completedJobs.length > 0 && (
                  <div className="mt-4">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Completed</h2>
                    {completedJobs.map((job) => (
                      <FieldJobCard
                        key={job.id}
                        job={job}
                        onStatusChange={(status) => statusMutation.mutate({ jobId: job.id, status })}
                        isPending={statusMutation.isPending}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ROUTE TAB */}
        {tab === "route" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Today&apos;s Route</h2>
              {googleMapsUrl && (
                <a
                  href={`https://www.google.com/maps/dir/${googleMapsUrl}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-emerald-600 font-medium"
                >
                  <Navigation2 className="w-4 h-4" />
                  Open in Maps
                </a>
              )}
            </div>
            {activeJobs.map((job, i) => (
              <div key={job.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-emerald-700 font-bold text-sm">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900">{job.customer.name}</div>
                    <div className="text-sm text-slate-500 mt-0.5">
                      {job.services.map((s) => s.serviceItem?.name || s.customName || "Custom").join(", ")}
                    </div>
                    {job.address && (
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(job.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-emerald-600 mt-1 flex items-center gap-1"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        {job.address}{job.city ? `, ${job.city}` : ""}
                      </a>
                    )}
                    {job.scheduledAt && (
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(job.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        {job.estimatedDuration && ` · ~${job.estimatedDuration} min`}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-emerald-600">{formatCurrency(job.total)}</div>
                  </div>
                </div>
              </div>
            ))}
            {activeJobs.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">No active stops today.</div>
            )}
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {tab === "notifications" && (
          <div className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 mb-3">Notifications</h2>
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">No notifications</div>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "bg-white rounded-xl border p-3",
                    n.read ? "border-slate-200" : "border-emerald-200 bg-emerald-50/50"
                  )}
                >
                  <div className="font-medium text-sm text-slate-900">{n.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{n.message}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Quick Add FAB */}
      {showQuickAdd && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowQuickAdd(false)}>
          <div className="absolute bottom-24 right-4 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm text-slate-900 mb-3">Quick Add Expense</h3>
            <div className="space-y-2">
              <Input
                placeholder="Description"
                value={expenseDesc}
                onChange={(e) => setExpenseDesc(e.target.value)}
              />
              <Input
                type="number"
                placeholder="Amount"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
              />
              <Button
                className="w-full bg-emerald-500 hover:bg-emerald-600"
                disabled={!expenseDesc || !expenseAmount || expenseMutation.isPending}
                onClick={() => expenseMutation.mutate()}
              >
                {expenseMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                Add Expense
              </Button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setShowQuickAdd(!showQuickAdd)}
        className="fixed bottom-24 right-4 z-30 w-14 h-14 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/30 flex items-center justify-center text-white hover:bg-emerald-600 transition-colors"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-20">
        <div className="flex">
          {([
            { key: "today" as FieldTab, label: "Today", icon: Clock },
            { key: "route" as FieldTab, label: "Route", icon: Route },
            { key: "notifications" as FieldTab, label: "Alerts", icon: Bell, badge: unreadNotifications },
          ]).map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors relative",
                tab === item.key ? "text-emerald-600" : "text-slate-400"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
              {(item.badge ?? 0) > 0 && (
                <span className="absolute top-2 right-1/4 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {item.badge! > 9 ? "9+" : item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function FieldJobCard({
  job,
  onStatusChange,
  isPending,
}: {
  job: FieldJob;
  onStatusChange: (status: string) => void;
  isPending: boolean;
}) {
  const status = job.status as JobStatus;
  const isInProgress = job.status === "InProgress";
  const isCompleted = ["Completed", "Invoiced", "Paid"].includes(job.status);

  return (
    <div className={cn(
      "bg-white rounded-2xl border p-4 mb-3 transition-all",
      isInProgress ? "border-amber-300 shadow-md" : "border-slate-200"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-semibold text-slate-900">{job.customer.name}</div>
          {job.vehicle && (
            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <Car className="w-3 h-3" />
              {job.vehicle.year} {job.vehicle.make} {job.vehicle.model}
              {job.vehicle.color && ` · ${job.vehicle.color}`}
            </div>
          )}
        </div>
        <span className={cn(
          "text-[10px] px-2 py-0.5 rounded-full font-medium",
          JOB_STATUS_COLORS[status] ?? "bg-slate-100 text-slate-600"
        )}>
          {JOB_STATUS_LABELS[status] ?? job.status}
        </span>
      </div>

      {/* Services */}
      <div className="text-sm text-slate-600 mb-2">
        {job.services.map((s) => s.serviceItem?.name || s.customName || "Custom").join(", ")}
      </div>

      {/* Time & Price */}
      <div className="flex items-center justify-between text-sm mb-3">
        {job.scheduledAt && (
          <span className="text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {new Date(job.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </span>
        )}
        <span className="font-bold text-emerald-600">{formatCurrency(job.total)}</span>
      </div>

      {/* Live Timer */}
      {isInProgress && job.startedAt && (
        <div className="bg-amber-50 rounded-lg p-2 mb-3 flex items-center gap-2">
          <Timer className="w-4 h-4 text-amber-600 animate-pulse" />
          <FieldTimer startedAt={job.startedAt} />
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex items-center gap-2">
        {/* Status buttons */}
        {job.status === "Scheduled" && (
          <>
            <Button
              size="sm"
              className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white h-11 text-sm"
              onClick={() => onStatusChange("EnRoute")}
              disabled={isPending}
            >
              <Send className="w-4 h-4 mr-1.5" />
              On My Way
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white h-11 text-sm"
              onClick={() => onStatusChange("InProgress")}
              disabled={isPending}
            >
              <Play className="w-4 h-4 mr-1.5" />
              Start
            </Button>
          </>
        )}
        {job.status === "EnRoute" && (
          <Button
            size="sm"
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white h-11 text-sm"
            onClick={() => onStatusChange("InProgress")}
            disabled={isPending}
          >
            <Play className="w-4 h-4 mr-1.5" />
            Start Job
          </Button>
        )}
        {isInProgress && (
          <Button
            size="sm"
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white h-11 text-sm"
            onClick={() => onStatusChange("Completed")}
            disabled={isPending}
          >
            <Square className="w-4 h-4 mr-1.5" />
            Complete
          </Button>
        )}

        {/* Quick action buttons */}
        {!isCompleted && (
          <>
            {job.customer.phone && (
              <a
                href={`tel:${job.customer.phone}`}
                className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
            {job.address && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(job.address + (job.city ? `, ${job.city}` : ""))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <Navigation2 className="w-4 h-4" />
              </a>
            )}
          </>
        )}
      </div>

      {/* Notes */}
      {job.notes && (
        <div className="mt-2 text-xs text-slate-400 bg-slate-50 rounded-lg p-2">
          {job.notes}
        </div>
      )}
    </div>
  );
}

function FieldTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const tick = () => {
      const diff = Date.now() - start;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(
        h > 0
          ? `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`
          : `${m}m ${s.toString().padStart(2, "0")}s`
      );
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return <div className="text-sm font-bold text-amber-700 font-mono tabular-nums">{elapsed}</div>;
}
