import { Skeleton, SkeletonTable } from "@/components/shared/skeletons";

export default function EstimatesLoading() {
  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-[1200px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-44" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-9 w-36" />
      </div>

      {/* Table */}
      <SkeletonTable rows={7} />
    </div>
  );
}
