"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { setSessionExpiredHandler } from "@/lib/api/session";

/**
 * Registers the session-expired callback (AUTH-013). When the API client
 * determines a refresh failing permanently, the query cache is cleared and the
 * user is taken to the login page.
 */
export function SessionWatcher() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    setSessionExpiredHandler(() => {
      queryClient.clear();
      router.replace("/login");
      router.refresh();
    });
    return () => {
      // keep the handler registered for the app lifetime; Next navigation does
      // not unmount this component under the app layout.
    };
  }, [router, queryClient]);

  return null;
}