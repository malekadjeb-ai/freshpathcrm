"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface LineItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  quantity: number;
  service: { name: string; category: string } | null;
}

export function EstimateLineItems({
  lineItems,
  subtotal,
  taxRate,
  discount,
  total,
}: {
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;
  discount: number;
  total: number;
}) {
  const taxAmount = subtotal * (taxRate / 100);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Line Items</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left pb-2 font-medium text-slate-500">Item</th>
              <th className="text-center pb-2 font-medium text-slate-500">Qty</th>
              <th className="text-right pb-2 font-medium text-slate-500">Price</th>
              <th className="text-right pb-2 font-medium text-slate-500">Total</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item) => (
              <tr key={item.id} className="border-b border-slate-50">
                <td className="py-3">
                  <span className="font-medium text-slate-900">{item.name}</span>
                  {item.description && (
                    <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                  )}
                </td>
                <td className="py-3 text-center">{item.quantity}</td>
                <td className="py-3 text-right">{formatCurrency(item.price)}</td>
                <td className="py-3 text-right font-medium">{formatCurrency(item.price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mt-4">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {taxRate > 0 && (
              <div className="flex justify-between text-sm text-slate-500">
                <span>Tax ({taxRate}%)</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-sm text-red-500">
                <span>Discount</span>
                <span>- {formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-xl border-t border-slate-200 pt-2">
              <span>Total</span>
              <span className="text-emerald-600">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
