"use client";

import Link from "next/link";
import { Target, ArrowRight } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";

interface Lead {
  id: string;
  name: string;
  status: string;
  source: string;
  phone: string | null;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  New: "bg-blue-50 text-blue-600",
  Contacted: "bg-amber-50 text-amber-600",
  Qualified: "bg-purple-50 text-purple-600",
  Booked: "bg-emerald-50 text-emerald-600",
};

export function RecentLeadsPanel({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <Target className="w-4 h-4 text-slate-400" />
          Recent Leads
        </h2>
        <Link href="/jobs?tab=leads" className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="divide-y divide-slate-100">
        {leads.slice(0, 5).map((lead) => (
          <Link key={lead.id} href={`/leads/${lead.id}`}>
            <div className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap",
                  STATUS_STYLES[lead.status] || "bg-slate-100 text-slate-600"
                )}>
                  {lead.status}
                </span>
                <span className="text-sm font-medium text-slate-900">{lead.name}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>{lead.source}</span>
                <span>{timeAgo(lead.createdAt)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
