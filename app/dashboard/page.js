import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ClientShell } from "@/components/client/client-shell";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getSessionFromCookieStore } from "@/src/lib/auth";

export default async function DashboardPage() {
  const session = getSessionFromCookieStore(await cookies());

  if (!session) {
    redirect("/login");
  }

  if (session.user.role === "client" && !session.user.clientId) {
    redirect("/login");
  }

  return session.user.role === "client" ? (
    <ClientShell user={session.user} />
  ) : (
    <DashboardShell user={session.user} />
  );
}
