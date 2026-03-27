import { randomUUID } from "node:crypto";

import { Pool } from "pg";

import { hashPassword } from "./auth.js";
import { coachPresentation, seedDemoData } from "./seed.js";

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/omegafit",
    });
  }

  return pool;
}

let initializationPromise = null;

const schemaSql = `
  create table if not exists users (
    id text primary key,
    name text not null,
    email text not null unique,
    password_hash text not null,
    client_id text,
    role text not null default 'coach',
    created_at timestamptz not null default now()
  );

  alter table users add column if not exists client_id text;

  create table if not exists clients (
    id text primary key,
    coach_id text not null references users(id) on delete cascade,
    full_name text not null,
    initials text not null,
    email text not null,
    phone text not null,
    city text not null,
    age integer not null,
    goal text not null,
    status text not null,
    plan_tier text not null,
    joined_at timestamptz not null,
    last_checkin_at timestamptz,
    next_session_at timestamptz,
    notes text not null,
    tags text[] not null default '{}',
    weight_kg numeric(5, 1) not null,
    body_fat numeric(4, 1) not null,
    recovery integer not null,
    adherence integer not null,
    hydration integer not null,
    steps_avg integer not null,
    sleep_hours numeric(3, 1) not null,
    hrv integer not null,
    calories integer not null,
    protein integer not null,
    carbs integer not null,
    fats integer not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  create table if not exists programs (
    id text primary key,
    coach_id text not null references users(id) on delete cascade,
    title text not null,
    focus text not null,
    duration_weeks integer not null,
    intensity text not null,
    weekly_structure text[] not null default '{}',
    milestones text[] not null default '{}',
    created_at timestamptz not null default now()
  );

  create table if not exists program_assignments (
    program_id text not null references programs(id) on delete cascade,
    client_id text not null unique references clients(id) on delete cascade,
    primary key (program_id, client_id)
  );

  create table if not exists client_tasks (
    id text primary key,
    client_id text not null references clients(id) on delete cascade,
    label text not null,
    done boolean not null default false,
    created_at timestamptz not null default now()
  );

  create table if not exists messages (
    id text primary key,
    client_id text not null references clients(id) on delete cascade,
    sender_id text,
    sender_role text not null,
    content text not null,
    media_url text,
    media_type text,
    read boolean not null default false,
    created_at timestamptz not null default now()
  );

  alter table messages add column if not exists media_url text;
  alter table messages add column if not exists media_type text;

  create table if not exists check_ins (
    id text primary key,
    client_id text not null references clients(id) on delete cascade,
    workout_completion integer not null,
    energy integer not null,
    soreness integer not null,
    motivation integer not null,
    weight_kg numeric(5, 1) not null,
    note text not null,
    created_at timestamptz not null default now()
  );

  create table if not exists trend_points (
    id text primary key,
    client_id text not null references clients(id) on delete cascade,
    recorded_at timestamptz not null,
    weight_kg numeric(5, 1) not null,
    performance integer not null,
    strength integer not null,
    conditioning integer not null
  );

  create table if not exists activity_logs (
    id text primary key,
    coach_id text not null references users(id) on delete cascade,
    client_id text references clients(id) on delete set null,
    type text not null,
    title text not null,
    detail text not null,
    created_at timestamptz not null default now()
  );

  create table if not exists workout_sessions (
    id text primary key,
    coach_id text references users(id) on delete cascade,
    client_id text not null references clients(id) on delete cascade,
    title text not null,
    focus text not null,
    scheduled_for timestamptz not null,
    status text not null default 'planned',
    coach_note text not null default '',
    week_label text not null default '',
    created_at timestamptz not null default now()
  );

  alter table workout_sessions add column if not exists coach_id text references users(id) on delete cascade;

  create table if not exists workout_exercises (
    id text primary key,
    session_id text not null references workout_sessions(id) on delete cascade,
    name text not null,
    video_url text not null,
    target_sets integer not null,
    target_reps integer not null,
    target_weight_kg numeric(5, 1),
    sort_order integer not null default 0,
    created_at timestamptz not null default now()
  );

  alter table workout_exercises add column if not exists created_at timestamptz not null default now();

  create table if not exists program_exercises (
    id text primary key,
    program_id text not null references programs(id) on delete cascade,
    day_label text not null default 'Jour 1',
    name text not null,
    video_url text not null default '',
    target_sets integer not null,
    target_reps integer not null,
    target_weight_kg numeric(5, 1),
    sort_order integer not null default 0,
    created_at timestamptz not null default now()
  );

  create table if not exists exercise_logs (
    id text primary key,
    session_id text not null references workout_sessions(id) on delete cascade,
    exercise_id text not null references workout_exercises(id) on delete cascade,
    client_id text not null references clients(id) on delete cascade,
    actual_weight_kg numeric(5, 1),
    actual_reps integer,
    actual_sets integer,
    skipped boolean not null default false,
    skip_reasons text[] not null default '{}',
    skip_note text,
    completed_at timestamptz not null default now(),
    created_at timestamptz not null default now()
  );

  alter table exercise_logs add column if not exists skipped boolean not null default false;
  alter table exercise_logs add column if not exists skip_reasons text[] not null default '{}';
  alter table exercise_logs add column if not exists skip_note text;
  alter table exercise_logs add column if not exists created_at timestamptz not null default now();

  create table if not exists push_subscriptions (
    id text primary key,
    user_id text not null references users(id) on delete cascade,
    endpoint text not null unique,
    p256dh text not null,
    auth text not null,
    created_at timestamptz not null default now()
  );

  create index if not exists idx_clients_coach on clients(coach_id);
  create index if not exists idx_programs_coach on programs(coach_id);
  create index if not exists idx_messages_client on messages(client_id);
  create index if not exists idx_checkins_client on check_ins(client_id);
  create index if not exists idx_trends_client on trend_points(client_id);
  create index if not exists idx_activity_coach on activity_logs(coach_id);
  create index if not exists idx_sessions_client on workout_sessions(client_id);
  create index if not exists idx_logs_session on exercise_logs(session_id);
  create index if not exists idx_program_exercises_program on program_exercises(program_id);
  create index if not exists idx_push_user on push_subscriptions(user_id);
  create unique index if not exists idx_users_client_id_unique on users(client_id) where client_id is not null;
`;

export async function initializeDatabase() {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    const activePool = getPool();
    await activePool.query(schemaSql);

    const seedEmail = process.env.OMEGAFIT_SEED_EMAIL ?? "coach@omegafit.app";
    const seedPassword = process.env.OMEGAFIT_SEED_PASSWORD ?? "OmegaFit2026!";
    const clientSeedPassword =
      process.env.OMEGAFIT_CLIENT_SEED_PASSWORD ?? "OmegaFitClient2026!";

    const existingUser = await activePool.query("select * from users where email = $1 limit 1", [
      seedEmail,
    ]);

    let coachId = existingUser.rows[0]?.id;

    if (!coachId) {
      coachId = randomUUID();
      const passwordHash = await hashPassword(seedPassword);
      await activePool.query(
        `
          insert into users (id, name, email, password_hash, role)
          values ($1, $2, $3, $4, 'coach')
        `,
        [coachId, coachPresentation.name, seedEmail, passwordHash],
      );
    }

    const client = await activePool.connect();

    try {
      await client.query("begin");
      await seedDemoData(client, coachId);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }

    const clientRows = await activePool.query(
      "select id, full_name, email from clients where coach_id = $1 order by full_name asc",
      [coachId],
    );
    const clientPasswordHash = await hashPassword(clientSeedPassword);

    for (const clientRow of clientRows.rows) {
      await activePool.query(
        `
          insert into users (id, name, email, password_hash, role, client_id)
          values ($1, $2, $3, $4, 'client', $5)
          on conflict (email) do update
          set
            name = excluded.name,
            password_hash = excluded.password_hash,
            role = 'client',
            client_id = excluded.client_id
        `,
        [
          randomUUID(),
          clientRow.full_name,
          clientRow.email,
          clientPasswordHash,
          clientRow.id,
        ],
      );
    }
  })().catch((error) => {
    initializationPromise = null;
    throw error;
  });

  return initializationPromise;
}

export async function query(text, params = []) {
  await initializeDatabase();
  return getPool().query(text, params);
}

export async function withTransaction(work) {
  await initializeDatabase();
  const client = await getPool().connect();

  try {
    await client.query("begin");
    const result = await work(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
