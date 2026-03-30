"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Briefcase, Target, FileText, ClipboardList, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageSkeleton } from "@/components/page-skeleton";

const JobsContent = dynamic(() => import("./jobs-content"), { loading: () => <PageSkeleton /> });
const LeadsContent = dynamic(() => import("@/app/(app)/leads/page"), { loading: () => <PageSkeleton /> });
const QuotesContent = dynamic(() => import("@/app/(app)/quotes/page"), { loading: () => <PageSkeleton /> });
const EstimatesContent = dynamic(() => import("@/app/(app)/estimates/page"), { loading: () => <PageSkeleton /> });
const RecurringContent = dynamic(() => import("@/app/(app)/recurring-jobs/page"), { loading: () => <PageSkeleton /> });

const tabs = [
  { id: "jobs", label: "All Jobs", icon: Briefcase },
  { id: "leads", label: "Leads", icon: Target },
  { id: "quotes", label: "Quotes", icon: FileText },
  { id: "estimates", label: "Estimates", icon: ClipboardList },
  { id: "recurring", label: "Recurring", icon: RefreshCw },
] as const;

type TabId = (typeof tabs)[number]["id"];

const TAB_COMPONENTS: Record<TabId, React.ComponentType> = {
  jobs: JobsContent,
  leads: LeadsContent,
  quotes: QuotesContent,
  estimates: EstimatesContent,
  recurring: RecurringContent,
};

export default function JobsHub() {
  const [activeTab, setActiveTab] = useState<TabId>("jobs");
  const ActiveComponent = TAB_COMPONENTS[activeTab];

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-slate-200 px-4 md:px-6">
        <nav className="flex gap-1 -mb-px overflow-x-auto" aria-label="Jobs hub tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "border-emerald-500 text-emerald-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto">
        <ActiveComponent />
      </div>
    </div>
  );
}
