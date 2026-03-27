import { broadcastRealtime } from "@/src/lib/realtime";
import { jsonError, jsonSuccess, mapErrorToStatus, parseJsonBody } from "@/src/lib/http";
import { isPushConfigured, sendPushToUser } from "@/src/lib/push";
import {
  createMessageForClient,
  createMessageForCoach,
} from "@/src/lib/repository";
import { requireSessionFromRequest } from "@/src/lib/session";

export async function POST(request) {
  try {
    const session = requireSessionFromRequest(request);
    if (session.user.role === "client" && !session.user.clientId) {
      throw new Error("Unauthorized");
    }
    const payload = await parseJsonBody(request);
    const result =
      session.user.role === "client"
        ? await createMessageForClient(session.user.clientId, session.user.id, payload)
        : await createMessageForCoach(session.user.id, payload);

    if (session.user.role === "client" && isPushConfigured()) {
      await sendPushToUser(result.coachId, {
        title: "Nouveau message client",
        body: `${result.clientName} t'a ecrit dans OMEGA FIT.`,
        tag: "omega-client-message",
        url: "/dashboard",
      });
    }

    if (
      session.user.role === "coach" &&
      isPushConfigured() &&
      result.clientUserId
    ) {
      await sendPushToUser(result.clientUserId, {
        title: "Nouveau message coach",
        body: `${session.user.name} t'a ecrit dans OMEGA FIT.`,
        tag: "omega-coach-message",
        url: "/dashboard",
      });
    }

    broadcastRealtime("message.created", result);
    return jsonSuccess(result, 201);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to create message.",
      mapErrorToStatus(error),
    );
  }
}
