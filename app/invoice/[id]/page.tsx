"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, XCircle, Loader2, CreditCard, FileText } from "lucide-react";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface PublicInvoice {
  invoiceNumber: string;
  status: string;
  total: number;
  subtotal: number;
  tax: number;
  discount: number;
  paid: number;
  remaining: number;
  dueDate: string | null;
  createdAt: string;
  notes: string | null;
  customer: { name: string; email: string | null; phone: string | null; address: string | null; city: string | null };
  vehicle: { year: number | null; make: string | null; model: string | null; color: string | null } | null;
  services: { name: string; quantity: number; price: number; total: number }[];
  payments: { amount: number; method: string; createdAt: string }[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  Draft: { label: "Draft", color: "text-slate-600", bg: "bg-slate-100" },
  Sent: { label: "Sent", color: "text-blue-600", bg: "bg-blue-50" },
  Viewed: { label: "Viewed", color: "text-cyan-600", bg: "bg-cyan-50" },
  Partial: { label: "Partially Paid", color: "text-amber-600", bg: "bg-amber-50" },
  Paid: { label: "Paid", color: "text-emerald-600", bg: "bg-emerald-50" },
  Overdue: { label: "Overdue", color: "text-red-600", bg: "bg-red-50" },
  Void: { label: "Voided", color: "text-slate-400", bg: "bg-slate-50" },
};

export default function PublicInvoicePage() {
  const params = useParams();
  const id = params.id as string;

  const { data: invoice, isLoading, error } = useQuery<PublicInvoice>({
    queryKey: ["public-invoice", id],
    queryFn: () => fetch(`/api/invoices/${id}/public`).then((r) => {
      if (!r.ok) throw new Error("Not found");
      return r.json();
    }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h1 className="text-xl font-semibold text-slate-700">Invoice Not Found</h1>
          <p className="text-sm text-slate-400 mt-1">This invoice may have been removed.</p>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.Draft;
  const isPaid = invoice.status === "Paid" || invoice.remaining <= 0;
  const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date() && !isPaid;
  const vehicleStr = invoice.vehicle
    ? [invoice.vehicle.year, invoice.vehicle.make, invoice.vehicle.model].filter(Boolean).join(" ")
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Fresh Path</h1>
              <p className="text-sm text-slate-500">Premium Mobile Detailing</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="font-semibold text-slate-700">{invoice.invoiceNumber}</span>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusInfo.bg} ${statusInfo.color}`}>
                {isOverdue ? "Overdue" : statusInfo.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6 space-y-6">
        {/* Paid banner */}
        {isPaid && (
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-5 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-emerald-800">Paid in Full</h3>
            <p className="text-sm text-emerald-600 mt-1">Thank you for your payment!</p>
          </div>
        )}

        {/* Overdue banner */}
        {isOverdue && !isPaid && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5 text-center">
            <Clock className="w-10 h-10 text-red-400 mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-red-800">Payment Overdue</h3>
            <p className="text-sm text-red-600 mt-1">
              This invoice was due {formatDate(invoice.dueDate!)}. Please pay as soon as possible.
            </p>
          </div>
        )}

        {/* Invoice details card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Bill To / Info */}
          <div className="p-5 border-b border-slate-100 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase mb-1">Bill To</p>
              <p className="font-semibold text-slate-900">{invoice.customer.name}</p>
              {invoice.customer.address && (
                <p className="text-sm text-slate-500">{invoice.customer.address}, {invoice.customer.city}</p>
              )}
              {invoice.customer.phone && <p className="text-sm text-slate-500">{invoice.customer.phone}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-slate-400 uppercase mb-1">Invoice Date</p>
              <p className="text-sm text-slate-700">{formatDate(invoice.createdAt)}</p>
              {invoice.dueDate && (
                <>
                  <p className="text-xs font-medium text-slate-400 uppercase mt-2 mb-1">Due Date</p>
                  <p className={`text-sm ${isOverdue ? "text-red-600 font-semibold" : "text-slate-700"}`}>
                    {formatDate(invoice.dueDate)}
                  </p>
                </>
              )}
              {vehicleStr && (
                <>
                  <p className="text-xs font-medium text-slate-400 uppercase mt-2 mb-1">Vehicle</p>
                  <p className="text-sm text-slate-700">{vehicleStr}</p>
                </>
              )}
            </div>
          </div>

          {/* Line items */}
          <div className="p-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-medium text-slate-400 uppercase border-b border-slate-100">
                  <th className="text-left pb-2">Service</th>
                  <th className="text-center pb-2">Qty</th>
                  <th className="text-right pb-2">Price</th>
                  <th className="text-right pb-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.services.map((s, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="py-2.5 font-medium text-slate-700">{s.name}</td>
                    <td className="py-2.5 text-center text-slate-500">{s.quantity}</td>
                    <td className="py-2.5 text-right text-slate-500">{formatCurrency(s.price)}</td>
                    <td className="py-2.5 text-right font-medium text-slate-700">{formatCurrency(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="p-5 bg-slate-50 border-t border-slate-100 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="text-slate-700">{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-emerald-600">Discount</span>
                <span className="text-emerald-600">-{formatCurrency(invoice.discount)}</span>
              </div>
            )}
            {invoice.tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Tax</span>
                <span className="text-slate-700">{formatCurrency(invoice.tax)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold pt-2 border-t border-slate-200">
              <span className="text-slate-900">Total</span>
              <span className="text-slate-900">{formatCurrency(invoice.total)}</span>
            </div>
            {invoice.paid > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-600">Paid</span>
                  <span className="text-emerald-600">-{formatCurrency(invoice.paid)}</span>
                </div>
                <div className="flex justify-between text-base font-bold">
                  <span className="text-slate-900">Balance Due</span>
                  <span className={invoice.remaining > 0 ? "text-red-600" : "text-emerald-600"}>
                    {formatCurrency(Math.max(0, invoice.remaining))}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Payment history */}
        {invoice.payments.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Payment History</h3>
            <div className="space-y-2">
              {invoice.payments.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-slate-600">{formatDate(p.createdAt)}</span>
                    <span className="text-xs text-slate-400 capitalize">{p.method}</span>
                  </div>
                  <span className="font-medium text-emerald-600">{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">Notes</h3>
            <p className="text-sm text-slate-500 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {/* Pay button */}
        {!isPaid && invoice.remaining > 0 && (
          <a
            href={`/pay/${id}`}
            className="block w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white text-center font-semibold rounded-xl shadow-lg shadow-blue-200 transition-all"
          >
            <CreditCard className="w-5 h-5 inline mr-2 -mt-0.5" />
            Pay {formatCurrency(invoice.remaining)} Now
          </a>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 pb-8">
          <p>Questions about this invoice? Call or text us anytime.</p>
          <p className="mt-1">Fresh Path Mobile Detailing — Houston, TX</p>
        </div>
      </div>
    </div>
  );
}
