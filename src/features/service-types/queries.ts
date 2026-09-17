import { useCallback, useRef, useEffect } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useCurrentUser } from "@/features/auth/queries";
import {
  listServiceTypes,
  getServiceType,
  createServiceType as apiCreateServiceType,
  updateServiceType as apiUpdateServiceType,
} from "./api";
import type { CreateServiceTypeInput, UpdateServiceTypeInput } from "./schemas";
import type {
  ServiceTypeFilters,
  ServiceTypeListItem,
} from "./types";

/* -------------------------------------------------------------------------- */
/*  Query key factory                                                         */
/* -------------------------------------------------------------------------- */

export const serviceTypeKeys = {
  all: ["service-types"] as const,
  list: (params: ServiceTypeFilters) =>
    [...serviceTypeKeys.all, "list", params] as const,
  detail: (id: string) => [...serviceTypeKeys.all, "detail", id] as const,
} as const;

/* -------------------------------------------------------------------------- */
/*  Service type list + detail                                                 */
/* -------------------------------------------------------------------------- */

export function useServiceTypes(
  params: ServiceTypeFilters = {},
  initialData?: ServiceTypeListItem[],
) {
  return useQuery({
    queryKey: serviceTypeKeys.list(params),
    queryFn: async () => {
      const result = await listServiceTypes(params);
      return result.data;
    },
    initialData,
    staleTime: 20_000,
  });
}

export function useServiceType(
  id: string,
  initialData?: ServiceTypeListItem,
) {
  return useQuery({
    queryKey: serviceTypeKeys.detail(id),
    queryFn: () => getServiceType(id),
    initialData,
    staleTime: 30_000,
  });
}

/* -------------------------------------------------------------------------- */
/*  Mutations                                                                 */
/* -------------------------------------------------------------------------- */

export function useCreateServiceTypeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      data,
      idempotencyKey,
    }: {
      data: CreateServiceTypeInput;
      idempotencyKey: string;
    }) => apiCreateServiceType(data, idempotencyKey),
    onSuccess(serviceType: ServiceTypeListItem) {
      void qc.invalidateQueries({ queryKey: serviceTypeKeys.all });
      void qc.setQueryData(serviceTypeKeys.detail(serviceType.id), serviceType);
    },
  });
}

export function useUpdateServiceTypeMutation(serviceTypeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      data,
      version,
    }: {
      data: UpdateServiceTypeInput;
      version: number;
    }) => apiUpdateServiceType(serviceTypeId, data, version),
    onSuccess(serviceType: ServiceTypeListItem) {
      qc.setQueryData(serviceTypeKeys.detail(serviceTypeId), serviceType);
      void qc.invalidateQueries({ queryKey: serviceTypeKeys.all });
    },
  });
}

/* -------------------------------------------------------------------------- */
/*  Permission helpers                                                         */
/* -------------------------------------------------------------------------- */

export function useServiceTypePermissions() {
  const { data: user } = useCurrentUser();
  if (!user) return { canManage: false };
  return {
    canManage: user.permissions.includes("config.manage"),
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