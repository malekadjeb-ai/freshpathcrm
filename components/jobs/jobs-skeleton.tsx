export function JobsKanbanSkeleton() {
  return (
    <div className="flex gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex-1 space-y-3">
          <div className="h-8 bg-slate-100 rounded animate-pulse" />
          {Array.from({ length: 2 }).map((_, j) => (
            <div key={j} className="h-24 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  );
}
