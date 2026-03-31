"use client";

import Link from "next/link";
import { Calendar, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatTime } from "@/lib/utils";

interface UpcomingJob {
  id: string;
  scheduledAt: string;
  total: number;
  customer: { name: string };
  services: { serviceItem: { name: string } | null; customName?: string | null }[];
  vehicle: { make: string; model: string; year: number } | null;
}

export function TodaySchedule({ jobs }: { jobs: UpcomingJob[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          Today&apos;s Schedule
        </h2>
        <Link href="/calendar" className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
          Full calendar <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="p-5">
        {jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Calendar className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-500">No jobs scheduled today</p>
            <Link href="/jobs/new" className="mt-3">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Book a job
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`}>
                <div className="flex items-center gap-4 rounded-lg border border-slate-100 p-3 hover:border-slate-200 hover:bg-slate-50/50 transition-colors">
                  <div className="text-center shrink-0 w-14">
                    <p className="text-sm font-bold text-slate-900">
                      {formatTime(job.scheduledAt)}
                    </p>
                  </div>
                  <div className="h-8 w-px bg-slate-200 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {job.customer.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {job.services.map((s) => s.serviceItem?.name || s.customName || "Custom").join(", ")}
                      {job.vehicle && ` \u2022 ${job.vehicle.year} ${job.vehicle.make} ${job.vehicle.model}`}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600 shrink-0">
                    {formatCurrency(job.total)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
