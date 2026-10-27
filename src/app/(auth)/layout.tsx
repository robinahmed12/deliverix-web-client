import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Auth-group layout. Redirects already-signed-in users away from public auth
 * pages; protects nothing else (the backend is the authority).
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

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Hero / brand panel (desktop only) */}
      <div className="relative hidden flex-col overflow-hidden bg-primary p-12 text-primary-foreground lg:flex xl:p-16">
        {/* Decorative glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 80% 15%, rgb(255 255 255 / 16%), transparent 55%), radial-gradient(ellipse at 20% 95%, rgb(0 0 0 / 22%), transparent 60%)",
          }}
        />

        <div className="relative z-10 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-background/15 text-xl font-black backdrop-blur-sm">
            D
          </span>
          <span className="text-lg font-semibold tracking-tight">
            Deliverix
          </span>
        </div>

        <div className="relative z-10 my-auto space-y-6">
          <h1 className="max-w-xl text-4xl font-bold leading-[1.15] tracking-tight xl:text-5xl">
            Every delivery, from dispatch to doorstep — under control.
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-primary-foreground/75">
            One workspace for orders, dispatch, drivers, and proof of delivery.
            Track every package and keep your customers in the loop.
          </p>

          <ul className="mt-2 space-y-4">
            {[
              {
                title: "Smart dispatch",
                body: "Assign eligible drivers and let offers expire safely on their own.",
              },
              {
                title: "Live tracking",
                body: "Customers follow their order without calling support.",
              },
              {
                title: "Proof of delivery",
                body: "Photo, name, and signature captured in one flow.",
              },
            ].map((item) => (
              <li key={item.title} className="flex gap-4">
                <span
                  aria-hidden
                  className="mt-1.5 size-2 shrink-0 rounded-full bg-primary-foreground/80"
                />
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-primary-foreground/70">
                    {item.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} Deliverix. All rights reserved.
        </p>
      </div>

      {/* Form column */}
      <div className="flex flex-col">
        {/* Compact brand header on small screens */}
        <div className="flex items-center gap-2 px-6 pt-8 lg:hidden">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-base font-black text-primary-foreground">
            D
          </span>
          <span className="text-base font-semibold tracking-tight">
            Deliverix
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
