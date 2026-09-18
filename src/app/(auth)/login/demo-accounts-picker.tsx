"use client";

import * as React from "react";
import { useState } from "react";
import { DEMO_ACCOUNTS, type DemoAccount } from "./demo-accounts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, KeyRound } from "lucide-react";

interface DemoAccountsPickerProps {
  onSelect: (account: DemoAccount) => void;
  disabled?: boolean;
}

export function DemoAccountsPicker({
  onSelect,
  disabled,
}: DemoAccountsPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="demo-account-list"
      >
        <KeyRound className="mr-2 h-4 w-4" aria-hidden="true" />
        Use a demo account
        {open ? (
          <ChevronUp className="ml-2 h-4 w-4" aria-hidden="true" />
        ) : (
          <ChevronDown className="ml-2 h-4 w-4" aria-hidden="true" />
        )}
      </Button>

      {open && (
        <div
          id="demo-account-list"
          className="space-y-2 rounded-lg border p-3"
        >
          <p className="text-xs text-muted-foreground">
            Click a credential to fill in the login form.
          </p>
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => onSelect(account)}
              className="flex w-full flex-col gap-1 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={disabled}
            >
              <span className="flex items-center gap-2">
                <Badge variant="secondary">{account.role}</Badge>
              </span>
              <span className="mt-1 space-y-0.5 text-sm">
                <span className="block">
                  <span className="text-muted-foreground">Email:</span>{" "}
                  <code className="font-medium">{account.email}</code>
                </span>
                <span className="block">
                  <span className="text-muted-foreground">Password:</span>{" "}
                  <code className="font-medium">{account.password}</code>
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}