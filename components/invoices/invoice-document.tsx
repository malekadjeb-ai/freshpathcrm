import { formatCurrency, formatDate } from "@/lib/utils";
import type { InvoiceDetail, BusinessSettings } from "./invoice-types";

interface InvoiceDocumentProps {
  invoice: InvoiceDetail;
  bizSettings: BusinessSettings | null;
  totalPaid: number;
  remaining: number;
}

export function InvoiceDocument({ invoice, bizSettings, totalPaid, remaining }: InvoiceDocumentProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden print:border-0 print:shadow-none" id="invoice-print">
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

        <div className="mt-8 bg-slate-50 rounded-lg p-4 text-sm text-slate-600">
          <p className="font-medium mb-1">Payment Accepted Via:</p>
          <p>Zelle · Venmo · Cash · Check · Card</p>
          <p className="mt-2 text-slate-400">{bizSettings?.invoiceFooter ?? "Thank you for choosing Fresh Path Mobile Detailing!"}</p>
        </div>
      </div>
    </div>
  );
}
