"use client";

import {
  Phone,
  Play,
  Square,
  Send,
  Timer,
  Navigation2,
  Clock,
  Car,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency, JOB_STATUS_LABELS, JOB_STATUS_COLORS, type JobStatus } from "@/lib/utils";
import { FieldTimer } from "./field-timer";
import type { FieldJob } from "./types";

interface FieldJobCardProps {
  job: FieldJob;
  onStatusChange: (status: string) => void;
  isPending: boolean;
}

export function FieldJobCard({ job, onStatusChange, isPending }: FieldJobCardProps) {
  const status = job.status as JobStatus;
  const isInProgress = job.status === "InProgress";
  const isCompleted = ["Completed", "Invoiced", "Paid"].includes(job.status);

  return (
    <div className={cn(
      "bg-white rounded-2xl border p-4 mb-3 transition-all",
      isInProgress ? "border-amber-300 shadow-md" : "border-slate-200"
    )}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-semibold text-slate-900">{job.customer.name}</div>
          {job.vehicle && (
            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <Car className="w-3 h-3" />
              {job.vehicle.year} {job.vehicle.make} {job.vehicle.model}
              {job.vehicle.color && ` · ${job.vehicle.color}`}
            </div>
          )}
        </div>
        <span className={cn(
          "text-[10px] px-2 py-0.5 rounded-full font-medium",
          JOB_STATUS_COLORS[status] ?? "bg-slate-100 text-slate-600"
        )}>
          {JOB_STATUS_LABELS[status] ?? job.status}
        </span>
      </div>

      <div className="text-sm text-slate-600 mb-2">
        {job.services.map((s) => s.serviceItem?.name || s.customName || "Custom").join(", ")}
      </div>

      <div className="flex items-center justify-between text-sm mb-3">
        {job.scheduledAt && (
          <span className="text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {new Date(job.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </span>
        )}
        <span className="font-bold text-emerald-600">{formatCurrency(job.total)}</span>
      </div>

      {isInProgress && job.startedAt && (
        <div className="bg-amber-50 rounded-lg p-2 mb-3 flex items-center gap-2">
          <Timer className="w-4 h-4 text-amber-600 animate-pulse" />
          <FieldTimer startedAt={job.startedAt} />
        </div>
      )}

      <div className="flex items-center gap-2">
        {job.status === "Scheduled" && (
          <>
            <Button
              size="sm"
              className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white h-11 text-sm"
              onClick={() => onStatusChange("EnRoute")}
              disabled={isPending}
            >
              <Send className="w-4 h-4 mr-1.5" />
              On My Way
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white h-11 text-sm"
              onClick={() => onStatusChange("InProgress")}
              disabled={isPending}
            >
              <Play className="w-4 h-4 mr-1.5" />
              Start
            </Button>
          </>
        )}
        {job.status === "EnRoute" && (
          <Button
            size="sm"
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white h-11 text-sm"
            onClick={() => onStatusChange("InProgress")}
            disabled={isPending}
          >
            <Play className="w-4 h-4 mr-1.5" />
            Start Job
          </Button>
        )}
        {isInProgress && (
          <Button
            size="sm"
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white h-11 text-sm"
            onClick={() => onStatusChange("Completed")}
            disabled={isPending}
          >
            <Square className="w-4 h-4 mr-1.5" />
            Complete
          </Button>
        )}

        {!isCompleted && (
          <>
            {job.customer.phone && (
              <a
                href={`tel:${job.customer.phone}`}
                className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
            {job.address && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(job.address + (job.city ? `, ${job.city}` : ""))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <Navigation2 className="w-4 h-4" />
              </a>
            )}
          </>
        )}
      </div>

      {job.notes && (
        <div className="mt-2 text-xs text-slate-400 bg-slate-50 rounded-lg p-2">
          {job.notes}
        </div>
      )}
    </div>
  );
}
