import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getSessionFromCookieStore } from "@/src/lib/auth";

export default async function HomePage() {
  const session = getSessionFromCookieStore(await cookies());
  redirect(session ? "/dashboard" : "/login");
}
