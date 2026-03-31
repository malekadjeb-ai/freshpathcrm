"use client";

import Link from "next/link";
import { Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate, JOB_STATUS_LABELS, type JobStatus } from "@/lib/utils";
import { JOB_STATUS_STYLES } from "@/lib/ui-constants";
import type { CustomerDetailData } from "./customer-types";

interface CustomerJobsProps {
  jobs: CustomerDetailData["jobs"];
}

export function CustomerJobs({ jobs }: CustomerJobsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-emerald-500" />
          Job History ({jobs.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No jobs yet</p>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="flex items-center justify-between bg-slate-50 hover:bg-slate-100 rounded-lg px-4 py-3 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${JOB_STATUS_STYLES[job.status as JobStatus] ?? "bg-slate-100 text-slate-600"}`}
                    >
                      {JOB_STATUS_LABELS[job.status as JobStatus] ?? job.status}
                    </span>
                    {job.vehicle && (
                      <span className="text-sm text-slate-500">
                        {job.vehicle.year} {job.vehicle.make} {job.vehicle.model}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {job.services.map((s) => s.serviceItem?.name || s.customName || "Custom").join(", ")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-slate-900">{formatCurrency(job.total)}</div>
                  {job.scheduledAt && (
                    <div className="text-xs text-slate-400">{formatDate(job.scheduledAt)}</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
