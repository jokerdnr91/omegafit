import test from "node:test";
import assert from "node:assert/strict";

import { buildClientPayload, buildOverview } from "../src/lib/analytics.js";
import { coachPresentation } from "../src/lib/seed.js";

test("buildClientPayload enriches client data with nested program and progression", () => {
  const client = {
    id: "client-1",
    fullName: "Sarah Mendes",
    goal: "Transformation",
    planTier: "Elite",
    nextSessionAt: new Date().toISOString(),
    status: "On track",
    stats: { adherence: 94, recovery: 82 },
    nutrition: { calories: 2100, protein: 150, carbs: 200, fats: 65 },
    tasks: [],
    trend: [
      { date: "2026-03-01T08:00:00.000Z", performance: 70, strength: 72, conditioning: 68 },
      { date: "2026-03-08T08:00:00.000Z", performance: 76, strength: 75, conditioning: 71 },
    ],
  };
  const programs = [{ id: "program-1", title: "Hybrid Engine", focus: "Hybrid", clientIds: ["client-1"] }];
  const messages = [{ id: "msg-1", clientId: "client-1", senderRole: "client", content: "hello", read: false, createdAt: "2026-03-08T09:00:00.000Z" }];
  const checkIns = [{ id: "check-1", clientId: "client-1", workoutCompletion: 90, energy: 8, soreness: 4, motivation: 9, weightKg: 67.8, note: "ok", createdAt: "2026-03-08T08:30:00.000Z" }];

  const payload = buildClientPayload({ ...client, programId: "program-1" }, programs, messages, checkIns);

  assert.equal(payload.program.title, "Hybrid Engine");
  assert.equal(payload.unreadMessages, 1);
  assert.equal(payload.progression.performanceDelta, 6);
  assert.equal(payload.latestCheckIn.id, "check-1");
});

test("buildOverview returns dashboard metrics and agenda", () => {
  const clients = [
    {
      id: "client-1",
      fullName: "Sarah Mendes",
      goal: "Transformation",
      nextSessionAt: "2026-03-27T18:00:00.000Z",
      status: "On track",
      planTier: "Elite",
      stats: { adherence: 95, recovery: 84 },
      progression: { performanceDelta: 4 },
      trend: [{ performance: 84 }],
    },
  ];
  const overview = buildOverview({
    coach: coachPresentation,
    clients,
    programs: [{ id: "program-1" }],
    messages: [{ senderRole: "client", read: false }],
    activity: [{ id: "activity-1", createdAt: "2026-03-27T10:00:00.000Z" }],
  });

  assert.equal(overview.metrics.length, 5);
  assert.equal(overview.spotlightClient.name, "Sarah Mendes");
  assert.equal(overview.agenda.length, 1);
});
