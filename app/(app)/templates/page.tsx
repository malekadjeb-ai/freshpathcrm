"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  MessageSquare,
  Mail,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Eye,
  Shield,
} from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { cn, fetchJson } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";

interface Template {
  id: string;
  name: string;
  type: string;
  subject: string | null;
  body: string;
  category: string;
  isDefault: boolean;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
}

const CATEGORIES = [
  { value: "confirmation", label: "Booking Confirmation" },
  { value: "reminder_24h", label: "24-Hour Reminder" },
  { value: "reminder_1h", label: "1-Hour Reminder" },
  { value: "follow_up", label: "Follow-Up" },
  { value: "review_request", label: "Review Request" },
  { value: "rebook", label: "Rebook Prompt" },
  { value: "invoice", label: "Invoice" },
  { value: "estimate", label: "Estimate" },
  { value: "welcome", label: "Welcome" },
  { value: "custom", label: "Custom" },
];

const VARIABLES = [
  "{{customer_name}}",
  "{{customer_first_name}}",
  "{{job_date}}",
  "{{job_time}}",
  "{{services}}",
  "{{total}}",
  "{{vehicle}}",
  "{{address}}",
  "{{payment_link}}",
  "{{review_link}}",
  "{{business_name}}",
  "{{business_phone}}",
  "{{booking_link}}",
  "{{invoice_number}}",
  "{{estimate_number}}",
  "{{estimate_total}}",
  "{{due_date}}",
];

const SAMPLE_VARS: Record<string, string> = {
  "{{customer_name}}": "Marcus Thompson",
  "{{customer_first_name}}": "Marcus",
  "{{job_date}}": "Monday, March 30, 2026",
  "{{job_time}}": "10:00 AM",
  "{{services}}": "Full Detail, Pet Hair Removal",
  "{{total}}": "$280.00",
  "{{vehicle}}": "2021 Toyota Tacoma",
  "{{address}}": "4521 Westover Hills Blvd",
  "{{payment_link}}": "https://pay.freshpath.com/inv-123",
  "{{review_link}}": "https://g.page/freshpath/review",
  "{{business_name}}": "Fresh Path Mobile Detailing",
  "{{business_phone}}": "(832) 555-0192",
  "{{booking_link}}": "https://freshpath.com/book",
  "{{invoice_number}}": "FP-0042",
  "{{estimate_number}}": "EST-0015",
  "{{estimate_total}}": "$350.00",
  "{{due_date}}": "April 5, 2026",
};

function resolvePreview(text: string): string {
  let result = text;
  for (const [key, value] of Object.entries(SAMPLE_VARS)) {
    result = result.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), value);
  }
  return result;
}

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState<"sms" | "email">("sms");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("custom");
  const [isActive, setIsActive] = useState(true);

  const { data: templates = [], isLoading, isError, refetch } = useQuery<Template[]>({
    queryKey: ["templates"],
    queryFn: () => fetchJson("/api/templates"),
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template created");
      closeDialog();
    },
    onError: () => toast.error("Failed to create template"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Record<string, unknown>;
    }) => {
      const res = await fetch(`/api/templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template updated");
      closeDialog();
    },
    onError: () => toast.error("Failed to update template"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template deleted");
    },
    onError: () => toast.error("Failed to delete template"),
  });

  function openCreate() {
    setEditingTemplate(null);
    setName("");
    setType("sms");
    setSubject("");
    setBody("");
    setCategory("custom");
    setIsActive(true);
    setDialogOpen(true);
  }

  function openEdit(t: Template) {
    setEditingTemplate(t);
    setName(t.name);
    setType(t.type as "sms" | "email");
    setSubject(t.subject || "");
    setBody(t.body);
    setCategory(t.category);
    setIsActive(t.isActive);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingTemplate(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      name,
      type,
      subject: type === "email" ? subject : null,
      body,
      category,
      isActive,
    };
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createMutation.mutate(data);
    }
  }

  function insertVariable(variable: string) {
    setBody((prev) => prev + variable);
  }

  const smsTemplates = templates.filter((t) => t.type === "sms");
  const emailTemplates = templates.filter((t) => t.type === "email");

  if (isError) return <ErrorState message="Failed to load templates." onRetry={refetch} />;

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 pb-24 md:pb-6">
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Message Templates
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Templates for automated and manual customer communications
          </p>
        </div>
        <Button
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
          onClick={openCreate}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      <Tabs defaultValue="sms">
        <TabsList>
          <TabsTrigger value="sms">
            <MessageSquare className="w-4 h-4 mr-1.5" />
            SMS ({smsTemplates.length})
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="w-4 h-4 mr-1.5" />
            Email ({emailTemplates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sms" className="mt-4">
          {smsTemplates.length === 0 ? (
            <EmptyState
              title="No SMS templates"
              description="Create your first SMS template"
              actionLabel="New Template"
              onAction={openCreate}
            />
          ) : (
            <div className="space-y-3">
              {smsTemplates.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  onEdit={() => openEdit(t)}
                  onDelete={() => deleteMutation.mutate(t.id)}
                  onPreview={() => {
                    setPreviewTemplate(t);
                    setPreviewOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="email" className="mt-4">
          {emailTemplates.length === 0 ? (
            <EmptyState
              title="No email templates"
              description="Create your first email template"
              actionLabel="New Template"
              onAction={openCreate}
            />
          ) : (
            <div className="space-y-3">
              {emailTemplates.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  onEdit={() => openEdit(t)}
                  onDelete={() => deleteMutation.mutate(t.id)}
                  onPreview={() => {
                    setPreviewTemplate(t);
                    setPreviewOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Template" : "New Template"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Template Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Follow-Up Text"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={type}
                  onValueChange={(v) => setType((v ?? "sms") as "sms" | "email")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v ?? "custom")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {type === "email" && (
              <div className="space-y-1.5">
                <Label>Subject Line</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Invoice {{invoice_number}} from {{business_name}}"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Message Body</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                placeholder="Write your message here. Use variables like {{customer_name}} for personalization."
                className="resize-none font-mono text-sm"
                required
              />
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Insert Variable
              </p>
              <div className="flex flex-wrap gap-1.5">
                {VARIABLES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    className="text-xs bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 px-2 py-1 rounded-md transition-colors font-mono"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {body && (
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                  Preview
                </p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {resolvePreview(body)}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-white flex-1"
                disabled={
                  createMutation.isPending || updateMutation.isPending
                }
              >
                {editingTemplate ? "Save Changes" : "Create Template"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {previewTemplate.type === "sms" ? (
                  <MessageSquare className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Mail className="w-4 h-4 text-blue-500" />
                )}
                <span className="font-medium text-sm">
                  {previewTemplate.name}
                </span>
              </div>
              {previewTemplate.type === "email" && previewTemplate.subject && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Subject</p>
                  <p className="text-sm font-medium text-slate-900">
                    {resolvePreview(previewTemplate.subject)}
                  </p>
                </div>
              )}
              <div
                className={cn(
                  "rounded-xl p-4 text-sm whitespace-pre-wrap",
                  previewTemplate.type === "sms"
                    ? "bg-emerald-50 text-emerald-900"
                    : "bg-blue-50 text-blue-900"
                )}
              >
                {resolvePreview(previewTemplate.body)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplateCard({
  template,
  onEdit,
  onDelete,
  onPreview,
}: {
  template: Template;
  onEdit: () => void;
  onDelete: () => void;
  onPreview: () => void;
}) {
  const categoryLabel =
    CATEGORIES.find((c) => c.value === template.category)?.label ??
    template.category;

  return (
    <div
      className={cn(
        "bg-white border border-slate-200 rounded-xl p-4 transition-all hover:shadow-sm",
        !template.isActive && "opacity-50"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-slate-900">
              {template.name}
            </span>
            {template.isDefault && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Shield className="w-3 h-3" />
                Default
              </Badge>
            )}
            <Badge
              variant="outline"
              className="text-xs"
            >
              {categoryLabel}
            </Badge>
            {!template.isActive && (
              <Badge variant="destructive" className="text-xs">
                Inactive
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 line-clamp-2 font-mono">
            {template.body}
          </p>
          {template.usageCount > 0 && (
            <p className="text-xs text-slate-400 mt-1">
              Used {template.usageCount} times
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onPreview}
            title="Preview"
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => {
              navigator.clipboard.writeText(template.body);
              toast.success("Copied to clipboard");
            }}
            title="Copy"
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onEdit}
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          {!template.isDefault && (
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-red-400 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete template?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete &quot;{template.name}&quot;.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-500 hover:bg-red-600"
                    onClick={onDelete}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </div>
  );
}
