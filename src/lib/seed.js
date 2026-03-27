import { randomUUID } from "node:crypto";

const today = new Date();

export const coachPresentation = {
  name: "Milan Roche",
  title: "Coach performance & transformation",
  tagline: "Pilotage premium, data-driven et ultra-personnalise.",
  responseTime: "17 min",
  nps: 96,
  planPricing: {
    Elite: 420,
    Premium: 280,
    Essential: 190,
  },
};

function isoOffset(days, hours = 0) {
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  date.setHours(hours, 0, 0, 0);
  return date.toISOString();
}

function trendPoints(clientId, baseWeight, basePerformance, strength, conditioning) {
  return [
    { clientId, recordedAt: isoOffset(-42), weightKg: baseWeight + 1.6, performance: basePerformance - 8, strength: strength - 5, conditioning: conditioning - 6 },
    { clientId, recordedAt: isoOffset(-35), weightKg: baseWeight + 1.1, performance: basePerformance - 5, strength: strength - 3, conditioning: conditioning - 4 },
    { clientId, recordedAt: isoOffset(-28), weightKg: baseWeight + 0.8, performance: basePerformance - 2, strength: strength - 2, conditioning: conditioning - 3 },
    { clientId, recordedAt: isoOffset(-21), weightKg: baseWeight + 0.5, performance: basePerformance, strength: strength - 1, conditioning: conditioning - 1 },
    { clientId, recordedAt: isoOffset(-14), weightKg: baseWeight + 0.2, performance: basePerformance + 3, strength: strength + 2, conditioning: conditioning + 1 },
    { clientId, recordedAt: isoOffset(-7), weightKg: baseWeight + 0.1, performance: basePerformance + 5, strength: strength + 4, conditioning: conditioning + 3 },
    { clientId, recordedAt: isoOffset(0), weightKg: baseWeight, performance: basePerformance + 8, strength: strength + 5, conditioning: conditioning + 4 },
  ];
}

export async function seedDemoData(db, coachId) {
  const { rows } = await db.query(
    "select count(*)::int as count from clients where coach_id = $1",
    [coachId],
  );

  if (rows[0].count > 0) {
    return;
  }

  const programs = [
    {
      id: "program-hybrid",
      title: "Hybrid Engine 8",
      focus: "Performance hybride, force et engine",
      durationWeeks: 8,
      intensity: "High",
      weeklyStructure: [
        "2 seances force bas du corps",
        "1 seance max strength haut du corps",
        "2 moteurs type Hyrox",
        "1 bloc mobilite / recuperation",
      ],
      milestones: ["Sled push", "1 km row", "Front squat 5RM"],
    },
    {
      id: "program-mass",
      title: "Lean Mass Protocol",
      focus: "Hypertrophie, surcharge progressive, surplus maitrise",
      durationWeeks: 10,
      intensity: "Medium",
      weeklyStructure: [
        "Push / Pull / Legs",
        "1 seance upper volume",
        "1 seance lower technique",
      ],
      milestones: ["Poids corporel", "Volume pecs/dos", "RPE compliance"],
    },
    {
      id: "program-rebuild",
      title: "Rebuild & Resilience",
      focus: "Recuperation, mobilite active, force fondamentale",
      durationWeeks: 12,
      intensity: "Medium",
      weeklyStructure: [
        "2 full body orientes posture",
        "2 sessions zone 2 / marche inclinee",
        "Respiration + core 3 fois/semaine",
      ],
      milestones: ["Amplitude", "Douleur percue", "Capacite cardio de base"],
    },
  ];

  const clients = [
    {
      id: "client-sarah",
      fullName: "Sarah Mendes",
      initials: "SM",
      email: "sarah.mendes@example.com",
      phone: "+33 6 10 24 66 19",
      city: "Paris",
      age: 31,
      goal: "Transformation athletique",
      status: "On track",
      planTier: "Elite",
      joinedAt: isoOffset(-110),
      lastCheckInAt: isoOffset(-1, 9),
      nextSessionAt: isoOffset(0, 18),
      notes: "Tres bonne discipline nutritionnelle. Prevoir bloc mobilite epaules.",
      tags: ["Hyrox", "Strength"],
      stats: { weightKg: 67.8, bodyFat: 20.4, recovery: 84, adherence: 95, hydration: 92, stepsAvg: 11240, sleepHours: 7.6, hrv: 61 },
      nutrition: { calories: 2140, protein: 145, carbs: 210, fats: 68 },
      programId: "program-hybrid",
    },
    {
      id: "client-yanis",
      fullName: "Yanis Benaim",
      initials: "YB",
      email: "yanis.benaim@example.com",
      phone: "+33 6 11 42 09 17",
      city: "Lyon",
      age: 28,
      goal: "Prise de masse propre",
      status: "Attention",
      planTier: "Premium",
      joinedAt: isoOffset(-64),
      lastCheckInAt: isoOffset(-2, 8),
      nextSessionAt: isoOffset(1, 12),
      notes: "Sommeil fluctuant. Ralentir les volumes accessoires si fatigue en hausse.",
      tags: ["Hypertrophy", "Nutrition"],
      stats: { weightKg: 82.3, bodyFat: 13.2, recovery: 71, adherence: 86, hydration: 88, stepsAvg: 8340, sleepHours: 6.8, hrv: 54 },
      nutrition: { calories: 3080, protein: 178, carbs: 342, fats: 82 },
      programId: "program-mass",
    },
    {
      id: "client-clara",
      fullName: "Clara Vasseur",
      initials: "CV",
      email: "clara.vasseur@example.com",
      phone: "+33 6 28 40 72 11",
      city: "Bordeaux",
      age: 35,
      goal: "Retour post-partum performance",
      status: "Excellent",
      planTier: "Elite",
      joinedAt: isoOffset(-154),
      lastCheckInAt: isoOffset(-1, 7),
      nextSessionAt: isoOffset(0, 15),
      notes: "Progression remarquable. Continuer charges moderees + gainage respiratoire.",
      tags: ["Mobility", "Rebuild"],
      stats: { weightKg: 61.1, bodyFat: 23.1, recovery: 90, adherence: 97, hydration: 94, stepsAvg: 12450, sleepHours: 7.9, hrv: 67 },
      nutrition: { calories: 1980, protein: 132, carbs: 188, fats: 64 },
      programId: "program-rebuild",
    },
    {
      id: "client-thomas",
      fullName: "Thomas Keller",
      initials: "TK",
      email: "thomas.keller@example.com",
      phone: "+41 79 220 30 14",
      city: "Geneve",
      age: 41,
      goal: "Reduction douleur + recomposition",
      status: "Needs review",
      planTier: "Essential",
      joinedAt: isoOffset(-39),
      lastCheckInAt: isoOffset(-3, 10),
      nextSessionAt: isoOffset(2, 11),
      notes: "Genou gauche a surveiller. Garder l'accent sur amplitude controlee.",
      tags: ["Mobility", "Weight loss"],
      stats: { weightKg: 91.4, bodyFat: 25.4, recovery: 66, adherence: 73, hydration: 81, stepsAvg: 7010, sleepHours: 6.4, hrv: 49 },
      nutrition: { calories: 2320, protein: 168, carbs: 190, fats: 76 },
      programId: "program-rebuild",
    },
  ];

  const tasks = [
    { id: "task-sarah-1", clientId: "client-sarah", label: "Envoyer video squat tempo", done: true },
    { id: "task-sarah-2", clientId: "client-sarah", label: "Valider progression assault bike", done: false },
    { id: "task-sarah-3", clientId: "client-sarah", label: "Ajuster glucides veille seance", done: false },
    { id: "task-yanis-1", clientId: "client-yanis", label: "Verifier technique developpe incline", done: false },
    { id: "task-yanis-2", clientId: "client-yanis", label: "Relancer routine coucher", done: false },
    { id: "task-yanis-3", clientId: "client-yanis", label: "Mettre a jour photos progression", done: true },
    { id: "task-clara-1", clientId: "client-clara", label: "Augmenter carries unilateraux", done: true },
    { id: "task-clara-2", clientId: "client-clara", label: "Partager compte-rendu bassin", done: true },
    { id: "task-clara-3", clientId: "client-clara", label: "Programmer test rameur 2 km", done: false },
    { id: "task-thomas-1", clientId: "client-thomas", label: "Planifier bilan douleur genou", done: false },
    { id: "task-thomas-2", clientId: "client-thomas", label: "Remplacer fentes si inconfort", done: true },
    { id: "task-thomas-3", clientId: "client-thomas", label: "Relancer suivi pas quotidiens", done: false },
  ];

  const messages = [
    {
      id: "message-1",
      clientId: "client-sarah",
      senderRole: "client",
      content: "Seance Hyrox validee. Cardio dur sur le dernier bloc mais super sensations.",
      mediaUrl: null,
      mediaType: null,
      createdAt: isoOffset(-1, 11),
      read: false,
    },
    {
      id: "message-2",
      clientId: "client-sarah",
      senderRole: "coach",
      content: "Top. Pense a augmenter legerement les glucides ce soir pour optimiser la recup.",
      mediaUrl: null,
      mediaType: null,
      createdAt: isoOffset(-1, 12),
      read: true,
    },
    {
      id: "message-3",
      clientId: "client-yanis",
      senderRole: "client",
      content: "Le sommeil est un peu moyen cette semaine. Je sens la fatigue monter sur les epaules.",
      mediaUrl: null,
      mediaType: null,
      createdAt: isoOffset(-2, 20),
      read: false,
    },
    {
      id: "message-4",
      clientId: "client-clara",
      senderRole: "coach",
      content: "On garde la progression actuelle. Tu es en avance sur le planning du bloc 2.",
      mediaUrl: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
      mediaType: "image",
      createdAt: isoOffset(-1, 9),
      read: true,
    },
    {
      id: "message-5",
      clientId: "client-thomas",
      senderRole: "client",
      content: "Le genou tire un peu moins, mais je sens une gene en descente d'escalier.",
      mediaUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      mediaType: "video",
      createdAt: isoOffset(-3, 18),
      read: false,
    },
  ];

  const workoutSessions = [
    {
      id: "session-sarah-today",
      clientId: "client-sarah",
      title: "Hybrid Engine - Jour 04",
      focus: "Force bas du corps + bloc Hyrox",
      scheduledFor: isoOffset(0, 18),
      status: "scheduled",
      coachNote: "Tempo controle sur les squats, puis engine progressif sans partir trop fort.",
      weekLabel: "Semaine 6",
    },
    {
      id: "session-yanis-next",
      clientId: "client-yanis",
      title: "Lean Mass - Upper Volume",
      focus: "Pectoraux, dos et deltoides",
      scheduledFor: isoOffset(1, 12),
      status: "scheduled",
      coachNote: "RPE 8 maximum. Priorite a l'amplitude et au tempo propre.",
      weekLabel: "Semaine 4",
    },
    {
      id: "session-clara-today",
      clientId: "client-clara",
      title: "Rebuild Flow - Full Body",
      focus: "Respiration, gainage et chaines posterieures",
      scheduledFor: isoOffset(0, 15),
      status: "in_progress",
      coachNote: "Reste fluide. Qualite du mouvement avant tout.",
      weekLabel: "Semaine 8",
    },
    {
      id: "session-thomas-next",
      clientId: "client-thomas",
      title: "Rebuild - Lower Control",
      focus: "Mobilite active et controle du genou",
      scheduledFor: isoOffset(2, 11),
      status: "scheduled",
      coachNote: "Amplitude douce, aucune douleur vive toleree.",
      weekLabel: "Semaine 3",
    },
  ];

  const workoutExercises = [
    { id: "ex-sarah-1", sessionId: "session-sarah-today", name: "Front squat tempo", videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", targetSets: 4, targetReps: 6, targetWeightKg: 52.5, sortOrder: 1 },
    { id: "ex-sarah-2", sessionId: "session-sarah-today", name: "Walking lunges", videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", targetSets: 3, targetReps: 12, targetWeightKg: 18, sortOrder: 2 },
    { id: "ex-sarah-3", sessionId: "session-sarah-today", name: "SkiErg + burpees", videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", targetSets: 5, targetReps: 10, targetWeightKg: null, sortOrder: 3 },
    { id: "ex-yanis-1", sessionId: "session-yanis-next", name: "Developpe incline halteres", videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", targetSets: 4, targetReps: 10, targetWeightKg: 30, sortOrder: 1 },
    { id: "ex-yanis-2", sessionId: "session-yanis-next", name: "Tractions pronees", videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", targetSets: 4, targetReps: 8, targetWeightKg: null, sortOrder: 2 },
    { id: "ex-yanis-3", sessionId: "session-yanis-next", name: "Elevation laterale", videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", targetSets: 4, targetReps: 15, targetWeightKg: 10, sortOrder: 3 },
    { id: "ex-clara-1", sessionId: "session-clara-today", name: "Goblet squat box", videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", targetSets: 3, targetReps: 10, targetWeightKg: 20, sortOrder: 1 },
    { id: "ex-clara-2", sessionId: "session-clara-today", name: "Dead bug breathing", videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", targetSets: 3, targetReps: 8, targetWeightKg: null, sortOrder: 2 },
    { id: "ex-clara-3", sessionId: "session-clara-today", name: "Farmer carry", videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", targetSets: 4, targetReps: 30, targetWeightKg: 16, sortOrder: 3 },
    { id: "ex-thomas-1", sessionId: "session-thomas-next", name: "Box squat assiste", videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", targetSets: 4, targetReps: 8, targetWeightKg: 32, sortOrder: 1 },
    { id: "ex-thomas-2", sessionId: "session-thomas-next", name: "Step-up bas", videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", targetSets: 3, targetReps: 10, targetWeightKg: 10, sortOrder: 2 },
    { id: "ex-thomas-3", sessionId: "session-thomas-next", name: "Marche inclinee", videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", targetSets: 1, targetReps: 20, targetWeightKg: null, sortOrder: 3 },
  ];

  const exerciseLogs = [
    { id: "log-clara-1", sessionId: "session-clara-today", exerciseId: "ex-clara-1", clientId: "client-clara", actualWeightKg: 20, actualReps: 10, actualSets: 3, completedAt: isoOffset(0, 10) },
    { id: "log-clara-2", sessionId: "session-clara-today", exerciseId: "ex-clara-2", clientId: "client-clara", actualWeightKg: null, actualReps: 8, actualSets: 3, completedAt: isoOffset(0, 10) },
  ];

  const checkIns = [
    {
      id: "checkin-1",
      clientId: "client-sarah",
      workoutCompletion: 98,
      energy: 8,
      soreness: 4,
      motivation: 9,
      weightKg: 67.8,
      note: "Tres bon niveau d'energie, maintien parfait sur les transitions.",
      createdAt: isoOffset(-1, 8),
    },
    {
      id: "checkin-2",
      clientId: "client-yanis",
      workoutCompletion: 84,
      energy: 6,
      soreness: 6,
      motivation: 7,
      weightKg: 82.3,
      note: "Charge OK, mais sommeil perturbe. Deload local si necessaire.",
      createdAt: isoOffset(-2, 7),
    },
    {
      id: "checkin-3",
      clientId: "client-clara",
      workoutCompletion: 100,
      energy: 9,
      soreness: 3,
      motivation: 10,
      weightKg: 61.1,
      note: "Grande aisance respiratoire, excellent retour moteur.",
      createdAt: isoOffset(-1, 7),
    },
    {
      id: "checkin-4",
      clientId: "client-thomas",
      workoutCompletion: 72,
      energy: 5,
      soreness: 7,
      motivation: 6,
      weightKg: 91.4,
      note: "Faible volume respecte. Priorite au confort articulaire.",
      createdAt: isoOffset(-3, 9),
    },
  ];

  const activities = [
    { id: "activity-1", clientId: "client-clara", type: "checkin", title: "Check-in valide", detail: "Clara affiche 100% de completion et une energie a 9/10.", createdAt: isoOffset(-1, 7) },
    { id: "activity-2", clientId: "client-sarah", type: "message", title: "Nouveau message", detail: "Sarah a partage son ressenti post-seance Hyrox.", createdAt: isoOffset(-1, 11) },
    { id: "activity-3", clientId: "client-yanis", type: "program", title: "Bloc nutrition ajuste", detail: "Reallocation glucidique avant la seance epaules.", createdAt: isoOffset(-2, 14) },
    { id: "activity-4", clientId: "client-thomas", type: "alert", title: "Signal fatigue", detail: "Recuperation en baisse, surveillance genou gauche conseillee.", createdAt: isoOffset(-3, 18) },
  ];

  const assignments = [
    { programId: "program-hybrid", clientId: "client-sarah" },
    { programId: "program-mass", clientId: "client-yanis" },
    { programId: "program-rebuild", clientId: "client-clara" },
    { programId: "program-rebuild", clientId: "client-thomas" },
  ];

  const programExercises = [
    { id: "program-hybrid-ex-1", programId: "program-hybrid", dayLabel: "Jour 1", name: "Front squat", videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", targetSets: 4, targetReps: 6, targetWeightKg: 52.5, sortOrder: 1 },
    { id: "program-hybrid-ex-2", programId: "program-hybrid", dayLabel: "Jour 1", name: "SkiErg intervals", videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", targetSets: 5, targetReps: 10, targetWeightKg: null, sortOrder: 2 },
    { id: "program-mass-ex-1", programId: "program-mass", dayLabel: "Jour 2", name: "Developpe incline halteres", videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", targetSets: 4, targetReps: 10, targetWeightKg: 30, sortOrder: 1 },
    { id: "program-mass-ex-2", programId: "program-mass", dayLabel: "Jour 2", name: "Tractions pronees", videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", targetSets: 4, targetReps: 8, targetWeightKg: null, sortOrder: 2 },
    { id: "program-rebuild-ex-1", programId: "program-rebuild", dayLabel: "Jour 1", name: "Goblet squat box", videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", targetSets: 3, targetReps: 10, targetWeightKg: 20, sortOrder: 1 },
    { id: "program-rebuild-ex-2", programId: "program-rebuild", dayLabel: "Jour 1", name: "Farmer carry", videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", targetSets: 4, targetReps: 30, targetWeightKg: 16, sortOrder: 2 },
  ];

  const trends = [
    ...trendPoints("client-sarah", 67.8, 76, 79, 71),
    ...trendPoints("client-yanis", 82.3, 69, 77, 63),
    ...trendPoints("client-clara", 61.1, 81, 74, 78),
    ...trendPoints("client-thomas", 91.4, 58, 61, 56),
  ];

  for (const program of programs) {
    await db.query(
      `
        insert into programs (
          id, coach_id, title, focus, duration_weeks, intensity, weekly_structure, milestones, created_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, now())
      `,
      [
        program.id,
        coachId,
        program.title,
        program.focus,
        program.durationWeeks,
        program.intensity,
        program.weeklyStructure,
        program.milestones,
      ],
    );
  }

  for (const client of clients) {
    await db.query(
      `
        insert into clients (
          id, coach_id, full_name, initials, email, phone, city, age, goal, status, plan_tier,
          joined_at, last_checkin_at, next_session_at, notes, tags,
          weight_kg, body_fat, recovery, adherence, hydration, steps_avg, sleep_hours, hrv,
          calories, protein, carbs, fats, created_at, updated_at
        ) values (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, $24,
          $25, $26, $27, $28, now(), now()
        )
      `,
      [
        client.id,
        coachId,
        client.fullName,
        client.initials,
        client.email,
        client.phone,
        client.city,
        client.age,
        client.goal,
        client.status,
        client.planTier,
        client.joinedAt,
        client.lastCheckInAt,
        client.nextSessionAt,
        client.notes,
        client.tags,
        client.stats.weightKg,
        client.stats.bodyFat,
        client.stats.recovery,
        client.stats.adherence,
        client.stats.hydration,
        client.stats.stepsAvg,
        client.stats.sleepHours,
        client.stats.hrv,
        client.nutrition.calories,
        client.nutrition.protein,
        client.nutrition.carbs,
        client.nutrition.fats,
      ],
    );
  }

  for (const assignment of assignments) {
    await db.query(
      "insert into program_assignments (program_id, client_id) values ($1, $2)",
      [assignment.programId, assignment.clientId],
    );
  }

  for (const exercise of programExercises) {
    await db.query(
      `
        insert into program_exercises (
          id, program_id, day_label, name, video_url, target_sets, target_reps, target_weight_kg, sort_order, created_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
      `,
      [
        exercise.id,
        exercise.programId,
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

  for (const task of tasks) {
    await db.query(
      "insert into client_tasks (id, client_id, label, done, created_at) values ($1, $2, $3, $4, now())",
      [task.id, task.clientId, task.label, task.done],
    );
  }

  for (const message of messages) {
    await db.query(
      `
        insert into messages (
          id, client_id, sender_id, sender_role, content, media_url, media_type, read, created_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        message.id,
        message.clientId,
        message.senderRole === "coach" ? coachId : null,
        message.senderRole,
        message.content,
        message.mediaUrl,
        message.mediaType,
        message.read,
        message.createdAt,
      ],
    );
  }

  for (const entry of checkIns) {
    await db.query(
      `
        insert into check_ins (
          id, client_id, workout_completion, energy, soreness, motivation, weight_kg, note, created_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        entry.id,
        entry.clientId,
        entry.workoutCompletion,
        entry.energy,
        entry.soreness,
        entry.motivation,
        entry.weightKg,
        entry.note,
        entry.createdAt,
      ],
    );
  }

  for (const point of trends) {
    await db.query(
      `
        insert into trend_points (
          id, client_id, recorded_at, weight_kg, performance, strength, conditioning
        ) values ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        randomUUID(),
        point.clientId,
        point.recordedAt,
        point.weightKg,
        point.performance,
        point.strength,
        point.conditioning,
      ],
    );
  }

  for (const session of workoutSessions) {
    await db.query(
      `
        insert into workout_sessions (
          id, coach_id, client_id, title, focus, scheduled_for, status, coach_note, week_label, created_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
      `,
      [
        session.id,
        coachId,
        session.clientId,
        session.title,
        session.focus,
        session.scheduledFor,
        session.status,
        session.coachNote,
        session.weekLabel,
      ],
    );
  }

  for (const exercise of workoutExercises) {
    await db.query(
      `
        insert into workout_exercises (
          id, session_id, name, video_url, target_sets, target_reps, target_weight_kg, sort_order, created_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, now())
      `,
      [
        exercise.id,
        exercise.sessionId,
        exercise.name,
        exercise.videoUrl,
        exercise.targetSets,
        exercise.targetReps,
        exercise.targetWeightKg,
        exercise.sortOrder,
      ],
    );
  }

  for (const log of exerciseLogs) {
    await db.query(
      `
        insert into exercise_logs (
          id, session_id, exercise_id, client_id, actual_weight_kg, actual_reps, actual_sets, completed_at, created_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, now())
      `,
      [
        log.id,
        log.sessionId,
        log.exerciseId,
        log.clientId,
        log.actualWeightKg,
        log.actualReps,
        log.actualSets,
        log.completedAt,
      ],
    );
  }

  for (const activity of activities) {
    await db.query(
      `
        insert into activity_logs (id, coach_id, client_id, type, title, detail, created_at)
        values ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        activity.id,
        coachId,
        activity.clientId,
        activity.type,
        activity.title,
        activity.detail,
        activity.createdAt,
      ],
    );
  }
}
