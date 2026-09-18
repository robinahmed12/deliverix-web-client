import { Suspense } from "react";
import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server-client";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import {
  UsersExplorer,
  type UsersExplorerInitialFilters,
} from "@/features/users/components/users-explorer";
import { userListParamsSchema } from "@/features/users/schemas";
import type { UserListItem, UserPage } from "@/features/users/types";

export const metadata: Metadata = { title: "Users" };

async function loadUsers(
  filters: UsersExplorerInitialFilters,
): Promise<UserListItem[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.role) params.set("role", filters.role);
  if (filters.search) params.set("search", filters.search);
  params.set("page", "1");
  params.set("pageSize", "20");
  const qs = params.toString();
  const result = await serverFetch<UserPage>(`/users${qs ? `?${qs}` : ""}`);
  return result.data;
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const { status, role, search } = userListParamsSchema.parse(raw);

  const filters: UsersExplorerInitialFilters = { status, role, search };

  let initialUsers: UserListItem[] | undefined;
  try {
    initialUsers = await loadUsers(filters);
  } catch {
    // Users page keeps rendering with an empty list even if the backend is
    // momentarily unavailable; the client explorer retries.
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: "Settings" }, { label: "Users" }]} />
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="h-8 w-64 rounded-lg bg-muted" />
              <div className="h-8 w-32 rounded-lg bg-muted" />
            </div>
            <div className="h-[400px] rounded-lg border bg-muted/20" />
          </div>
        }
      >
        <UsersExplorer
          initialResult={{ users: initialUsers ?? [] }}
          initialFilters={filters}
        />
      </Suspense>
    </div>
  );
}