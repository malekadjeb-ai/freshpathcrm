"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { SOURCES } from "./lead-types";

interface LeadFormState {
  name: string;
  phone: string;
  email: string;
  source: string;
  sourceDetail: string;
  vehicleInfo: string;
  address: string;
  city: string;
  notes: string;
  priority: string;
}

interface CreateLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: LeadFormState;
  onFormChange: (form: LeadFormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

export function CreateLeadDialog({
  open, onOpenChange, form, onFormChange, onSubmit, isPending,
}: CreateLeadDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => onFormChange({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => onFormChange({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => onFormChange({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Source *</Label>
              <Select value={form.source} onValueChange={(v) => onFormChange({ ...form, source: v ?? "Google" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => onFormChange({ ...form, priority: v ?? "medium" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Source Detail</Label>
            <Input value={form.sourceDetail} onChange={(e) => onFormChange({ ...form, sourceDetail: e.target.value })} placeholder="e.g., Referred by John Smith" />
          </div>
          <div className="space-y-1.5">
            <Label>Vehicle Info</Label>
            <Input value={form.vehicleInfo} onChange={(e) => onFormChange({ ...form, vehicleInfo: e.target.value })} placeholder="e.g., 2022 Tesla Model Y, white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => onFormChange({ ...form, address: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => onFormChange({ ...form, city: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => onFormChange({ ...form, notes: e.target.value })} rows={3} className="resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 py-2.5 rounded-lg"
              disabled={isPending}
            >
              {isPending ? "Creating..." : "Create Lead"}
            </Button>
            <Button
              type="button"
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-6 py-2.5 rounded-lg border border-slate-300"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface LostLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lostReason: string;
  onLostReasonChange: (reason: string) => void;
  lostNotes: string;
  onLostNotesChange: (notes: string) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function LostLeadDialog({
  open, onOpenChange, lostReason, onLostReasonChange,
  lostNotes, onLostNotesChange, onConfirm, isPending,
}: LostLeadDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Mark Lead as Lost</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Select value={lostReason} onValueChange={(v) => onLostReasonChange(v ?? "Price")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Price", "Timing", "No Response", "Competitor", "Not Interested", "Other"].map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea value={lostNotes} onChange={(e) => onLostNotesChange(e.target.value)} rows={2} className="resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
            <Button
              onClick={onConfirm}
              className="bg-red-500 hover:bg-red-600 text-white font-medium px-6 py-2.5 rounded-lg"
              disabled={isPending}
            >
              Mark as Lost
            </Button>
            <Button
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-6 py-2.5 rounded-lg border border-slate-300"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
