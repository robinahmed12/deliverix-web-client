"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  withdrawAssignmentSchema,
  type WithdrawAssignmentInput,
} from "../schemas";
import { useWithdrawAssignmentMutation, useIdempotencyKey } from "../queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { messageFor } from "@/lib/api/errors";

interface WithdrawConfirmationProps {
  assignmentId: string | null;
  driverCode: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WithdrawConfirmation({
  assignmentId,
  driverCode,
  open,
  onOpenChange,
}: WithdrawConfirmationProps) {
  const getKey = useIdempotencyKey("dispatch-withdraw");
  const [serverError, setServerError] = React.useState<string | null>(null);

  const withdrawMutation = useWithdrawAssignmentMutation();

  const form = useForm<WithdrawAssignmentInput>({
    resolver: zodResolver(withdrawAssignmentSchema),
    defaultValues: { reasonCode: "", reasonText: null },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({ reasonCode: "", reasonText: null });
      setServerError(null);
    }
  }, [open, form]);

  async function onSubmit(values: WithdrawAssignmentInput) {
    if (!assignmentId) return;
    setServerError(null);
    const payload = { ...values, reasonText: values.reasonText || null };
    const key = await getKey(payload);
    try {
      await withdrawMutation.mutateAsync({
        id: assignmentId,
        data: payload,
        idempotencyKey: key,
      });
      onOpenChange(false);
    } catch (error) {
      setServerError(messageFor(error, "Failed to withdraw offer."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Withdraw offer</DialogTitle>
          <DialogDescription>
            {driverCode
              ? `Withdraw the pending offer to ${driverCode}. The driver will no longer see it.`
              : "Withdraw the pending offer to this driver."}
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="withdraw-reason">Reason</Label>
            <Input
              id="withdraw-reason"
              placeholder="e.g. Customer cancelled, wrong driver"
              {...form.register("reasonCode")}
            />
            {form.formState.errors.reasonCode && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.reasonCode.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="withdraw-reason-text">Notes (optional)</Label>
            <Textarea
              id="withdraw-reason-text"
              placeholder="Additional context…"
              value={form.watch("reasonText") ?? ""}
              onChange={(e) => form.setValue("reasonText", e.target.value || null)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={withdrawMutation.isPending}
            >
              {withdrawMutation.isPending ? "Withdrawing…" : "Withdraw offer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}