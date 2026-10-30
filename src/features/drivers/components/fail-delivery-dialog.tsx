"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  getDeliveryFailureReasons,
  type DeliveryFailureReasonItem,
} from "../api-me";

const FALLBACK_REASONS: DeliveryFailureReasonItem[] = [
  { id: "1", code: "RECIPIENT_UNAVAILABLE", label: "Recipient unavailable / not at delivery location", requiresText: false, active: true },
  { id: "2", code: "INCORRECT_ADDRESS", label: "Address incorrect, incomplete, or unlocatable", requiresText: false, active: true },
  { id: "3", code: "CUSTOMER_REFUSED", label: "Customer refused delivery / package declined", requiresText: true, active: true },
  { id: "4", code: "ACCESS_DENIED", label: "Access denied / locked gate / security restriction", requiresText: false, active: true },
  { id: "5", code: "SAFETY_HAZARD", label: "Severe weather, unsafe conditions, or animal hazard", requiresText: true, active: true },
  { id: "6", code: "OTHER", label: "Other operational exception", requiresText: true, active: true },
];

interface FailDeliveryDialogProps {
  orderId: string;
  orderNumber: string;
  isPending: boolean;
  onFail: (data: { reasonCode: string; reasonText?: string }) => void | Promise<unknown>;
  trigger?: React.ReactNode;
}

export function FailDeliveryDialog({
  orderId,
  orderNumber,
  isPending,
  onFail,
  trigger,
}: FailDeliveryDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedCode, setSelectedCode] = React.useState<string>("RECIPIENT_UNAVAILABLE");
  const [notes, setNotes] = React.useState("");
  const [validationError, setValidationError] = React.useState<string | null>(null);

  // Fetch dynamic reasons from backend if available
  const { data: remoteReasons } = useQuery({
    queryKey: ["delivery", "failure-reasons"],
    queryFn: getDeliveryFailureReasons,
    staleTime: 60_000,
  });

  const reasons = React.useMemo(() => {
    if (remoteReasons && remoteReasons.length > 0) {
      return remoteReasons.filter((r) => r.active);
    }
    return FALLBACK_REASONS;
  }, [remoteReasons]);

  const activeReasonConfig = reasons.find((r) => r.code === selectedCode) || reasons[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (activeReasonConfig?.requiresText && (!notes.trim() || notes.trim().length === 0)) {
      setValidationError("Explanatory notes are required for this failure reason.");
      return;
    }

    try {
      await onFail({
        reasonCode: selectedCode,
        reasonText: notes.trim() ? notes.trim() : undefined,
      });
      setOpen(false);
    } catch {
      // Error is handled by caller's mutation onError
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="outline"
            className="min-h-[44px] gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <AlertTriangle className="size-4" />
            Report Issue
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="space-y-2">
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              Report Delivery Exception
            </DialogTitle>
            <DialogDescription>
              Report a failed delivery attempt for Order <span className="font-semibold text-foreground">{orderNumber}</span>.
              The customer will be notified via email and in-app alert, and your driver capacity will be released.
            </DialogDescription>
          </DialogHeader>

          {validationError && (
            <Alert variant="destructive" className="my-3">
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Select Failure Reason</Label>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {reasons.map((reason) => (
                  <label
                    key={reason.code}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors min-h-[44px] ${
                      selectedCode === reason.code
                        ? "border-destructive bg-destructive/5 font-medium"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="failureReason"
                      value={reason.code}
                      checked={selectedCode === reason.code}
                      onChange={() => {
                        setSelectedCode(reason.code);
                        setValidationError(null);
                      }}
                      className="size-4 mt-0.5 text-destructive focus:ring-destructive"
                    />
                    <div className="space-y-0.5">
                      <span className="text-sm block">{reason.label}</span>
                      {reason.requiresText && (
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium block">
                          * Explanatory notes required
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="failure-notes" className="text-xs font-semibold">
                Reason Details {activeReasonConfig?.requiresText ? "(Required)" : "(Optional)"}
              </Label>
              <Textarea
                id="failure-notes"
                placeholder={
                  activeReasonConfig?.requiresText
                    ? "Explain what prevented delivery (e.g., gate code missing, customer did not answer doorbell)..."
                    : "Add any additional context for dispatch and customer..."
                }
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                rows={3}
                maxLength={500}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="min-h-[44px] w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isPending}
              className="min-h-[44px] w-full sm:w-auto gap-2"
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Confirm Delivery Issue
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
