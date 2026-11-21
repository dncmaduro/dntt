import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/12 text-primary ring-primary/10",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground ring-transparent",
        outline: "border-border bg-card text-foreground ring-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof badgeVariants>) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
