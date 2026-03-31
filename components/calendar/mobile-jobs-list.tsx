"use client";

import Link from "next/link";
import { format } from "date-fns";
import { formatCurrency, formatTime } from "@/lib/utils";
import { JOB_STATUS_DOT_COLORS } from "@/lib/ui-constants";
import type { CalendarJob } from "./calendar-types";

export function MobileJobsList({ date, jobs }: { date: Date; jobs: CalendarJob[] }) {
  if (jobs.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <h3 className="font-semibold text-slate-900 mb-3">
        {format(date, "EEEE, MMMM d")}
        <span className="ml-2 text-sm font-normal text-slate-500">
          {jobs.length} job{jobs.length !== 1 ? "s" : ""}
        </span>
      </h3>
      <div className="space-y-2">
        {jobs.map((job) => (
          <Link
            key={job.id}
            href={`/jobs/${job.id}`}
            className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3 hover:bg-slate-100 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    JOB_STATUS_DOT_COLORS[job.status] ?? "bg-slate-400"
                  }`}
                />
                <span className="font-medium text-sm text-slate-900 truncate">
                  {job.customer.name}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 ml-4">
                {job.services.map((s) => s.serviceItem?.name || s.customName || "Custom").join(", ")}
              </p>
            </div>
            <div className="text-right ml-3 shrink-0">
              <div className="text-sm font-semibold text-emerald-600">
                {formatCurrency(job.total)}
              </div>
              <div className="text-xs text-slate-400">{formatTime(job.scheduledAt)}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
