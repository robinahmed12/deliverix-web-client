import { useCallback, useRef, useEffect } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useCurrentUser } from "@/features/auth/queries";
import {
  listOrders,
  getOrder,
  getOrderHistory,
  listOrderNotes,
  listOrderProofs,
  listZones,
  listServiceTypes,
  listCustomers,
  createOrder as apiCreateOrder,
  updateOrder as apiUpdateOrder,
  markOrderReady as apiMarkOrderReady,
  cancelOrder as apiCancelOrder,
  createOrderNote as apiCreateOrderNote,
} from "./api";
import type {
  CreateOrderInput,
  UpdateOrderInput,
  CancelOrderInput,
} from "./schemas";
import type {
  Order,
  OrderListParams,
  OrderPage,
  OrderStatusHistoryEntry,
  OrderNote,
  DeliveryProof,
  CustomerSummary,
  CustomerPageMeta,
  ZoneSummary,
  ServiceTypeSummary,
} from "./types";

/* -------------------------------------------------------------------------- */
/*  Query key factory                                                         */
/* -------------------------------------------------------------------------- */

export const ordersKeys = {
  all: ["orders"] as const,
  list: (params: Omit<OrderListParams, "cursor">) =>
    [...ordersKeys.all, "list", params] as const,
  detail: (id: string) => [...ordersKeys.all, "detail", id] as const,
  history: (id: string) => [...ordersKeys.all, "history", id] as const,
  notes: (id: string) => [...ordersKeys.all, "notes", id] as const,
  proofs: (id: string) => [...ordersKeys.all, "proofs", id] as const,
} as const;

const referenceKeys = {
  zones: ["reference", "zones"] as const,
  serviceTypes: ["reference", "serviceTypes"] as const,
  customers: (search?: string) => ["reference", "customers", search ?? ""] as const,
} as const;

/* -------------------------------------------------------------------------- */
/*  Orders – infinite list (cursor, load-more)                                 */
/* -------------------------------------------------------------------------- */

export function useOrdersInfinite(
  params: Omit<OrderListParams, "cursor"> & { pageSize: number },
  initialData?: OrderPage,
) {
  return useInfiniteQuery({
    queryKey: ordersKeys.list(params),
    queryFn: async ({ pageParam }) => {
      const result = await listOrders({ ...params, cursor: pageParam ?? undefined });
      return {
        orders: result.data,
        nextCursor: result.meta.nextCursor,
        hasMore: result.meta.hasMore,
      } satisfies OrderPage;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 20_000,
    initialData: initialData
      ? { pages: [initialData], pageParams: [undefined] }
      : undefined,
  });
}

/* -------------------------------------------------------------------------- */
/*  Single order + derivatives                                                */
/* -------------------------------------------------------------------------- */

export function orderByIdOptions(id: string, initialData?: Order) {
  return {
    queryKey: ordersKeys.detail(id),
    queryFn: () => getOrder(id),
    initialData,
    staleTime: 30_000,
  } as const;
}

export function useOrder(id: string, initialData?: Order) {
  return useQuery(orderByIdOptions(id, initialData));
}

export function useOrderHistory(id: string, initialData?: OrderStatusHistoryEntry[]) {
  return useQuery({
    queryKey: ordersKeys.history(id),
    queryFn: () => getOrderHistory(id),
    initialData,
    staleTime: 60_000,
  });
}

export function useOrderNotes(id: string, initialData?: OrderNote[]) {
  return useQuery({
    queryKey: ordersKeys.notes(id),
    queryFn: async () => {
      const result = await listOrderNotes(id, { pageSize: 100 });
      return result.data;
    },
    initialData,
    staleTime: 30_000,
  });
}

export function useOrderProofs(id: string, initialData?: DeliveryProof[]) {
  return useQuery({
    queryKey: ordersKeys.proofs(id),
    queryFn: async () => {
      const result = await listOrderProofs(id, { pageSize: 100 });
      return result.data;
    },
    initialData,
    staleTime: 30_000,
  });
}

/* -------------------------------------------------------------------------- */
/*  Reference pickers                                                         */
/* -------------------------------------------------------------------------- */

export function useZones(initialData?: ZoneSummary[]) {
  return useQuery({
    queryKey: referenceKeys.zones,
    queryFn: async () => {
      const result = await listZones();
      return result.data;
    },
    initialData,
    staleTime: 5 * 60_000,
  });
}

export function useServiceTypes(initialData?: ServiceTypeSummary[]) {
  return useQuery({
    queryKey: referenceKeys.serviceTypes,
    queryFn: async () => {
      const result = await listServiceTypes();
      return result.data;
    },
    initialData,
    staleTime: 5 * 60_000,
  });
}

export function useCustomerSearch(
  search: string,
  initialData?: { data: CustomerSummary[]; meta: CustomerPageMeta },
) {
  return useQuery({
    queryKey: referenceKeys.customers(search),
    queryFn: () => listCustomers({ search, pageSize: 20 }),
    initialData,
    staleTime: 60_000,
    enabled: search.length >= 1,
  });
}

/* -------------------------------------------------------------------------- */
/*  Mutations                                                                 */
/* -------------------------------------------------------------------------- */

export function useCreateOrderMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data, idempotencyKey }: { data: CreateOrderInput; idempotencyKey: string }) =>
      apiCreateOrder(data, idempotencyKey),
    onSuccess(order: Order) {
      void qc.invalidateQueries({ queryKey: ordersKeys.all });
      void qc.setQueryData(ordersKeys.detail(order.id), order);
    },
  });
}

export function useUpdateOrderMutation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      data,
      version,
    }: {
      data: UpdateOrderInput;
      version: number;
    }) => apiUpdateOrder(id, data, version),
    onSuccess(order: Order) {
      qc.setQueryData(ordersKeys.detail(id), order);
    },
  });
}

export function useMarkOrderReadyMutation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiMarkOrderReady(id),
    onSuccess(order: Order) {
      qc.setQueryData(ordersKeys.detail(id), order);
      void qc.invalidateQueries({ queryKey: ordersKeys.all });
    },
  });
}

export function useCancelOrderMutation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      data,
      version,
    }: {
      data: CancelOrderInput;
      version: number;
    }) => apiCancelOrder(id, data, version),
    onSuccess(order: Order) {
      qc.setQueryData(ordersKeys.detail(id), order);
      void qc.invalidateQueries({ queryKey: ordersKeys.all });
    },
  });
}

export function useCreateOrderNoteMutation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ body, idempotencyKey }: { body: string; idempotencyKey: string }) =>
      apiCreateOrderNote(id, body, idempotencyKey),
    onSuccess() {
      void qc.invalidateQueries({ queryKey: ordersKeys.notes(id) });
    },
  });
}

/* -------------------------------------------------------------------------- */
/*  Permission helpers                                                        */
/* -------------------------------------------------------------------------- */

export function useOrderPermissions() {
  const { data: user } = useCurrentUser();
  if (!user) return { canCreate: false, canEdit: false, canCancel: false, canAddNotes: false };
  return {
    canCreate: user.permissions.includes("orders.create"),
    canEdit: user.permissions.includes("orders.edit"),
    canCancel: user.permissions.includes("orders.cancel"),
    canAddNotes: user.permissions.includes("orders.internal-notes"),
  };
}

/* -------------------------------------------------------------------------- */
/*  Idempotency key helper                                                    */
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
export function useIdempotencyKey() {
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
    const key = `order-${await sha256Hex(serialized)}`;
    prevRef.current = serialized;
    ref.current = key;
    return key;
  }, []);

  return getKey;
}