import * as React from "react";
import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ErrorStateProps extends React.ComponentProps<"div"> {
  title?: string;
  description?: string;
  /** When provided, renders a retry button wired to this handler. */
  onRetry?: () => void;
  retryLabel?: string;
}

/**
 * Shared error state — alert icon, message, optional retry.
 * Presentation only: callers own the error handling; this only renders it.
 */
function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
  retryLabel = "Try again",
  className,
  ...props
}: ErrorStateProps) {
  return (
    <div
      data-slot="error-state"
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center px-6 py-12 text-center animate-fade-in-up",
        className,
      )}
      {...props}
    >
      <div
        aria-hidden="true"
        className="mb-4 flex size-20 items-center justify-center rounded-full bg-red-500/10"
      >
        <TriangleAlert className="size-10 text-red-500" />
      </div>
      <h3 className="text-heading text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-caption text-muted-foreground mb-4 max-w-xs">
          {description}
        </p>
      )}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

export { ErrorState };
