/**
 * Hand-written DTO types mirroring the backend response/request shapes.
 *
 * NOTE: This is a deliberate deviation from frontend SRS API-001..004 (backend
 * OpenAPI is not generated in this project). These types are a manual snapshot of
 * the backend contract and MUST be kept in sync with `../modules` DTOs. Revisit
 * OpenAPI generation if the contract begins to drift.
 */

export type UserStatus = "Invited" | "Active" | "Inactive" | "Suspended";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  mfaEnabled: boolean;
  roles: string[];
  permissions: string[];
}

export interface DataResponse<T> {
  data: T;
}

export interface PageMeta {
  nextCursor: string | null;
  hasMore: boolean;
  pageSize: number;
  total?: number;
  [key: string]: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PageMeta;
}

export interface MessageResponse {
  message: string;
}

export interface MfaEnrollment {
  secret: string;
  otpauthUrl: string;
}

export interface LoginChallenge {
  mfaRequired: true;
  mfaToken: string;
}