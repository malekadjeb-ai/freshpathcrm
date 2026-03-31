"use client";

import { Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { SelectedService } from "./service-selector";

interface AppliedPromo {
  promoCodeId: string;
  code: string;
  discountType: string;
  discountValue: number;
  discount: number;
}

export function PricingSummary({
  selectedServices,
  subtotal,
  discount,
  setDiscount,
  discountType,
  setDiscountType,
  discountAmount,
  total,
  promoInput,
  setPromoInput,
  promoError,
  appliedPromo,
  promoDiscount,
  onApplyPromo,
  onRemovePromo,
  canSubmit,
  isPending,
  onSubmit,
  selectedCustomerId,
  submitLabel = "Create Job",
  pendingLabel = "Creating...",
  showPromo = true,
}: {
  selectedServices: SelectedService[];
  subtotal: number;
  discount: number;
  setDiscount: (v: number) => void;
  discountType: "dollar" | "percent";
  setDiscountType: (v: "dollar" | "percent") => void;
  discountAmount: number;
  total: number;
  promoInput?: string;
  setPromoInput?: (v: string) => void;
  promoError?: string;
  appliedPromo?: AppliedPromo | null;
  promoDiscount?: number;
  onApplyPromo?: () => void;
  onRemovePromo?: () => void;
  canSubmit: boolean;
  isPending: boolean;
  onSubmit: () => void;
  selectedCustomerId?: string;
  submitLabel?: string;
  pendingLabel?: string;
  showPromo?: boolean;
}) {
  return (
    <Card className="sticky top-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Pricing Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {selectedServices.map((s) => (
            <div key={s.serviceItemId} className="flex justify-between text-sm">
              <span className="text-slate-600">{s.name}</span>
              <span className="font-medium">{formatCurrency(s.price)}</span>
            </div>
          ))}
          {selectedServices.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-2">No services selected</p>
          )}
        </div>

        {selectedServices.length > 0 && (
          <>
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
                  placeholder="Discount"
                  value={discount || ""}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                />
                <Select value={discountType} onValueChange={(v) => setDiscountType(v as "dollar" | "percent")}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dollar">$</SelectItem>
                    <SelectItem value="percent">%</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-red-500">
                  <span>Discount</span>
                  <span>- {formatCurrency(discountAmount)}</span>
                </div>
              )}

              {showPromo && (
                <div className="border-t border-slate-100 pt-3">
                  {appliedPromo ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-sm font-medium text-emerald-700">{appliedPromo.code}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-red-500">
                          - {formatCurrency(promoDiscount ?? 0)}
                        </span>
                        <button onClick={onRemovePromo} className="text-slate-400 hover:text-red-500">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Promo code"
                          value={promoInput ?? ""}
                          onChange={(e) => setPromoInput?.(e.target.value.toUpperCase())}
                          className="flex-1 text-sm uppercase font-mono"
                          onKeyDown={(e) => e.key === "Enter" && onApplyPromo?.()}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onApplyPromo}
                          disabled={!(promoInput ?? "").trim()}
                          className="shrink-0"
                        >
                          Apply
                        </Button>
                      </div>
                      {promoError && <p className="text-xs text-red-500 mt-1">{promoError}</p>}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between font-bold text-lg border-t border-slate-100 pt-2">
                <span>Total</span>
                <span className="text-emerald-600">{formatCurrency(total)}</span>
              </div>
            </div>
          </>
        )}

        <Button
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
          disabled={!canSubmit || isPending}
          onClick={onSubmit}
        >
          {isPending ? pendingLabel : submitLabel}
        </Button>
        {selectedCustomerId !== undefined && !selectedCustomerId && (
          <p className="text-xs text-slate-400 text-center">Select a customer to continue</p>
        )}
        {selectedCustomerId && selectedServices.length === 0 && (
          <p className="text-xs text-slate-400 text-center">Select at least one service</p>
        )}
      </CardContent>
    </Card>
  );
}
