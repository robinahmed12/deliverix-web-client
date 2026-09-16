import {
  queryOptions,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getMe } from "@/features/auth/api";
import type { CurrentUser } from "@/lib/api/types";

/**
 * Centralized query-key factory for auth (QUERY-002..004).
 */
export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
};

/**
 * `/auth/me` query options, shared by server hydration and client hooks so both
 * call sites share the same key (REND-004).
 */
export function currentUserQuery() {
  return queryOptions<CurrentUser>({
    queryKey: authKeys.me(),
    queryFn: getMe,
    staleTime: 5 * 60 * 1000, // permission/role data changes rarely
    refetchOnWindowFocus: false,
  });
}

export function useCurrentUser() {
  return useQuery(currentUserQuery());
}

export function useInvalidateCurrentUser() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: authKeys.me() });
}