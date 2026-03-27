import { getSessionFromRequest } from "./auth.js";

export function requireSessionFromRequest(request) {
  const session = getSessionFromRequest(request);

  if (!session) {
    throw new Error("Unauthorized");
  }

  return session;
}

export function requireRole(session, allowedRoles) {
  if (!allowedRoles.includes(session.user.role)) {
    throw new Error("Unauthorized");
  }

  return session;
}
