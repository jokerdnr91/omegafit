import { broadcastRealtime } from "@/src/lib/realtime";
import { jsonError, jsonSuccess, mapErrorToStatus, parseJsonBody } from "@/src/lib/http";
import { updateClientForCoach } from "@/src/lib/repository";
import { requireRole, requireSessionFromRequest } from "@/src/lib/session";

export async function PATCH(request, { params }) {
  try {
    const session = requireRole(requireSessionFromRequest(request), ["coach"]);
    const resolvedParams = await params;
    const payload = await parseJsonBody(request);
    const result = await updateClientForCoach(session.user.id, resolvedParams.id, payload);
    broadcastRealtime("client.updated", result);
    return jsonSuccess(result);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to update client.",
      mapErrorToStatus(error),
    );
  }
}
