"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, ChevronRight, Download, CreditCard, Send, CheckCircle, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { paymentSchema, PaymentInput } from "@/lib/validations/invoice";
import { formatCurrency, formatDate, INVOICE_STATUS_COLORS, type InvoiceStatus, PAYMENT_METHODS, fetchJson } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import { format } from "date-fns";

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  status: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  dueDate: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  job: {
    id: string;
    scheduledAt: string | null;
    notes: string | null;
    customer: {
      id: string;
      name: string;
      phone: string | null;
      email: string | null;
      address: string | null;
      city: string | null;
      zip: string | null;
    };
    vehicle: { make: string; model: string; year: number; color: string | null } | null;
    services: { price: number; quantity: number; serviceItem: { name: string; category: string } | null; customName?: string | null }[];
  };
  payments: { id: string; amount: number; method: string; paymentDate: string; notes: string | null }[];
}

function PaymentDialog({ invoiceId, remaining, onClose }: { invoiceId: string; remaining: number; onClose: () => void }) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      invoiceId,
      amount: remaining,
      method: "Zelle",
      paymentDate: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: PaymentInput) => {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Payment recorded");
      onClose();
    },
    onError: () => toast.error("Failed to record payment"),
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Amount ($)</Label>
        <Input
          type="number"
          step="0.01"
          min="0.01"
          {...register("amount", { valueAsNumber: true })}
        />
        {errors.amount && <p className="text-red-500 text-xs">{errors.amount.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Payment Method</Label>
        <Select defaultValue="Zelle" onValueChange={(v) => setValue("method", v as PaymentInput["method"])}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_METHODS.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Payment Date</Label>
        <Input type="date" {...register("paymentDate")} />
      </div>
      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="bg-emerald-500 hover:bg-emerald-600 text-white flex-1"
        >
          {mutation.isPending ? "Recording..." : "Record Payment"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const queryClient = useQueryClient();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);

  const { data: invoice, isLoading, isError, refetch } = useQuery<InvoiceDetail>({
    queryKey: ["invoices", params.id],
    queryFn: () => fetchJson(`/api/invoices/${params.id}`),
  });

  const { data: bizSettings } = useQuery<{
    businessName: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    invoiceFooter: string;
  }>({
    queryKey: ["settings"],
    queryFn: () => fetchJson("/api/settings"),
  });

  const markSentMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/invoices/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Sent" }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", params.id] });
      toast.success("Invoice marked as sent");
    },
    onError: () => toast.error("Failed"),
  });

  const sendInvoiceMutation = useMutation({
    mutationFn: async (channel: "email" | "sms") => {
      const res = await fetch(`/api/invoices/${params.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error || "Failed to send");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invoices", params.id] });
      toast.success(
        data.mode === "dev"
          ? "Invoice logged (dev mode — configure email/SMS in Settings to send for real)"
          : "Invoice sent to customer!"
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 pb-24 md:pb-6">
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (isError || !invoice || "error" in (invoice as object)) {
    return <ErrorState message="Failed to load invoice." onRetry={refetch} />;
  }

  const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, invoice.total - totalPaid);
  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
        <Link href="/invoices" className="hover:text-slate-900 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Invoices
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900">{invoice.invoiceNumber}</span>
      </div>

      {/* Actions bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <span
            className={`text-sm px-3 py-1 rounded-full font-medium ${
              INVOICE_STATUS_COLORS[invoice.status as InvoiceStatus] ?? "bg-slate-100 text-slate-600"
            }`}
          >
            {invoice.status}
          </span>
          <span className="font-mono font-bold text-slate-900">{invoice.invoiceNumber}</span>
        </div>
        <div className="flex items-center gap-2">
          {(invoice.status === "Draft" || invoice.status === "Sent") && (
            <>
              {invoice.job.customer.email && (
                <Button
                  variant="outline"
                  onClick={() => sendInvoiceMutation.mutate("email")}
                  disabled={sendInvoiceMutation.isPending}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sendInvoiceMutation.isPending ? "Sending..." : "Send via Email"}
                </Button>
              )}
              {invoice.job.customer.phone && (
                <Button
                  variant="outline"
                  onClick={() => sendInvoiceMutation.mutate("sms")}
                  disabled={sendInvoiceMutation.isPending}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sendInvoiceMutation.isPending ? "Sending..." : "Send via SMS"}
                </Button>
              )}
              {invoice.status === "Draft" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markSentMutation.mutate()}
                  disabled={markSentMutation.isPending}
                  className="text-slate-500"
                >
                  Mark as Sent
                </Button>
              )}
            </>
          )}
          {invoice.status !== "Paid" && remaining > 0 && (
            <>
              <Button
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={() => setPaymentOpen(true)}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Record Payment
              </Button>
              <Button
                variant="outline"
                disabled={generatingLink}
                onClick={async () => {
                  setGeneratingLink(true);
                  try {
                    const res = await fetch(`/api/invoices/${params.id}/checkout`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({}),
                    });
                    const data = await res.json();
                    if (data.url) {
                      await navigator.clipboard.writeText(`${window.location.origin}/pay/${params.id}`);
                      toast.success("Payment link copied to clipboard!");
                    } else {
                      toast.error(data.error || "Failed to generate link");
                    }
                  } catch {
                    // Fallback: copy the public payment page URL
                    await navigator.clipboard.writeText(`${window.location.origin}/pay/${params.id}`);
                    toast.success("Payment link copied!");
                  }
                  setGeneratingLink(false);
                }}
              >
                <Link2 className="w-4 h-4 mr-2" />
                {generatingLink ? "Generating..." : "Payment Link"}
              </Button>
            </>
          )}
          {invoice.status === "Paid" && (
            <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              Paid in Full
            </span>
          )}
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const [{ pdf }, { InvoicePDF: InvoicePDFComponent }] = await Promise.all([
                  import("@react-pdf/renderer"),
                  import("@/components/invoice-pdf"),
                ]);
                const blob = await pdf(
                  <InvoicePDFComponent invoice={invoice} settings={bizSettings ?? null} />
                ).toBlob();
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `${invoice.invoiceNumber}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                toast.success("Invoice PDF downloaded");
              } catch {
                toast.error("Failed to generate PDF");
              }
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Invoice */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden print:border-0 print:shadow-none" id="invoice-print">
        {/* Invoice header */}
        <div className="bg-slate-950 px-8 py-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <span className="font-bold">FP</span>
                </div>
                <div>
                  <div className="font-bold text-lg">{bizSettings?.businessName ?? "Fresh Path Mobile Detailing"}</div>
                  <div className="text-slate-400 text-sm">
                    {bizSettings ? [bizSettings.city, bizSettings.state].filter(Boolean).join(", ") : "Richmond · Katy · Sugar Land, TX"}
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-emerald-400">{invoice.invoiceNumber}</div>
              <div className="text-slate-400 text-sm mt-1">
                Issued: {formatDate(invoice.createdAt)}
              </div>
              {invoice.dueDate && (
                <div className="text-slate-400 text-sm">
                  Due: {formatDate(invoice.dueDate)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bill to + details */}
        <div className="px-8 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Bill To</p>
              <p className="font-semibold text-slate-900 text-lg">{invoice.job.customer.name}</p>
              {invoice.job.customer.phone && (
                <p className="text-slate-500 text-sm">{invoice.job.customer.phone}</p>
              )}
              {invoice.job.customer.email && (
                <p className="text-slate-500 text-sm">{invoice.job.customer.email}</p>
              )}
              {invoice.job.customer.address && (
                <p className="text-slate-500 text-sm">
                  {invoice.job.customer.address}, {invoice.job.customer.city} {invoice.job.customer.zip}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Vehicle</p>
              {invoice.job.vehicle ? (
                <p className="font-medium text-slate-900">
                  {invoice.job.vehicle.year} {invoice.job.vehicle.make} {invoice.job.vehicle.model}
                  {invoice.job.vehicle.color ? ` — ${invoice.job.vehicle.color}` : ""}
                </p>
              ) : (
                <p className="text-slate-400">—</p>
              )}
              {invoice.job.scheduledAt && (
                <p className="text-slate-500 text-sm mt-1">
                  Service Date: {formatDate(invoice.job.scheduledAt)}
                </p>
              )}
            </div>
          </div>

          {/* Line items */}
          <table className="w-full mb-6">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide pb-2">Service</th>
                <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wide pb-2">Type</th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide pb-2">Price</th>
              </tr>
            </thead>
            <tbody>
              {invoice.job.services.map((s, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td className="py-3 text-sm text-slate-900 font-medium">{s.serviceItem?.name || s.customName || "Custom"}</td>
                  <td className="py-3 text-center">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {s.serviceItem?.category || "Custom"}
                    </span>
                  </td>
                  <td className="py-3 text-right text-sm font-medium">{formatCurrency(s.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Subtotal</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-sm text-red-500">
                  <span>Discount</span>
                  <span>- {formatCurrency(invoice.discount)}</span>
                </div>
              )}
              {invoice.tax > 0 && (
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Tax</span>
                  <span>{formatCurrency(invoice.tax)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xl border-t border-slate-200 pt-2">
                <span>Total</span>
                <span className="text-emerald-600">{formatCurrency(invoice.total)}</span>
              </div>
              {totalPaid > 0 && totalPaid < invoice.total && (
                <>
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Paid</span>
                    <span>- {formatCurrency(totalPaid)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-red-600">
                    <span>Remaining</span>
                    <span>{formatCurrency(remaining)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Payment instructions */}
          <div className="mt-8 bg-slate-50 rounded-lg p-4 text-sm text-slate-600">
            <p className="font-medium mb-1">Payment Accepted Via:</p>
            <p>Zelle · Venmo · Cash · Check · Card</p>
            <p className="mt-2 text-slate-400">{bizSettings?.invoiceFooter ?? "Thank you for choosing Fresh Path Mobile Detailing!"}</p>
          </div>
        </div>
      </div>

      {/* Payment history */}
      {invoice.payments.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invoice.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3">
                  <div>
                    <span className="font-medium text-sm text-slate-900">{p.method}</span>
                    <span className="text-xs text-slate-400 ml-2">{formatDate(p.paymentDate)}</span>
                  </div>
                  <span className="font-semibold text-emerald-600">{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <PaymentDialog
            invoiceId={params.id}
            remaining={remaining}
            onClose={() => setPaymentOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
