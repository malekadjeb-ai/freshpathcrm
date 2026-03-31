import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  colorMap: Record<string, string>;
  className?: string;
}

export function StatusBadge({ status, colorMap, className }: StatusBadgeProps) {
  return (
    <span
      role="status"
      aria-label={`Status: ${status}`}
      className={cn(
        "text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap",
        colorMap[status] ?? "bg-slate-100 text-slate-600",
        className
      )}
    >
      {status}
    </span>
  );
}
