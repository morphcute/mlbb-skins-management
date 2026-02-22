import { Role } from "@prisma/client";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/layout/page-heading";
import { SupplierDashboardClient } from "@/components/supplier/supplier-dashboard-client";
import { requireRole } from "@/lib/auth";

export default async function SupplierDashboardPage() {
  const session = await requireRole([Role.SUPPLIER]);

  return (
    <AppShell role={session.user.role} name={session.user.name}>
      <PageHeading
        eyebrow="Supplier Workspace"
        title="Supplier Dashboard"
        description="Review assigned accounts, mark readiness for gifting, and complete orders when delivery is done."
      />
      <SupplierDashboardClient />
    </AppShell>
  );
}
