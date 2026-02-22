import { Sparkles, WalletCards } from "lucide-react";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { getAuthSession, getHomeRouteByRole } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getAuthSession();

  if (session?.user) {
    redirect(getHomeRouteByRole(session.user.role));
  }

  return (
    <div className="relative flex min-h-screen items-center overflow-hidden px-4 py-10 sm:px-6 lg:px-8 bg-background">
      {/* Background Ambience */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-[10%] -top-[10%] h-125 w-125 rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute -right-[10%] bottom-[10%] h-125 w-125 rounded-full bg-accent/10 blur-[100px]" />
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="glass-panel animate-rise hidden rounded-[30px] border border-glass-border p-8 shadow-xl lg:block">
          <div className="max-w-lg space-y-6">
            <p className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Supplier Operations Suite
            </p>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">
              Manage MLBB skin gifting orders from assignment to completion.
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Built for sellers and suppliers to track balances, status transitions, and low-diamond alerts with clean workflow visibility.
            </p>
            <div className="grid gap-3">
              <div className="rounded-2xl border border-glass-border bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.11em] text-muted-foreground">Live Workflow</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Pending -&gt; Ready for Gifting -&gt; Completed
                </p>
              </div>
              <div className="rounded-2xl border border-glass-border bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.11em] text-muted-foreground">Auto Deduction</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <WalletCards className="h-4 w-4 text-primary" />
                  Diamond cost is deducted when orders are marked Completed
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="animate-rise flex items-center justify-center">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
