"use client";

import { Calendar, Car, CreditCard, FileText, Star } from "lucide-react";
import type { Tab } from "../hooks/use-portal";

interface NavTab {
  key: Tab;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface PortalNavProps {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  pendingEstimatesCount: number;
  unpaidInvoicesCount: number;
}

export function PortalNav({ tab, onTabChange, pendingEstimatesCount, unpaidInvoicesCount }: PortalNavProps) {
  const TABS: NavTab[] = [
    { key: "home", label: "Home", icon: <Star className="w-4 h-4" /> },
    { key: "appointments", label: "Jobs", icon: <Calendar className="w-4 h-4" /> },
    { key: "estimates", label: "Estimates", icon: <FileText className="w-4 h-4" />, badge: pendingEstimatesCount },
    { key: "invoices", label: "Invoices", icon: <CreditCard className="w-4 h-4" />, badge: unpaidInvoicesCount },
    { key: "vehicles", label: "Vehicles", icon: <Car className="w-4 h-4" /> },
  ];

  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-lg mx-auto flex overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => onTabChange(t.key)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors relative ${
              tab === t.key
                ? "border-emerald-500 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.icon}
            {t.label}
            {(t.badge ?? 0) > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
