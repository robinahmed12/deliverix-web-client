import { useCallback, useRef, useEffect } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useCurrentUser } from "@/features/auth/queries";
import {
  listZones,
  getZone,
  createZone as apiCreateZone,
  updateZone as apiUpdateZone,
} from "./api";
import type {
  CreateZonePayload,
  UpdateZonePayload,
  ZoneDetail,
  ZoneFilters,
  ZoneListItem,
} from "./types";

/* -------------------------------------------------------------------------- */
/*  Query key factory                                                         */
/* -------------------------------------------------------------------------- */

export const zoneKeys = {
  all: ["zones"] as const,
  list: (params: ZoneFilters) => [...zoneKeys.all, "list", params] as const,
  detail: (id: string) => [...zoneKeys.all, "detail", id] as const,
} as const;

/* -------------------------------------------------------------------------- */
/*  Zone list + detail                                                         */
/* -------------------------------------------------------------------------- */

export function useZones(
  params: ZoneFilters = {},
  initialData?: ZoneListItem[],
) {
  return useQuery({
    queryKey: zoneKeys.list(params),
    queryFn: async () => {
      const result = await listZones(params);
      return result.data;
    },
    initialData,
    staleTime: 20_000,
  });
}

export function useZone(id: string, initialData?: ZoneDetail) {
  return useQuery({
    queryKey: zoneKeys.detail(id),
    queryFn: () => getZone(id),
    initialData,
    staleTime: 30_000,
  });
}

/* -------------------------------------------------------------------------- */
/*  Mutations                                                                 */
/* -------------------------------------------------------------------------- */

export function useCreateZoneMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      data,
      idempotencyKey,
    }: {
      data: CreateZonePayload;
      idempotencyKey: string;
    }) => apiCreateZone(data, idempotencyKey),
    onSuccess(zone: ZoneListItem) {
      void qc.invalidateQueries({ queryKey: zoneKeys.all });
      void qc.setQueryData(zoneKeys.detail(zone.id), zone);
    },
  });
}

export function useUpdateZoneMutation(zoneId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      data,
      version,
    }: {
      data: UpdateZonePayload;
      version: number;
    }) => apiUpdateZone(zoneId, data, version),
    onSuccess(zone: ZoneListItem) {
      qc.setQueryData(zoneKeys.detail(zoneId), zone);
      void qc.invalidateQueries({ queryKey: zoneKeys.all });
    },
  });
}

/* -------------------------------------------------------------------------- */
/*  Permission helpers                                                         */
/* -------------------------------------------------------------------------- */

export function useZonePermissions() {
  const { data: user } = useCurrentUser();
  if (!user) return { canManage: false };
  return {
    canManage: user.permissions.includes("zones.manage"),
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