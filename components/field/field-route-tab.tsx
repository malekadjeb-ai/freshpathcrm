"use client";

import { MapPin, Navigation2, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { FieldJob } from "./types";

interface FieldRouteTabProps {
  activeJobs: FieldJob[];
  googleMapsUrl: string;
}

export function FieldRouteTab({ activeJobs, googleMapsUrl }: FieldRouteTabProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900">Today&apos;s Route</h2>
        {googleMapsUrl && (
          <a
            href={`https://www.google.com/maps/dir/${googleMapsUrl}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-emerald-600 font-medium"
          >
            <Navigation2 className="w-4 h-4" />
            Open in Maps
          </a>
        )}
      </div>
      {activeJobs.map((job, i) => (
        <div key={job.id} className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
              <span className="text-emerald-700 font-bold text-sm">{i + 1}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-900">{job.customer.name}</div>
              <div className="text-sm text-slate-500 mt-0.5">
                {job.services.map((s) => s.serviceItem?.name || s.customName || "Custom").join(", ")}
              </div>
              {job.address && (
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(job.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-emerald-600 mt-1 flex items-center gap-1"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {job.address}{job.city ? `, ${job.city}` : ""}
                </a>
              )}
              {job.scheduledAt && (
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(job.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  {job.estimatedDuration && ` · ~${job.estimatedDuration} min`}
                </div>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className="font-semibold text-emerald-600">{formatCurrency(job.total)}</div>
            </div>
          </div>
        </div>
      ))}
      {activeJobs.length === 0 && (
        <div className="text-center py-8 text-slate-400 text-sm">No active stops today.</div>
      )}
    </div>
  );
}
