import { Role } from "@prisma/client";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/layout/page-heading";
import { SupplierBalanceClient } from "@/components/supplier/supplier-balance-client";
import { requireRole } from "@/lib/auth";

export default async function SupplierBalancePage() {
  const session = await requireRole([Role.SUPPLIER]);

  return (
    <AppShell role={session.user.role} name={session.user.name}>
      <PageHeading
        eyebrow="Supplier Workspace"
        title="Balance Management"
        description="Top up or adjust your diamond balance and review every balance movement in the log."
      />
      <SupplierBalanceClient />
    </AppShell>
  );
}
