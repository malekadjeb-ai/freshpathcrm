"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, MessageSquare, Phone, RefreshCw, AlertTriangle, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { fetchJson } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";

interface Communication {
  id: string;
  type: string;
  channel: string;
  direction: string;
  status: string;
  summary: string | null;
  body: string | null;
  outcome: string | null;
  externalId: string | null;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  };
}

interface CommStatus {
  emailConfigured: boolean;
  emailProvider: string | null;
  smsConfigured: boolean;
  mode: string;
  stats: {
    last24h: number;
    sent: number;
    devMode: number;
    failed: number;
  };
}

export default function DevMessagesPage() {
  const queryClient = useQueryClient();

  const { data: comms = [], isLoading, isError, refetch } = useQuery<Communication[]>({
    queryKey: ["dev-messages"],
    queryFn: () => fetchJson("/api/communications?status=logged_dev"),
  });

  const { data: commStatus } = useQuery<CommStatus>({
    queryKey: ["comm-status"],
    queryFn: () => fetchJson("/api/communications/status"),
  });

  const processQueue = useMutation({
    mutationFn: () =>
      fetch("/api/scheduled-messages/process", { method: "POST" }).then((r) => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["dev-messages"] });
      toast.success(`Processed ${data.processed || 0} scheduled messages`);
    },
    onError: () => toast.error("Failed to process queue"),
  });

  const channelIcon = (type: string) => {
    if (type === "sms") return <MessageSquare className="w-4 h-4 text-blue-500" />;
    if (type === "email") return <Mail className="w-4 h-4 text-purple-500" />;
    return <Phone className="w-4 h-4 text-slate-500" />;
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "sent":
      case "delivered":
        return <Badge className="bg-emerald-100 text-emerald-700 text-xs">Sent</Badge>;
      case "logged_dev":
        return <Badge className="bg-amber-100 text-amber-700 text-xs">Dev Logged</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-700 text-xs">Failed</Badge>;
      case "queued":
      case "pending":
        return <Badge className="bg-blue-100 text-blue-700 text-xs">Queued</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-600 text-xs">{status}</Badge>;
    }
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dev Messages</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Messages that were logged but not sent (dev mode)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => processQueue.mutate()}
            disabled={processQueue.isPending}
          >
            {processQueue.isPending ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5 mr-1.5" />
            )}
            Process Queue
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["dev-messages"] })}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Status banner */}
      {commStatus && !commStatus.emailConfigured && !commStatus.smsConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              SMS and Email are in dev mode
            </p>
            <p className="text-xs text-amber-600 mt-1">
              Messages are logged but not sent to customers. Configure Twilio and Resend in{" "}
              <a href="/settings" className="underline font-medium">Settings → Integrations</a>{" "}
              to enable real sending.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      {commStatus?.stats && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Last 24h", value: commStatus.stats.last24h, color: "text-slate-700" },
            { label: "Sent (live)", value: commStatus.stats.sent, color: "text-emerald-600" },
            { label: "Dev logged", value: commStatus.stats.devMode, color: "text-amber-600" },
            { label: "Failed", value: commStatus.stats.failed, color: "text-red-600" },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-3 px-4 text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Message list */}
      {isError ? (
        <ErrorState message="Failed to load messages." onRetry={refetch} />
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : comms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No dev messages found.</p>
            <p className="text-xs text-slate-400 mt-1">
              Messages will appear here when sent without API keys configured.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {comms.map((comm) => (
            <Card key={comm.id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {channelIcon(comm.type)}
                    <span className="font-medium text-sm text-slate-900">
                      {comm.customer?.name || "Unknown"}
                    </span>
                    {statusBadge(comm.status)}
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(comm.createdAt).toLocaleString()}
                  </span>
                </div>
                {comm.summary && (
                  <p className="text-sm text-slate-600 mb-1 font-medium">
                    {comm.type === "email" ? `Subject: ${comm.summary}` : comm.summary}
                  </p>
                )}
                {comm.body && (
                  <p className="text-xs text-slate-500 line-clamp-2">{comm.body}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                  <span className="capitalize">{comm.type}</span>
                  <span>{comm.direction}</span>
                  {comm.outcome === "dev_mode" && (
                    <span className="text-amber-500">Would have been sent if configured</span>
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
