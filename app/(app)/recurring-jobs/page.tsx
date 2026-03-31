"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import {
  RefreshCw, Plus, Pause, Play, Trash2, Calendar, Search, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { fetchJson, formatCurrency, formatDate } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";

interface RecurringJobData {
  id: string;
  customerId: string;
  customer: { id: string; name: string; phone: string | null; email: string | null };
  vehicleId: string | null;
  vehicle: { id: string; make: string; model: string; year: number } | null;
  frequency: string;
  dayOfWeek: number | null;
  timeOfDay: string | null;
  services: string;
  addOns: string | null;
  location: string;
  address: string | null;
  totalPrice: number | null;
  notes: string | null;
  isActive: boolean;
  nextRunDate: string | null;
  lastRunDate: string | null;
  jobsCreated: number;
  createdAt: string;
}

interface CustomerOption {
  id: string;
  name: string;
  vehicles: { id: string; make: string; model: string; year: number }[];
}

interface ServiceOption {
  id: string;
  name: string;
  price: number;
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 Weeks",
  monthly: "Monthly",
  quarterly: "Quarterly",
};

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const FREQUENCY_COLORS: Record<string, string> = {
  weekly: "bg-blue-100 text-blue-700",
  biweekly: "bg-indigo-100 text-indigo-700",
  monthly: "bg-purple-100 text-purple-700",
  quarterly: "bg-amber-100 text-amber-700",
};

export default function RecurringJobsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);

  const { data: recurringJobs = [], isLoading, isError, refetch } = useQuery<RecurringJobData[]>({
    queryKey: ["recurring-jobs", filterActive],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filterActive !== "all") params.set("active", filterActive);
      return fetchJson(`/api/recurring-jobs?${params}`);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/recurring-jobs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-jobs"] });
      toast.success("Updated");
    },
    onError: () => toast.error("Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/recurring-jobs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-jobs"] });
      toast.success("Deleted");
    },
    onError: () => toast.error("Failed to delete"),
  });

  const generateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/recurring-jobs/${id}/generate`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job created from recurring template");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = recurringJobs.filter((rj) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      rj.customer.name.toLowerCase().includes(q) ||
      rj.location.toLowerCase().includes(q)
    );
  });

  const activeCount = recurringJobs.filter((r) => r.isActive).length;
  const pausedCount = recurringJobs.filter((r) => !r.isActive).length;
  const dueSoon = recurringJobs.filter((r) => {
    if (!r.isActive || !r.nextRunDate) return false;
    const days = Math.ceil((new Date(r.nextRunDate).getTime() - Date.now()) / 86400000);
    return days <= 3;
  }).length;

  function parseServices(json: string): { serviceItemId: string; price: number; quantity: number; name?: string }[] {
    try { return JSON.parse(json); } catch { return []; }
  }

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recurring Jobs</h1>
          <p className="text-sm text-slate-500 mt-1">Manage automatically scheduled repeat services</p>
        </div>
        <Button
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Recurring Job
        </Button>
      </div>

      {isError && <ErrorState message="Failed to load recurring jobs." onRetry={refetch} />}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-slate-900">{recurringJobs.length}</div>
            <div className="text-xs text-slate-500">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-emerald-600">{activeCount}</div>
            <div className="text-xs text-slate-500">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-slate-400">{pausedCount}</div>
            <div className="text-xs text-slate-500">Paused</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-amber-600">{dueSoon}</div>
            <div className="text-xs text-slate-500">Due Soon</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by customer or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterActive} onValueChange={(v) => setFilterActive(v ?? "all")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Paused</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={RefreshCw}
          title="No recurring jobs found"
          description="Create one to auto-schedule repeat services for your customers."
          actionLabel="New Recurring Job"
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((rj) => {
            const services = parseServices(rj.services);
            const daysSinceRun = rj.lastRunDate
              ? Math.ceil((Date.now() - new Date(rj.lastRunDate).getTime()) / 86400000)
              : null;

            return (
              <Card key={rj.id} className={!rj.isActive ? "opacity-60" : ""}>
                <CardContent className="py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Link href={`/customers/${rj.customer.id}`} className="font-medium text-slate-900 hover:text-emerald-600 truncate">
                          {rj.customer.name}
                        </Link>
                        <Badge className={FREQUENCY_COLORS[rj.frequency] || "bg-slate-100 text-slate-600"}>
                          {FREQUENCY_LABELS[rj.frequency] || rj.frequency}
                        </Badge>
                        {!rj.isActive && (
                          <Badge className="bg-slate-200 text-slate-500">Paused</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                        {rj.vehicle && (
                          <span>{rj.vehicle.year} {rj.vehicle.make} {rj.vehicle.model}</span>
                        )}
                        {services.length > 0 && (
                          <span>{services.map((s) => s.name || s.serviceItemId).join(", ")}</span>
                        )}
                        {rj.totalPrice !== null && (
                          <span className="font-medium text-emerald-600">{formatCurrency(rj.totalPrice)}</span>
                        )}
                      </div>
                      <div className="flex gap-x-4 mt-1 text-xs text-slate-400">
                        {rj.dayOfWeek !== null && (
                          <span>{DAY_LABELS[rj.dayOfWeek]}{rj.timeOfDay ? ` at ${rj.timeOfDay}` : ""}</span>
                        )}
                        {rj.nextRunDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Next: {formatDate(rj.nextRunDate)}
                          </span>
                        )}
                        {daysSinceRun !== null && (
                          <span>Last run: {daysSinceRun}d ago</span>
                        )}
                        <span>{rj.jobsCreated} jobs created</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {rj.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generateMutation.mutate(rj.id)}
                          disabled={generateMutation.isPending}
                          title="Generate next job now"
                        >
                          <Zap className="w-3.5 h-3.5 mr-1" />
                          Generate
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleMutation.mutate({ id: rj.id, isActive: !rj.isActive })}
                        title={rj.isActive ? "Pause" : "Resume"}
                      >
                        {rj.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                        onClick={() => deleteMutation.mutate(rj.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateRecurringJobDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}

function CreateRecurringJobDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    customerId: "",
    vehicleId: "",
    frequency: "monthly",
    dayOfWeek: "",
    timeOfDay: "",
    location: "Richmond",
    address: "",
    notes: "",
    nextRunDate: "",
    selectedServices: [] as string[],
  });

  const { data: customers = [] } = useQuery<CustomerOption[]>({
    queryKey: ["customers-list"],
    queryFn: async () => {
      const data = await fetchJson<Record<string, unknown>>("/api/customers?limit=500");
      const list = Array.isArray(data) ? data : ((data.customers as Record<string, unknown>[]) || []);
      return list.map((c) => ({ id: c.id as string, name: c.name as string, vehicles: (c.vehicles || []) as CustomerOption["vehicles"] }));
    },
    enabled: open,
  });

  const { data: serviceOptions = [] } = useQuery<ServiceOption[]>({
    queryKey: ["services-list"],
    queryFn: () => fetchJson<Record<string, unknown>[]>("/api/services").then((data) =>
      data.filter((s) => s.isActive !== false).map((s) => ({
        id: s.id as string,
        name: s.name as string,
        price: s.price as number,
      }))
    ),
    enabled: open,
  });

  const selectedCustomer = customers.find((c) => c.id === form.customerId);

  const createMutation = useMutation({
    mutationFn: async () => {
      const selectedSvcs = serviceOptions.filter((s) => form.selectedServices.includes(s.id));
      const servicesJson = JSON.stringify(
        selectedSvcs.map((s) => ({
          serviceItemId: s.id,
          name: s.name,
          price: s.price,
          quantity: 1,
        }))
      );
      const totalPrice = selectedSvcs.reduce((sum, s) => sum + s.price, 0);

      const res = await fetch("/api/recurring-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: form.customerId,
          vehicleId: form.vehicleId || null,
          frequency: form.frequency,
          dayOfWeek: form.dayOfWeek ? parseInt(form.dayOfWeek) : null,
          timeOfDay: form.timeOfDay || null,
          services: servicesJson,
          location: form.location,
          address: form.address || null,
          totalPrice,
          notes: form.notes || null,
          nextRunDate: form.nextRunDate || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-jobs"] });
      toast.success("Recurring job created");
      onClose();
      setForm({
        customerId: "", vehicleId: "", frequency: "monthly", dayOfWeek: "",
        timeOfDay: "", location: "Richmond", address: "", notes: "",
        nextRunDate: "", selectedServices: [],
      });
    },
    onError: () => toast.error("Failed to create recurring job"),
  });

  const toggleService = (id: string) => {
    setForm((prev) => ({
      ...prev,
      selectedServices: prev.selectedServices.includes(id)
        ? prev.selectedServices.filter((s) => s !== id)
        : [...prev.selectedServices, id],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Recurring Job</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Customer */}
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v ?? "", vehicleId: "" })}>
              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vehicle */}
          {selectedCustomer && selectedCustomer.vehicles.length > 0 && (
            <div className="space-y-1.5">
              <Label>Vehicle</Label>
              <Select value={form.vehicleId} onValueChange={(v) => setForm({ ...form, vehicleId: v ?? "" })}>
                <SelectTrigger><SelectValue placeholder="Select vehicle (optional)" /></SelectTrigger>
                <SelectContent>
                  {selectedCustomer.vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.year} {v.make} {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Services */}
          <div className="space-y-1.5">
            <Label>Services</Label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-lg p-2">
              {serviceOptions.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 rounded p-1">
                  <input
                    type="checkbox"
                    checked={form.selectedServices.includes(s.id)}
                    onChange={() => toggleService(s.id)}
                    className="rounded border-slate-300"
                  />
                  <span className="truncate">{s.name}</span>
                  <span className="text-slate-400 ml-auto">{formatCurrency(s.price)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v ?? "monthly" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Preferred Day</Label>
              <Select value={form.dayOfWeek} onValueChange={(v) => setForm({ ...form, dayOfWeek: v ?? "" })}>
                <SelectTrigger><SelectValue placeholder="Any day" /></SelectTrigger>
                <SelectContent>
                  {DAY_LABELS.map((d, i) => (
                    <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Time of Day</Label>
              <Input
                type="time"
                value={form.timeOfDay}
                onChange={(e) => setForm({ ...form, timeOfDay: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>First Run Date</Label>
              <Input
                type="date"
                value={form.nextRunDate}
                onChange={(e) => setForm({ ...form, nextRunDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional notes for each generated job"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
            disabled={!form.customerId || form.selectedServices.length === 0 || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            Create Recurring Job
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
