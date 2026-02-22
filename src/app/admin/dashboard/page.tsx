import { Role } from "@prisma/client";

import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/layout/page-heading";
import { requireRole } from "@/lib/auth";

export default async function AdminDashboardPage() {
  const session = await requireRole([Role.ADMIN]);

  return (
    <AppShell role={session.user.role} name={session.user.name}>
      <PageHeading
        eyebrow="Seller Console"
        title="Admin Dashboard"
        description="Real-time supplier balances, low-balance alerts, and recent order activity across your operation."
      />
      <AdminDashboardClient />
    </AppShell>
  );
}
