"use client";

import { Loader2, CheckCircle } from "lucide-react";
import { ErrorState } from "@/components/error-state";
import { FieldJobCard } from "./field-job-card";
import type { FieldJob } from "./types";

interface FieldTodayTabProps {
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  activeJobs: FieldJob[];
  completedJobs: FieldJob[];
  sortedJobs: FieldJob[];
  onStatusChange: (jobId: string, status: string) => void;
  isStatusPending: boolean;
}

export function FieldTodayTab({
  isLoading,
  isError,
  refetch,
  activeJobs,
  completedJobs,
  sortedJobs,
  onStatusChange,
  isStatusPending,
}: FieldTodayTabProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState message="Failed to load jobs." onRetry={refetch} />;
  }

  if (sortedJobs.length === 0) {
    return (
      <div className="text-center py-16">
        <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">No jobs today</p>
        <p className="text-slate-400 text-sm mt-1">Enjoy your day off!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activeJobs.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Active</h2>
          {activeJobs.map((job) => (
            <FieldJobCard
              key={job.id}
              job={job}
              onStatusChange={(status) => onStatusChange(job.id, status)}
              isPending={isStatusPending}
            />
          ))}
        </div>
      )}
      {completedJobs.length > 0 && (
        <div className="mt-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Completed</h2>
          {completedJobs.map((job) => (
            <FieldJobCard
              key={job.id}
              job={job}
              onStatusChange={(status) => onStatusChange(job.id, status)}
              isPending={isStatusPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
