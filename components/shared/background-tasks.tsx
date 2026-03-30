"use client";

import { useQuery } from "@tanstack/react-query";

/**
 * Invisible component that runs background tasks via polling:
 * - Processes due scheduled messages every 2 minutes
 */
export function BackgroundTasks() {
  useQuery({
    queryKey: ["bg-process-messages"],
    queryFn: () => fetch("/api/cron/process-messages").then((r) => r.json()),
    refetchInterval: 2 * 60_000,
    refetchIntervalInBackground: false,
    staleTime: 60_000,
  });

  return null;
}
