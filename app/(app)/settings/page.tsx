"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  Settings as SettingsIcon,
  Wrench,
  HardHat,
  MessageSquare,
  ClipboardCheck,
  Building2,
  Route,
  Webhook,
  Percent,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageSkeleton } from "@/components/page-skeleton";

const GeneralContent = dynamic(() => import("./settings-content"), { loading: () => <PageSkeleton /> });
const ServicesContent = dynamic(() => import("@/app/(app)/services/page"), { loading: () => <PageSkeleton /> });
const StaffContent = dynamic(() => import("@/app/(app)/staff/page"), { loading: () => <PageSkeleton /> });
const TemplatesContent = dynamic(() => import("@/app/(app)/templates/page"), { loading: () => <PageSkeleton /> });
const ChecklistsContent = dynamic(() => import("@/app/(app)/checklists/page"), { loading: () => <PageSkeleton /> });
const FleetContent = dynamic(() => import("@/app/(app)/fleet/page"), { loading: () => <PageSkeleton /> });
const RoutesContent = dynamic(() => import("@/app/(app)/routes/page"), { loading: () => <PageSkeleton /> });
const WebhooksContent = dynamic(() => import("@/app/(app)/webhooks/page"), { loading: () => <PageSkeleton /> });
const PricingContent = dynamic(() => import("@/app/(app)/pricing/page"), { loading: () => <PageSkeleton /> });

const tabs = [
  { id: "general", label: "General", icon: SettingsIcon },
  { id: "services", label: "Services", icon: Wrench },
  { id: "staff", label: "Staff", icon: HardHat },
  { id: "templates", label: "Templates", icon: MessageSquare },
  { id: "checklists", label: "Checklists", icon: ClipboardCheck },
  { id: "fleet", label: "Fleet", icon: Building2 },
  { id: "routes", label: "Routes", icon: Route },
  { id: "pricing", label: "Pricing", icon: Percent },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
] as const;

type TabId = (typeof tabs)[number]["id"];

const TAB_COMPONENTS: Record<TabId, React.ComponentType> = {
  general: GeneralContent,
  services: ServicesContent,
  staff: StaffContent,
  templates: TemplatesContent,
  checklists: ChecklistsContent,
  fleet: FleetContent,
  routes: RoutesContent,
  pricing: PricingContent,
  webhooks: WebhooksContent,
};

export default function SettingsHub() {
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const ActiveComponent = TAB_COMPONENTS[activeTab];

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-slate-200 px-4 md:px-6">
        <nav className="flex gap-1 -mb-px overflow-x-auto" aria-label="Settings tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
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
