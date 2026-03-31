"use client";

import Link from "next/link";
import { UserCheck, Navigation, Gauge } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDate, formatDateTime, fetchJson, JOB_STATUS_LABELS, type JobStatus } from "@/lib/utils";
import { toast } from "sonner";
import type { JobDetail } from "./job-types";

interface JobServicesProps {
  job: JobDetail;
}

export function JobServices({ job }: JobServicesProps) {
  const discountAmount =
    job.discountType === "percent" ? job.subtotal * (job.discount / 100) : job.discount;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Services & Pricing</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {job.services.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-2">
              <div>
                <span className="font-medium text-sm text-slate-900">{s.serviceItem?.name || s.customName || "Custom Service"}</span>
                <Badge variant="secondary" className="ml-2 text-xs">
                  {s.serviceItem?.category || "Custom"}
                </Badge>
              </div>
              <span className="font-medium">{formatCurrency(s.price)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-100 mt-3 pt-3 space-y-1.5">
          <div className="flex justify-between text-sm text-slate-500">
            <span>Subtotal</span>
            <span>{formatCurrency(job.subtotal)}</span>
          </div>
          {job.discount > 0 && (
            <div className="flex justify-between text-sm text-red-500">
              <span>Discount ({job.discountType === "percent" ? `${job.discount}%` : ""})</span>
              <span>- {formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span className="text-emerald-600">{formatCurrency(job.total)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function JobNotes({ job }: { job: JobDetail }) {
  if (!job.notes && !job.internalNotes) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {job.notes && (
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Customer Notes</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{job.notes}</p>
          </div>
        )}
        {job.internalNotes && (
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Internal Notes</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{job.internalNotes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function JobStatusHistory({ job }: { job: JobDetail }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Status History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {job.statusHistory.map((h) => (
            <div key={h.id} className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
              <div className="flex-1">
                <div className="text-sm text-slate-700">
                  {h.fromStatus
                    ? `${JOB_STATUS_LABELS[h.fromStatus as JobStatus] ?? h.fromStatus} → `
                    : "Created → "}
                  <span className="font-medium">
                    {JOB_STATUS_LABELS[h.toStatus as JobStatus] ?? h.toStatus}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{formatDateTime(h.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function JobCustomerCard({ job }: { job: JobDetail }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Customer</CardTitle>
      </CardHeader>
      <CardContent>
        <Link
          href={`/customers/${job.customer.id}`}
          className="font-semibold text-slate-900 hover:text-emerald-600 transition-colors"
        >
          {job.customer.name}
        </Link>
        {job.customer.phone && (
          <p className="text-sm text-slate-500 mt-1">{job.customer.phone}</p>
        )}
        {job.customer.email && (
          <p className="text-sm text-slate-500">{job.customer.email}</p>
        )}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {job.customer.tags.map((tag) => (
            <span
              key={tag.id}
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: tag.color + "20", color: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function JobTimeline({ job }: { job: JobDetail }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Timeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {job.scheduledAt && (
          <div className="flex justify-between">
            <span className="text-slate-500">Scheduled</span>
            <span className="text-slate-700">{formatDate(job.scheduledAt)}</span>
          </div>
        )}
        {job.startedAt && (
          <div className="flex justify-between">
            <span className="text-slate-500">Started</span>
            <span className="text-slate-700">{formatDate(job.startedAt)}</span>
          </div>
        )}
        {job.completedAt && (
          <div className="flex justify-between">
            <span className="text-slate-500">Completed</span>
            <span className="text-slate-700">{formatDate(job.completedAt)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function JobInvoiceCard({ job }: { job: JobDetail }) {
  if (!job.invoice) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Invoice</CardTitle>
      </CardHeader>
      <CardContent>
        <Link href={`/invoices/${job.invoice.id}`} className="block">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-900">{job.invoice.invoiceNumber}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                job.invoice.status === "Paid"
                  ? "bg-emerald-100 text-emerald-700"
                  : job.invoice.status === "Overdue"
                  ? "bg-red-100 text-red-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {job.invoice.status}
            </span>
          </div>
          <div className="text-emerald-600 font-semibold mt-1">
            {formatCurrency(job.invoice.total)}
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}

export function TechnicianAssignment({
  jobId,
  assignedStaff,
  onUpdate,
}: {
  jobId: string;
  assignedStaff: JobDetail["assignedStaff"];
  onUpdate: () => void;
}) {
  const { data: staffList = [] } = useQuery<{ id: string; name: string; color: string; role: string; isActive: boolean }[]>({
    queryKey: ["staff-active"],
    queryFn: () => fetchJson("/api/staff?active=true"),
  });

  const assignMutation = useMutation({
    mutationFn: async (staffId: string | null) => {
      const res = await fetch(`/api/jobs/${jobId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      onUpdate();
      toast.success(assignMutation.variables ? "Technician assigned" : "Technician unassigned");
    },
    onError: () => toast.error("Failed to assign"),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-emerald-500" />
          Technician
        </CardTitle>
      </CardHeader>
      <CardContent>
        {assignedStaff ? (
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ backgroundColor: assignedStaff.color + "20", color: assignedStaff.color }}
            >
              {assignedStaff.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-slate-900 truncate">{assignedStaff.name}</p>
              {assignedStaff.phone && <p className="text-xs text-slate-400">{assignedStaff.phone}</p>}
            </div>
            <button
              onClick={() => assignMutation.mutate(null)}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              Remove
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-400 mb-2">No technician assigned</p>
        )}
        <Select
          value={assignedStaff?.id || ""}
          onValueChange={(v) => assignMutation.mutate(v || null)}
        >
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Assign technician..." />
          </SelectTrigger>
          <SelectContent>
            {staffList.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <span className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}

export function RouteAndMileage({
  jobId,
  travelTime,
  mileage,
  onUpdate,
}: {
  jobId: string;
  travelTime: number | null;
  mileage: number | null;
  onUpdate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editTravelTime, setEditTravelTime] = useState(travelTime ?? 0);
  const [editMileage, setEditMileage] = useState(mileage ?? 0);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          travelTime: editTravelTime || null,
          mileage: editMileage || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      onUpdate();
      setEditing(false);
      toast.success("Route info saved");
    },
    onError: () => toast.error("Failed to save"),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Navigation className="w-4 h-4 text-emerald-500" />
            Route & Mileage
          </CardTitle>
          {!editing && (
            <button
              onClick={() => {
                setEditTravelTime(travelTime ?? 0);
                setEditMileage(mileage ?? 0);
                setEditing(true);
              }}
              className="text-xs text-slate-400 hover:text-emerald-600 transition-colors"
            >
              {travelTime || mileage ? "Edit" : "Add"}
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Travel Time (minutes)</Label>
              <Input
                type="number"
                min="0"
                value={editTravelTime || ""}
                onChange={(e) => setEditTravelTime(parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mileage (miles)</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={editMileage || ""}
                onChange={(e) => setEditMileage(parseFloat(e.target.value) || 0)}
                placeholder="0.0"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : travelTime || mileage ? (
          <div className="space-y-2 text-sm">
            {travelTime != null && travelTime > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5" />
                  Travel Time
                </span>
                <span className="text-slate-700 font-medium">{travelTime} min</span>
              </div>
            )}
            {mileage != null && mileage > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5" />
                  Distance
                </span>
                <span className="text-slate-700 font-medium">{mileage} mi</span>
              </div>
            )}
            {travelTime != null && travelTime > 0 && mileage != null && mileage > 0 && (
              <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-2">
                <span className="text-slate-400 text-xs">Est. $/mile</span>
                <span className="text-xs text-slate-500">IRS rate: $0.67</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-2">No route info logged</p>
        )}
      </CardContent>
    </Card>
  );
}
