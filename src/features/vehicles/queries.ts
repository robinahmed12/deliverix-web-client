import { useCallback, useRef, useEffect } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useCurrentUser } from "@/features/auth/queries";
import { listDrivers } from "@/features/drivers/api";
import {
  listVehicles,
  getVehicle,
  createVehicle as apiCreateVehicle,
  updateVehicle as apiUpdateVehicle,
  allocateVehicle as apiAllocateVehicle,
  deallocateVehicle as apiDeallocateVehicle,
} from "./api";
import type {
  AllocateVehicleInput,
  CreateVehicleInput,
  UpdateVehicleInput,
} from "./schemas";
import type {
  VehicleDetail,
  VehicleListFilters,
  VehicleListPage,
  VehicleListItem,
} from "./types";

/* -------------------------------------------------------------------------- */
/*  Query key factory                                                         */
/* -------------------------------------------------------------------------- */

export const vehicleKeys = {
  all: ["vehicles"] as const,
  list: (params: Omit<VehicleListFilters, "page">) =>
    [...vehicleKeys.all, "list", params] as const,
  detail: (id: string) => [...vehicleKeys.all, "detail", id] as const,
  drivers: (search?: string) => ["vehicle-drivers", search ?? ""] as const,
} as const;

/* -------------------------------------------------------------------------- */
/*  Vehicles – infinite list (offset pagination, load-more)                    */
/* -------------------------------------------------------------------------- */

export function useVehiclesInfinite(
  params: Omit<VehicleListFilters, "page">,
  initialData?: VehicleListPage,
  pageSize = 20,
) {
  return useInfiniteQuery({
    queryKey: vehicleKeys.list(params),
    queryFn: async ({ pageParam }) => {
      const result = await listVehicles({ ...params, page: pageParam, pageSize });
      return {
        vehicles: result.data,
        page: result.meta.page,
        totalPages: result.meta.totalPages,
        hasMore: result.meta.page < result.meta.totalPages,
      } satisfies VehicleListPage;
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
/*  Single vehicle detail                                                       */
/* -------------------------------------------------------------------------- */

export function useVehicle(id: string, initialData?: VehicleDetail) {
  return useQuery({
    queryKey: vehicleKeys.detail(id),
    queryFn: () => getVehicle(id),
    initialData,
    staleTime: 30_000,
  });
}

/* -------------------------------------------------------------------------- */
/*  Driver search (allocate-vehicle picker)                                    */
/* -------------------------------------------------------------------------- */

export function useDriverSearch(search: string) {
  return useQuery({
    queryKey: vehicleKeys.drivers(search),
    queryFn: async () => {
      const result = await listDrivers({ search, pageSize: 20 });
      return result.data;
    },
    staleTime: 60_000,
    enabled: search.trim().length >= 1,
  });
}

/* -------------------------------------------------------------------------- */
/*  Mutations                                                                 */
/* -------------------------------------------------------------------------- */

export function useCreateVehicleMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      data,
      idempotencyKey,
    }: {
      data: CreateVehicleInput;
      idempotencyKey: string;
    }) => apiCreateVehicle(data, idempotencyKey),
    onSuccess(vehicle: VehicleListItem) {
      void qc.invalidateQueries({ queryKey: vehicleKeys.all });
      void qc.setQueryData(vehicleKeys.detail(vehicle.id), vehicle);
    },
  });
}

export function useUpdateVehicleMutation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      data,
      version,
    }: {
      data: UpdateVehicleInput;
      version: number;
    }) => apiUpdateVehicle(id, data, version),
    onSuccess(vehicle: VehicleListItem) {
      qc.setQueryData(vehicleKeys.detail(id), vehicle);
      void qc.invalidateQueries({ queryKey: vehicleKeys.all });
    },
  });
}

export function useAllocateVehicleMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
      idempotencyKey,
    }: {
      id: string;
      data: AllocateVehicleInput;
      idempotencyKey: string;
    }) => apiAllocateVehicle(id, data, idempotencyKey),
    onSuccess() {
      void qc.invalidateQueries({ queryKey: vehicleKeys.all });
      void qc.invalidateQueries({ queryKey: ["drivers"] });
    },
  });
}

export function useDeallocateVehicleMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      idempotencyKey,
    }: {
      id: string;
      idempotencyKey: string;
    }) => apiDeallocateVehicle(id, {}, idempotencyKey),
    onSuccess() {
      void qc.invalidateQueries({ queryKey: vehicleKeys.all });
      void qc.invalidateQueries({ queryKey: ["drivers"] });
    },
  });
}

/* -------------------------------------------------------------------------- */
/*  Permission helpers                                                         */
/* -------------------------------------------------------------------------- */

export function useVehiclePermissions() {
  const { data: user } = useCurrentUser();
  if (!user) return { canView: false, canManage: false };
  return {
    canView: user.permissions.some((p) =>
      ["drivers.view", "vehicles.view", "dispatch.view-queue"].includes(p),
    ),
    canManage: user.permissions.some((p) =>
      ["drivers.manage", "vehicles.manage"].includes(p),
    ),
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