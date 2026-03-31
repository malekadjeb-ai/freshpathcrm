"use client";

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { startOfDay, subDays, startOfWeek, startOfMonth, isAfter } from "date-fns";
import { fetchJson } from "@/lib/utils";
import type { KanbanJob } from "@/components/jobs/jobs-kanban";

export type DateRangeKey = "all" | "today" | "week" | "month" | "30d" | "90d";

function useDateRangeStart(dateRange: DateRangeKey): Date | null {
  return useMemo(() => {
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
}

export function useJobs(statusFilter: string, locationFilter: string) {
  const queryClient = useQueryClient();

  const query = useQuery<KanbanJob[]>({
    queryKey: ["jobs", statusFilter, locationFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (locationFilter !== "all") params.set("location", locationFilter);
      return fetchJson(`/api/jobs?${params}`);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ jobId, status }: { jobId: string; status: string }) =>
      fetch(`/api/jobs/${jobId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
    onMutate: async ({ jobId, status }) => {
      await queryClient.cancelQueries({ queryKey: ["jobs"] });
      const prev = queryClient.getQueryData<KanbanJob[]>(["jobs", statusFilter, locationFilter]);
      queryClient.setQueryData<KanbanJob[]>(["jobs", statusFilter, locationFilter], (old = []) =>
        old.map((j) => (j.id === jobId ? { ...j, status } : j))
      );
      return { prev };
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["jobs", statusFilter, locationFilter], ctx.prev);
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ["jobs"] }); },
  });

  return { ...query, updateStatus: statusMutation.mutate };
}

export function useFilteredJobs(
  jobs: KanbanJob[],
  search: string,
  dateRange: DateRangeKey
): KanbanJob[] {
  const dateRangeStart = useDateRangeStart(dateRange);

  return useMemo(() => jobs.filter((j) => {
    if (search) {
      const q = search.toLowerCase();
      const matches =
        j.customer.name.toLowerCase().includes(q) ||
        j.services.some((s) => (s.serviceItem?.name || s.customName || "").toLowerCase().includes(q)) ||
        (j.vehicle && `${j.vehicle.year} ${j.vehicle.make} ${j.vehicle.model}`.toLowerCase().includes(q));
      if (!matches) return false;
    }
    if (dateRangeStart && j.scheduledAt && !isAfter(new Date(j.scheduledAt), dateRangeStart)) return false;
    if (dateRangeStart && !j.scheduledAt) return false;
    return true;
  }), [jobs, search, dateRangeStart]);
}
