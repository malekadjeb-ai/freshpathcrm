"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Navigation,
  Clock,
  ChevronLeft,
  ChevronRight,
  Route,
  AlertTriangle,
} from "lucide-react";
import { formatTime, fetchJson } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";
import { format, addDays, subDays } from "date-fns";

interface RouteStop {
  id: string;
  customerName: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  scheduledAt: string;
  services: string[];
  estimatedDuration: number;
  status: string;
  stopNumber: number;
  travelTimeMinutes: number;
  distanceMiles: number;
}

interface RouteData {
  date: string;
  route: {
    stops: RouteStop[];
    totalDistanceMiles: number;
    totalTravelMinutes: number;
    totalDurationMinutes: number;
  };
  unlocatedJobs: Array<{
    id: string;
    customerName: string;
    address: string;
    services: string[];
  }>;
  totalJobs: number;
}

export default function RoutesPage() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const { data, isLoading, isError, refetch } = useQuery<RouteData>({
    queryKey: ["route", selectedDate],
    queryFn: () =>
      fetchJson(`/api/routes/optimize?date=${selectedDate}`),
  });

  const navigate = (dir: "prev" | "next") => {
    const current = new Date(selectedDate + "T12:00:00");
    const newDate = dir === "next" ? addDays(current, 1) : subDays(current, 1);
    setSelectedDate(format(newDate, "yyyy-MM-dd"));
  };

  const openGoogleMaps = (address: string) => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`,
      "_blank"
    );
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "Completed": return "bg-emerald-500";
      case "InProgress": return "bg-amber-500";
      default: return "bg-blue-500";
    }
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Route Optimizer</h1>
          <p className="text-sm text-slate-500 mt-1">
            AI-optimized daily routes for maximum efficiency
          </p>
        </div>
      </div>

      {isError && <ErrorState message="Failed to load routes." onRetry={refetch} />}

      {/* Date Selector */}
      <div className="flex items-center gap-3 mb-6 bg-white rounded-xl border border-slate-200 p-3 w-fit">
        <button onClick={() => navigate("prev")} className="p-1 rounded hover:bg-slate-100">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="text-sm font-medium border-0 focus:ring-0 text-center"
        />
        <button onClick={() => navigate("next")} className="p-1 rounded hover:bg-slate-100">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Stats Summary */}
      {data?.route && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <div className="text-2xl font-bold text-slate-900">{data.route.stops.length}</div>
            <div className="text-xs text-slate-500">Stops</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <div className="text-2xl font-bold text-slate-900">{data.route.totalDistanceMiles} mi</div>
            <div className="text-xs text-slate-500">Total Distance</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <div className="text-2xl font-bold text-slate-900">{data.route.totalTravelMinutes} min</div>
            <div className="text-xs text-slate-500">Drive Time</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <div className="text-2xl font-bold text-slate-900">
              {Math.round(data.route.totalDurationMinutes / 60 * 10) / 10} hrs
            </div>
            <div className="text-xs text-slate-500">Total Duration</div>
          </div>
        </div>
      )}

      {/* Route List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
              <div className="h-5 bg-slate-200 rounded w-48 mb-2" />
              <div className="h-4 bg-slate-100 rounded w-64" />
            </div>
          ))}
        </div>
      ) : !data || data.route.stops.length === 0 ? (
        <EmptyState
          icon={Route}
          title="No jobs scheduled"
          description="No jobs with geocoded addresses found for this date."
        />
      ) : (
        <div className="space-y-0">
          {data.route.stops.map((stop, i) => (
            <div key={stop.id}>
              {/* Travel time indicator */}
              {i > 0 && (
                <div className="flex items-center gap-2 py-2 pl-6">
                  <div className="w-0.5 h-6 bg-slate-300 ml-3" />
                  <div className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {stop.travelTimeMinutes} min · {stop.distanceMiles} mi
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-4">
                {/* Stop number */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${statusColor(stop.status)}`}
                >
                  {stop.stopNumber}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900">{stop.customerName}</span>
                    {stop.scheduledAt && (
                      <span className="text-xs text-slate-500">
                        {formatTime(stop.scheduledAt)}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-500 flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    {stop.address}{stop.city ? `, ${stop.city}` : ""}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {stop.services.join(", ")} · ~{stop.estimatedDuration} min
                  </div>
                </div>

                {/* Navigate button */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openGoogleMaps(stop.address + (stop.city ? `, ${stop.city}` : ""))}
                >
                  <Navigation className="w-3.5 h-3.5 mr-1" />
                  Navigate
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Unlocated jobs warning */}
      {data && data.unlocatedJobs.length > 0 && (
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-700 font-medium text-sm mb-2">
            <AlertTriangle className="w-4 h-4" />
            {data.unlocatedJobs.length} job{data.unlocatedJobs.length > 1 ? "s" : ""} without GPS coordinates
          </div>
          <div className="space-y-1">
            {data.unlocatedJobs.map((job) => (
              <div key={job.id} className="text-sm text-amber-600">
                {job.customerName} — {job.address || "No address"}
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-500 mt-2">
            Add addresses to customer profiles to include them in route optimization.
          </p>
        </div>
      )}
    </div>
  );
}
