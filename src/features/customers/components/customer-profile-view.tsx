"use client";

import * as React from "react";
import { User, ShieldCheck, Link2, CheckCircle2 } from "lucide-react";
import { useMyProfileQuery, useUpdateMyProfileMutation, useLinkAccountMutation } from "../queries";
import { useCurrentUser } from "@/features/auth/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerSupportChatWidget } from "@/features/support-rag/components/customer-support-chat-widget";

interface ProfileFormProps {
  initialName: string;
  initialPhone: string;
  email: string;
  onSave: (name: string, phone: string) => Promise<void>;
  isPending: boolean;
}

function ProfileForm({
  initialName,
  initialPhone,
  email,
  onSave,
  isPending,
}: ProfileFormProps) {
  const [name, setName] = React.useState(initialName);
  const [phone, setPhone] = React.useState(initialPhone);
  const [isSaved, setIsSaved] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(name, phone);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Verified Email</Label>
        <div className="relative">
          <Input
            id="email"
            value={email}
            disabled
            className="bg-muted text-muted-foreground pr-24"
          />
          <div className="absolute right-3 top-2.5 flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <ShieldCheck className="size-4" />
            Verified
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Email is tied to your login account and receives milestone delivery confirmations.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone Number (For Courier Contact)</Label>
        <Input
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 555-0199"
        />
        <p className="text-xs text-muted-foreground">
          Couriers use this phone number if gate access or drop-off instructions are unclear.
        </p>
      </div>

      <div className="flex items-center justify-between pt-2">
        {isSaved ? (
          <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
            <CheckCircle2 className="size-4" />
            Profile updated successfully!
          </span>
        ) : <div />}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

export function CustomerProfileView() {
  const { data: user } = useCurrentUser();
  const { data: profile, isLoading, refetch } = useMyProfileQuery();

  const updateMutation = useUpdateMyProfileMutation();
  const linkMutation = useLinkAccountMutation();

  const handleUpdateProfile = async (name: string, phone: string) => {
    await updateMutation.mutateAsync({
      name: name.trim(),
      phone: phone.trim() || null,
    });
    void refetch();
  };

  const handleLinkGuestAccount = async () => {
    await linkMutation.mutateAsync({});
    void refetch();
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 md:p-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Customer Profile</h1>
        <p className="text-muted-foreground mt-1">
          Manage your personal details, contact preferences, and verified account linking.
        </p>
      </div>

      {/* Profile Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <User className="size-4 text-primary" />
              Personal Details
            </CardTitle>
            <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
              Active Customer
            </Badge>
          </div>
          <CardDescription>
            Your name and contact information are used for shipment notifications and courier delivery receipts.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <ProfileForm
            key={profile?.id ?? "default"}
            initialName={profile?.name ?? ""}
            initialPhone={profile?.phone ?? ""}
            email={profile?.email ?? user?.email ?? ""}
            onSave={handleUpdateProfile}
            isPending={updateMutation.isPending}
          />
        </CardContent>
      </Card>

      {/* Account Linking Card (CUS-005) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link2 className="size-4 text-primary" />
            <CardTitle className="text-base font-semibold">Historical Guest Orders Linking (CUS-005)</CardTitle>
          </div>
          <CardDescription>
            If you placed orders as a guest before creating this account, click below to automatically link your past order history using your verified email address.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
            <div className="text-sm">
              <span className="font-medium text-foreground">Verified Email Match:</span>{" "}
              <span className="text-muted-foreground">{user?.email}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLinkGuestAccount}
              disabled={linkMutation.isPending}
            >
              {linkMutation.isPending ? "Linking..." : "Sync Guest Orders"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <CustomerSupportChatWidget />
    </div>
  );
}
