"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  href,
  accent = false,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  accent?: boolean;
}) {
  const content = (
    <div
      className={cn(
        "flex items-center gap-4 rounded-lg border p-4 transition-colors",
        accent
          ? "border-emerald-200 bg-emerald-50/50"
          : "border-slate-200 bg-white",
        href && "hover:border-slate-300 cursor-pointer"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
          accent ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-slate-900 mt-0.5 truncate">{value}</p>
      </div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
