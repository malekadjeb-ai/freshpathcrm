"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, Send, Check, Copy, Star, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, fetchJson } from "@/lib/utils";
import { PageSkeleton } from "@/components/page-skeleton";
import { ErrorState } from "@/components/error-state";

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-700",
  Sent: "bg-blue-100 text-blue-700",
  Viewed: "bg-cyan-100 text-cyan-700",
  Accepted: "bg-emerald-100 text-emerald-700",
  Declined: "bg-red-100 text-red-700",
  Expired: "bg-amber-100 text-amber-700",
};

export default function QuoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const id = params.id as string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: quote, isLoading, error, refetch } = useQuery<any>({
    queryKey: ["quote", id],
    queryFn: () => fetchJson(`/api/quotes/${id}`),
  });

  const sendMutation = useMutation({
    mutationFn: () => fetch(`/api/quotes/${id}/send`, { method: "POST" }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quote", id] });
      toast.success("Quote sent!");
    },
    onError: () => toast.error("Failed to send"),
  });

  const acceptMutation = useMutation({
    mutationFn: (tier: string) => fetch(`/api/quotes/${id}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedTier: tier }),
    }).then(r => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Quote accepted! Job created.", {
        action: { label: "View Job", onClick: () => router.push(`/jobs/${data.job.id}`) },
      });
      router.push("/quotes");
    },
    onError: () => toast.error("Failed to accept"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => fetch(`/api/quotes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Quote deleted");
      router.push("/quotes");
    },
  });

  if (isLoading) return <PageSkeleton />;
  if (error || !quote) return <ErrorState message="Quote not found" onRetry={refetch} />;

  const parseItems = (json: string) => {
    try { return JSON.parse(json); } catch { return []; }
  };

  const goodItems = parseItems(quote.goodItems);
  const betterItems = parseItems(quote.betterItems);
  const bestItems = parseItems(quote.bestItems);

  const publicUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/quotes/${id}/public`;

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{quote.quoteNumber}</h1>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[quote.status] || "bg-slate-100"}`}>
                {quote.status}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              {quote.customer?.name || quote.lead?.name || "Unknown"} — Created {formatDate(quote.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {quote.status === "Draft" && (
            <Button onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Send className="w-4 h-4 mr-2" /> Send Quote
            </Button>
          )}
          <Button variant="outline" onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Link copied!"); }}>
            <Copy className="w-4 h-4 mr-2" /> Copy Link
          </Button>
          <Button variant="outline" size="icon" onClick={() => deleteMutation.mutate()} className="text-red-500 hover:text-red-700">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Meta info */}
      {(quote.sentAt || quote.viewedAt || quote.expiresAt) && (
        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
          {quote.sentAt && <span>Sent: {formatDate(quote.sentAt)}</span>}
          {quote.viewedAt && <span>Viewed: {formatDate(quote.viewedAt)}</span>}
          {quote.expiresAt && <span>Expires: {formatDate(quote.expiresAt)}</span>}
        </div>
      )}

      {/* Three Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { key: "good" as const, name: quote.goodName, price: quote.goodPrice, items: goodItems, color: "slate" },
          { key: "better" as const, name: quote.betterName, price: quote.betterPrice, items: betterItems, color: "emerald", popular: true },
          { key: "best" as const, name: quote.bestName, price: quote.bestPrice, items: bestItems, color: "amber" },
        ].map((tier) => (
          <div
            key={tier.key}
            className={`border-2 rounded-xl p-5 ${
              quote.selectedTier === tier.key
                ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200"
                : tier.popular
                  ? "border-emerald-300 bg-emerald-50/20"
                  : "border-slate-200"
            }`}
          >
            {tier.popular && !quote.selectedTier && (
              <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 mb-2">
                <Star className="w-3 h-3" /> MOST POPULAR
              </div>
            )}
            {quote.selectedTier === tier.key && (
              <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 mb-2">
                <Check className="w-3 h-3" /> SELECTED
              </div>
            )}
            <h3 className="font-semibold text-slate-900">{tier.name}</h3>
            <div className="text-3xl font-bold text-slate-900 my-3">
              {formatCurrency(tier.price)}
            </div>
            <ul className="space-y-2">
              {tier.items.map((item: { name: string; description?: string }, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className={`w-4 h-4 text-${tier.color === "emerald" ? "emerald" : tier.color === "amber" ? "amber" : "slate"}-500 shrink-0 mt-0.5`} />
                  <div>
                    <span className="font-medium">{item.name}</span>
                    {item.description && <span className="text-slate-400 ml-1">— {item.description}</span>}
                  </div>
                </li>
              ))}
            </ul>
            {quote.status !== "Accepted" && quote.status !== "Declined" && (
              <Button
                onClick={() => acceptMutation.mutate(tier.key)}
                disabled={acceptMutation.isPending}
                className={`w-full mt-4 ${
                  tier.popular
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                Accept {tier.name}
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Notes */}
      {quote.notes && (
        <div className="bg-slate-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-slate-700 mb-1">Notes</h3>
          <p className="text-sm text-slate-500">{quote.notes}</p>
        </div>
      )}
    </div>
  );
}
