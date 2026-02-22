import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider transition-colors shadow-sm backdrop-blur-md",
  {
    variants: {
      variant: {
        default: "border-primary/30 bg-primary/10 text-primary",
        secondary: "border-glass-border bg-secondary/50 text-muted-foreground",
        success: "border-success/30 bg-success/15 text-success shadow-[0_0_8px_rgba(0,200,140,0.1)]",
        warning: "border-warning/30 bg-warning/15 text-warning shadow-[0_0_8px_rgba(245,158,11,0.1)]",
        danger: "border-danger/30 bg-danger/15 text-danger shadow-[0_0_8px_rgba(239,68,68,0.1)]",
        outline: "text-foreground border-glass-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
