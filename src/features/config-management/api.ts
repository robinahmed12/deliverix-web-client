import { apiFetch, type ApiFetchOptions } from "@/lib/api/client";
import type {
  CreateFailureReasonInput,
  CreateProofPolicyInput,
  FailureReason,
  FailureReasonListResponse,
  ProofPolicyListResponse,
  ProofPolicySummary,
  SettingListResponse,
  SystemSettingUpdated,
  UpdateFailureReasonInput,
} from "./types";

/* -------------------------------------------------------------------------- */
/*  Failure reasons                                                           */
/* -------------------------------------------------------------------------- */

export function listFailureReasons(
  opts?: ApiFetchOptions,
): Promise<FailureReasonListResponse> {
  return apiFetch("/failure-reasons", opts);
}

export function createFailureReason(
  data: CreateFailureReasonInput,
  idempotencyKey?: string,
): Promise<FailureReason> {
  return apiFetch("/failure-reasons", {
    method: "POST",
    body: JSON.stringify(data),
    idempotencyKey,
  });
}

export function updateFailureReason(
  id: string,
  data: UpdateFailureReasonInput,
): Promise<FailureReason> {
  return apiFetch(`/failure-reasons/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/* -------------------------------------------------------------------------- */
/*  Proof policies                                                            */
/* -------------------------------------------------------------------------- */

export function listProofPolicies(
  opts?: ApiFetchOptions,
): Promise<ProofPolicyListResponse> {
  return apiFetch("/proof-policies", opts);
}

export function createProofPolicy(
  data: CreateProofPolicyInput,
  idempotencyKey?: string,
): Promise<ProofPolicySummary> {
  return apiFetch("/proof-policies", {
    method: "POST",
    body: JSON.stringify(data),
    idempotencyKey,
  });
}

export function activateProofPolicy(
  id: string,
  active: boolean,
): Promise<ProofPolicySummary> {
  return apiFetch(`/proof-policies/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ active }),
  });
}

/* -------------------------------------------------------------------------- */
/*  System settings (config.manage)                                           */
/* -------------------------------------------------------------------------- */

export function listSettings(
  opts?: ApiFetchOptions,
): Promise<SettingListResponse> {
  return apiFetch("/settings", opts);
}

export function updateSetting(
  key: string,
  value: unknown,
): Promise<SystemSettingUpdated> {
  return apiFetch(`/settings/${encodeURIComponent(key)}`, {
    method: "PATCH",
    body: JSON.stringify({ value }),
  });
}