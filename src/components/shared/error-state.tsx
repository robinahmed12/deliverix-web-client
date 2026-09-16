import { AlertCircle } from "lucide-react";
import { isApiError, messageFor } from "@/lib/api/errors";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ErrorStateProps {
  error: Error;
  onRetry?: () => void;
  description?: string;
}

/**
 * Standard error state (LIST-010). Renders a safe, support-ready message with the
 * request ID when the backend supplied one (ERR-003). Raw technical details are
 * never rendered (ERR-004).
 */
export function ErrorState({ error, onRetry, description }: ErrorStateProps) {
  const message = messageFor(error);
  const requestId = isApiError(error) ? error.requestId : undefined;

  return (
    <div className="w-full">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription className="flex w-full flex-col gap-3">
          <span>{description ?? message}</span>
          {requestId && (
            <span className="text-xs opacity-70">Request ID: {requestId}</span>
          )}
          {onRetry && (
            <span>
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                type="button"
              >
                Try again
              </Button>
            </span>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}