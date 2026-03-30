"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Webhook,
  Plus,
  Trash2,
  Edit2,
  Eye,
  Zap,
  CheckCircle,
  XCircle,
  Clock,
  TestTube,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
import { formatDateTime, fetchJson } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import { WEBHOOK_EVENTS } from "@/lib/validations/webhook";
import { toast } from "sonner";

interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  secret: string | null;
  description: string | null;
  isActive: boolean;
  lastFired: string | null;
  failCount: number;
  logCount: number;
  createdAt: string;
}

interface WebhookLog {
  id: string;
  event: string;
  statusCode: number | null;
  success: boolean;
  duration: number | null;
  error: string | null;
  createdAt: string;
  payload: string;
  response: string | null;
}

const EVENT_CATEGORIES: Record<string, string[]> = {
  Jobs: ["job.created", "job.updated", "job.completed", "job.cancelled"],
  Customers: ["customer.created", "customer.updated"],
  Invoices: ["invoice.created", "invoice.paid"],
  Leads: ["lead.created", "lead.converted"],
  Payments: ["payment.received"],
  Estimates: ["estimate.created", "estimate.accepted"],
};

export default function WebhooksPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WebhookEndpoint | null>(null);
  const [logsDialog, setLogsDialog] = useState<string | null>(null);

  // Form state
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [secret, setSecret] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

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
    setUrl("");
    setDescription("");
    setSecret("");
    setSelectedEvents([]);
    setIsActive(true);
    setDialogOpen(true);
  }

  function openEdit(ep: WebhookEndpoint) {
    setEditing(ep);
    setUrl(ep.url);
    setDescription(ep.description || "");
    setSecret(ep.secret || "");
    setSelectedEvents(ep.events);
    setIsActive(ep.isActive);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
  }

  function toggleEvent(event: string) {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }

  function toggleCategory(events: string[]) {
    const allSelected = events.every((e) => selectedEvents.includes(e));
    if (allSelected) {
      setSelectedEvents((prev) => prev.filter((e) => !events.includes(e)));
    } else {
      setSelectedEvents((prev) => {
        const newSet = new Set([...prev, ...events]);
        return Array.from(newSet);
      });
    }
  }

  function handleSave() {
    saveMutation.mutate({
      url,
      description: description || undefined,
      secret: secret || undefined,
      events: selectedEvents,
      isActive,
    });
  }

  const activeCount = endpoints.filter((e) => e.isActive).length;
  const totalDeliveries = endpoints.reduce((s, e) => s + e.logCount, 0);
  const failingCount = endpoints.filter((e) => e.failCount > 0).length;

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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-slate-900">{endpoints.length}</div>
            <div className="text-xs text-slate-500 mt-1">Endpoints</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-emerald-600">{activeCount}</div>
            <div className="text-xs text-slate-500 mt-1">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{totalDeliveries}</div>
            <div className="text-xs text-slate-500 mt-1">Total Deliveries</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className={`text-2xl font-bold ${failingCount > 0 ? "text-red-600" : "text-slate-900"}`}>
              {failingCount}
            </div>
            <div className="text-xs text-slate-500 mt-1">Failing</div>
          </CardContent>
        </Card>
      </div>

      {/* Endpoints List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : endpoints.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Webhook className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-medium text-slate-600 mb-2">No webhook endpoints</h3>
            <p className="text-sm text-slate-400 mb-4">
              Add an endpoint to receive real-time event notifications
            </p>
            <Button onClick={openCreate} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" /> Add Endpoint
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {endpoints.map((ep) => (
            <Card key={ep.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className={`w-4 h-4 ${ep.isActive ? "text-emerald-500" : "text-slate-300"}`} />
                      <code className="text-sm font-mono text-slate-900 truncate block max-w-md">
                        {ep.url}
                      </code>
                      <Badge className={ep.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>
                        {ep.isActive ? "Active" : "Inactive"}
                      </Badge>
                      {ep.failCount > 0 && (
                        <Badge className="bg-red-100 text-red-700">
                          {ep.failCount} failures
                        </Badge>
                      )}
                    </div>
                    {ep.description && (
                      <p className="text-sm text-slate-500 mb-2">{ep.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {ep.events.slice(0, 5).map((event) => (
                        <Badge key={event} variant="secondary" className="text-[10px] font-mono">
                          {event}
                        </Badge>
                      ))}
                      {ep.events.length > 5 && (
                        <Badge variant="secondary" className="text-[10px]">
                          +{ep.events.length - 5} more
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>{ep.logCount} deliveries</span>
                      {ep.lastFired && <span>Last fired {formatDateTime(ep.lastFired)}</span>}
                      {ep.secret && <span>Signed</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Switch
                      checked={ep.isActive}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({ id: ep.id, isActive: !!checked })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => testMutation.mutate(ep.id)}
                      title="Send test"
                    >
                      <TestTube className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLogsDialog(ep.id)}
                      title="View logs"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(ep)} title="Edit">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger render={
                        <Button variant="ghost" size="sm" className="text-red-500" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      } />
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
                          <AlertDialogDescription>
                            Delete this endpoint and all delivery logs? This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(ep.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Webhook" : "Add Webhook Endpoint"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Endpoint URL</Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/webhook"
                className="font-mono text-sm"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Zapier integration, Slack notifications..."
              />
            </div>
            <div>
              <Label>Signing Secret (optional)</Label>
              <div className="flex gap-2">
                <Input
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="whsec_..."
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const s = "whsec_" + crypto.randomUUID().replace(/-/g, "");
                    setSecret(s);
                  }}
                >
                  Generate
                </Button>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Used to sign payloads with HMAC-SHA256 for verification
              </p>
            </div>

            {/* Events */}
            <div>
              <Label className="mb-2 block">Events</Label>
              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {Object.entries(EVENT_CATEGORIES).map(([category, events]) => {
                  const allSelected = events.every((e) => selectedEvents.includes(e));
                  const someSelected = events.some((e) => selectedEvents.includes(e));
                  return (
                    <div key={category} className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Checkbox
                          checked={allSelected}
                          indeterminate={someSelected && !allSelected}
                          onCheckedChange={() => toggleCategory(events)}
                        />
                        <span className="text-sm font-medium text-slate-700">{category}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 pl-6">
                        {events.map((event) => (
                          <label key={event} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={selectedEvents.includes(event)}
                              onCheckedChange={() => toggleEvent(event)}
                            />
                            <span className="text-xs font-mono text-slate-600">{event}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              {selectedEvents.length > 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  {selectedEvents.length} of {WEBHOOK_EVENTS.length} events selected
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={isActive} onCheckedChange={(v) => setIsActive(!!v)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={!url || selectedEvents.length === 0 || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : editing ? "Update" : "Create Endpoint"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logs Dialog */}
      <Dialog open={!!logsDialog} onOpenChange={() => setLogsDialog(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Delivery Logs</DialogTitle>
          </DialogHeader>
          {logs.length === 0 ? (
            <div className="py-8 text-center">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No deliveries yet</p>
            </div>
          ) : (
            <div className="space-y-2 mt-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="border rounded-lg p-3 text-sm"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {log.success ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {log.event}
                      </Badge>
                      {log.statusCode && (
                        <span className={`text-xs font-mono ${log.success ? "text-emerald-600" : "text-red-600"}`}>
                          {log.statusCode}
                        </span>
                      )}
                      {log.duration != null && (
                        <span className="text-xs text-slate-400">{log.duration}ms</span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">{formatDateTime(log.createdAt)}</span>
                  </div>
                  {log.error && (
                    <p className="text-xs text-red-500 mt-1">{log.error}</p>
                  )}
                  <details className="mt-1">
                    <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">
                      View payload
                    </summary>
                    <pre className="mt-1 p-2 bg-slate-50 rounded text-[10px] font-mono overflow-x-auto max-h-32">
                      {(() => {
                        try { return JSON.stringify(JSON.parse(log.payload), null, 2); }
                        catch { return log.payload; }
                      })()}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
