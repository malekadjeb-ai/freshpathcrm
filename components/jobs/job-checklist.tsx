"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, CheckCircle, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchJson } from "@/lib/utils";
import { toast } from "sonner";

interface JobChecklistData {
  id: string;
  checklistId: string;
  checklistName: string;
  completedAt: string | null;
  items: { label: string; required: boolean; checked: boolean; note?: string }[];
}

interface ChecklistTemplate {
  id: string;
  name: string;
  items: { label: string; required: boolean }[];
  isActive: boolean;
}

export function JobChecklists({ jobId }: { jobId: string }) {
  const queryClient = useQueryClient();

  const { data: jobChecklists = [] } = useQuery<JobChecklistData[]>({
    queryKey: ["job-checklists", jobId],
    queryFn: () => fetchJson(`/api/jobs/${jobId}/checklists`),
  });

  const { data: templates = [] } = useQuery<ChecklistTemplate[]>({
    queryKey: ["checklists-active"],
    queryFn: () => fetchJson("/api/checklists?active=true"),
  });

  const attachMutation = useMutation({
    mutationFn: async (checklistId: string) => {
      const res = await fetch(`/api/jobs/${jobId}/checklists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklistId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-checklists", jobId] });
      toast.success("Checklist added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ jcId, items }: { jcId: string; items: JobChecklistData["items"] }) => {
      const res = await fetch(`/api/jobs/${jobId}/checklists/${jcId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-checklists", jobId] });
    },
    onError: () => toast.error("Failed to update checklist"),
  });

  const removeMutation = useMutation({
    mutationFn: async (jcId: string) => {
      const res = await fetch(`/api/jobs/${jobId}/checklists/${jcId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-checklists", jobId] });
      toast.success("Checklist removed");
    },
    onError: () => toast.error("Failed to remove"),
  });

  const toggleItem = (jc: JobChecklistData, itemIndex: number) => {
    const newItems = jc.items.map((item, i) =>
      i === itemIndex ? { ...item, checked: !item.checked } : item
    );
    updateMutation.mutate({ jcId: jc.id, items: newItems });
  };

  const attachedIds = new Set(jobChecklists.map((jc) => jc.checklistId));
  const availableTemplates = templates.filter((t) => !attachedIds.has(t.id));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-emerald-500" />
            Checklists
          </CardTitle>
          {availableTemplates.length > 0 && (
            <Select onValueChange={(v) => { const val = String(v ?? ""); if (val) attachMutation.mutate(val); }}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue placeholder="Add checklist..." />
              </SelectTrigger>
              <SelectContent>
                {availableTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {jobChecklists.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">
            No checklists attached.{" "}
            {templates.length > 0 ? "Use the dropdown above to add one." : "Create checklist templates first."}
          </p>
        ) : (
          <div className="space-y-4">
            {jobChecklists.map((jc) => {
              const total = jc.items.length;
              const checked = jc.items.filter((i) => i.checked).length;
              const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
              return (
                <div key={jc.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-slate-900">{jc.checklistName}</span>
                      {jc.completedAt ? (
                        <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Complete
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400">{checked}/{total}</span>
                      )}
                    </div>
                    <button
                      onClick={() => removeMutation.mutate(jc.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <Progress value={pct} className="h-1.5 mb-3" />
                  <div className="space-y-2">
                    {jc.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2.5">
                        <Checkbox
                          checked={item.checked}
                          onCheckedChange={() => toggleItem(jc, idx)}
                        />
                        <span className={`text-sm ${item.checked ? "line-through text-slate-400" : "text-slate-700"}`}>
                          {item.label}
                        </span>
                        {item.required && !item.checked && (
                          <span className="text-[10px] text-red-400 font-medium">Required</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
