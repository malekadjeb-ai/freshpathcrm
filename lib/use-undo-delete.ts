"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCallback } from "react";

interface UseUndoDeleteOptions {
  /** React Query cache key whose data should be updated optimistically */
  queryKey: unknown[];
  /** Async function that performs the actual DELETE request */
  deleteFn: (id: string) => Promise<void>;
  /** Human-readable label, e.g. "Customer", "Task" */
  label: string;
  /** Optional callback after the delete is committed (undo window passed) */
  onCommitted?: (id: string) => void;
}

/**
 * Returns a `softDelete(id)` function that:
 * 1. Immediately removes the item from the React Query cache
 * 2. Shows a sonner toast with an Undo button
 * 3. If undo is clicked → restores the item from cache snapshot
 * 4. If undo window passes (5s) → calls deleteFn to actually delete from DB
 */
export function useUndoDelete<T extends { id: string }>({
  queryKey,
  deleteFn,
  label,
  onCommitted,
}: UseUndoDeleteOptions) {
  const queryClient = useQueryClient();

  const softDelete = useCallback(
    (id: string) => {
      // Snapshot the cache before removing
      const snapshot = queryClient.getQueryData<T[]>(queryKey);

      // Optimistically remove from cache
      queryClient.setQueryData<T[]>(queryKey, (old = []) =>
        old.filter((item) => item.id !== id)
      );

      let undone = false;
      const toastId = toast(`${label} deleted`, {
        description: "This action can be undone.",
        duration: 5000,
        action: {
          label: "Undo",
          onClick: () => {
            undone = true;
            if (snapshot) {
              queryClient.setQueryData(queryKey, snapshot);
            }
            toast.success(`${label} restored`);
          },
        },
        onDismiss: () => {
          if (!undone) commit();
        },
        onAutoClose: () => {
          if (!undone) commit();
        },
      });

      function commit() {
        deleteFn(id)
          .then(() => {
            queryClient.invalidateQueries({ queryKey });
            onCommitted?.(id);
          })
          .catch(() => {
            // Restore on failure
            if (snapshot) queryClient.setQueryData(queryKey, snapshot);
            toast.error(`Failed to delete ${label.toLowerCase()}`);
          });
      }

      return toastId;
    },
    [queryClient, queryKey, deleteFn, label, onCommitted]
  );

  return { softDelete };
}
