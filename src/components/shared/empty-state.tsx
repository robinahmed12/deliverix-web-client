import { cn } from "@/lib/utils/cn";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Standard empty state (LIST-010). Distinguishes "no results" from "request failed",
 * which is handled by ErrorState instead.
 */
export function EmptyState({
  title = "No results",
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-12 text-center",
        className,
      )}
    >
      {icon && <div className="mb-3 text-muted-foreground">{icon}</div>}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}