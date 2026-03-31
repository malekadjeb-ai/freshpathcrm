"use client";

import {
  Star,
  Send,
  ExternalLink,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { cn, timeAgo } from "@/lib/utils";

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

interface ReviewListProps {
  reviews: Review[];
  isLoading: boolean;
  onSend: (review: Review) => void;
  onMarkReviewed: (review: Review) => void;
  onDelete: (id: string) => void;
}

export function ReviewList({ reviews, isLoading, onSend, onMarkReviewed, onDelete }: ReviewListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <EmptyState
        icon="star"
        title="No reviews yet"
        description="Request reviews from customers after completed jobs."
      />
    );
  }

  return (
    <div className="space-y-2">
      {reviews.map((review) => (
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
                  onClick={() => onSend(review)}
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
                  onClick={() => onMarkReviewed(review)}
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                  Mark Reviewed
                </Button>
              )}
              <button
                onClick={() => onDelete(review.id)}
                className="text-slate-600 hover:text-red-400 transition-colors p-1.5"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
