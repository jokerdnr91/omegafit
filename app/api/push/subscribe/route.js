import { jsonError, jsonSuccess, mapErrorToStatus, parseJsonBody } from "@/src/lib/http";
import { savePushSubscriptionForUser } from "@/src/lib/push";
import { requireSessionFromRequest } from "@/src/lib/session";

export async function POST(request) {
  try {
    const session = requireSessionFromRequest(request);
    const payload = await parseJsonBody(request);
    const result = await savePushSubscriptionForUser(session.user.id, payload.subscription);
    return jsonSuccess(result, 201);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to save push subscription.",
      mapErrorToStatus(error),
    );
  }
}
