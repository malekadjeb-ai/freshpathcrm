"use client";

import { forwardRef, type HTMLAttributes, type ThHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Accessible data table components with proper ARIA attributes.
 * Use these for all data tables in the app for consistent accessibility.
 */

interface DataTableProps extends HTMLAttributes<HTMLTableElement> {
  label: string;
  caption?: string;
}

export const DataTable = forwardRef<HTMLTableElement, DataTableProps>(
  ({ label, caption, className, children, ...props }, ref) => (
    <div role="region" aria-label={label} className="overflow-x-auto">
      <table
        ref={ref}
        role="grid"
        aria-label={label}
        className={cn("w-full text-sm", className)}
        {...props}
      >
        {caption && (
          <caption className="sr-only">{caption}</caption>
        )}
        {children}
      </table>
    </div>
  )
);
DataTable.displayName = "DataTable";

interface SortableThProps extends ThHTMLAttributes<HTMLTableCellElement> {
  sorted?: "ascending" | "descending" | "none";
  onSort?: () => void;
}

export const SortableTh = forwardRef<HTMLTableCellElement, SortableThProps>(
  ({ sorted = "none", onSort, className, children, ...props }, ref) => (
    <th
      ref={ref}
      scope="col"
      aria-sort={sorted}
      tabIndex={onSort ? 0 : undefined}
      role={onSort ? "columnheader button" : "columnheader"}
      onClick={onSort}
      onKeyDown={(e) => {
        if (onSort && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onSort();
        }
      }}
      className={cn(
        "text-left font-medium text-slate-500 dark:text-slate-400",
        onSort && "cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200",
        className
      )}
      {...props}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {onSort && (
          <span aria-hidden="true" className="text-xs">
            {sorted === "ascending" ? "▲" : sorted === "descending" ? "▼" : "⇅"}
          </span>
        )}
      </span>
    </th>
  )
);
SortableTh.displayName = "SortableTh";

/** Visually hidden text for screen readers */
export function SrOnly({ children }: { children: React.ReactNode }) {
  return <span className="sr-only">{children}</span>;
}

/** Status badge with accessible label */
export function AccessibleStatus({
  status,
  className,
  children,
}: {
  status: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      role="status"
      aria-label={`Status: ${status}`}
      className={className}
    >
      {children}
    </span>
  );
}
