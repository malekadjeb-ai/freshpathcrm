"use client";

import Link from "next/link";
import { GripVertical, Briefcase } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  useDroppable,
  useDraggable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useState } from "react";
import { toast } from "sonner";
import {
  formatCurrency, formatDate, formatTime,
  JOB_STATUS_LABELS, type JobStatus,
  LOCATION_LABELS,
} from "@/lib/utils";
import { JOB_STATUS_DOT_COLORS } from "@/lib/ui-constants";
import { EmptyState } from "@/components/empty-state";

export interface KanbanJob {
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

const KANBAN_COLUMNS: { key: JobStatus; label: string; color: string }[] = [
  { key: "Scheduled", label: "Scheduled", color: JOB_STATUS_DOT_COLORS["Scheduled"] },
  { key: "InProgress", label: "In Progress", color: JOB_STATUS_DOT_COLORS["InProgress"] },
  { key: "Completed", label: "Completed", color: JOB_STATUS_DOT_COLORS["Completed"] },
  { key: "Invoiced", label: "Invoiced", color: JOB_STATUS_DOT_COLORS["Invoiced"] },
  { key: "Paid", label: "Paid", color: JOB_STATUS_DOT_COLORS["Paid"] },
  { key: "Cancelled", label: "Cancelled", color: JOB_STATUS_DOT_COLORS["Cancelled"] },
];

function JobCardContent({ job }: { job: KanbanJob }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <GripVertical className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <span className="font-medium text-sm text-slate-900">{job.customer.name}</span>
        </div>
        <span className="font-semibold text-emerald-600 text-sm">{formatCurrency(job.total)}</span>
      </div>
      {job.vehicle && (
        <p className="text-xs text-slate-500 mb-1.5 pl-5">
          {job.vehicle.year} {job.vehicle.make} {job.vehicle.model}
        </p>
      )}
      <p className="text-xs text-slate-500 line-clamp-1 pl-5">
        {job.services.map((s) => s.serviceItem?.name || s.customName || "Custom").join(", ")}
      </p>
      {job.scheduledAt && (
        <p className="text-xs text-slate-400 mt-2 pl-5">
          {formatDate(job.scheduledAt)} at {formatTime(job.scheduledAt)}
        </p>
      )}
      <div className="mt-2 pl-5">
        <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
          {LOCATION_LABELS[job.location as keyof typeof LOCATION_LABELS] ?? job.location}
        </span>
      </div>
    </div>
  );
}

function DraggableJobCard({ job }: { job: KanbanJob }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: job.id,
    data: { job },
  });

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={{ opacity: isDragging ? 0.4 : 1 }}>
      <Link href={`/jobs/${job.id}`} onClick={(e) => { if (isDragging) e.preventDefault(); }}>
        <JobCardContent job={job} />
      </Link>
    </div>
  );
}

function DroppableColumn({
  id, label, color, children, count,
}: {
  id: string;
  label: string;
  color: string;
  children: React.ReactNode;
  count: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex-shrink-0 w-72">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <span className="font-medium text-sm text-slate-700">{label}</span>
        <span className="text-xs text-slate-400 ml-auto bg-slate-100 px-1.5 py-0.5 rounded-full">{count}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`space-y-2.5 min-h-32 rounded-lg p-1 transition-colors ${
          isOver ? "bg-emerald-50 ring-2 ring-emerald-200" : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}

interface JobsKanbanProps {
  jobs: KanbanJob[];
  allJobsCount: number;
  onStatusChange: (jobId: string, status: string) => void;
}

export function JobsKanban({ jobs, allJobsCount, onStatusChange }: JobsKanbanProps) {
  const [activeJob, setActiveJob] = useState<KanbanJob | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const job = event.active.data.current?.job as KanbanJob | undefined;
    if (job) setActiveJob(job);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveJob(null);
    const { active, over } = event;
    if (!over) return;
    const jobId = active.id as string;
    const newStatus = over.id as string;
    const job = jobs.find((j) => j.id === jobId);
    if (job && job.status !== newStatus) {
      onStatusChange(jobId, newStatus);
      toast.success(`Job moved to ${JOB_STATUS_LABELS[newStatus as JobStatus] || newStatus}`);
    }
  };

  if (jobs.length === 0) {
    return (
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
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((col) => {
          const colJobs = jobs.filter((j) => j.status === col.key);
          return (
            <DroppableColumn key={col.key} id={col.key} label={col.label} color={col.color} count={colJobs.length}>
              {colJobs.map((job) => <DraggableJobCard key={job.id} job={job} />)}
              {colJobs.length === 0 && (
                <div className="h-24 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center gap-1">
                  <p className="text-xs font-medium text-slate-300">No {col.label.toLowerCase()} jobs</p>
                  <p className="text-xs text-slate-300/70">Drag jobs here</p>
                </div>
              )}
            </DroppableColumn>
          );
        })}
      </div>
      <DragOverlay>
        {activeJob ? (
          <div className="w-72 opacity-90 rotate-2">
            <JobCardContent job={activeJob} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
