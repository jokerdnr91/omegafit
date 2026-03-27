import test from "node:test";
import assert from "node:assert/strict";

import { signAuthToken, verifyAuthToken } from "../src/lib/auth.js";

test("JWT helpers sign and verify a session token", () => {
  const token = signAuthToken({
    id: "coach-1",
    email: "coach@omegafit.app",
    name: "Milan Roche",
    role: "coach",
    clientId: null,
  });

  const payload = verifyAuthToken(token);

  assert.equal(payload.sub, "coach-1");
  assert.equal(payload.email, "coach@omegafit.app");
  assert.equal(payload.role, "coach");
  assert.equal(payload.clientId, null);
});
