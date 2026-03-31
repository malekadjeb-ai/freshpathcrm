"use client";

import Link from "next/link";
import { format, addDays, isSameDay, isToday } from "date-fns";
import { Clock } from "lucide-react";
import { formatCurrency, formatTime, JOB_STATUS_LABELS, type JobStatus } from "@/lib/utils";
import { JOB_STATUS_DOT_COLORS } from "@/lib/ui-constants";
import type { CalendarJob } from "./calendar-types";

interface CalendarSidebarProps {
  scheduledJobs: CalendarJob[];
}

export function CalendarSidebar({ scheduledJobs }: CalendarSidebarProps) {
  const next7Days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  const jobsForDate = (date: Date) =>
    scheduledJobs.filter((j) => isSameDay(new Date(j.scheduledAt), date));

  return (
    <div className="w-72 border-l border-slate-200 p-4 bg-white overflow-y-auto hidden lg:block">
      <h3 className="font-semibold text-slate-900 mb-4">Upcoming — Next 7 Days</h3>
      <div className="space-y-4">
        {next7Days.map((day) => {
          const dayJobs = jobsForDate(day);
          return (
            <div key={day.toISOString()}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-xs font-medium ${isToday(day) ? "text-emerald-600" : "text-slate-500"}`}>
                  {isToday(day) ? "Today" : format(day, "EEE, MMM d")}
                </span>
                {dayJobs.length > 0 && (
                  <span className="text-xs text-slate-400">
                    {dayJobs.length} job{dayJobs.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {dayJobs.length === 0 ? (
                <p className="text-xs text-slate-300 pl-1">No jobs</p>
              ) : (
                <div className="space-y-1.5">
                  {dayJobs.map((job) => (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="block bg-slate-50 hover:bg-slate-100 rounded-lg px-3 py-2 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-900 truncate">
                          {job.customer.name}
                        </span>
                        <span className="text-xs font-semibold text-emerald-600 ml-2 shrink-0">
                          {formatCurrency(job.total)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-500">{formatTime(job.scheduledAt)}</span>
                      </div>
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          JOB_STATUS_DOT_COLORS[job.status] ?? "bg-slate-400"
                        } inline-block mr-1`}
                      />
                      <span className="text-xs text-slate-400">
                        {JOB_STATUS_LABELS[job.status as JobStatus] ?? job.status}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
