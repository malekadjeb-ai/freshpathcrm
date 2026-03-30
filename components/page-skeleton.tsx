"use client";

export function PageSkeleton({ variant = "list" }: { variant?: "list" | "cards" | "detail" }) {
  if (variant === "detail") {
    return (
      <div className="p-6 max-w-6xl mx-auto animate-pulse">
        <div className="h-4 w-32 bg-slate-100 rounded mb-4" />
        <div className="bg-white border rounded-xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full" />
            <div className="space-y-2">
              <div className="h-6 w-48 bg-slate-100 rounded" />
              <div className="h-4 w-64 bg-slate-100 rounded" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-48 bg-slate-100 rounded-xl" />
            <div className="h-64 bg-slate-100 rounded-xl" />
          </div>
          <div className="space-y-6">
            <div className="h-40 bg-slate-100 rounded-xl" />
            <div className="h-40 bg-slate-100 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div className="p-6 max-w-6xl mx-auto animate-pulse">
        <div className="flex justify-between items-center mb-6">
          <div className="space-y-2">
            <div className="h-7 w-40 bg-slate-100 rounded" />
            <div className="h-4 w-56 bg-slate-100 rounded" />
          </div>
          <div className="h-9 w-28 bg-slate-100 rounded" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl" />
          ))}
        </div>
        <div className="h-10 bg-slate-100 rounded-lg mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Default: list variant
  return (
    <div className="p-6 max-w-6xl mx-auto animate-pulse">
      <div className="flex justify-between items-center mb-6">
        <div className="space-y-2">
          <div className="h-7 w-40 bg-slate-100 rounded" />
          <div className="h-4 w-56 bg-slate-100 rounded" />
        </div>
        <div className="h-9 w-28 bg-slate-100 rounded" />
      </div>
      <div className="h-10 bg-slate-100 rounded-lg mb-6" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 bg-slate-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
