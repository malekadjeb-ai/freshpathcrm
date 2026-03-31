"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchJson } from "@/lib/utils";

export interface RecurringJobData {
  id: string;
  customerId: string;
  customer: { id: string; name: string; phone: string | null; email: string | null };
  vehicleId: string | null;
  vehicle: { id: string; make: string; model: string; year: number } | null;
  frequency: string;
  dayOfWeek: number | null;
  timeOfDay: string | null;
  services: string;
  addOns: string | null;
  location: string;
  address: string | null;
  totalPrice: number | null;
  notes: string | null;
  isActive: boolean;
  nextRunDate: string | null;
  lastRunDate: string | null;
  jobsCreated: number;
  createdAt: string;
}

export function useRecurringJobs(filterActive: string) {
  const queryClient = useQueryClient();

  const { data: recurringJobs = [], isLoading, isError, refetch } = useQuery<RecurringJobData[]>({
    queryKey: ["recurring-jobs", filterActive],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filterActive !== "all") params.set("active", filterActive);
      return fetchJson(`/api/recurring-jobs?${params}`);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/recurring-jobs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-jobs"] });
      toast.success("Updated");
    },
    onError: () => toast.error("Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/recurring-jobs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-jobs"] });
      toast.success("Deleted");
    },
    onError: () => toast.error("Failed to delete"),
  });

  const generateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/recurring-jobs/${id}/generate`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job created from recurring template");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activeCount = recurringJobs.filter((r) => r.isActive).length;
  const pausedCount = recurringJobs.filter((r) => !r.isActive).length;
  const dueSoon = recurringJobs.filter((r) => {
    if (!r.isActive || !r.nextRunDate) return false;
    const days = Math.ceil((new Date(r.nextRunDate).getTime() - Date.now()) / 86400000);
    return days <= 3;
  }).length;

  return {
    recurringJobs,
    isLoading,
    isError,
    refetch,
    toggleMutation,
    deleteMutation,
    generateMutation,
    stats: { total: recurringJobs.length, activeCount, pausedCount, dueSoon },
  };
}
