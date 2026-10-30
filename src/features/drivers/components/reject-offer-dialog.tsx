"use client";

import * as React from "react";
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
import { XCircle, Loader2 } from "lucide-react";

const REJECTION_REASONS = [
  { code: "VEHICLE_ISSUE", label: "Vehicle issue / maintenance required" },
  { code: "DISTANCE_TOO_FAR", label: "Pickup or destination is outside my range" },
  { code: "SHIFT_ENDED", label: "End of shift / going off duty" },
  { code: "HEAVY_PACKAGE", label: "Package exceeds vehicle / weight capacity" },
  { code: "OTHER", label: "Other reason" },
] as const;

interface RejectOfferDialogProps {
  assignmentId: string;
  orderNumber: string;
  isPending: boolean;
  onReject: (data: { reasonCode: string; reasonText?: string }) => void | Promise<void>;
  trigger?: React.ReactNode;
}

export function RejectOfferDialog({
  assignmentId,
  orderNumber,
  isPending,
  onReject,
  trigger,
}: RejectOfferDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedReason, setSelectedReason] = React.useState<string>("VEHICLE_ISSUE");
  const [notes, setNotes] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onReject({
      reasonCode: selectedReason,
      reasonText: notes.trim() ? notes.trim() : undefined,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="outline"
            className="min-h-[44px] text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
          >
            <XCircle className="size-4 mr-1.5" />
            Decline Offer
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="space-y-2">
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="size-5" />
              Decline Delivery Offer
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to decline Order <span className="font-semibold text-foreground">{orderNumber}</span>?
              Your status will return to Available so you can receive other assignments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Reason for Declining</Label>
              <div className="space-y-2">
                {REJECTION_REASONS.map((reason) => (
                  <label
                    key={reason.code}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors min-h-[44px] ${
                      selectedReason === reason.code
                        ? "border-primary bg-primary/5 font-medium"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="rejectionReason"
                      value={reason.code}
                      checked={selectedReason === reason.code}
                      onChange={() => setSelectedReason(reason.code)}
                      className="size-4 text-primary focus:ring-primary"
                    />
                    <span className="text-sm">{reason.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-medium text-muted-foreground">
                Additional Notes (Optional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Provide any details to help dispatchers understand..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
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
              Back
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isPending}
              className="min-h-[44px] w-full sm:w-auto gap-2"
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Confirm Decline
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
