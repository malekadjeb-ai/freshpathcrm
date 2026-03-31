"use client";

import Link from "next/link";
import { format, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval, isToday, getHours, getMinutes } from "date-fns";
import { formatTime } from "@/lib/utils";
import { JOB_STATUS_DOT_COLORS } from "@/lib/ui-constants";
import { MobileJobsList } from "./mobile-jobs-list";
import { HOURS, formatHourLabel, type CalendarJob } from "./calendar-types";

export function WeekView({
  currentWeek,
  scheduledJobs,
  onDayClick,
}: {
  currentWeek: Date;
  scheduledJobs: CalendarJob[];
  onDayClick: (day: Date) => void;
}) {
  const weekStart = startOfWeek(currentWeek);
  const weekEnd = endOfWeek(currentWeek);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const jobsForDate = (date: Date) =>
    scheduledJobs.filter((j) => isSameDay(new Date(j.scheduledAt), date));

  const getJobTopPercent = (job: CalendarJob): number => {
    const d = new Date(job.scheduledAt);
    const totalMinutesFromStart = (getHours(d) - 7) * 60 + getMinutes(d);
    return Math.max(0, Math.min(100, (totalMinutesFromStart / (12 * 60)) * 100));
  };

  const jobsInWindow = (date: Date) =>
    jobsForDate(date).filter((j) => { const h = getHours(new Date(j.scheduledAt)); return h >= 7 && h < 19; });

  return (
    <>
      <div className="grid grid-cols-[60px_repeat(7,1fr)] mb-1">
        <div />
        {weekDays.map((day) => (
          <div key={day.toISOString()} className={`text-center py-2 cursor-pointer ${isToday(day) ? "text-emerald-600" : "text-slate-500"}`} onClick={() => onDayClick(day)}>
            <div className="text-xs font-medium">{format(day, "EEE")}</div>
            <div className={`text-sm font-semibold mt-0.5 w-8 h-8 mx-auto flex items-center justify-center rounded-full ${isToday(day) ? "bg-emerald-500 text-white" : ""}`}>{format(day, "d")}</div>
          </div>
        ))}
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {HOURS.map((hour) => (
            <div key={hour} className="contents">
              <div className="h-14 border-b border-r border-slate-100 flex items-start justify-end pr-2 pt-1">
                <span className="text-xs text-slate-400">{formatHourLabel(hour)}</span>
              </div>
              {weekDays.map((day) => (
                <div key={`${hour}-${day.toISOString()}`} className="h-14 border-b border-r border-slate-100 relative" />
              ))}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[60px_repeat(7,1fr)] relative" style={{ marginTop: `-${HOURS.length * 56}px`, height: `${HOURS.length * 56}px`, pointerEvents: "none" }}>
          <div />
          {weekDays.map((day) => (
            <div key={day.toISOString()} className="relative" style={{ pointerEvents: "auto" }}>
              {jobsInWindow(day).map((job) => (
                <Link key={job.id} href={`/jobs/${job.id}`}
                  className={`absolute left-0.5 right-0.5 rounded px-1 py-0.5 text-white text-xs truncate z-10 hover:opacity-90 transition-opacity ${JOB_STATUS_DOT_COLORS[job.status] ?? "bg-slate-400"}`}
                  style={{ top: `${getJobTopPercent(job)}%`, minHeight: "24px" }}
                  title={`${formatTime(job.scheduledAt)} - ${job.customer.name}`}
                >
                  <div className="font-medium truncate">{formatTime(job.scheduledAt)}</div>
                  <div className="truncate">{job.customer.name}</div>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 lg:hidden">
        <MobileJobsList date={new Date()} jobs={jobsForDate(new Date())} />
      </div>
    </>
  );
}
