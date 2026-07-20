import * as React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps extends React.ComponentProps<"div"> {
  /** Icon rendered inside the muted circle (pass a lucide icon element). */
  icon?: React.ReactNode;
  title: string;
  description?: string;
  /** Optional call-to-action (e.g. a Button). */
  action?: React.ReactNode;
  /** Shows an "On the roadmap" badge for unbuilt features. */
  variant?: "default" | "coming-soon";
}

/**
 * Shared empty state — icon-in-circle, title, description, optional action.
 * Presentation only: callers decide WHEN it shows; this decides HOW it looks.
 */
function EmptyState({
  icon,
  title,
  description,
  action,
  variant = "default",
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      role="status"
      className={cn(
        "flex flex-col items-center justify-center px-6 py-12 text-center animate-fade-in-up",
        className,
      )}
      {...props}
    >
      {icon && (
        <div
          aria-hidden="true"
          className="mb-4 flex size-20 items-center justify-center rounded-full bg-muted [&_svg]:size-10 [&_svg]:text-muted-foreground"
        >
          {icon}
        </div>
      )}
      <h3 className="text-heading text-muted-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-caption text-muted-foreground/80 mb-4 max-w-xs">
          {description}
        </p>
      )}
      {variant === "coming-soon" && (
        <div className="mt-2 px-4 py-1.5 rounded-full bg-muted/60">
          <p className="text-xs text-muted-foreground/60">On the roadmap</p>
        </div>
      )}
      {action}
    </div>
  );
}

export { EmptyState };
