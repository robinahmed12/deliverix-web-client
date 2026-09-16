"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  acceptInvitationSchema,
  type AcceptInvitationInput,
} from "@/features/auth/schemas";
import { acceptInvitation } from "@/features/auth/api";
import { messageFor } from "@/lib/api/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export function AcceptInvitationForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<AcceptInvitationInput>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: { name: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(values: AcceptInvitationInput) {
    if (!token) return;
    setServerError(null);
    setIsPending(true);
    try {
      await acceptInvitation(token, values.password, values.name);
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setServerError(
        messageFor(
          error,
          "Could not accept the invitation. The link may have expired.",
        ),
      );
    } finally {
      setIsPending(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-4 text-center text-sm">
        <p className="text-destructive">Invalid or missing invitation token.</p>
      </div>
    );
  }

  return (
    <>
      {serverError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Your name"
                    autoComplete="name"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Creating account..." : "Accept invitation"}
          </Button>
        </form>
      </Form>
    </>
  );
}