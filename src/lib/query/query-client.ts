import {
  QueryClient,
  type DefaultOptions,
  type DefaultError,
} from "@tanstack/react-query";
import { ApiError, isRetryableError } from "@/lib/api/errors";

/**
 * Centralized QueryClient defaults (QUERY-005..020).
 *
 * - Queries retry only transient network/5xx failures with bounded backoff (QUERY-006/007).
 * - Mutations never retry by default; idempotent critical mutations opt in (QUERY-008/009).
 * - No optimistic updates by default (QUERY-012).
 * - Combined error message includes support-safe requestId where available.
 */
const defaultOptions: DefaultOptions = {
  queries: {
    staleTime: 30_000,
    retry: (failureCount: number, error: DefaultError) => {
      if (failureCount >= 2) return false;
      return isRetryableError(error);
    },
    refetchOnWindowFocus: false,
  },
  mutations: {
    retry: false,
  },
};

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions,
    mutationCache: undefined,
  });
}

/**
 * Returns the shared browser QueryClient or a fresh one per server render
 * (keep server requests isolated; reuse the browser cache across renders).
 */
export function getQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    return createQueryClient();
  }

  const g = globalThis as typeof globalThis & {
    __deliverixQueryClient?: QueryClient;
  };

  if (!g.__deliverixQueryClient) {
    g.__deliverixQueryClient = createQueryClient();
  }
  return g.__deliverixQueryClient;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.requestId) {
    return `${error.detail ?? "An unexpected error occurred"} (request ${error.requestId})`;
  }
  return error instanceof Error ? error.message : "An unexpected error occurred";
}