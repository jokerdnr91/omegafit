import { broadcastRealtime } from "@/src/lib/realtime";
import { jsonError, jsonSuccess, mapErrorToStatus, parseJsonBody } from "@/src/lib/http";
import { createCheckInForCoach } from "@/src/lib/repository";
import { requireRole, requireSessionFromRequest } from "@/src/lib/session";

export async function POST(request) {
  try {
    const session = requireRole(requireSessionFromRequest(request), ["coach"]);
    const payload = await parseJsonBody(request);
    const result = await createCheckInForCoach(session.user.id, payload);
    broadcastRealtime("checkin.created", result);
    return jsonSuccess(result, 201);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to create check-in.",
      mapErrorToStatus(error),
    );
  }
}
