"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, CreditCard, Send, CheckCircle, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INVOICE_STATUS_COLORS, type InvoiceStatus } from "@/lib/utils";
import type { InvoiceDetail, BusinessSettings } from "./invoice-types";

interface InvoiceActionsBarProps {
  invoice: InvoiceDetail;
  bizSettings: BusinessSettings | null;
  remaining: number;
  onOpenPayment: () => void;
}

export function InvoiceActionsBar({ invoice, bizSettings, remaining, onOpenPayment }: InvoiceActionsBarProps) {
  const queryClient = useQueryClient();
  const [generatingLink, setGeneratingLink] = useState(false);

  const markSentMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Sent" }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", invoice.id] });
      toast.success("Invoice marked as sent");
    },
    onError: () => toast.error("Failed"),
  });

  const sendInvoiceMutation = useMutation({
    mutationFn: async (channel: "email" | "sms") => {
      const res = await fetch(`/api/invoices/${invoice.id}/send`, {
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
      queryClient.invalidateQueries({ queryKey: ["invoices", invoice.id] });
      toast.success(
        data.mode === "dev"
          ? "Invoice logged (dev mode — configure email/SMS in Settings to send for real)"
          : "Invoice sent to customer!"
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  async function handleDownloadPdf() {
    try {
      const [{ pdf }, { InvoicePDF: InvoicePDFComponent }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/invoice-pdf"),
      ]);
      const blob = await pdf(
        <InvoicePDFComponent invoice={invoice} settings={bizSettings} />
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
  }

  async function handlePaymentLink() {
    setGeneratingLink(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.url) {
        await navigator.clipboard.writeText(`${window.location.origin}/pay/${invoice.id}`);
        toast.success("Payment link copied to clipboard!");
      } else {
        toast.error(data.error || "Failed to generate link");
      }
    } catch {
      await navigator.clipboard.writeText(`${window.location.origin}/pay/${invoice.id}`);
      toast.success("Payment link copied!");
    }
    setGeneratingLink(false);
  }

  return (
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
              onClick={onOpenPayment}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
            <Button
              variant="outline"
              disabled={generatingLink}
              onClick={handlePaymentLink}
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
        <Button variant="outline" onClick={handleDownloadPdf}>
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
      </div>
    </div>
  );
}
