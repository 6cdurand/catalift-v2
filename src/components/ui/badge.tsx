import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-all duration-200 overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-theme/15 text-theme-strong [a&]:hover:bg-theme/25",
        secondary:
          "border-border bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/80",
        destructive:
          "border-transparent bg-red-500/15 text-red-600 [a&]:hover:bg-red-500/25 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border-border text-muted-foreground [a&]:hover:bg-elevated [a&]:hover:text-foreground",
        success:
          "border-transparent bg-emerald-500/15 text-emerald-600 [a&]:hover:bg-emerald-500/25",
        warning:
          "border-transparent bg-amber-500/15 text-amber-600 [a&]:hover:bg-amber-500/25",
        milestone:
          "border-transparent bg-gradient-to-r from-orange-500/15 to-amber-500/15 text-orange-600 [a&]:hover:from-orange-500/25 [a&]:hover:to-amber-500/25",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
