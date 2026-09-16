import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shared/app-shell";

/**
 * Protected app group. Cheap cookie-presence guard on the server (AUTH-006/007);
 * full session validation happens client-side via /auth/me where refresh token
 * rotation can correctly set new cookies in the browser.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const hasSession =
    cookieStore.has("access_token") || cookieStore.has("refresh_token");

  if (!hasSession) {
    redirect("/login");
  }

  return <AppShell>{children}</AppShell>;
}