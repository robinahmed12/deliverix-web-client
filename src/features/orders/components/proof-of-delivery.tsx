"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { formatBytes, formatDateTime } from "@/lib/utils/formatters";
import type {
  DeliveryProof,
  ProofEvidenceType,
  ProofStatus,
} from "../types";

const EVIDENCE_LABELS: Record<ProofEvidenceType, string> = {
  RecipientName: "Recipient name",
  Photo: "Photo",
  Signature: "Signature",
  ConfirmationFlag: "Recipient confirmation",
  Otp: "OTP verified",
};

const STATUS_VARIANT: Record<ProofStatus, BadgeProps["variant"]> = {
  Pending: "warning",
  Accepted: "success",
  Rejected: "destructive",
};

export function ProofOfDelivery({ proofs }: { proofs: DeliveryProof[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Proof of delivery</CardTitle>
      </CardHeader>
      <CardContent>
        {proofs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No proof of delivery recorded yet.
          </p>
        ) : (
          <div className="space-y-4">
            {proofs.map((proof) => (
              <div key={proof.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">
                    {EVIDENCE_LABELS[proof.evidenceType]}
                  </span>
                  <Badge variant={STATUS_VARIANT[proof.status]}>
                    {proof.status}
                  </Badge>
                  {proof.correctedAt && (
                    <Badge variant="secondary">Corrected</Badge>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatDateTime(proof.submittedAt)}
                  </span>
                </div>
                <div className="mt-2 space-y-1 text-sm">
                  {proof.evidenceType === "RecipientName" &&
                    proof.evidenceValue && (
                      <p>Recipient: {proof.evidenceValue}</p>
                    )}
                  {proof.evidenceType === "ConfirmationFlag" && (
                    <p>Recipient confirmed delivery.</p>
                  )}
                  {proof.evidenceType === "Otp" && (
                    <p>Delivery code verified.</p>
                  )}
                  {proof.file && (
                    <div className="flex flex-wrap items-center gap-2">
                      {proof.signedUrl ? (
                        <a
                          href={proof.signedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline underline-offset-2"
                        >
                          {proof.file.originalName ?? "View evidence file"}
                        </a>
                      ) : (
                        <span>
                          {proof.file.originalName ?? proof.file.id}
                        </span>
                      )}
                      {proof.file.mimeType && (
                        <span className="text-xs text-muted-foreground">
                          {proof.file.mimeType}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatBytes(proof.file.sizeBytes)}
                      </span>
                      {proof.file.status !== "Accepted" && (
                        <Badge variant="secondary">
                          {proof.file.status}
                        </Badge>
                      )}
                    </div>
                  )}
                  {proof.correctedAt && (
                    <p className="text-xs text-muted-foreground">
                      Corrected {formatDateTime(proof.correctedAt)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}