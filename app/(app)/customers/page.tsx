"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Plus, Search, ChevronUp, ChevronDown, Phone, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, getInitials, fetchJson } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { differenceInDays } from "date-fns";
import { NewCustomerDialog } from "@/components/customers/NewCustomerDialog";
import { ExportButton } from "@/components/shared/export-button";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  neighborhood: string | null;
  tags: { id: string; name: string; color: string }[];
  totalSpent: number;
  jobCount: number;
  lastServiceDate: string | null;
}

type SortKey = "name" | "totalSpent" | "jobCount" | "lastServiceDate" | "createdAt";

export default function CustomersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [sort, setSort] = useState<SortKey>("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [newOpen, setNewOpen] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 20;

  const { data: response, isLoading, isError, refetch } = useQuery<{
    data: Customer[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>({
    queryKey: ["customers", search, cityFilter, sort, order, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (cityFilter && cityFilter !== "all") params.set("city", cityFilter);
      params.set("sort", sort);
      params.set("order", order);
      params.set("page", String(page));
      params.set("limit", String(perPage));
      return fetchJson(`/api/customers?${params}`);
    },
  });

  const customers = response?.data ?? [];
  const totalPages = response?.pagination?.totalPages ?? 1;
  const totalCount = response?.pagination?.total ?? 0;

  const toggleSort = (key: SortKey) => {
    if (sort === key) setOrder(order === "asc" ? "desc" : "asc");
    else { setSort(key); setOrder("desc"); }
    setPage(1);
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sort !== col) return null;
    return order === "asc" ? (
      <ChevronUp className="w-3 h-3 inline ml-0.5" />
    ) : (
      <ChevronDown className="w-3 h-3 inline ml-0.5" />
    );
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="text-slate-500 text-sm mt-0.5">{totalCount} total customers</p>
        </div>
        <Button
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
          onClick={() => setNewOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Customer
        </Button>
        <ExportButton type="customers" />
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name, email, phone..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={cityFilter} onValueChange={(v) => { setCityFilter(v ?? "all"); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            <SelectItem value="Richmond">Richmond</SelectItem>
            <SelectItem value="Katy">Katy</SelectItem>
            <SelectItem value="Sugar Land">Sugar Land</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isError ? <ErrorState message="Failed to load customers." onRetry={refetch} /> : <>

      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-lg animate-pulse" />
          ))
        ) : customers.length === 0 ? (
          <EmptyState title="No customers found" description="Try adjusting your search or filters." />
        ) : (
          customers.map((customer) => (
            <div
              key={customer.id}
              className="bg-white border border-slate-200 rounded-lg p-4 cursor-pointer hover:border-slate-300 transition-colors"
              onClick={() => router.push(`/customers/${customer.id}`)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">
                      {getInitials(customer.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-slate-900">{customer.name}</span>
                </div>
                <span className="font-semibold text-emerald-600 text-sm">{formatCurrency(customer.totalSpent)}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                {customer.phone && (
                  <a href={`tel:${customer.phone}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 hover:text-emerald-600">
                    <Phone className="w-3 h-3" />{customer.phone}
                  </a>
                )}
                {customer.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />{customer.city}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs">
                <span className="text-slate-500">{customer.jobCount} jobs</span>
                {customer.lastServiceDate ? (() => {
                  const days = differenceInDays(new Date(), new Date(customer.lastServiceDate!));
                  return <span className={days > 60 ? "text-red-500 font-medium" : "text-slate-400"}>{days === 0 ? "Today" : `${days}d ago`}</span>;
                })() : <span className="text-slate-400">No visits</span>}
                {customer.tags.slice(0, 2).map((tag) => (
                  <span key={tag.id} className="px-1.5 py-0.5 rounded-full text-xs" style={{ backgroundColor: tag.color + "20", color: tag.color }}>
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th
                  className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer hover:text-slate-900"
                  onClick={() => toggleSort("name")}
                >
                  Customer <SortIcon col="name" />
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Location</th>
                <th
                  className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer hover:text-slate-900"
                  onClick={() => toggleSort("totalSpent")}
                >
                  Total Spent <SortIcon col="totalSpent" />
                </th>
                <th
                  className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer hover:text-slate-900"
                  onClick={() => toggleSort("jobCount")}
                >
                  Jobs <SortIcon col="jobCount" />
                </th>
                <th
                  className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer hover:text-slate-900"
                  onClick={() => toggleSort("lastServiceDate")}
                >
                  Last Service <SortIcon col="lastServiceDate" />
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Tags</th>
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
                : customers.length === 0
                ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                      No customers found
                    </td>
                  </tr>
                )
                : customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/customers/${customer.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">
                            {getInitials(customer.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-slate-900">{customer.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col gap-0.5">
                        {customer.phone && (
                          <span className="flex items-center gap-1 text-xs">
                            <Phone className="w-3 h-3" />
                            <a href={`tel:${customer.phone}`} className="hover:text-emerald-600">{customer.phone}</a>
                          </span>
                        )}
                        {customer.email && (
                          <span className="flex items-center gap-1 text-xs">
                            <Mail className="w-3 h-3" />
                            <a href={`mailto:${customer.email}`} className="hover:text-emerald-600">{customer.email}</a>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {customer.city && (
                        <span className="flex items-center gap-1 text-xs">
                          <MapPin className="w-3 h-3" />
                          {customer.city}
                          {customer.neighborhood ? `, ${customer.neighborhood}` : ""}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(customer.totalSpent)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{customer.jobCount}</td>
                    <td className="px-4 py-3 text-xs">
                      {customer.lastServiceDate ? (() => {
                        const days = differenceInDays(new Date(), new Date(customer.lastServiceDate!));
                        return (
                          <span className={days > 60 ? "text-red-500 font-medium" : "text-slate-500"}>
                            {days === 0 ? "Today" : `${days}d ago`}
                          </span>
                        );
                      })() : <span className="text-slate-400">Never</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {customer.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ backgroundColor: tag.color + "20", color: tag.color }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </>}

      <NewCustomerDialog open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}
