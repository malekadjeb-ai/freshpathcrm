"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchJson } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import type { InvoiceDetail, BusinessSettings } from "@/components/invoices/invoice-types";
import { InvoiceActionsBar } from "@/components/invoices/invoice-actions-bar";
import { InvoiceDocument } from "@/components/invoices/invoice-document";
import { PaymentHistory } from "@/components/invoices/payment-history";
import { PaymentDialog } from "@/components/invoices/payment-dialog";

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const [paymentOpen, setPaymentOpen] = useState(false);

  const { data: invoice, isLoading, isError, refetch } = useQuery<InvoiceDetail>({
    queryKey: ["invoices", params.id],
    queryFn: () => fetchJson(`/api/invoices/${params.id}`),
  });

  const { data: bizSettings } = useQuery<BusinessSettings>({
    queryKey: ["settings"],
    queryFn: () => fetchJson("/api/settings"),
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
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
        <Link href="/invoices" className="hover:text-slate-900 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Invoices
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900">{invoice.invoiceNumber}</span>
      </div>

      <InvoiceActionsBar
        invoice={invoice}
        bizSettings={bizSettings ?? null}
        remaining={remaining}
        onOpenPayment={() => setPaymentOpen(true)}
      />

      <InvoiceDocument
        invoice={invoice}
        bizSettings={bizSettings ?? null}
        totalPaid={totalPaid}
        remaining={remaining}
      />

      <PaymentHistory payments={invoice.payments} />

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
