"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, Camera, Loader2, Trash2 } from "lucide-react";
import { messageFor } from "@/lib/api/errors";
import { ApiError } from "@/lib/api/errors";
import { ordersKeys } from "../queries";
import {
  useSubmitProofMutation,
  useUploadProofFileMutation,
  useRequestDeliveryOtpMutation,
  useCompleteDeliveryMutation,
  useUnlinkedUploads,
  useDiscardUploadMutation,
  useIdempotencyKey,
} from "../queries";
import { formatBytes, formatDateTime } from "@/lib/utils/formatters";
import type { DeliveryProof, Order, OrderProofPolicy } from "../types";

interface DriverDeliveryActionsProps {
  order: Order;
  proofs: DeliveryProof[];
  policy: OrderProofPolicy;
}

const FILE_STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  Accepted: "success",
  Scanning: "warning",
  Uploaded: "warning",
  Rejected: "destructive",
  FailedProcessing: "destructive",
  Pending: "warning",
};

function friendlyProofError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case "PROOF_REQUIRED":
        return "Required proof of delivery evidence is missing. Submit the required evidence below first.";
      case "PROOF_NOT_READY":
        return "Proof files have not finished validation. Wait a few seconds and try again.";
      case "ORDER_STATE_CONFLICT":
        return err.message || "The order is not in a state that allows this action.";
      case "RESOURCE_VERSION_MISMATCH":
        return "The order changed while you were working. Refreshing — review the updates, then retry.";
      case "PRECONDITION_REQUIRED":
        return "Missing resource version. Refresh the page and try again.";
      case "VALIDATION_FAILED":
        return err.message || "The submitted evidence failed validation.";
    }
  }
  return messageFor(err, fallback);
}

/**
 * Driver-facing "Complete Delivery & Submit POD" panel (DEL-004, POD-001).
 *
 * Rendered for callers with `deliveries.execute` once the order is
 * `OutForDelivery`. Collects the evidence required by the order's proof
 * policy, submits it through `POST /orders/:id/proofs`, and completes delivery
 * through `POST /orders/:id/deliver` with `If-Match` optimistic locking.
 */
export function DriverDeliveryActions({ order, proofs, policy }: DriverDeliveryActionsProps) {
  const queryClient = useQueryClient();
  const getKey = useIdempotencyKey();

  const submitProofMutation = useSubmitProofMutation(order.id);
  const uploadMutation = useUploadProofFileMutation(order.id);
  const requestOtpMutation = useRequestDeliveryOtpMutation(order.id);
  const completeMutation = useCompleteDeliveryMutation(order.id);
  const unlinkedQuery = useUnlinkedUploads(order.id);
  const discardMutation = useDiscardUploadMutation(order.id);

  const [recipientName, setRecipientName] = React.useState("");
  const [photoFiles, setPhotoFiles] = React.useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = React.useState<Array<{ id: string; name: string; status: string }>>([]);
  const [otpCode, setOtpCode] = React.useState("");
  const [otpExpiresAt, setOtpExpiresAt] = React.useState<string | null>(null);
  const [confirmedFlag, setConfirmedFlag] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [justCompleted, setJustCompleted] = React.useState(false);

  // ---- Evidence fulfilment derived from the live proofs list ----------------
  const activeProofs = proofs.filter((p) => p.status !== "Rejected");
  const hasRecipientName = activeProofs.some((p) => p.evidenceType === "RecipientName");
  const photoProofs = activeProofs.filter((p) => p.evidenceType === "Photo" && p.file);
  const acceptedPhotos = photoProofs.filter((p) => p.file?.status === "Accepted").length;
  const pendingPhotoFiles = photoProofs.filter(
    (p) => p.file && p.file.status !== "Accepted" && p.file.status !== "Rejected" && p.file.status !== "FailedProcessing",
  );
  const uploadedFilesPending = uploadedFiles.some((f) => f.status === "Scanning" || f.status === "Uploaded");
  const hasSignature = activeProofs.some((p) => p.evidenceType === "Signature");
  const hasConfirmation = activeProofs.some((p) => p.evidenceType === "ConfirmationFlag");
  const hasOtp = activeProofs.some((p) => p.evidenceType === "Otp");

  const missingPhotoCount = Math.max(0, policy.minPhotos - acceptedPhotos);

  const recipientSatisfied = !policy.requiresRecipientName || hasRecipientName;
  const photoSatisfied = !policy.requiresPhoto || acceptedPhotos >= policy.minPhotos;
  const signatureSatisfied = !policy.requiresSignature || hasSignature;
  const confirmationSatisfied = !policy.requiresConfirmation || hasConfirmation;
  const otpSatisfied = !policy.requiresOtp || hasOtp;

  const allEvidenceSatisfied =
    recipientSatisfied &&
    photoSatisfied &&
    signatureSatisfied &&
    confirmationSatisfied &&
    otpSatisfied;

  // Photo files move Uploaded → Scanning → Accepted asynchronously, so poll
  // the proofs list while any evidence is still processing.
  const evidenceStillProcessing = photoProofs.some(
    (p) => p.file?.status === "Scanning" || p.file?.status === "Uploaded",
  );

  React.useEffect(() => {
    if (!evidenceStillProcessing && !uploadedFilesPending) return;
    const interval = setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: ordersKeys.proofs(order.id) });
    }, 4_000);
    return () => clearInterval(interval);
  }, [evidenceStillProcessing, uploadedFilesPending, queryClient, order.id]);

  React.useEffect(() => {
    // Drop submitted files from the local stash once their proof shows up.
    setUploadedFiles((prev) =>
      prev.filter((f) => !photoProofs.some((p) => p.file?.id === f.id)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proofs.length]);

  // ---- Handlers --------------------------------------------------------------

  async function handleSubmitRecipientName() {
    if (!recipientName.trim()) return;
    setError(null);
    try {
      await submitProofMutation.mutateAsync({
        data: { evidenceType: "RecipientName", evidenceValue: recipientName.trim() },
        idempotencyKey: await getKey({ orderId: order.id, type: "RecipientName", value: recipientName.trim() }),
      });
      setRecipientName("");
    } catch (err) {
      setError(friendlyProofError(err, "Failed to submit recipient name."));
    }
  }

  async function handleUploadAndSubmitPhotos() {
    if (photoFiles.length === 0) return;
    setError(null);
    try {
      const uploaded: Array<{ id: string; name: string; status: string }> = [];
      for (const file of photoFiles) {
        const key = await getKey({
          orderId: order.id,
          upload: file.name,
          size: file.size,
        });
        const result = await uploadMutation.mutateAsync({ file, idempotencyKey: key });
        uploaded.push({ id: result.id, name: result.originalName, status: result.status });
      }
      setUploadedFiles((prev) => [...prev, ...uploaded]);
      await submitProofMutation.mutateAsync({
        data: { evidenceType: "Photo", fileIds: uploaded.map((f) => f.id) },
        idempotencyKey: await getKey({
          orderId: order.id,
          type: "Photo",
          files: uploaded.map((f) => f.id),
        }),
      });
      setPhotoFiles([]);
    } catch (err) {
      setError(friendlyProofError(err, "Failed to upload shipment photos."));
    }
  }

  async function handleRequestOtp() {
    setError(null);
    try {
      const result = await requestOtpMutation.mutateAsync();
      setOtpExpiresAt(result.expiresAt);
    } catch (err) {
      setError(friendlyProofError(err, "Failed to request a delivery code."));
    }
  }

  async function handleSubmitOtp() {
    if (otpCode.trim().length < 4) return;
    setError(null);
    try {
      await submitProofMutation.mutateAsync({
        data: { evidenceType: "Otp", evidenceValue: otpCode.trim() },
        idempotencyKey: await getKey({ orderId: order.id, type: "Otp", value: otpCode.trim() }),
      });
      setOtpCode("");
      setOtpExpiresAt(null);
    } catch (err) {
      setError(friendlyProofError(err, "Failed to verify the delivery code."));
    }
  }

  async function handleSubmitConfirmation() {
    if (!confirmedFlag) return;
    setError(null);
    try {
      await submitProofMutation.mutateAsync({
        data: { evidenceType: "ConfirmationFlag", confirmationFlag: true },
        idempotencyKey: await getKey({ orderId: order.id, type: "ConfirmationFlag" }),
      });
      setConfirmedFlag(false);
    } catch (err) {
      setError(friendlyProofError(err, "Failed to record recipient confirmation."));
    }
  }

  async function handleCompleteDelivery() {
    setError(null);
    try {
      await completeMutation.mutateAsync({ version: order.version });
      setJustCompleted(true);
    } catch (err) {
      if (err instanceof ApiError && err.code === "RESOURCE_VERSION_MISMATCH") {
        // The stored version moved; re-fetch so the next attempt uses the
        // current version rather than silently clobbering it.
        void queryClient.invalidateQueries({ queryKey: ordersKeys.detail(order.id) });
      }
      setError(friendlyProofError(err, "Failed to complete the delivery."));
    }
  }

  async function handleDiscardFile(fileId: string) {
    setError(null);
    try {
      await discardMutation.mutateAsync(fileId);
    } catch (err) {
      setError(friendlyProofError(err, "Failed to discard the upload."));
    }
  }

  function refreshStatus() {
    setError(null);
    void queryClient.invalidateQueries({ queryKey: ordersKeys.proofs(order.id) });
    void queryClient.invalidateQueries({ queryKey: ordersKeys.detail(order.id) });
  }

  // ---- Rendering --------------------------------------------------------------

  return (
    <Card className="border-emerald-500/40">
      <CardHeader>
        <CardTitle>Complete delivery &amp; submit proof</CardTitle>
        <CardDescription>
          Collect the required delivery evidence, then mark this order as
          delivered. Required here: {[
            policy.requiresRecipientName && "recipient name",
            policy.requiresPhoto && `photo${policy.minPhotos > 1 ? `s (min ${policy.minPhotos})` : ""}`,
            policy.requiresSignature && "signature",
            policy.requiresConfirmation && "recipient confirmation",
            policy.requiresOtp && "delivery code",
          ].filter(Boolean).join(", ")}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {justCompleted && (
          <Alert variant="default" className="border-emerald-500/50">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <AlertTitle>Delivery completed</AlertTitle>
            <AlertDescription>
              The order is now marked as Delivered and the proof of delivery is
              recorded. You can pick up your next assignment.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Action failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <ul className="space-y-1 rounded-lg border bg-muted/30 p-3 text-sm">
          <RequirementRow satisfied={recipientSatisfied}>
            Recipient name {policy.requiresRecipientName ? "" : "(not required)"}
          </RequirementRow>
          <RequirementRow satisfied={photoSatisfied}>
            {`Valid photos: ${acceptedPhotos}/${policy.minPhotos}${pendingPhotoFiles.length > 0 || uploadedFilesPending ? ` (+${pendingPhotoFiles.length + uploadedFiles.filter((f) => f.status === "Scanning").length} processing)` : ""}`}
          </RequirementRow>
          {policy.requiresSignature && (
            <RequirementRow satisfied={signatureSatisfied}>Signature</RequirementRow>
          )}
          {policy.requiresConfirmation && (
            <RequirementRow satisfied={confirmationSatisfied}>Recipient confirmation</RequirementRow>
          )}
          {policy.requiresOtp && (
            <RequirementRow satisfied={otpSatisfied}>Delivery code verified</RequirementRow>
          )}
        </ul>

        {policy.requiresRecipientName && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Recipient name</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Full name of the person receiving the package"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleSubmitRecipientName();
                  }
                }}
                onBlur={() => {
                  if (recipientName.trim() && !hasRecipientName) {
                    void handleSubmitRecipientName();
                  }
                }}
                disabled={hasRecipientName || submitProofMutation.isPending}
              />
              <Button
                onClick={() => void handleSubmitRecipientName()}
                disabled={!recipientName.trim() || hasRecipientName || submitProofMutation.isPending}
                size="sm"
              >
                {hasRecipientName ? "Recorded" : "Submit"}
              </Button>
            </div>
            {!hasRecipientName && (
              <p className="text-xs text-muted-foreground">
                Press Enter, click Submit, or click outside the field to record the name. The tick above turns green once recorded.
              </p>
            )}
          </div>
        )}

        {policy.requiresPhoto && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Delivery photos (JPEG/PNG, max 5MB each)
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="file"
                accept="image/jpeg,image/png"
                multiple
                className="max-w-xs"
                onChange={(e) => setPhotoFiles(Array.from(e.target.files ?? []))}
                disabled={uploadMutation.isPending || submitProofMutation.isPending}
              />
              <Button
                onClick={() => void handleUploadAndSubmitPhotos()}
                disabled={photoFiles.length === 0 || uploadMutation.isPending || submitProofMutation.isPending}
                className="gap-2"
                size="sm"
              >
                {uploadMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                Upload &amp; submit
              </Button>
            </div>
            {uploadedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {uploadedFiles.map((f) => (
                  <Badge key={f.id} variant={FILE_STATUS_VARIANT[f.status] ?? "secondary"}>
                    {f.name} · {f.status}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {policy.requiresOtp && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Delivery code (OTP)</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => void handleRequestOtp()}
                disabled={requestOtpMutation.isPending || hasOtp}
                size="sm"
              >
                {otpExpiresAt ? "Resend code" : "Generate code"}
              </Button>
              <Input
                placeholder="6-digit code from the recipient"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="max-w-[200px]"
                disabled={hasOtp}
              />
              <Button
                onClick={() => void handleSubmitOtp()}
                disabled={otpCode.trim().length < 4 || hasOtp || submitProofMutation.isPending}
                size="sm"
              >
                Verify
              </Button>
              {otpExpiresAt && (
                <span className="self-center text-xs text-muted-foreground">
                  expires {new Date(otpExpiresAt).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        )}

        {policy.requiresConfirmation && (
          <div className="flex items-center gap-2">
            <input
              id="pod-confirmation"
              type="checkbox"
              checked={confirmedFlag}
              onChange={(e) => setConfirmedFlag(e.target.checked)}
              disabled={hasConfirmation}
              className="size-4 accent-emerald-600"
            />
            <Label htmlFor="pod-confirmation" className="text-sm">
              The recipient confirmed receiving the package in good condition
            </Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleSubmitConfirmation()}
              disabled={!confirmedFlag || hasConfirmation || submitProofMutation.isPending}
            >
              {hasConfirmation ? "Recorded" : "Submit"}
            </Button>
          </div>
        )}

        {(unlinkedQuery.data?.length ?? 0) > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Unused uploads</Label>
            <p className="text-xs text-muted-foreground">
              These files were uploaded but never attached as evidence. Orders
              have a limited upload capacity (5 files); discard unused ones to
              free space for the real delivery photo.
            </p>
            <ul className="divide-y rounded-lg border">
              {unlinkedQuery.data!.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center gap-2 p-2 text-sm">
                  <span className="truncate flex-1 min-w-[120px]">
                    {f.originalName ?? f.id}
                  </span>
                  <Badge variant={FILE_STATUS_VARIANT[f.status] ?? "secondary"}>
                    {f.status}
                  </Badge>
                  {typeof f.sizeBytes === "number" && (
                    <span className="text-xs text-muted-foreground">
                      {formatBytes(f.sizeBytes)}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1"
                    onClick={() => void handleDiscardFile(f.id)}
                    disabled={discardMutation.isPending}
                    title="Discard this unused upload"
                  >
                    {discardMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4 text-destructive" />
                    )}
                    Discard
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t pt-4">
          {evidenceStillProcessing || uploadedFilesPending ? (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Proof files are being validated. This usually takes a few seconds.
            </span>
          ) : !allEvidenceSatisfied ? (
            <span className="text-sm text-muted-foreground">
              Submit all required evidence above to enable delivery completion.
            </span>
          ) : (
            <span className="text-sm text-emerald-700 dark:text-emerald-400">
              All required proof of delivery evidence has been submitted.
            </span>
          )}

          <Button
            onClick={() => void handleCompleteDelivery()}
            disabled={
              !allEvidenceSatisfied ||
              evidenceStillProcessing ||
              completeMutation.isPending
            }
            title={
              completeMutation.isPending
                ? "Completing delivery..."
                : evidenceStillProcessing
                  ? "Proof files are still being validated"
                  : !allEvidenceSatisfied
                    ? "Submit all required evidence first - see the checklist above"
                    : undefined
            }
            className="ml-auto gap-2 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {completeMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            {completeMutation.isPending ? "Completing..." : "Complete delivery"}
          </Button>

          <Button variant="ghost" size="sm" onClick={refreshStatus} disabled={completeMutation.isPending}>
            Refresh status
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RequirementRow({ satisfied, children }: { satisfied: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      {satisfied ? (
        <CheckCircle2 className="size-4 text-emerald-600" />
      ) : (
        <span className="size-4 rounded-full border border-dashed border-muted-foreground/50" aria-hidden />
      )}
      <span className={satisfied ? "" : "text-muted-foreground"}>{children}</span>
    </li>
  );
}
