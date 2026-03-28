import { jsonError, jsonSuccess, mapErrorToStatus, parseJsonBody } from "@/src/lib/http";
import { createCoachAccount } from "@/src/lib/repository";
import { requireRole, requireSessionFromRequest } from "@/src/lib/session";

export async function POST(request) {
  try {
    requireRole(requireSessionFromRequest(request), ["coach"]);
    const payload = await parseJsonBody(request);
    const coach = await createCoachAccount(payload);
    return jsonSuccess({ user: coach }, 201);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to create coach.",
      mapErrorToStatus(error),
    );
  }
}
