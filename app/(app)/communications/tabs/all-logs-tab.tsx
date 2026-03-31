"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { Phone, MessageSquare, Mail, Plus, Search, Upload, Send, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchJson } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import { Pagination } from "@/components/pagination";
import { CommRow, CommMobileCard } from "@/components/communications/comm-table";
import { LogCommunicationDialog, SendMessageDialog, MakeCallDialog } from "@/components/communications/comm-dialogs";
import type { Communication } from "@/components/communications/comm-types";

export function AllLogsTab() {
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
    <div className="space-y-6">
      {/* Action buttons */}
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-sm">{communications.length} total records</p>
        <div className="flex items-center gap-2">
          <Link href="/settings/import-gv">
            <Button variant="outline" size="sm"><Upload className="w-4 h-4 mr-2" />Import</Button>
          </Link>
          <Button onClick={() => setCallDialogOpen(true)} variant="outline" size="sm">
            <PhoneCall className="w-4 h-4 mr-2" />Call
          </Button>
          <Button onClick={() => setSendDialogOpen(true)} className="bg-blue-500 hover:bg-blue-600 text-white">
            <Send className="w-4 h-4 mr-2" />Send Message
          </Button>
          <Button onClick={() => { setEditComm(null); setDialogOpen(true); }} variant="outline">
            <Plus className="w-4 h-4 mr-2" />Log
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-5"><div className="flex items-center gap-3"><div className="p-2 bg-blue-50 rounded-lg"><Phone className="w-4 h-4 text-blue-600" /></div><div><p className="text-sm text-slate-500">Calls</p><p className="text-2xl font-bold text-slate-900">{totalCalls}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-center gap-3"><div className="p-2 bg-green-50 rounded-lg"><MessageSquare className="w-4 h-4 text-green-600" /></div><div><p className="text-sm text-slate-500">SMS</p><p className="text-2xl font-bold text-slate-900">{totalSms}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-center gap-3"><div className="p-2 bg-purple-50 rounded-lg"><Mail className="w-4 h-4 text-purple-600" /></div><div><p className="text-sm text-slate-500">Emails</p><p className="text-2xl font-bold text-slate-900">{totalEmails}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-center gap-3"><div className="p-2 bg-red-50 rounded-lg"><Phone className="w-4 h-4 text-red-600" /></div><div><p className="text-sm text-slate-500">Missed Calls</p><p className="text-2xl font-bold text-red-600">{missedCalls}</p></div></div></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by customer or summary..." className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All types" /></SelectTrigger>
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
          <SelectTrigger className="w-36"><SelectValue placeholder="All directions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All directions</SelectItem>
            <SelectItem value="inbound">Inbound</SelectItem>
            <SelectItem value="outbound">Outbound</SelectItem>
            <SelectItem value="missed">Missed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={outcomeFilter} onValueChange={(v) => setOutcomeFilter(v ?? "all")}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All outcomes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All outcomes</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="booked">Booked</SelectItem>
            <SelectItem value="follow_up">Follow Up</SelectItem>
            <SelectItem value="no_answer">No Answer</SelectItem>
            <SelectItem value="voicemail">Voicemail</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-36" placeholder="From" />
        <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-36" placeholder="To" />
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
          <Button onClick={() => { setEditComm(null); setDialogOpen(true); }} className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-white">
            <Plus className="w-4 h-4 mr-2" />Log Communication
          </Button>
        </div>
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {communications.slice((page - 1) * perPage, page * perPage).map((comm) => (
              <CommMobileCard key={comm.id} comm={comm} />
            ))}
          </div>
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

      <LogCommunicationDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditComm(null); }} editComm={editComm} />
      <SendMessageDialog open={sendDialogOpen} onClose={() => setSendDialogOpen(false)} />
      <MakeCallDialog open={callDialogOpen} onClose={() => setCallDialogOpen(false)} />
    </div>
  );
}
