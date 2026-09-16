export type ProblemDetails = {
  type?: string;
  title?: string;
  status: number;
  detail?: string;
  code?: string;
  requestId?: string;
  errors?: unknown;
};

export type ApiErrorKind = "network" | "http" | "abort" | "parse";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly code?: string;
  readonly requestId?: string;
  readonly detail?: string;
  readonly problem?: ProblemDetails;

  constructor(params: {
    message: string;
    kind: ApiErrorKind;
    status?: number;
    code?: string;
    requestId?: string;
    detail?: string;
    problem?: ProblemDetails;
    cause?: unknown;
  }) {
    super(params.message, { cause: params.cause });
    this.name = "ApiError";
    this.kind = params.kind;
    this.status = params.status;
    this.code = params.code;
    this.requestId = params.requestId;
    this.detail = params.detail;
    this.problem = params.problem;
  }
}

/**
 * Retry classification used by the central query client.
 * Only transient network failures and selected 5xx responses are retried
 * (QUERY-006/007). 4xx business errors are never auto-retried.
 */
export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.kind === "network") return true;
  if (error.kind !== "http") return false;
  if (error.status === undefined) return false;
  if (error.status >= 500 && error.status <= 599) {
    // 501, 505 are not worth retrying
    return error.status !== 501 && error.status !== 505;
  }
  return false;
}

export function isSessionError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.kind === "http" && error.status === 401;
}

export function isAbortError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.kind === "abort";
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

const NETWORK_MESSAGE = "Network error. Please check your connection and try again.";
const UNAUTHORIZED_MESSAGE = "Your session has expired or is invalid. Please sign in again.";
const FORBIDDEN_MESSAGE = "You do not have permission to perform this action.";
const NOT_FOUND_MESSAGE = "The requested resource was not found.";
const CONFLICT_MESSAGE = "The resource was changed by another user. Please refresh and try again.";
const STALE_MESSAGE = "This item has changed since you loaded it. Please refresh and try again.";
const PRECONDITION_REQUIRED_MESSAGE =
  "A required concurrency precondition is missing. Please reload the resource and try again.";
const VALIDATION_MESSAGE = "Please check your input and try again.";
const RATE_LIMIT_MESSAGE = "Too many requests. Please wait a moment and try again.";
const SERVICE_UNAVAILABLE_MESSAGE = "The service is temporarily unavailable. Please try again shortly.";
const GENERIC_MESSAGE = "An unexpected error occurred. Please try again.";

export function messageFor(error: unknown, fallback = GENERIC_MESSAGE): string {
  if (!(error instanceof ApiError)) return fallback;

  switch (error.kind) {
    case "network":
      return NETWORK_MESSAGE;
    case "abort":
      return "Request was cancelled.";
    case "parse":
    case "http":
      break;
  }

  switch (error.status) {
    case 400:
    case 422:
      return error.detail && error.detail.length > 0 ? error.detail : VALIDATION_MESSAGE;
    case 401:
      return UNAUTHORIZED_MESSAGE;
    case 403:
      return FORBIDDEN_MESSAGE;
    case 404:
      return NOT_FOUND_MESSAGE;
    case 409:
      return error.detail && error.detail.length > 0 ? error.detail : CONFLICT_MESSAGE;
    case 412:
      return error.detail && error.detail.length > 0 ? error.detail : STALE_MESSAGE;
    case 413:
      return "The file or request is too large.";
    case 415:
      return "The file type is not supported.";
    case 428:
      return error.detail && error.detail.length > 0 ? error.detail : PRECONDITION_REQUIRED_MESSAGE;
    case 429:
      return error.detail && error.detail.length > 0 ? error.detail : RATE_LIMIT_MESSAGE;
    case 503:
      return SERVICE_UNAVAILABLE_MESSAGE;
    default:
      break;
  }

  return error.detail && error.detail.length > 0 ? error.detail : fallback;
}