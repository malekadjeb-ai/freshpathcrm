"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { startOfDay, subDays, startOfWeek, startOfMonth, isAfter } from "date-fns";
import { Plus, List, LayoutGrid, Search, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  formatCurrency, formatDate, formatTime,
  JOB_STATUS_LABELS, JOB_STATUS_COLORS, type JobStatus,
  LOCATIONS, LOCATION_LABELS, fetchJson,
} from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import { Pagination } from "@/components/pagination";
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
import { toast } from "sonner";

interface Job {
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
  { key: "Scheduled", label: "Scheduled", color: "bg-blue-500" },
  { key: "InProgress", label: "In Progress", color: "bg-amber-500" },
  { key: "Completed", label: "Completed", color: "bg-emerald-500" },
  { key: "Invoiced", label: "Invoiced", color: "bg-purple-500" },
  { key: "Paid", label: "Paid", color: "bg-green-600" },
  { key: "Cancelled", label: "Cancelled", color: "bg-red-500" },
];

function JobCardContent({ job }: { job: Job }) {
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

function DraggableJobCard({ job }: { job: Job }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: job.id,
    data: { job },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.4 : 1 }}
    >
      <Link href={`/jobs/${job.id}`} onClick={(e) => { if (isDragging) e.preventDefault(); }}>
        <JobCardContent job={job} />
      </Link>
    </div>
  );
}

function DroppableColumn({
  id,
  label,
  color,
  children,
  count,
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
        <span className="text-xs text-slate-400 ml-auto bg-slate-100 px-1.5 py-0.5 rounded-full">
          {count}
        </span>
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

export default function JobsContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [page, setPage] = useState(1);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const perPage = 20;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const statusMutation = useMutation({
    mutationFn: ({ jobId, status }: { jobId: string; status: string }) =>
      fetch(`/api/jobs/${jobId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: () => toast.error("Failed to update job status"),
  });

  const handleDragStart = (event: DragStartEvent) => {
    const job = event.active.data.current?.job as Job | undefined;
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
      statusMutation.mutate({ jobId, status: newStatus });
      toast.success(`Job moved to ${JOB_STATUS_LABELS[newStatus as JobStatus] || newStatus}`);
    }
  };

  const { data: jobs = [], isLoading, isError, refetch } = useQuery<Job[]>({
    queryKey: ["jobs", statusFilter, locationFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      if (locationFilter && locationFilter !== "all") params.set("location", locationFilter);
      return fetchJson(`/api/jobs?${params}`);
    },
  });

  const dateRangeStart = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case "today": return startOfDay(now);
      case "week": return startOfWeek(now);
      case "month": return startOfMonth(now);
      case "30d": return subDays(now, 30);
      case "90d": return subDays(now, 90);
      default: return null;
    }
  }, [dateRange]);

  const filteredJobs = jobs.filter((j) => {
    if (search) {
      const q = search.toLowerCase();
      const matches =
        j.customer.name.toLowerCase().includes(q) ||
        j.services.some((s) => (s.serviceItem?.name || s.customName || "").toLowerCase().includes(q)) ||
        (j.vehicle && `${j.vehicle.year} ${j.vehicle.make} ${j.vehicle.model}`.toLowerCase().includes(q));
      if (!matches) return false;
    }
    if (dateRangeStart && j.scheduledAt) {
      if (!isAfter(new Date(j.scheduledAt), dateRangeStart)) return false;
    }
    if (dateRangeStart && !j.scheduledAt) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredJobs.length / perPage);
  const paginatedJobs = filteredJobs.slice((page - 1) * perPage, page * perPage);

  const jobsByStatus = (status: string) => filteredJobs.filter((j) => j.status === status);

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Jobs</h1>
          <p className="text-slate-500 text-sm mt-0.5">{filteredJobs.length} total jobs</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setView("kanban")}
              className={`px-3 py-2 ${view === "kanban" ? "bg-slate-100" : ""}`}
            >
              <LayoutGrid className="w-4 h-4 text-slate-500" />
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-3 py-2 ${view === "list" ? "bg-slate-100" : ""}`}
            >
              <List className="w-4 h-4 text-slate-500" />
            </button>
          </div>
          <Link href="/jobs/new">
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Job
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9 w-56"
            placeholder="Search customer, service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(JOB_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={locationFilter} onValueChange={(v) => setLocationFilter(v ?? "all")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            {LOCATIONS.map((l) => (
              <SelectItem key={l} value={l}>{LOCATION_LABELS[l]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dateRange} onValueChange={(v) => setDateRange(v ?? "all")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All dates" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All dates</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This week</SelectItem>
            <SelectItem value="month">This month</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <ErrorState message="Failed to load jobs." onRetry={refetch} />
      ) : isLoading ? (
        <div className="flex gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-1 space-y-3">
              <div className="h-8 bg-slate-100 rounded animate-pulse" />
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j} className="h-24 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      ) : view === "kanban" ? (
        /* Kanban View with Drag & Drop */
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {KANBAN_COLUMNS.map((col) => {
              const colJobs = jobsByStatus(col.key);
              return (
                <DroppableColumn
                  key={col.key}
                  id={col.key}
                  label={col.label}
                  color={col.color}
                  count={colJobs.length}
                >
                  {colJobs.map((job) => (
                    <DraggableJobCard key={job.id} job={job} />
                  ))}
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
      ) : (
        /* List View */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-600">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Vehicle</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Services</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Location</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Total</th>
              </tr>
            </thead>
            <tbody>
              {paginatedJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No jobs found
                  </td>
                </tr>
              ) : (
                paginatedJobs.map((job) => (
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
                          JOB_STATUS_COLORS[job.status as JobStatus] ?? "bg-slate-100 text-slate-600"
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
      )}

      {view === "list" && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
