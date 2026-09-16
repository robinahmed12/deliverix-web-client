"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/features/auth/schemas";
import { resetPassword } from "@/features/auth/api";
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

export function ResetPasswordForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(values: ResetPasswordInput) {
    if (!token) return;
    setServerError(null);
    setIsPending(true);
    try {
      await resetPassword(token, values.password);
      setSubmitted(true);
      router.push("/login");
      router.refresh();
    } catch (error) {
      setServerError(
        messageFor(error, "Password reset failed. The link may have expired."),
      );
    } finally {
      setIsPending(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-4 text-center text-sm">
        <p className="text-destructive">Invalid or missing reset token.</p>
        <Link
          href="/forgot-password"
          className="inline-block underline underline-offset-4 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="space-y-4 text-center text-sm text-muted-foreground">
        <p>Your password has been reset. Redirecting to sign in...</p>
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
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New password</FormLabel>
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
                <FormLabel>Confirm new password</FormLabel>
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
            {isPending ? "Resetting..." : "Reset password"}
          </Button>
        </form>
      </Form>
    </>
  );
}