"use client";

import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface UseOptimisticStatusOptions {
  queryKey: unknown[];
  updateFn: (id: string, status: string) => Promise<void>;
  label: string;
}

/**
 * Hook for optimistic status updates on list items.
 * Immediately updates the UI, then syncs with the server.
 * On failure, reverts to the previous state and shows an error toast.
 */
export function useOptimisticStatus<T extends { id: string; status?: string }>({
  queryKey,
  updateFn,
  label,
}: UseOptimisticStatusOptions) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateFn(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey });
      const snapshot = queryClient.getQueryData<T[]>(queryKey);

      queryClient.setQueryData<T[]>(queryKey, (old = []) =>
        old.map((item) =>
          item.id === id ? { ...item, status } : item
        )
      );

      return { snapshot };
    },
    onError: (_err, _vars, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(queryKey, context.snapshot);
      }
      toast.error(`Failed to update ${label.toLowerCase()} status`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    updateStatus: (id: string, status: string) =>
      mutation.mutate({ id, status }),
    isPending: mutation.isPending,
  };
}
