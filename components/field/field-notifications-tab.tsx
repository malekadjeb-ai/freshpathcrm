"use client";

import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface FieldNotificationsTabProps {
  notifications: Notification[];
}

export function FieldNotificationsTab({ notifications }: FieldNotificationsTabProps) {
  return (
    <div className="space-y-2">
      <h2 className="text-base font-bold text-slate-900 mb-3">Notifications</h2>
      {notifications.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">No notifications</div>
      ) : (
        notifications.slice(0, 20).map((n) => (
          <div
            key={n.id}
            className={cn(
              "bg-white rounded-xl border p-3",
              n.read ? "border-slate-200" : "border-emerald-200 bg-emerald-50/50"
            )}
          >
            <div className="font-medium text-sm text-slate-900">{n.title}</div>
            <div className="text-xs text-slate-500 mt-0.5">{n.message}</div>
          </div>
        ))
      )}
    </div>
  );
}
