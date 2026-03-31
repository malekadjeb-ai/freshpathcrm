"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { fetchJson, formatCurrency } from "@/lib/utils";

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

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface RecurringJobDialogProps {
  open: boolean;
  onClose: () => void;
}

export function RecurringJobDialog({ open, onClose }: RecurringJobDialogProps) {
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
        selectedSvcs.map((s) => ({ serviceItemId: s.id, name: s.name, price: s.price, quantity: 1 }))
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
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v ?? "", vehicleId: "" })}>
              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {selectedCustomer && selectedCustomer.vehicles.length > 0 && (
            <div className="space-y-1.5">
              <Label>Vehicle</Label>
              <Select value={form.vehicleId} onValueChange={(v) => setForm({ ...form, vehicleId: v ?? "" })}>
                <SelectTrigger><SelectValue placeholder="Select vehicle (optional)" /></SelectTrigger>
                <SelectContent>
                  {selectedCustomer.vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.year} {v.make} {v.model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
                  {DAY_LABELS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Time of Day</Label>
              <Input type="time" value={form.timeOfDay} onChange={(e) => setForm({ ...form, timeOfDay: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>First Run Date</Label>
              <Input type="date" value={form.nextRunDate} onChange={(e) => setForm({ ...form, nextRunDate: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Optional" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes for each generated job" />
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
