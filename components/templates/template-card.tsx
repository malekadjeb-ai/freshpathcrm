"use client";

import { Pencil, Trash2, Copy, Eye, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface Template {
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

export const CATEGORIES = [
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

export function TemplateCard({
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
  const categoryLabel = CATEGORIES.find((c) => c.value === template.category)?.label ?? template.category;

  return (
    <div className={cn("bg-white border border-slate-200 rounded-xl p-4 transition-all hover:shadow-sm", !template.isActive && "opacity-50")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-slate-900">{template.name}</span>
            {template.isDefault && (<Badge variant="secondary" className="text-xs gap-1"><Shield className="w-3 h-3" />Default</Badge>)}
            <Badge variant="outline" className="text-xs">{categoryLabel}</Badge>
            {!template.isActive && (<Badge variant="destructive" className="text-xs">Inactive</Badge>)}
          </div>
          <p className="text-xs text-slate-500 line-clamp-2 font-mono">{template.body}</p>
          {template.usageCount > 0 && (<p className="text-xs text-slate-400 mt-1">Used {template.usageCount} times</p>)}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon-xs" onClick={onPreview} title="Preview"><Eye className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon-xs" onClick={() => { navigator.clipboard.writeText(template.body); toast.success("Copied to clipboard"); }} title="Copy"><Copy className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon-xs" onClick={onEdit} title="Edit"><Pencil className="w-3.5 h-3.5" /></Button>
          {!template.isDefault && (
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="ghost" size="icon-xs" className="text-red-400 hover:text-red-600" title="Delete"><Trash2 className="w-3.5 h-3.5" /></Button>} />
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Delete template?</AlertDialogTitle><AlertDialogDescription>This will permanently delete &quot;{template.name}&quot;.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={onDelete}>Delete</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </div>
  );
}
