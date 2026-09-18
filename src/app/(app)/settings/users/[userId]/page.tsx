import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { serverFetch } from "@/lib/api/server-client";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { UserDetailView } from "@/features/users/components/user-detail-view";
import type { UserDetail } from "@/features/users/types";
import type { DataResponse } from "@/lib/api/types";

export const metadata: Metadata = { title: "User" };

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  let initialUser: UserDetail;
  try {
    const result = await serverFetch<DataResponse<UserDetail>>(`/users/${userId}`);
    if (!result.data) notFound();
    initialUser = result.data;
  } catch (error) {
    console.error(`Failed to load user ${userId}:`, error);
    notFound();
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Settings", href: "/settings" },
          { label: "Users", href: "/settings/users" },
          { label: initialUser.name },
        ]}
      />
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-24 rounded-lg border bg-muted/20" />
            <div className="h-40 rounded-lg border bg-muted/20" />
          </div>
        }
      >
        <UserDetailView userId={userId} initialUser={initialUser} />
      </Suspense>
    </div>
  );
}