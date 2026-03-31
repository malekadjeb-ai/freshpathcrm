"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Copy,
  Check,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, fetchJson } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";

interface SocialPost {
  id: string;
  jobId: string | null;
  type: string;
  platform: string;
  caption: string;
  status: string;
  scheduledAt: string | null;
  postedAt: string | null;
  createdAt: string;
}

export default function ContentPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: posts = [], isLoading, isError, refetch } = useQuery<SocialPost[]>({
    queryKey: ["social-posts", statusFilter, platformFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (platformFilter) params.set("platform", platformFilter);
      return fetchJson(`/api/social-posts?${params}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; status?: string; caption?: string }) =>
      fetch("/api/social-posts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-posts"] });
      toast.success("Post updated");
    },
  });

  const copyCaption = (id: string, caption: string) => {
    navigator.clipboard.writeText(caption);
    setCopiedId(id);
    toast.success("Caption copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const platformIcon = (platform: string) => {
    switch (platform) {
      case "instagram": return "📸";
      case "tiktok": return "🎵";
      case "google": return "🔍";
      case "facebook": return "📘";
      default: return "📱";
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-slate-100 text-slate-600",
      scheduled: "bg-blue-100 text-blue-700",
      posted: "bg-emerald-100 text-emerald-700",
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || colors.draft}`}>
        {status}
      </span>
    );
  };

  const draftCount = posts.filter((p) => p.status === "draft").length;
  const postedCount = posts.filter((p) => p.status === "posted").length;

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Content Calendar</h1>
          <p className="text-sm text-slate-500 mt-1">
            {postedCount} posted · {draftCount} drafts ready
          </p>
        </div>
      </div>

      {isError && <ErrorState message="Failed to load content." onRetry={refetch} />}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="posted">Posted</option>
        </select>
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white"
        >
          <option value="">All Platforms</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="google">Google</option>
        </select>
      </div>

      {/* Posts Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-20 mb-3" />
              <div className="space-y-2">
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="h-3 bg-slate-100 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No content yet"
          description="Complete jobs with before/after photos, then generate social posts from the job detail page."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{platformIcon(post.platform)}</span>
                  <span className="text-xs font-medium text-slate-600 capitalize">{post.platform}</span>
                </div>
                {statusBadge(post.status)}
              </div>

              <p className="text-sm text-slate-700 line-clamp-4 flex-1 mb-3">{post.caption}</p>

              <div className="text-xs text-slate-400 mb-3">
                {formatDate(post.createdAt)}
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => copyCaption(post.id, post.caption)}
                >
                  {copiedId === post.id ? (
                    <Check className="w-3.5 h-3.5 mr-1" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 mr-1" />
                  )}
                  Copy
                </Button>
                {post.status === "draft" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateMutation.mutate({ id: post.id, status: "posted" })}
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Mark Posted
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
