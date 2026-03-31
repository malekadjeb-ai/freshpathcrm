"use client";

import { Briefcase, DollarSign, Target, AlertCircle } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatCurrency } from "@/lib/utils";

interface KpiGridProps {
  jobsToday: number;
  todayRevenue: number;
  openLeads: number;
  outstanding: number;
}

export function KpiGrid({ jobsToday, todayRevenue, openLeads, outstanding }: KpiGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Jobs Today" value={jobsToday} icon={Briefcase} href="/calendar" accent={jobsToday > 0} />
      <StatCard label="Revenue Today" value={formatCurrency(todayRevenue)} icon={DollarSign} href="/analytics" />
      <StatCard label="Open Leads" value={openLeads} icon={Target} href="/jobs?tab=leads" />
      <StatCard label="Outstanding" value={formatCurrency(outstanding)} icon={AlertCircle} href="/invoicing" />
    </div>
  );
}
