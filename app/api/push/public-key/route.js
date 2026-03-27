import { jsonError, jsonSuccess } from "@/src/lib/http";
import { getPushPublicKey, isPushConfigured } from "@/src/lib/push";

export async function GET() {
  try {
    if (!isPushConfigured()) {
      return jsonError("Push notifications are not configured.", 503);
    }

    return jsonSuccess({ publicKey: getPushPublicKey() });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to load push key.", 500);
  }
}
