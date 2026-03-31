"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ClipboardList, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate, fetchJson } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";

const ESTIMATE_STATUS_COLORS: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-800",
  Sent: "bg-blue-100 text-blue-800",
  Approved: "bg-emerald-100 text-emerald-800",
  Declined: "bg-red-100 text-red-800",
  Expired: "bg-amber-100 text-amber-800",
  Converted: "bg-purple-100 text-purple-800",
};

interface EstimateListItem {
  id: string;
  estimateNumber: string;
  status: string;
  total: number;
  createdAt: string;
  validUntil: string | null;
  customer: { id: string; name: string };
  vehicle: { make: string; model: string; year: number } | null;
}

export default function EstimatesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const perPage = 20;

  const {
    data: estimates = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<EstimateListItem[]>({
    queryKey: ["estimates", statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      return fetchJson(`/api/estimates?${params}`);
    },
  });

  const filtered = estimates.filter((est) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      est.estimateNumber.toLowerCase().includes(q) ||
      est.customer.name.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Estimates</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {filtered.length} total estimates
          </p>
        </div>
        <Link href="/estimates/new">
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Estimate
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9 w-56"
            placeholder="Search estimate #, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v ?? "all")}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Sent">Sent</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Declined">Declined</SelectItem>
            <SelectItem value="Expired">Expired</SelectItem>
            <SelectItem value="Converted">Converted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <ErrorState message="Failed to load estimates." onRetry={refetch} />
      ) : (
        <>
        {/* Mobile Card Layout */}
        <div className="md:hidden space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-slate-100 rounded-lg animate-pulse" />
            ))
          ) : paginated.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No estimates found"
              description="Create your first estimate to start quoting customers."
            />
          ) : (
            paginated.map((est) => (
              <div
                key={est.id}
                className="bg-white border border-slate-200 rounded-lg p-4 cursor-pointer hover:border-slate-300 transition-colors"
                onClick={() => router.push(`/estimates/${est.id}`)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-medium text-slate-900 text-sm">{est.estimateNumber}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      ESTIMATE_STATUS_COLORS[est.status] ?? "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {est.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700 font-medium">{est.customer.name}</span>
                  <span className="text-sm font-semibold text-slate-900">{formatCurrency(est.total)}</span>
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                  {est.vehicle && <span>{est.vehicle.year} {est.vehicle.make} {est.vehicle.model}</span>}
                  <span>{formatDate(est.createdAt)}</span>
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
                <th className="text-left px-4 py-3 font-medium text-slate-600">
                  Estimate #
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">
                  Customer
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">
                  Vehicle
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">
                  Date
                </th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">
                  Total
                </th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">
                  Action
                </th>
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
                : paginated.length === 0
                ? (
                    <tr>
                      <td colSpan={7}>
                        <EmptyState
                          icon={ClipboardList}
                          title="No estimates found"
                          description="Create your first estimate to get started."
                        />
                      </td>
                    </tr>
                  )
                : paginated.map((est) => (
                    <tr
                      key={est.id}
                      className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/estimates/${est.id}`)}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono font-medium text-slate-900">
                          {est.estimateNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/customers/${est.customer.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:text-emerald-600 transition-colors font-medium"
                        >
                          {est.customer.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {est.vehicle
                          ? `${est.vehicle.year} ${est.vehicle.make} ${est.vehicle.model}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            ESTIMATE_STATUS_COLORS[est.status] ??
                            "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {est.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {formatDate(est.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {formatCurrency(est.total)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/estimates/${est.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-emerald-600 hover:text-emerald-700 text-xs font-medium"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        </>
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
