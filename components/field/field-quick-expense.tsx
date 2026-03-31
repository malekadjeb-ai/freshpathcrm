"use client";

import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FieldQuickExpenseProps {
  show: boolean;
  onClose: () => void;
  expenseDesc: string;
  onDescChange: (value: string) => void;
  expenseAmount: string;
  onAmountChange: (value: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}

export function FieldQuickExpense({
  show,
  onClose,
  expenseDesc,
  onDescChange,
  expenseAmount,
  onAmountChange,
  onSubmit,
  isPending,
}: FieldQuickExpenseProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose}>
      <div
        className="absolute bottom-24 right-4 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-semibold text-sm text-slate-900 mb-3">Quick Add Expense</h3>
        <div className="space-y-2">
          <Input
            placeholder="Description"
            value={expenseDesc}
            onChange={(e) => onDescChange(e.target.value)}
          />
          <Input
            type="number"
            placeholder="Amount"
            value={expenseAmount}
            onChange={(e) => onAmountChange(e.target.value)}
          />
          <Button
            className="w-full bg-emerald-500 hover:bg-emerald-600"
            disabled={!expenseDesc || !expenseAmount || isPending}
            onClick={onSubmit}
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
            Add Expense
          </Button>
        </div>
      </div>
    </div>
  );
}
