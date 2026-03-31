"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Phone, Mail, MessageSquare, StickyNote, User,
  ArrowDownLeft, ArrowUpRight, CalendarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface LogActivityDialogProps {
  leadId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACTIVITY_TYPES = [
  { value: "CALL", label: "Call", icon: Phone },
  { value: "TEXT", label: "Text", icon: MessageSquare },
  { value: "EMAIL", label: "Email", icon: Mail },
  { value: "IN_PERSON", label: "In-Person", icon: User },
  { value: "NOTE", label: "Note", icon: StickyNote },
];

const DIRECTIONS = [
  { value: "INBOUND", label: "Inbound", icon: ArrowDownLeft },
  { value: "OUTBOUND", label: "Outbound", icon: ArrowUpRight },
];

export function LogActivityDialog({ leadId, open, onOpenChange }: LogActivityDialogProps) {
  const queryClient = useQueryClient();
  const [actType, setActType] = useState("CALL");
  const [actDirection, setActDirection] = useState("OUTBOUND");
  const [actSummary, setActSummary] = useState("");
  const [actFollowUp, setActFollowUp] = useState("");

  const logActivityMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          type: actType,
          direction: actType === "NOTE" ? null : actDirection,
          summary: actSummary,
          followUpDate: actFollowUp || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
      toast.success("Activity logged");
      onOpenChange(false);
      setActSummary("");
      setActFollowUp("");
    },
    onError: () => toast.error("Failed to log activity"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Activity</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <div className="flex flex-wrap gap-2">
              {ACTIVITY_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setActType(t.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                    actType === t.value
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  )}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          {actType !== "NOTE" && (
            <div className="space-y-1.5">
              <Label>Direction</Label>
              <div className="flex gap-2">
                {DIRECTIONS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setActDirection(d.value)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex-1",
                      actDirection === d.value
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    )}
                  >
                    <d.icon className="w-3.5 h-3.5" />
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Summary *</Label>
            <Textarea
              rows={3}
              value={actSummary}
              onChange={(e) => setActSummary(e.target.value)}
              placeholder="What happened?"
              className="resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5" /> Follow-Up Date
            </Label>
            <Input type="date" value={actFollowUp} onChange={(e) => setActFollowUp(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => logActivityMutation.mutate()}
            disabled={!actSummary.trim() || logActivityMutation.isPending}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {logActivityMutation.isPending ? "Saving..." : "Log Activity"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
