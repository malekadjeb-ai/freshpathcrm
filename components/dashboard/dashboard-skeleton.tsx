"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-[1200px] mx-auto space-y-6">
      <div className="h-10 w-64 bg-slate-100 rounded-lg animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[76px] bg-slate-100 rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="h-64 bg-slate-100 rounded-lg animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 bg-slate-100 rounded-lg animate-pulse" />
        <div className="h-64 bg-slate-100 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}

export function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-[1200px] mx-auto">
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <h2 className="text-lg font-semibold text-slate-900">Failed to load dashboard</h2>
        <p className="text-sm text-slate-500 mt-1 mb-4">Something went wrong loading your data.</p>
        <Button onClick={onRetry} variant="outline" size="sm">Try again</Button>
      </div>
    </div>
  );
}
