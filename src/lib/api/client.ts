import {
  ApiError,
  type ProblemDetails,
  isSessionError,
} from "@/lib/api/errors";
import { notifySessionExpired, refreshSession } from "@/lib/api/session";
import type { DataResponse } from "@/lib/api/types";

const BASE_PATH = "/api/v1";

async function parseJsonResponse(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (text.length === 0) return undefined;
  return JSON.parse(text);
}

function problemFromUnknown(
  body: unknown,
  status: number,
  fallbackDetail: string,
): ProblemDetails {
  if (body && typeof body === "object") {
    const obj = body as Record<string, unknown>;
    return {
      type: typeof obj.type === "string" ? obj.type : undefined,
      title: typeof obj.title === "string" ? obj.title : undefined,
      status,
      detail: typeof obj.detail === "string" ? obj.detail : fallbackDetail,
      code: typeof obj.code === "string" ? obj.code : undefined,
      requestId: typeof obj.requestId === "string" ? obj.requestId : undefined,
      errors: obj.errors,
    };
  }
  return { status, detail: fallbackDetail };
}

/** Auth endpoints are excluded from automatic refresh handling to avoid loops. */
function isAuthEndpoint(path: string): boolean {
  const normalized = path.startsWith(BASE_PATH)
    ? path.slice(BASE_PATH.length)
    : path;
  return (
    normalized.startsWith("/auth/login") ||
    normalized.startsWith("/auth/refresh") ||
    normalized.startsWith("/auth/mfa") ||
    normalized.startsWith("/auth/forgot-password") ||
    normalized.startsWith("/auth/reset-password") ||
    normalized.startsWith("/auth/accept-invitation")
  );
}

async function executeRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_PATH}${path}`, {
    ...init,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (response.ok) {
    const body = await parseJsonResponse(response);
    if (body === undefined) return undefined as T;
    if (
      typeof body === "object" &&
      body !== null &&
      "data" in (body as Record<string, unknown>)
    ) {
      return (body as DataResponse<T>).data;
    }
    return body as unknown as T;
  }

  const body = await parseJsonResponse(response);
  const problem = problemFromUnknown(body, response.status, response.statusText);

  throw new ApiError({
    message: problem.detail ?? "Request failed",
    kind: "http",
    status: response.status,
    code: problem.code,
    requestId: problem.requestId,
    detail: problem.detail,
    problem,
  });
}

function isAbort(error: unknown): boolean {
  return (
    error instanceof DOMException && error.name === "AbortError"
  );
}

/**
 * Browser API client.
 *
 * - Same-origin `/api/v1` calls (proxied to the backend by next.config rewrites).
 * - Unwraps the `{ data: ... }` envelope used by the backend.
 * - Normalizes HTTP/network/abort failures into ApiError (ERR-001, API-008).
 * - On a 401 from a non-auth endpoint: attempts one deduplicated session refresh,
 *   then retries the request once. If refresh fails, emits session-expired.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    return await executeRequest<T>(path, init);
  } catch (error) {
    if (!(error instanceof ApiError)) {
      if (isAbort(error)) {
        throw new ApiError({
          message: "Request was aborted",
          kind: "abort",
          cause: error,
        });
      }
      throw new ApiError({
        message: "A network error occurred",
        kind: "network",
        cause: error,
      });
    }

    if (isSessionError(error) && !isAuthEndpoint(path)) {
      const refreshed = await refreshSession(async () => {
        const result = await executeRequest<{ rotated: true } | undefined>(
          "/auth/refresh",
          { method: "POST", body: JSON.stringify({}) },
        );
        return result !== undefined;
      });

      if (refreshed) {
        return executeRequest<T>(path, init);
      }

      notifySessionExpired();
    }

    throw error;
  }
}

/**
 * Auth-flow API caller that never triggers automatic refresh/redirect handling.
 * Used by login, MFA verification, and password-reset endpoints where a 401 is a
 * normal signal (wrong credentials, expired token) rather than a stale session.
 */
export async function apiAuthFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return executeRequest<T>(path, init);
}