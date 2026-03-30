"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft, Phone, Mail, MapPin, Car, Briefcase, Plus, Send, Trash2, ChevronRight,
  MessageSquare, StickyNote, ArrowDownLeft, ArrowUpRight, Clock, Pencil,
  Heart, RefreshCw, Shield, Building2, User, CalendarIcon, CheckCircle2, Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  cn, formatCurrency, formatDate, formatDateTime, getInitials,
  JOB_STATUS_LABELS, JOB_STATUS_COLORS, type JobStatus, fetchJson,
} from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import { AIActionButton } from "@/components/ai/ai-action-button";
import { differenceInDays } from "date-fns";

interface CustomerDetailData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  phoneCarrier: string | null;
  address: string | null;
  city: string | null;
  zip: string | null;
  neighborhood: string | null;
  tags: { id: string; name: string; color: string }[];
  vehicles: {
    id: string;
    make: string;
    model: string;
    year: number;
    color: string | null;
    licensePlate: string | null;
    vehicleType: string;
  }[];
  jobs: {
    id: string;
    status: string;
    scheduledAt: string | null;
    total: number;
    vehicle: { make: string; model: string; year: number } | null;
    services: { serviceItem: { name: string } | null; customName?: string | null }[];
    invoice: { id: string; invoiceNumber: string } | null;
  }[];
  notes: { id: string; content: string; createdAt: string }[];
  referredBy: { id: string; name: string } | null;
  referrals: { id: string; name: string }[];
  totalSpent: number;
  source: string | null;
  sourceDetail: string | null;
  lifecycleStage: string;
  healthScore: number | null;
  lastContactedAt: string | null;
  lastJobAt: string | null;
  preferredContact: string;
  birthday: string | null;
  gateCode: string | null;
  specialInstructions: string | null;
  isCommercial: boolean;
  companyName: string | null;
  taxId: string | null;
  billingEmail: string | null;
  billingContact: string | null;
  paymentTerms: string | null;
  fleetSize: number | null;
  fleetDiscount: number | null;
  contractNotes: string | null;
}

interface CustomerCommunication {
  id: string;
  type: string;
  direction: string;
  status: string;
  summary: string | null;
  duration: number | null;
  createdAt: string;
  job: { id: string; status: string } | null;
}

const COMM_TYPE_ICONS: Record<string, React.ReactNode> = {
  call: <Phone className="w-3.5 h-3.5" />,
  sms: <MessageSquare className="w-3.5 h-3.5" />,
  email: <Mail className="w-3.5 h-3.5" />,
  note: <StickyNote className="w-3.5 h-3.5" />,
};

const COMM_TYPE_COLORS: Record<string, string> = {
  call: "bg-blue-50 text-blue-600",
  sms: "bg-green-50 text-green-600",
  email: "bg-purple-50 text-purple-600",
  note: "bg-amber-50 text-amber-600",
};

export default function CustomerPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [noteText, setNoteText] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [commOpen, setCommOpen] = useState(false);
  const [commType, setCommType] = useState("call");
  const [commDirection, setCommDirection] = useState("outbound");
  const [commSummary, setCommSummary] = useState("");
  const [activityOpen, setActivityOpen] = useState(false);
  const [actType, setActType] = useState<string>("CALL");
  const [actDirection, setActDirection] = useState<string>("OUTBOUND");
  const [actSummary, setActSummary] = useState("");
  const [actFollowUp, setActFollowUp] = useState("");
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({
    year: "",
    make: "",
    model: "",
    color: "",
    vehicleType: "Sedan",
    licensePlate: "",
  });

  const { data: customer, isLoading, isError, refetch } = useQuery<CustomerDetailData>({
    queryKey: ["customer", params.id],
    queryFn: () => fetchJson(`/api/customers/${params.id}`),
  });

  const { data: communications = [] } = useQuery<CustomerCommunication[]>({
    queryKey: ["communications", "customer", params.id],
    queryFn: () =>
      fetchJson(`/api/communications?customerId=${params.id}`),
    enabled: !!customer,
  });

  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/customers/${params.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", params.id] });
      setNoteText("");
      toast.success("Note added");
    },
    onError: () => toast.error("Failed to add note"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/customers/${params.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer deleted");
      router.push("/customers");
    },
    onError: () => toast.error("Failed to delete customer"),
  });

  const editMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(`/api/customers/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", params.id] });
      toast.success("Customer updated");
      setEditOpen(false);
    },
    onError: () => toast.error("Failed to update customer"),
  });

  const addVehicleMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/customers/${params.id}/vehicles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...vehicleForm,
          year: parseInt(vehicleForm.year, 10),
          color: vehicleForm.color || undefined,
          licensePlate: vehicleForm.licensePlate || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", params.id] });
      toast.success("Vehicle added");
      setVehicleOpen(false);
      setVehicleForm({ year: "", make: "", model: "", color: "", vehicleType: "Sedan", licensePlate: "" });
    },
    onError: () => toast.error("Failed to add vehicle"),
  });

  const logCommMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: params.id,
          type: commType,
          direction: commDirection,
          status: "completed",
          summary: commSummary || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communications", "customer", params.id] });
      toast.success("Communication logged");
      setCommOpen(false);
      setCommSummary("");
    },
    onError: () => toast.error("Failed to log communication"),
  });

  interface ActivityItem {
    id: string;
    type: string;
    direction: string | null;
    summary: string;
    followUpDate: string | null;
    followUpDone: boolean;
    createdAt: string;
  }

  const { data: activities = [] } = useQuery<ActivityItem[]>({
    queryKey: ["activities", params.id],
    queryFn: () => fetchJson(`/api/activities?customerId=${params.id}`),
    enabled: !!customer,
  });

  const logActivityMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: params.id,
          type: actType,
          direction: actType === "NOTE" ? null : actDirection,
          summary: actSummary,
          followUpDate: actFollowUp || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities", params.id] });
      queryClient.invalidateQueries({ queryKey: ["customer", params.id] });
      toast.success("Activity logged");
      setActivityOpen(false);
      setActSummary("");
      setActFollowUp("");
    },
    onError: () => toast.error("Failed to log activity"),
  });

  const markFollowUpDoneMutation = useMutation({
    mutationFn: async (activityId: string) => {
      const res = await fetch(`/api/activities/${activityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followUpDone: true }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities", params.id] });
      toast.success("Follow-up marked done");
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-32 bg-slate-100 rounded-xl animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !customer || "error" in (customer as object)) {
    return <ErrorState message="Failed to load customer." onRetry={refetch} />;
  }

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
        <Link href="/customers" className="hover:text-slate-900 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Customers
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900">{customer.name}</span>
      </div>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xl font-bold">
                {getInitials(customer.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{customer.name}</h1>
                {customer.isCommercial && (
                  <Badge className="bg-blue-100 text-blue-700 text-xs">
                    <Building2 className="w-3 h-3 mr-1" /> Fleet
                  </Badge>
                )}
              </div>
              {customer.companyName && (
                <p className="text-sm text-slate-500">{customer.companyName}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-slate-500">
                {customer.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    <a href={`tel:${customer.phone}`} className="hover:text-emerald-600 transition-colors">{customer.phone}</a>
                    <a href={`sms:${customer.phone}`} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Send SMS">
                      <MessageSquare className="w-3.5 h-3.5" />
                    </a>
                  </span>
                )}
                {customer.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />
                    <a href={`mailto:${customer.email}`} className="hover:text-emerald-600 transition-colors">{customer.email}</a>
                  </span>
                )}
                {customer.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {[customer.address, customer.neighborhood, customer.city, customer.zip]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {customer.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: tag.color + "20", color: tag.color }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-right mr-4">
              <div className="text-2xl font-bold text-emerald-600">
                {formatCurrency(customer.totalSpent)}
              </div>
              <div className="text-xs text-slate-500">Lifetime Value</div>
            </div>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Link href={`/jobs/new?customerId=${customer.id}`}>
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Book Job
              </Button>
            </Link>
            <AIActionButton type="next_action" label="AI: Next Action" customerId={customer.id} />
            <AIActionButton type="draft_message" label="AI: Draft Message" customerId={customer.id} />
            <AIActionButton type="upsell" label="AI: Upsell" customerId={customer.id} />
            <AlertDialog>
              <AlertDialogTrigger render={
                <Button variant="outline" size="icon" className="text-red-500 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </Button>
              } />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete customer?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete {customer.name} and all associated data. This cannot be undone.
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

        {/* Referral info */}
        {(customer.referredBy || customer.referrals.length > 0) && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex gap-6 text-sm">
            {customer.referredBy && (
              <span className="text-slate-500">
                Referred by{" "}
                <Link href={`/customers/${customer.referredBy.id}`} className="text-emerald-600 hover:underline">
                  {customer.referredBy.name}
                </Link>
              </span>
            )}
            {customer.referrals.length > 0 && (
              <span className="text-slate-500">
                Referred{" "}
                {customer.referrals.map((r, i) => (
                  <span key={r.id}>
                    <Link href={`/customers/${r.id}`} className="text-emerald-600 hover:underline">
                      {r.name}
                    </Link>
                    {i < customer.referrals.length - 1 && ", "}
                  </span>
                ))}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vehicles */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Car className="w-4 h-4 text-emerald-500" />
                  Vehicles ({customer.vehicles.length})
                </CardTitle>
                <Dialog open={vehicleOpen} onOpenChange={setVehicleOpen}>
                  <DialogTrigger render={
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Vehicle
                    </Button>
                  } />
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add Vehicle</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label>Year *</Label>
                          <Input
                            type="number"
                            placeholder="2024"
                            value={vehicleForm.year}
                            onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Make *</Label>
                          <Input
                            placeholder="Toyota"
                            value={vehicleForm.make}
                            onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Model *</Label>
                          <Input
                            placeholder="Camry"
                            value={vehicleForm.model}
                            onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>Color</Label>
                          <Input
                            placeholder="Black"
                            value={vehicleForm.color}
                            onChange={(e) => setVehicleForm({ ...vehicleForm, color: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Type *</Label>
                          <Select value={vehicleForm.vehicleType} onValueChange={(v) => setVehicleForm({ ...vehicleForm, vehicleType: v ?? "Sedan" })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {["Sedan", "SUV", "Truck", "Van", "Luxury"].map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>License Plate</Label>
                        <Input
                          placeholder="ABC-1234"
                          value={vehicleForm.licensePlate}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, licensePlate: e.target.value })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setVehicleOpen(false)}>Cancel</Button>
                      <Button
                        onClick={() => addVehicleMutation.mutate()}
                        disabled={!vehicleForm.year || !vehicleForm.make || !vehicleForm.model || addVehicleMutation.isPending}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white"
                      >
                        {addVehicleMutation.isPending ? "Adding..." : "Add Vehicle"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {customer.vehicles.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No vehicles on file</p>
              ) : (
                <div className="space-y-2">
                  {customer.vehicles.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3"
                    >
                      <div>
                        <span className="font-medium text-slate-900">
                          {v.year} {v.make} {v.model}
                        </span>
                        {v.color && (
                          <span className="text-slate-500 text-sm ml-2">({v.color})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {v.vehicleType}
                        </Badge>
                        {v.licensePlate && (
                          <span className="text-xs text-slate-400 font-mono">
                            {v.licensePlate}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Job History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-500" />
                Job History ({customer.jobs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customer.jobs.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No jobs yet</p>
              ) : (
                <div className="space-y-2">
                  {customer.jobs.map((job) => (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="flex items-center justify-between bg-slate-50 hover:bg-slate-100 rounded-lg px-4 py-3 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${JOB_STATUS_COLORS[job.status as JobStatus] ?? "bg-slate-100 text-slate-600"}`}
                          >
                            {JOB_STATUS_LABELS[job.status as JobStatus] ?? job.status}
                          </span>
                          {job.vehicle && (
                            <span className="text-sm text-slate-500">
                              {job.vehicle.year} {job.vehicle.make} {job.vehicle.model}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {job.services.map((s) => s.serviceItem?.name || s.customName || "Custom").join(", ")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-slate-900">{formatCurrency(job.total)}</div>
                        {job.scheduledAt && (
                          <div className="text-xs text-slate-400">{formatDate(job.scheduledAt)}</div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Unified Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  Timeline
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Dialog open={commOpen} onOpenChange={setCommOpen}>
                    <DialogTrigger render={
                      <Button variant="outline" size="sm" className="text-xs">
                        <MessageSquare className="w-3.5 h-3.5 mr-1" />
                        Log Comm
                      </Button>
                    } />
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Log Communication</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label>Type</Label>
                          <Select value={commType} onValueChange={(v) => setCommType(v ?? "call")}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="call">Phone Call</SelectItem>
                              <SelectItem value="sms">Text Message</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="note">In Person</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Direction</Label>
                          <Select value={commDirection} onValueChange={(v) => setCommDirection(v ?? "outbound")}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="inbound">Inbound</SelectItem>
                              <SelectItem value="outbound">Outbound</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Notes</Label>
                          <Textarea rows={3} value={commSummary} onChange={(e) => setCommSummary(e.target.value)} placeholder="Notes about the communication..." className="resize-none" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setCommOpen(false)}>Cancel</Button>
                        <Button onClick={() => logCommMutation.mutate()} disabled={logCommMutation.isPending} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                          {logCommMutation.isPending ? "Saving..." : "Save"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
                    <DialogTrigger render={
                      <Button variant="outline" size="sm" className="text-xs">
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Log Activity
                      </Button>
                    } />
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Log Activity</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label>Type</Label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { value: "CALL", label: "Call", icon: Phone },
                              { value: "TEXT", label: "Text", icon: MessageSquare },
                              { value: "EMAIL", label: "Email", icon: Mail },
                              { value: "IN_PERSON", label: "In-Person", icon: User },
                              { value: "NOTE", label: "Note", icon: StickyNote },
                            ].map((t) => (
                              <button
                                key={t.value}
                                onClick={() => setActType(t.value)}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                                  actType === t.value
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                                )}
                              >
                                <t.icon className="w-3.5 h-3.5" />
                                {t.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        {actType !== "NOTE" && (
                          <div className="space-y-1.5">
                            <Label>Direction</Label>
                            <div className="flex gap-2">
                              {[
                                { value: "INBOUND", label: "Inbound", icon: ArrowDownLeft },
                                { value: "OUTBOUND", label: "Outbound", icon: ArrowUpRight },
                              ].map((d) => (
                                <button
                                  key={d.value}
                                  onClick={() => setActDirection(d.value)}
                                  className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex-1",
                                    actDirection === d.value
                                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                                  )}
                                >
                                  <d.icon className="w-3.5 h-3.5" />
                                  {d.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <Label>Summary *</Label>
                          <Textarea rows={3} value={actSummary} onChange={(e) => setActSummary(e.target.value)} placeholder="What happened..." className="resize-none" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="flex items-center gap-1.5">
                            <CalendarIcon className="w-3.5 h-3.5" />
                            Follow-Up Date (optional)
                          </Label>
                          <Input type="date" value={actFollowUp} onChange={(e) => setActFollowUp(e.target.value)} />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setActivityOpen(false)}>Cancel</Button>
                        <Button onClick={() => logActivityMutation.mutate()} disabled={!actSummary.trim() || logActivityMutation.isPending} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                          {logActivityMutation.isPending ? "Saving..." : "Log Activity"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <UnifiedTimeline
                communications={communications}
                activities={activities}
                jobs={customer.jobs}
                notes={customer.notes}
                onMarkFollowUpDone={(id) => markFollowUpDoneMutation.mutate(id)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Notes sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Internal Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {customer.notes.length === 0 ? (
                  <p className="text-sm text-slate-400">No notes yet</p>
                ) : (
                  customer.notes.map((note) => (
                    <div key={note.id} className="bg-slate-50 rounded-lg p-3">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                      <p className="text-xs text-slate-400 mt-1.5">{formatDateTime(note.createdAt)}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a note..."
                  rows={3}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="resize-none"
                />
                <Button
                  size="sm"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                  disabled={!noteText.trim() || addNoteMutation.isPending}
                  onClick={() => addNoteMutation.mutate(noteText)}
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Add Note
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Health & Lifecycle */}
          <HealthLifecycleCard customer={customer} onRecalculate={async () => {
            await fetch("/api/customers/health", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ customerId: customer.id }),
            });
            queryClient.invalidateQueries({ queryKey: ["customer", params.id] });
            toast.success("Health score updated");
          }} />

          {/* Quick stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total Jobs</span>
                <span className="font-medium">{customer.jobs.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Lifetime Value</span>
                <span className="font-semibold text-emerald-600">{formatCurrency(customer.totalSpent)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Avg Ticket</span>
                <span className="font-medium">
                  {customer.jobs.length > 0
                    ? formatCurrency(customer.totalSpent / customer.jobs.length)
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Vehicles</span>
                <span className="font-medium">{customer.vehicles.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Referrals Given</span>
                <span className="font-medium">{customer.referrals.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Last Visit</span>
                {(() => {
                  const lastJob = customer.jobs
                    .filter((j) => j.scheduledAt)
                    .sort((a, b) => new Date(b.scheduledAt!).getTime() - new Date(a.scheduledAt!).getTime())[0];
                  if (!lastJob) return <span className="text-slate-400">Never</span>;
                  const days = differenceInDays(new Date(), new Date(lastJob.scheduledAt!));
                  return (
                    <span className={days > 60 ? "text-red-500 font-medium" : "font-medium"}>
                      {days === 0 ? "Today" : `${days}d ago`}
                    </span>
                  );
                })()}
              </div>
              {customer.preferredContact && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Preferred Contact</span>
                  <span className="font-medium capitalize">{customer.preferredContact}</span>
                </div>
              )}
              {customer.source && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Source</span>
                  <span className="font-medium capitalize">{customer.source}{customer.sourceDetail ? ` (${customer.sourceDetail})` : ""}</span>
                </div>
              )}
              {customer.birthday && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Birthday</span>
                  <span className="font-medium">{formatDate(customer.birthday)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Special Instructions */}
          {(customer.gateCode || customer.specialInstructions) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-500" />
                  Special Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {customer.gateCode && (
                  <div>
                    <span className="text-slate-500">Gate Code: </span>
                    <span className="font-mono font-medium">{customer.gateCode}</span>
                  </div>
                )}
                {customer.specialInstructions && (
                  <p className="text-slate-600">{customer.specialInstructions}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Fleet / Commercial Info */}
          {customer.isCommercial && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  Fleet Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {customer.companyName && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Company</span>
                    <span className="font-medium">{customer.companyName}</span>
                  </div>
                )}
                {customer.taxId && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tax ID</span>
                    <span className="font-mono text-xs">{customer.taxId}</span>
                  </div>
                )}
                {customer.billingContact && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Billing Contact</span>
                    <span className="font-medium">{customer.billingContact}</span>
                  </div>
                )}
                {customer.billingEmail && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Billing Email</span>
                    <a href={`mailto:${customer.billingEmail}`} className="text-emerald-600 hover:underline text-xs">
                      {customer.billingEmail}
                    </a>
                  </div>
                )}
                {customer.paymentTerms && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment Terms</span>
                    <span className="font-medium">{customer.paymentTerms}</span>
                  </div>
                )}
                {customer.fleetSize != null && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Fleet Size</span>
                    <span className="font-medium">{customer.fleetSize} vehicles</span>
                  </div>
                )}
                {customer.fleetDiscount != null && customer.fleetDiscount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Fleet Discount</span>
                    <span className="font-medium text-emerald-600">{customer.fleetDiscount}%</span>
                  </div>
                )}
                {customer.contractNotes && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-slate-500 text-xs">Contract Notes</span>
                    <p className="text-slate-600 mt-0.5">{customer.contractNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Customer Dialog */}
      {customer && (
        <EditCustomerDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          customer={customer}
          onSave={(data) => editMutation.mutate(data)}
          isPending={editMutation.isPending}
        />
      )}
    </div>
  );
}

/* ── Unified Timeline ─────────────────────────────────────── */
interface TimelineEvent {
  id: string;
  kind: "comm" | "activity" | "job" | "note";
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  detail?: string;
  meta?: React.ReactNode;
  date: Date;
  linkTo?: string;
}

function UnifiedTimeline({
  communications,
  activities,
  jobs,
  notes,
  onMarkFollowUpDone,
}: {
  communications: CustomerCommunication[];
  activities: { id: string; type: string; direction: string | null; summary: string; followUpDate: string | null; followUpDone: boolean; createdAt: string }[];
  jobs: CustomerDetailData["jobs"];
  notes: CustomerDetailData["notes"];
  onMarkFollowUpDone: (id: string) => void;
}) {
  const ACTIVITY_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
    CALL: { icon: <Phone className="w-3.5 h-3.5" />, color: "bg-blue-50 text-blue-600" },
    TEXT: { icon: <MessageSquare className="w-3.5 h-3.5" />, color: "bg-green-50 text-green-600" },
    EMAIL: { icon: <Mail className="w-3.5 h-3.5" />, color: "bg-purple-50 text-purple-600" },
    IN_PERSON: { icon: <User className="w-3.5 h-3.5" />, color: "bg-orange-50 text-orange-600" },
    NOTE: { icon: <StickyNote className="w-3.5 h-3.5" />, color: "bg-amber-50 text-amber-600" },
  };

  const events: TimelineEvent[] = [];

  // Communications
  for (const c of communications) {
    events.push({
      id: `comm-${c.id}`,
      kind: "comm",
      icon: COMM_TYPE_ICONS[c.type] || <MessageSquare className="w-3.5 h-3.5" />,
      iconColor: COMM_TYPE_COLORS[c.type] || "bg-slate-100 text-slate-600",
      label: `${c.type.charAt(0).toUpperCase() + c.type.slice(1)} — ${c.direction}`,
      detail: c.summary || undefined,
      meta: c.duration != null ? (
        <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
          <Clock className="w-3 h-3" />
          {Math.floor(c.duration / 60)}m {c.duration % 60}s
        </span>
      ) : undefined,
      date: new Date(c.createdAt),
    });
  }

  // Activities
  for (const a of activities) {
    const tc = ACTIVITY_ICONS[a.type] || ACTIVITY_ICONS.NOTE;
    const isOverdue = a.followUpDate && !a.followUpDone && new Date(a.followUpDate) < new Date();
    events.push({
      id: `act-${a.id}`,
      kind: "activity",
      icon: tc.icon,
      iconColor: tc.color,
      label: `${a.type.replace("_", " ").toLowerCase()} ${a.direction ? `— ${a.direction.toLowerCase()}` : ""}`,
      detail: a.summary,
      meta: a.followUpDate ? (
        <div className="flex items-center gap-2 mt-1">
          <span className={cn(
            "text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded",
            a.followUpDone ? "bg-emerald-50 text-emerald-600" : isOverdue ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
          )}>
            {a.followUpDone ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
            Follow-up: {formatDate(a.followUpDate)}
            {isOverdue && !a.followUpDone && " (overdue)"}
          </span>
          {!a.followUpDone && (
            <button onClick={() => onMarkFollowUpDone(a.id)} className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium">
              Mark Done
            </button>
          )}
        </div>
      ) : undefined,
      date: new Date(a.createdAt),
    });
  }

  // Jobs
  for (const j of jobs) {
    const statusLabel = JOB_STATUS_LABELS[j.status as JobStatus] ?? j.status;
    const services = j.services.map((s) => s.serviceItem?.name || s.customName || "Custom").join(", ");
    events.push({
      id: `job-${j.id}`,
      kind: "job",
      icon: <Briefcase className="w-3.5 h-3.5" />,
      iconColor: "bg-emerald-50 text-emerald-600",
      label: `Job ${statusLabel}`,
      detail: `${services}${j.vehicle ? ` — ${j.vehicle.year} ${j.vehicle.make} ${j.vehicle.model}` : ""} — ${formatCurrency(j.total)}`,
      date: new Date(j.scheduledAt || j.id), // fallback to id creation time
      linkTo: `/jobs/${j.id}`,
    });
  }

  // Notes
  for (const n of notes) {
    events.push({
      id: `note-${n.id}`,
      kind: "note",
      icon: <StickyNote className="w-3.5 h-3.5" />,
      iconColor: "bg-amber-50 text-amber-600",
      label: "Note added",
      detail: n.content,
      date: new Date(n.createdAt),
    });
  }

  // Sort newest first
  events.sort((a, b) => b.date.getTime() - a.date.getTime());

  if (events.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-4">No activity yet</p>;
  }

  const displayed = events.slice(0, 20);

  return (
    <div className="space-y-1">
      {displayed.map((ev, idx) => {
        const inner = (
          <div className="flex gap-3 py-2.5 group">
            <div className="flex flex-col items-center">
              <div className={cn("p-1.5 rounded-md", ev.iconColor)}>{ev.icon}</div>
              {idx < displayed.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1" />}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-slate-700 capitalize">{ev.label}</span>
                {ev.meta}
                <span className="text-[10px] text-slate-400 ml-auto">{formatDateTime(ev.date.toISOString())}</span>
              </div>
              {ev.detail && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{ev.detail}</p>}
            </div>
          </div>
        );

        if (ev.linkTo) {
          return (
            <Link key={ev.id} href={ev.linkTo} className="block hover:bg-slate-50 rounded-lg -mx-1 px-1 transition-colors">
              {inner}
            </Link>
          );
        }
        return <div key={ev.id}>{inner}</div>;
      })}
      {events.length > 20 && (
        <p className="text-xs text-slate-400 text-center pt-2">
          Showing 20 of {events.length} events
        </p>
      )}
    </div>
  );
}

const LIFECYCLE_LABELS: Record<string, string> = {
  new: "New",
  prospect: "Prospect",
  active: "Active",
  loyal: "Loyal",
  "at-risk": "At Risk",
  inactive: "Inactive",
  lost: "Lost",
};

const LIFECYCLE_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  prospect: "bg-purple-100 text-purple-700",
  active: "bg-emerald-100 text-emerald-700",
  loyal: "bg-amber-100 text-amber-700",
  "at-risk": "bg-red-100 text-red-700",
  inactive: "bg-slate-100 text-slate-600",
  lost: "bg-red-200 text-red-800",
};

function getHealthColor(score: number | null): string {
  if (score === null) return "text-slate-400";
  if (score >= 75) return "text-emerald-500";
  if (score >= 55) return "text-green-500";
  if (score >= 35) return "text-amber-500";
  if (score >= 15) return "text-orange-500";
  return "text-red-500";
}

function getHealthLabel(score: number | null): string {
  if (score === null) return "Not calculated";
  if (score >= 75) return "Excellent";
  if (score >= 55) return "Good";
  if (score >= 35) return "Fair";
  if (score >= 15) return "At Risk";
  return "Lost";
}

function HealthLifecycleCard({ customer, onRecalculate }: { customer: CustomerDetailData; onRecalculate: () => Promise<void> }) {
  const [recalculating, setRecalculating] = useState(false);
  const stage = customer.lifecycleStage || "new";
  const score = customer.healthScore;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-500" />
            Health & Lifecycle
          </CardTitle>
          <button
            onClick={async () => {
              setRecalculating(true);
              await onRecalculate();
              setRecalculating(false);
            }}
            disabled={recalculating}
            className="text-slate-400 hover:text-emerald-500 transition-colors"
            title="Recalculate health score"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", recalculating && "animate-spin")} />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lifecycle Stage */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Lifecycle</span>
          <Badge className={cn("text-xs", LIFECYCLE_COLORS[stage] || "bg-slate-100 text-slate-600")}>
            {LIFECYCLE_LABELS[stage] || stage}
          </Badge>
        </div>

        {/* Health Score */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm text-slate-500">Health Score</span>
            <span className={cn("text-sm font-semibold", getHealthColor(score))}>
              {score !== null ? `${score}/100` : "—"}
            </span>
          </div>
          {score !== null && (
            <>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className={cn(
                    "h-2 rounded-full transition-all",
                    score >= 75 ? "bg-emerald-500" :
                    score >= 55 ? "bg-green-500" :
                    score >= 35 ? "bg-amber-500" :
                    score >= 15 ? "bg-orange-500" : "bg-red-500"
                  )}
                  style={{ width: `${score}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">{getHealthLabel(score)}</p>
            </>
          )}
        </div>

        {/* Last Contacted */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Last Contacted</span>
          <span className="font-medium">
            {customer.lastContactedAt
              ? (() => {
                  const days = differenceInDays(new Date(), new Date(customer.lastContactedAt));
                  return days === 0 ? "Today" : `${days}d ago`;
                })()
              : "Never"}
          </span>
        </div>

        {/* Last Job */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Last Job</span>
          <span className="font-medium">
            {customer.lastJobAt
              ? (() => {
                  const days = differenceInDays(new Date(), new Date(customer.lastJobAt));
                  return days === 0 ? "Today" : `${days}d ago`;
                })()
              : "Never"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function EditCustomerDialog({
  open,
  onClose,
  customer,
  onSave,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  customer: CustomerDetailData;
  onSave: (data: Record<string, unknown>) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    name: customer.name,
    phone: customer.phone || "",
    phoneCarrier: customer.phoneCarrier || "",
    email: customer.email || "",
    address: customer.address || "",
    city: customer.city || "",
    zip: customer.zip || "",
    neighborhood: customer.neighborhood || "",
    source: customer.source || "",
    sourceDetail: customer.sourceDetail || "",
    preferredContact: customer.preferredContact || "text",
    birthday: customer.birthday ? customer.birthday.slice(0, 10) : "",
    gateCode: customer.gateCode || "",
    specialInstructions: customer.specialInstructions || "",
    isCommercial: customer.isCommercial || false,
    companyName: customer.companyName || "",
    taxId: customer.taxId || "",
    billingEmail: customer.billingEmail || "",
    billingContact: customer.billingContact || "",
    paymentTerms: customer.paymentTerms || "",
    fleetSize: customer.fleetSize?.toString() || "",
    fleetDiscount: customer.fleetDiscount?.toString() || "",
    contractNotes: customer.contractNotes || "",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Full Name *</Label>
            <Input value={form.name} onChange={(e) => handleChange("name", e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Carrier</Label>
              <Select value={form.phoneCarrier || ""} onValueChange={(v) => handleChange("phoneCarrier", v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Select carrier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="att">AT&T</SelectItem>
                  <SelectItem value="verizon">Verizon</SelectItem>
                  <SelectItem value="tmobile">T-Mobile</SelectItem>
                  <SelectItem value="sprint">Sprint</SelectItem>
                  <SelectItem value="boost">Boost</SelectItem>
                  <SelectItem value="cricket">Cricket</SelectItem>
                  <SelectItem value="metropcs">MetroPCS</SelectItem>
                  <SelectItem value="uscellular">US Cellular</SelectItem>
                  <SelectItem value="virgin">Virgin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => handleChange("address", e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-1">
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => handleChange("city", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>ZIP</Label>
              <Input value={form.zip} onChange={(e) => handleChange("zip", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Neighborhood</Label>
              <Input value={form.neighborhood} onChange={(e) => handleChange("neighborhood", e.target.value)} />
            </div>
          </div>

          {/* Enhanced fields */}
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">Additional Info</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Preferred Contact</Label>
                  <Select value={form.preferredContact} onValueChange={(v) => handleChange("preferredContact", v ?? "text")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text/SMS</SelectItem>
                      <SelectItem value="call">Phone Call</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Birthday</Label>
                  <Input type="date" value={form.birthday} onChange={(e) => handleChange("birthday", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Source</Label>
                  <Select value={form.source} onValueChange={(v) => handleChange("source", v ?? "")}>
                    <SelectTrigger><SelectValue placeholder="How they found you" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="nextdoor">Nextdoor</SelectItem>
                      <SelectItem value="yelp">Yelp</SelectItem>
                      <SelectItem value="flyer">Flyer</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="repeat">Repeat Customer</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Source Detail</Label>
                  <Input
                    value={form.sourceDetail}
                    onChange={(e) => handleChange("sourceDetail", e.target.value)}
                    placeholder="e.g. who referred them"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Gate Code</Label>
                <Input value={form.gateCode} onChange={(e) => handleChange("gateCode", e.target.value)} placeholder="Community gate code" />
              </div>
              <div className="space-y-1.5">
                <Label>Special Instructions</Label>
                <Textarea
                  rows={2}
                  value={form.specialInstructions}
                  onChange={(e) => handleChange("specialInstructions", e.target.value)}
                  placeholder="Parking, access, pet warnings, etc."
                />
              </div>
            </div>
          </div>

          {/* Fleet / Commercial Section */}
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="isCommercial"
                checked={form.isCommercial}
                onChange={(e) => setForm((prev) => ({ ...prev, isCommercial: e.target.checked }))}
                className="rounded border-slate-300"
              />
              <Label htmlFor="isCommercial" className="text-xs font-medium text-slate-400 uppercase tracking-wide cursor-pointer">
                Fleet / Commercial Account
              </Label>
            </div>
            {form.isCommercial && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Company Name</Label>
                    <Input value={form.companyName} onChange={(e) => handleChange("companyName", e.target.value)} placeholder="ABC Corp" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tax ID / EIN</Label>
                    <Input value={form.taxId} onChange={(e) => handleChange("taxId", e.target.value)} placeholder="XX-XXXXXXX" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Billing Contact</Label>
                    <Input value={form.billingContact} onChange={(e) => handleChange("billingContact", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Billing Email</Label>
                    <Input type="email" value={form.billingEmail} onChange={(e) => handleChange("billingEmail", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Payment Terms</Label>
                    <Select value={form.paymentTerms || "due_on_receipt"} onValueChange={(v) => handleChange("paymentTerms", String(v ?? ""))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="due_on_receipt">Due on Receipt</SelectItem>
                        <SelectItem value="net_15">Net 15</SelectItem>
                        <SelectItem value="net_30">Net 30</SelectItem>
                        <SelectItem value="net_60">Net 60</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Fleet Size</Label>
                    <Input type="number" min="0" value={form.fleetSize} onChange={(e) => handleChange("fleetSize", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Fleet Discount %</Label>
                    <Input type="number" min="0" max="100" step="0.5" value={form.fleetDiscount} onChange={(e) => handleChange("fleetDiscount", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Contract Notes</Label>
                  <Textarea
                    rows={2}
                    value={form.contractNotes}
                    onChange={(e) => handleChange("contractNotes", e.target.value)}
                    placeholder="Contract terms, special agreements..."
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => onSave({
              name: form.name,
              phone: form.phone || null,
              email: form.email || null,
              address: form.address || null,
              city: form.city || null,
              zip: form.zip || null,
              neighborhood: form.neighborhood || null,
              source: form.source || null,
              sourceDetail: form.sourceDetail || null,
              preferredContact: form.preferredContact || "text",
              birthday: form.birthday || null,
              gateCode: form.gateCode || null,
              specialInstructions: form.specialInstructions || null,
              isCommercial: form.isCommercial,
              companyName: form.companyName || null,
              taxId: form.taxId || null,
              billingEmail: form.billingEmail || null,
              billingContact: form.billingContact || null,
              paymentTerms: form.paymentTerms || null,
              fleetSize: form.fleetSize ? parseInt(form.fleetSize) : null,
              fleetDiscount: form.fleetDiscount ? parseFloat(form.fleetDiscount) : null,
              contractNotes: form.contractNotes || null,
            })}
            disabled={!form.name.trim() || isPending}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
