"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useUndoDelete } from "@/lib/use-undo-delete";
import { fetchJson } from "@/lib/utils";

export interface Task {
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

export function isOverdue(task: Task) {
  if (task.completed || !task.dueDate) return false;
  return new Date(task.dueDate) < new Date(new Date().toDateString());
}

export function isDueToday(task: Task) {
  if (task.completed || !task.dueDate) return false;
  const today = new Date().toDateString();
  return new Date(task.dueDate).toDateString() === today;
}

export function useTasks(filterCompleted: string, filterPriority: string) {
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading, isError, refetch } = useQuery<Task[]>({
    queryKey: ["tasks", filterCompleted, filterPriority],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filterCompleted) params.set("completed", filterCompleted);
      if (filterPriority) params.set("priority", filterPriority);
      return fetchJson(`/api/tasks?${params}`);
    },
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
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const prev = queryClient.getQueryData<Task[]>(["tasks"]);
      queryClient.setQueryData<Task[]>(["tasks"], (old = []) =>
        old.map((t) =>
          t.id === id
            ? { ...t, completed, completedAt: completed ? new Date().toISOString() : null }
            : t
        )
      );
      return { prev };
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["tasks"], ctx.prev);
      toast.error("Failed to update task");
    },
    onSuccess: (_, vars) => {
      toast.success(vars.completed ? "Task completed ✓" : "Task reopened");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const { softDelete: deleteTask } = useUndoDelete<Task>({
    queryKey: ["tasks"],
    deleteFn: async (id) => {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete task");
    },
    label: "Task",
  });

  const stats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.completed).length,
    overdue: tasks.filter(isOverdue).length,
    dueToday: tasks.filter(isDueToday).length,
  };

  return {
    tasks,
    isLoading,
    isError,
    refetch,
    createMutation,
    toggleMutation,
    deleteTask,
    stats,
  };
}
