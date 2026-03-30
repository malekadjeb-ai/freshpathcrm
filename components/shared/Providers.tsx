"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider, MutationCache } from "@tanstack/react-query";
import { Toaster, toast } from "sonner";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes — data stays fresh, no refetch spam
            gcTime: 10 * 60 * 1000, // 10 minutes — cache lives longer
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
          },
        },
        mutationCache: new MutationCache({
          onError: (error) => {
            toast.error(error.message || "Something went wrong");
          },
        }),
      })
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </SessionProvider>
  );
}
