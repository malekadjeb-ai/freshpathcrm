"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import {
  ArrowLeft, ChevronRight, MapPin, Car, Calendar, FileText, Trash2, Pencil, RotateCcw,
  UserCheck, Navigation, Gauge, ClipboardCheck, CheckCircle, PenTool, Send, Play, Square, Timer,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import dynamic from "next/dynamic";

const SignaturePad = dynamic(
  () => import("@/components/signature-pad").then((m) => ({ default: m.SignaturePad })),
  { ssr: false, loading: () => <div className="animate-pulse bg-slate-100 rounded h-32" /> }
);
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  formatCurrency, formatDate, formatDateTime, fetchJson,
  JOB_STATUS_LABELS, JOB_STATUS_COLORS, JOB_STATUSES, type JobStatus,
  LOCATION_LABELS,
} from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import { PhotoUpload } from "@/components/photo-upload";

interface JobDetail {
  id: string;
  status: string;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  address: string | null;
  city: string | null;
  location: string;
  subtotal: number;
  discount: number;
  discountType: string;
  total: number;
  notes: string | null;
  internalNotes: string | null;
  photos: string;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    tags: { id: string; name: string; color: string }[];
  };
  vehicle: { id: string; make: string; model: string; year: number; color: string | null; vehicleType: string } | null;
  services: { id: string; customName: string | null; price: number; quantity: number; serviceItem: { id: string | null; name: string | null; category: string | null } }[];
  invoice: { id: string; invoiceNumber: string; status: string; total: number } | null;
  statusHistory: { id: string; fromStatus: string | null; toStatus: string; createdAt: string; note: string | null }[];
  travelTime: number | null;
  mileage: number | null;
  customerSignature: string | null;
  showInGallery: boolean;
  assignedToId: string | null;
  assignedStaff: { id: string; name: string; color: string; role: string; phone: string | null } | null;
}

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: job, isLoading, isError, refetch } = useQuery<JobDetail>({
    queryKey: ["job", params.id],
    queryFn: () => fetchJson(`/api/jobs/${params.id}`),
  });

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch(`/api/jobs/${params.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job", params.id] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: params.id }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ["job", params.id] });
      toast.success("Invoice created");
      router.push(`/invoices/${invoice.id}`);
    },
    onError: () => toast.error("Failed to create invoice"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/jobs/${params.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job deleted");
      router.push("/jobs");
    },
    onError: () => toast.error("Failed to delete job"),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-slate-100 rounded animate-pulse" />
        <div className="h-48 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (isError || !job || "error" in (job as object)) {
    return <ErrorState message="Failed to load job." onRetry={refetch} />;
  }

  const status = job.status as JobStatus;
  const discountAmount =
    job.discountType === "percent" ? job.subtotal * (job.discount / 100) : job.discount;

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
        <Link href="/jobs" className="hover:text-slate-900 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Jobs
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900">Job Detail</span>
      </div>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span
                className={`text-sm px-3 py-1 rounded-full font-medium ${JOB_STATUS_COLORS[status] ?? "bg-slate-100 text-slate-600"}`}
              >
                {JOB_STATUS_LABELS[status] ?? job.status}
              </span>
              {job.scheduledAt && (
                <span className="text-sm text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(job.scheduledAt)} at {new Date(job.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900">{job.customer.name}</h1>
            {job.vehicle && (
              <p className="text-slate-500 text-sm flex items-center gap-1.5 mt-1">
                <Car className="w-3.5 h-3.5" />
                {job.vehicle.year} {job.vehicle.make} {job.vehicle.model}
                {job.vehicle.color ? ` — ${job.vehicle.color}` : ""}
                <span className="text-slate-400">({job.vehicle.vehicleType})</span>
              </p>
            )}
            {(job.address || job.city) && (
              <p className="text-slate-500 text-sm flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
                {[job.address, job.city].filter(Boolean).join(", ")}
                {" · "}
                {LOCATION_LABELS[job.location as keyof typeof LOCATION_LABELS] ?? job.location}
              </p>
            )}
          </div>

          <div className="flex items-start gap-3">
            <div className="text-right">
              <div className="text-3xl font-bold text-emerald-600">{formatCurrency(job.total)}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                {job.services.length} service{job.services.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        </div>

        {/* Live Timer */}
        {job.status === "InProgress" && job.startedAt && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
            <Timer className="w-5 h-5 text-amber-600 animate-pulse" />
            <div>
              <div className="text-xs text-amber-600 font-medium">Job In Progress</div>
              <LiveTimer startedAt={job.startedAt} />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-5 pt-5 border-t border-slate-100 flex-wrap">
          {/* On My Way button */}
          {job.status === "Scheduled" && (
            <Button
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
              onClick={() => {
                statusMutation.mutate("EnRoute");
                toast.success("Customer notified! On my way.");
              }}
              disabled={statusMutation.isPending}
            >
              <Send className="w-4 h-4 mr-2" />
              On My Way
            </Button>
          )}

          {/* Start Job button */}
          {(job.status === "Scheduled" || job.status === "EnRoute") && (
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => statusMutation.mutate("InProgress")}
              disabled={statusMutation.isPending}
            >
              <Play className="w-4 h-4 mr-2" />
              Start Job
            </Button>
          )}

          {/* Complete Job button */}
          {job.status === "InProgress" && (
            <Button
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={() => statusMutation.mutate("Completed")}
              disabled={statusMutation.isPending}
            >
              <Square className="w-4 h-4 mr-2" />
              Complete Job
            </Button>
          )}

          {job.status !== "Cancelled" && job.status !== "Paid" && (
            <div className="flex items-center gap-2">
              <Select onValueChange={(v) => statusMutation.mutate(String(v ?? ""))}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="More..." />
                </SelectTrigger>
                <SelectContent>
                  {JOB_STATUSES.filter((s) => s !== job.status).map((s) => (
                    <SelectItem key={s} value={s}>
                      {JOB_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(job.status === "Completed" || job.status === "Invoiced") && !job.invoice && (
            <Button
              className="bg-purple-500 hover:bg-purple-600 text-white"
              onClick={() => createInvoiceMutation.mutate()}
              disabled={createInvoiceMutation.isPending}
            >
              <FileText className="w-4 h-4 mr-2" />
              {createInvoiceMutation.isPending ? "Creating..." : "Create Invoice"}
            </Button>
          )}

          {job.invoice && (
            <Link href={`/invoices/${job.invoice.id}`}>
              <Button variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Invoice {job.invoice.invoiceNumber}
              </Button>
            </Link>
          )}

          <Link href={`/jobs/${params.id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-4 w-4 mr-2" />
              Edit Job
            </Button>
          </Link>

          {job.status === "Completed" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const p = new URLSearchParams({
                  customerId: job.customer.id,
                  ...(job.vehicle ? { vehicleId: job.vehicle.id } : {}),
                  rebook: "true",
                });
                router.push(`/jobs/new?${p.toString()}`);
              }}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Rebook
            </Button>
          )}

          <div className="ml-auto">
            <AlertDialog>
              <AlertDialogTrigger render={
                <Button variant="outline" size="icon" className="text-red-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </Button>
              } />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete job?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this job and all associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-500 hover:bg-red-600"
                    onClick={() => deleteMutation.mutate()}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Services */}
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

          {/* Notes */}
          {(job.notes || job.internalNotes) && (
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
          )}

          {/* Photos */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Photos</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Show in Gallery</span>
                  <Switch
                    checked={job.showInGallery}
                    onCheckedChange={(checked) => {
                      fetch(`/api/jobs/${params.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ showInGallery: checked }),
                      }).then(() => {
                        queryClient.invalidateQueries({ queryKey: ["job", params.id] });
                        toast.success(checked ? "Added to gallery" : "Removed from gallery");
                      });
                    }}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <PhotoUpload
                jobId={params.id}
                photos={job.photos ? JSON.parse(job.photos) : []}
              />
            </CardContent>
          </Card>

          {/* Checklists */}
          <JobChecklists jobId={params.id} />

          {/* Customer Signature */}
          <CustomerSignatureCard
            jobId={params.id}
            signature={job.customerSignature}
            onUpdate={() => queryClient.invalidateQueries({ queryKey: ["job", params.id] })}
          />

          {/* Status History */}
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
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer */}
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

          {/* Assigned Technician */}
          <TechnicianAssignment
            jobId={params.id}
            assignedStaff={job.assignedStaff}
            onUpdate={() => {
              queryClient.invalidateQueries({ queryKey: ["job", params.id] });
            }}
          />

          {/* Timeline */}
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

          {/* Route & Mileage */}
          <RouteAndMileage
            jobId={params.id}
            travelTime={job.travelTime}
            mileage={job.mileage}
            onUpdate={() => {
              queryClient.invalidateQueries({ queryKey: ["job", params.id] });
            }}
          />

          {/* Invoice */}
          {job.invoice && (
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
          )}
        </div>
      </div>
    </div>
  );
}

function TechnicianAssignment({
  jobId,
  assignedStaff,
  onUpdate,
}: {
  jobId: string;
  assignedStaff: { id: string; name: string; color: string; role: string; phone: string | null } | null;
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

function RouteAndMileage({
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

interface JobChecklistData {
  id: string;
  checklistId: string;
  checklistName: string;
  completedAt: string | null;
  items: { label: string; required: boolean; checked: boolean; note?: string }[];
}

interface ChecklistTemplate {
  id: string;
  name: string;
  items: { label: string; required: boolean }[];
  isActive: boolean;
}

function JobChecklists({ jobId }: { jobId: string }) {
  const queryClient = useQueryClient();

  const { data: jobChecklists = [] } = useQuery<JobChecklistData[]>({
    queryKey: ["job-checklists", jobId],
    queryFn: () => fetchJson(`/api/jobs/${jobId}/checklists`),
  });

  const { data: templates = [] } = useQuery<ChecklistTemplate[]>({
    queryKey: ["checklists-active"],
    queryFn: () => fetchJson("/api/checklists?active=true"),
  });

  const attachMutation = useMutation({
    mutationFn: async (checklistId: string) => {
      const res = await fetch(`/api/jobs/${jobId}/checklists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklistId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-checklists", jobId] });
      toast.success("Checklist added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ jcId, items }: { jcId: string; items: JobChecklistData["items"] }) => {
      const res = await fetch(`/api/jobs/${jobId}/checklists/${jcId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-checklists", jobId] });
    },
    onError: () => toast.error("Failed to update checklist"),
  });

  const removeMutation = useMutation({
    mutationFn: async (jcId: string) => {
      const res = await fetch(`/api/jobs/${jobId}/checklists/${jcId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-checklists", jobId] });
      toast.success("Checklist removed");
    },
    onError: () => toast.error("Failed to remove"),
  });

  const toggleItem = (jc: JobChecklistData, itemIndex: number) => {
    const newItems = jc.items.map((item, i) =>
      i === itemIndex ? { ...item, checked: !item.checked } : item
    );
    updateMutation.mutate({ jcId: jc.id, items: newItems });
  };

  const attachedIds = new Set(jobChecklists.map((jc) => jc.checklistId));
  const availableTemplates = templates.filter((t) => !attachedIds.has(t.id));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-emerald-500" />
            Checklists
          </CardTitle>
          {availableTemplates.length > 0 && (
            <Select onValueChange={(v) => { const val = String(v ?? ""); if (val) attachMutation.mutate(val); }}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue placeholder="Add checklist..." />
              </SelectTrigger>
              <SelectContent>
                {availableTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {jobChecklists.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">
            No checklists attached.{" "}
            {templates.length > 0 ? "Use the dropdown above to add one." : "Create checklist templates first."}
          </p>
        ) : (
          <div className="space-y-4">
            {jobChecklists.map((jc) => {
              const total = jc.items.length;
              const checked = jc.items.filter((i) => i.checked).length;
              const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
              return (
                <div key={jc.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-slate-900">{jc.checklistName}</span>
                      {jc.completedAt ? (
                        <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Complete
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400">{checked}/{total}</span>
                      )}
                    </div>
                    <button
                      onClick={() => removeMutation.mutate(jc.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <Progress value={pct} className="h-1.5 mb-3" />
                  <div className="space-y-2">
                    {jc.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2.5">
                        <Checkbox
                          checked={item.checked}
                          onCheckedChange={() => toggleItem(jc, idx)}
                        />
                        <span className={`text-sm ${item.checked ? "line-through text-slate-400" : "text-slate-700"}`}>
                          {item.label}
                        </span>
                        {item.required && !item.checked && (
                          <span className="text-[10px] text-red-400 font-medium">Required</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LiveTimer({ startedAt }: { startedAt: string }) {
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

  return <div className="text-lg font-bold text-amber-700 font-mono tabular-nums">{elapsed}</div>;
}

function CustomerSignatureCard({
  jobId,
  signature,
  onUpdate,
}: {
  jobId: string;
  signature: string | null;
  onUpdate: () => void;
}) {
  const [showPad, setShowPad] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async (dataUrl: string) => {
      const res = await fetch(`/api/jobs/${jobId}/signature`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature: dataUrl }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      onUpdate();
      setShowPad(false);
      toast.success("Signature saved");
    },
    onError: () => toast.error("Failed to save signature"),
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/jobs/${jobId}/signature`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      onUpdate();
      toast.success("Signature removed");
    },
    onError: () => toast.error("Failed to remove signature"),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <PenTool className="w-4 h-4 text-emerald-500" />
            Customer Signature
          </CardTitle>
          {signature && !showPad && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowPad(true)}
                className="text-xs text-slate-400 hover:text-emerald-600 transition-colors"
              >
                Re-sign
              </button>
              <button
                onClick={() => clearMutation.mutate()}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {showPad ? (
          <SignaturePad
            onSave={(dataUrl) => saveMutation.mutate(dataUrl)}
            onCancel={() => setShowPad(false)}
            saving={saveMutation.isPending}
          />
        ) : signature ? (
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={signature}
              alt="Customer signature"
              className="max-w-full h-auto max-h-32 mx-auto"
            />
            <p className="text-xs text-slate-400 text-center mt-2">Signed by customer</p>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-slate-400 mb-3">No signature captured</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPad(true)}
            >
              <PenTool className="w-3.5 h-3.5 mr-1.5" />
              Capture Signature
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
