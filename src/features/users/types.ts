import type { UserStatus } from "@/lib/api/types";

export type { UserStatus };

export interface UserListItem {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  status: UserStatus;
  mfaEnabled: boolean;
  roles: string[];
  version: number;
  createdAt: string;
}

export type UserDetail = UserListItem;

export interface UserPageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface UserListPage {
  users: UserListItem[];
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export interface UserListPage {
  users: UserListItem[];
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export interface UserPage {
  data: UserListItem[];
  meta: UserPageMeta;
}

export const USER_STATUSES = [
  "Invited",
  "Active",
  "Suspended",
  "Inactive",
] as const satisfies readonly UserStatus[];

export const UPDATABLE_USER_STATUSES = [
  "Active",
  "Suspended",
  "Inactive",
] as const satisfies readonly UserStatus[];

export type UpdatableUserStatus = (typeof UPDATABLE_USER_STATUSES)[number];

export interface UserListFilters {
  status?: UserStatus;
  role?: string;
  search?: string;
}

export interface UserListParams extends UserListFilters {
  page?: number;
  pageSize?: number;
}

export interface CreateUserPayload {
  email: string;
  name: string;
  roleIds: string[];
  phone?: string;
}

export interface UpdateUserPayload {
  name?: string;
  phone?: string | null;
  status?: UpdatableUserStatus;
}

export interface SetUserRolesPayload {
  roleIds: string[];
}