import { useCallback, useRef, useEffect } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useCurrentUser } from "@/features/auth/queries";
import {
  listCustomers,
  getCustomer,
  createCustomer as apiCreateCustomer,
  updateCustomer as apiUpdateCustomer,
  listAddresses,
  createAddress as apiCreateAddress,
  updateAddress as apiUpdateAddress,
  deleteAddress as apiDeleteAddress,
} from "./api";
import type {
  AddressPayload,
  CreateCustomerPayload,
  CustomerAddress,
  CustomerListFilters,
  CustomerListPage,
  CustomerListItem,
  UpdateCustomerPayload,
} from "./types";

/* -------------------------------------------------------------------------- */
/*  Query key factory                                                         */
/* -------------------------------------------------------------------------- */

export const customerKeys = {
  all: ["customers"] as const,
  list: (params: Omit<CustomerListFilters, "page">) =>
    [...customerKeys.all, "list", params] as const,
  detail: (id: string) => [...customerKeys.all, "detail", id] as const,
  addresses: (id: string) =>
    [...customerKeys.all, "addresses", id] as const,
} as const;

/* -------------------------------------------------------------------------- */
/*  Customers – infinite list (offset pagination, load-more)                   */
/* -------------------------------------------------------------------------- */

export function useCustomersInfinite(
  params: Omit<CustomerListFilters, "page">,
  initialData?: CustomerListPage,
  pageSize = 20,
) {
  return useInfiniteQuery({
    queryKey: customerKeys.list(params),
    queryFn: async ({ pageParam }) => {
      const result = await listCustomers({ ...params, page: pageParam, pageSize });
      return {
        customers: result.data,
        page: result.meta.page,
        totalPages: result.meta.totalPages,
        hasMore: result.meta.page < result.meta.totalPages,
      } satisfies CustomerListPage;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    staleTime: 20_000,
    initialData: initialData
      ? { pages: [initialData], pageParams: [1] }
      : undefined,
  });
}

/* -------------------------------------------------------------------------- */
/*  Single customer + address book                                             */
/* -------------------------------------------------------------------------- */

export function useCustomer(id: string, initialData?: CustomerListItem) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => getCustomer(id),
    initialData,
    staleTime: 30_000,
  });
}

export function useCustomerAddresses(
  id: string,
  initialData?: CustomerAddress[],
) {
  return useQuery({
    queryKey: customerKeys.addresses(id),
    queryFn: async () => {
      const result = await listAddresses(id);
      return result.data;
    },
    initialData,
    staleTime: 30_000,
  });
}

/* -------------------------------------------------------------------------- */
/*  Mutations                                                                 */
/* -------------------------------------------------------------------------- */

export function useCreateCustomerMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      data,
      idempotencyKey,
    }: {
      data: CreateCustomerPayload;
      idempotencyKey: string;
    }) => apiCreateCustomer(data, idempotencyKey),
    onSuccess(customer: CustomerListItem) {
      void qc.invalidateQueries({ queryKey: customerKeys.all });
      void qc.setQueryData(customerKeys.detail(customer.id), customer);
    },
  });
}

export function useUpdateCustomerMutation(customerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      data,
      version,
    }: {
      data: UpdateCustomerPayload;
      version: number;
    }) => apiUpdateCustomer(customerId, data, version),
    onSuccess(customer: CustomerListItem) {
      qc.setQueryData(customerKeys.detail(customerId), customer);
      void qc.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}

export function useCreateAddressMutation(customerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      data,
      idempotencyKey,
    }: {
      data: AddressPayload;
      idempotencyKey: string;
    }) => apiCreateAddress(customerId, data, idempotencyKey),
    onSuccess() {
      void qc.invalidateQueries({ queryKey: customerKeys.addresses(customerId) });
    },
  });
}

export function useUpdateAddressMutation(customerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      addressId,
      data,
    }: {
      addressId: string;
      data: AddressPayload;
    }) => apiUpdateAddress(customerId, addressId, data),
    onSuccess() {
      void qc.invalidateQueries({ queryKey: customerKeys.addresses(customerId) });
    },
  });
}

export function useDeleteAddressMutation(customerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (addressId: string) => apiDeleteAddress(customerId, addressId),
    onSuccess() {
      void qc.invalidateQueries({ queryKey: customerKeys.addresses(customerId) });
    },
  });
}

/* -------------------------------------------------------------------------- */
/*  Permission helpers                                                         */
/* -------------------------------------------------------------------------- */

export function useCustomerPermissions() {
  const { data: user } = useCurrentUser();
  if (!user) return { canView: false, canManage: false };
  return {
    canView: user.permissions.includes("customers.view"),
    canManage: user.permissions.includes("customers.manage"),
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