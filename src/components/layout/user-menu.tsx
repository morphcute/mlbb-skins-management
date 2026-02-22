"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type UserMenuProps = {
  name?: string | null;
  compact?: boolean;
};

export function UserMenu({ name, compact = false }: UserMenuProps) {
  return (
    <div className={cn("flex items-center gap-3", compact ? "justify-end" : "")} suppressHydrationWarning>
      {!compact ? <p className="hidden text-sm font-medium text-muted-foreground sm:block">{name ?? "User"}</p> : null}
      <Button
        variant="outline"
        size={compact ? "sm" : "default"}
        className="border-glass-border bg-card hover:bg-muted"
        onClick={() =>
          signOut({
            callbackUrl: "/login",
          })
        }
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </Button>
    </div>
  );
}
