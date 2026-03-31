"use client";

import { Trash2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  vendor: string | null;
  isRecurring: boolean;
  jobId: string | null;
  job: { id: string; status: string; customer: { name: string } } | null;
  createdAt: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  Supplies: "bg-blue-100 text-blue-700",
  Fuel: "bg-amber-100 text-amber-700",
  Equipment: "bg-purple-100 text-purple-700",
  Insurance: "bg-teal-100 text-teal-700",
  Marketing: "bg-pink-100 text-pink-700",
  Software: "bg-indigo-100 text-indigo-700",
  Vehicle: "bg-orange-100 text-orange-700",
  Other: "bg-slate-100 text-slate-700",
};

interface ExpenseListProps {
  expenses: Expense[];
  isLoading: boolean;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

export function ExpenseList({ expenses, isLoading, onEdit, onDelete }: ExpenseListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <EmptyState
        icon="receipt"
        title="No expenses yet"
        description="Start tracking your business expenses to understand your costs."
      />
    );
  }

  return (
    <div className="space-y-2">
      {expenses.map((expense) => (
        <div
          key={expense.id}
          className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-slate-900">{expense.description}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                  {expense.vendor && <span>{expense.vendor}</span>}
                  <span>{new Date(expense.date).toLocaleDateString()}</span>
                  {expense.job && (
                    <span>Job: {expense.job.customer.name}</span>
                  )}
                  {expense.isRecurring && (
                    <Badge variant="outline" className="text-xs border-slate-200 text-slate-500">
                      Recurring
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={cn("text-xs", CATEGORY_COLORS[expense.category])}>
                  {expense.category}
                </Badge>
                <span className="text-sm font-semibold text-slate-900">
                  ${expense.amount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onEdit(expense)}
              className="text-slate-600 hover:text-slate-300 transition-colors p-1"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(expense.id)}
              className="text-slate-600 hover:text-red-400 transition-colors p-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
