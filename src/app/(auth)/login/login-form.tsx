"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  loginSchema,
  mfaVerifySchema,
  type LoginInput,
  type MfaVerifyInput,
} from "@/features/auth/schemas";
import { login, verifyMfa } from "@/features/auth/api";
import { messageFor } from "@/lib/api/errors";
import { safeRedirectTarget } from "@/lib/auth/redirect";
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

type Step = "credentials" | "mfa";

/**
 * Login + MFA verification (AUTH-004). Handles the two-step MFA challenge
 * served by the backend and redirects to the next destination on success.
 */
export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("credentials");
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const credentialsForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const mfaForm = useForm<MfaVerifyInput>({
    resolver: zodResolver(mfaVerifySchema),
    defaultValues: { code: "" },
  });

  async function handleCredentialSubmit(values: LoginInput) {
    setServerError(null);
    setIsPending(true);
    try {
      const result = await login(values.email, values.password);
      if ("mfaRequired" in result) {
        setMfaToken(result.mfaToken);
        setStep("mfa");
        mfaForm.reset();
        return;
      }
      router.push(safeRedirectTarget(next, "/dashboard"));
      router.refresh();
    } catch (error) {
      setServerError(messageFor(error, "Sign in failed. Please try again."));
    } finally {
      setIsPending(false);
    }
  }

  async function handleMfaSubmit(values: MfaVerifyInput) {
    if (!mfaToken) return;
    setServerError(null);
    setIsPending(true);
    try {
      await verifyMfa(mfaToken, values.code);
      router.push(safeRedirectTarget(next, "/dashboard"));
      router.refresh();
    } catch (error) {
      setServerError(
        messageFor(error, "Verification failed. Please try again."),
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      {serverError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      {step === "credentials" ? (
        <Form {...credentialsForm}>
          <form
            onSubmit={credentialsForm.handleSubmit(handleCredentialSubmit)}
            className="space-y-4"
          >
            <FormField
              control={credentialsForm.control}
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
            <FormField
              control={credentialsForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </Form>
      ) : (
        <Form {...mfaForm}>
          <form
            onSubmit={mfaForm.handleSubmit(handleMfaSubmit)}
            className="space-y-4"
          >
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code from your authenticator app.
            </p>
            <FormField
              control={mfaForm.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Verification code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="123456"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Verifying..." : "Verify"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setStep("credentials");
                setMfaToken(null);
                setServerError(null);
              }}
              disabled={isPending}
            >
              Back to login
            </Button>
          </form>
        </Form>
      )}

      <div className="mt-4 text-center text-sm text-muted-foreground">
        <Link
          href="/forgot-password"
          className="underline underline-offset-4 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          Forgot password?
        </Link>
      </div>
    </>
  );
}