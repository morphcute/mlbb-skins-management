import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

import { AdminRefundsClient } from "../../../components/admin/admin-refunds-client";
import { getAuthSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/layout/page-heading";

export const metadata = {
  title: "Refunds | Admin",
  description: "Manage refunded orders and re-assign them.",
};

export default async function AdminRefundsPage() {
  const session = await getAuthSession();

  if (!session || session.user.role !== Role.ADMIN) {
    redirect("/auth/signin");
  }

  return (
    <AppShell role={session.user.role} name={session.user.name}>
      <PageHeading
        title="Refunds"
        description="Manage refunded orders and re-assign them."
      />
      <AdminRefundsClient />
    </AppShell>
  );
}
