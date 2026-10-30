"use client";

import * as React from "react";
import { Check, CheckCircle2, Package, Navigation, Truck, Flag, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const JOURNEY_STEPS = [
  { key: "Assigned", label: "Assigned", icon: CheckCircle2 },
  { key: "PickedUp", label: "Picked Up", icon: Package },
  { key: "InTransit", label: "In Transit", icon: Navigation },
  { key: "OutForDelivery", label: "Out for Delivery", icon: Truck },
  { key: "Delivered", label: "Delivered", icon: Flag },
] as const;

type StepKey = (typeof JOURNEY_STEPS)[number]["key"];

const STEP_ORDER: Record<string, number> = {
  Draft: -1,
  PendingAcceptance: -1,
  ReadyForPickup: -1,
  Assigned: 0,
  PickedUp: 1,
  InTransit: 2,
  OutForDelivery: 3,
  Delivered: 4,
};

interface DeliveryJourneyStepperProps {
  status: string;
  className?: string;
}

export function DeliveryJourneyStepper({ status, className }: DeliveryJourneyStepperProps) {
  const isFailed = status === "Failed" || status === "Cancelled";
  const currentIndex = STEP_ORDER[status] ?? -1;

  if (isFailed) {
    return (
      <div className={cn("rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive flex items-center gap-2 text-sm font-medium", className)}>
        <AlertTriangle className="size-4 shrink-0" />
        <span>Delivery status: <strong className="uppercase">{status}</strong>. Regular journey halted.</span>
      </div>
    );
  }

  return (
    <div className={cn("w-full py-2", className)}>
      {/* Desktop / Tablet: Horizontal Stepper */}
      <div className="hidden sm:flex items-center justify-between relative">
        <div className="absolute left-6 right-6 top-4 -translate-y-1/2 h-0.5 bg-muted z-0" />
        <div
          className="absolute left-6 top-4 -translate-y-1/2 h-0.5 bg-primary transition-all duration-300 z-0"
          style={{
            width: currentIndex >= 0 ? `${(Math.min(currentIndex, JOURNEY_STEPS.length - 1) / (JOURNEY_STEPS.length - 1)) * 100}%` : "0%",
          }}
        />

        {JOURNEY_STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isCompleted = currentIndex > idx;
          const isCurrent = currentIndex === idx;
          const isPending = currentIndex < idx;

          return (
            <div key={step.key} className="flex flex-col items-center relative z-10">
              <div
                className={cn(
                  "size-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all shadow-xs",
                  isCompleted && "bg-emerald-600 text-white shadow-emerald-500/20",
                  isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110",
                  isPending && "bg-muted text-muted-foreground border border-border",
                )}
              >
                {isCompleted ? <Check className="size-4 stroke-[3]" /> : <Icon className="size-4" />}
              </div>
              <span
                className={cn(
                  "mt-2 text-xs text-center transition-colors font-medium whitespace-nowrap",
                  isCurrent && "text-foreground font-bold",
                  isCompleted && "text-emerald-700 dark:text-emerald-400 font-semibold",
                  isPending && "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mobile: Compact Progress Bar & Current Milestone */}
      <div className="sm:hidden space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-muted-foreground uppercase tracking-wide">
            Milestone {Math.max(1, currentIndex + 1)} of {JOURNEY_STEPS.length}
          </span>
          <span className="font-bold text-primary">
            {JOURNEY_STEPS[Math.max(0, Math.min(currentIndex, JOURNEY_STEPS.length - 1))].label}
          </span>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{
              width: currentIndex >= 0 ? `${((currentIndex + 1) / JOURNEY_STEPS.length) * 100}%` : "0%",
            }}
          />
        </div>
      </div>
    </div>
  );
}
