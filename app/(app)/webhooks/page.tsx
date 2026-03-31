"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchJson } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import { toast } from "sonner";
import type { WebhookEndpoint, WebhookLog } from "@/components/webhooks/types";
import { WebhookStats } from "@/components/webhooks/webhook-stats";
import { WebhookEndpointList } from "@/components/webhooks/webhook-endpoint-list";
import { WebhookFormDialog } from "@/components/webhooks/webhook-form-dialog";
import { WebhookLogsDialog } from "@/components/webhooks/webhook-logs-dialog";

export default function WebhooksPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WebhookEndpoint | null>(null);
  const [logsDialog, setLogsDialog] = useState<string | null>(null);

  const { data: endpoints = [], isLoading, isError, refetch } = useQuery<WebhookEndpoint[]>({
    queryKey: ["webhooks"],
    queryFn: () => fetchJson("/api/webhooks"),
  });

  const { data: logs = [] } = useQuery<WebhookLog[]>({
    queryKey: ["webhook-logs", logsDialog],
    queryFn: () => fetchJson(`/api/webhooks/${logsDialog}/logs`),
    enabled: !!logsDialog,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const u = editing ? `/api/webhooks/${editing.id}` : "/api/webhooks";
      const res = await fetch(u, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success(editing ? "Webhook updated" : "Webhook created");
      closeDialog();
    },
    onError: () => toast.error("Failed to save webhook"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/webhooks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook deleted");
    },
  });

  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/webhooks/${id}/test`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Test webhook sent");
      setTimeout(() => qc.invalidateQueries({ queryKey: ["webhooks"] }), 2000);
    },
    onError: () => toast.error("Failed to send test"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/webhooks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(ep: WebhookEndpoint) {
    setEditing(ep);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
  }

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Webhooks</h1>
          <p className="text-sm text-slate-500 mt-1">
            Send real-time notifications to external services
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Add Endpoint
        </Button>
      </div>

      {isError && <ErrorState message="Failed to load webhooks." onRetry={refetch} />}

      <WebhookStats endpoints={endpoints} />

      <WebhookEndpointList
        endpoints={endpoints}
        isLoading={isLoading}
        onOpenCreate={openCreate}
        onToggle={(id, isActive) => toggleMutation.mutate({ id, isActive })}
        onTest={(id) => testMutation.mutate(id)}
        onViewLogs={(id) => setLogsDialog(id)}
        onEdit={openEdit}
        onDelete={(id) => deleteMutation.mutate(id)}
      />

      <WebhookFormDialog
        open={dialogOpen}
        onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}
        editing={editing}
        onSave={(payload) => saveMutation.mutate(payload)}
        isSaving={saveMutation.isPending}
      />

      <WebhookLogsDialog
        open={!!logsDialog}
        onOpenChange={() => setLogsDialog(null)}
        logs={logs}
      />
    </div>
  );
}
