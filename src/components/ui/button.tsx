import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold tracking-wide transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--primary)] active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary-strong shadow-[0_4px_14px_rgba(0,200,140,0.3)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,200,140,0.4)]",
        secondary:
          "bg-white/5 text-[var(--foreground)] border border-white/10 hover:bg-white/10 hover:border-white/20 hover:-translate-y-0.5",
        outline:
          "border border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(0,200,140,0.2)]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[0_4px_14px_rgba(239,68,68,0.3)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(239,68,68,0.4)]",
        ghost: "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5",
        link: "text-[var(--primary)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return <button className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
