"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Zap,
  Play,
  Trash2,
  ChevronDown,
  ArrowRight,
  Clock,
  MessageSquare,
  Mail,
  CheckSquare,
  Target,
  Tag,
  FileText,
  Star,
  RefreshCw,
  Webhook,
  GitBranch,
  Copy,
  History,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  XCircle,
  StickyNote,
  Bell,
  ArrowRightCircle,
} from "lucide-react";
import { toast } from "sonner";
import { TRIGGER_TYPES, ACTION_TYPES } from "@/lib/validations/workflow";
import { cn, fetchJson } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";
import { format } from "date-fns";

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  create_activity: StickyNote,
  create_task: CheckSquare,
  send_notification: Bell,
  update_status: ArrowRightCircle,
  update_customer_tag: Tag,
  update_lead_status: Target,
  send_sms: MessageSquare,
  send_email: Mail,
  create_invoice: FileText,
  request_review: Star,
  send_rebook_prompt: RefreshCw,
  webhook: Webhook,
  wait: Clock,
  condition: GitBranch,
};

interface WorkflowAction {
  type: string;
  config?: Record<string, unknown>;
  delay?: number;
}

interface WorkflowTrigger {
  type: string;
  conditions?: Record<string, unknown>;
}

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  isActive: boolean;
  isTemplate: boolean;
  runCount: number;
  lastRunAt: string | null;
  logCount: number;
  createdAt: string;
  updatedAt: string;
}

interface WorkflowLog {
  id: string;
  triggeredBy: string;
  status: string;
  actions: { action: string; status: string; result?: string; timestamp: string }[];
  error: string | null;
  createdAt: string;
}

export default function AutomationsPage() {
  const queryClient = useQueryClient();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [logsWorkflowId, setLogsWorkflowId] = useState<string | null>(null);
  const [tab, setTab] = useState("workflows");

  const { data: workflows = [], isLoading, isError, refetch } = useQuery<Workflow[]>({
    queryKey: ["workflows"],
    queryFn: () => fetchJson("/api/workflows"),
  });

  const { data: templates = [] } = useQuery<Workflow[]>({
    queryKey: ["workflow-templates"],
    queryFn: () => fetchJson("/api/workflows?templates=true"),
  });

  const { data: logs = [] } = useQuery<WorkflowLog[]>({
    queryKey: ["workflow-logs", logsWorkflowId],
    queryFn: () =>
      fetchJson(`/api/workflows/${logsWorkflowId}/logs`),
    enabled: !!logsWorkflowId,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/workflows/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed to update workflow");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workflows"] }),
    onError: () => toast.error("Failed to toggle workflow"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/workflows/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Workflow deleted");
    },
    onError: () => toast.error("Failed to delete workflow"),
  });

  const userWorkflows = workflows.filter((w) => !w.isTemplate);
  const activeCount = userWorkflows.filter((w) => w.isActive).length;
  const totalRuns = userWorkflows.reduce((s, w) => s + w.runCount, 0);

  function openBuilder(workflow?: Workflow) {
    setEditingWorkflow(workflow || null);
    setBuilderOpen(true);
  }

  function openLogs(workflowId: string) {
    setLogsWorkflowId(workflowId);
    setLogsOpen(true);
  }

  function applyTemplate(template: Workflow) {
    setEditingWorkflow({
      ...template,
      id: "",
      name: template.name.replace(" (Template)", ""),
      isTemplate: false,
    });
    setBuilderOpen(true);
  }

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Automations</h1>
          <p className="text-sm text-slate-500 mt-1">
            {activeCount} active workflow{activeCount !== 1 ? "s" : ""} &middot;{" "}
            {totalRuns} total runs
          </p>
        </div>
        <Button onClick={() => openBuilder()} className="gap-2">
          <Plus className="w-4 h-4" />
          New Workflow
        </Button>
      </div>

      {isError && <ErrorState message="Failed to load automations." onRetry={refetch} />}

      <Tabs value={tab} onValueChange={(v) => setTab(v as string || "workflows")}>
        <TabsList>
          <TabsTrigger value="workflows">My Workflows</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* My Workflows */}
        <TabsContent value="workflows" className="space-y-3 mt-4">
          {isLoading ? (
            <div className="grid gap-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-4 animate-pulse">
                  <div className="h-5 bg-slate-200 rounded w-48 mb-2" />
                  <div className="h-4 bg-slate-100 rounded w-96" />
                </Card>
              ))}
            </div>
          ) : userWorkflows.length === 0 ? (
            <EmptyState
              icon={Zap}
              title="No workflows yet"
              description="Create your first automation or start from a template."
              actionLabel="Create Workflow"
              onAction={() => openBuilder()}
            />
          ) : (
            <div className="grid gap-3">
              {userWorkflows.map((w) => (
                <WorkflowCard
                  key={w.id}
                  workflow={w}
                  onEdit={() => openBuilder(w)}
                  onToggle={(active) =>
                    toggleMutation.mutate({ id: w.id, isActive: active })
                  }
                  onDelete={() => deleteMutation.mutate(w.id)}
                  onViewLogs={() => openLogs(w.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates" className="mt-4">
          <div className="grid gap-3 md:grid-cols-2">
            {templates.filter((t) => t.isTemplate).length === 0 &&
            userWorkflows.length === 0 ? (
              <Card className="col-span-2 p-8 text-center">
                <Sparkles className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500">
                  Templates will appear here after seeding.
                </p>
              </Card>
            ) : null}
            {templates
              .filter((t) => t.isTemplate)
              .map((t) => (
                <Card
                  key={t.id}
                  className="p-4 hover:border-emerald-200 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-sm text-slate-800">
                        {t.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {t.description}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {TRIGGER_TYPES.find((tr) => tr.value === t.trigger.type)
                        ?.label || t.trigger.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-xs text-slate-400">
                    {t.actions.map((a, i) => {
                      const Icon = ACTION_ICONS[a.type] || Zap;
                      return (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && (
                            <ArrowRight className="w-3 h-3 text-slate-300" />
                          )}
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full gap-1"
                    onClick={() => applyTemplate(t)}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Use Template
                  </Button>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Workflow Builder Sheet */}
      <WorkflowBuilder
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        workflow={editingWorkflow}
      />

      {/* Logs Sheet */}
      <Sheet open={logsOpen} onOpenChange={setLogsOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Run History
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {logs.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                No runs yet
              </p>
            ) : (
              logs.map((log) => (
                <Card key={log.id} className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {log.status === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : log.status === "failed" ? (
                        <XCircle className="w-4 h-4 text-red-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                      )}
                      <span className="text-xs font-medium capitalize">
                        {log.status}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {format(new Date(log.createdAt), "MMM d, h:mm a")}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {log.actions.map((a, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-xs text-slate-600"
                      >
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            a.status === "success"
                              ? "bg-emerald-400"
                              : a.status === "failed"
                              ? "bg-red-400"
                              : "bg-slate-300"
                          )}
                        />
                        <span className="font-medium">{a.action}</span>
                        {a.result && (
                          <span className="text-slate-400 truncate">
                            — {a.result}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  {log.error && (
                    <p className="text-xs text-red-500 mt-2">{log.error}</p>
                  )}
                </Card>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function WorkflowCard({
  workflow,
  onEdit,
  onToggle,
  onDelete,
  onViewLogs,
}: {
  workflow: Workflow;
  onEdit: () => void;
  onToggle: (active: boolean) => void;
  onDelete: () => void;
  onViewLogs: () => void;
}) {
  const triggerLabel =
    TRIGGER_TYPES.find((t) => t.value === workflow.trigger.type)?.label ||
    workflow.trigger.type;

  return (
    <Card
      className={cn(
        "p-4 transition-all",
        workflow.isActive
          ? "border-emerald-100 bg-white"
          : "border-slate-100 bg-slate-50/50"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3
              className={cn(
                "font-semibold text-sm truncate",
                workflow.isActive ? "text-slate-800" : "text-slate-500"
              )}
            >
              {workflow.name}
            </h3>
            <Badge
              variant={workflow.isActive ? "default" : "secondary"}
              className="text-[10px] shrink-0"
            >
              {workflow.isActive ? "Active" : "Paused"}
            </Badge>
          </div>
          {workflow.description && (
            <p className="text-xs text-slate-500 mb-2 line-clamp-1">
              {workflow.description}
            </p>
          )}

          {/* Visual flow */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className="text-[10px] gap-1">
              <Zap className="w-3 h-3 text-amber-500" />
              {triggerLabel}
            </Badge>
            {workflow.actions.map((a, i) => {
              const Icon = ACTION_ICONS[a.type] || Zap;
              const label =
                ACTION_TYPES.find((at) => at.value === a.type)?.label || a.type;
              return (
                <span key={i} className="flex items-center gap-1">
                  <ArrowRight className="w-3 h-3 text-slate-300" />
                  <Badge
                    variant="outline"
                    className="text-[10px] gap-1 font-normal"
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                  </Badge>
                </span>
              );
            })}
          </div>

          <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400">
            <span>{workflow.runCount} runs</span>
            {workflow.lastRunAt && (
              <span>
                Last: {format(new Date(workflow.lastRunAt), "MMM d, h:mm a")}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Switch
            checked={workflow.isActive}
            onCheckedChange={onToggle}
          />
          <Button variant="ghost" size="icon" onClick={onViewLogs} title="View logs">
            <History className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onEdit} title="Edit">
            <ChevronDown className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="text-red-400 hover:text-red-600"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function WorkflowBuilder({
  open,
  onClose,
  workflow,
}: {
  open: boolean;
  onClose: () => void;
  workflow: Workflow | null;
}) {
  const queryClient = useQueryClient();
  const isEditing = !!workflow?.id;

  const [name, setName] = useState(workflow?.name || "");
  const [description, setDescription] = useState(workflow?.description || "");
  const [triggerType, setTriggerType] = useState(
    workflow?.trigger.type || ""
  );
  const [actions, setActions] = useState<WorkflowAction[]>(
    workflow?.actions || []
  );
  const [addActionOpen, setAddActionOpen] = useState(false);

  // Reset state when workflow changes
  const [lastWorkflowId, setLastWorkflowId] = useState<string | null>(null);
  if ((workflow?.id || null) !== lastWorkflowId) {
    setLastWorkflowId(workflow?.id || null);
    setName(workflow?.name || "");
    setDescription(workflow?.description || "");
    setTriggerType(workflow?.trigger.type || "");
    setActions(workflow?.actions || []);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        name,
        description,
        trigger: { type: triggerType },
        actions,
        isActive: workflow?.isActive ?? true,
      };

      const url = isEditing
        ? `/api/workflows/${workflow.id}`
        : "/api/workflows";
      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save workflow");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success(isEditing ? "Workflow updated" : "Workflow created");
      onClose();
    },
    onError: () => toast.error("Failed to save workflow"),
  });

  function addAction(type: string) {
    setActions([...actions, { type, config: {} }]);
    setAddActionOpen(false);
  }

  function removeAction(index: number) {
    setActions(actions.filter((_, i) => i !== index));
  }

  function updateActionConfig(index: number, key: string, value: unknown) {
    const updated = [...actions];
    updated[index] = {
      ...updated[index],
      config: { ...updated[index].config, [key]: value },
    };
    setActions(updated);
  }

  function updateActionDelay(index: number, delay: number) {
    const updated = [...actions];
    updated[index] = { ...updated[index], delay };
    setActions(updated);
  }

  const canSave = name.trim() && triggerType && actions.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Workflow" : "Create Workflow"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Name & Description */}
          <div className="grid gap-3">
            <div>
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Post-Job Review Request"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this workflow do?"
                rows={2}
              />
            </div>
          </div>

          {/* Trigger */}
          <div>
            <Label className="flex items-center gap-1.5 mb-2">
              <Zap className="w-4 h-4 text-amber-500" />
              When this happens...
            </Label>
            <Select value={triggerType} onValueChange={(v) => setTriggerType(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select trigger event" />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div>
            <Label className="flex items-center gap-1.5 mb-2">
              <Play className="w-4 h-4 text-emerald-500" />
              Do these actions...
            </Label>
            <div className="space-y-2">
              {actions.map((action, idx) => {
                const actionDef = ACTION_TYPES.find(
                  (a) => a.value === action.type
                );
                const Icon = ACTION_ICONS[action.type] || Zap;
                return (
                  <Card key={idx} className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                          {idx + 1}
                        </div>
                        <Icon className="w-4 h-4 text-slate-600" />
                        <span className="text-sm font-medium">
                          {actionDef?.label || action.type}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAction(idx)}
                        className="h-7 w-7 text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {/* Action-specific config */}
                    <ActionConfig
                      action={action}
                      onUpdateConfig={(k, v) => updateActionConfig(idx, k, v)}
                      onUpdateDelay={(d) => updateActionDelay(idx, d)}
                    />
                  </Card>
                );
              })}

              {actions.length > 0 && (
                <div className="flex justify-center">
                  <div className="w-px h-4 bg-slate-200" />
                </div>
              )}

              <Button
                variant="outline"
                className="w-full border-dashed gap-2"
                onClick={() => setAddActionOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Add Action
              </Button>
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!canSave || saveMutation.isPending}
            >
              {saveMutation.isPending
                ? "Saving..."
                : isEditing
                ? "Update Workflow"
                : "Create Workflow"}
            </Button>
          </div>
        </div>

        {/* Add Action Dialog */}
        <Dialog open={addActionOpen} onOpenChange={setAddActionOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Action</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {ACTION_TYPES.map((a) => {
                const Icon = ACTION_ICONS[a.value] || Zap;
                return (
                  <button
                    key={a.value}
                    onClick={() => addAction(a.value)}
                    className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all text-left"
                  >
                    <Icon className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="text-sm font-medium text-slate-700">
                      {a.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

function ActionConfig({
  action,
  onUpdateConfig,
  onUpdateDelay,
}: {
  action: WorkflowAction;
  onUpdateConfig: (key: string, value: unknown) => void;
  onUpdateDelay: (delay: number) => void;
}) {
  const config = action.config || {};

  switch (action.type) {
    case "send_sms":
    case "send_rebook_prompt":
    case "request_review":
      return (
        <div className="space-y-2">
          <Textarea
            placeholder="Message template... Use {{customerName}}, {{jobType}}, etc."
            value={(config.message as string) || ""}
            onChange={(e) => onUpdateConfig("message", e.target.value)}
            rows={2}
            className="text-xs"
          />
        </div>
      );

    case "send_email":
      return (
        <div className="space-y-2">
          <Input
            placeholder="Subject"
            value={(config.subject as string) || ""}
            onChange={(e) => onUpdateConfig("subject", e.target.value)}
            className="text-xs"
          />
          <Textarea
            placeholder="Email body... Use {{customerName}}, etc."
            value={(config.body as string) || ""}
            onChange={(e) => onUpdateConfig("body", e.target.value)}
            rows={2}
            className="text-xs"
          />
        </div>
      );

    case "create_task":
      return (
        <div className="space-y-2">
          <Input
            placeholder="Task title"
            value={(config.title as string) || ""}
            onChange={(e) => onUpdateConfig("title", e.target.value)}
            className="text-xs"
          />
          <div className="flex gap-2">
            <Select
              value={(config.priority as string) || "medium"}
              onValueChange={(v) => onUpdateConfig("priority", v)}
            >
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Due in X days"
              value={(config.dueDays as number) || ""}
              onChange={(e) =>
                onUpdateConfig("dueDays", parseInt(e.target.value) || 0)
              }
              className="text-xs w-32"
            />
          </div>
        </div>
      );

    case "update_lead_status":
      return (
        <Select
          value={(config.status as string) || ""}
          onValueChange={(v) => onUpdateConfig("status", v)}
        >
          <SelectTrigger className="text-xs">
            <SelectValue placeholder="New status" />
          </SelectTrigger>
          <SelectContent>
            {["new", "contacted", "qualified", "proposal", "won", "lost"].map(
              (s) => (
                <SelectItem key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      );

    case "update_customer_tag":
      return (
        <div className="flex gap-2">
          <Select
            value={(config.action as string) || "add"}
            onValueChange={(v) => onUpdateConfig("action", v)}
          >
            <SelectTrigger className="text-xs w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="add">Add</SelectItem>
              <SelectItem value="remove">Remove</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Tag name"
            value={(config.tag as string) || ""}
            onChange={(e) => onUpdateConfig("tag", e.target.value)}
            className="text-xs"
          />
        </div>
      );

    case "wait":
      return (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={action.delay || ""}
            onChange={(e) => onUpdateDelay(parseInt(e.target.value) || 0)}
            className="text-xs w-20"
            min={1}
          />
          <span className="text-xs text-slate-500">minutes</span>
        </div>
      );

    case "condition":
      return (
        <div className="flex gap-2">
          <Input
            placeholder="Field name"
            value={(config.field as string) || ""}
            onChange={(e) => onUpdateConfig("field", e.target.value)}
            className="text-xs"
          />
          <Input
            placeholder="Expected value"
            value={(config.value as string) || ""}
            onChange={(e) => onUpdateConfig("value", e.target.value)}
            className="text-xs"
          />
        </div>
      );

    case "create_activity":
      return (
        <div className="space-y-2">
          <Select
            value={(config.activityType as string) || "NOTE"}
            onValueChange={(v) => onUpdateConfig("activityType", v)}
          >
            <SelectTrigger className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NOTE">Note</SelectItem>
              <SelectItem value="CALL">Call</SelectItem>
              <SelectItem value="TEXT">Text</SelectItem>
              <SelectItem value="EMAIL">Email</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Summary... Use {{customerName}}, etc."
            value={(config.summary as string) || ""}
            onChange={(e) => onUpdateConfig("summary", e.target.value)}
            className="text-xs"
          />
          <Input
            type="number"
            placeholder="Follow-up in X days (optional)"
            value={(config.followUpDays as number) || ""}
            onChange={(e) => onUpdateConfig("followUpDays", parseInt(e.target.value) || 0)}
            className="text-xs w-48"
          />
        </div>
      );

    case "send_notification":
      return (
        <div className="space-y-2">
          <Input
            placeholder="Notification title"
            value={(config.title as string) || ""}
            onChange={(e) => onUpdateConfig("title", e.target.value)}
            className="text-xs"
          />
          <Input
            placeholder="Message... Use {{customerName}}, etc."
            value={(config.message as string) || ""}
            onChange={(e) => onUpdateConfig("message", e.target.value)}
            className="text-xs"
          />
          <Input
            placeholder="Link (optional, e.g. /customers/123)"
            value={(config.link as string) || ""}
            onChange={(e) => onUpdateConfig("link", e.target.value)}
            className="text-xs"
          />
        </div>
      );

    case "update_status":
      return (
        <div className="flex gap-2">
          <Select
            value={(config.entityType as string) || "lead"}
            onValueChange={(v) => onUpdateConfig("entityType", v)}
          >
            <SelectTrigger className="text-xs w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="job">Job</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="New status"
            value={(config.status as string) || ""}
            onChange={(e) => onUpdateConfig("status", e.target.value)}
            className="text-xs"
          />
        </div>
      );

    case "webhook":
      return (
        <Input
          placeholder="Webhook URL"
          value={(config.url as string) || ""}
          onChange={(e) => onUpdateConfig("url", e.target.value)}
          className="text-xs"
        />
      );

    default:
      return null;
  }
}
