"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatDateTime } from "@/lib/utils/formatters";
import { messageFor } from "@/lib/api/errors";
import {
  failureReasonFormSchema,
  failureReasonEditSchema,
  proofPolicyFormSchema,
  settingValueSchema,
  type FailureReasonFormValues,
  type ProofPolicyFormValues,
  type SettingValueFormValues,
} from "../schemas";
import {
  useActivateProofPolicyMutation,
  useCreateFailureReasonMutation,
  useCreateProofPolicyMutation,
  useFailureReasons,
  useIdempotencyKey,
  useProofPolicies,
  useSystemSettings,
  useUpdateFailureReasonMutation,
  useUpdateSettingMutation,
} from "../queries";
import type { FailureReason, ProofPolicy, SystemSetting } from "../types";

type ConfigTab = "failureReasons" | "proofPolicies" | "settings";

const TABS: { id: ConfigTab; label: string }[] = [
  { id: "failureReasons", label: "Failure reasons" },
  { id: "proofPolicies", label: "Proof policies" },
  { id: "settings", label: "System settings" },
];

export function ConfigManagementView() {
  const [tab, setTab] = React.useState<ConfigTab>("failureReasons");

  return (
    <div className="space-y-6">
      <div className="flex gap-1">
        {TABS.map((t) => (
          <Button
            key={t.id}
            variant={tab === t.id ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {tab === "failureReasons" && <FailureReasonsTab />}
      {tab === "proofPolicies" && <ProofPoliciesTab />}
      {tab === "settings" && <SystemSettingsTab />}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Failure reasons                                                           */
/* -------------------------------------------------------------------------- */

function FailureReasonsTab() {
  const reasonsQuery = useFailureReasons();
  const reasons = reasonsQuery.data?.data ?? [];
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<FailureReason | null>(null);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Failure reasons</CardTitle>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add reason
        </Button>
      </CardHeader>
      <CardContent>
        {reasonsQuery.isLoading && !reasons.length && (
          <p className="text-sm text-muted-foreground">Loading failure reasons…</p>
        )}
        {!reasonsQuery.isLoading && reasons.length === 0 && (
          <p className="text-sm text-muted-foreground">No failure reasons yet.</p>
        )}
        {reasons.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Requires text</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reasons.map((reason) => (
                <FailureReasonRow
                  key={reason.id}
                  reason={reason}
                  onEdit={() => setEditing(reason)}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <CreateFailureReasonDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      {editing && (
        <EditFailureReasonDialog
          reason={editing}
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      )}
    </Card>
  );
}

function FailureReasonRow({
  reason,
  onEdit,
}: {
  reason: FailureReason;
  onEdit: () => void;
}) {
  const updateMutation = useUpdateFailureReasonMutation();
  const toggle = () => {
    if (updateMutation.isPending) return;
    updateMutation.mutate({ id: reason.id, data: { active: !reason.active } });
  };

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{reason.code}</TableCell>
      <TableCell>{reason.label}</TableCell>
      <TableCell>{reason.requiresText ? "Yes" : "No"}</TableCell>
      <TableCell>
        <Badge variant={reason.active ? "default" : "secondary"}>
          {reason.active ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={toggle}>
            {reason.active ? "Deactivate" : "Activate"}
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="mr-1 h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function CreateFailureReasonDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const getKey = useIdempotencyKey("failure-reason-create");
  const createMutation = useCreateFailureReasonMutation();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<FailureReasonFormValues>({
    resolver: zodResolver(failureReasonFormSchema),
    defaultValues: { code: "", label: "", requiresText: false, active: true },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      form.reset({ code: "", label: "", requiresText: false, active: true });
      setServerError(null);
    }
    onOpenChange(nextOpen);
  }

  async function onSubmit(values: FailureReasonFormValues) {
    setServerError(null);
    const key = await getKey(values);
    try {
      await createMutation.mutateAsync({ data: values, idempotencyKey: key });
      onOpenChange(false);
    } catch (error) {
      setServerError(messageFor(error, "Failed to create failure reason."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New failure reason</DialogTitle>
          <DialogDescription>
            A reason drivers can select when a delivery fails.
          </DialogDescription>
        </DialogHeader>
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fr-code">Code</Label>
              <Input id="fr-code" placeholder="RECIPIENT_ABSENT" {...form.register("code")} />
              {form.formState.errors.code && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.code.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="fr-label">Label</Label>
              <Input id="fr-label" placeholder="Recipient absent" {...form.register("label")} />
              {form.formState.errors.label && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.label.message}
                </p>
              )}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border-input accent-primary"
              {...form.register("requiresText")}
            />
            Requires additional text
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border-input accent-primary"
              {...form.register("active")}
            />
            Active
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create reason"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditFailureReasonDialog({
  reason,
  open,
  onOpenChange,
}: {
  reason: FailureReason;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateMutation = useUpdateFailureReasonMutation();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<Pick<FailureReasonFormValues, "label" | "requiresText">>({
    resolver: zodResolver(failureReasonEditSchema),
    defaultValues: { label: reason.label, requiresText: reason.requiresText },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      form.reset({ label: reason.label, requiresText: reason.requiresText });
      setServerError(null);
    }
    onOpenChange(nextOpen);
  }

  async function onSubmit(values: { label: string; requiresText: boolean }) {
    setServerError(null);
    try {
      await updateMutation.mutateAsync({ id: reason.id, data: values });
      onOpenChange(false);
    } catch (error) {
      setServerError(messageFor(error, "Failed to update failure reason."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit failure reason</DialogTitle>
          <DialogDescription>
            <span className="font-mono text-xs">{reason.code}</span>
          </DialogDescription>
        </DialogHeader>
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fr-edit-label">Label</Label>
            <Input id="fr-edit-label" {...form.register("label")} />
            {form.formState.errors.label && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.label.message}
              </p>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border-input accent-primary"
              {...form.register("requiresText")}
            />
            Requires additional text
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*  Proof policies                                                            */
/* -------------------------------------------------------------------------- */

function ProofPoliciesTab() {
  const policiesQuery = useProofPolicies();
  const policies = policiesQuery.data?.data ?? [];
  const [createOpen, setCreateOpen] = React.useState(false);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Proof policies</CardTitle>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New policy
        </Button>
      </CardHeader>
      <CardContent>
        {policiesQuery.isLoading && !policies.length && (
          <p className="text-sm text-muted-foreground">Loading proof policies…</p>
        )}
        {!policiesQuery.isLoading && policies.length === 0 && (
          <p className="text-sm text-muted-foreground">No proof policies yet.</p>
        )}
        {policies.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Requirements</TableHead>
                <TableHead className="text-right">Min photos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((policy) => (
                <ProofPolicyRow key={policy.id} policy={policy} />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <CreateProofPolicyDialog open={createOpen} onOpenChange={setCreateOpen} />
    </Card>
  );
}

function ProofPolicyRow({ policy }: { policy: ProofPolicy }) {
  const activateMutation = useActivateProofPolicyMutation();

  const flags = [
    policy.requiresRecipientName && "recipient",
    policy.requiresPhoto && "photo",
    policy.requiresSignature && "signature",
    policy.requiresConfirmation && "confirmation",
    policy.requiresOtp && "otp",
  ].filter(Boolean) as string[];

  return (
    <TableRow>
      <TableCell className="font-medium">{policy.policyVersion}</TableCell>
      <TableCell>
        {flags.length ? flags.join(", ") : "—"}
        <span className="ml-2 text-xs text-muted-foreground">
          created {formatDateTime(policy.createdAt)}
        </span>
      </TableCell>
      <TableCell className="text-right">{policy.minPhotos}</TableCell>
      <TableCell>
        <Badge variant={policy.active ? "default" : "secondary"}>
          {policy.active ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        {!policy.active && (
          <Button
            variant="outline"
            size="sm"
            disabled={activateMutation.isPending}
            onClick={() =>
              activateMutation.mutate({ id: policy.id, active: true })
            }
          >
            Activate
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

function CreateProofPolicyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const getKey = useIdempotencyKey("proof-policy-create");
  const createMutation = useCreateProofPolicyMutation();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<ProofPolicyFormValues>({
    resolver: zodResolver(proofPolicyFormSchema),
    defaultValues: {
      policyVersion: "",
      requiresRecipientName: true,
      requiresPhoto: true,
      requiresSignature: false,
      requiresConfirmation: false,
      requiresOtp: false,
      minPhotos: 1,
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      form.reset({
        policyVersion: "",
        requiresRecipientName: true,
        requiresPhoto: true,
        requiresSignature: false,
        requiresConfirmation: false,
        requiresOtp: false,
        minPhotos: 1,
      });
      setServerError(null);
    }
    onOpenChange(nextOpen);
  }

  async function onSubmit(values: ProofPolicyFormValues) {
    setServerError(null);
    const key = await getKey(values);
    try {
      await createMutation.mutateAsync({ data: values, idempotencyKey: key });
      onOpenChange(false);
    } catch (error) {
      setServerError(messageFor(error, "Failed to create proof policy."));
    }
  }

  const checkboxField = (
    name: keyof ProofPolicyFormValues,
    label: string,
  ) => (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="size-4 rounded border-input accent-primary"
        {...form.register(name)}
      />
      {label}
    </label>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New proof policy</DialogTitle>
          <DialogDescription>
            Requirements for capturing delivery proof. The new policy becomes
            active immediately.
          </DialogDescription>
        </DialogHeader>
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pp-version">Policy version</Label>
            <Input
              id="pp-version"
              placeholder="v2.0"
              {...form.register("policyVersion")}
            />
            {form.formState.errors.policyVersion && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.policyVersion.message}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            {checkboxField("requiresRecipientName", "Recipient name")}
            {checkboxField("requiresPhoto", "Photo")}
            {checkboxField("requiresSignature", "Signature")}
            {checkboxField("requiresConfirmation", "Confirmation")}
            {checkboxField("requiresOtp", "OTP")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="pp-photos">Minimum photos</Label>
            <Input
              id="pp-photos"
              type="number"
              min={0}
              {...form.register("minPhotos", { valueAsNumber: true })}
            />
            {form.formState.errors.minPhotos && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.minPhotos.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create policy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*  System settings                                                           */
/* -------------------------------------------------------------------------- */

function SystemSettingsTab() {
  const settingsQuery = useSystemSettings();
  const settings = settingsQuery.data?.data ?? [];
  const [editing, setEditing] = React.useState<SystemSetting | null>(null);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>System settings</CardTitle>
        <Badge variant="secondary">Values are stored as JSON</Badge>
      </CardHeader>
      <CardContent>
        {settingsQuery.isLoading && !settings.length && (
          <p className="text-sm text-muted-foreground">Loading system settings…</p>
        )}
        {!settingsQuery.isLoading && settings.length === 0 && (
          <p className="text-sm text-muted-foreground">No system settings.</p>
        )}
        {settings.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settings.map((setting) => (
                <TableRow key={setting.key}>
                  <TableCell className="font-mono text-xs">
                    {setting.key}
                  </TableCell>
                  <TableCell className="max-w-md truncate font-mono text-xs">
                    {setting.sensitive
                      ? "••••••••"
                      : JSON.stringify(setting.value)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatDateTime(setting.updatedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(setting)}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      {editing && (
        <EditSettingDialog
          setting={editing}
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      )}
    </Card>
  );
}

function EditSettingDialog({
  setting,
  open,
  onOpenChange,
}: {
  setting: SystemSetting;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateMutation = useUpdateSettingMutation();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<SettingValueFormValues>({
    resolver: zodResolver(settingValueSchema),
    defaultValues: {
      value: setting.sensitive
        ? ""
        : JSON.stringify(setting.value, null, 2),
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      form.reset({
        value: setting.sensitive ? "" : JSON.stringify(setting.value, null, 2),
      });
      setServerError(null);
    }
    onOpenChange(nextOpen);
  }

  async function onSubmit(values: SettingValueFormValues) {
    setServerError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(values.value);
    } catch {
      setServerError("Value must be valid JSON.");
      return;
    }
    try {
      await updateMutation.mutateAsync({ key: setting.key, value: parsed });
      onOpenChange(false);
    } catch (error) {
      setServerError(messageFor(error, "Failed to update setting."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit setting</DialogTitle>
          <DialogDescription>
            <span className="font-mono text-xs">{setting.key}</span>
            {setting.sensitive && (
              <span className="ml-2 text-xs">This value is stored as sensitive.</span>
            )}
          </DialogDescription>
        </DialogHeader>
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="set-value">Value (JSON)</Label>
            <Textarea
              id="set-value"
              rows={8}
              className="font-mono text-xs"
              placeholder={setting.sensitive ? "Enter the raw JSON value" : "{}"}
              {...form.register("value")}
            />
            {form.formState.errors.value && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.value.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving…" : "Save value"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}