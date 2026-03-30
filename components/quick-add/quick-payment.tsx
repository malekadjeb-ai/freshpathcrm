"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DollarSign, Banknote, Smartphone, CreditCard, Building2, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";

const METHODS = [
  { value: "Cash", label: "Cash", icon: Banknote },
  { value: "Venmo", label: "Venmo", icon: Smartphone },
  { value: "Zelle", label: "Zelle", icon: Smartphone },
  { value: "Card", label: "Card", icon: CreditCard },
  { value: "Check", label: "Check", icon: Building2 },
  { value: "Other", label: "Other", icon: FileQuestion },
] as const;

interface QuickPaymentProps {
  invoiceId: string;
  invoiceNumber: string;
  invoiceTotal: number;
  amountDue: number;
  customerName: string;
  onClose: () => void;
}

export function QuickPayment({
  invoiceId,
  invoiceNumber,
  invoiceTotal,
  amountDue,
  customerName,
  onClose,
}: QuickPaymentProps) {
  const queryClient = useQueryClient();
  const amountRef = useRef<HTMLInputElement>(null);

  const [amount, setAmount] = useState(amountDue);
  const [method, setMethod] = useState<string>("Cash");
  const [tip, setTip] = useState(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setTimeout(() => amountRef.current?.select(), 100);
  }, []);

  const isPartial = amount < amountDue && amount > 0;

  const paymentMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          amount: amount + tip,
          method,
          paymentDate: new Date().toISOString(),
          notes: notes || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      onClose();

      const totalPaid = amount + tip;
      let msg = `Payment recorded — ${formatCurrency(totalPaid)} via ${method}`;
      if (tip > 0) msg += ` (includes ${formatCurrency(tip)} tip)`;
      if (isPartial) msg += ` — ${formatCurrency(amountDue - amount)} remaining`;

      toast.success(msg);
    },
    onError: () => toast.error("Failed to record payment"),
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-slate-200">
        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
          <DollarSign className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900">Record Payment</h2>
          <p className="text-xs text-slate-500">{invoiceNumber} — {customerName}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Invoice summary */}
        <div className="bg-slate-50 rounded-lg p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Invoice total</span>
            <span className="font-medium">{formatCurrency(invoiceTotal)}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-slate-500">Amount due</span>
            <span className="font-bold text-slate-900">{formatCurrency(amountDue)}</span>
          </div>
        </div>

        {/* Amount */}
        <div>
          <Label className="text-sm font-medium">Amount</Label>
          <Input
            ref={amountRef}
            type="number"
            value={amount || ""}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            className="mt-1 text-lg font-bold"
            min={0}
            step={0.01}
          />
          {isPartial && (
            <p className="text-xs text-amber-600 mt-1">
              Partial payment — {formatCurrency(amountDue - amount)} will remain
            </p>
          )}
        </div>

        {/* Method — big tap targets */}
        <div>
          <Label className="text-sm font-medium">Method</Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {METHODS.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.value}
                  onClick={() => setMethod(m.value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all min-h-[60px] ${
                    method === m.value
                      ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tip */}
        <div>
          <Label className="text-sm font-medium">Tip (optional)</Label>
          <Input
            type="number"
            value={tip || ""}
            onChange={(e) => setTip(parseFloat(e.target.value) || 0)}
            className="mt-1"
            min={0}
            step={0.01}
            placeholder="$0.00"
          />
        </div>

        {/* Notes */}
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
        />
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200">
        <Button
          onClick={() => paymentMutation.mutate()}
          disabled={amount <= 0 || paymentMutation.isPending}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base font-medium"
        >
          {paymentMutation.isPending
            ? "Recording..."
            : `Record ${formatCurrency(amount + tip)} via ${method}`
          }
        </Button>
      </div>
    </div>
  );
}
