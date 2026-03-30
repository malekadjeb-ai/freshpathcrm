"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { FileText, Search, X, Briefcase, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from "@/lib/utils";

interface CustomerResult {
  id: string;
  name: string;
  phone: string | null;
  vehicleSummary: string | null;
}

interface CompletedJob {
  id: string;
  total: number;
  status: string;
  completedAt: string | null;
  scheduledAt: string | null;
  services: { serviceItem: { name: string } | null; customName?: string | null }[];
  invoice: { id: string } | null;
}

interface LineItem {
  description: string;
  amount: number;
}

interface QuickInvoiceProps {
  onClose: () => void;
  prefillJobId?: string;
  prefillCustomerId?: string;
}

export function QuickInvoice({ onClose, prefillJobId, prefillCustomerId }: QuickInvoiceProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerId, setCustomerId] = useState(prefillCustomerId || "");
  const [customerName, setCustomerName] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: "", amount: 0 }]);

  // Search customers
  const { data: searchResults = [] } = useQuery<CustomerResult[]>({
    queryKey: ["customer-search-inv", customerSearch],
    queryFn: () => fetch(`/api/customers/search?q=${encodeURIComponent(customerSearch)}`).then((r) => r.json()),
    enabled: customerSearch.length >= 1 && !customerId,
  });

  // Load customer's completed jobs without invoices
  const { data: completedJobs = [] } = useQuery<CompletedJob[]>({
    queryKey: ["customer-jobs-inv", customerId],
    queryFn: async () => {
      const res = await fetch(`/api/jobs?customerId=${customerId}`);
      const jobs = await res.json();
      return jobs.filter((j: CompletedJob) => (j.status === "Completed" || j.status === "InProgress") && !j.invoice);
    },
    enabled: !!customerId,
  });

  useEffect(() => {
    if (!prefillCustomerId && !prefillJobId) setTimeout(() => searchRef.current?.focus(), 100);
  }, [prefillCustomerId, prefillJobId]);

  // Auto-create from prefilled job
  useEffect(() => {
    if (prefillJobId) {
      createFromJobMutation.mutate(prefillJobId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillJobId]);

  const selectCustomer = (c: CustomerResult) => {
    setCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerSearch("");
  };

  const createFromJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      onClose();
      toast.success(`Invoice ${invoice.invoiceNumber} created — ${formatCurrency(invoice.total)}`, {
        action: { label: "View", onClick: () => router.push(`/invoices/${invoice.id}`) },
      });
    },
    onError: () => toast.error("Failed to create invoice"),
  });

  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", amount: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const next = [...lineItems];
    next[index] = { ...next[index], [field]: value };
    setLineItems(next);
  };

  const subtotal = lineItems.reduce((sum, li) => sum + (li.amount || 0), 0);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-slate-200">
        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
          <FileText className="w-4 h-4 text-orange-600" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900">Quick Invoice</h2>
          <p className="text-xs text-slate-500">From a job or from scratch</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Customer Search */}
        {!customerId ? (
          <div className="relative">
            <Label className="text-sm font-medium">Customer *</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                ref={searchRef}
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Type name or phone..."
                className="pl-9"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {searchResults.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectCustomer(c)}
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-50 border-b border-slate-50 last:border-0"
                  >
                    <span className="font-medium text-sm">{c.name}</span>
                    {c.phone && <span className="text-xs text-slate-400 ml-2">{c.phone}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
            <span className="font-medium text-sm text-slate-900">{customerName}</span>
            <button onClick={() => { setCustomerId(""); setCustomerName(""); }} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* From Job */}
        {customerId && completedJobs.length > 0 && (
          <div>
            <Label className="text-xs text-slate-500 uppercase tracking-wider">From Completed Job</Label>
            <div className="space-y-2 mt-1.5">
              {completedJobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => createFromJobMutation.mutate(job.id)}
                  disabled={createFromJobMutation.isPending}
                  className="w-full text-left flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-all"
                >
                  <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900">
                      {job.services.map((s) => s.serviceItem?.name || s.customName || "Custom").join(", ")}
                    </div>
                    <div className="text-xs text-slate-400">
                      {job.completedAt ? formatDate(job.completedAt) : job.scheduledAt ? formatDate(job.scheduledAt) : ""}
                    </div>
                  </div>
                  <span className="text-sm font-bold text-emerald-600">{formatCurrency(job.total)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom line items */}
        {customerId && (
          <div>
            <Label className="text-xs text-slate-500 uppercase tracking-wider">
              {completedJobs.length > 0 ? "Or Create Custom" : "Line Items"}
            </Label>
            <div className="space-y-2 mt-1.5">
              {lineItems.map((li, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={li.description}
                    onChange={(e) => updateLineItem(i, "description", e.target.value)}
                    placeholder="Description"
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={li.amount || ""}
                    onChange={(e) => updateLineItem(i, "amount", parseFloat(e.target.value) || 0)}
                    placeholder="$0"
                    className="w-24"
                    min={0}
                    step={0.01}
                  />
                  {lineItems.length > 1 && (
                    <button onClick={() => removeLineItem(i)} className="text-slate-300 hover:text-red-500 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addLineItem} className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                <Plus className="w-3 h-3" /> Add Line Item
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer — only for custom invoices */}
      {customerId && subtotal > 0 && (
        <div className="border-t border-slate-200 p-4 space-y-3">
          <div className="flex justify-between font-bold text-slate-900 text-base">
            <span>Total</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <p className="text-xs text-slate-400 text-center">
            Custom invoices coming soon — use &quot;From Job&quot; above
          </p>
        </div>
      )}
    </div>
  );
}
