"use client";

import * as React from "react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  confirmMfaEnrollment,
  startMfaEnrollment,
} from "@/features/auth/api";
import { authKeys, useCurrentUser } from "@/features/auth/queries";
import { messageFor } from "@/lib/api/errors";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  mfaEnrollmentConfirmSchema,
  type MfaEnrollmentConfirmInput,
} from "@/features/auth/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export function SecurityView() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useCurrentUser();

  const [enrollment, setEnrollment] = useState<{
    secret: string;
    otpauthUrl: string;
  } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<MfaEnrollmentConfirmInput>({
    resolver: zodResolver(mfaEnrollmentConfirmSchema),
    defaultValues: { code: "" },
  });

  async function handleEnable() {
    setServerError(null);
    setIsPending(true);
    try {
      const result = await startMfaEnrollment();
      setEnrollment(result);
    } catch (error) {
      setServerError(messageFor(error, "Could not start MFA enrollment."));
    } finally {
      setIsPending(false);
    }
  }

  async function handleConfirm(values: MfaEnrollmentConfirmInput) {
    setServerError(null);
    setIsPending(true);
    try {
      await confirmMfaEnrollment(values.code);
      setEnrollment(null);
      form.reset();
      await queryClient.invalidateQueries({ queryKey: authKeys.me() });
    } catch (error) {
      setServerError(messageFor(error, "Verification failed. Please try again."));
    } finally {
      setIsPending(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Two-factor authentication
            {user.mfaEnabled ? (
              <Badge variant="success">Enabled</Badge>
            ) : (
              <Badge variant="secondary">Disabled</Badge>
            )}
          </CardTitle>
          <CardDescription>
            {user.mfaEnabled
              ? "Your account is protected with a one-time password from your authenticator app."
              : "Enhance security by requiring a one-time code at sign in."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {serverError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          {enrollment ? (
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/40 p-4 text-sm">
                <p className="font-medium">Set up your authenticator app</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
                  <li>
                    Open your authenticator app and add a new account using the
                    secret or the otpauth link below.
                  </li>
                  <li>
                    Enter the 6-digit code it generates to confirm enrollment.
                  </li>
                </ol>
                <div className="mt-3 space-y-1 text-xs">
                  <p className="break-all">
                    <span className="font-medium">Secret: </span>
                    <code className="rounded bg-muted px-1 py-0.5">
                      {enrollment.secret}
                    </code>
                  </p>
                  <p className="break-all">
                    <span className="font-medium">otpauth URL: </span>
                    <code className="rounded bg-muted px-1 py-0.5">
                      {enrollment.otpauthUrl}
                    </code>
                  </p>
                </div>
              </div>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleConfirm)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
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
                  <div className="flex gap-2">
                    <Button type="submit" disabled={isPending}>
                      {isPending ? "Confirming..." : "Confirm & enable"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => {
                        setEnrollment(null);
                        setServerError(null);
                        form.reset();
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          ) : (
            <Button onClick={handleEnable} disabled={isPending || user.mfaEnabled}>
              {isPending ? "Starting..." : "Enable two-factor authentication"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}