import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingStateProps extends React.ComponentProps<"div"> {
  /** Visually-hidden label announced to screen readers. */
  label?: string;
}

/**
 * Centered spinner loading state.
 * Prefer `ListSkeleton`/`CardSkeleton` for content areas where layout is known — spinners are for short,
 * indeterminate waits.
 */
function LoadingState({
  label = "Loading",
  className,
  ...props
}: LoadingStateProps) {
  return (
    <div
      data-slot="loading-state"
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center justify-center px-6 py-12",
        className,
      )}
      {...props}
    >
      <Loader2 aria-hidden="true" className="size-6 animate-spin text-muted-foreground" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Skeleton placeholder shaped like a standard card. */
function CardSkeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-skeleton"
      className={cn(
        "rounded-lg border border-border bg-card p-5 space-y-3",
        className,
      )}
      {...props}
    >
      <Skeleton className="h-5 w-2/5" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-3/5" />
    </div>
  );
}

interface ListSkeletonProps extends React.ComponentProps<"div"> {
  /** Number of skeleton rows to render. */
  rows?: number;
}

/** Skeleton placeholder shaped like a list of rows (avatar + two lines). */
function ListSkeleton({ rows = 3, className, ...props }: ListSkeletonProps) {
  return (
    <div
      data-slot="list-skeleton"
      className={cn("space-y-3", className)}
      {...props}
    >
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-md border border-border bg-card p-4">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export { LoadingState, CardSkeleton, ListSkeleton };
