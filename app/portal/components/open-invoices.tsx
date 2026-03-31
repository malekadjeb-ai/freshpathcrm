"use client";

import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PortalData } from "../hooks/use-portal";

interface OpenInvoicesProps {
  invoices: PortalData["invoices"];
}

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-700",
  Sent: "bg-blue-100 text-blue-700",
  Paid: "bg-emerald-100 text-emerald-700",
  Overdue: "bg-red-100 text-red-700",
};

export function OpenInvoices({ invoices }: OpenInvoicesProps) {
  return (
    <>
      <h2 className="text-base font-bold text-slate-900">My Invoices</h2>
      {invoices.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">No invoices yet.</div>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => {
            const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
            return (
              <div key={inv.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-slate-900">#{inv.invoiceNumber}</div>
                    {inv.dueDate && (
                      <div className="text-xs text-slate-500">Due {formatDate(inv.dueDate)}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900">{formatCurrency(inv.total)}</div>
                    {paid > 0 && paid < inv.total && (
                      <div className="text-xs text-emerald-600">Paid: {formatCurrency(paid)}</div>
                    )}
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium mt-1 ${STATUS_COLORS[inv.status] || "bg-slate-100 text-slate-600"}`}>
                      {inv.status}
                    </span>
                  </div>
                </div>
                {inv.status !== "Paid" && inv.paymentLink && (
                  <Button
                    className="w-full mt-3 bg-emerald-500 hover:bg-emerald-600"
                    size="sm"
                    onClick={() => window.open(inv.paymentLink!, "_blank")}
                  >
                    Pay Now
                  </Button>
                )}
                {inv.status !== "Paid" && !inv.paymentLink && (
                  <div className="mt-3 text-center text-xs text-slate-400 py-2 bg-slate-50 rounded-lg">
                    Online payments coming soon
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

interface UnpaidInvoicesSummaryProps {
  unpaidInvoices: PortalData["invoices"];
}

export function UnpaidInvoicesSummary({ unpaidInvoices }: UnpaidInvoicesSummaryProps) {
  if (unpaidInvoices.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl border border-amber-200 p-4">
      <h2 className="text-sm font-semibold text-amber-700 flex items-center gap-2 mb-3">
        <CreditCard className="w-4 h-4" />
        Outstanding Invoices
      </h2>
      <div className="space-y-2">
        {unpaidInvoices.map((inv) => (
          <div key={inv.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
            <div>
              <div className="text-sm font-medium text-slate-900">#{inv.invoiceNumber}</div>
              <div className="text-xs text-slate-500">{inv.status}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{formatCurrency(inv.total)}</span>
              {inv.paymentLink && (
                <Button size="sm" onClick={() => window.open(inv.paymentLink!, "_blank")}>
                  Pay Now
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
