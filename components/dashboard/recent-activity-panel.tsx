"use client";

import Link from "next/link";
import {
  Clock, Briefcase, DollarSign, Phone, MessageSquare,
} from "lucide-react";
import {
  cn, formatCurrency, timeAgo,
  JOB_STATUS_LABELS, type JobStatus,
} from "@/lib/utils";
import { JOB_STATUS_STYLES } from "@/lib/ui-constants";

interface RecentJob {
  id: string;
  status: string;
  total: number;
  updatedAt: string;
  customer: { name: string };
}

interface RecentPayment {
  id: string;
  amount: number;
  method: string;
  createdAt: string;
  invoice: { job: { customer: { name: string } } };
}

interface RecentCommunication {
  id: string;
  type: string;
  direction: string;
  status: string;
  summary: string | null;
  createdAt: string;
  customer: { name: string };
}

export function RecentActivityPanel({
  recentJobs,
  recentPayments,
  recentCommunications,
}: {
  recentJobs: RecentJob[];
  recentPayments: RecentPayment[];
  recentCommunications: RecentCommunication[];
}) {
  const hasActivity = recentJobs.length > 0 || recentPayments.length > 0 || recentCommunications.length > 0;

  const items = [
    ...recentJobs.slice(0, 4).map((j) => ({
      id: j.id,
      type: "job" as const,
      text: j.customer.name,
      detail: `Job ${JOB_STATUS_LABELS[j.status as JobStatus] ?? j.status} \u2022 ${formatCurrency(j.total)}`,
      time: j.updatedAt,
      href: `/jobs/${j.id}`,
      icon: Briefcase,
      iconStyle: JOB_STATUS_STYLES[j.status as JobStatus] ?? "bg-slate-100 text-slate-600",
    })),
    ...recentPayments.slice(0, 3).map((p) => ({
      id: p.id,
      type: "payment" as const,
      text: p.invoice?.job?.customer?.name || "Payment",
      detail: `Payment ${formatCurrency(p.amount)} via ${p.method}`,
      time: p.createdAt,
      href: "/invoicing?tab=payments",
      icon: DollarSign,
      iconStyle: "bg-emerald-50 text-emerald-600",
    })),
    ...recentCommunications.filter(c => c?.customer).slice(0, 3).map((c) => ({
      id: c.id,
      type: "comm" as const,
      text: c.customer.name,
      detail: c.summary || `${c.type} ${c.direction}`,
      time: c.createdAt,
      href: "/communications",
      icon: c.type === "call" ? Phone : MessageSquare,
      iconStyle: c.type === "call" ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600",
    })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 8);

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          Recent Activity
        </h2>
      </div>
      <div className="p-5">
        {!hasActivity ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-500">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-1">
            {items.map((item) => (
              <Link key={`${item.type}-${item.id}`} href={item.href}>
                <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-50 transition-colors">
                  <div className={cn("p-1.5 rounded-md text-xs", item.iconStyle)}>
                    <item.icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{item.text}</p>
                    <p className="text-xs text-slate-400 truncate">{item.detail}</p>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                    {timeAgo(item.time)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
