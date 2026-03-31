"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  ArrowLeft, ChevronRight, MapPin, Car, Calendar, FileText, Trash2,
  Pencil, RotateCcw, Send, Play, Square, Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  formatCurrency, formatDate, JOB_STATUS_LABELS, JOB_STATUSES,
  type JobStatus, LOCATION_LABELS,
} from "@/lib/utils";
import { JOB_STATUS_STYLES } from "@/lib/ui-constants";
import type { JobDetail } from "./job-types";

interface JobHeaderProps {
  job: JobDetail;
  jobId: string;
  onStatusChange: (status: string) => void;
  onCreateInvoice: () => void;
  onDelete: () => void;
  isStatusPending: boolean;
  isInvoicePending: boolean;
}

export function JobHeader({
  job, jobId, onStatusChange, onCreateInvoice, onDelete,
  isStatusPending, isInvoicePending,
}: JobHeaderProps) {
  const router = useRouter();
  const status = job.status as JobStatus;

  return (
    <>
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
        <Link href="/jobs" className="hover:text-slate-900 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Jobs
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900">Job Detail</span>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span
                className={`text-sm px-3 py-1 rounded-full font-medium ${JOB_STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600"}`}
              >
                {JOB_STATUS_LABELS[status] ?? job.status}
              </span>
              {job.scheduledAt && (
                <span className="text-sm text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(job.scheduledAt)} at {new Date(job.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900">{job.customer.name}</h1>
            {job.vehicle && (
              <p className="text-slate-500 text-sm flex items-center gap-1.5 mt-1">
                <Car className="w-3.5 h-3.5" />
                {job.vehicle.year} {job.vehicle.make} {job.vehicle.model}
                {job.vehicle.color ? ` — ${job.vehicle.color}` : ""}
                <span className="text-slate-400">({job.vehicle.vehicleType})</span>
              </p>
            )}
            {(job.address || job.city) && (
              <p className="text-slate-500 text-sm flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
                {[job.address, job.city].filter(Boolean).join(", ")}
                {" · "}
                {LOCATION_LABELS[job.location as keyof typeof LOCATION_LABELS] ?? job.location}
              </p>
            )}
          </div>

          <div className="flex items-start gap-3">
            <div className="text-right">
              <div className="text-3xl font-bold text-emerald-600">{formatCurrency(job.total)}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                {job.services.length} service{job.services.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        </div>

        {job.status === "InProgress" && job.startedAt && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
            <Timer className="w-5 h-5 text-amber-600 animate-pulse" />
            <div>
              <div className="text-xs text-amber-600 font-medium">Job In Progress</div>
              <LiveTimer startedAt={job.startedAt} />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mt-5 pt-5 border-t border-slate-100 flex-wrap">
          {job.status === "Scheduled" && (
            <Button
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
              onClick={() => onStatusChange("EnRoute")}
              disabled={isStatusPending}
            >
              <Send className="w-4 h-4 mr-2" />
              On My Way
            </Button>
          )}

          {(job.status === "Scheduled" || job.status === "EnRoute") && (
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => onStatusChange("InProgress")}
              disabled={isStatusPending}
            >
              <Play className="w-4 h-4 mr-2" />
              Start Job
            </Button>
          )}

          {job.status === "InProgress" && (
            <Button
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={() => onStatusChange("Completed")}
              disabled={isStatusPending}
            >
              <Square className="w-4 h-4 mr-2" />
              Complete Job
            </Button>
          )}

          {job.status !== "Cancelled" && job.status !== "Paid" && (
            <div className="flex items-center gap-2">
              <Select onValueChange={(v) => onStatusChange(String(v ?? ""))}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="More..." />
                </SelectTrigger>
                <SelectContent>
                  {JOB_STATUSES.filter((s) => s !== job.status).map((s) => (
                    <SelectItem key={s} value={s}>
                      {JOB_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(job.status === "Completed" || job.status === "Invoiced") && !job.invoice && (
            <Button
              className="bg-purple-500 hover:bg-purple-600 text-white"
              onClick={onCreateInvoice}
              disabled={isInvoicePending}
            >
              <FileText className="w-4 h-4 mr-2" />
              {isInvoicePending ? "Creating..." : "Create Invoice"}
            </Button>
          )}

          {job.invoice && (
            <Link href={`/invoices/${job.invoice.id}`}>
              <Button variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Invoice {job.invoice.invoiceNumber}
              </Button>
            </Link>
          )}

          <Link href={`/jobs/${jobId}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-4 w-4 mr-2" />
              Edit Job
            </Button>
          </Link>

          {job.status === "Completed" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const p = new URLSearchParams({
                  customerId: job.customer.id,
                  ...(job.vehicle ? { vehicleId: job.vehicle.id } : {}),
                  rebook: "true",
                });
                router.push(`/jobs/new?${p.toString()}`);
              }}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Rebook
            </Button>
          )}

          <div className="ml-auto">
            <AlertDialog>
              <AlertDialogTrigger render={
                <Button variant="outline" size="icon" className="text-red-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </Button>
              } />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete job?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this job and all associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-500 hover:bg-red-600"
                    onClick={onDelete}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </>
  );
}

function LiveTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const tick = () => {
      const diff = Date.now() - start;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(
        h > 0
          ? `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`
          : `${m}m ${s.toString().padStart(2, "0")}s`
      );
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return <div className="text-lg font-bold text-amber-700 font-mono tabular-nums">{elapsed}</div>;
}
