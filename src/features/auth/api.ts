import { apiAuthFetch, apiFetch } from "@/lib/api/client";
import type {
  CurrentUser,
  LoginChallenge,
  MessageResponse,
  MfaEnrollment,
} from "@/lib/api/types";

/**
 * Auth API functions. All responses are unwrapped from the `{ data: ... }` envelope
 * by the shared client. Auth endpoints use apiAuthFetch so 401 responses are never
 * misinterpreted as stale sessions (they are normal signals for wrong credentials /
 * expired reset tokens).
 */

export async function login(
  email: string,
  password: string,
): Promise<CurrentUser | LoginChallenge> {
  return apiAuthFetch<CurrentUser | LoginChallenge>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function verifyMfa(
  mfaToken: string,
  code: string,
): Promise<CurrentUser> {
  return apiAuthFetch<CurrentUser>("/auth/mfa/verify", {
    method: "POST",
    body: JSON.stringify({ mfaToken, code }),
  });
}

export async function logout(): Promise<void> {
  await apiFetch<void>("/auth/logout", { method: "POST" });
}

export async function logoutAll(): Promise<void> {
  await apiFetch<void>("/auth/logout-all", { method: "POST" });
}

export async function forgotPassword(
  email: string,
): Promise<MessageResponse> {
  return apiAuthFetch<MessageResponse>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<MessageResponse> {
  return apiAuthFetch<MessageResponse>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

export async function acceptInvitation(
  token: string,
  password: string,
  name: string,
): Promise<CurrentUser> {
  return apiAuthFetch<CurrentUser>("/auth/accept-invitation", {
    method: "POST",
    body: JSON.stringify({ token, password, name }),
  });
}

export async function getMe(): Promise<CurrentUser> {
  return apiFetch<CurrentUser>("/auth/me");
}

export async function startMfaEnrollment(): Promise<MfaEnrollment> {
  return apiFetch<MfaEnrollment>("/auth/mfa/enrollment", {
    method: "POST",
  });
}

export async function confirmMfaEnrollment(
  code: string,
): Promise<MessageResponse> {
  return apiFetch<MessageResponse>("/auth/mfa/enrollment/confirm", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}