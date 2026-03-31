"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CATEGORIES } from "./template-card";

const VARIABLES = [
  "{{customer_name}}", "{{customer_first_name}}", "{{job_date}}", "{{job_time}}",
  "{{services}}", "{{total}}", "{{vehicle}}", "{{address}}", "{{payment_link}}",
  "{{review_link}}", "{{business_name}}", "{{business_phone}}", "{{booking_link}}",
  "{{invoice_number}}", "{{estimate_number}}", "{{estimate_total}}", "{{due_date}}",
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

export function resolvePreview(text: string): string {
  let result = text;
  for (const [key, value] of Object.entries(SAMPLE_VARS)) {
    result = result.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), value);
  }
  return result;
}

export function TemplateEditorDialog({
  open,
  onOpenChange,
  isEditing,
  name, setName,
  type, setType,
  subject, setSubject,
  body, setBody,
  category, setCategory,
  isPending,
  onSubmit,
  onCancel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  name: string; setName: (v: string) => void;
  type: "sms" | "email"; setType: (v: "sms" | "email") => void;
  subject: string; setSubject: (v: string) => void;
  body: string; setBody: (v: string) => void;
  category: string; setCategory: (v: string) => void;
  isPending: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEditing ? "Edit Template" : "New Template"}</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Template Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Follow-Up Text" required /></div>
            <div className="space-y-1.5"><Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType((v ?? "sms") as "sms" | "email")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sms">SMS</SelectItem><SelectItem value="email">Email</SelectItem></SelectContent></Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v ?? "custom")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}</SelectContent></Select>
          </div>
          {type === "email" && (
            <div className="space-y-1.5"><Label>Subject Line</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder='e.g., Invoice {{invoice_number}} from {{business_name}}' /></div>
          )}
          <div className="space-y-1.5"><Label>Message Body</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} placeholder="Write your message here. Use variables like {{customer_name}} for personalization." className="resize-none font-mono text-sm" required />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Insert Variable</p>
            <div className="flex flex-wrap gap-1.5">
              {VARIABLES.map((v) => (
                <button key={v} type="button" onClick={() => setBody(body + v)} className="text-xs bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 px-2 py-1 rounded-md transition-colors font-mono">{v}</button>
              ))}
            </div>
          </div>
          {body && (
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Preview</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{resolvePreview(body)}</p>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white flex-1" disabled={isPending}>{isEditing ? "Save Changes" : "Create Template"}</Button>
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
