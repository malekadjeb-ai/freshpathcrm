"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MiniCalendarProps {
  month: Date;
  onMonthChange: (d: Date) => void;
  selectedDate: string;
  onSelectDate: (d: string) => void;
  workingDays: number[];
}

export function MiniCalendar({
  month,
  onMonthChange,
  selectedDate,
  onSelectDate,
  workingDays,
}: MiniCalendarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = month.getFullYear();
  const mo = month.getMonth();
  const firstDay = new Date(year, mo, 1).getDay();
  const daysInMonth = new Date(year, mo + 1, 0).getDate();
  const days: (number | null)[] = [];

  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const prevMonth = () => onMonthChange(new Date(year, mo - 1, 1));
  const nextMonth = () => onMonthChange(new Date(year, mo + 1, 1));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Button variant="ghost" size="sm" onClick={prevMonth}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-semibold text-slate-900">
          {month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </span>
        <Button variant="ghost" size="sm" onClick={nextMonth}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="text-xs font-semibold text-slate-400 py-1">
            {d}
          </div>
        ))}
        {days.map((day, i) => {
          if (day === null) return <div key={i} />;
          const date = new Date(year, mo, day);
          const dateStr = `${year}-${(mo + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
          const isPast = date < today;
          const isWorkingDay = workingDays.includes(date.getDay());
          const isSelected = dateStr === selectedDate;
          const isToday = date.getTime() === today.getTime();
          const isDisabled = isPast || !isWorkingDay;

          return (
            <button
              key={i}
              disabled={isDisabled}
              onClick={() => onSelectDate(dateStr)}
              className={cn(
                "py-2 rounded-xl text-sm font-medium transition-all relative",
                isSelected
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                  : isDisabled
                  ? "text-slate-300 cursor-not-allowed"
                  : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-700",
                isToday && !isSelected && "ring-1 ring-emerald-500"
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
