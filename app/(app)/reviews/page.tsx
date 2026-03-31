"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Star,
  Send,
  CheckCircle,
  Clock,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorState } from "@/components/error-state";
import { fetchJson } from "@/lib/utils";
import { ReviewList } from "./components/review-list";
import { CreateReviewDialog, SendReviewDialog } from "./components/review-dialogs";

interface Review {
  id: string;
  customerId: string;
  customer: { id: string; name: string; phone: string | null; email: string | null };
  jobId: string | null;
  job: { id: string; status: string; scheduledAt: string | null } | null;
  platform: string;
  rating: number | null;
  content: string | null;
  requestSentAt: string | null;
  clickedAt: string | null;
  reviewedAt: string | null;
  reviewUrl: string | null;
  status: string;
  createdAt: string;
}

const PLATFORMS = ["google", "yelp", "facebook", "nextdoor"];

export default function ReviewsPage() {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  const { data: reviews = [], isLoading, isError, refetch } = useQuery<Review[]>({
    queryKey: ["reviews", filterStatus, filterPlatform],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterPlatform) params.set("platform", filterPlatform);
      return fetchJson(`/api/reviews?${params}`);
    },
  });

  const { data: customers = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["customers-list"],
    queryFn: () => fetchJson("/api/customers"),
  });

  const createMutation = useMutation({
    mutationFn: async (data: { customerId: string; platform: string }) => {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast.success("Review request created");
      setCreateDialogOpen(false);
    },
    onError: () => toast.error("Failed to create review request"),
  });

  const sendMutation = useMutation({
    mutationFn: async ({ id, method }: { id: string; method: string }) => {
      const res = await fetch(`/api/reviews/${id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast.success(`Review request sent via ${vars.method}`);
      setSendDialogOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/reviews/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast.success("Review updated");
    },
    onError: () => toast.error("Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/reviews/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast.success("Review deleted");
    },
    onError: () => toast.error("Failed to delete"),
  });

  const filteredReviews = reviews.filter(
    (r) =>
      !search ||
      r.customer.name.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: reviews.length,
    pending: reviews.filter((r) => r.status === "pending").length,
    sent: reviews.filter((r) => r.status === "sent").length,
    reviewed: reviews.filter((r) => r.status === "reviewed").length,
    avgRating: reviews.filter((r) => r.rating).length > 0
      ? (reviews.filter((r) => r.rating).reduce((sum, r) => sum + (r.rating || 0), 0) /
          reviews.filter((r) => r.rating).length).toFixed(1)
      : "—",
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 md:pb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reviews</h1>
          <p className="text-slate-400 text-sm mt-1">
            {stats.total} total &middot; {stats.reviewed} reviewed &middot; Avg {stats.avgRating} stars
          </p>
        </div>
        <Button
          onClick={() => { setSelectedCustomerId(""); setCreateDialogOpen(true); }}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4 mr-2" /> Request Review
        </Button>
      </div>

      {isError && <ErrorState message="Failed to load reviews." onRetry={refetch} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Pending" value={stats.pending} icon={<Clock className="w-4 h-4 text-slate-400" />} />
        <StatCard label="Sent" value={stats.sent} icon={<Send className="w-4 h-4 text-blue-400" />} />
        <StatCard label="Reviewed" value={stats.reviewed} icon={<CheckCircle className="w-4 h-4 text-emerald-400" />} />
        <StatCard label="Avg Rating" value={stats.avgRating} icon={<Star className="w-4 h-4 text-amber-400" />} />
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search by customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-slate-200"
          />
        </div>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? "")}>
          <SelectTrigger className="w-full md:w-36 bg-white border-slate-200">
            <Filter className="w-4 h-4 mr-2 text-slate-500" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPlatform} onValueChange={(v) => setFilterPlatform(v ?? "")}>
          <SelectTrigger className="w-full md:w-36 bg-white border-slate-200">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {PLATFORMS.map((p) => (
              <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ReviewList
        reviews={filteredReviews}
        isLoading={isLoading}
        onSend={(review) => { setSelectedReview(review); setSendDialogOpen(true); }}
        onMarkReviewed={(review) => updateMutation.mutate({
          id: review.id,
          data: { status: "reviewed", reviewedAt: new Date().toISOString() },
        })}
        onDelete={(id) => deleteMutation.mutate(id)}
      />

      <CreateReviewDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        customers={customers}
        selectedCustomerId={selectedCustomerId}
        setSelectedCustomerId={setSelectedCustomerId}
        onSubmit={() => createMutation.mutate({ customerId: selectedCustomerId, platform: "google" })}
        isPending={createMutation.isPending}
      />

      <SendReviewDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        review={selectedReview}
        onSend={(id, method) => sendMutation.mutate({ id, method })}
        isPending={sendMutation.isPending}
      />
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3">
      <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
        {icon}
        {label}
      </div>
      <div className="text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}
