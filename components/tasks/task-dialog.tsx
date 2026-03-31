"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const TYPES = [
  { value: "general", label: "General" },
  { value: "follow_up", label: "Follow Up" },
  { value: "call_back", label: "Call Back" },
  { value: "send_estimate", label: "Send Estimate" },
  { value: "review_request", label: "Review Request" },
  { value: "rebook", label: "Rebook" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export interface TaskFormState {
  title: string;
  description: string;
  type: string;
  dueDate: string;
  dueTime: string;
  priority: string;
  customerId: string;
  jobId: string;
}

interface TaskDialogProps {
  open: boolean;
  onClose: () => void;
  form: TaskFormState;
  onFormChange: (form: TaskFormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  customers: { id: string; name: string }[];
}

export function TaskDialog({ open, onClose, form, onFormChange, onSubmit, isPending, customers }: TaskDialogProps) {
  const set = (partial: Partial<TaskFormState>) => onFormChange({ ...form, ...partial });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white border-slate-200 max-w-lg">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => set({ title: e.target.value })} className="mt-1" required />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => set({ description: e.target.value })} className="mt-1" rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => set({ type: v ?? "general" })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => set({ priority: v ?? "medium" })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => set({ dueDate: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Due Time</Label>
              <Input type="time" value={form.dueTime} onChange={(e) => set({ dueTime: e.target.value })} className="mt-1" />
            </div>
          </div>

          <div>
            <Label>Customer</Label>
            <Select value={form.customerId} onValueChange={(v) => set({ customerId: v ?? "" })}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="border-slate-200 text-slate-600 hover:bg-slate-50">
              Cancel
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={isPending}>
              {isPending ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
