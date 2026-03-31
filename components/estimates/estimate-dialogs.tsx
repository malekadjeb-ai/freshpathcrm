"use client";

import { UseMutationResult } from "@tanstack/react-query";
import { Mail, MessageSquare, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";

interface EstimateCustomer {
  name: string;
  email: string | null;
  phone: string | null;
}

export function SendDialog({
  open,
  onOpenChange,
  estimateNumber,
  total,
  customer,
  sendMutation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estimateNumber: string;
  total: number;
  customer: EstimateCustomer;
  sendMutation: UseMutationResult<unknown, Error, string>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white max-w-sm">
        <DialogHeader>
          <DialogTitle>Send Estimate</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500 mb-4">
          Send {estimateNumber} ({formatCurrency(total)}) to {customer.name}
        </p>
        <div className="space-y-2">
          <Button className="w-full justify-start" variant="outline" disabled={!customer.email || sendMutation.isPending} onClick={() => sendMutation.mutate("email")}>
            <Mail className="w-4 h-4 mr-3" />
            <div className="text-left">
              <div className="text-sm font-medium">Send via Email</div>
              <div className="text-xs text-slate-400">{customer.email || "No email on file"}</div>
            </div>
          </Button>
          <Button className="w-full justify-start" variant="outline" disabled={!customer.phone || sendMutation.isPending} onClick={() => sendMutation.mutate("sms")}>
            <MessageSquare className="w-4 h-4 mr-3" />
            <div className="text-left">
              <div className="text-sm font-medium">Send via SMS</div>
              <div className="text-xs text-slate-400">{customer.phone || "No phone on file"}</div>
            </div>
          </Button>
        </div>
        {sendMutation.isPending && <p className="text-xs text-slate-400 text-center mt-2">Sending...</p>}
      </DialogContent>
    </Dialog>
  );
}

export function FollowUpDialog({
  open,
  onOpenChange,
  estimateNumber,
  customerName,
  daysSinceSent,
  customer,
  followUpMessage,
  setFollowUpMessage,
  followUpMutation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estimateNumber: string;
  customerName: string;
  daysSinceSent: number | null;
  customer: EstimateCustomer;
  followUpMessage: string;
  setFollowUpMessage: (v: string) => void;
  followUpMutation: UseMutationResult<unknown, Error, { method: string; message: string }>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white max-w-md">
        <DialogHeader>
          <DialogTitle>Follow Up on Estimate</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500 mb-2">
          {estimateNumber} &middot; {customerName}
          {daysSinceSent !== null && ` \u00b7 Sent ${daysSinceSent} days ago`}
        </p>
        <div className="space-y-3">
          <div>
            <Label>Custom message (optional)</Label>
            <Textarea value={followUpMessage} onChange={(e) => setFollowUpMessage(e.target.value)} className="mt-1" rows={3} placeholder="Leave blank to use default follow-up message..." />
          </div>
          <div className="space-y-2">
            <Button className="w-full justify-start" variant="outline" disabled={!customer.email || followUpMutation.isPending} onClick={() => followUpMutation.mutate({ method: "email", message: followUpMessage })}>
              <Mail className="w-4 h-4 mr-3" /> Follow up via Email
            </Button>
            <Button className="w-full justify-start" variant="outline" disabled={!customer.phone || followUpMutation.isPending} onClick={() => followUpMutation.mutate({ method: "sms", message: followUpMessage })}>
              <MessageSquare className="w-4 h-4 mr-3" /> Follow up via SMS
            </Button>
            <Button className="w-full justify-start" variant="outline" disabled={followUpMutation.isPending} onClick={() => followUpMutation.mutate({ method: "call", message: followUpMessage })}>
              <Phone className="w-4 h-4 mr-3" /> Create call-back task
            </Button>
          </div>
        </div>
        {followUpMutation.isPending && <p className="text-xs text-slate-400 text-center mt-2">Processing...</p>}
      </DialogContent>
    </Dialog>
  );
}
