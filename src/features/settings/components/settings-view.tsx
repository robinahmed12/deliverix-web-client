"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut, ShieldCheck, UserCog, Wrench } from "lucide-react";
import { logoutAll } from "@/features/auth/api";
import { useCurrentUser } from "@/features/auth/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { initials } from "@/lib/utils/formatters";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function SettingsView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user, isLoading, error } = useCurrentUser();

  const logoutMutation = useMutation({
    mutationFn: () => logoutAll(),
    onSuccess: () => {
      queryClient.clear();
      router.push("/login");
      router.refresh();
    },
  });

  if (isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  if (error || !user) {
    return null;
  }

  const canManageConfig = user.permissions.includes("config.manage");
  const canManageUsers =
    user.permissions.includes("users.view") ||
    user.permissions.includes("users.manage");

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{initials(user.name)}</AvatarFallback>
            </Avatar>
            <span>{user.name}</span>
          </CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Status:</span>
            <Badge variant={user.status === "Active" ? "default" : "secondary"}>
              {user.status}
            </Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Roles:</span>{" "}
            {user.roles.join(", ")}
          </div>
          <div>
            <span className="text-muted-foreground">Permissions:</span>{" "}
            {user.permissions.length} assigned
          </div>
          {user.mfaEnabled && (
            <div>
              <span className="text-muted-foreground">MFA:</span>{" "}
              <Badge variant="secondary">Enabled</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Security and system configuration.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild variant="outline" className="justify-start">
            <Link href="/settings/security">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Security &amp; MFA
            </Link>
          </Button>
          {canManageConfig && (
            <Button asChild variant="outline" className="justify-start">
              <Link href="/settings/config">
                <Wrench className="mr-2 h-4 w-4" />
                System configuration
              </Link>
            </Button>
          )}
          {canManageUsers && (
            <Button asChild variant="outline" className="justify-start">
              <Link href="/settings/users">
                <UserCog className="mr-2 h-4 w-4" />
                Users &amp; roles
              </Link>
            </Button>
          )}
          <Button
            variant="destructive"
            className="justify-start"
            disabled={logoutMutation.isPending}
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {logoutMutation.isPending
              ? "Signing out…"
              : "Sign out all devices"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}