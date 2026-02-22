"use client";

import { Role } from "@prisma/client";
import { 
  Activity, 
  Home, 
  ShieldCheck, 
  Users, 
  Wallet,
  LogOut,
  RefreshCcw,
  User
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

import { UserMenu } from "@/components/layout/user-menu";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type AppShellProps = {
  role: Role;
  name?: string | null;
  children: React.ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navByRole: Record<Role, NavItem[]> = {
  ADMIN: [
    { href: "/admin/dashboard", label: "Home", icon: Home },
    { href: "/admin/orders", label: "Orders", icon: Activity },
    { href: "/admin/suppliers", label: "Suppliers", icon: Users },
    { href: "/admin/refunds", label: "Refunds", icon: RefreshCcw },
    { href: "/profile", label: "Profile", icon: User },
  ],
  SUPPLIER: [
    { href: "/supplier/dashboard", label: "Home", icon: Home },
    { href: "/supplier/balance", label: "Wallet", icon: Wallet },
    { href: "/profile", label: "Profile", icon: User },
  ],
  VIEWER: [
    { href: "/viewer/dashboard", label: "Home", icon: Home },
    { href: "/profile", label: "Profile", icon: User },
  ],
};

const roleLabel: Record<Role, string> = {
  ADMIN: "Admin",
  SUPPLIER: "Supplier",
  VIEWER: "Viewer",
};

export function AppShell({ role, name, children }: AppShellProps) {
  const pathname = usePathname();
  const currentNav = navByRole[role];

  const isRouteActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="relative min-h-screen pb-20 lg:pb-0 lg:pl-64">
      {/* Background Ambience */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-[10%] -top-[10%] h-125 w-125 rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute -right-[10%] bottom-[10%] h-125 w-125 rounded-full bg-accent/10 blur-[100px]" />
      </div>

      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-glass-border bg-surface backdrop-blur-xl lg:flex">
        <div className="flex h-16 items-center gap-2 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-primary to-accent text-white shadow-lg shadow-primary/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-base font-bold tracking-tight text-white">Skins Management</h1>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{roleLabel[role]}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-4">
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Menu</p>
          {currentNav.map((item) => {
            const active = isRouteActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-primary/10 text-primary shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
                    : "text-muted-foreground hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground group-hover:text-white")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-glass-border p-4">
          <div className="mb-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-secondary to-slate-800 text-white ring-2 ring-white/10">
                <span className="font-display text-sm font-bold">{name?.[0] ?? "U"}</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-white">{name ?? "User"}</p>
                <p className="truncate text-xs text-muted-foreground">{roleLabel[role]}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="mt-3 w-full justify-start gap-2 text-muted-foreground hover:text-white hover:bg-white/5"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar (Logo & Profile) */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-glass-border bg-surface px-4 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-primary to-accent text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="font-display text-base font-bold text-white">Skins Management</span>
        </div>
        <UserMenu compact name={name} />
      </header>

      {/* Main Content */}
      <main className="relative z-0 min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:min-h-screen lg:p-8">
        <div className="animate-rise mx-auto max-w-6xl">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-glass-border bg-surface pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl lg:hidden">
        <div className="flex h-16 items-center justify-around px-2">
          {currentNav.map((item) => {
            const active = isRouteActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 py-1 transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-white"
                )}
              >
                <div className={cn(
                  "flex h-9 w-16 items-center justify-center rounded-full transition-all",
                  active ? "bg-primary/15" : "bg-transparent"
                )}>
                  <Icon className={cn("h-5 w-5", active && "fill-current")} />
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
          
          {/* "More" placeholder if needed, for now just the mapped items */}
        </div>
      </nav>
    </div>
  );
}
