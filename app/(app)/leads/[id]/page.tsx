"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft, Phone, Mail, ChevronRight, Plus, Trash2,
  MessageSquare, StickyNote, ArrowDownLeft, ArrowUpRight,
  User, CalendarIcon, CheckCircle2, Circle, FileText, Car,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn, fetchJson, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";

const STATUS_COLORS: Record<string, string> = {
  New: "bg-blue-100 text-blue-700",
  Contacted: "bg-amber-100 text-amber-700",
  Quoted: "bg-purple-100 text-purple-700",
  Booked: "bg-emerald-100 text-emerald-700",
  Won: "bg-emerald-100 text-emerald-700",
  Lost: "bg-red-100 text-red-700",
};

const EST_STATUS_COLORS: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Sent: "bg-blue-100 text-blue-700",
  Accepted: "bg-emerald-100 text-emerald-700",
  Approved: "bg-emerald-100 text-emerald-700",
  Declined: "bg-red-100 text-red-700",
  Expired: "bg-amber-100 text-amber-700",
};

interface LeadDetail {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: string;
  sourceDetail: string | null;
  status: string;
  notes: string | null;
  vehicleInfo: string | null;
  address: string | null;
  city: string | null;
  priority: string;
  customerId: string | null;
  customer: { id: string; name: string } | null;
  estimates: {
    id: string;
    estimateNumber: string;
    status: string;
    total: number;
    createdAt: string;
    lineItems: { id: string; service: { name: string } | null; description: string; unitPrice: number; quantity: number }[];
  }[];
  activities: {
    id: string;
    type: string;
    direction: string | null;
    summary: string;
    followUpDate: string | null;
    followUpDone: boolean;
    createdAt: string;
  }[];
  createdAt: string;
  contactedAt: string | null;
  convertedAt: string | null;
}

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("overview");
  const [activityOpen, setActivityOpen] = useState(false);
  const [actType, setActType] = useState("CALL");
  const [actDirection, setActDirection] = useState("OUTBOUND");
  const [actSummary, setActSummary] = useState("");
  const [actFollowUp, setActFollowUp] = useState("");

  const { data: lead, isLoading, isError, refetch } = useQuery<LeadDetail>({
    queryKey: ["lead", params.id],
    queryFn: () => fetchJson(`/api/leads/${params.id}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/leads/${params.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Lead deleted");
      router.push("/leads");
    },
    onError: () => toast.error("Failed to delete lead"),
  });

  const convertMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/leads/${params.id}/convert`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (data) => {
      toast.success("Lead converted to customer!");
      router.push(`/customers/${data.customerId || data.id}`);
    },
    onError: () => toast.error("Failed to convert lead"),
  });

  const logActivityMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: params.id,
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
      queryClient.invalidateQueries({ queryKey: ["lead", params.id] });
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
      queryClient.invalidateQueries({ queryKey: ["lead", params.id] });
      toast.success("Follow-up marked done");
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-32 bg-slate-100 rounded-xl animate-pulse" />
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (isError || !lead || "error" in (lead as object)) {
    return <ErrorState message="Failed to load lead." onRetry={refetch} />;
  }

  const isConverted = lead.status === "Won" || lead.status === "Booked" || !!lead.customerId;

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
        <Link href="/leads" className="hover:text-slate-900 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Leads
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900">{lead.name}</span>
      </div>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-slate-900">{lead.name}</h1>
              <Badge className={cn("text-xs", STATUS_COLORS[lead.status])}>{lead.status}</Badge>
              <Badge variant="outline" className="text-xs">{lead.source}</Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500 mt-2">
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-emerald-600">
                  <Phone className="w-3.5 h-3.5" /> {lead.phone}
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-1 hover:text-emerald-600">
                  <Mail className="w-3.5 h-3.5" /> {lead.email}
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isConverted && (
              <AlertDialog>
                <AlertDialogTrigger render={
                  <Button className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1">
                    <UserPlus className="w-4 h-4" /> Convert to Customer
                  </Button>
                } />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Convert Lead to Customer</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will create a new customer record from {lead.name}&apos;s info and mark this lead as Won.
                      {lead.vehicleInfo && " A vehicle record will also be created."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => convertMutation.mutate()}
                      className="bg-emerald-500 hover:bg-emerald-600"
                    >
                      Convert
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {isConverted && lead.customer && (
              <Link href={`/customers/${lead.customer.id}`}>
                <Button variant="outline" className="gap-1">
                  <User className="w-4 h-4" /> View Customer
                </Button>
              </Link>
            )}
            <AlertDialog>
              <AlertDialogTrigger render={
                <Button variant="outline" className="text-red-500 hover:text-red-700 gap-1">
                  <Trash2 className="w-4 h-4" /> Delete
                </Button>
              } />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Lead</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently delete this lead and all related activities.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as string || "overview")}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="estimates">Estimates ({lead.estimates?.length || 0})</TabsTrigger>
          <TabsTrigger value="activity">Activity ({lead.activities?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Contact Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {lead.phone && <div className="flex justify-between"><span className="text-slate-500">Phone</span><span className="font-medium">{lead.phone}</span></div>}
                {lead.email && <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="font-medium">{lead.email}</span></div>}
                {lead.address && <div className="flex justify-between"><span className="text-slate-500">Address</span><span className="font-medium">{lead.address}</span></div>}
                {lead.city && <div className="flex justify-between"><span className="text-slate-500">City</span><span className="font-medium">{lead.city}</span></div>}
                <div className="flex justify-between"><span className="text-slate-500">Source</span><span className="font-medium">{lead.source}{lead.sourceDetail ? ` (${lead.sourceDetail})` : ""}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Priority</span><Badge variant="outline" className="text-xs capitalize">{lead.priority}</Badge></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {lead.vehicleInfo && (
                  <div className="flex justify-between"><span className="text-slate-500">Vehicle</span><span className="font-medium flex items-center gap-1"><Car className="w-3.5 h-3.5" />{lead.vehicleInfo}</span></div>
                )}
                <div className="flex justify-between"><span className="text-slate-500">Created</span><span className="font-medium">{formatDate(lead.createdAt)}</span></div>
                {lead.contactedAt && <div className="flex justify-between"><span className="text-slate-500">First Contact</span><span className="font-medium">{formatDate(lead.contactedAt)}</span></div>}
                {lead.convertedAt && <div className="flex justify-between"><span className="text-slate-500">Converted</span><span className="font-medium">{formatDate(lead.convertedAt)}</span></div>}
              </CardContent>
            </Card>
          </div>
          {lead.notes && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-slate-600 whitespace-pre-wrap">{lead.notes}</p></CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="estimates" className="mt-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-sm text-slate-700">Estimates</h3>
            <Link href={`/estimates/new?leadId=${lead.id}`}>
              <Button size="sm" variant="outline" className="gap-1">
                <Plus className="w-3.5 h-3.5" /> Create Estimate
              </Button>
            </Link>
          </div>
          {(!lead.estimates || lead.estimates.length === 0) ? (
            <Card className="p-8 text-center">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No estimates yet</p>
            </Card>
          ) : (
            lead.estimates.map((est) => (
              <Link key={est.id} href={`/estimates/${est.id}`}>
                <Card className="p-4 hover:border-emerald-200 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{est.estimateNumber}</span>
                        <Badge className={cn("text-[10px]", EST_STATUS_COLORS[est.status])}>{est.status}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{formatDate(est.createdAt)}</p>
                    </div>
                    <span className="font-semibold text-emerald-600">{formatCurrency(est.total)}</span>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-sm text-slate-700">Activity Timeline</h3>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setActivityOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> Log Activity
            </Button>
          </div>
          {(!lead.activities || lead.activities.length === 0) ? (
            <Card className="p-8 text-center">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No activities logged yet</p>
            </Card>
          ) : (
            <div className="space-y-1">
              {lead.activities.map((act, idx) => {
                const typeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
                  CALL: { icon: <Phone className="w-3.5 h-3.5" />, color: "bg-blue-50 text-blue-600" },
                  TEXT: { icon: <MessageSquare className="w-3.5 h-3.5" />, color: "bg-green-50 text-green-600" },
                  EMAIL: { icon: <Mail className="w-3.5 h-3.5" />, color: "bg-purple-50 text-purple-600" },
                  IN_PERSON: { icon: <User className="w-3.5 h-3.5" />, color: "bg-orange-50 text-orange-600" },
                  NOTE: { icon: <StickyNote className="w-3.5 h-3.5" />, color: "bg-amber-50 text-amber-600" },
                };
                const tc = typeConfig[act.type] || typeConfig.NOTE;
                const isOverdue = act.followUpDate && !act.followUpDone && new Date(act.followUpDate) < new Date();

                return (
                  <div key={act.id} className="flex gap-3 py-2.5 group">
                    <div className="flex flex-col items-center">
                      <div className={cn("p-1.5 rounded-md", tc.color)}>{tc.icon}</div>
                      {idx < lead.activities.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1" />}
                    </div>
                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] capitalize">{act.type.replace("_", " ").toLowerCase()}</Badge>
                        {act.direction && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                            {act.direction === "INBOUND" ? <ArrowDownLeft className="w-3 h-3 text-blue-500" /> : <ArrowUpRight className="w-3 h-3 text-emerald-500" />}
                            {act.direction.toLowerCase()}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 ml-auto">{formatDateTime(act.createdAt)}</span>
                      </div>
                      <p className="text-sm text-slate-700 mt-0.5">{act.summary}</p>
                      {act.followUpDate && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn(
                            "text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded",
                            act.followUpDone ? "bg-emerald-50 text-emerald-600" : isOverdue ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                          )}>
                            {act.followUpDone ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                            Follow-up: {formatDate(act.followUpDate)}
                            {isOverdue && !act.followUpDone && " (overdue)"}
                          </span>
                          {!act.followUpDone && (
                            <button
                              onClick={() => markFollowUpDoneMutation.mutate(act.id)}
                              className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              Mark Done
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Log Activity Modal */}
      <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
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
              <Textarea
                rows={3}
                value={actSummary}
                onChange={(e) => setActSummary(e.target.value)}
                placeholder="What happened?"
                className="resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5" /> Follow-Up Date
              </Label>
              <Input type="date" value={actFollowUp} onChange={(e) => setActFollowUp(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivityOpen(false)}>Cancel</Button>
            <Button
              onClick={() => logActivityMutation.mutate()}
              disabled={!actSummary.trim() || logActivityMutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {logActivityMutation.isPending ? "Saving..." : "Log Activity"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
