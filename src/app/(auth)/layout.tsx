import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Auth-group layout. Redirects already-signed-in users away from public auth
 * pages; protects nothing else (the backend is the authority).
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

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}