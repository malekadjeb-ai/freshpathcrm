"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  format, startOfMonth, endOfMonth, addMonths, subMonths,
  startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, subDays,
} from "date-fns";
import { fetchJson } from "@/lib/utils";
import type { CalendarJob } from "@/components/calendar/calendar-types";

export type ViewMode = "month" | "week" | "day";

export interface UseCalendarReturn {
  view: ViewMode;
  setView: (v: ViewMode) => void;
  currentMonth: Date;
  currentWeek: Date;
  currentDay: Date;
  selectedDate: Date | null;
  setSelectedDate: (d: Date | null) => void;
  jobs: CalendarJob[];
  scheduledJobs: CalendarJob[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  headerLabel: string;
  navigatePrev: () => void;
  navigateNext: () => void;
  navigateToday: () => void;
  switchToDayView: (day: Date) => void;
}

export function useCalendar(): UseCalendarReturn {
  const [view, setView] = useState<ViewMode>("month");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [currentDay, setCurrentDay] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const weekStart = startOfWeek(currentWeek);
  const weekEnd = endOfWeek(currentWeek);

  const queryRange = useMemo(() => {
    if (view === "month") {
      return { from: monthStart, to: endOfMonth(addMonths(currentMonth, 1)) };
    }
    if (view === "week") {
      return { from: weekStart, to: weekEnd };
    }
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

  const switchToDayView = (day: Date) => {
    setCurrentDay(day);
    setView("day");
  };

  const headerLabel =
    view === "month"
      ? format(currentMonth, "MMMM yyyy")
      : view === "week"
      ? `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`
      : format(currentDay, "EEEE, MMMM d, yyyy");

  return {
    view,
    setView,
    currentMonth,
    currentWeek,
    currentDay,
    selectedDate,
    setSelectedDate,
    jobs,
    scheduledJobs,
    isLoading,
    isError,
    refetch,
    headerLabel,
    navigatePrev,
    navigateNext,
    navigateToday,
    switchToDayView,
  };
}
