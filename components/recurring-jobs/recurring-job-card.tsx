"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Pause, Play, Trash2, Zap } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { RecurringJobData } from "./use-recurring-jobs";

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 Weeks",
  monthly: "Monthly",
  quarterly: "Quarterly",
};

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const FREQUENCY_COLORS: Record<string, string> = {
  weekly: "bg-blue-100 text-blue-700",
  biweekly: "bg-indigo-100 text-indigo-700",
  monthly: "bg-purple-100 text-purple-700",
  quarterly: "bg-amber-100 text-amber-700",
};

function parseServices(json: string): { serviceItemId: string; price: number; quantity: number; name?: string }[] {
  try { return JSON.parse(json); } catch { return []; }
}

interface RecurringJobCardProps {
  job: RecurringJobData;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  onGenerate: (id: string) => void;
  isGenerating: boolean;
}

export function RecurringJobCard({ job, onToggle, onDelete, onGenerate, isGenerating }: RecurringJobCardProps) {
  const services = parseServices(job.services);
  const daysSinceRun = job.lastRunDate
    ? Math.ceil((Date.now() - new Date(job.lastRunDate).getTime()) / 86400000)
    : null;

  return (
    <Card className={!job.isActive ? "opacity-60" : ""}>
      <CardContent className="py-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Link href={`/customers/${job.customer.id}`} className="font-medium text-slate-900 hover:text-emerald-600 truncate">
                {job.customer.name}
              </Link>
              <Badge className={FREQUENCY_COLORS[job.frequency] || "bg-slate-100 text-slate-600"}>
                {FREQUENCY_LABELS[job.frequency] || job.frequency}
              </Badge>
              {!job.isActive && <Badge className="bg-slate-200 text-slate-500">Paused</Badge>}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
              {job.vehicle && <span>{job.vehicle.year} {job.vehicle.make} {job.vehicle.model}</span>}
              {services.length > 0 && <span>{services.map((s) => s.name || s.serviceItemId).join(", ")}</span>}
              {job.totalPrice !== null && <span className="font-medium text-emerald-600">{formatCurrency(job.totalPrice)}</span>}
            </div>
            <div className="flex gap-x-4 mt-1 text-xs text-slate-400">
              {job.dayOfWeek !== null && (
                <span>{DAY_LABELS[job.dayOfWeek]}{job.timeOfDay ? ` at ${job.timeOfDay}` : ""}</span>
              )}
              {job.nextRunDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Next: {formatDate(job.nextRunDate)}
                </span>
              )}
              {daysSinceRun !== null && <span>Last run: {daysSinceRun}d ago</span>}
              <span>{job.jobsCreated} jobs created</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {job.isActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onGenerate(job.id)}
                disabled={isGenerating}
                title="Generate next job now"
              >
                <Zap className="w-3.5 h-3.5 mr-1" />
                Generate
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onToggle(job.id, !job.isActive)}
              title={job.isActive ? "Pause" : "Resume"}
            >
              {job.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-red-500 hover:text-red-600"
              onClick={() => onDelete(job.id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
