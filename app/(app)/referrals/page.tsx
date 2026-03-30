"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Gift, Plus, Trophy, Users, Clock, Check, DollarSign, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, fetchJson } from "@/lib/utils";
import { PageSkeleton } from "@/components/page-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";

interface Referral {
  id: string;
  referredName: string;
  referredPhone: string | null;
  referredEmail: string | null;
  status: string;
  rewardType: string | null;
  rewardValue: number | null;
  rewardFulfilledAt: string | null;
  createdAt: string;
  referrer: { id: string; name: string; phone: string | null };
  referredCustomer: { id: string; name: string } | null;
}

interface LeaderboardEntry {
  referrer: { id: string; name: string; phone: string | null };
  count: number;
  booked: number;
  rewarded: number;
}

interface CustomerResult {
  id: string;
  name: string;
  phone: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  booked: "bg-blue-100 text-blue-700",
  rewarded: "bg-emerald-100 text-emerald-700",
};

export default function ReferralsPage() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  // Form state
  const [customerSearch, setCustomerSearch] = useState("");
  const [referrerId, setReferrerId] = useState("");
  const [referrerName, setReferrerName] = useState("");
  const [referredName, setReferredName] = useState("");
  const [referredPhone, setReferredPhone] = useState("");
  const [rewardType, setRewardType] = useState("discount");
  const [rewardValue, setRewardValue] = useState(25);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, isLoading, error, refetch } = useQuery<any>({
    queryKey: ["referrals", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      return fetchJson(`/api/referrals?${params}`);
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: leaderboardData } = useQuery<any>({
    queryKey: ["referral-leaderboard"],
    queryFn: () => fetchJson("/api/referrals/leaderboard"),
  });

  const { data: searchResults = [] } = useQuery<CustomerResult[]>({
    queryKey: ["customer-search-ref", customerSearch],
    queryFn: () => fetchJson(`/api/customers/search?q=${encodeURIComponent(customerSearch)}`),
    enabled: customerSearch.length >= 1 && !referrerId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referrerId, referredName, referredPhone, rewardType, rewardValue }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referrals"] });
      queryClient.invalidateQueries({ queryKey: ["referral-leaderboard"] });
      setShowAdd(false);
      resetForm();
      toast.success("Referral created!");
    },
    onError: () => toast.error("Failed to create referral"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/referrals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referrals"] });
      queryClient.invalidateQueries({ queryKey: ["referral-leaderboard"] });
      toast.success("Referral updated");
    },
  });

  const resetForm = () => {
    setCustomerSearch(""); setReferrerId(""); setReferrerName("");
    setReferredName(""); setReferredPhone("");
    setRewardType("discount"); setRewardValue(25);
  };

  const referrals: Referral[] = data?.data || [];
  const leaderboard: LeaderboardEntry[] = leaderboardData?.data || [];
  const totalReferrals = leaderboardData?.meta?.totalReferrals || 0;

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState message="Failed to load referrals" onRetry={refetch} />;

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Referrals</h1>
          <p className="text-sm text-slate-500">Track and reward customer referrals</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="w-4 h-4 mr-2" /> Log Referral
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Gift className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-500 uppercase">Total</span>
          </div>
          <span className="text-2xl font-bold text-slate-900">{totalReferrals}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-medium text-slate-500 uppercase">Pending</span>
          </div>
          <span className="text-2xl font-bold text-amber-600">{referrals.filter(r => r.status === "pending").length}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Check className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-medium text-slate-500 uppercase">Booked</span>
          </div>
          <span className="text-2xl font-bold text-blue-600">{referrals.filter(r => r.status === "booked").length}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-medium text-slate-500 uppercase">Rewarded</span>
          </div>
          <span className="text-2xl font-bold text-emerald-600">{referrals.filter(r => r.status === "rewarded").length}</span>
        </div>
      </div>

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold text-slate-900">Top Referrers</h2>
          </div>
          <div className="space-y-2">
            {leaderboard.slice(0, 5).map((entry, i) => (
              <div key={entry.referrer.id} className="flex items-center gap-3 py-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-200 text-slate-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500"
                }`}>{i + 1}</span>
                <span className="flex-1 font-medium text-sm text-slate-900">{entry.referrer.name}</span>
                <span className="text-xs text-slate-400">{entry.count} referrals</span>
                <span className="text-xs font-medium text-emerald-600">{entry.booked} booked</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Filter" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="booked">Booked</SelectItem>
          <SelectItem value="rewarded">Rewarded</SelectItem>
        </SelectContent>
      </Select>

      {/* Referrals List */}
      {referrals.length === 0 ? (
        <EmptyState
          icon={Gift}
          title="No referrals yet"
          description="Start tracking referrals to reward your best customers."
          action={{ label: "Log Referral", onClick: () => setShowAdd(true) }}
        />
      ) : (
        <div className="space-y-2">
          {referrals.map((r) => (
            <div key={r.id} className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-4">
              <Users className="w-5 h-5 text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{r.referredName}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] || "bg-slate-100 text-slate-600"}`}>
                    {r.status}
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  Referred by <span className="font-medium text-slate-600">{r.referrer.name}</span>
                  {r.referredPhone && <> — {r.referredPhone}</>}
                </div>
              </div>
              {r.rewardType && (
                <span className="text-xs text-slate-500 hidden sm:block">
                  Reward: {r.rewardType === "cash" ? formatCurrency(r.rewardValue || 0) : r.rewardType === "discount" ? `$${r.rewardValue} off` : "Free add-on"}
                </span>
              )}
              <div className="flex gap-1">
                {r.status === "pending" && (
                  <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: r.id, status: "booked" })}>
                    Mark Booked
                  </Button>
                )}
                {r.status === "booked" && (
                  <Button size="sm" onClick={() => updateStatusMutation.mutate({ id: r.id, status: "rewarded" })} className="bg-emerald-600 text-white hover:bg-emerald-700">
                    Mark Rewarded
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log New Referral</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Referrer selection */}
            {!referrerId ? (
              <div className="relative">
                <Label>Referring Customer *</Label>
                <Input
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search customer..."
                  className="mt-1"
                />
                {searchResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {searchResults.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { setReferrerId(c.id); setReferrerName(c.name); setCustomerSearch(""); }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm"
                      >
                        {c.name} {c.phone && <span className="text-slate-400">{c.phone}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                <span className="text-sm font-medium">{referrerName}</span>
                <button onClick={() => { setReferrerId(""); setReferrerName(""); }}>
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            )}

            <div>
              <Label>Referred Person&apos;s Name *</Label>
              <Input value={referredName} onChange={(e) => setReferredName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={referredPhone} onChange={(e) => setReferredPhone(e.target.value)} className="mt-1" placeholder="(XXX) XXX-XXXX" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Reward Type</Label>
                <Select value={rewardType} onValueChange={(v) => v && setRewardType(v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discount">Discount</SelectItem>
                    <SelectItem value="free_addon">Free Add-on</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reward Value ($)</Label>
                <Input type="number" value={rewardValue || ""} onChange={(e) => setRewardValue(parseFloat(e.target.value) || 0)} className="mt-1" />
              </div>
            </div>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!referrerId || !referredName || createMutation.isPending}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {createMutation.isPending ? "Creating..." : "Log Referral"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
