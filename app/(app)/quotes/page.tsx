"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  FileText, Plus, Search, Send, Eye, Check, X, Clock, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate, fetchJson } from "@/lib/utils";
import { PageSkeleton } from "@/components/page-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Pagination } from "@/components/pagination";

interface Quote {
  id: string;
  quoteNumber: string;
  status: string;
  goodName: string;
  goodPrice: number;
  betterName: string;
  betterPrice: number;
  bestName: string;
  bestPrice: number;
  selectedTier: string | null;
  total: number;
  sentAt: string | null;
  viewedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  customer: { id: string; name: string; phone: string | null } | null;
  lead: { id: string; name: string; phone: string | null } | null;
}

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-700",
  Sent: "bg-blue-100 text-blue-700",
  Viewed: "bg-cyan-100 text-cyan-700",
  Accepted: "bg-emerald-100 text-emerald-700",
  Declined: "bg-red-100 text-red-700",
  Expired: "bg-amber-100 text-amber-700",
};

const STATUS_ICONS: Record<string, typeof FileText> = {
  Draft: FileText,
  Sent: Send,
  Viewed: Eye,
  Accepted: Check,
  Declined: X,
  Expired: Clock,
};

export default function QuotesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, isLoading, error, refetch } = useQuery<any>({
    queryKey: ["quotes", search, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("limit", String(limit));
      return fetchJson(`/api/quotes?${params}`);
    },
  });

  const quotes: Quote[] = data?.data || [];
  const total = data?.meta?.total || 0;

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState message="Failed to load quotes" onRetry={refetch} />;

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quotes</h1>
          <p className="text-sm text-slate-500">Good / Better / Best tier pricing</p>
        </div>
        <Button
          onClick={() => router.push("/quotes/new")}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" /> New Quote
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search quotes..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => v && (setStatusFilter(v), setPage(1))}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Sent">Sent</SelectItem>
            <SelectItem value="Viewed">Viewed</SelectItem>
            <SelectItem value="Accepted">Accepted</SelectItem>
            <SelectItem value="Declined">Declined</SelectItem>
            <SelectItem value="Expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quote Cards */}
      {quotes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No quotes yet"
          description="Create your first Good/Better/Best quote to upsell customers."
          action={{ label: "Create Quote", onClick: () => router.push("/quotes/new") }}
        />
      ) : (
        <div className="space-y-3">
          {quotes.map((q) => {
            const StatusIcon = STATUS_ICONS[q.status] || FileText;
            const recipientName = q.customer?.name || q.lead?.name || "Unknown";
            return (
              <button
                key={q.id}
                onClick={() => router.push(`/quotes/${q.id}`)}
                className="w-full text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-emerald-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-emerald-50">
                    <StatusIcon className="w-5 h-5 text-slate-500 group-hover:text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs text-slate-400">{q.quoteNumber}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[q.status] || "bg-slate-100 text-slate-600"}`}>
                        {q.status}
                      </span>
                      {q.selectedTier && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 capitalize">
                          {q.selectedTier} tier
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 truncate">{recipientName}</span>
                      {q.sentAt && <span className="text-xs text-slate-400">Sent {formatDate(q.sentAt)}</span>}
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-6 shrink-0">
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Tiers</div>
                      <div className="text-xs font-medium text-slate-600">
                        {formatCurrency(q.goodPrice)} / {formatCurrency(q.betterPrice)} / {formatCurrency(q.bestPrice)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">{q.selectedTier ? "Selected" : "Best"}</div>
                      <div className="text-base font-bold text-emerald-600">
                        {formatCurrency(q.selectedTier === "good" ? q.goodPrice : q.selectedTier === "better" ? q.betterPrice : q.bestPrice)}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {total > limit && (
        <Pagination
          page={page}
          totalPages={Math.ceil(total / limit)}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
