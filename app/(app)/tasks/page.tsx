"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Search,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Trash2,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { cn, fetchJson, timeAgo } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description: string | null;
  type: string;
  dueDate: string | null;
  dueTime: string | null;
  completed: boolean;
  completedAt: string | null;
  priority: string;
  customerId: string | null;
  customer: { id: string; name: string } | null;
  jobId: string | null;
  job: { id: string; status: string; scheduledAt: string | null } | null;
  leadId: string | null;
  createdAt: string;
}

const TYPES = [
  { value: "general", label: "General" },
  { value: "follow_up", label: "Follow Up" },
  { value: "call_back", label: "Call Back" },
  { value: "send_estimate", label: "Send Estimate" },
  { value: "review_request", label: "Review Request" },
  { value: "rebook", label: "Rebook" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const TYPE_LABELS: Record<string, string> = {
  general: "General",
  follow_up: "Follow Up",
  call_back: "Call Back",
  send_estimate: "Send Estimate",
  review_request: "Review Request",
  rebook: "Rebook",
};

function isOverdue(task: Task) {
  if (task.completed || !task.dueDate) return false;
  return new Date(task.dueDate) < new Date(new Date().toDateString());
}

function isDueToday(task: Task) {
  if (task.completed || !task.dueDate) return false;
  const today = new Date().toDateString();
  return new Date(task.dueDate).toDateString() === today;
}

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterCompleted, setFilterCompleted] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "general",
    dueDate: "",
    dueTime: "",
    priority: "medium",
    customerId: "",
    jobId: "",
  });

  const { data: tasks = [], isLoading, isError, refetch } = useQuery<Task[]>({
    queryKey: ["tasks", filterCompleted, filterPriority],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filterCompleted) params.set("completed", filterCompleted);
      if (filterPriority) params.set("priority", filterPriority);
      return fetchJson(`/api/tasks?${params}`);
    },
  });

  const { data: customers = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["customers-list"],
    queryFn: () => fetchJson("/api/customers"),
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task created");
      setDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error("Failed to create task"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(vars.completed ? "Task completed" : "Task reopened");
    },
    onError: () => toast.error("Failed to update task"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted");
    },
    onError: () => toast.error("Failed to delete task"),
  });

  function resetForm() {
    setForm({
      title: "", description: "", type: "general", dueDate: "",
      dueTime: "", priority: "medium", customerId: "", jobId: "",
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      title: form.title,
      description: form.description || null,
      type: form.type,
      dueDate: form.dueDate || null,
      dueTime: form.dueTime || null,
      priority: form.priority,
      customerId: form.customerId || null,
      jobId: form.jobId || null,
    });
  }

  const filteredTasks = tasks.filter(
    (t) =>
      !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.customer?.name.toLowerCase().includes(search.toLowerCase())
  );

  const overdueTasks = filteredTasks.filter(isOverdue);
  const dueTodayTasks = filteredTasks.filter(isDueToday);
  const pendingTasks = filteredTasks.filter(
    (t) => !t.completed && !isOverdue(t) && !isDueToday(t)
  );
  const completedTasks = filteredTasks.filter((t) => t.completed);

  const stats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.completed).length,
    overdue: tasks.filter(isOverdue).length,
    dueToday: tasks.filter(isDueToday).length,
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
          <p className="text-slate-400 text-sm mt-1">
            {stats.total} total &middot; {stats.completed} completed &middot;{" "}
            {stats.overdue > 0 && (
              <span className="text-red-400">{stats.overdue} overdue</span>
            )}
            {stats.overdue === 0 && "0 overdue"}
          </p>
        </div>
        <Button
          onClick={() => { resetForm(); setDialogOpen(true); }}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4 mr-2" /> New Task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterPriority} onValueChange={(v) => setFilterPriority(v ?? "")}>
          <SelectTrigger className="w-full md:w-40 bg-white border-slate-200">
            <Filter className="w-4 h-4 mr-2 text-slate-500" />
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCompleted} onValueChange={(v) => setFilterCompleted(v ?? "")}>
          <SelectTrigger className="w-full md:w-40 bg-white border-slate-200">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="false">Pending</SelectItem>
            <SelectItem value="true">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Task Sections */}
      {isError ? (
        <ErrorState message="Failed to load tasks." onRetry={refetch} />
      ) : isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon="clipboard"
          title="No tasks yet"
          description="Create your first task to stay on top of follow-ups and to-dos."
        />
      ) : (
        <div className="space-y-6">
          {/* Overdue */}
          {overdueTasks.length > 0 && (
            <TaskSection
              title="Overdue"
              icon={<AlertTriangle className="w-4 h-4 text-red-400" />}
              count={overdueTasks.length}
              tasks={overdueTasks}
              onToggle={(id, completed) => toggleMutation.mutate({ id, completed })}
              onDelete={(id) => deleteMutation.mutate(id)}
              variant="overdue"
            />
          )}

          {/* Due Today */}
          {dueTodayTasks.length > 0 && (
            <TaskSection
              title="Due Today"
              icon={<Clock className="w-4 h-4 text-amber-400" />}
              count={dueTodayTasks.length}
              tasks={dueTodayTasks}
              onToggle={(id, completed) => toggleMutation.mutate({ id, completed })}
              onDelete={(id) => deleteMutation.mutate(id)}
              variant="today"
            />
          )}

          {/* Upcoming / Pending */}
          {pendingTasks.length > 0 && (
            <TaskSection
              title="Upcoming"
              icon={<Circle className="w-4 h-4 text-slate-400" />}
              count={pendingTasks.length}
              tasks={pendingTasks}
              onToggle={(id, completed) => toggleMutation.mutate({ id, completed })}
              onDelete={(id) => deleteMutation.mutate(id)}
              variant="default"
            />
          )}

          {/* Completed */}
          {completedTasks.length > 0 && (
            <TaskSection
              title="Completed"
              icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              count={completedTasks.length}
              tasks={completedTasks}
              onToggle={(id, completed) => toggleMutation.mutate({ id, completed })}
              onDelete={(id) => deleteMutation.mutate(id)}
              variant="completed"
            />
          )}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white border-slate-200 max-w-lg">
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v ?? "general" })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v ?? "medium" })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Due Time</Label>
                <Input
                  type="time"
                  value={form.dueTime}
                  onChange={(e) => setForm({ ...form, dueTime: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Customer</Label>
              <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v ?? "" })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}
                className="border-slate-200 text-slate-600 hover:bg-slate-50">
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700"
                disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaskSection({
  title,
  icon,
  count,
  tasks,
  onToggle,
  onDelete,
  variant,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  tasks: Task[];
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  variant: "overdue" | "today" | "default" | "completed";
}) {
  const borderColor = {
    overdue: "border-l-red-500",
    today: "border-l-amber-500",
    default: "border-l-slate-600",
    completed: "border-l-emerald-500",
  }[variant];

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
          {title}
        </h2>
        <span className="text-xs text-slate-500">({count})</span>
      </div>
      <div className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg border-l-4 bg-white border border-slate-200",
              borderColor,
              task.completed && "opacity-60"
            )}
          >
            <button
              onClick={() => onToggle(task.id, !task.completed)}
              className="mt-0.5 shrink-0"
            >
              {task.completed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <Circle className="w-5 h-5 text-slate-500 hover:text-emerald-400 transition-colors" />
              )}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p
                  className={cn(
                    "text-sm font-medium text-slate-900",
                    task.completed && "line-through text-slate-400"
                  )}
                >
                  {task.title}
                </p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge className={cn("text-xs", PRIORITY_COLORS[task.priority])}>
                    {task.priority}
                  </Badge>
                  <Badge variant="outline" className="text-xs border-slate-200 text-slate-500">
                    {TYPE_LABELS[task.type] || task.type}
                  </Badge>
                </div>
              </div>

              {task.description && (
                <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                  {task.description}
                </p>
              )}

              <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                {task.customer && <span>{task.customer.name}</span>}
                {task.dueDate && (
                  <span className={cn(isOverdue(task) && "text-red-400")}>
                    {task.dueTime
                      ? `${new Date(task.dueDate).toLocaleDateString()} ${task.dueTime}`
                      : new Date(task.dueDate).toLocaleDateString()}
                  </span>
                )}
                {task.completedAt && (
                  <span className="text-emerald-400">
                    Done {timeAgo(task.completedAt)}
                  </span>
                )}
                <span>{timeAgo(task.createdAt)}</span>
              </div>
            </div>

            <button
              onClick={() => onDelete(task.id)}
              className="text-slate-600 hover:text-red-400 transition-colors shrink-0 mt-0.5"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
