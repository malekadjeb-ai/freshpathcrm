"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Search,
  DollarSign,
  TrendingUp,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorState } from "@/components/error-state";
import { fetchJson } from "@/lib/utils";
import { ExpenseFormDialog } from "./components/expense-form-dialog";
import { ExpenseList } from "./components/expense-list";

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

const CATEGORIES = [
  "Supplies", "Fuel", "Equipment", "Insurance",
  "Marketing", "Software", "Vehicle", "Other",
];

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [form, setForm] = useState({
    category: "Supplies",
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    vendor: "",
    isRecurring: false,
    jobId: "",
  });

  const { data: expenses = [], isLoading, isError, refetch } = useQuery<Expense[]>({
    queryKey: ["expenses", filterCategory, dateFrom, dateTo],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filterCategory) params.set("category", filterCategory);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      return fetchJson(`/api/expenses?${params}`);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense added");
      closeDialog();
    },
    onError: () => toast.error("Failed to add expense"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/expenses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense updated");
      closeDialog();
    },
    onError: () => toast.error("Failed to update expense"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense deleted");
    },
    onError: () => toast.error("Failed to delete expense"),
  });

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setForm({
      category: "Supplies", description: "", amount: "",
      date: new Date().toISOString().split("T")[0], vendor: "",
      isRecurring: false, jobId: "",
    });
  }

  function openEdit(expense: Expense) {
    setEditingId(expense.id);
    setForm({
      category: expense.category,
      description: expense.description,
      amount: String(expense.amount),
      date: new Date(expense.date).toISOString().split("T")[0],
      vendor: expense.vendor || "",
      isRecurring: expense.isRecurring,
      jobId: expense.jobId || "",
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      category: form.category,
      description: form.description,
      amount: parseFloat(form.amount),
      date: form.date,
      vendor: form.vendor || null,
      isRecurring: form.isRecurring,
      jobId: form.jobId || null,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const filteredExpenses = expenses.filter(
    (e) =>
      !search ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.vendor?.toLowerCase().includes(search.toLowerCase()) ||
      e.job?.customer.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const categoryTotals = filteredExpenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 md:pb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Expenses</h1>
          <p className="text-slate-400 text-sm mt-1">
            {filteredExpenses.length} expenses &middot; ${totalAmount.toFixed(2)} total
          </p>
        </div>
        <Button
          onClick={() => { closeDialog(); setDialogOpen(true); }}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Expense
        </Button>
      </div>

      {isError && <ErrorState message="Failed to load expenses." onRetry={refetch} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Total Expenses" value={`$${totalAmount.toFixed(2)}`} icon={<DollarSign className="w-4 h-4" />} />
        <SummaryCard
          label="This Month"
          value={`$${expenses
            .filter((e) => {
              const d = new Date(e.date);
              const now = new Date();
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            })
            .reduce((s, e) => s + e.amount, 0)
            .toFixed(2)}`}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <SummaryCard label="Categories" value={String(Object.keys(categoryTotals).length)} icon={<Filter className="w-4 h-4" />} />
        <SummaryCard
          label="Avg per Expense"
          value={`$${filteredExpenses.length > 0 ? (totalAmount / filteredExpenses.length).toFixed(2) : "0.00"}`}
          icon={<DollarSign className="w-4 h-4" />}
        />
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-slate-200"
          />
        </div>
        <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v ?? "")}>
          <SelectTrigger className="w-full md:w-40 bg-white border-slate-200">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full md:w-36 bg-white border-slate-200" placeholder="From" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full md:w-36 bg-white border-slate-200" placeholder="To" />
      </div>

      <ExpenseList
        expenses={filteredExpenses}
        isLoading={isLoading}
        onEdit={openEdit}
        onDelete={(id) => deleteMutation.mutate(id)}
      />

      <ExpenseFormDialog
        open={dialogOpen}
        onClose={closeDialog}
        editingId={editingId}
        form={form}
        setForm={setForm}
        onSubmit={handleSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3">
      <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
        {icon}
        {label}
      </div>
      <div className="text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}
