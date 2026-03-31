"use client";

import { Button } from "@/components/ui/button";
import { Calendar, Clock, ExternalLink } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PortalData } from "../hooks/use-portal";

interface UpcomingAppointmentsProps {
  upcomingJobs: PortalData["upcomingJobs"];
  completedJobs: PortalData["completedJobs"];
}

export function UpcomingAppointments({ upcomingJobs, completedJobs }: UpcomingAppointmentsProps) {
  return (
    <>
      <h2 className="text-base font-bold text-slate-900">My Appointments</h2>
      {upcomingJobs.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Upcoming</h3>
          <div className="space-y-2">
            {upcomingJobs.map((job) => (
              <div key={job.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-slate-900">
                      {job.services.map((s) => s.serviceItem?.name || s.customName || "Custom").join(", ")}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                      <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(job.scheduledAt)}</div>
                      {job.address && <div className="flex items-center gap-1"><ExternalLink className="w-3 h-3" /> {job.address}</div>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-emerald-600">{formatCurrency(job.total)}</div>
                    <span className="inline-flex px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-medium mt-1">
                      {job.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {completedJobs.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 mt-4">Completed</h3>
          <div className="space-y-2">
            {completedJobs.map((job) => (
              <div key={job.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-slate-900 text-sm">
                      {job.services.map((s) => s.serviceItem?.name || s.customName || "Custom").join(", ")}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {job.completedAt ? formatDate(job.completedAt) : "Done"}
                    </div>
                  </div>
                  <div className="font-semibold text-sm">{formatCurrency(job.total)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {upcomingJobs.length === 0 && completedJobs.length === 0 && (
        <div className="text-center py-8 text-slate-500 text-sm">No appointments yet.</div>
      )}
      <Button className="w-full mt-4" onClick={() => window.open("/book", "_blank")}>
        Book New Service
      </Button>
    </>
  );
}

interface UpcomingAppointmentsSummaryProps {
  upcomingJobs: PortalData["upcomingJobs"];
  onBookNew: () => void;
}

export function UpcomingAppointmentsSummary({ upcomingJobs, onBookNew }: UpcomingAppointmentsSummaryProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-emerald-500" />
        Upcoming Appointments
      </h2>
      {upcomingJobs.length === 0 ? (
        <p className="text-sm text-slate-500 mb-3">No upcoming appointments.</p>
      ) : (
        <div className="space-y-2 mb-3">
          {upcomingJobs.map((job) => (
            <div key={job.id} className="p-3 bg-slate-50 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm text-slate-900">
                  {job.services.map((s) => s.serviceItem?.name || s.customName || "Custom").join(", ")}
                </div>
                <div className="text-sm font-semibold text-emerald-600">{formatCurrency(job.total)}</div>
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(job.scheduledAt)}
                </span>
                <span className="inline-flex px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-medium">
                  {job.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      <Button variant="outline" className="w-full" onClick={onBookNew}>
        Book New Service
      </Button>
    </div>
  );
}
