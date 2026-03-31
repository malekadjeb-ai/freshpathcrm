"use client";

import { Clock, Route, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FieldTab } from "./types";

interface FieldBottomNavProps {
  tab: FieldTab;
  onTabChange: (tab: FieldTab) => void;
  unreadNotifications: number;
}

const NAV_ITEMS: { key: FieldTab; label: string; icon: typeof Clock; badge?: boolean }[] = [
  { key: "today", label: "Today", icon: Clock },
  { key: "route", label: "Route", icon: Route },
  { key: "notifications", label: "Alerts", icon: Bell, badge: true },
];

export function FieldBottomNav({ tab, onTabChange, unreadNotifications }: FieldBottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-20">
      <div className="flex">
        {NAV_ITEMS.map((item) => {
          const badgeCount = item.badge ? unreadNotifications : 0;
          return (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors relative",
                tab === item.key ? "text-emerald-600" : "text-slate-400"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
              {badgeCount > 0 && (
                <span className="absolute top-2 right-1/4 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {badgeCount > 9 ? "9+" : badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
