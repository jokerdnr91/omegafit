import { jsonError, jsonSuccess, mapErrorToStatus, parseJsonBody } from "@/src/lib/http";
import { sendPushToUser } from "@/src/lib/push";
import { requireSessionFromRequest } from "@/src/lib/session";

const notificationCatalog = {
  reminder: {
    title: "Rappel de seance",
    body: "Bloc performance prevu aujourd'hui. Ouvre OMEGA FIT pour preparer la session.",
    tag: "omega-reminder",
    url: "/dashboard",
  },
  message: {
    title: "Nouveau message coach",
    body: "Un message prioritaire attend dans OMEGA FIT.",
    tag: "omega-message",
    url: "/dashboard",
  },
};

export async function POST(request) {
  try {
    const session = requireSessionFromRequest(request);
    const payload = await parseJsonBody(request);
    const type = String(payload.type ?? "reminder");
    const notification = notificationCatalog[type] ?? notificationCatalog.reminder;
    const result = await sendPushToUser(session.user.id, notification);
    return jsonSuccess(result);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to send push notification.",
      mapErrorToStatus(error),
    );
  }
}
