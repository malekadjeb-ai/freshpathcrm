"use client";

import { Mail, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface Review {
  id: string;
  customer: { id: string; name: string; phone: string | null; email: string | null };
  status: string;
}

interface CreateReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: { id: string; name: string }[];
  selectedCustomerId: string;
  setSelectedCustomerId: (id: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}

export function CreateReviewDialog({
  open,
  onOpenChange,
  customers,
  selectedCustomerId,
  setSelectedCustomerId,
  onSubmit,
  isPending,
}: CreateReviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-slate-200 max-w-md">
        <DialogHeader>
          <DialogTitle>Request Review</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Customer *</Label>
            <Select value={selectedCustomerId} onValueChange={(v) => setSelectedCustomerId(v ?? "")}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}
              className="border-slate-200 text-slate-600 hover:bg-slate-50">
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={!selectedCustomerId || isPending}
              onClick={onSubmit}
            >
              {isPending ? "Creating..." : "Create Request"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SendReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  review: Review | null;
  onSend: (id: string, method: string) => void;
  isPending: boolean;
}

export function SendReviewDialog({
  open,
  onOpenChange,
  review,
  onSend,
  isPending,
}: SendReviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-slate-200 max-w-sm">
        <DialogHeader>
          <DialogTitle>Send Review Request</DialogTitle>
        </DialogHeader>
        {review && (
          <>
            <p className="text-sm text-slate-400">
              Send review request to {review.customer.name}
            </p>
            <div className="space-y-2 mt-2">
              <Button
                className="w-full justify-start"
                variant="outline"
                disabled={!review.customer.email || isPending}
                onClick={() => onSend(review.id, "email")}
              >
                <Mail className="w-4 h-4 mr-3" />
                <div className="text-left">
                  <div className="text-sm font-medium">Send via Email</div>
                  <div className="text-xs text-slate-400">
                    {review.customer.email || "No email on file"}
                  </div>
                </div>
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                disabled={!review.customer.phone || isPending}
                onClick={() => onSend(review.id, "sms")}
              >
                <MessageSquare className="w-4 h-4 mr-3" />
                <div className="text-left">
                  <div className="text-sm font-medium">Send via SMS</div>
                  <div className="text-xs text-slate-400">
                    {review.customer.phone || "No phone on file"}
                  </div>
                </div>
              </Button>
            </div>
            {isPending && (
              <p className="text-xs text-slate-400 text-center mt-2">Sending...</p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
