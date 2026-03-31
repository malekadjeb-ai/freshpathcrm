"use client";

import Link from "next/link";
import {
  format, isSameDay, isSameMonth, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, eachDayOfInterval, isToday,
} from "date-fns";
import { formatCurrency, formatTime } from "@/lib/utils";
import { JOB_STATUS_DOT_COLORS } from "@/lib/ui-constants";
import { MobileJobsList } from "./mobile-jobs-list";
import type { CalendarJob } from "./calendar-types";

export function MonthView({
  currentMonth,
  scheduledJobs,
  selectedDate,
  setSelectedDate,
}: {
  currentMonth: Date;
  scheduledJobs: CalendarJob[];
  selectedDate: Date | null;
  setSelectedDate: (d: Date | null) => void;
}) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const jobsForDate = (date: Date) =>
    scheduledJobs.filter((j) => isSameDay(new Date(j.scheduledAt), date));

  const isOverbooked = (date: Date) => jobsForDate(date).length * 2 > 8;
  const selectedDateJobs = selectedDate ? jobsForDate(selectedDate) : [];

  return (
    <>
      <div className="grid grid-cols-7 mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-xs font-medium text-slate-500 text-center py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 border-l border-t border-slate-200 rounded-lg overflow-hidden">
        {calendarDays.map((day) => {
          const dayJobs = jobsForDate(day);
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const overbooked = inMonth && isOverbooked(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          return (
            <div
              key={day.toISOString()}
              className={`min-h-28 border-r border-b border-slate-200 p-1.5 cursor-pointer transition-colors ${!inMonth ? "bg-slate-50/50" : "bg-white hover:bg-slate-50"} ${isSelected ? "ring-2 ring-inset ring-emerald-500" : ""}`}
              onClick={() => setSelectedDate(isSameDay(day, selectedDate ?? new Date(0)) ? null : day)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm w-7 h-7 flex items-center justify-center rounded-full font-medium ${today ? "bg-emerald-500 text-white" : inMonth ? "text-slate-900" : "text-slate-300"}`}>{format(day, "d")}</span>
                {overbooked && <span className="text-xs text-red-500 font-medium">Overbooked</span>}
              </div>
              <div className="space-y-0.5">
                {dayJobs.slice(0, 3).map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}`} onClick={(e) => e.stopPropagation()} className={`block text-xs px-1.5 py-0.5 rounded text-white truncate ${JOB_STATUS_DOT_COLORS[job.status] ?? "bg-slate-400"}`}>
                    {formatTime(job.scheduledAt)} {job.customer.name}
                  </Link>
                ))}
                {dayJobs.length > 3 && <span className="text-xs text-slate-400 pl-1.5">+{dayJobs.length - 3} more</span>}
              </div>
            </div>
          );
        })}
      </div>

      {selectedDate && selectedDateJobs.length > 0 && (
        <div className="mt-4 bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="font-semibold text-slate-900 mb-3">
            {format(selectedDate, "EEEE, MMMM d")}
            <span className="ml-2 text-sm font-normal text-slate-500">{selectedDateJobs.length} job{selectedDateJobs.length !== 1 ? "s" : ""}</span>
          </h3>
          <div className="space-y-2">
            {selectedDateJobs.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3 hover:bg-slate-100 transition-colors">
                <div>
                  <span className="font-medium text-sm text-slate-900">{job.customer.name}</span>
                  <p className="text-xs text-slate-500 mt-0.5">{job.services.map((s) => s.serviceItem?.name || s.customName || "Custom").join(", ")}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-emerald-600">{formatCurrency(job.total)}</div>
                  <div className="text-xs text-slate-400">{formatTime(job.scheduledAt)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 lg:hidden">
        {selectedDate && selectedDateJobs.length > 0 && <MobileJobsList date={selectedDate} jobs={selectedDateJobs} />}
      </div>
    </>
  );
}
