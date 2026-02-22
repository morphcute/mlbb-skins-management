import { Role } from "@prisma/client";

import { AdminOrdersClient } from "@/components/admin/admin-orders-client";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/layout/page-heading";
import { requireRole } from "@/lib/auth";

export default async function AdminOrdersPage() {
  const session = await requireRole([Role.ADMIN]);

  return (
    <AppShell role={session.user.role} name={session.user.name}>
      <PageHeading
        eyebrow="Seller Console"
        title="Order Management"
        description="Create and assign gifting orders, track progress, and update lifecycle statuses in one place."
      />
      <AdminOrdersClient />
    </AppShell>
  );
}
