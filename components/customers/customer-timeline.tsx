"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson, cn, timeAgo } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import {
  Briefcase,
  FileText,
  Phone,
  MessageSquare,
  Mail,
  StickyNote,
  Star,
  Users,
  CheckCircle2,
  Clock,
  Send,
  XCircle,
  DollarSign,
  CalendarCheck,
  PlayCircle,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";

interface TimelineEntry {
  id: string;
  type: "activity" | "job" | "invoice" | "estimate" | "review";
  subtype: string;
  title: string;
  description: string | null;
  timestamp: string;
  linkedType?: string;
  linkedId?: string;
  metadata?: Record<string, unknown>;
}

interface CustomerTimelineProps {
  customerId: string;
}

function getIcon(entry: TimelineEntry) {
  const { type, subtype } = entry;

  if (type === "activity") {
    switch (subtype) {
      case "CALL":
        return Phone;
      case "TEXT":
        return MessageSquare;
      case "EMAIL":
        return Mail;
      case "IN_PERSON":
        return Users;
      case "NOTE":
        return StickyNote;
      default:
        return StickyNote;
    }
  }

  if (type === "job") {
    switch (subtype) {
      case "completed":
        return CheckCircle2;
      case "scheduled":
        return CalendarCheck;
      case "started":
        return PlayCircle;
      default:
        return Briefcase;
    }
  }

  if (type === "invoice") {
    switch (subtype) {
      case "paid":
        return DollarSign;
      case "sent":
        return Send;
      default:
        return FileText;
    }
  }

  if (type === "estimate") {
    switch (subtype) {
      case "accepted":
        return CheckCircle2;
      case "declined":
        return XCircle;
      case "sent":
        return Send;
      default:
        return FileText;
    }
  }

  if (type === "review") {
    return Star;
  }

  return Clock;
}

function getIconColor(entry: TimelineEntry): string {
  const { type, subtype } = entry;

  // Positive outcomes: completed, paid, accepted
  if (
    subtype === "completed" ||
    subtype === "paid" ||
    subtype === "accepted"
  ) {
    return "bg-emerald-100 text-emerald-600 border-emerald-200";
  }

  // Negative outcomes: declined, overdue
  if (subtype === "declined" || subtype === "overdue") {
    return "bg-red-100 text-red-600 border-red-200";
  }

  // Sent, scheduled
  if (subtype === "sent" || subtype === "scheduled") {
    return "bg-blue-100 text-blue-600 border-blue-200";
  }

  // Started, in progress
  if (subtype === "started") {
    return "bg-amber-100 text-amber-600 border-amber-200";
  }

  // Reviews
  if (type === "review") {
    return "bg-yellow-100 text-yellow-600 border-yellow-200";
  }

  // Activities
  if (type === "activity") {
    return "bg-slate-100 text-slate-600 border-slate-200";
  }

  // Default: info blue
  return "bg-blue-100 text-blue-600 border-blue-200";
}

function getViewLink(entry: TimelineEntry): string | null {
  if (!entry.linkedType || !entry.linkedId) return null;

  switch (entry.linkedType) {
    case "job":
      return `/jobs/${entry.linkedId}`;
    case "invoice":
      return `/invoices/${entry.linkedId}`;
    case "estimate":
      return `/estimates/${entry.linkedId}`;
    case "review":
      return `/reviews/${entry.linkedId}`;
    case "activity":
      return null; // Activities don't have a dedicated page
    default:
      return null;
  }
}

function groupByDate(entries: TimelineEntry[]): Map<string, TimelineEntry[]> {
  const groups = new Map<string, TimelineEntry[]>();

  for (const entry of entries) {
    const dateKey = format(parseISO(entry.timestamp), "yyyy-MM-dd");
    const existing = groups.get(dateKey);
    if (existing) {
      existing.push(entry);
    } else {
      groups.set(dateKey, [entry]);
    }
  }

  return groups;
}

function TimelineSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {[1, 2, 3].map((group) => (
        <div key={group}>
          <div className="h-4 w-28 bg-slate-200 rounded mb-3" />
          <div className="space-y-4 ml-4 border-l-2 border-slate-100 pl-6">
            {[1, 2].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-slate-200 rounded-full shrink-0 -ml-[calc(1.5rem+1px+1rem)]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-slate-200 rounded" />
                  <div className="h-3 w-64 bg-slate-100 rounded" />
                  <div className="h-3 w-20 bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function CustomerTimeline({ customerId }: CustomerTimelineProps) {
  const { data: entries, isLoading } = useQuery({
    queryKey: ["customer-timeline", customerId],
    queryFn: () =>
      fetchJson<TimelineEntry[]>(
        `/api/customers/${customerId}/timeline`
      ),
  });

  if (isLoading) {
    return <TimelineSkeleton />;
  }

  if (!entries || entries.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="No timeline events yet"
        description="Activities, jobs, invoices, and estimates will appear here as they are created."
      />
    );
  }

  const grouped = groupByDate(entries);

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([dateKey, dayEntries]) => (
        <div key={dateKey}>
          {/* Date header */}
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            {format(parseISO(dateKey), "EEEE, MMM d, yyyy")}
          </h3>

          {/* Timeline entries for this date */}
          <div className="relative ml-4 border-l-2 border-slate-200 pl-6 space-y-4">
            {dayEntries.map((entry) => {
              const Icon = getIcon(entry);
              const colorClass = getIconColor(entry);
              const link = getViewLink(entry);

              return (
                <div key={entry.id} className="relative flex items-start gap-3">
                  {/* Icon circle positioned on the timeline line */}
                  <div
                    className={cn(
                      "absolute -left-[calc(1.5rem+1px+0.875rem)] flex items-center justify-center w-7 h-7 rounded-full border shrink-0",
                      colorClass
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>

                  {/* Content card */}
                  <div className="flex-1 min-w-0 bg-white border border-slate-100 rounded-lg px-3 py-2 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {entry.title}
                      </p>
                      {link && (
                        <Link
                          href={link}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 shrink-0"
                        >
                          View
                        </Link>
                      )}
                    </div>
                    {entry.description && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                        {entry.description}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-1">
                      {timeAgo(entry.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
