"use client";

import Link from "next/link";
import { getHours, setHours } from "date-fns";
import { formatCurrency, formatTime, JOB_STATUS_LABELS, type JobStatus } from "@/lib/utils";
import { JOB_STATUS_DOT_COLORS } from "@/lib/ui-constants";
import { MobileJobsList } from "./mobile-jobs-list";
import { HOURS, formatHourLabel, type CalendarJob } from "./calendar-types";

export function DayView({
  currentDay,
  scheduledJobs,
}: {
  currentDay: Date;
  scheduledJobs: CalendarJob[];
}) {
  const jobsForDate = (date: Date) =>
    scheduledJobs.filter((j) => {
      const jd = new Date(j.scheduledAt);
      return (
        jd.getFullYear() === date.getFullYear() &&
        jd.getMonth() === date.getMonth() &&
        jd.getDate() === date.getDate()
      );
    });

  const dayJobs = jobsForDate(currentDay);

  return (
    <>
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
        {HOURS.map((hour) => {
          const hourDate = setHours(new Date(currentDay), hour);
          hourDate.setMinutes(0, 0, 0);

          const hourJobs = dayJobs.filter(
            (j) => getHours(new Date(j.scheduledAt)) === hour
          );

          return (
            <div
              key={hour}
              className="grid grid-cols-[60px_1fr] border-b border-slate-100 min-h-[64px]"
            >
              <div className="border-r border-slate-100 flex items-start justify-end pr-2 pt-2">
                <span className="text-xs text-slate-400">{formatHourLabel(hour)}</span>
              </div>
              <div className="p-1 space-y-1">
                {hourJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-white hover:opacity-90 transition-opacity ${
                      JOB_STATUS_DOT_COLORS[job.status] ?? "bg-slate-400"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{job.customer.name}</span>
                        <span className="text-xs opacity-80 shrink-0">{formatTime(job.scheduledAt)}</span>
                      </div>
                      <p className="text-xs opacity-80 truncate mt-0.5">
                        {job.services.map((s) => s.serviceItem?.name || s.customName || "Custom").join(", ")}
                      </p>
                      {job.vehicle && (
                        <p className="text-xs opacity-70 truncate">
                          {job.vehicle.year} {job.vehicle.make} {job.vehicle.model}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <div className="text-sm font-semibold">{formatCurrency(job.total)}</div>
                      <div className="text-xs opacity-80">
                        {JOB_STATUS_LABELS[job.status as JobStatus] ?? job.status}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 lg:hidden">
        <MobileJobsList date={currentDay} jobs={dayJobs} />
      </div>
    </>
  );
}
