import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-theme/30 selection:text-foreground",
        "bg-background border-input text-foreground",
        "h-11 w-full min-w-0 rounded-md border px-4 py-2.5 text-base shadow-xs",
        "transition-all duration-200 outline-none",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus:border-theme focus:ring-2 focus:ring-theme/20",
        "hover:border-ring/60",
        "aria-invalid:ring-destructive/20 aria-invalid:border-destructive/50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
