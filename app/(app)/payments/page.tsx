"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { DollarSign, AlertCircle, TrendingUp, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency, formatDate, fetchJson } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";
import { useState } from "react";

interface PaymentRow {
  id: string;
  amount: number;
  method: string;
  notes: string | null;
  createdAt: string;
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  customerId: string | null;
  status: string;
}

interface PaymentSummary {
  receivedThisMonth: number;
  outstandingBalance: number;
  outstandingCount: number;
  overdueAmount: number;
  overdueCount: number;
}

interface PaymentsData {
  payments: PaymentRow[];
  summary: PaymentSummary;
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  zelle: "Zelle",
  venmo: "Venmo",
  check: "Check",
  stripe: "Stripe",
  other: "Other",
};

export default function PaymentsPage() {
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const { data, isLoading, isError, refetch } = useQuery<PaymentsData>({
    queryKey: ["payments-summary", from, to],
    queryFn: () => fetchJson(`/api/payments/summary?${params}`),
  });

  const payments = (data?.payments || []).filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.customerName.toLowerCase().includes(q) ||
      p.invoiceNumber.toLowerCase().includes(q) ||
      p.method.toLowerCase().includes(q)
    );
  });

  const summary = data?.summary;

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
        <p className="text-sm text-slate-500 mt-1">Track all incoming payments and outstanding balances</p>
      </div>

      {isError && <ErrorState message="Failed to load payments." onRetry={refetch} />}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Received This Month</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {isLoading ? "..." : formatCurrency(summary?.receivedThisMonth || 0)}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-500">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Outstanding Balance</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {isLoading ? "..." : formatCurrency(summary?.outstandingBalance || 0)}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{summary?.outstandingCount || 0} invoices</p>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-500">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Overdue Amount</p>
                <p className={cn("text-2xl font-bold mt-1", (summary?.overdueAmount || 0) > 0 ? "text-red-600" : "text-slate-900")}>
                  {isLoading ? "..." : formatCurrency(summary?.overdueAmount || 0)}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{summary?.overdueCount || 0} invoices</p>
              </div>
              <div className={cn("p-2.5 rounded-lg", (summary?.overdueAmount || 0) > 0 ? "bg-red-500" : "bg-slate-400")}>
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <CardTitle className="text-base">Payment History</CardTitle>
            <div className="flex items-center gap-2 flex-1">
              <Input
                placeholder="Search by customer, invoice #..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs text-sm"
              />
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-36 text-sm"
                placeholder="From"
              />
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-36 text-sm"
                placeholder="To"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No payments found"
              description="Payments will appear here once invoices are paid."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Customer</th>
                    <th className="pb-2 font-medium">Invoice</th>
                    <th className="pb-2 font-medium">Method</th>
                    <th className="pb-2 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="py-3 text-slate-600">{formatDate(p.createdAt)}</td>
                      <td className="py-3">
                        {p.customerId ? (
                          <Link href={`/customers/${p.customerId}`} className="text-slate-800 font-medium hover:text-emerald-600">
                            {p.customerName}
                          </Link>
                        ) : (
                          <span className="text-slate-800 font-medium">{p.customerName}</span>
                        )}
                      </td>
                      <td className="py-3">
                        <Link href={`/invoices/${p.invoiceId}`} className="text-emerald-600 hover:text-emerald-700 font-medium">
                          {p.invoiceNumber}
                        </Link>
                      </td>
                      <td className="py-3">
                        <Badge variant="outline" className="text-xs">
                          {METHOD_LABELS[p.method] || p.method}
                        </Badge>
                      </td>
                      <td className="py-3 text-right font-semibold text-emerald-600">
                        {formatCurrency(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
