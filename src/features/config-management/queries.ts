import { useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateProofPolicy as apiActivateProofPolicy,
  createFailureReason as apiCreateFailureReason,
  createProofPolicy as apiCreateProofPolicy,
  listFailureReasons,
  listProofPolicies,
  listSettings,
  updateFailureReason as apiUpdateFailureReason,
  updateSetting as apiUpdateSetting,
} from "./api";
import type {
  CreateFailureReasonInput,
  CreateProofPolicyInput,
  SettingListResponse,
  UpdateFailureReasonInput,
} from "./types";

export const configKeys = {
  all: ["config"] as const,
  failureReasons: ["config", "failureReasons"] as const,
  proofPolicies: ["config", "proofPolicies"] as const,
  settings: ["config", "settings"] as const,
} as const;

/* -------------------------------------------------------------------------- */
/*  Reads                                                                     */
/* -------------------------------------------------------------------------- */

export function useFailureReasons() {
  return useQuery({
    queryKey: configKeys.failureReasons,
    queryFn: () => listFailureReasons(),
    staleTime: 30_000,
  });
}

export function useProofPolicies() {
  return useQuery({
    queryKey: configKeys.proofPolicies,
    queryFn: () => listProofPolicies(),
    staleTime: 30_000,
  });
}

export function useSystemSettings() {
  return useQuery({
    queryKey: configKeys.settings,
    queryFn: () => listSettings(),
    staleTime: 30_000,
  });
}

/* -------------------------------------------------------------------------- */
/*  Mutations                                                                 */
/* -------------------------------------------------------------------------- */

export function useCreateFailureReasonMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      data,
      idempotencyKey,
    }: {
      data: CreateFailureReasonInput;
      idempotencyKey: string;
    }) => apiCreateFailureReason(data, idempotencyKey),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: configKeys.failureReasons });
    },
  });
}

export function useUpdateFailureReasonMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateFailureReasonInput;
    }) => apiUpdateFailureReason(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: configKeys.failureReasons });
    },
  });
}

export function useCreateProofPolicyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      data,
      idempotencyKey,
    }: {
      data: CreateProofPolicyInput;
      idempotencyKey: string;
    }) => apiCreateProofPolicy(data, idempotencyKey),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: configKeys.proofPolicies });
    },
  });
}

export function useActivateProofPolicyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiActivateProofPolicy(id, active),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: configKeys.proofPolicies });
    },
  });
}

export function useUpdateSettingMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      apiUpdateSetting(key, value),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: configKeys.settings });
      void qc.setQueryData(configKeys.settings, (old: SettingListResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((s) =>
            s.key === result.key ? { ...s, value: result.value, updatedAt: result.updatedAt } : s,
          ),
        };
      });
    },
  });
}

/* -------------------------------------------------------------------------- */
/*  Idempotency keys                                                          */
/* -------------------------------------------------------------------------- */

async function sha256Hex(value: string): Promise<string> {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

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
    if (prevRef.current !== serialized) ref.current = null;
    const key = `${prefix}-${await sha256Hex(serialized)}`;
    prevRef.current = serialized;
    ref.current = key;
    return key;
  }, [prefix]);

  return getKey;
}