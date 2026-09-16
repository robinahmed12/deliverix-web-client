import { useCallback, useRef, useEffect } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useCurrentUser } from "@/features/auth/queries";
import {
  listDrivers,
  getDriver,
  createDriver as apiCreateDriver,
  updateDriver as apiUpdateDriver,
  listUsers,
} from "./api";
import type { CreateDriverInput, UpdateDriverInput } from "./schemas";
import type {
  DriverDetail,
  DriverListFilters,
  DriverListPage,
  DriverListItem,
} from "./types";

/* -------------------------------------------------------------------------- */
/*  Query key factory                                                         */
/* -------------------------------------------------------------------------- */

export const driverKeys = {
  all: ["drivers"] as const,
  list: (params: Omit<DriverListFilters, "page">) =>
    [...driverKeys.all, "list", params] as const,
  detail: (id: string) => [...driverKeys.all, "detail", id] as const,
  users: (search?: string) => ["user-accounts", search ?? ""] as const,
} as const;

/* -------------------------------------------------------------------------- */
/*  Drivers – infinite list (offset pagination, load-more)                     */
/* -------------------------------------------------------------------------- */

export function useDriversInfinite(
  params: Omit<DriverListFilters, "page">,
  initialData?: DriverListPage,
  pageSize = 20,
) {
  return useInfiniteQuery({
    queryKey: driverKeys.list(params),
    queryFn: async ({ pageParam }) => {
      const result = await listDrivers({ ...params, page: pageParam, pageSize });
      return {
        drivers: result.data,
        page: result.meta.page,
        totalPages: result.meta.totalPages,
        hasMore: result.meta.page < result.meta.totalPages,
      } satisfies DriverListPage;
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
/*  Single driver detail                                                       */
/* -------------------------------------------------------------------------- */

export function useDriver(id: string, initialData?: DriverDetail) {
  return useQuery({
    queryKey: driverKeys.detail(id),
    queryFn: () => getDriver(id),
    initialData,
    staleTime: 30_000,
  });
}

/* -------------------------------------------------------------------------- */
/*  User account search (create-driver account picker)                         */
/* -------------------------------------------------------------------------- */

export function useUserSearch(search: string) {
  return useQuery({
    queryKey: driverKeys.users(search),
    queryFn: async () => {
      const result = await listUsers({ search, pageSize: 20 });
      return result.data;
    },
    staleTime: 60_000,
    enabled: search.trim().length >= 1,
  });
}

/* -------------------------------------------------------------------------- */
/*  Mutations                                                                 */
/* -------------------------------------------------------------------------- */

export function useCreateDriverMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      data,
      idempotencyKey,
    }: {
      data: CreateDriverInput;
      idempotencyKey: string;
    }) => apiCreateDriver(data, idempotencyKey),
    onSuccess(driver: DriverListItem) {
      void qc.invalidateQueries({ queryKey: driverKeys.all });
      void qc.setQueryData(driverKeys.detail(driver.id), driver);
    },
  });
}

export function useUpdateDriverMutation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      data,
      version,
    }: {
      data: UpdateDriverInput;
      version: number;
    }) => apiUpdateDriver(id, data, version),
    onSuccess(driver: DriverListItem) {
      qc.setQueryData(driverKeys.detail(id), driver);
      void qc.invalidateQueries({ queryKey: driverKeys.all });
    },
  });
}

/* -------------------------------------------------------------------------- */
/*  Permission helpers                                                         */
/* -------------------------------------------------------------------------- */

export function useDriverPermissions() {
  const { data: user } = useCurrentUser();
  if (!user) return { canView: false, canManage: false };
  return {
    canView: user.permissions.includes("drivers.view"),
    canManage: user.permissions.includes("drivers.manage"),
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