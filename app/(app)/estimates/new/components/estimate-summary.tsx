"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface LineItem {
  key: string;
  serviceId: string | null;
  name: string;
  description: string;
  price: number;
  quantity: number;
}

interface EstimateSummaryProps {
  lineItems: LineItem[];
  subtotal: number;
  total: number;
  discount: number;
  setDiscount: (v: number) => void;
  canSubmit: boolean;
  isPending: boolean;
  onSubmit: () => void;
}

export function EstimateSummary({
  lineItems,
  subtotal,
  total,
  discount,
  setDiscount,
  canSubmit,
  isPending,
  onSubmit,
}: EstimateSummaryProps) {
  return (
    <Card className="sticky top-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Estimate Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {lineItems.map((li) => (
            <div key={li.key} className="flex justify-between text-sm">
              <span className="text-slate-600">
                {li.name || "Unnamed"}{" "}
                {li.quantity > 1 && `x${li.quantity}`}
              </span>
              <span className="font-medium">
                {formatCurrency(li.price * li.quantity)}
              </span>
            </div>
          ))}
          {lineItems.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-2">
              No items added
            </p>
          )}
        </div>

        {lineItems.length > 0 && (
          <div className="border-t border-slate-100 pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>

            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                className="flex-1 text-sm"
                placeholder="Discount ($)"
                value={discount || ""}
                onChange={(e) =>
                  setDiscount(parseFloat(e.target.value) || 0)
                }
              />
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-sm text-red-500">
                <span>Discount</span>
                <span>- {formatCurrency(discount)}</span>
              </div>
            )}

            <div className="flex justify-between font-bold text-lg border-t border-slate-100 pt-2">
              <span>Total</span>
              <span className="text-emerald-600">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        )}

        <Button
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
          disabled={!canSubmit || isPending}
          onClick={onSubmit}
        >
          {isPending ? "Creating..." : "Create Estimate"}
        </Button>
      </CardContent>
    </Card>
  );
}
