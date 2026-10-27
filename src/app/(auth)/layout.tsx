import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/shared/auth-shell";

/**
 * Auth-group layout. Redirects already-signed-in users away from auth pages
 * they should not reach by self-navigation (login, register, forgot-password).
 *
 * Emailed links must render even when the browser holds session cookies —
 * an admin opening an invite link in a logged-in browser is the norm — so
 * those pages live in the `(public)` group instead.
 *
 * Desktop: split-screen — brand/hero text panel on the left, the page's form
 * column on the right. Below `lg` the hero collapses and pages render just
 * the form column with a compact brand header.
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const hasSession =
    cookieStore.has("access_token") || cookieStore.has("refresh_token");
  if (hasSession) {
    redirect("/dashboard");
  }

  return <AuthShell>{children}</AuthShell>;
}
