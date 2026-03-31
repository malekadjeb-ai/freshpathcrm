"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Zap, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TRIGGER_TYPES, ACTION_TYPES } from "@/lib/validations/workflow";
import { toast } from "sonner";
import { ACTION_ICONS, type Workflow, type WorkflowAction } from "./workflow-types";

interface WorkflowBuilderProps {
  open: boolean;
  onClose: () => void;
  workflow: Workflow | null;
}

export function WorkflowBuilder({ open, onClose, workflow }: WorkflowBuilderProps) {
  const queryClient = useQueryClient();
  const isEditing = !!workflow?.id;

  const [name, setName] = useState(workflow?.name || "");
  const [description, setDescription] = useState(workflow?.description || "");
  const [triggerType, setTriggerType] = useState(workflow?.trigger.type || "");
  const [actions, setActions] = useState<WorkflowAction[]>(workflow?.actions || []);
  const [addActionOpen, setAddActionOpen] = useState(false);

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
      const body = { name, description, trigger: { type: triggerType }, actions, isActive: workflow?.isActive ?? true };
      const url = isEditing ? `/api/workflows/${workflow.id}` : "/api/workflows";
      const res = await fetch(url, { method: isEditing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
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

  function addAction(type: string) { setActions([...actions, { type, config: {} }]); setAddActionOpen(false); }
  function removeAction(index: number) { setActions(actions.filter((_, i) => i !== index)); }
  function updateActionConfig(index: number, key: string, value: unknown) {
    const updated = [...actions];
    updated[index] = { ...updated[index], config: { ...updated[index].config, [key]: value } };
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
          <DialogTitle>{isEditing ? "Edit Workflow" : "Create Workflow"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          <div className="grid gap-3">
            <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Post-Job Review Request" /></div>
            <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this workflow do?" rows={2} /></div>
          </div>

          <div>
            <Label className="flex items-center gap-1.5 mb-2"><Zap className="w-4 h-4 text-amber-500" />When this happens...</Label>
            <Select value={triggerType} onValueChange={(v) => setTriggerType(v ?? "")}>
              <SelectTrigger><SelectValue placeholder="Select trigger event" /></SelectTrigger>
              <SelectContent>{TRIGGER_TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}</SelectContent>
            </Select>
          </div>

          <div>
            <Label className="flex items-center gap-1.5 mb-2"><Play className="w-4 h-4 text-emerald-500" />Do these actions...</Label>
            <div className="space-y-2">
              {actions.map((action, idx) => {
                const actionDef = ACTION_TYPES.find((a) => a.value === action.type);
                const Icon = ACTION_ICONS[action.type] || Zap;
                return (
                  <Card key={idx} className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">{idx + 1}</div>
                        <Icon className="w-4 h-4 text-slate-600" />
                        <span className="text-sm font-medium">{actionDef?.label || action.type}</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeAction(idx)} className="h-7 w-7 text-red-400"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                    <ActionConfig action={action} onUpdateConfig={(k, v) => updateActionConfig(idx, k, v)} onUpdateDelay={(d) => updateActionDelay(idx, d)} />
                  </Card>
                );
              })}
              {actions.length > 0 && <div className="flex justify-center"><div className="w-px h-4 bg-slate-200" /></div>}
              <Button variant="outline" className="w-full border-dashed gap-2" onClick={() => setAddActionOpen(true)}><Plus className="w-4 h-4" />Add Action</Button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!canSave || saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : isEditing ? "Update Workflow" : "Create Workflow"}
            </Button>
          </div>
        </div>

        <Dialog open={addActionOpen} onOpenChange={setAddActionOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add Action</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {ACTION_TYPES.map((a) => {
                const Icon = ACTION_ICONS[a.value] || Zap;
                return (
                  <button key={a.value} onClick={() => addAction(a.value)} className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all text-left">
                    <Icon className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="text-sm font-medium text-slate-700">{a.label}</span>
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

function ActionConfig({ action, onUpdateConfig, onUpdateDelay }: {
  action: WorkflowAction;
  onUpdateConfig: (key: string, value: unknown) => void;
  onUpdateDelay: (delay: number) => void;
}) {
  const config = action.config || {};

  switch (action.type) {
    case "send_sms":
    case "send_rebook_prompt":
    case "request_review":
      return <Textarea placeholder="Message template... Use {{customerName}}, {{jobType}}, etc." value={(config.message as string) || ""} onChange={(e) => onUpdateConfig("message", e.target.value)} rows={2} className="text-xs" />;

    case "send_email":
      return (
        <div className="space-y-2">
          <Input placeholder="Subject" value={(config.subject as string) || ""} onChange={(e) => onUpdateConfig("subject", e.target.value)} className="text-xs" />
          <Textarea placeholder="Email body... Use {{customerName}}, etc." value={(config.body as string) || ""} onChange={(e) => onUpdateConfig("body", e.target.value)} rows={2} className="text-xs" />
        </div>
      );

    case "create_task":
      return (
        <div className="space-y-2">
          <Input placeholder="Task title" value={(config.title as string) || ""} onChange={(e) => onUpdateConfig("title", e.target.value)} className="text-xs" />
          <div className="flex gap-2">
            <Select value={(config.priority as string) || "medium"} onValueChange={(v) => onUpdateConfig("priority", v)}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Due in X days" value={(config.dueDays as number) || ""} onChange={(e) => onUpdateConfig("dueDays", parseInt(e.target.value) || 0)} className="text-xs w-32" />
          </div>
        </div>
      );

    case "update_lead_status":
      return (
        <Select value={(config.status as string) || ""} onValueChange={(v) => onUpdateConfig("status", v)}>
          <SelectTrigger className="text-xs"><SelectValue placeholder="New status" /></SelectTrigger>
          <SelectContent>
            {["new", "contacted", "qualified", "proposal", "won", "lost"].map((s) => (<SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>))}
          </SelectContent>
        </Select>
      );

    case "update_customer_tag":
      return (
        <div className="flex gap-2">
          <Select value={(config.action as string) || "add"} onValueChange={(v) => onUpdateConfig("action", v)}>
            <SelectTrigger className="text-xs w-24"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="add">Add</SelectItem><SelectItem value="remove">Remove</SelectItem></SelectContent>
          </Select>
          <Input placeholder="Tag name" value={(config.tag as string) || ""} onChange={(e) => onUpdateConfig("tag", e.target.value)} className="text-xs" />
        </div>
      );

    case "wait":
      return (
        <div className="flex items-center gap-2">
          <Input type="number" value={action.delay || ""} onChange={(e) => onUpdateDelay(parseInt(e.target.value) || 0)} className="text-xs w-20" min={1} />
          <span className="text-xs text-slate-500">minutes</span>
        </div>
      );

    case "condition":
      return (
        <div className="flex gap-2">
          <Input placeholder="Field name" value={(config.field as string) || ""} onChange={(e) => onUpdateConfig("field", e.target.value)} className="text-xs" />
          <Input placeholder="Expected value" value={(config.value as string) || ""} onChange={(e) => onUpdateConfig("value", e.target.value)} className="text-xs" />
        </div>
      );

    case "create_activity":
      return (
        <div className="space-y-2">
          <Select value={(config.activityType as string) || "NOTE"} onValueChange={(v) => onUpdateConfig("activityType", v)}>
            <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="NOTE">Note</SelectItem><SelectItem value="CALL">Call</SelectItem><SelectItem value="TEXT">Text</SelectItem><SelectItem value="EMAIL">Email</SelectItem></SelectContent>
          </Select>
          <Input placeholder="Summary... Use {{customerName}}, etc." value={(config.summary as string) || ""} onChange={(e) => onUpdateConfig("summary", e.target.value)} className="text-xs" />
          <Input type="number" placeholder="Follow-up in X days (optional)" value={(config.followUpDays as number) || ""} onChange={(e) => onUpdateConfig("followUpDays", parseInt(e.target.value) || 0)} className="text-xs w-48" />
        </div>
      );

    case "send_notification":
      return (
        <div className="space-y-2">
          <Input placeholder="Notification title" value={(config.title as string) || ""} onChange={(e) => onUpdateConfig("title", e.target.value)} className="text-xs" />
          <Input placeholder="Message... Use {{customerName}}, etc." value={(config.message as string) || ""} onChange={(e) => onUpdateConfig("message", e.target.value)} className="text-xs" />
          <Input placeholder="Link (optional, e.g. /customers/123)" value={(config.link as string) || ""} onChange={(e) => onUpdateConfig("link", e.target.value)} className="text-xs" />
        </div>
      );

    case "update_status":
      return (
        <div className="flex gap-2">
          <Select value={(config.entityType as string) || "lead"} onValueChange={(v) => onUpdateConfig("entityType", v)}>
            <SelectTrigger className="text-xs w-28"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="lead">Lead</SelectItem><SelectItem value="job">Job</SelectItem></SelectContent>
          </Select>
          <Input placeholder="New status" value={(config.status as string) || ""} onChange={(e) => onUpdateConfig("status", e.target.value)} className="text-xs" />
        </div>
      );

    case "webhook":
      return <Input placeholder="Webhook URL" value={(config.url as string) || ""} onChange={(e) => onUpdateConfig("url", e.target.value)} className="text-xs" />;

    default:
      return null;
  }
}
