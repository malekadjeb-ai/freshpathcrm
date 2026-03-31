"use client";

import { useRouter } from "next/navigation";
import { Briefcase } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import {
  formatCurrency, formatDate,
  JOB_STATUS_LABELS, type JobStatus,
  LOCATION_LABELS,
} from "@/lib/utils";
import { JOB_STATUS_STYLES } from "@/lib/ui-constants";

interface ListJob {
  id: string;
  status: string;
  scheduledAt: string | null;
  total: number;
  location: string;
  customer: { id: string; name: string; phone: string | null };
  vehicle: { make: string; model: string; year: number } | null;
  services: { serviceItem: { name: string } | null; customName?: string | null }[];
  invoice: { id: string; invoiceNumber: string; status: string } | null;
}

interface JobsListViewProps {
  jobs: ListJob[];
  allJobsCount: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onNewJob: () => void;
}

export function JobsListView({
  jobs,
  allJobsCount,
  page,
  totalPages,
  onPageChange,
  onNewJob: _onNewJob,
}: JobsListViewProps) {
  const router = useRouter();

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              {["Customer", "Vehicle", "Services", "Date", "Location", "Status", "Total"].map((h, i) => (
                <th
                  key={h}
                  className={`text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 ${
                    i === 6 ? "text-right" : "text-left"
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon={Briefcase}
                    title={allJobsCount === 0 ? "No jobs yet" : "No jobs match your filters"}
                    description={
                      allJobsCount === 0
                        ? "Schedule your first detailing job to get started."
                        : "Try adjusting your search or filter criteria."
                    }
                    action={allJobsCount === 0 ? { label: "Create Job", href: "/jobs/new" } : undefined}
                  />
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr
                  key={job.id}
                  className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer"
                  onClick={() => router.push(`/jobs/${job.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-slate-900">{job.customer.name}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {job.vehicle
                      ? `${job.vehicle.year} ${job.vehicle.make} ${job.vehicle.model}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {job.services.map((s) => s.serviceItem?.name || s.customName || "Custom").join(", ")}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {job.scheduledAt ? formatDate(job.scheduledAt) : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {LOCATION_LABELS[job.location as keyof typeof LOCATION_LABELS] ?? job.location}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        JOB_STATUS_STYLES[job.status as JobStatus] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {JOB_STATUS_LABELS[job.status as JobStatus] ?? job.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {formatCurrency(job.total)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </>
  );
}
