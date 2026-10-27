import { AuthShell } from "@/components/shared/auth-shell";

/**
 * Public group for pages reached via emailed links — accepting an
 * invitation and resetting a password. These must render regardless of
 * whether the browser currently holds a session cookie: an admin opening
 * an invitation link in a logged-in browser is the normal flow, and
 * bouncing them to /dashboard (like the `(auth)` group does) makes the
 * link unusable.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
