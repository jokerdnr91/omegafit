import { NextResponse } from "next/server";

import { clearAuthCookie } from "@/src/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(clearAuthCookie());
  return response;
}
