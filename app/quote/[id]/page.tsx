"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Check, Star, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

interface PublicQuote {
  quoteNumber: string;
  customerName: string;
  status: string;
  goodName: string;
  goodPrice: number;
  goodItems: string;
  betterName: string;
  betterPrice: number;
  betterItems: string;
  bestName: string;
  bestPrice: number;
  bestItems: string;
  addOns: string | null;
  discount: number | null;
  notes: string | null;
  expiresAt: string | null;
  selectedTier: string | null;
}

interface TierItem {
  name: string;
  description?: string;
}

export default function PublicQuotePage() {
  const params = useParams();
  const id = params.id as string;
  const [accepted, setAccepted] = useState(false);
  const [acceptedTier, setAcceptedTier] = useState<string | null>(null);

  const { data: quote, isLoading, error } = useQuery<PublicQuote>({
    queryKey: ["public-quote", id],
    queryFn: () => fetch(`/api/quotes/${id}/public`).then((r) => {
      if (!r.ok) throw new Error("Not found");
      return r.json();
    }),
  });

  const acceptMutation = useMutation({
    mutationFn: (tier: string) =>
      fetch(`/api/quotes/${id}/public-accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedTier: tier }),
      }).then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      }),
    onSuccess: (_data, tier) => {
      setAccepted(true);
      setAcceptedTier(tier);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h1 className="text-xl font-semibold text-slate-700">Quote Not Found</h1>
          <p className="text-sm text-slate-400 mt-1">This quote may have expired or been removed.</p>
        </div>
      </div>
    );
  }

  const isExpired = quote.expiresAt && new Date(quote.expiresAt) < new Date();
  const isAccepted = quote.status === "Accepted" || accepted;
  const isDeclined = quote.status === "Declined";
  const canAccept = !isAccepted && !isDeclined && !isExpired;

  const parseItems = (json: string): TierItem[] => {
    try { return JSON.parse(json); } catch { return []; }
  };

  const tiers = [
    { key: "good", name: quote.goodName, price: quote.goodPrice, items: parseItems(quote.goodItems), accent: "slate" },
    { key: "better", name: quote.betterName, price: quote.betterPrice, items: parseItems(quote.betterItems), accent: "emerald", popular: true },
    { key: "best", name: quote.bestName, price: quote.bestPrice, items: parseItems(quote.bestItems), accent: "amber" },
  ];

  const finalTier = acceptedTier || quote.selectedTier;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Fresh Path</h1>
              <p className="text-sm text-slate-500">Premium Mobile Detailing</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-slate-700">{quote.quoteNumber}</p>
              {quote.expiresAt && (
                <p className="text-xs text-slate-400 flex items-center justify-end gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {isExpired ? "Expired" : `Expires ${new Date(quote.expiresAt).toLocaleDateString()}`}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 space-y-8">
        {/* Greeting */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900">
            Hi {quote.customerName}! 👋
          </h2>
          <p className="text-slate-500 mt-2 max-w-lg mx-auto">
            {isAccepted
              ? "Thanks for choosing Fresh Path! We'll be in touch soon to schedule your service."
              : isExpired
                ? "This quote has expired. Please contact us for an updated quote."
                : "We've prepared three options for you. Pick the one that fits your needs best!"}
          </p>
        </div>

        {/* Accepted banner */}
        {isAccepted && (
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-6 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-emerald-800">Quote Accepted!</h3>
            <p className="text-sm text-emerald-600 mt-1">
              You selected the <span className="font-bold capitalize">{finalTier}</span> package. We&apos;ll reach out shortly!
            </p>
          </div>
        )}

        {isExpired && !isAccepted && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6 text-center">
            <Clock className="w-10 h-10 text-amber-500 mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-amber-800">Quote Expired</h3>
            <p className="text-sm text-amber-600 mt-1">
              This quote expired on {new Date(quote.expiresAt!).toLocaleDateString()}. Contact us for an updated price!
            </p>
          </div>
        )}

        {/* Tier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((tier) => {
            const isSelected = finalTier === tier.key;
            return (
              <div
                key={tier.key}
                className={`relative bg-white rounded-2xl shadow-sm border-2 transition-all ${
                  isSelected
                    ? "border-emerald-400 ring-4 ring-emerald-100 scale-[1.02]"
                    : tier.popular && !finalTier
                      ? "border-emerald-300 shadow-lg scale-[1.02]"
                      : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* Popular badge */}
                {tier.popular && !finalTier && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3" /> MOST POPULAR
                    </span>
                  </div>
                )}

                {/* Selected badge */}
                {isSelected && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> SELECTED
                    </span>
                  </div>
                )}

                <div className="p-6">
                  <h3 className="text-lg font-semibold text-slate-900">{tier.name}</h3>
                  <div className="mt-3 mb-5">
                    <span className="text-4xl font-bold text-slate-900">{formatCurrency(tier.price)}</span>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {tier.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <Check className={`w-5 h-5 shrink-0 mt-0.5 ${
                          tier.accent === "emerald" ? "text-emerald-500"
                            : tier.accent === "amber" ? "text-amber-500"
                              : "text-slate-400"
                        }`} />
                        <div>
                          <span className="text-sm font-medium text-slate-700">{item.name}</span>
                          {item.description && (
                            <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>

                  {canAccept && (
                    <button
                      onClick={() => acceptMutation.mutate(tier.key)}
                      disabled={acceptMutation.isPending}
                      className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
                        tier.popular
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      } disabled:opacity-50`}
                    >
                      {acceptMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      ) : (
                        `Choose ${tier.name}`
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Discount note */}
        {quote.discount && quote.discount > 0 && (
          <div className="text-center text-sm text-emerald-600 font-medium">
            🎉 A discount of {formatCurrency(quote.discount)} will be applied at checkout!
          </div>
        )}

        {/* Notes */}
        {quote.notes && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">Additional Notes</h3>
            <p className="text-sm text-slate-500 whitespace-pre-wrap">{quote.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 pb-8">
          <p>Questions? Call or text us anytime.</p>
          <p className="mt-1">Fresh Path Mobile Detailing — Houston, TX</p>
        </div>
      </div>
    </div>
  );
}
