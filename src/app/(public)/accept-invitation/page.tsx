import type { Metadata } from "next";
import { AcceptInvitationForm } from "./accept-invitation-form";

export const metadata: Metadata = { title: "Accept Invitation" };

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await searchParams;

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          Set your name and password to get started.
        </p>
      </div>
      <AcceptInvitationForm token={typeof token === "string" ? token : null} />
    </div>
  );
}