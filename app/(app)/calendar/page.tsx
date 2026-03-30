"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay,
  isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, addDays, isToday,
  subWeeks, addWeeks, subDays, getHours, getMinutes, setHours,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatCurrency, formatTime,
  JOB_STATUS_LABELS, type JobStatus, fetchJson,
} from "@/lib/utils";
import { ErrorState } from "@/components/error-state";

interface CalendarJob {
  id: string;
  status: string;
  scheduledAt: string;
  total: number;
  customer: { name: string };
  services: { serviceItem: { name: string } | null; customName?: string | null }[];
  vehicle: { make: string; model: string; year: number } | null;
}

const STATUS_COLORS: Record<string, string> = {
  Scheduled: "bg-blue-500",
  InProgress: "bg-amber-500",
  Completed: "bg-emerald-500",
  Invoiced: "bg-purple-500",
  Paid: "bg-green-600",
  Cancelled: "bg-red-500",
};

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7am - 7pm

function formatHourLabel(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

export default function CalendarPage() {
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [currentDay, setCurrentDay] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // ---------- Date ranges per view ----------

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const weekStart = startOfWeek(currentWeek);
  const weekEnd = endOfWeek(currentWeek);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Determine query range based on active view
  const queryRange = useMemo(() => {
    if (view === "month") {
      return { from: monthStart, to: endOfMonth(addMonths(currentMonth, 1)) };
    }
    if (view === "week") {
      return { from: weekStart, to: weekEnd };
    }
    // day
    const dayStart = new Date(currentDay);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(currentDay);
    dayEnd.setHours(23, 59, 59, 999);
    return { from: dayStart, to: dayEnd };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, currentMonth, monthStart, weekStart, weekEnd, currentDay]);

  const { data: jobs = [], isLoading, isError, refetch } = useQuery<CalendarJob[]>({
    queryKey: ["calendar-jobs", view, queryRange.from.toISOString(), queryRange.to.toISOString()],
    queryFn: () => {
      const params = new URLSearchParams({
        from: queryRange.from.toISOString(),
        to: queryRange.to.toISOString(),
      });
      return fetchJson(`/api/jobs?${params}`);
    },
  });

  const scheduledJobs = jobs.filter((j) => j.scheduledAt);

  const jobsForDate = (date: Date) =>
    scheduledJobs.filter((j) => isSameDay(new Date(j.scheduledAt), date));

  // Month calendar grid
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Next 7 days for sidebar
  const next7Days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  // Overbooking check
  const hoursForDate = (date: Date) => {
    const dayJobs = jobsForDate(date);
    return dayJobs.length * 2;
  };
  const isOverbooked = (date: Date) => hoursForDate(date) > 8;

  const selectedDateJobs = selectedDate ? jobsForDate(selectedDate) : [];

  // ---------- Navigation helpers ----------

  const navigatePrev = () => {
    if (view === "month") setCurrentMonth(subMonths(currentMonth, 1));
    else if (view === "week") setCurrentWeek(subWeeks(currentWeek, 1));
    else setCurrentDay(subDays(currentDay, 1));
  };

  const navigateNext = () => {
    if (view === "month") setCurrentMonth(addMonths(currentMonth, 1));
    else if (view === "week") setCurrentWeek(addWeeks(currentWeek, 1));
    else setCurrentDay(addDays(currentDay, 1));
  };

  const navigateToday = () => {
    const today = new Date();
    if (view === "month") setCurrentMonth(today);
    else if (view === "week") setCurrentWeek(today);
    else setCurrentDay(today);
  };

  const headerLabel = () => {
    if (view === "month") return format(currentMonth, "MMMM yyyy");
    if (view === "week")
      return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
    return format(currentDay, "EEEE, MMMM d, yyyy");
  };

  // ---------- Helpers for time-grid views ----------

  /** Get the top offset (%) of a job within the 7am-7pm (12-hour) grid */
  const getJobTopPercent = (job: CalendarJob): number => {
    const d = new Date(job.scheduledAt);
    const h = getHours(d);
    const m = getMinutes(d);
    const totalMinutesFromStart = (h - 7) * 60 + m;
    const gridTotalMinutes = 12 * 60; // 7am to 7pm
    return Math.max(0, Math.min(100, (totalMinutesFromStart / gridTotalMinutes) * 100));
  };

  /** Filter jobs that fall within the 7am-7pm window for a given date */
  const jobsInWindow = (date: Date) =>
    jobsForDate(date).filter((j) => {
      const h = getHours(new Date(j.scheduledAt));
      return h >= 7 && h < 19;
    });

  // ---------- Render ----------

  if (isError) return <ErrorState message="Failed to load calendar data." onRetry={refetch} />;

  if (isLoading) {
    return (
      <div className="flex h-full">
        <div className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="h-8 w-48 bg-slate-100 rounded animate-pulse" />
            <div className="h-8 w-64 bg-slate-100 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={`h-${i}`} className="h-8 bg-slate-100 rounded animate-pulse" />
            ))}
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-24 bg-slate-50 rounded animate-pulse" />
            ))}
          </div>
        </div>
        <div className="hidden lg:block w-80 border-l border-slate-200 p-6">
          <div className="h-6 w-32 bg-slate-100 rounded animate-pulse mb-4" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse mb-2" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full pb-24 md:pb-0">
      {/* Main Calendar */}
      <div className="flex-1 p-6 overflow-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <h1 className="text-2xl font-bold text-slate-900">
              {headerLabel()}
            </h1>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={navigatePrev}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={navigateToday}>
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={navigateNext}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            {/* View toggle */}
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              {(["month", "week", "day"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                    view === v
                      ? "bg-white shadow-sm text-slate-900"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <Link href="/jobs/new">
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Job
            </Button>
          </Link>
        </div>

        {/* ===================== MONTH VIEW ===================== */}
        {view === "month" && (
          <>
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="text-xs font-medium text-slate-500 text-center py-2">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
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
                    className={`min-h-28 border-r border-b border-slate-200 p-1.5 cursor-pointer transition-colors ${
                      !inMonth ? "bg-slate-50/50" : "bg-white hover:bg-slate-50"
                    } ${isSelected ? "ring-2 ring-inset ring-emerald-500" : ""}`}
                    onClick={() =>
                      setSelectedDate(
                        isSameDay(day, selectedDate ?? new Date(0)) ? null : day
                      )
                    }
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-sm w-7 h-7 flex items-center justify-center rounded-full font-medium ${
                          today
                            ? "bg-emerald-500 text-white"
                            : inMonth
                            ? "text-slate-900"
                            : "text-slate-300"
                        }`}
                      >
                        {format(day, "d")}
                      </span>
                      {overbooked && (
                        <span className="text-xs text-red-500 font-medium">Overbooked</span>
                      )}
                    </div>

                    <div className="space-y-0.5">
                      {dayJobs.slice(0, 3).map((job) => (
                        <Link
                          key={job.id}
                          href={`/jobs/${job.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className={`block text-xs px-1.5 py-0.5 rounded text-white truncate ${
                            STATUS_COLORS[job.status] ?? "bg-slate-400"
                          }`}
                        >
                          {formatTime(job.scheduledAt)} {job.customer.name}
                        </Link>
                      ))}
                      {dayJobs.length > 3 && (
                        <span className="text-xs text-slate-400 pl-1.5">
                          +{dayJobs.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected date details (month view) */}
            {selectedDate && selectedDateJobs.length > 0 && (
              <div className="mt-4 bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="font-semibold text-slate-900 mb-3">
                  {format(selectedDate, "EEEE, MMMM d")}
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    {selectedDateJobs.length} job{selectedDateJobs.length !== 1 ? "s" : ""}
                  </span>
                </h3>
                <div className="space-y-2">
                  {selectedDateJobs.map((job) => (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3 hover:bg-slate-100 transition-colors"
                    >
                      <div>
                        <span className="font-medium text-sm text-slate-900">
                          {job.customer.name}
                        </span>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {job.services.map((s) => s.serviceItem?.name || s.customName || "Custom").join(", ")}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-emerald-600">
                          {formatCurrency(job.total)}
                        </div>
                        <div className="text-xs text-slate-400">
                          {formatTime(job.scheduledAt)}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Mobile: selected date jobs list */}
            <div className="mt-4 lg:hidden">
              {selectedDate && selectedDateJobs.length > 0 && (
                <MobileJobsList date={selectedDate} jobs={selectedDateJobs} />
              )}
            </div>
          </>
        )}

        {/* ===================== WEEK VIEW ===================== */}
        {view === "week" && (
          <>
            {/* Day headers */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] mb-1">
              <div />
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={`text-center py-2 cursor-pointer ${
                    isToday(day) ? "text-emerald-600" : "text-slate-500"
                  }`}
                  onClick={() => {
                    setCurrentDay(day);
                    setView("day");
                  }}
                >
                  <div className="text-xs font-medium">{format(day, "EEE")}</div>
                  <div
                    className={`text-sm font-semibold mt-0.5 w-8 h-8 mx-auto flex items-center justify-center rounded-full ${
                      isToday(day) ? "bg-emerald-500 text-white" : ""
                    }`}
                  >
                    {format(day, "d")}
                  </div>
                </div>
              ))}
            </div>

            {/* Time grid */}
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
              <div className="grid grid-cols-[60px_repeat(7,1fr)]">
                {/* Time column + day columns */}
                {HOURS.map((hour) => (
                  <div key={hour} className="contents">
                    {/* Time label */}
                    <div className="h-14 border-b border-r border-slate-100 flex items-start justify-end pr-2 pt-1">
                      <span className="text-xs text-slate-400">{formatHourLabel(hour)}</span>
                    </div>
                    {/* Day cells */}
                    {weekDays.map((day) => (
                      <div
                        key={`${hour}-${day.toISOString()}`}
                        className="h-14 border-b border-r border-slate-100 relative"
                      />
                    ))}
                  </div>
                ))}
              </div>

              {/* Overlay job blocks on top of grid */}
              <div
                className="grid grid-cols-[60px_repeat(7,1fr)] relative"
                style={{ marginTop: `-${HOURS.length * 56}px`, height: `${HOURS.length * 56}px`, pointerEvents: "none" }}
              >
                <div />
                {weekDays.map((day) => {
                  const dayJobsInWindow = jobsInWindow(day);
                  return (
                    <div key={day.toISOString()} className="relative" style={{ pointerEvents: "auto" }}>
                      {dayJobsInWindow.map((job) => {
                        const topPercent = getJobTopPercent(job);
                        return (
                          <Link
                            key={job.id}
                            href={`/jobs/${job.id}`}
                            className={`absolute left-0.5 right-0.5 rounded px-1 py-0.5 text-white text-xs truncate z-10 hover:opacity-90 transition-opacity ${
                              STATUS_COLORS[job.status] ?? "bg-slate-400"
                            }`}
                            style={{ top: `${topPercent}%`, minHeight: "24px" }}
                            title={`${formatTime(job.scheduledAt)} - ${job.customer.name}`}
                          >
                            <div className="font-medium truncate">{formatTime(job.scheduledAt)}</div>
                            <div className="truncate">{job.customer.name}</div>
                          </Link>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile: today's jobs list */}
            <div className="mt-4 lg:hidden">
              <MobileJobsList date={new Date()} jobs={jobsForDate(new Date())} />
            </div>
          </>
        )}

        {/* ===================== DAY VIEW ===================== */}
        {view === "day" && (
          <>
            {/* Time grid - single column, more room for detail */}
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
              {HOURS.map((hour) => {
                const hourDate = setHours(new Date(currentDay), hour);
                hourDate.setMinutes(0, 0, 0);
                // Jobs that start in this hour
                const hourJobs = jobsForDate(currentDay).filter((j) => {
                  const jh = getHours(new Date(j.scheduledAt));
                  return jh === hour;
                });

                return (
                  <div
                    key={hour}
                    className="grid grid-cols-[60px_1fr] border-b border-slate-100 min-h-[64px]"
                  >
                    {/* Time label */}
                    <div className="border-r border-slate-100 flex items-start justify-end pr-2 pt-2">
                      <span className="text-xs text-slate-400">{formatHourLabel(hour)}</span>
                    </div>
                    {/* Job blocks */}
                    <div className="p-1 space-y-1">
                      {hourJobs.map((job) => (
                        <Link
                          key={job.id}
                          href={`/jobs/${job.id}`}
                          className={`flex items-center justify-between rounded-lg px-3 py-2 text-white hover:opacity-90 transition-opacity ${
                            STATUS_COLORS[job.status] ?? "bg-slate-400"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">
                                {job.customer.name}
                              </span>
                              <span className="text-xs opacity-80 shrink-0">
                                {formatTime(job.scheduledAt)}
                              </span>
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

            {/* Mobile: current day's jobs list */}
            <div className="mt-4 lg:hidden">
              <MobileJobsList date={currentDay} jobs={jobsForDate(currentDay)} />
            </div>
          </>
        )}
      </div>

      {/* Sidebar: Upcoming Jobs (hidden below lg) */}
      <div className="w-72 border-l border-slate-200 p-4 bg-white overflow-y-auto hidden lg:block">
        <h3 className="font-semibold text-slate-900 mb-4">Upcoming — Next 7 Days</h3>
        <div className="space-y-4">
          {next7Days.map((day) => {
            const dayJobs = jobsForDate(day);
            return (
              <div key={day.toISOString()}>
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-xs font-medium ${
                      isToday(day) ? "text-emerald-600" : "text-slate-500"
                    }`}
                  >
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
                          <span className="text-xs text-slate-500">
                            {formatTime(job.scheduledAt)}
                          </span>
                        </div>
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            STATUS_COLORS[job.status] ?? "bg-slate-400"
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
    </div>
  );
}

/* ---------- Mobile Jobs List ---------- */

function MobileJobsList({ date, jobs }: { date: Date; jobs: CalendarJob[] }) {
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
                    STATUS_COLORS[job.status] ?? "bg-slate-400"
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
