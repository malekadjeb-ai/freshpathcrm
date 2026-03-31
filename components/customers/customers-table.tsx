"use client";

import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown, Phone, Mail, MapPin, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/empty-state";
import { formatCurrency, getInitials } from "@/lib/utils";
import { differenceInDays } from "date-fns";
import type { CustomerListItem, CustomerSortKey } from "@/components/customers/customer-types";

export type SortKey = CustomerSortKey;
type Customer = CustomerListItem;

interface CustomersTableProps {
  customers: Customer[];
  isLoading: boolean;
  totalCount: number;
  sort: SortKey;
  order: "asc" | "desc";
  onSort: (key: SortKey) => void;
  onNewCustomer: () => void;
}

function LastServiceCell({ date }: { date: string | null }) {
  if (!date) return <span className="text-slate-400">Never</span>;
  const days = differenceInDays(new Date(), new Date(date));
  return (
    <span className={days > 60 ? "text-red-500 font-medium" : "text-slate-500"}>
      {days === 0 ? "Today" : `${days}d ago`}
    </span>
  );
}

function SortIcon({ col, sort, order }: { col: SortKey; sort: SortKey; order: "asc" | "desc" }) {
  if (sort !== col) return null;
  return order === "asc"
    ? <ChevronUp className="w-3 h-3 inline ml-0.5" />
    : <ChevronDown className="w-3 h-3 inline ml-0.5" />;
}

export function CustomersTable({
  customers,
  isLoading,
  totalCount,
  sort,
  order,
  onSort,
  onNewCustomer,
}: CustomersTableProps) {
  const router = useRouter();

  return (
    <>
      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-lg animate-pulse" />
          ))
        ) : customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={totalCount === 0 ? "No customers yet" : "No customers found"}
            description={
              totalCount === 0
                ? "Add your first customer to start tracking their history."
                : "Try adjusting your search or filters."
            }
            action={totalCount === 0 ? { label: "Add Customer", onClick: onNewCustomer } : undefined}
          />
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
                <LastServiceCell date={customer.lastServiceDate} />
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
              <tr className="border-b border-slate-200">
                {(["name", "totalSpent", "jobCount", "lastServiceDate"] as SortKey[]).map((col) => {
                  const labels: Record<SortKey, string> = {
                    name: "Customer",
                    totalSpent: "Total Spent",
                    jobCount: "Jobs",
                    lastServiceDate: "Last Service",
                    createdAt: "Created",
                  };
                  return (
                    <th
                      key={col}
                      className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 cursor-pointer hover:text-slate-900"
                      onClick={() => onSort(col)}
                    >
                      {labels[col]} <SortIcon col={col} sort={sort} order={order} />
                    </th>
                  );
                })}
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Contact</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Location</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Tags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
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
                    <td colSpan={7}>
                      <EmptyState
                        icon={Users}
                        title={totalCount === 0 ? "No customers yet" : "No customers match your search"}
                        description={
                          totalCount === 0
                            ? "Add your first customer to start tracking their history."
                            : "Try adjusting your search or location filter."
                        }
                        action={totalCount === 0 ? { label: "Add Customer", onClick: onNewCustomer } : undefined}
                      />
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
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-900">{formatCurrency(customer.totalSpent)}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{customer.jobCount}</td>
                    <td className="px-4 py-3 text-xs">
                      <LastServiceCell date={customer.lastServiceDate} />
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
                          {customer.city}{customer.neighborhood ? `, ${customer.neighborhood}` : ""}
                        </span>
                      )}
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
    </>
  );
}
