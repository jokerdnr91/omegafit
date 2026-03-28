import { NextResponse } from "next/server";

import { buildAuthCookie, signAuthToken, verifyPassword } from "@/src/lib/auth";
import { jsonError, mapErrorToStatus, parseJsonBody } from "@/src/lib/http";
import { findUserByEmail } from "@/src/lib/repository";

function normalizeLoginEmail(value) {
  const raw = String(value ?? "").trim().toLowerCase();

  if (!raw) {
    return "";
  }

  return raw.includes("@") ? raw : `${raw}@omegafit.app`;
}

export async function POST(request) {
  try {
    const payload = await parseJsonBody(request);
    const email = normalizeLoginEmail(payload.email);
    const password = String(payload.password ?? "");

    if (!email || !password) {
      throw new Error("email and password are required.");
    }

    const user = await findUserByEmail(email);
    const isValid = user ? await verifyPassword(password, user.passwordHash) : false;

    if (!user || !isValid) {
      return jsonError("Invalid credentials.", 401);
    }

    const token = signAuthToken(user);
    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set(buildAuthCookie(token));
    return response;
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to login.",
      mapErrorToStatus(error),
    );
  }
}
