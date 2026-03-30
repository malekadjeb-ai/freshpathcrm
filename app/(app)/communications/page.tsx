"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import Link from "next/link";
import {
  Phone, MessageSquare, Mail, StickyNote, ArrowDownLeft, ArrowUpRight,
  Plus, Search, Trash2, Pencil, ChevronDown, ChevronUp, Clock, Voicemail,
  PhoneMissed, Upload, Send, PhoneCall,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { communicationSchema, type CommunicationInput } from "@/lib/validations/communication";
import { formatDate, formatDateTime, timeAgo, fetchJson } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import { Pagination } from "@/components/pagination";

interface Communication {
  id: string;
  customerId: string;
  type: string;
  direction: string;
  status: string;
  summary: string | null;
  body: string | null;
  duration: number | null;
  outcome: string | null;
  source: string | null;
  jobId: string | null;
  createdAt: string;
  customer: { id: string; name: string; phone: string | null; email: string | null };
  job: { id: string; status: string; scheduledAt: string | null } | null;
}

interface CustomerOption {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

interface JobOption {
  id: string;
  status: string;
  scheduledAt: string | null;
  customer: { name: string };
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  call: <Phone className="w-4 h-4" />,
  sms: <MessageSquare className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  note: <StickyNote className="w-4 h-4" />,
  voicemail: <Voicemail className="w-4 h-4" />,
};

const TYPE_COLORS: Record<string, string> = {
  call: "bg-blue-50 text-blue-600",
  sms: "bg-green-50 text-green-600",
  email: "bg-purple-50 text-purple-600",
  note: "bg-amber-50 text-amber-600",
  voicemail: "bg-amber-50 text-amber-700",
};

const TYPE_LABELS: Record<string, string> = {
  call: "Call",
  sms: "SMS",
  email: "Email",
  note: "Note",
  voicemail: "Voicemail",
};

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700",
  missed: "bg-red-100 text-red-700",
  "no-answer": "bg-orange-100 text-orange-700",
  voicemail: "bg-amber-100 text-amber-700",
  sent: "bg-blue-100 text-blue-700",
  received: "bg-indigo-100 text-indigo-700",
};

const STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  missed: "Missed",
  "no-answer": "No Answer",
  voicemail: "Voicemail",
  sent: "Sent",
  received: "Received",
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function CommunicationsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [editComm, setEditComm] = useState<Communication | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 20;

  const { data: communications = [], isLoading, isError, refetch } = useQuery<Communication[]>({
    queryKey: ["communications", search, typeFilter, directionFilter, outcomeFilter, fromDate, toDate],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter && typeFilter !== "all") params.set("type", typeFilter);
      if (directionFilter && directionFilter !== "all") params.set("direction", directionFilter);
      if (outcomeFilter && outcomeFilter !== "all") params.set("outcome", outcomeFilter);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      return fetchJson(`/api/communications?${params}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/communications/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communications"] });
      toast.success("Communication deleted");
    },
    onError: () => toast.error("Failed to delete"),
  });

  const totalCalls = communications.filter((c) => c.type === "call").length;
  const totalSms = communications.filter((c) => c.type === "sms").length;
  const totalEmails = communications.filter((c) => c.type === "email").length;
  const missedCalls = communications.filter((c) => c.type === "call" && (c.status === "missed" || c.status === "no-answer")).length;

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Communications</h1>
          <p className="text-slate-500 text-sm mt-0.5">{communications.length} total records</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/conversations">
            <Button variant="outline" size="sm">
              <MessageSquare className="w-4 h-4 mr-2" />
              Inbox
            </Button>
          </Link>
          <Link href="/settings/import-gv">
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
          </Link>
          <Button
            onClick={() => setCallDialogOpen(true)}
            variant="outline"
            size="sm"
          >
            <PhoneCall className="w-4 h-4 mr-2" />
            Call
          </Button>
          <Button
            onClick={() => setSendDialogOpen(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            <Send className="w-4 h-4 mr-2" />
            Send Message
          </Button>
          <Button
            onClick={() => { setEditComm(null); setDialogOpen(true); }}
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-2" />
            Log
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg"><Phone className="w-4 h-4 text-blue-600" /></div>
              <div>
                <p className="text-sm text-slate-500">Calls</p>
                <p className="text-2xl font-bold text-slate-900">{totalCalls}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg"><MessageSquare className="w-4 h-4 text-green-600" /></div>
              <div>
                <p className="text-sm text-slate-500">SMS</p>
                <p className="text-2xl font-bold text-slate-900">{totalSms}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg"><Mail className="w-4 h-4 text-purple-600" /></div>
              <div>
                <p className="text-sm text-slate-500">Emails</p>
                <p className="text-2xl font-bold text-slate-900">{totalEmails}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg"><Phone className="w-4 h-4 text-red-600" /></div>
              <div>
                <p className="text-sm text-slate-500">Missed Calls</p>
                <p className="text-2xl font-bold text-red-600">{missedCalls}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer or summary..."
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="call">Call</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="voicemail">Voicemail</SelectItem>
            <SelectItem value="note">Note</SelectItem>
          </SelectContent>
        </Select>
        <Select value={directionFilter} onValueChange={(v) => setDirectionFilter(v ?? "all")}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All directions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All directions</SelectItem>
            <SelectItem value="inbound">Inbound</SelectItem>
            <SelectItem value="outbound">Outbound</SelectItem>
            <SelectItem value="missed">Missed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={outcomeFilter} onValueChange={(v) => setOutcomeFilter(v ?? "all")}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All outcomes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All outcomes</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="booked">Booked</SelectItem>
            <SelectItem value="follow_up">Follow Up</SelectItem>
            <SelectItem value="no_answer">No Answer</SelectItem>
            <SelectItem value="voicemail">Voicemail</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="w-36"
          placeholder="From"
        />
        <Input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="w-36"
          placeholder="To"
        />
      </div>

      {/* Table */}
      {isError ? (
        <ErrorState message="Failed to load communications." onRetry={refetch} />
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : communications.length === 0 ? (
        <div className="text-center py-16">
          <Phone className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No communications found</p>
          <p className="text-slate-400 text-sm mt-1">Log your first call, text, or email to get started.</p>
          <Button
            onClick={() => { setEditComm(null); setDialogOpen(true); }}
            className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Log Communication
          </Button>
        </div>
      ) : (
        <>
        {/* Mobile Card Layout */}
        <div className="md:hidden space-y-3">
          {communications.slice((page - 1) * perPage, page * perPage).map((comm) => (
            <div
              key={comm.id}
              className="bg-white border border-slate-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center ${TYPE_COLORS[comm.type] ?? "bg-slate-100 text-slate-500"}`}>
                    {TYPE_ICONS[comm.type]}
                  </span>
                  <div>
                    <Link href={`/customers/${comm.customerId}`} className="font-medium text-sm text-slate-900 hover:text-emerald-600">
                      {comm.customer.name}
                    </Link>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <span>{TYPE_LABELS[comm.type] ?? comm.type}</span>
                      <span>·</span>
                      <span>{comm.direction === "inbound" ? "Inbound" : comm.direction === "missed" ? "Missed" : "Outbound"}</span>
                    </div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[comm.status] ?? "bg-slate-100 text-slate-600"}`}>
                  {STATUS_LABELS[comm.status] ?? comm.status}
                </span>
              </div>
              {comm.summary && (
                <p className="text-xs text-slate-600 line-clamp-2 mb-2">{comm.summary}</p>
              )}
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{timeAgo(comm.createdAt)}</span>
                {comm.duration != null && <span>{formatDuration(comm.duration)}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-600 w-10"></th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Direction</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Summary</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {communications.slice((page - 1) * perPage, page * perPage).map((comm) => (
                <CommRow
                  key={comm.id}
                  comm={comm}
                  expanded={expandedId === comm.id}
                  onToggle={() => setExpandedId(expandedId === comm.id ? null : comm.id)}
                  onEdit={() => { setEditComm(comm); setDialogOpen(true); }}
                  onDelete={() => deleteMutation.mutate(comm.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      <Pagination page={page} totalPages={Math.ceil(communications.length / perPage)} onPageChange={setPage} />

      {/* Log / Edit Dialog */}
      <LogCommunicationDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditComm(null); }}
        editComm={editComm}
      />

      {/* Send Message Dialog */}
      <SendMessageDialog
        open={sendDialogOpen}
        onClose={() => setSendDialogOpen(false)}
      />

      {/* Call Dialog */}
      <MakeCallDialog
        open={callDialogOpen}
        onClose={() => setCallDialogOpen(false)}
      />
    </div>
  );
}

function CommRow({
  comm,
  expanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  comm: Communication;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <tr className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
        <td className="px-4 py-3">
          <button onClick={onToggle} className="text-slate-400 hover:text-slate-600">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${TYPE_COLORS[comm.type] ?? "bg-slate-100 text-slate-600"}`}>
            {TYPE_ICONS[comm.type]}
            {TYPE_LABELS[comm.type] ?? comm.type}
          </span>
        </td>
        <td className="px-4 py-3">
          <Link href={`/customers/${comm.customer.id}`} className="font-medium text-slate-900 hover:text-emerald-600">
            {comm.customer.name}
          </Link>
        </td>
        <td className="px-4 py-3">
          <span className="inline-flex items-center gap-1 text-xs text-slate-600">
            {comm.direction === "missed" ? (
              <PhoneMissed className="w-3.5 h-3.5 text-red-500" />
            ) : comm.direction === "inbound" ? (
              <ArrowDownLeft className="w-3.5 h-3.5 text-blue-500" />
            ) : (
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
            )}
            {comm.direction === "missed" ? "Missed" : comm.direction === "inbound" ? "Inbound" : "Outbound"}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[comm.status] ?? "bg-slate-100 text-slate-600"}`}>
            {STATUS_LABELS[comm.status] ?? comm.status}
          </span>
        </td>
        <td className="px-4 py-3 text-slate-500 text-xs max-w-48 truncate">
          {comm.summary || "—"}
        </td>
        <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
          {timeAgo(comm.createdAt)}
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-slate-600 rounded">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <AlertDialog>
              <AlertDialogTrigger render={<button className="p-1.5 text-slate-400 hover:text-red-500 rounded" />}>
                <Trash2 className="w-3.5 h-3.5" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete communication?</AlertDialogTitle>
                  <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} className="bg-red-500 hover:bg-red-600 text-white">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50/50">
          <td colSpan={8} className="px-8 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">Date & Time</span>
                <span className="text-slate-700 font-medium">{formatDateTime(comm.createdAt)}</span>
              </div>
              {comm.duration != null && (
                <div>
                  <span className="text-slate-400 block">Duration</span>
                  <span className="text-slate-700 font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(comm.duration)}
                  </span>
                </div>
              )}
              {comm.job && (
                <div>
                  <span className="text-slate-400 block">Linked Job</span>
                  <Link href={`/jobs/${comm.job.id}`} className="text-emerald-600 hover:underline font-medium">
                    {comm.job.status} — {comm.job.scheduledAt ? formatDate(comm.job.scheduledAt) : "Unscheduled"}
                  </Link>
                </div>
              )}
              {comm.outcome && (
                <div>
                  <span className="text-slate-400 block">Outcome</span>
                  <span className="text-slate-700 font-medium capitalize">{comm.outcome.replace("_", " ")}</span>
                </div>
              )}
              {comm.source && comm.source !== "manual" && (
                <div>
                  <span className="text-slate-400 block">Source</span>
                  <span className="text-slate-700 font-medium capitalize">{comm.source.replace(/_/g, " ")}</span>
                </div>
              )}
              <div>
                <span className="text-slate-400 block">Contact</span>
                <span className="text-slate-700">{comm.customer.phone || comm.customer.email || "—"}</span>
              </div>
            </div>
            {comm.summary && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <span className="text-xs text-slate-400 block mb-1">Summary</span>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{comm.summary}</p>
              </div>
            )}
            {comm.body && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <span className="text-xs text-slate-400 block mb-1">Message</span>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{comm.body}</p>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function LogCommunicationDialog({
  open,
  onClose,
  editComm,
}: {
  open: boolean;
  onClose: () => void;
  editComm: Communication | null;
}) {
  const queryClient = useQueryClient();
  const [customerSearch, setCustomerSearch] = useState("");

  const { data: customers = [] } = useQuery<CustomerOption[]>({
    queryKey: ["customers-search", customerSearch],
    queryFn: () =>
      fetchJson<CustomerOption[]>(`/api/customers?search=${encodeURIComponent(customerSearch)}`)
        .then((data) => data.map((c) => ({ id: c.id, name: c.name, phone: c.phone, email: c.email }))),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<CommunicationInput>({
    resolver: zodResolver(communicationSchema),
    defaultValues: editComm
      ? {
          customerId: editComm.customerId,
          type: editComm.type as CommunicationInput["type"],
          direction: editComm.direction as CommunicationInput["direction"],
          status: editComm.status as CommunicationInput["status"],
          summary: editComm.summary || "",
          duration: editComm.duration,
          jobId: editComm.jobId,
        }
      : {
          type: "call",
          direction: "outbound",
          status: "completed",
          customerId: "",
          summary: "",
          duration: null,
          jobId: null,
        },
  });

  const selectedType = watch("type");
  const selectedCustomerId = watch("customerId");

  const { data: customerJobs = [] } = useQuery<JobOption[]>({
    queryKey: ["customer-jobs", selectedCustomerId],
    queryFn: () =>
      fetchJson(`/api/jobs?customerId=${selectedCustomerId}`),
    enabled: !!selectedCustomerId,
  });

  const mutation = useMutation({
    mutationFn: async (data: CommunicationInput) => {
      const url = editComm ? `/api/communications/${editComm.id}` : "/api/communications";
      const method = editComm ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communications"] });
      toast.success(editComm ? "Communication updated" : "Communication logged");
      reset();
      onClose();
    },
    onError: () => toast.error(editComm ? "Failed to update" : "Failed to log communication"),
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editComm ? "Edit Communication" : "Log Communication"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          {/* Customer */}
          <div className="space-y-1.5">
            <Label>Customer *</Label>
            <Controller
              name="customerId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <Input
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        placeholder="Search customers..."
                        className="h-7 text-xs"
                      />
                    </div>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.phone ? `— ${c.phone}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.customerId && <p className="text-red-500 text-xs">{errors.customerId.message}</p>}
          </div>

          {/* Type (segmented control) */}
          <div className="space-y-1.5">
            <Label>Type *</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                  {(["call", "sms", "email", "voicemail", "note"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => field.onChange(t)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                        field.value === t
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {TYPE_ICONS[t]}
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          {/* Direction + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Direction</Label>
              <Controller
                name="direction"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "outbound")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outbound">Outbound</SelectItem>
                      <SelectItem value="inbound">Inbound</SelectItem>
                      <SelectItem value="missed">Missed</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "completed")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="missed">Missed</SelectItem>
                      <SelectItem value="no-answer">No Answer</SelectItem>
                      <SelectItem value="voicemail">Voicemail</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="received">Received</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Duration (calls only) */}
          {selectedType === "call" && (
            <div className="space-y-1.5">
              <Label>Duration (seconds)</Label>
              <Input
                type="number"
                {...register("duration", { valueAsNumber: true })}
                placeholder="e.g. 120"
              />
            </div>
          )}

          {/* Linked Job */}
          {selectedCustomerId && customerJobs.length > 0 && (
            <div className="space-y-1.5">
              <Label>Linked Job (optional)</Label>
              <Controller
                name="jobId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? null : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {customerJobs.map((j) => (
                        <SelectItem key={j.id} value={j.id}>
                          {j.status} — {j.scheduledAt ? formatDate(j.scheduledAt) : "Unscheduled"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {/* Summary */}
          <div className="space-y-1.5">
            <Label>Summary</Label>
            <Textarea
              {...register("summary")}
              placeholder="What was discussed..."
              rows={3}
            />
          </div>

          {/* Date/Time */}
          <div className="space-y-1.5">
            <Label>Date & Time (defaults to now)</Label>
            <Input type="datetime-local" {...register("createdAt")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {mutation.isPending
                ? editComm ? "Saving..." : "Logging..."
                : editComm ? "Save Changes" : "Log Communication"
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Send Message Dialog (actually sends SMS / Email) ────────────────────────

function SendMessageDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [channel, setChannel] = useState<"sms" | "email">("sms");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const { data: customers = [] } = useQuery<CustomerOption[]>({
    queryKey: ["customers-search", customerSearch],
    queryFn: () =>
      fetchJson<CustomerOption[]>(`/api/customers?search=${encodeURIComponent(customerSearch)}`)
        .then((data) => data.map((c) => ({ id: c.id, name: c.name, phone: c.phone, email: c.email }))),
    enabled: open,
  });

  // Auto-fill "to" when customer changes
  const selectedCustomer = customers.find((c) => c.id === customerId);
  const autoTo = channel === "sms" ? selectedCustomer?.phone : selectedCustomer?.email;

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/communications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          to: to || autoTo,
          subject: channel === "email" ? subject : undefined,
          message,
          customerId: customerId || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to send");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["communications"] });
      if (data.mode === "dev") {
        toast.success("Message logged (dev mode — configure provider in Settings > Integrations)");
      } else {
        toast.success(`${channel === "sms" ? "SMS" : "Email"} sent successfully!`);
      }
      resetForm();
      onClose();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to send"),
  });

  const resetForm = () => {
    setChannel("sms");
    setCustomerId("");
    setTo("");
    setSubject("");
    setMessage("");
  };

  return (
    <Dialog open={open} onOpenChange={() => { resetForm(); onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-500" />
            Send Message
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Channel */}
          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setChannel("sms")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                channel === "sms" ? "bg-green-50 text-green-700" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <MessageSquare className="w-4 h-4" /> SMS
            </button>
            <button
              type="button"
              onClick={() => setChannel("email")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                channel === "email" ? "bg-purple-50 text-purple-700" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Mail className="w-4 h-4" /> Email
            </button>
          </div>

          {/* Customer */}
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <Select value={customerId} onValueChange={(v) => setCustomerId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select customer (optional)" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search..."
                    className="h-7 text-xs"
                  />
                </div>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {channel === "sms" ? c.phone ? `— ${c.phone}` : "(no phone)" : c.email ? `— ${c.email}` : "(no email)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* To */}
          <div className="space-y-1.5">
            <Label>{channel === "sms" ? "Phone Number" : "Email Address"} *</Label>
            <Input
              value={to || autoTo || ""}
              onChange={(e) => setTo(e.target.value)}
              placeholder={channel === "sms" ? "+15551234567" : "customer@email.com"}
            />
          </div>

          {/* Subject (email only) */}
          {channel === "email" && (
            <div className="space-y-1.5">
              <Label>Subject *</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject..."
              />
            </div>
          )}

          {/* Message */}
          <div className="space-y-1.5">
            <Label>Message *</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={channel === "sms" ? "Hi {{customer_first_name}}, ..." : "Write your email..."}
              rows={4}
            />
            <p className="text-xs text-slate-400">
              Supports template variables: {"{{customer_name}}, {{business_name}}, {{job_date}}"}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); onClose(); }}>
              Cancel
            </Button>
            <Button
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending || !message.trim() || !(to || autoTo)}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              {sendMutation.isPending ? "Sending..." : `Send ${channel === "sms" ? "SMS" : "Email"}`}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Make Call Dialog ─────────────────────────────────────────────────────────

function MakeCallDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [phone, setPhone] = useState("");

  const { data: customers = [] } = useQuery<CustomerOption[]>({
    queryKey: ["customers-search-call", customerSearch],
    queryFn: () =>
      fetchJson<CustomerOption[]>(`/api/customers?search=${encodeURIComponent(customerSearch)}`)
        .then((data) => data.map((c) => ({ id: c.id, name: c.name, phone: c.phone, email: c.email }))),
    enabled: open,
  });

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const autoPhone = selectedCustomer?.phone || "";

  const callMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          to: phone || autoPhone,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to initiate call");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["communications"] });
      if (data.mode === "dev") {
        toast.success("Call logged (dev mode — configure Twilio in Settings > Integrations)");
      } else {
        toast.success("Call initiated via Twilio!");
      }
      setCustomerId("");
      setPhone("");
      onClose();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Call failed"),
  });

  return (
    <Dialog open={open} onOpenChange={() => { setCustomerId(""); setPhone(""); onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-blue-500" />
            Make a Call
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Customer *</Label>
            <Select value={customerId} onValueChange={(v) => setCustomerId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search..."
                    className="h-7 text-xs"
                  />
                </div>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.phone ? `— ${c.phone}` : "(no phone)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Phone Number *</Label>
            <Input
              value={phone || autoPhone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+15551234567"
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
            <p className="font-medium mb-1">How it works:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>With Twilio configured: Places a real call through your Twilio number</li>
              <li>Without Twilio: Logs the call for your records (dev mode)</li>
              <li>All calls are recorded and tracked automatically</li>
            </ul>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setCustomerId(""); setPhone(""); onClose(); }}>
              Cancel
            </Button>
            <Button
              onClick={() => callMutation.mutate()}
              disabled={callMutation.isPending || !customerId || !(phone || autoPhone)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {callMutation.isPending ? "Calling..." : "Start Call"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
