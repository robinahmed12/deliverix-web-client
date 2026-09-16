"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query/query-client";

/**
 * Provides the shared React Query client to the whole application.
 * Wraps only Client Component subtrees that call useQuery/useMutation.
 */
export function QueryProviders({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}