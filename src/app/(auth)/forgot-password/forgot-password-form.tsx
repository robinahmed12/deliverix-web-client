"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/features/auth/schemas";
import { forgotPassword } from "@/features/auth/api";
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

export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setServerError(null);
    setIsPending(true);
    try {
      await forgotPassword(values.email);
      setSubmitted(true);
    } catch (error) {
      setServerError(messageFor(error, "Something went wrong. Please try again."));
    } finally {
      setIsPending(false);
    }
  }

  if (submitted) {
    return (
      <div className="space-y-4 text-center text-sm text-muted-foreground">
        <p>
          If an account exists with that email, a password reset link has been
          sent.
        </p>
        <Link
          href="/login"
          className="inline-block underline underline-offset-4 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          Back to sign in
        </Link>
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
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    placeholder="you@company.com"
                    type="email"
                    autoComplete="email"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Sending..." : "Send reset link"}
          </Button>
        </form>
      </Form>
      <div className="mt-4 text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="underline underline-offset-4 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          Back to sign in
        </Link>
      </div>
    </>
  );
}