import { useInfiniteQuery } from "@tanstack/react-query";
import { listAuditLogs } from "./api";
import type { AuditLogEntry, AuditListParams } from "./types";

export const auditKeys = {
  all: ["audit"] as const,
  list: (filters: Omit<AuditListParams, "cursor" | "pageSize">) =>
    [...auditKeys.all, "list", filters] as const,
} as const;

interface AuditLogPage {
  entries: AuditLogEntry[];
  nextCursor: string | null;
  hasMore: boolean;
}

const PAGE_SIZE = 20;

export function useAuditLogsInfinite(
  filters: Omit<AuditListParams, "cursor" | "pageSize">,
) {
  return useInfiniteQuery({
    queryKey: auditKeys.list(filters),
    queryFn: async ({ pageParam }) => {
      const result = await listAuditLogs({
        ...filters,
        pageSize: PAGE_SIZE,
        ...(pageParam ? { cursor: pageParam } : {}),
      });
      return {
        entries: result.data,
        nextCursor: result.meta.nextCursor,
        hasMore: result.meta.hasMore,
      } satisfies AuditLogPage;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
    staleTime: 15_000,
  });
}