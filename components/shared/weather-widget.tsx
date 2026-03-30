"use client";

import { useQuery } from "@tanstack/react-query";
import { Sun, AlertTriangle } from "lucide-react";

interface DayForecast {
  date: string;
  tempMax: number;
  tempMin: number;
  precipitationProbability: number;
  weatherCode: number;
  weatherLabel: string;
  weatherIcon: string;
  riskLevel: "clear" | "caution" | "rain";
}

export function WeatherWidget() {
  const { data, isLoading } = useQuery<{ forecast: DayForecast[] }>({
    queryKey: ["weather"],
    queryFn: () => fetch("/api/weather").then((r) => r.json()),
    staleTime: 3 * 60 * 60 * 1000,
    refetchInterval: 3 * 60 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-200 rounded w-24" />
          <div className="flex gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 w-16 bg-slate-100 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data?.forecast) return null;

  const today = data.forecast[0];
  const upcoming = data.forecast.slice(1, 4);
  const riskyDays = data.forecast.filter((d) => d.riskLevel === "rain");

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900">Weather Outlook</h3>
        {riskyDays.length > 0 ? (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {riskyDays.length} risky day{riskyDays.length > 1 ? "s" : ""}
          </span>
        ) : (
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
            <Sun className="w-3 h-3" />
            All clear
          </span>
        )}
      </div>

      {/* Today */}
      {today && (
        <div className="flex items-center gap-3 mb-3 p-2.5 bg-slate-50 rounded-lg">
          <span className="text-2xl">{today.weatherIcon}</span>
          <div className="flex-1">
            <div className="text-sm font-medium text-slate-900">Today</div>
            <div className="text-xs text-slate-500">{today.weatherLabel}</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-slate-900">
              {today.tempMax}°F
            </div>
            <div className="text-xs text-slate-500">
              {today.precipitationProbability}% rain
            </div>
          </div>
        </div>
      )}

      {/* 3-day outlook */}
      <div className="grid grid-cols-3 gap-2">
        {upcoming.map((day) => {
          const dayName = new Date(day.date + "T12:00:00").toLocaleDateString("en-US", {
            weekday: "short",
          });
          return (
            <div
              key={day.date}
              className={`text-center p-2 rounded-lg border ${
                day.riskLevel === "rain"
                  ? "bg-red-50 border-red-200"
                  : day.riskLevel === "caution"
                  ? "bg-amber-50 border-amber-200"
                  : "bg-emerald-50 border-emerald-200"
              }`}
            >
              <div className="text-xs font-medium text-slate-600">{dayName}</div>
              <div className="text-lg my-0.5">{day.weatherIcon}</div>
              <div className="text-xs font-semibold text-slate-900">
                {day.tempMax}°
              </div>
              <div className="text-[10px] text-slate-500">
                {day.precipitationProbability}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WeatherCalendarOverlay({ date }: { date: string }) {
  const { data } = useQuery<{ forecast: DayForecast[] }>({
    queryKey: ["weather"],
    queryFn: () => fetch("/api/weather").then((r) => r.json()),
    staleTime: 3 * 60 * 60 * 1000,
  });

  if (!data?.forecast) return null;

  const dayForecast = data.forecast.find((d) => d.date === date);
  if (!dayForecast) return null;

  return (
    <div className="flex items-center gap-1 text-[10px]">
      <span>{dayForecast.weatherIcon}</span>
      <span className="text-slate-500">{dayForecast.tempMax}°</span>
    </div>
  );
}
