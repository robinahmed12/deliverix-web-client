"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut, Settings, ShieldCheck } from "lucide-react";
import { logoutAll } from "@/features/auth/api";
import { useCurrentUser } from "@/features/auth/queries";
import { initials } from "@/lib/utils/formatters";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user, isLoading, error } = useCurrentUser();

  const logoutMutation = useMutation({
    mutationFn: () => logoutAll(),
    onSuccess: () => {
      // AUTH-013: clear sensitive cached data before leaving.
      queryClient.clear();
      router.push("/login");
      router.refresh();
    },
    onError: () => {
      // Logout failure: still clear local cache and redirect so the user is not
      // left in an ambiguous session state on the browser side.
      queryClient.clear();
      router.push("/login");
      router.refresh();
    },
  });

  if (isLoading) {
    return <Skeleton className="h-8 w-8 rounded-full" />;
  }

  if (error || !user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-8 w-8 rounded-full"
          aria-label="Account menu"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/security">
            <ShieldCheck />
            <span>Security &amp; MFA</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            if (logoutMutation.isPending) {
              event.preventDefault();
              return;
            }
            logoutMutation.mutate();
          }}
          className="text-destructive focus:text-destructive"
        >
          <LogOut />
          <span>{logoutMutation.isPending ? "Signing out..." : "Log out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}