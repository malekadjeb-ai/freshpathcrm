"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, type ComponentPropsWithoutRef } from "react";

interface PrefetchLinkProps extends ComponentPropsWithoutRef<typeof Link> {
  /** React Query key to prefetch on hover */
  prefetchKey?: unknown[];
  /** Fetch function for the prefetch */
  prefetchFn?: () => Promise<unknown>;
  /** Stale time for prefetched data (default: 30s) */
  staleTime?: number;
}

/**
 * A Link component that prefetches React Query data on hover.
 * Reduces perceived latency when navigating between pages.
 */
export function PrefetchLink({
  prefetchKey,
  prefetchFn,
  staleTime = 30_000,
  onMouseEnter,
  onFocus,
  ...props
}: PrefetchLinkProps) {
  const queryClient = useQueryClient();

  const prefetch = useCallback(() => {
    if (prefetchKey && prefetchFn) {
      queryClient.prefetchQuery({
        queryKey: prefetchKey,
        queryFn: prefetchFn,
        staleTime,
      });
    }
  }, [queryClient, prefetchKey, prefetchFn, staleTime]);

  return (
    <Link
      {...props}
      onMouseEnter={(e) => {
        prefetch();
        onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        prefetch();
        onFocus?.(e);
      }}
    />
  );
}
