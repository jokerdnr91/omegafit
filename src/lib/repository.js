import { randomUUID } from "node:crypto";

import { buildClientPayload, buildOverview } from "./analytics.js";
import { coachPresentation } from "./seed.js";
import { query, withTransaction } from "./db.js";

function toNumber(value) {
  return Number(value);
}

function groupBy(rows, key) {
  return rows.reduce((map, row) => {
    const entryKey = row[key];
    const current = map.get(entryKey) ?? [];
    current.push(row);
    map.set(entryKey, current);
    return map;
  }, new Map());
}

function shapeProgramExercise(row) {
  return {
    id: row.id,
    dayLabel: row.day_label,
    name: row.name,
    videoUrl: row.video_url,
    targetSets: row.target_sets,
    targetReps: row.target_reps,
    targetWeightKg: row.target_weight_kg ? toNumber(row.target_weight_kg) : null,
    sortOrder: row.sort_order,
  };
}

function shapeProgram(row, clientIds, exercises = []) {
  return {
    id: row.id,
    title: row.title,
    focus: row.focus,
    durationWeeks: row.duration_weeks,
    intensity: row.intensity,
    weeklyStructure: row.weekly_structure ?? [],
    milestones: row.milestones ?? [],
    clientIds,
    exercises,
    createdAt: row.created_at,
  };
}

function shapeMessage(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    senderRole: row.sender_role,
    content: row.content,
    mediaUrl: row.media_url,
    mediaType: row.media_type,
    read: row.read,
    createdAt: row.created_at,
  };
}

function shapeCheckIn(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    workoutCompletion: row.workout_completion,
    energy: row.energy,
    soreness: row.soreness,
    motivation: row.motivation,
    weightKg: toNumber(row.weight_kg),
    note: row.note,
    createdAt: row.created_at,
  };
}

function shapeTrendPoint(row) {
  return {
    date: row.recorded_at,
    weightKg: toNumber(row.weight_kg),
    performance: row.performance,
    strength: row.strength,
    conditioning: row.conditioning,
  };
}

function shapeActivity(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    type: row.type,
    title: row.title,
    detail: row.detail,
    createdAt: row.created_at,
  };
}

function shapeWorkoutExercise(row, log) {
  return {
    id: row.id,
    name: row.name,
    videoUrl: row.video_url,
    targetSets: row.target_sets,
    targetReps: row.target_reps,
    targetWeightKg: row.target_weight_kg ? toNumber(row.target_weight_kg) : null,
    sortOrder: row.sort_order,
    actualWeightKg: log?.actual_weight_kg ? toNumber(log.actual_weight_kg) : null,
    actualReps: log?.actual_reps ?? null,
    actualSets: log?.actual_sets ?? null,
    skipped: Boolean(log?.skipped),
    skipReasons: log?.skip_reasons ?? [],
    skipNote: log?.skip_note ?? "",
    completedAt: log?.completed_at ?? null,
  };
}

function shapeWorkoutSession(row, exercises) {
  return {
    id: row.id,
    title: row.title,
    focus: row.focus,
    scheduledFor: row.scheduled_for,
    status: row.status,
    coachNote: row.coach_note,
    weekLabel: row.week_label,
    exercises,
  };
}

function buildWeeklyProgress(checkIns) {
  const latest = checkIns.slice(0, 4);

  if (!latest.length) {
    return {
      completion: 0,
      momentum: 0,
      consistency: 0,
    };
  }

  const completion =
    latest.reduce((sum, entry) => sum + Number(entry.workoutCompletion ?? 0), 0) / latest.length;
  const motivation =
    latest.reduce((sum, entry) => sum + Number(entry.motivation ?? 0), 0) / latest.length;

  return {
    completion: Math.round(completion),
    momentum: Math.round(motivation * 10),
    consistency: Math.min(100, Math.round((completion * 0.7 + motivation * 6) / 1.3)),
  };
}

function buildProgressHistory(checkIns, trends) {
  return checkIns.slice(0, 8).map((entry, index) => {
    const trend = trends.at(-(index + 1));
    return {
      id: entry.id,
      date: entry.createdAt,
      weightKg: entry.weightKg,
      performance: trend?.performance ?? null,
      note: entry.note,
      workoutCompletion: entry.workoutCompletion,
    };
  });
}

function buildClientProfile(clientPayload) {
  const lastTrend = clientPayload.trend.at(-1);
  const firstTrend = clientPayload.trend.at(0);
  const performanceDelta =
    lastTrend && firstTrend ? Math.round(lastTrend.performance - firstTrend.performance) : 0;
  const weightDelta =
    lastTrend && firstTrend
      ? Math.round((lastTrend.weightKg - firstTrend.weightKg) * 10) / 10
      : 0;

  return {
    goal: clientPayload.goal,
    currentWeightKg: clientPayload.stats.weightKg,
    disciplineScore: clientPayload.stats.adherence,
    joinedAt: clientPayload.joinedAt,
    stats: [
      { label: "Body fat", value: `${clientPayload.stats.bodyFat}%` },
      { label: "Sommeil", value: `${clientPayload.stats.sleepHours} h` },
      { label: "Hydratation", value: `${clientPayload.stats.hydration}%` },
      { label: "HRV", value: `${clientPayload.stats.hrv}` },
      { label: "Pas / jour", value: `${clientPayload.stats.stepsAvg}` },
      { label: "Perf 6 semaines", value: `${performanceDelta >= 0 ? "+" : ""}${performanceDelta}` },
      { label: "Variation poids", value: `${weightDelta >= 0 ? "+" : ""}${weightDelta} kg` },
      { label: "Recuperation", value: `${clientPayload.stats.recovery}%` },
    ],
  };
}

function buildExerciseAnalysis(logs) {
  const total = logs.length;

  if (!total) {
    return {
      completedPercent: 0,
      abandonedPercent: 0,
      frequentReasons: [],
    };
  }

  const abandoned = logs.filter((log) => Boolean(log.skipped));
  const reasonCounts = new Map();

  for (const log of abandoned) {
    for (const reason of log.skip_reasons ?? []) {
      const key = String(reason).toLowerCase();
      reasonCounts.set(key, (reasonCounts.get(key) ?? 0) + 1);
    }

    if (log.skip_note) {
      const key = "autre";
      reasonCounts.set(key, (reasonCounts.get(key) ?? 0) + 1);
    }
  }

  return {
    completedPercent: Math.round(((total - abandoned.length) / total) * 100),
    abandonedPercent: Math.round((abandoned.length / total) * 100),
    frequentReasons: [...reasonCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 4)
      .map(([reason, count]) => ({
        reason,
        count,
      })),
  };
}

function buildMediaDetail(message) {
  if (message.content) {
    return message.content;
  }

  if (message.mediaType === "image") {
    return "Image partagee dans la conversation.";
  }

  if (message.mediaType === "video") {
    return "Video partagee dans la conversation.";
  }

  return "Nouveau message";
}

function normalizeMessagePayload(payload) {
  const content = String(payload.content ?? "").trim();
  const mediaUrl = String(payload.mediaUrl ?? "").trim();
  const mediaType = String(payload.mediaType ?? "").trim();

  if (!content && !mediaUrl) {
    throw new Error("content or mediaUrl is required.");
  }

  if (mediaUrl && !["image", "video"].includes(mediaType)) {
    throw new Error("mediaType must be image or video.");
  }

  return {
    content,
    mediaUrl: mediaUrl || null,
    mediaType: mediaUrl ? mediaType : null,
  };
}

function shapeClient(row, programId, tasks, trend) {
  return {
    id: row.id,
    fullName: row.full_name,
    initials: row.initials,
    email: row.email,
    phone: row.phone,
    city: row.city,
    age: row.age,
    goal: row.goal,
    status: row.status,
    planTier: row.plan_tier,
    joinedAt: row.joined_at,
    lastCheckInAt: row.last_checkin_at,
    nextSessionAt: row.next_session_at,
    notes: row.notes,
    tags: row.tags ?? [],
    programId,
    stats: {
      weightKg: toNumber(row.weight_kg),
      bodyFat: toNumber(row.body_fat),
      recovery: row.recovery,
      adherence: row.adherence,
      hydration: row.hydration,
      stepsAvg: row.steps_avg,
      sleepHours: toNumber(row.sleep_hours),
      hrv: row.hrv,
    },
    nutrition: {
      calories: row.calories,
      protein: row.protein,
      carbs: row.carbs,
      fats: row.fats,
    },
    tasks: (tasks ?? []).map((task) => ({
      id: task.id,
      label: task.label,
      done: task.done,
    })),
    trend: (trend ?? []).map(shapeTrendPoint),
  };
}

function defaultTrend(clientId, weightKg) {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const pointDate = new Date(now);
    pointDate.setDate(pointDate.getDate() - (5 - index) * 7);
    return {
      id: randomUUID(),
      clientId,
      recordedAt: pointDate.toISOString(),
      weightKg,
      performance: 60 + index * 3,
      strength: 58 + index * 2,
      conditioning: 55 + index * 2,
    };
  });
}

function buildEmailPlaceholder(fullName) {
  const slug = fullName
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .replaceAll(/[^a-z0-9]+/g, ".")
    .replaceAll(/^\.+|\.+$/g, "");

  return `${slug || "client"}@omegafit.local`;
}

async function appendActivity(db, coachId, clientId, type, title, detail) {
  await db.query(
    `
      insert into activity_logs (id, coach_id, client_id, type, title, detail, created_at)
      values ($1, $2, $3, $4, $5, $6, now())
    `,
    [randomUUID(), coachId, clientId, type, title, detail],
  );
}

async function getClientRow(db, coachId, clientId) {
  const result = await db.query(
    "select * from clients where id = $1 and coach_id = $2 limit 1",
    [clientId, coachId],
  );
  return result.rows[0] ?? null;
}

export async function findUserByEmail(email) {
  const result = await query("select * from users where email = $1 limit 1", [email]);
  const user = result.rows[0];

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    passwordHash: user.password_hash,
    role: user.role,
    clientId: user.client_id,
  };
}

export async function getDashboardDataForCoach(coachId) {
  const [
    clientsResult,
    programsResult,
    programExercisesResult,
    assignmentsResult,
    tasksResult,
    messagesResult,
    checkInsResult,
    trendsResult,
    exerciseLogsResult,
    activityResult,
  ] = await Promise.all([
    query("select * from clients where coach_id = $1 order by next_session_at asc nulls last", [coachId]),
    query("select * from programs where coach_id = $1 order by created_at desc", [coachId]),
    query(
      `
        select pe.*
        from program_exercises pe
        join programs p on p.id = pe.program_id
        where p.coach_id = $1
        order by pe.day_label asc, pe.sort_order asc, pe.created_at asc
      `,
      [coachId],
    ),
    query(
      `
        select pa.program_id, pa.client_id
        from program_assignments pa
        join programs p on p.id = pa.program_id
        where p.coach_id = $1
      `,
      [coachId],
    ),
    query(
      `
        select t.*
        from client_tasks t
        join clients c on c.id = t.client_id
        where c.coach_id = $1
        order by t.created_at asc
      `,
      [coachId],
    ),
    query(
      `
        select m.*
        from messages m
        join clients c on c.id = m.client_id
        where c.coach_id = $1
        order by m.created_at desc
      `,
      [coachId],
    ),
    query(
      `
        select ci.*
        from check_ins ci
        join clients c on c.id = ci.client_id
        where c.coach_id = $1
        order by ci.created_at desc
      `,
      [coachId],
    ),
    query(
      `
        select tp.*
        from trend_points tp
        join clients c on c.id = tp.client_id
        where c.coach_id = $1
        order by tp.recorded_at asc
      `,
      [coachId],
    ),
    query(
      `
        select el.*, ws.client_id
        from exercise_logs el
        join workout_sessions ws on ws.id = el.session_id
        join clients c on c.id = ws.client_id
        where c.coach_id = $1
      `,
      [coachId],
    ),
    query(
      "select * from activity_logs where coach_id = $1 order by created_at desc limit 12",
      [coachId],
    ),
  ]);

  const assignmentRows = assignmentsResult.rows;
  const tasksByClientId = groupBy(tasksResult.rows, "client_id");
  const trendsByClientId = groupBy(trendsResult.rows, "client_id");
  const logsByClientId = groupBy(exerciseLogsResult.rows, "client_id");
  const programExercisesByProgramId = groupBy(programExercisesResult.rows, "program_id");
  const clientProgramId = new Map(assignmentRows.map((row) => [row.client_id, row.program_id]));
  const programClientIds = groupBy(assignmentRows, "program_id");
  const programs = programsResult.rows.map((row) =>
    shapeProgram(
      row,
      (programClientIds.get(row.id) ?? []).map((entry) => entry.client_id),
      (programExercisesByProgramId.get(row.id) ?? []).map(shapeProgramExercise),
    ),
  );
  const messages = messagesResult.rows.map(shapeMessage);
  const checkIns = checkInsResult.rows.map(shapeCheckIn);
  const activity = activityResult.rows.map(shapeActivity);
  const clients = clientsResult.rows.map((row) =>
    shapeClient(
      row,
      clientProgramId.get(row.id) ?? null,
      tasksByClientId.get(row.id),
      trendsByClientId.get(row.id),
    ),
  );
  const clientPayloads = clients.map((client) => ({
    ...buildClientPayload(client, programs, messages, checkIns),
    exerciseAnalysis: buildExerciseAnalysis(logsByClientId.get(client.id) ?? []),
  }));

  return {
    role: "coach",
    overview: buildOverview({
      coach: coachPresentation,
      clients: clientPayloads,
      programs,
      messages,
      activity,
    }),
    clients: clientPayloads,
    programs,
    activity,
  };
}

export async function getClientDashboardData(clientId) {
  const clientResult = await query("select * from clients where id = $1 limit 1", [clientId]);
  const clientRow = clientResult.rows[0];

  if (!clientRow) {
    throw new Error("Client not found.");
  }

  const [
    coachResult,
    assignmentResult,
    tasksResult,
    messagesResult,
    checkInsResult,
    trendsResult,
    sessionsResult,
    exercisesResult,
    logsResult,
  ] = await Promise.all([
    query("select id, name from users where id = $1 limit 1", [clientRow.coach_id]),
    query("select program_id from program_assignments where client_id = $1 limit 1", [clientId]),
    query("select * from client_tasks where client_id = $1 order by created_at asc", [clientId]),
    query("select * from messages where client_id = $1 order by created_at desc", [clientId]),
    query("select * from check_ins where client_id = $1 order by created_at desc", [clientId]),
    query("select * from trend_points where client_id = $1 order by recorded_at asc", [clientId]),
    query(
      `
        select *
        from workout_sessions
        where client_id = $1
        order by scheduled_for asc, created_at asc
      `,
      [clientId],
    ),
    query(
      `
        select we.*
        from workout_exercises we
        join workout_sessions ws on ws.id = we.session_id
        where ws.client_id = $1
        order by we.sort_order asc, we.created_at asc
      `,
      [clientId],
    ),
    query(
      `
        select el.*
        from exercise_logs el
        join workout_sessions ws on ws.id = el.session_id
        where ws.client_id = $1
        order by el.completed_at desc nulls last, el.created_at desc
      `,
      [clientId],
    ),
  ]);

  const programId = assignmentResult.rows[0]?.program_id ?? null;
  const programRows = programId
    ? await query("select * from programs where id = $1 limit 1", [programId])
    : { rows: [] };
  const programExercisesResult = programId
    ? await query(
        "select * from program_exercises where program_id = $1 order by day_label asc, sort_order asc",
        [programId],
      )
    : { rows: [] };
  const programs = programRows.rows.map((row) =>
    shapeProgram(row, [clientId], programExercisesResult.rows.map(shapeProgramExercise)),
  );
  const messages = messagesResult.rows.map(shapeMessage);
  const checkIns = checkInsResult.rows.map(shapeCheckIn);
  const client = shapeClient(clientRow, programId, tasksResult.rows, trendsResult.rows);
  const clientPayload = buildClientPayload(client, programs, messages, checkIns);
  const coachRow = coachResult.rows[0];
  const logsByExerciseId = new Map(logsResult.rows.map((row) => [row.exercise_id, row]));
  const exercisesBySessionId = groupBy(exercisesResult.rows, "session_id");
  const sessions = sessionsResult.rows.map((row) =>
    shapeWorkoutSession(
      row,
      (exercisesBySessionId.get(row.id) ?? []).map((exercise) =>
        shapeWorkoutExercise(exercise, logsByExerciseId.get(exercise.id)),
      ),
    ),
  );
  const todaySession =
    sessions.find((session) => session.status !== "completed") ??
    sessions[0] ??
    null;
  const weeklyProgress = buildWeeklyProgress(checkIns);
  const history = buildProgressHistory(checkIns, clientPayload.trend);
  const profile = buildClientProfile(clientPayload);

  return {
    role: "client",
    coach: {
      name: coachRow?.name ?? coachPresentation.name,
      title: coachPresentation.title,
      tagline: coachPresentation.tagline,
      responseTime: coachPresentation.responseTime,
    },
    client: clientPayload,
    todaySession,
    weeklyProgress,
    history,
    profile,
    activity: [
      ...checkIns.slice(0, 3).map((entry) => ({
        id: `checkin-${entry.id}`,
        title: "Check-in enregistre",
        detail: entry.note,
        createdAt: entry.createdAt,
      })),
      ...messages.slice(0, 5).map((entry) => ({
        id: `message-${entry.id}`,
        title: entry.senderRole === "coach" ? "Message du coach" : "Message envoye",
        detail: buildMediaDetail(entry),
        createdAt: entry.createdAt,
      })),
    ]
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 8),
  };
}

export async function createClientForCoach(coachId, payload) {
  return withTransaction(async (db) => {
    if (!payload.fullName || !payload.goal || !payload.city) {
      throw new Error("fullName, goal and city are required.");
    }

    const clientId = randomUUID();
    const weightKg = Number(payload.weightKg ?? 78);
    const email = String(payload.email ?? "").trim() || buildEmailPlaceholder(payload.fullName);
    const phone = String(payload.phone ?? "").trim() || "Non renseigne";
    const nextSessionAt = payload.nextSessionAt
      ? new Date(payload.nextSessionAt).toISOString()
      : new Date(Date.now() + 86400000).toISOString();

    await db.query(
      `
        insert into clients (
          id, coach_id, full_name, initials, email, phone, city, age, goal, status, plan_tier,
          joined_at, last_checkin_at, next_session_at, notes, tags,
          weight_kg, body_fat, recovery, adherence, hydration, steps_avg, sleep_hours, hrv,
          calories, protein, carbs, fats, created_at, updated_at
        ) values (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, 'Onboarding', $10,
          now(), now(), $11, $12, $13,
          $14, $15, 76, 88, 85, 8000, 7.0, 52,
          2400, 160, 220, 70, now(), now()
        )
      `,
      [
        clientId,
        coachId,
        payload.fullName.trim(),
        payload.fullName
          .trim()
          .split(" ")
          .map((chunk) => chunk[0]?.toUpperCase() ?? "")
          .slice(0, 2)
          .join(""),
        email,
        phone,
        payload.city.trim(),
        Number(payload.age ?? 30),
        payload.goal.trim(),
        payload.planTier ?? "Premium",
        nextSessionAt,
        String(payload.notes ?? "").trim() || "Onboarding cree depuis OMEGA FIT.",
        ["Nouveau client"],
        weightKg,
        Number(payload.bodyFat ?? 18),
      ],
    );

    const starterTasks = [
      { id: randomUUID(), label: "Programmer appel d'onboarding" },
      { id: randomUUID(), label: "Envoyer protocole de depart" },
    ];

    for (const task of starterTasks) {
      await db.query(
        "insert into client_tasks (id, client_id, label, done, created_at) values ($1, $2, $3, false, now())",
        [task.id, clientId, task.label],
      );
    }

    for (const point of defaultTrend(clientId, weightKg)) {
      await db.query(
        `
          insert into trend_points (id, client_id, recorded_at, weight_kg, performance, strength, conditioning)
          values ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          point.id,
          point.clientId,
          point.recordedAt,
          point.weightKg,
          point.performance,
          point.strength,
          point.conditioning,
        ],
      );
    }

    await appendActivity(
      db,
      coachId,
      clientId,
      "client",
      "Nouveau client integre",
      `${payload.fullName.trim()} rejoint le suivi ${payload.planTier ?? "Premium"}.`,
    );

    return { id: clientId };
  });
}

export async function updateClientForCoach(coachId, clientId, patch) {
  return withTransaction(async (db) => {
    const client = await getClientRow(db, coachId, clientId);

    if (!client) {
      throw new Error("Client not found.");
    }

    const nextStatus = typeof patch.status === "string" ? patch.status.trim() : client.status;
    const nextNotes = typeof patch.notes === "string" ? patch.notes.trim() : client.notes;

    await db.query(
      `
        update clients
        set status = $3, notes = $4, updated_at = now()
        where id = $1 and coach_id = $2
      `,
      [clientId, coachId, nextStatus, nextNotes],
    );

    if (Array.isArray(patch.tasks)) {
      await db.query("delete from client_tasks where client_id = $1", [clientId]);

      for (const task of patch.tasks) {
        await db.query(
          "insert into client_tasks (id, client_id, label, done, created_at) values ($1, $2, $3, $4, now())",
          [task.id || randomUUID(), clientId, String(task.label), Boolean(task.done)],
        );
      }
    }

    await appendActivity(
      db,
      coachId,
      clientId,
      "client",
      "Fiche client mise a jour",
      `${client.full_name} a ete mis a jour depuis le cockpit coach.`,
    );

    return { id: clientId };
  });
}

export async function createProgramForCoach(coachId, payload) {
  return withTransaction(async (db) => {
    const clientIds = Array.isArray(payload.clientIds)
      ? payload.clientIds
      : String(payload.clientId ?? "")
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean);

    if (!payload.title || !payload.focus || !clientIds.length) {
      throw new Error("title, focus and at least one client are required.");
    }

    const validClients = await db.query(
      "select id from clients where coach_id = $1 and id = any($2::text[])",
      [coachId, clientIds],
    );

    if (!validClients.rows.length) {
      throw new Error("At least one valid client is required.");
    }

    const duplicateProgramId = String(payload.duplicateProgramId ?? "").trim() || null;
    const requestedExercises = Array.isArray(payload.exercises)
      ? payload.exercises
      : [];
    let exercises = requestedExercises
      .map((exercise, index) => ({
        id: randomUUID(),
        dayLabel: String(exercise.dayLabel ?? `Jour ${Math.floor(index / 4) + 1}`).trim() || `Jour ${Math.floor(index / 4) + 1}`,
        name: String(exercise.name ?? "").trim(),
        videoUrl: String(exercise.videoUrl ?? "").trim(),
        targetSets: Number(exercise.targetSets ?? 0),
        targetReps: Number(exercise.targetReps ?? 0),
        targetWeightKg:
          exercise.targetWeightKg === "" || exercise.targetWeightKg === null || exercise.targetWeightKg === undefined
            ? null
            : Number(exercise.targetWeightKg),
        sortOrder: Number(exercise.sortOrder ?? index + 1),
      }))
      .filter((exercise) => exercise.name && exercise.targetSets > 0 && exercise.targetReps > 0);

    if (duplicateProgramId) {
      const duplicateProgram = await db.query(
        "select * from programs where id = $1 and coach_id = $2 limit 1",
        [duplicateProgramId, coachId],
      );

      if (!duplicateProgram.rows[0]) {
        throw new Error("Program to duplicate not found.");
      }

      if (!payload.focus) {
        payload.focus = duplicateProgram.rows[0].focus;
      }

      if (!payload.durationWeeks) {
        payload.durationWeeks = duplicateProgram.rows[0].duration_weeks;
      }

      if (!payload.intensity) {
        payload.intensity = duplicateProgram.rows[0].intensity;
      }

      if (!exercises.length) {
        const duplicateExercises = await db.query(
          "select * from program_exercises where program_id = $1 order by day_label asc, sort_order asc",
          [duplicateProgramId],
        );
        exercises = duplicateExercises.rows.map((exercise, index) => ({
          id: randomUUID(),
          dayLabel: exercise.day_label,
          name: exercise.name,
          videoUrl: exercise.video_url,
          targetSets: exercise.target_sets,
          targetReps: exercise.target_reps,
          targetWeightKg: exercise.target_weight_kg ? toNumber(exercise.target_weight_kg) : null,
          sortOrder: exercise.sort_order ?? index + 1,
        }));
      }
    }

    const programId = randomUUID();

    await db.query(
      `
        insert into programs (
          id, coach_id, title, focus, duration_weeks, intensity, weekly_structure, milestones, created_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, now())
      `,
      [
        programId,
        coachId,
        payload.title.trim(),
        payload.focus.trim(),
        Number(payload.durationWeeks ?? 8),
        String(payload.intensity ?? "Medium"),
        [
          "1 bloc de force principal",
          "1 bloc engine / cardio",
          "1 bloc mobilite / recuperation",
        ],
        ["Adherence", "Progression charge", "Recuperation"],
      ],
    );

    for (const exercise of exercises) {
      await db.query(
        `
          insert into program_exercises (
            id, program_id, day_label, name, video_url, target_sets, target_reps, target_weight_kg, sort_order, created_at
          ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
        `,
        [
          exercise.id,
          programId,
          exercise.dayLabel,
          exercise.name,
          exercise.videoUrl,
          exercise.targetSets,
          exercise.targetReps,
          exercise.targetWeightKg,
          exercise.sortOrder,
        ],
      );
    }

    const validClientIds = validClients.rows.map((row) => row.id);
    await db.query("delete from program_assignments where client_id = any($1::text[])", [
      validClientIds,
    ]);

    for (const validClientId of validClientIds) {
      await db.query(
        "insert into program_assignments (program_id, client_id) values ($1, $2)",
        [programId, validClientId],
      );
    }

    await appendActivity(
      db,
      coachId,
      validClientIds[0],
      "program",
      duplicateProgramId ? "Programme duplique" : "Programme cree",
      `${payload.title.trim()} a ete assigne a ${validClientIds.length} client(s), avec ${exercises.length} exercice(s).`,
    );

    return { id: programId };
  });
}

export async function createMessageForCoach(coachId, payload) {
  return withTransaction(async (db) => {
    if (!payload.clientId) {
      throw new Error("clientId is required.");
    }
    const messagePayload = normalizeMessagePayload(payload);

    const client = await getClientRow(db, coachId, payload.clientId);
    if (!client) {
      throw new Error("Client not found.");
    }
    const userResult = await db.query(
      "select id from users where client_id = $1 limit 1",
      [payload.clientId],
    );

    await db.query(
      `
        update messages
        set read = true
        where client_id = $1 and sender_role = 'client'
      `,
      [payload.clientId],
    );

    const messageId = randomUUID();
    await db.query(
      `
        insert into messages (
          id, client_id, sender_id, sender_role, content, media_url, media_type, read, created_at
        )
        values ($1, $2, $3, 'coach', $4, $5, $6, true, now())
      `,
      [
        messageId,
        payload.clientId,
        coachId,
        messagePayload.content,
        messagePayload.mediaUrl,
        messagePayload.mediaType,
      ],
    );

    await appendActivity(
      db,
      coachId,
      payload.clientId,
      "message",
      "Reponse envoyee",
      `${client.full_name}: ${messagePayload.content || "Media partage."}`,
    );

    return { id: messageId, clientUserId: userResult.rows[0]?.id ?? null, clientName: client.full_name };
  });
}

export async function createMessageForClient(clientId, userId, payload) {
  return withTransaction(async (db) => {
    const messagePayload = normalizeMessagePayload(payload);

    const client = await db.query("select id, coach_id, full_name from clients where id = $1 limit 1", [
      clientId,
    ]);
    const clientRow = client.rows[0];

    if (!clientRow) {
      throw new Error("Client not found.");
    }

    const messageId = randomUUID();
    await db.query(
      `
        insert into messages (
          id, client_id, sender_id, sender_role, content, media_url, media_type, read, created_at
        )
        values ($1, $2, $3, 'client', $4, $5, $6, false, now())
      `,
      [
        messageId,
        clientId,
        userId,
        messagePayload.content,
        messagePayload.mediaUrl,
        messagePayload.mediaType,
      ],
    );

    await appendActivity(
      db,
      clientRow.coach_id,
      clientId,
      "message",
      "Nouveau message client",
      `${clientRow.full_name}: ${messagePayload.content || "Media partage."}`,
    );

    return { id: messageId, coachId: clientRow.coach_id, clientName: clientRow.full_name };
  });
}

export async function saveWorkoutSessionForClient(clientId, userId, payload) {
  return withTransaction(async (db) => {
    if (!payload.sessionId) {
      throw new Error("sessionId is required.");
    }

    const sessionResult = await db.query(
      `
        select *
        from workout_sessions
        where id = $1 and client_id = $2
        limit 1
      `,
      [payload.sessionId, clientId],
    );
    const sessionRow = sessionResult.rows[0];

    if (!sessionRow) {
      throw new Error("Session not found.");
    }

    const exercises = Array.isArray(payload.exercises) ? payload.exercises : [];

    await db.query(
      `
        update workout_sessions
        set status = $3
        where id = $1 and client_id = $2
      `,
      [
        payload.sessionId,
        clientId,
        payload.complete ? "completed" : payload.started ? "in_progress" : sessionRow.status,
      ],
    );

    for (const exercise of exercises) {
      if (!exercise.exerciseId) {
        continue;
      }

      const actualWeightKg =
        exercise.actualWeightKg === "" || exercise.actualWeightKg === null || exercise.actualWeightKg === undefined
          ? null
          : Number(exercise.actualWeightKg);
      const actualReps =
        exercise.actualReps === "" || exercise.actualReps === null || exercise.actualReps === undefined
          ? null
          : Number(exercise.actualReps);
      const actualSets =
        exercise.actualSets === "" || exercise.actualSets === null || exercise.actualSets === undefined
          ? null
          : Number(exercise.actualSets);
      const skipReasons = Array.isArray(exercise.skipReasons)
        ? exercise.skipReasons.map((reason) => String(reason).trim()).filter(Boolean)
        : [];
      const skipNote = String(exercise.skipNote ?? "").trim();
      const skipped = Boolean(exercise.skipped || skipReasons.length || skipNote);

      const existingLog = await db.query(
        `
          select id
          from exercise_logs
          where session_id = $1 and exercise_id = $2 and client_id = $3
          limit 1
        `,
        [payload.sessionId, exercise.exerciseId, clientId],
      );

      if (existingLog.rows[0]) {
        await db.query(
          `
            update exercise_logs
            set
              actual_weight_kg = $2,
              actual_reps = $3,
              actual_sets = $4,
              skipped = $5,
              skip_reasons = $6,
              skip_note = $7,
              completed_at = now()
            where id = $1
          `,
          [
            existingLog.rows[0].id,
            actualWeightKg,
            actualReps,
            actualSets,
            skipped,
            skipReasons,
            skipNote || null,
          ],
        );
      } else {
        await db.query(
          `
            insert into exercise_logs (
              id, session_id, exercise_id, client_id, actual_weight_kg, actual_reps, actual_sets,
              skipped, skip_reasons, skip_note, completed_at, created_at
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now())
          `,
          [
            randomUUID(),
            payload.sessionId,
            exercise.exerciseId,
            clientId,
            actualWeightKg,
            actualReps,
            actualSets,
            skipped,
            skipReasons,
            skipNote || null,
          ],
        );
      }
    }

    const completionRate = exercises.length
      ? Math.round(
          (exercises.filter(
            (exercise) =>
              exercise.skipped ||
              exercise.actualSets !== null &&
                exercise.actualSets !== undefined &&
                exercise.actualSets !== "",
          ).length /
            exercises.length) *
            100,
        )
      : 0;

    await appendActivity(
      db,
      sessionRow.coach_id,
      clientId,
      "session",
      payload.complete ? "Seance terminee" : "Seance mise a jour",
      `${sessionRow.title} - ${completionRate}% des exercices renseignes.`,
    );

    return {
      id: payload.sessionId,
      status: payload.complete ? "completed" : payload.started ? "in_progress" : sessionRow.status,
      clientId,
      userId,
    };
  });
}

export async function createCheckInForCoach(coachId, payload) {
  return withTransaction(async (db) => {
    if (!payload.clientId) {
      throw new Error("clientId is required.");
    }

    const client = await getClientRow(db, coachId, payload.clientId);
    if (!client) {
      throw new Error("Client not found.");
    }

    const energy = Number(payload.energy ?? 0);
    const motivation = Number(payload.motivation ?? 0);
    const workoutCompletion = Number(payload.workoutCompletion ?? 0);
    const weightKg = Number(payload.weightKg ?? client.weight_kg);
    const recovery = Math.max(
      45,
      Math.min(100, Math.round((energy * 10 + motivation * 5) / 1.5)),
    );
    const adherence = Math.max(
      50,
      Math.min(100, Math.round((Number(client.adherence) + workoutCompletion) / 2)),
    );

    const latestTrendResult = await db.query(
      `
        select * from trend_points
        where client_id = $1
        order by recorded_at desc
        limit 1
      `,
      [payload.clientId],
    );
    const latestTrend = latestTrendResult.rows[0];

    const checkInId = randomUUID();
    await db.query(
      `
        insert into check_ins (
          id, client_id, workout_completion, energy, soreness, motivation, weight_kg, note, created_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, now())
      `,
      [
        checkInId,
        payload.clientId,
        workoutCompletion,
        energy,
        Number(payload.soreness ?? 0),
        motivation,
        weightKg,
        String(payload.note ?? "").trim(),
      ],
    );

    await db.query(
      `
        update clients
        set
          last_checkin_at = now(),
          weight_kg = $3,
          recovery = $4,
          adherence = $5,
          updated_at = now()
        where id = $1 and coach_id = $2
      `,
      [payload.clientId, coachId, weightKg, recovery, adherence],
    );

    await db.query(
      `
        insert into trend_points (id, client_id, recorded_at, weight_kg, performance, strength, conditioning)
        values ($1, $2, now(), $3, $4, $5, $6)
      `,
      [
        randomUUID(),
        payload.clientId,
        weightKg,
        Math.max(40, Math.min(100, Math.round((workoutCompletion + energy * 8) / 2))),
        Math.max(40, Math.min(100, Number(latestTrend?.strength ?? 58) + 1)),
        Math.max(
          40,
          Math.min(100, Number(latestTrend?.conditioning ?? 55) + (energy >= 7 ? 2 : 0)),
        ),
      ],
    );

    await appendActivity(
      db,
      coachId,
      payload.clientId,
      "checkin",
      "Nouveau check-in",
      `${client.full_name} a valide ${workoutCompletion}% du plan de la semaine.`,
    );

    return { id: checkInId };
  });
}
