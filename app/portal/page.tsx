"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  Car,
  Clock,
  CreditCard,
  FileText,
  CheckCircle,
  XCircle,
  ChevronRight,
  Loader2,
  ExternalLink,
  Star,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface PortalData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  vehicles: Array<{
    id: string;
    year: number;
    make: string;
    model: string;
    color: string | null;
  }>;
  upcomingJobs: Array<{
    id: string;
    scheduledAt: string;
    status: string;
    services: Array<{ serviceItem: { name: string } | null; customName?: string | null }>;
    total: number;
    address: string | null;
  }>;
  completedJobs: Array<{
    id: string;
    completedAt: string;
    services: Array<{ serviceItem: { name: string } | null; customName?: string | null }>;
    total: number;
    photos: string;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    total: number;
    paymentLink: string | null;
    dueDate: string | null;
    payments: Array<{ amount: number }>;
  }>;
  subscriptions: Array<{
    id: string;
    status: string;
    plan: { name: string; monthlyPrice: number };
    vehicle: { year: number; make: string; model: string } | null;
    nextServiceDate: string | null;
    nextBillingDate: string;
  }>;
}

interface Estimate {
  id: string;
  estimateNumber: string;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  notes: string | null;
  createdAt: string;
  validUntil: string | null;
  lineItems: Array<{ name: string; description: string | null; price: number; quantity: number }>;
  vehicle: { year: number; make: string; model: string } | null;
}

type Tab = "home" | "appointments" | "estimates" | "invoices" | "vehicles";

export default function PortalDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("home");
  const [declineEstimateId, setDeclineEstimateId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  const { data, isLoading, isError } = useQuery<PortalData>({
    queryKey: ["portal-me"],
    queryFn: async () => {
      const res = await fetch("/api/portal/me");
      if (res.status === 401) throw new Error("unauthorized");
      return res.json();
    },
    retry: false,
  });

  const { data: estimates = [] } = useQuery<Estimate[]>({
    queryKey: ["portal-estimates"],
    queryFn: async () => {
      const res = await fetch("/api/portal/estimates");
      if (res.status === 401) throw new Error("unauthorized");
      return res.json();
    },
    retry: false,
    enabled: !!data,
  });

  const respondMutation = useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: string; reason?: string }) => {
      const res = await fetch(`/api/portal/estimates/${id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["portal-estimates"] });
      queryClient.invalidateQueries({ queryKey: ["portal-me"] });
      toast.success(vars.action === "approve" ? "Estimate approved!" : "Estimate declined");
      setDeclineEstimateId(null);
      setDeclineReason("");
    },
    onError: () => toast.error("Failed to respond to estimate"),
  });

  useEffect(() => {
    if (isError) router.push("/portal/login");
  }, [isError, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const firstName = data.name.split(" ")[0];
  const unpaidInvoices = data.invoices.filter((inv) => inv.status !== "Paid");
  const pendingEstimates = estimates.filter((e) => ["Sent", "Viewed"].includes(e.status));

  const TABS: { key: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: "home", label: "Home", icon: <Star className="w-4 h-4" /> },
    { key: "appointments", label: "Jobs", icon: <Calendar className="w-4 h-4" /> },
    { key: "estimates", label: "Estimates", icon: <FileText className="w-4 h-4" />, badge: pendingEstimates.length },
    { key: "invoices", label: "Invoices", icon: <CreditCard className="w-4 h-4" />, badge: unpaidInvoices.length },
    { key: "vehicles", label: "Vehicles", icon: <Car className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-emerald-500 text-white px-4 py-5">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center">
              <span className="font-bold text-lg">{firstName[0]}</span>
            </div>
            <div>
              <h1 className="text-lg font-bold">Welcome back, {firstName}!</h1>
              <p className="text-emerald-100 text-sm">Fresh Path Mobile Detailing</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors relative ${
                tab === t.key
                  ? "border-emerald-500 text-emerald-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.icon}
              {t.label}
              {(t.badge ?? 0) > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* HOME TAB */}
        {tab === "home" && (
          <>
            {/* Quick actions */}
            {pendingEstimates.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <h2 className="text-sm font-semibold text-amber-800 mb-2">Action Needed</h2>
                <p className="text-sm text-amber-700">
                  You have {pendingEstimates.length} estimate{pendingEstimates.length > 1 ? "s" : ""} waiting for your response.
                </p>
                <Button size="sm" className="mt-2" onClick={() => setTab("estimates")}>
                  View Estimates <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}

            {/* Upcoming */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-emerald-500" />
                Upcoming Appointments
              </h2>
              {data.upcomingJobs.length === 0 ? (
                <p className="text-sm text-slate-500 mb-3">No upcoming appointments.</p>
              ) : (
                <div className="space-y-2 mb-3">
                  {data.upcomingJobs.map((job) => (
                    <div key={job.id} className="p-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm text-slate-900">
                          {job.services.map((s) => s.serviceItem?.name || s.customName || "Custom").join(", ")}
                        </div>
                        <div className="text-sm font-semibold text-emerald-600">
                          {formatCurrency(job.total)}
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(job.scheduledAt)}
                        </span>
                        <span className="inline-flex px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-medium">
                          {job.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Button variant="outline" className="w-full" onClick={() => window.open("/book", "_blank")}>
                Book New Service
              </Button>
            </div>

            {/* Unpaid Invoices */}
            {unpaidInvoices.length > 0 && (
              <div className="bg-white rounded-2xl border border-amber-200 p-4">
                <h2 className="text-sm font-semibold text-amber-700 flex items-center gap-2 mb-3">
                  <CreditCard className="w-4 h-4" />
                  Outstanding Invoices
                </h2>
                <div className="space-y-2">
                  {unpaidInvoices.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
                      <div>
                        <div className="text-sm font-medium text-slate-900">#{inv.invoiceNumber}</div>
                        <div className="text-xs text-slate-500">{inv.status}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{formatCurrency(inv.total)}</span>
                        {inv.paymentLink && (
                          <Button size="sm" onClick={() => window.open(inv.paymentLink!, "_blank")}>
                            Pay Now
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-emerald-500" />
                Recent Services
              </h2>
              {data.completedJobs.length === 0 ? (
                <p className="text-sm text-slate-500">No completed services yet.</p>
              ) : (
                <div className="space-y-2">
                  {data.completedJobs.slice(0, 5).map((job) => (
                    <div key={job.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {job.services.map((s) => s.serviceItem?.name || s.customName || "Custom").join(", ")}
                        </div>
                        <div className="text-xs text-slate-500">
                          {job.completedAt ? formatDate(job.completedAt) : "Completed"}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-slate-900">
                        {formatCurrency(job.total)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* APPOINTMENTS TAB */}
        {tab === "appointments" && (
          <>
            <h2 className="text-base font-bold text-slate-900">My Appointments</h2>
            {data.upcomingJobs.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Upcoming</h3>
                <div className="space-y-2">
                  {data.upcomingJobs.map((job) => (
                    <div key={job.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-slate-900">
                            {job.services.map((s) => s.serviceItem?.name || s.customName || "Custom").join(", ")}
                          </div>
                          <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                            <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(job.scheduledAt)}</div>
                            {job.address && <div className="flex items-center gap-1"><ExternalLink className="w-3 h-3" /> {job.address}</div>}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-emerald-600">{formatCurrency(job.total)}</div>
                          <span className="inline-flex px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-medium mt-1">
                            {job.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {data.completedJobs.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 mt-4">Completed</h3>
                <div className="space-y-2">
                  {data.completedJobs.map((job) => (
                    <div key={job.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-slate-900 text-sm">
                            {job.services.map((s) => s.serviceItem?.name || s.customName || "Custom").join(", ")}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {job.completedAt ? formatDate(job.completedAt) : "Done"}
                          </div>
                        </div>
                        <div className="font-semibold text-sm">{formatCurrency(job.total)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {data.upcomingJobs.length === 0 && data.completedJobs.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-sm">
                No appointments yet.
              </div>
            )}
            <Button className="w-full mt-4" onClick={() => window.open("/book", "_blank")}>
              Book New Service
            </Button>
          </>
        )}

        {/* ESTIMATES TAB */}
        {tab === "estimates" && (
          <>
            <h2 className="text-base font-bold text-slate-900">My Estimates</h2>
            {estimates.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">No estimates yet.</div>
            ) : (
              <div className="space-y-3">
                {estimates.map((est) => {
                  const isPending = ["Sent", "Viewed"].includes(est.status);
                  const statusColor: Record<string, string> = {
                    Draft: "bg-slate-100 text-slate-700",
                    Sent: "bg-blue-100 text-blue-700",
                    Viewed: "bg-blue-100 text-blue-700",
                    Accepted: "bg-emerald-100 text-emerald-700",
                    Declined: "bg-red-100 text-red-700",
                    Expired: "bg-slate-100 text-slate-500",
                  };

                  return (
                    <div key={est.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-medium text-slate-900">Estimate #{est.estimateNumber}</div>
                          <div className="text-xs text-slate-500">{formatDate(est.createdAt)}</div>
                          {est.vehicle && (
                            <div className="text-xs text-slate-400 mt-0.5">
                              {est.vehicle.year} {est.vehicle.make} {est.vehicle.model}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg text-slate-900">{formatCurrency(est.total)}</div>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColor[est.status] || "bg-slate-100 text-slate-600"}`}>
                            {est.status}
                          </span>
                        </div>
                      </div>

                      {/* Line items */}
                      <div className="border-t border-slate-100 pt-2 space-y-1">
                        {est.lineItems.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-slate-600">
                              {item.name}
                              {item.quantity > 1 && ` x${item.quantity}`}
                            </span>
                            <span className="text-slate-900">{formatCurrency(item.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Actions for pending estimates */}
                      {isPending && (
                        <div className="mt-4 pt-3 border-t border-slate-100">
                          {declineEstimateId === est.id ? (
                            <div className="space-y-2">
                              <Textarea
                                placeholder="Reason for declining (optional)"
                                value={declineReason}
                                onChange={(e) => setDeclineReason(e.target.value)}
                                rows={2}
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => { setDeclineEstimateId(null); setDeclineReason(""); }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => respondMutation.mutate({ id: est.id, action: "decline", reason: declineReason })}
                                  disabled={respondMutation.isPending}
                                >
                                  {respondMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />}
                                  Confirm Decline
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Button
                                className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                                onClick={() => respondMutation.mutate({ id: est.id, action: "approve" })}
                                disabled={respondMutation.isPending}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setDeclineEstimateId(est.id)}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Decline
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* INVOICES TAB */}
        {tab === "invoices" && (
          <>
            <h2 className="text-base font-bold text-slate-900">My Invoices</h2>
            {data.invoices.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">No invoices yet.</div>
            ) : (
              <div className="space-y-2">
                {data.invoices.map((inv) => {
                  const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
                  const statusColor: Record<string, string> = {
                    Draft: "bg-slate-100 text-slate-700",
                    Sent: "bg-blue-100 text-blue-700",
                    Paid: "bg-emerald-100 text-emerald-700",
                    Overdue: "bg-red-100 text-red-700",
                  };
                  return (
                    <div key={inv.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-slate-900">#{inv.invoiceNumber}</div>
                          {inv.dueDate && (
                            <div className="text-xs text-slate-500">Due {formatDate(inv.dueDate)}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-900">{formatCurrency(inv.total)}</div>
                          {paid > 0 && paid < inv.total && (
                            <div className="text-xs text-emerald-600">Paid: {formatCurrency(paid)}</div>
                          )}
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium mt-1 ${statusColor[inv.status] || "bg-slate-100 text-slate-600"}`}>
                            {inv.status}
                          </span>
                        </div>
                      </div>
                      {inv.status !== "Paid" && inv.paymentLink && (
                        <Button
                          className="w-full mt-3 bg-emerald-500 hover:bg-emerald-600"
                          size="sm"
                          onClick={() => window.open(inv.paymentLink!, "_blank")}
                        >
                          Pay Now
                        </Button>
                      )}
                      {inv.status !== "Paid" && !inv.paymentLink && (
                        <div className="mt-3 text-center text-xs text-slate-400 py-2 bg-slate-50 rounded-lg">
                          Online payments coming soon
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* VEHICLES TAB */}
        {tab === "vehicles" && (
          <>
            <h2 className="text-base font-bold text-slate-900">My Vehicles</h2>
            {data.vehicles.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">No vehicles on file.</div>
            ) : (
              <div className="space-y-2">
                {data.vehicles.map((v) => (
                  <div key={v.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                      <Car className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{v.year} {v.make} {v.model}</div>
                      {v.color && <div className="text-xs text-slate-500">{v.color}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
