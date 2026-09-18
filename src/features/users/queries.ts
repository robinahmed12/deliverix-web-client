import { useCallback, useRef, useEffect } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useCurrentUser } from "@/features/auth/queries";
import {
  listUsers,
  getUser,
  createUser as apiCreateUser,
  updateUser as apiUpdateUser,
  replaceUserRoles as apiReplaceUserRoles,
} from "./api";
import type {
  CreateUserPayload,
  SetUserRolesPayload,
  UpdateUserPayload,
  UserDetail,
  UserListFilters,
  UserListPage,
} from "./types";

/* -------------------------------------------------------------------------- */
/*  Query key factory                                                         */
/* -------------------------------------------------------------------------- */

export const userKeys = {
  all: ["users"] as const,
  list: (params: UserListFilters) => [...userKeys.all, "list", params] as const,
  detail: (id: string) => [...userKeys.all, "detail", id] as const,
} as const;

/* -------------------------------------------------------------------------- */
/*  Users – infinite list (offset pagination, load-more)                       */
/* -------------------------------------------------------------------------- */

export function useUsersInfinite(
  params: UserListFilters,
  initialData?: UserListPage,
  pageSize = 20,
) {
  return useInfiniteQuery({
    queryKey: userKeys.list(params),
    queryFn: async ({ pageParam }) => {
      const result = await listUsers({ ...params, page: pageParam, pageSize });
      return {
        users: result.data,
        page: result.meta.page,
        totalPages: result.meta.totalPages,
        hasMore: result.meta.page < result.meta.totalPages,
      } satisfies UserListPage;
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
/*  Single user                                                               */
/* -------------------------------------------------------------------------- */

export function useUser(id: string, initialData?: UserDetail) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => getUser(id),
    initialData,
    staleTime: 30_000,
  });
}

/* -------------------------------------------------------------------------- */
/*  Mutations                                                                 */
/* -------------------------------------------------------------------------- */

export function useCreateUserMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data, idempotencyKey }: { data: CreateUserPayload; idempotencyKey: string }) =>
      apiCreateUser(data, idempotencyKey),
    onSuccess(user: UserDetail) {
      void qc.invalidateQueries({ queryKey: userKeys.all });
      void qc.setQueryData(userKeys.detail(user.id), user);
    },
  });
}

export function useUpdateUserMutation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data, version }: { data: UpdateUserPayload; version: number }) =>
      apiUpdateUser(id, data, version),
    onSuccess(user: UserDetail) {
      qc.setQueryData(userKeys.detail(id), user);
      void qc.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useReplaceUserRolesMutation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SetUserRolesPayload) => apiReplaceUserRoles(id, data),
    onSuccess(user: UserDetail) {
      qc.setQueryData(userKeys.detail(id), user);
      void qc.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

/* -------------------------------------------------------------------------- */
/*  Permission helpers                                                         */
/* -------------------------------------------------------------------------- */

export function useUserPermissions() {
  const { data: user } = useCurrentUser();
  if (!user) return { canView: false, canManage: false };
  return {
    canView:
      user.permissions.includes("users.view") ||
      user.permissions.includes("users.manage"),
    canManage: user.permissions.includes("users.manage"),
  };
}

/* -------------------------------------------------------------------------- */
/*  Idempotency key helper (payload-stable)                                    */
/* -------------------------------------------------------------------------- */

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
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
    const key = `${prefix}-${await sha256Hex(serialized)}`;
    prevRef.current = serialized;
    ref.current = key;
    return key;
  }, [prefix]);

  return getKey;
}