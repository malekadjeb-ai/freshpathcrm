"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Phone, Mail, MessageSquare, StickyNote, User, Plus,
  ArrowDownLeft, ArrowUpRight, CheckCircle2, Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import type { LeadDetail } from "./lead-types";

interface LeadActivityTabProps {
  lead: LeadDetail;
  onLogActivity: () => void;
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  CALL: { icon: <Phone className="w-3.5 h-3.5" />, color: "bg-blue-50 text-blue-600" },
  TEXT: { icon: <MessageSquare className="w-3.5 h-3.5" />, color: "bg-green-50 text-green-600" },
  EMAIL: { icon: <Mail className="w-3.5 h-3.5" />, color: "bg-purple-50 text-purple-600" },
  IN_PERSON: { icon: <User className="w-3.5 h-3.5" />, color: "bg-orange-50 text-orange-600" },
  NOTE: { icon: <StickyNote className="w-3.5 h-3.5" />, color: "bg-amber-50 text-amber-600" },
};

export function LeadActivityTab({ lead, onLogActivity }: LeadActivityTabProps) {
  const queryClient = useQueryClient();

  const markFollowUpDoneMutation = useMutation({
    mutationFn: async (activityId: string) => {
      const res = await fetch(`/api/activities/${activityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followUpDone: true }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead", lead.id] });
      toast.success("Follow-up marked done");
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-sm text-slate-700">Activity Timeline</h3>
        <Button size="sm" variant="outline" className="gap-1" onClick={onLogActivity}>
          <Plus className="w-3.5 h-3.5" /> Log Activity
        </Button>
      </div>
      {(!lead.activities || lead.activities.length === 0) ? (
        <Card className="p-8 text-center">
          <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No activities logged yet</p>
        </Card>
      ) : (
        <div className="space-y-1">
          {lead.activities.map((act, idx) => {
            const tc = TYPE_CONFIG[act.type] || TYPE_CONFIG.NOTE;
            const isOverdue = act.followUpDate && !act.followUpDone && new Date(act.followUpDate) < new Date();

            return (
              <div key={act.id} className="flex gap-3 py-2.5 group">
                <div className="flex flex-col items-center">
                  <div className={cn("p-1.5 rounded-md", tc.color)}>{tc.icon}</div>
                  {idx < lead.activities.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1" />}
                </div>
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px] capitalize">{act.type.replace("_", " ").toLowerCase()}</Badge>
                    {act.direction && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                        {act.direction === "INBOUND" ? <ArrowDownLeft className="w-3 h-3 text-blue-500" /> : <ArrowUpRight className="w-3 h-3 text-emerald-500" />}
                        {act.direction.toLowerCase()}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 ml-auto">{formatDateTime(act.createdAt)}</span>
                  </div>
                  <p className="text-sm text-slate-700 mt-0.5">{act.summary}</p>
                  {act.followUpDate && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn(
                        "text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded",
                        act.followUpDone ? "bg-emerald-50 text-emerald-600" : isOverdue ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                      )}>
                        {act.followUpDone ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                        Follow-up: {formatDate(act.followUpDate)}
                        {isOverdue && !act.followUpDone && " (overdue)"}
                      </span>
                      {!act.followUpDone && (
                        <button
                          onClick={() => markFollowUpDoneMutation.mutate(act.id)}
                          className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Mark Done
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
