"use client";

import { Clock } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PortalData } from "../hooks/use-portal";

interface ServiceHistoryProps {
  completedJobs: PortalData["completedJobs"];
}

export function ServiceHistory({ completedJobs }: ServiceHistoryProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-emerald-500" />
        Recent Services
      </h2>
      {completedJobs.length === 0 ? (
        <p className="text-sm text-slate-500">No completed services yet.</p>
      ) : (
        <div className="space-y-2">
          {completedJobs.slice(0, 5).map((job) => (
            <div key={job.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div>
                <div className="text-sm font-medium text-slate-900">
                  {job.services.map((s) => s.serviceItem?.name || s.customName || "Custom").join(", ")}
                </div>
                <div className="text-xs text-slate-500">
                  {job.completedAt ? formatDate(job.completedAt) : "Completed"}
                </div>
              </div>
              <div className="text-sm font-semibold text-slate-900">{formatCurrency(job.total)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
