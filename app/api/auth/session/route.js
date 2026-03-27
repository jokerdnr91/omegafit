import { jsonError, jsonSuccess } from "@/src/lib/http";
import { requireSessionFromRequest } from "@/src/lib/session";

export async function GET(request) {
  try {
    const session = requireSessionFromRequest(request);
    return jsonSuccess(session);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unauthorized",
      401,
    );
  }
}
