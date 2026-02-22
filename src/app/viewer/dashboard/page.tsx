import { Role } from "@prisma/client";

import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/layout/page-heading";
import { requireRole } from "@/lib/auth";

export default async function ViewerDashboardPage() {
  const session = await requireRole([Role.VIEWER]);

  return (
    <AppShell role={session.user.role} name={session.user.name}>
      <PageHeading
        eyebrow="Read Only"
        title="Viewer Dashboard"
        description="Monitor supplier health and order progress with no edit permissions."
      />
      <AdminDashboardClient />
    </AppShell>
  );
}
