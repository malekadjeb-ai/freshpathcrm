"use client";

import { Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MiniCalendar } from "./mini-calendar";
import { formatTime } from "./types";

interface ScheduleStepProps {
  calendarMonth: Date;
  onMonthChange: (d: Date) => void;
  selectedDate: string;
  onSelectDate: (d: string) => void;
  selectedTime: string;
  onSelectTime: (t: string) => void;
  availableSlots: string[];
  slotsLoading: boolean;
  slotMessage: string;
  workingDays: number[];
}

export function ScheduleStep({
  calendarMonth,
  onMonthChange,
  selectedDate,
  onSelectDate,
  selectedTime,
  onSelectTime,
  availableSlots,
  slotsLoading,
  slotMessage,
  workingDays,
}: ScheduleStepProps) {
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900 mb-1">Pick a Date & Time</h2>
      <p className="text-sm text-slate-500 mb-5">Choose when you&apos;d like your service</p>

      <MiniCalendar
        month={calendarMonth}
        onMonthChange={onMonthChange}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        workingDays={workingDays}
      />

      {selectedDate && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-500" />
            Available Times for{" "}
            {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </h3>
          {slotsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : slotMessage ? (
            <p className="text-sm text-slate-500 text-center py-4">{slotMessage}</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {availableSlots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => onSelectTime(slot)}
                  className={cn(
                    "py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-all",
                    selectedTime === slot
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
                      : "border-slate-100 text-slate-700 hover:border-slate-200"
                  )}
                >
                  {formatTime(slot)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
