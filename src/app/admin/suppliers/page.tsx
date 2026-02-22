import { Role } from "@prisma/client";

import { AdminSuppliersClient } from "@/components/admin/admin-suppliers-client";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/layout/page-heading";
import { requireRole } from "@/lib/auth";

export default async function AdminSuppliersPage() {
  const session = await requireRole([Role.ADMIN]);

  return (
    <AppShell role={session.user.role} name={session.user.name}>
      <PageHeading
        eyebrow="Seller Console"
        title="Supplier Management"
        description="Create supplier accounts and keep balances healthy."
      />
      <AdminSuppliersClient />
    </AppShell>
  );
}
