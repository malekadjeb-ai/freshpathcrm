"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export interface PortalData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  vehicles: Array<{
    id: string;
    year: number;
    make: string;
    model: string;
    color: string | null;
  }>;
  upcomingJobs: Array<{
    id: string;
    scheduledAt: string;
    status: string;
    services: Array<{ serviceItem: { name: string } | null; customName?: string | null }>;
    total: number;
    address: string | null;
  }>;
  completedJobs: Array<{
    id: string;
    completedAt: string;
    services: Array<{ serviceItem: { name: string } | null; customName?: string | null }>;
    total: number;
    photos: string;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    total: number;
    paymentLink: string | null;
    dueDate: string | null;
    payments: Array<{ amount: number }>;
  }>;
  subscriptions: Array<{
    id: string;
    status: string;
    plan: { name: string; monthlyPrice: number };
    vehicle: { year: number; make: string; model: string } | null;
    nextServiceDate: string | null;
    nextBillingDate: string;
  }>;
}

export interface Estimate {
  id: string;
  estimateNumber: string;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  notes: string | null;
  createdAt: string;
  validUntil: string | null;
  lineItems: Array<{ name: string; description: string | null; price: number; quantity: number }>;
  vehicle: { year: number; make: string; model: string } | null;
}

export type Tab = "home" | "appointments" | "estimates" | "invoices" | "vehicles";

export function usePortal() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("home");
  const [declineEstimateId, setDeclineEstimateId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  const { data, isLoading, isError } = useQuery<PortalData>({
    queryKey: ["portal-me"],
    queryFn: async () => {
      const res = await fetch("/api/portal/me");
      if (res.status === 401) throw new Error("unauthorized");
      return res.json();
    },
    retry: false,
  });

  const { data: estimates = [] } = useQuery<Estimate[]>({
    queryKey: ["portal-estimates"],
    queryFn: async () => {
      const res = await fetch("/api/portal/estimates");
      if (res.status === 401) throw new Error("unauthorized");
      return res.json();
    },
    retry: false,
    enabled: !!data,
  });

  const respondMutation = useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: string; reason?: string }) => {
      const res = await fetch(`/api/portal/estimates/${id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["portal-estimates"] });
      queryClient.invalidateQueries({ queryKey: ["portal-me"] });
      toast.success(vars.action === "approve" ? "Estimate approved!" : "Estimate declined");
      setDeclineEstimateId(null);
      setDeclineReason("");
    },
    onError: () => toast.error("Failed to respond to estimate"),
  });

  useEffect(() => {
    if (isError) router.push("/portal/login");
  }, [isError, router]);

  const unpaidInvoices = data?.invoices.filter((inv) => inv.status !== "Paid") ?? [];
  const pendingEstimates = estimates.filter((e) => ["Sent", "Viewed"].includes(e.status));

  return {
    data,
    isLoading,
    estimates,
    tab,
    setTab,
    declineEstimateId,
    setDeclineEstimateId,
    declineReason,
    setDeclineReason,
    respondMutation,
    unpaidInvoices,
    pendingEstimates,
  };
}
