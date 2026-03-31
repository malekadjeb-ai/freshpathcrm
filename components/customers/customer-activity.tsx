"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Phone, MessageSquare, Mail, StickyNote, Clock, Plus,
  ArrowDownLeft, ArrowUpRight, CheckCircle2, Circle,
  CalendarIcon, User, Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatCurrency, formatDate, formatDateTime, JOB_STATUS_LABELS, type JobStatus } from "@/lib/utils";
import { toast } from "sonner";
import type { CustomerDetailData, CustomerCommunication, ActivityItem } from "./customer-types";

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

interface CustomerActivityProps {
  customerId: string;
  communications: CustomerCommunication[];
  activities: ActivityItem[];
  jobs: CustomerDetailData["jobs"];
  notes: CustomerDetailData["notes"];
}

export function CustomerActivity({
  customerId,
  communications,
  activities,
  jobs,
  notes,
}: CustomerActivityProps) {
  const queryClient = useQueryClient();
  const [commOpen, setCommOpen] = useState(false);
  const [commType, setCommType] = useState("call");
  const [commDirection, setCommDirection] = useState("outbound");
  const [commSummary, setCommSummary] = useState("");
  const [activityOpen, setActivityOpen] = useState(false);
  const [actType, setActType] = useState<string>("CALL");
  const [actDirection, setActDirection] = useState<string>("OUTBOUND");
  const [actSummary, setActSummary] = useState("");
  const [actFollowUp, setActFollowUp] = useState("");

  const logCommMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
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
      queryClient.invalidateQueries({ queryKey: ["communications", "customer", customerId] });
      toast.success("Communication logged");
      setCommOpen(false);
      setCommSummary("");
    },
    onError: () => toast.error("Failed to log communication"),
  });

  const logActivityMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
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
      queryClient.invalidateQueries({ queryKey: ["activities", customerId] });
      queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
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
      queryClient.invalidateQueries({ queryKey: ["activities", customerId] });
      toast.success("Follow-up marked done");
    },
  });

  return (
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
          jobs={jobs}
          notes={notes}
          onMarkFollowUpDone={(id) => markFollowUpDoneMutation.mutate(id)}
        />
      </CardContent>
    </Card>
  );
}

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
  activities: ActivityItem[];
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
      date: new Date(j.scheduledAt || j.id),
      linkTo: `/jobs/${j.id}`,
    });
  }

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
