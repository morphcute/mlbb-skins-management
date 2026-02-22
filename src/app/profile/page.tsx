import { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/layout/page-heading";
import { ProfileForm } from "@/components/profile/profile-form";
import { requireSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Profile | Skins Management",
};

export default async function ProfilePage() {
  const session = await requireSession();

  return (
    <AppShell role={session.user.role} name={session.user.name}>
      <div className="space-y-6">
        <PageHeading 
          title="Profile" 
          description="Manage your account settings and preferences."
        />
        <ProfileForm />
      </div>
    </AppShell>
  );
}
