"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Megaphone, Zap, Tag, FileText, Image } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageSkeleton } from "@/components/page-skeleton";

const CampaignsContent = dynamic(() => import("@/app/(app)/campaigns/page"), { loading: () => <PageSkeleton /> });
const AutomationsContent = dynamic(() => import("@/app/(app)/automations/page"), { loading: () => <PageSkeleton /> });
const PromosContent = dynamic(() => import("@/app/(app)/promo-codes/page"), { loading: () => <PageSkeleton /> });
const ContentContent = dynamic(() => import("@/app/(app)/content/page"), { loading: () => <PageSkeleton /> });
const GalleryContent = dynamic(() => import("@/app/(app)/gallery/page"), { loading: () => <PageSkeleton /> });

const tabs = [
  { id: "campaigns", label: "Campaigns", icon: Megaphone },
  { id: "automations", label: "Automations", icon: Zap },
  { id: "promos", label: "Promos", icon: Tag },
  { id: "content", label: "Content", icon: FileText },
  { id: "gallery", label: "Gallery", icon: Image },
] as const;

type TabId = (typeof tabs)[number]["id"];

const TAB_COMPONENTS: Record<TabId, React.ComponentType> = {
  campaigns: CampaignsContent,
  automations: AutomationsContent,
  promos: PromosContent,
  content: ContentContent,
  gallery: GalleryContent,
};

export default function MarketingHub() {
  const [activeTab, setActiveTab] = useState<TabId>("campaigns");
  const ActiveComponent = TAB_COMPONENTS[activeTab];

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-slate-200 px-4 md:px-6">
        <nav className="flex gap-1 -mb-px overflow-x-auto" aria-label="Marketing hub tabs">
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
