"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, Search, X, Plus, Trash2, Star, Check, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, fetchJson } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";

interface CustomerResult {
  id: string;
  name: string;
  phone: string | null;
}

interface ServiceItem {
  id: string;
  name: string;
  basePrice: number;
  category: string;
}

interface TierItem {
  name: string;
  description: string;
}

interface AddOn {
  name: string;
  price: number;
}

export default function NewQuotePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchRef = useRef<HTMLInputElement>(null);

  // Customer selection
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");

  // Tier configuration
  const [goodName, setGoodName] = useState("Essential Detail");
  const [goodPrice, setGoodPrice] = useState(175);
  const [goodItems, setGoodItems] = useState<TierItem[]>([
    { name: "Hand Wash", description: "Two-bucket method" },
    { name: "Tire Dressing", description: "Premium tire shine" },
    { name: "Spray Sealant", description: "3-month protection" },
  ]);

  const [betterName, setBetterName] = useState("Premium Detail");
  const [betterPrice, setBetterPrice] = useState(325);
  const [betterItems, setBetterItems] = useState<TierItem[]>([
    { name: "Full Exterior Wash", description: "Hand wash + clay bar" },
    { name: "Interior Vacuum & Wipe", description: "All surfaces cleaned" },
    { name: "Leather Conditioning", description: "Protect and restore" },
    { name: "Spray Sealant", description: "6-month protection" },
  ]);

  const [bestName, setBestName] = useState("Ultimate Package");
  const [bestPrice, setBestPrice] = useState(550);
  const [bestItems, setBestItems] = useState<TierItem[]>([
    { name: "Complete Detail", description: "Interior + exterior" },
    { name: "Clay Bar Treatment", description: "Remove contaminants" },
    { name: "One-Step Polish", description: "Remove light swirls" },
    { name: "Ceramic Spray Coating", description: "12-month protection" },
    { name: "Engine Bay Cleaning", description: "Steam clean" },
  ]);

  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");

  // Customer search
  const { data: searchResults = [] } = useQuery<CustomerResult[]>({
    queryKey: ["customer-search-quote", customerSearch],
    queryFn: () => fetchJson(`/api/customers/search?q=${encodeURIComponent(customerSearch)}`),
    enabled: customerSearch.length >= 1 && !customerId,
  });

  // Load services for auto-suggest
  const { data: services = [], isError: isServicesError, refetch: refetchServices } = useQuery<ServiceItem[]>({
    queryKey: ["services-active"],
    queryFn: () => fetchJson("/api/services?active=true"),
  });

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // Auto-populate tiers from services
  const autoPopulate = () => {
    const core = services.filter(s => s.category === "Service" || s.category === "Core");
    const addOnItems = services.filter(s => s.category === "Add-On" || s.category === "AddOn");

    if (core.length >= 1) {
      setGoodItems(core.slice(0, 3).map(s => ({ name: s.name, description: "" })));
      setGoodPrice(core.slice(0, 3).reduce((sum, s) => sum + s.basePrice, 0));
    }
    if (core.length >= 2) {
      setBetterItems(core.slice(0, 5).map(s => ({ name: s.name, description: "" })));
      setBetterPrice(core.slice(0, 5).reduce((sum, s) => sum + s.basePrice, 0));
    }
    if (core.length >= 1) {
      const allItems = [...core, ...addOnItems.slice(0, 2)];
      setBestItems(allItems.map(s => ({ name: s.name, description: "" })));
      setBestPrice(allItems.reduce((sum, s) => sum + s.basePrice, 0));
    }

    toast.success("Tiers auto-populated from your service catalog");
  };

  const addItemToTier = (tier: "good" | "better" | "best") => {
    const newItem = { name: "", description: "" };
    if (tier === "good") setGoodItems([...goodItems, newItem]);
    if (tier === "better") setBetterItems([...betterItems, newItem]);
    if (tier === "best") setBestItems([...bestItems, newItem]);
  };

  const removeItemFromTier = (tier: "good" | "better" | "best", index: number) => {
    if (tier === "good") setGoodItems(goodItems.filter((_, i) => i !== index));
    if (tier === "better") setBetterItems(betterItems.filter((_, i) => i !== index));
    if (tier === "best") setBestItems(bestItems.filter((_, i) => i !== index));
  };

  const updateTierItem = (tier: "good" | "better" | "best", index: number, field: "name" | "description", value: string) => {
    const update = (items: TierItem[]) => items.map((item, i) => i === index ? { ...item, [field]: value } : item);
    if (tier === "good") setGoodItems(update(goodItems));
    if (tier === "better") setBetterItems(update(betterItems));
    if (tier === "best") setBestItems(update(bestItems));
  };

  const createMutation = useMutation({
    mutationFn: async (sendNow: boolean) => {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customerId || undefined,
          status: sendNow ? "Sent" : "Draft",
          goodName, goodPrice, goodItems,
          betterName, betterPrice, betterItems,
          bestName, bestPrice, bestItems,
          addOns, discount, notes,
          total: bestPrice, // Default to best tier price
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (quote, sendNow) => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success(`Quote ${quote.quoteNumber} ${sendNow ? "sent" : "saved as draft"}`, {
        action: { label: "View", onClick: () => router.push(`/quotes/${quote.id}`) },
      });
      router.push("/quotes");
    },
    onError: () => toast.error("Failed to create quote"),
  });

  if (isServicesError) return <ErrorState message="Failed to load services." onRetry={refetchServices} />;

  const TierEditor = ({ tier, name, setName, price, setPrice, items, color, highlight }: {
    tier: "good" | "better" | "best";
    name: string;
    setName: (v: string) => void;
    price: number;
    setPrice: (v: number) => void;
    items: TierItem[];
    color: string;
    highlight?: boolean;
  }) => (
    <div className={`border-2 rounded-xl p-4 space-y-3 ${highlight ? `border-${color}-400 bg-${color}-50/30 ring-2 ring-${color}-200` : "border-slate-200"}`}>
      {highlight && (
        <div className={`flex items-center gap-1 text-xs font-semibold text-${color}-600 mb-1`}>
          <Star className="w-3 h-3" /> MOST POPULAR
        </div>
      )}
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="font-semibold text-base border-0 bg-transparent px-0 focus-visible:ring-0"
        placeholder="Tier name"
      />
      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-sm">$</span>
        <Input
          type="number"
          value={price || ""}
          onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
          className="text-2xl font-bold border-0 bg-transparent px-0 w-32 focus-visible:ring-0"
          min={0}
        />
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <Check className={`w-4 h-4 text-${color}-500 shrink-0`} />
            <Input
              value={item.name}
              onChange={(e) => updateTierItem(tier, i, "name", e.target.value)}
              placeholder="Service name"
              className="flex-1 h-8 text-sm"
            />
            <button onClick={() => removeItemFromTier(tier, i)} className="text-slate-300 hover:text-red-500">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <button
          onClick={() => addItemToTier(tier)}
          className={`flex items-center gap-1 text-xs font-medium text-${color}-600 hover:text-${color}-700`}
        >
          <Plus className="w-3 h-3" /> Add item
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Quote</h1>
          <p className="text-sm text-slate-500">Build a Good / Better / Best quote</p>
        </div>
      </div>

      {/* Customer Selection */}
      {!customerId ? (
        <div className="relative">
          <Label className="text-sm font-medium">Customer</Label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              ref={searchRef}
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Search customer or leave blank for lead..."
              className="pl-9"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {searchResults.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setCustomerId(c.id); setCustomerName(c.name); setCustomerSearch(""); }}
                  className="w-full text-left px-3 py-2.5 hover:bg-slate-50 border-b border-slate-50 last:border-0"
                >
                  <span className="font-medium text-sm">{c.name}</span>
                  {c.phone && <span className="text-xs text-slate-400 ml-2">{c.phone}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
          <span className="font-medium text-sm text-slate-900">{customerName}</span>
          <button onClick={() => { setCustomerId(""); setCustomerName(""); }} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Auto-populate button */}
      {services.length > 0 && (
        <button
          onClick={autoPopulate}
          className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
        >
          <Sparkles className="w-4 h-4" /> Auto-populate from service catalog
        </button>
      )}

      {/* Three Tier Editors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TierEditor
          tier="good" name={goodName} setName={setGoodName}
          price={goodPrice} setPrice={setGoodPrice}
          items={goodItems} color="slate"
        />
        <TierEditor
          tier="better" name={betterName} setName={setBetterName}
          price={betterPrice} setPrice={setBetterPrice}
          items={betterItems} color="emerald" highlight
        />
        <TierEditor
          tier="best" name={bestName} setName={setBestName}
          price={bestPrice} setPrice={setBestPrice}
          items={bestItems} color="amber"
        />
      </div>

      {/* Add-ons */}
      <div>
        <Label className="text-sm font-medium">Add-ons (optional)</Label>
        <div className="space-y-2 mt-2">
          {addOns.map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={a.name}
                onChange={(e) => setAddOns(addOns.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                placeholder="Add-on name"
                className="flex-1"
              />
              <Input
                type="number"
                value={a.price || ""}
                onChange={(e) => setAddOns(addOns.map((x, j) => j === i ? { ...x, price: parseFloat(e.target.value) || 0 } : x))}
                placeholder="$0"
                className="w-24"
              />
              <button onClick={() => setAddOns(addOns.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => setAddOns([...addOns, { name: "", price: 0 }])}
            className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
          >
            <Plus className="w-3 h-3" /> Add-on
          </button>
        </div>
      </div>

      {/* Discount & Notes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">Discount ($)</Label>
          <Input
            type="number"
            value={discount || ""}
            onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
            className="mt-1"
            min={0}
          />
        </div>
        <div>
          <Label className="text-sm font-medium">Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1"
            rows={2}
            placeholder="Internal notes..."
          />
        </div>
      </div>

      {/* Summary & Actions */}
      <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="text-sm text-slate-500">
          Tiers: <span className="font-medium text-slate-700">{formatCurrency(goodPrice)}</span> / <span className="font-bold text-emerald-600">{formatCurrency(betterPrice)}</span> / <span className="font-medium text-amber-600">{formatCurrency(bestPrice)}</span>
          {discount > 0 && <span className="text-red-500 ml-2">(-{formatCurrency(discount)} discount)</span>}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => createMutation.mutate(false)}
            disabled={createMutation.isPending}
          >
            Save Draft
          </Button>
          <Button
            onClick={() => createMutation.mutate(true)}
            disabled={createMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {createMutation.isPending ? "Creating..." : "Save & Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
