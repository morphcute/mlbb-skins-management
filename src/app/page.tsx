import { redirect } from "next/navigation";

import { getAuthSession, getHomeRouteByRole } from "@/lib/auth";

export default async function HomePage() {
  const session = await getAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  redirect(getHomeRouteByRole(session.user.role));
}
