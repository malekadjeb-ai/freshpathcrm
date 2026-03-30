"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Star,
  Send,
  Mail,
  MessageSquare,
  Trash2,
  ExternalLink,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { cn, fetchJson, timeAgo } from "@/lib/utils";

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

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  clicked: "bg-amber-100 text-amber-700",
  reviewed: "bg-emerald-100 text-emerald-700",
  declined: "bg-red-100 text-red-700",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3.5 h-3.5" />,
  sent: <Send className="w-3.5 h-3.5" />,
  clicked: <ExternalLink className="w-3.5 h-3.5" />,
  reviewed: <CheckCircle className="w-3.5 h-3.5" />,
  declined: <XCircle className="w-3.5 h-3.5" />,
};

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
      {/* Header */}
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Pending" value={stats.pending} icon={<Clock className="w-4 h-4 text-slate-400" />} />
        <StatCard label="Sent" value={stats.sent} icon={<Send className="w-4 h-4 text-blue-400" />} />
        <StatCard label="Reviewed" value={stats.reviewed} icon={<CheckCircle className="w-4 h-4 text-emerald-400" />} />
        <StatCard label="Avg Rating" value={stats.avgRating} icon={<Star className="w-4 h-4 text-amber-400" />} />
      </div>

      {/* Filters */}
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

      {/* Reviews List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredReviews.length === 0 ? (
        <EmptyState
          icon="star"
          title="No reviews yet"
          description="Request reviews from customers after completed jobs."
        />
      ) : (
        <div className="space-y-2">
          {filteredReviews.map((review) => (
            <div
              key={review.id}
              className="bg-white border border-slate-200 rounded-lg p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-slate-900 text-sm">
                      {review.customer.name}
                    </span>
                    <Badge className={cn("text-xs", STATUS_COLORS[review.status])}>
                      <span className="flex items-center gap-1">
                        {STATUS_ICONS[review.status]}
                        {review.status}
                      </span>
                    </Badge>
                    <Badge variant="outline" className="text-xs border-slate-200 text-slate-500">
                      {review.platform}
                    </Badge>
                  </div>

                  {review.rating && (
                    <div className="flex items-center gap-0.5 mb-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "w-4 h-4",
                            i < review.rating!
                              ? "text-amber-400 fill-amber-400"
                              : "text-slate-600"
                          )}
                        />
                      ))}
                    </div>
                  )}

                  {review.content && (
                    <p className="text-sm text-slate-400 line-clamp-2 mt-1">
                      &ldquo;{review.content}&rdquo;
                    </p>
                  )}

                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    {review.requestSentAt && (
                      <span>Sent {timeAgo(review.requestSentAt)}</span>
                    )}
                    {review.reviewedAt && (
                      <span className="text-emerald-400">Reviewed {timeAgo(review.reviewedAt)}</span>
                    )}
                    <span>Created {timeAgo(review.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {review.status === "pending" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-200 text-slate-600 hover:bg-slate-50"
                      onClick={() => { setSelectedReview(review); setSendDialogOpen(true); }}
                    >
                      <Send className="w-3.5 h-3.5 mr-1" />
                      Send
                    </Button>
                  )}
                  {review.status === "sent" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-emerald-700 text-emerald-400 hover:bg-emerald-900/30"
                      onClick={() => updateMutation.mutate({
                        id: review.id,
                        data: { status: "reviewed", reviewedAt: new Date().toISOString() },
                      })}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1" />
                      Mark Reviewed
                    </Button>
                  )}
                  <button
                    onClick={() => deleteMutation.mutate(review.id)}
                    className="text-slate-600 hover:text-red-400 transition-colors p-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-white border-slate-200 max-w-md">
          <DialogHeader>
            <DialogTitle>Request Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Customer *</Label>
              <Select value={selectedCustomerId} onValueChange={(v) => setSelectedCustomerId(v ?? "")}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}
                className="border-slate-200 text-slate-600 hover:bg-slate-50">
                Cancel
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={!selectedCustomerId || createMutation.isPending}
                onClick={() => createMutation.mutate({ customerId: selectedCustomerId, platform: "google" })}
              >
                {createMutation.isPending ? "Creating..." : "Create Request"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="bg-white border-slate-200 max-w-sm">
          <DialogHeader>
            <DialogTitle>Send Review Request</DialogTitle>
          </DialogHeader>
          {selectedReview && (
            <>
              <p className="text-sm text-slate-400">
                Send review request to {selectedReview.customer.name}
              </p>
              <div className="space-y-2 mt-2">
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  disabled={!selectedReview.customer.email || sendMutation.isPending}
                  onClick={() => sendMutation.mutate({ id: selectedReview.id, method: "email" })}
                >
                  <Mail className="w-4 h-4 mr-3" />
                  <div className="text-left">
                    <div className="text-sm font-medium">Send via Email</div>
                    <div className="text-xs text-slate-400">
                      {selectedReview.customer.email || "No email on file"}
                    </div>
                  </div>
                </Button>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  disabled={!selectedReview.customer.phone || sendMutation.isPending}
                  onClick={() => sendMutation.mutate({ id: selectedReview.id, method: "sms" })}
                >
                  <MessageSquare className="w-4 h-4 mr-3" />
                  <div className="text-left">
                    <div className="text-sm font-medium">Send via SMS</div>
                    <div className="text-xs text-slate-400">
                      {selectedReview.customer.phone || "No phone on file"}
                    </div>
                  </div>
                </Button>
              </div>
              {sendMutation.isPending && (
                <p className="text-xs text-slate-400 text-center mt-2">Sending...</p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
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
