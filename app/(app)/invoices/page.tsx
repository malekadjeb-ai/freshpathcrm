"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, FileText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  formatCurrency, formatDate, INVOICE_STATUS_COLORS, type InvoiceStatus, fetchJson,
} from "@/lib/utils";
import { ExportButton } from "@/components/shared/export-button";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  subtotal: number;
  total: number;
  dueDate: string | null;
  createdAt: string;
  job: {
    scheduledAt: string | null;
    customer: { id: string; name: string };
    vehicle: { make: string; model: string; year: number } | null;
  };
  payments: { amount: number }[];
}

export default function InvoicesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const perPage = 20;

  const { data: invoices = [], isLoading, isError, refetch } = useQuery<Invoice[]>({
    queryKey: ["invoices", statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      return fetchJson(`/api/invoices?${params}`);
    },
  });

  const filteredInvoices = invoices.filter((inv) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.job.customer.name.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredInvoices.length / perPage);
  const paginatedInvoices = filteredInvoices.slice((page - 1) * perPage, page * perPage);

  const overdueCount = invoices.filter((i) => i.status === "Overdue").length;
  const totalOutstanding = invoices
    .filter((i) => ["Sent", "Overdue"].includes(i.status))
    .reduce((sum, i) => sum + i.total, 0);

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-500 text-sm mt-0.5">{filteredInvoices.length} total invoices</p>
        </div>
        <ExportButton type="invoices" />
        {overdueCount > 0 && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
            <AlertTriangle className="w-4 h-4" />
            {overdueCount} overdue · {formatCurrency(totalOutstanding)} outstanding
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9 w-56"
            placeholder="Search invoice #, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Sent">Sent</SelectItem>
            <SelectItem value="Paid">Paid</SelectItem>
            <SelectItem value="Overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isError ? <ErrorState message="Failed to load invoices." onRetry={refetch} /> : <>

      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-lg animate-pulse" />
          ))
        ) : paginatedInvoices.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No invoices found"
            description="Invoices are created from completed jobs."
          />
        ) : (
          paginatedInvoices.map((inv) => (
            <div
              key={inv.id}
              className={`bg-white border border-slate-200 rounded-lg p-4 cursor-pointer hover:border-slate-300 transition-colors ${
                inv.status === "Overdue" ? "border-red-200 bg-red-50/30" : ""
              }`}
              onClick={() => router.push(`/invoices/${inv.id}`)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-medium text-slate-900 text-sm">{inv.invoiceNumber}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    INVOICE_STATUS_COLORS[inv.status as InvoiceStatus] ?? "bg-slate-100 text-slate-600"
                  }`}
                >
                  {inv.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700 font-medium">{inv.job.customer.name}</span>
                <span className="text-sm font-semibold text-slate-900">{formatCurrency(inv.total)}</span>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                {inv.job.scheduledAt && <span>Job: {formatDate(inv.job.scheduledAt)}</span>}
                {inv.dueDate && <span>Due: {formatDate(inv.dueDate)}</span>}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 font-medium text-slate-600">Invoice #</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Customer</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Job Date</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Due Date</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Amount</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              : paginatedInvoices.length === 0
              ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={FileText}
                      title="No invoices found"
                      description="Invoices are created from completed jobs."
                    />
                  </td>
                </tr>
              )
              : paginatedInvoices.map((inv) => (
                <tr
                  key={inv.id}
                  className={`border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors ${
                    inv.status === "Overdue" ? "bg-red-50/30" : ""
                  }`}
                  onClick={() => router.push(`/invoices/${inv.id}`)}
                >
                  <td className="px-4 py-3">
                    <span className="font-mono font-medium text-slate-900">{inv.invoiceNumber}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/customers/${inv.job.customer.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:text-emerald-600 transition-colors font-medium"
                    >
                      {inv.job.customer.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {inv.job.scheduledAt ? formatDate(inv.job.scheduledAt) : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {inv.dueDate ? formatDate(inv.dueDate) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        INVOICE_STATUS_COLORS[inv.status as InvoiceStatus] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {formatCurrency(inv.total)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/invoices/${inv.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-emerald-600 hover:text-emerald-700 text-xs font-medium"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      </>}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
