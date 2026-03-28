import { NextResponse } from "next/server";

import { buildAuthCookie, signAuthToken } from "@/src/lib/auth";
import { jsonError, mapErrorToStatus, parseJsonBody } from "@/src/lib/http";
import { createCoachAccount } from "@/src/lib/repository";

export async function POST(request) {
  try {
    const payload = await parseJsonBody(request);
    const coach = await createCoachAccount(payload);
    const token = signAuthToken(coach);
    const response = NextResponse.json({ user: coach }, { status: 201 });
    response.cookies.set(buildAuthCookie(token));
    return response;
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to register coach.",
      mapErrorToStatus(error),
    );
  }
}
