import { broadcastRealtime } from "@/src/lib/realtime";
import { jsonError, jsonSuccess, mapErrorToStatus, parseJsonBody } from "@/src/lib/http";
import { saveWorkoutSessionForClient } from "@/src/lib/repository";
import { requireRole, requireSessionFromRequest } from "@/src/lib/session";

export async function POST(request) {
  try {
    const session = requireRole(requireSessionFromRequest(request), ["client"]);

    if (!session.user.clientId) {
      throw new Error("Unauthorized");
    }

    const payload = await parseJsonBody(request);
    const result = await saveWorkoutSessionForClient(
      session.user.clientId,
      session.user.id,
      payload,
    );

    broadcastRealtime("session.updated", result);
    return jsonSuccess(result, 201);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to save workout session.",
      mapErrorToStatus(error),
    );
  }
}
