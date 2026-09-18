import { Suspense } from "react";
import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server-client";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { RolesView } from "@/features/roles/roles-view";
import type { RoleListItem } from "@/features/roles/types";
import type { DataResponse } from "@/lib/api/types";

export const metadata: Metadata = { title: "Roles" };

async function loadRoles(): Promise<RoleListItem[]> {
  const result = await serverFetch<DataResponse<RoleListItem[]>>("/roles");
  return result.data;
}

export default async function RolesPage() {
  let initialRoles: RoleListItem[] | undefined;
  try {
    initialRoles = await loadRoles();
  } catch {
    // Roles page keeps rendering with an empty list even if the backend is
    // momentarily unavailable; the client view retries.
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Settings" },
          { label: "Users", href: "/settings/users" },
          { label: "Roles" },
        ]}
      />
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-8 w-64 rounded-lg bg-muted" />
            <div className="h-[400px] rounded-lg border bg-muted/20" />
          </div>
        }
      >
        <RolesView initialRoles={initialRoles ?? []} />
      </Suspense>
    </div>
  );
}