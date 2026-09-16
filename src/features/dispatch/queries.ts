import { useCallback, useRef, useEffect } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useCurrentUser } from "@/features/auth/queries";
import { listOrders } from "@/features/orders/api";
import type { OrderPage } from "@/features/orders/types";
import {
  listDispatchQueue,
  listDriverWorkloads,
  getAssignmentHistory,
  createAssignment as apiCreateAssignment,
  reassignOrder as apiReassignOrder,
  withdrawAssignment as apiWithdrawAssignment,
  acceptAssignment as apiAcceptAssignment,
  rejectAssignment as apiRejectAssignment,
} from "./api";
import type {
  AssignOrderInput,
  ReassignInput,
  WithdrawAssignmentInput,
} from "./schemas";
import type {
  AssignmentHistoryEntry,
  DispatchQueuePage,
  DriverWorkload,
} from "./types";

/* -------------------------------------------------------------------------- */
/*  Query key factory                                                          */
/* -------------------------------------------------------------------------- */

export const dispatchKeys = {
  all: ["dispatch"] as const,
  queue: (params: Omit<{ cursor?: string; pageSize?: number; zoneId?: string }, "cursor">) =>
    [...dispatchKeys.all, "queue", params] as const,
  dispatched: (params: { pageSize: number }) =>
    [...dispatchKeys.all, "dispatched", params] as const,
  workloads: (state?: string) => [...dispatchKeys.all, "workloads", state ?? "all"] as const,
  assignmentHistory: (orderId: string) => [...dispatchKeys.all, "assignmentHistory", orderId] as const,
} as const;

/* -------------------------------------------------------------------------- */
/*  Dispatch queue – infinite list (cursor, load-more)                        */
/* -------------------------------------------------------------------------- */

export function useDispatchQueueInfinite(
  params: Omit<{ cursor?: string; pageSize?: number; zoneId?: string }, "cursor"> & { pageSize: number },
  initialData?: DispatchQueuePage,
) {
  return useInfiniteQuery({
    queryKey: dispatchKeys.queue(params),
    queryFn: async ({ pageParam }) => {
      const result = await listDispatchQueue({ ...params, cursor: pageParam ?? undefined });
      return {
        data: result.data,
        pageInfo: {
          hasMore: result.pageInfo.hasMore,
          nextCursor: result.pageInfo.nextCursor,
        },
      } satisfies DispatchQueuePage;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pageInfo.nextCursor ?? undefined,
    staleTime: 10_000,
    refetchInterval: 10_000,
    initialData: initialData
      ? { pages: [initialData], pageParams: [undefined] }
      : undefined,
  });
}

/* -------------------------------------------------------------------------- */
/*  Driver workloads                                                           */
/* -------------------------------------------------------------------------- */

export function useDriverWorkloads(
  state?: string,
  initialData?: DriverWorkload[],
) {
  return useQuery({
    queryKey: dispatchKeys.workloads(state),
    queryFn: async () => {
      const result = await listDriverWorkloads(state ? { state } : {});
      return result.data;
    },
    initialData,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

/* -------------------------------------------------------------------------- */
/*  Dispatched orders (Assigned status) — reassign/withdraw surface          */
/* -------------------------------------------------------------------------- */

export function useDispatchedOrdersInfinite(pageSize = 20) {
  return useInfiniteQuery({
    queryKey: dispatchKeys.dispatched({ pageSize }),
    queryFn: async ({ pageParam }) => {
      const result = await listOrders({
        status: "Assigned",
        cursor: pageParam ?? undefined,
        pageSize,
      });
      return {
        orders: result.data,
        nextCursor: result.meta.nextCursor,
        hasMore: result.meta.hasMore,
      } satisfies OrderPage;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

/* -------------------------------------------------------------------------- */
/*  Assignment history for an order                                            */
/* -------------------------------------------------------------------------- */

export function useAssignmentHistory(
  orderId: string,
  initialData?: AssignmentHistoryEntry[],
) {
  return useQuery({
    queryKey: dispatchKeys.assignmentHistory(orderId),
    queryFn: async () => {
      const result = await getAssignmentHistory(orderId);
      return result.data;
    },
    initialData,
    staleTime: 30_000,
    enabled: orderId.length > 0,
  });
}

/* -------------------------------------------------------------------------- */
/*  Mutations                                                                 */
/* -------------------------------------------------------------------------- */

export function useCreateAssignmentMutation(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data, idempotencyKey }: { data: AssignOrderInput; idempotencyKey: string }) =>
      apiCreateAssignment(orderId, data, idempotencyKey),
    onSuccess() {
      void qc.invalidateQueries({ queryKey: dispatchKeys.all });
    },
  });
}

export function useReassignMutation(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data, idempotencyKey }: { data: ReassignInput; idempotencyKey: string }) =>
      apiReassignOrder(orderId, data, idempotencyKey),
    onSuccess() {
      void qc.invalidateQueries({ queryKey: dispatchKeys.all });
    },
  });
}

export function useWithdrawAssignmentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, idempotencyKey }: { id: string; data: WithdrawAssignmentInput; idempotencyKey: string }) =>
      apiWithdrawAssignment(id, data, idempotencyKey),
    onSuccess() {
      void qc.invalidateQueries({ queryKey: dispatchKeys.all });
    },
  });
}

export function useAcceptAssignmentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiAcceptAssignment(id),
    onSuccess() {
      void qc.invalidateQueries({ queryKey: dispatchKeys.all });
    },
  });
}

export function useRejectAssignmentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRejectAssignment(id),
    onSuccess() {
      void qc.invalidateQueries({ queryKey: dispatchKeys.all });
    },
  });
}

/* -------------------------------------------------------------------------- */
/*  Permission helpers                                                         */
/* -------------------------------------------------------------------------- */

export function useDispatchPermissions() {
  const { data: user } = useCurrentUser();
  if (!user) return { canViewQueue: false, canAssign: false, canReassign: false };
  return {
    canViewQueue: user.permissions.includes("dispatch.view-queue"),
    canAssign: user.permissions.includes("dispatch.assign"),
    canReassign: user.permissions.includes("dispatch.reassign"),
  };
}

/* -------------------------------------------------------------------------- */
/*  Idempotency key helper                                                     */
/* -------------------------------------------------------------------------- */

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Creates a stable idempotency key for a given payload within the component
 * lifetime. The same payload yields the same key; changing the payload resets
 * it. Call at submission time with the final serialized payload.
 */
export function useIdempotencyKey(prefix: string) {
  const ref = useRef<string | null>(null);
  const prevRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      ref.current = null;
      prevRef.current = null;
    };
  }, []);

  const getKey = useCallback(async (payload: unknown): Promise<string> => {
    const serialized = JSON.stringify(payload);
    if (prevRef.current === serialized && ref.current) return ref.current;
    const key = `${prefix}-${await sha256Hex(serialized)}`;
    prevRef.current = serialized;
    ref.current = key;
    return key;
  }, [prefix]);

  return getKey;
}