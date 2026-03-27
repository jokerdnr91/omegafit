import { jsonError, jsonSuccess, mapErrorToStatus } from "@/src/lib/http";
import {
  getClientDashboardData,
  getDashboardDataForCoach,
} from "@/src/lib/repository";
import { requireSessionFromRequest } from "@/src/lib/session";

export async function GET(request) {
  try {
    const session = requireSessionFromRequest(request);
    if (session.user.role === "client" && !session.user.clientId) {
      throw new Error("Unauthorized");
    }
    const dashboard =
      session.user.role === "client"
        ? await getClientDashboardData(session.user.clientId)
        : await getDashboardDataForCoach(session.user.id);
    return jsonSuccess(dashboard);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to load dashboard.",
      mapErrorToStatus(error),
    );
  }
}
