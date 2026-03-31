"use client";

import { useState } from "react";
import { Users, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { type Campaign, type AudiencePreview } from "./campaign-types";

interface CampaignFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Campaign | null;
  onSave: (payload: Record<string, unknown>) => void;
  isSaving: boolean;
}

export function CampaignFormDialog({ open, onOpenChange, editing, onSave, isSaving }: CampaignFormDialogProps) {
  const [name, setName] = useState(editing?.name || "");
  const [description, setDescription] = useState(editing?.description || "");
  const [type, setType] = useState<"sms" | "email" | "both">((editing?.type as "sms" | "email" | "both") || "sms");
  const [subject, setSubject] = useState(editing?.subject || "");
  const [body, setBody] = useState(editing?.body || "");
  const [scheduledAt, setScheduledAt] = useState(editing?.scheduledAt ? editing.scheduledAt.slice(0, 16) : "");
  const [criteriaCity, setCriteriaCity] = useState("");
  const [criteriaStage, setCriteriaStage] = useState("");
  const [criteriaSource, setCriteriaSource] = useState("");
  const [audiencePreview, setAudiencePreview] = useState<AudiencePreview | null>(null);

  // Sync form when editing changes
  const [lastEditId, setLastEditId] = useState<string | null>(null);
  if ((editing?.id || null) !== lastEditId) {
    setLastEditId(editing?.id || null);
    setName(editing?.name || "");
    setDescription(editing?.description || "");
    setType((editing?.type as "sms" | "email" | "both") || "sms");
    setSubject(editing?.subject || "");
    setBody(editing?.body || "");
    setScheduledAt(editing?.scheduledAt ? editing.scheduledAt.slice(0, 16) : "");
    const criteria = editing ? JSON.parse(editing.targetCriteria || "{}") : {};
    setCriteriaCity(criteria.city || "");
    setCriteriaStage(criteria.lifecycleStage || "");
    setCriteriaSource(criteria.source || "");
    setAudiencePreview(null);
  }

  function buildCriteria() {
    const c: Record<string, string> = {};
    if (criteriaCity) c.city = criteriaCity;
    if (criteriaStage) c.lifecycleStage = criteriaStage;
    if (criteriaSource) c.source = criteriaSource;
    return JSON.stringify(c);
  }

  async function previewAudience() {
    try {
      const res = await fetch("/api/campaigns/preview-audience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ criteria: buildCriteria(), type }),
      });
      if (res.ok) {
        setAudiencePreview(await res.json());
      }
    } catch {
      toast.error("Failed to preview audience");
    }
  }

  function handleSave() {
    onSave({
      name,
      description: description || undefined,
      type,
      subject: subject || undefined,
      body,
      targetCriteria: buildCriteria(),
      scheduledAt: scheduledAt || null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Campaign" : "New Campaign"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Campaign Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Spring Detailing Special" />
            </div>
            <div className="col-span-2">
              <Label>Description (optional)</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description..." />
            </div>
            <div>
              <Label>Channel</Label>
              <Select value={type} onValueChange={(v) => setType(String(v ?? "") as "sms" | "email" | "both")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="both">SMS + Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Schedule (optional)</Label>
              <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </div>
          </div>

          {(type === "email" || type === "both") && (
            <div>
              <Label>Email Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Your vehicle deserves the best..." />
            </div>
          )}

          <div>
            <Label>Message Body</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Hi {name}! We'd love to help you keep your vehicle looking fresh..." rows={4} />
            <p className="text-xs text-slate-400 mt-1">Use {"{name}"} for customer name, {"{phone}"} for phone</p>
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Audience Targeting</Label>
              <Button variant="outline" size="sm" onClick={previewAudience}>
                <Users className="w-3.5 h-3.5 mr-1" /> Preview Audience
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">City</Label>
                <Input value={criteriaCity} onChange={(e) => setCriteriaCity(e.target.value)} placeholder="Any" className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Lifecycle Stage</Label>
                <Select value={criteriaStage || "all"} onValueChange={(v) => setCriteriaStage(String(v ?? "") === "all" ? "" : String(v ?? ""))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                    <SelectItem value="at-risk">At Risk</SelectItem>
                    <SelectItem value="dormant">Dormant</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Source</Label>
                <Input value={criteriaSource} onChange={(e) => setCriteriaSource(e.target.value)} placeholder="Any" className="h-8 text-sm" />
              </div>
            </div>

            {audiencePreview && (
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-medium text-slate-900">{audiencePreview.count} matching customers</span>
                </div>
                {audiencePreview.sample.length > 0 && (
                  <div className="space-y-1">
                    {audiencePreview.sample.map((s) => (
                      <div key={s.id} className="flex items-center justify-between text-xs text-slate-500">
                        <span>{s.name}</span>
                        <span>{s.phone || s.email || "\u2014"}</span>
                      </div>
                    ))}
                    {audiencePreview.count > 10 && (
                      <p className="text-xs text-slate-400 mt-1">...and {audiencePreview.count - 10} more</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!name || !body || isSaving}>
              {isSaving ? "Saving..." : editing ? "Update" : "Create Campaign"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
