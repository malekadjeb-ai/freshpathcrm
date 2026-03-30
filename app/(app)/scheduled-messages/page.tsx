"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import {
  Clock, Trash2, Search, CheckCircle, XCircle, Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTime, fetchJson } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";

interface ScheduledMessageData {
  id: string;
  channel: string;
  to: string;
  subject: string | null;
  body: string;
  status: string;
  scheduledAt: string;
  sentAt: string | null;
  error: string | null;
  retryCount: number;
  createdAt: string;
  customer: { id: string; name: string; phone: string | null; email: string | null };
  job: { id: string; status: string; scheduledAt: string | null } | null;
  template: { id: string; name: string } | null;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3.5 h-3.5 text-amber-500" />,
  sent: <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />,
  failed: <XCircle className="w-3.5 h-3.5 text-red-500" />,
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  sent: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
};

export default function ScheduledMessagesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: messages = [], isLoading, isError, refetch } = useQuery<ScheduledMessageData[]>({
    queryKey: ["scheduled-messages", filterStatus],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      return fetchJson(`/api/scheduled-messages?${params}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/scheduled-messages/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-messages"] });
      toast.success("Message cancelled");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const processMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/scheduled-messages/process", { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-messages"] });
      toast.success(`Processed ${data.processed} message(s)`);
    },
    onError: () => toast.error("Failed to process messages"),
  });

  const filtered = messages.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.customer.name.toLowerCase().includes(q) ||
      m.body.toLowerCase().includes(q) ||
      m.to.toLowerCase().includes(q)
    );
  });

  const pendingCount = messages.filter((m) => m.status === "pending").length;
  const sentCount = messages.filter((m) => m.status === "sent").length;
  const failedCount = messages.filter((m) => m.status === "failed").length;

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Scheduled Messages</h1>
          <p className="text-sm text-slate-500 mt-1">Automated confirmations, reminders & follow-ups</p>
        </div>
        <Button
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
          onClick={() => processMutation.mutate()}
          disabled={processMutation.isPending || pendingCount === 0}
        >
          <Play className="w-4 h-4 mr-2" />
          Process Due ({pendingCount})
        </Button>
      </div>

      {isError && <ErrorState message="Failed to load scheduled messages." onRetry={refetch} />}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-slate-900">{messages.length}</div>
            <div className="text-xs text-slate-500">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
            <div className="text-xs text-slate-500">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-emerald-600">{sentCount}</div>
            <div className="text-xs text-slate-500">Sent</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-red-500">{failedCount}</div>
            <div className="text-xs text-slate-500">Failed</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by customer, message, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? "all")}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-medium text-slate-600 mb-1">No scheduled messages</h3>
            <p className="text-sm text-slate-400">Messages are auto-created when bookings are made and jobs complete</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((msg) => (
            <Card key={msg.id}>
              <CardContent className="py-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex items-center gap-2 shrink-0">
                    {STATUS_ICONS[msg.status]}
                    <Badge className={`text-xs ${STATUS_COLORS[msg.status] || "bg-slate-100 text-slate-600"}`}>
                      {msg.status}
                    </Badge>
                    <Badge variant="secondary" className="text-xs uppercase">
                      {msg.channel}
                    </Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <Link href={`/customers/${msg.customer.id}`} className="font-medium text-slate-900 hover:text-emerald-600">
                        {msg.customer.name}
                      </Link>
                      <span className="text-slate-400">→</span>
                      <span className="text-slate-500">{msg.to}</span>
                    </div>
                    <p className="text-sm text-slate-600 truncate mt-0.5">{msg.body}</p>
                    <div className="flex gap-3 mt-1 text-xs text-slate-400">
                      <span>Scheduled: {formatDateTime(msg.scheduledAt)}</span>
                      {msg.sentAt && <span>Sent: {formatDateTime(msg.sentAt)}</span>}
                      {msg.job && (
                        <Link href={`/jobs/${msg.job.id}`} className="text-emerald-500 hover:underline">
                          View Job
                        </Link>
                      )}
                      {msg.error && <span className="text-red-400">Error: {msg.error}</span>}
                    </div>
                  </div>
                  {msg.status === "pending" && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-600 shrink-0"
                      onClick={() => deleteMutation.mutate(msg.id)}
                      title="Cancel message"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
