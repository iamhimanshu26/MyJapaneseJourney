import { Pool } from '@neondatabase/serverless'

let pool
let schemaReadyPromise

const BOOTSTRAP_STATEMENTS = [
  'create extension if not exists "pgcrypto"',
  `create table if not exists user_profiles (
    id uuid primary key default gen_random_uuid(),
    auth_user_id text not null unique,
    name text,
    email text,
    current_level text default 'N5',
    target_exam text default 'JLPT',
    target_level text default 'N3',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`,
  `create table if not exists auth_users (
    id uuid primary key default gen_random_uuid(),
    login_id text not null unique,
    password_hash text not null,
    role text not null default 'student' check (role in ('student', 'employee', 'admin', 'guest')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`,
  `create table if not exists auth_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth_users(id) on delete cascade,
    token_hash text not null unique,
    expires_at timestamptz not null,
    revoked_at timestamptz,
    created_at timestamptz not null default now()
  )`,
  'create index if not exists idx_auth_users_login on auth_users(login_id)',
  'create index if not exists idx_auth_sessions_user on auth_sessions(user_id, expires_at desc)',
  `create table if not exists discovered_items (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references user_profiles(id) on delete cascade,
    type text not null check (type in ('vocabulary', 'grammar', 'kanji', 'phrase')),
    word text not null,
    reading text,
    romaji text,
    meaning_en text,
    meaning_hi text,
    jlpt_level text,
    part_of_speech text,
    example_jp text,
    example_romaji text,
    example_en text,
    business_usage text,
    similar_words text[],
    common_mistake text,
    tags text[],
    status text not null default 'new' check (status in ('new', 'learning', 'weak', 'mastered', 'favorite')),
    is_favorite boolean not null default false,
    review_count integer not null default 0,
    last_reviewed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`,
  'create index if not exists idx_discovered_user_created on discovered_items(user_id, created_at desc)',
  'create index if not exists idx_discovered_user_filters on discovered_items(user_id, type, status, jlpt_level)',
  `create table if not exists learning_activity (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references user_profiles(id) on delete cascade,
    activity_type text not null,
    item_id uuid,
    score numeric(5,2),
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  )`,
  'create index if not exists idx_learning_activity_user_created on learning_activity(user_id, created_at desc)',
  `create table if not exists ai_lookups (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references user_profiles(id) on delete cascade,
    query text not null,
    response jsonb not null,
    lookup_type text not null default 'word-intelligence',
    created_at timestamptz not null default now()
  )`,
  'create index if not exists idx_ai_lookups_user_created on ai_lookups(user_id, created_at desc)',
  `create table if not exists dokkai_analyses (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references user_profiles(id) on delete cascade,
    input_text text not null,
    romaji text,
    english_translation text,
    summary text,
    estimated_jlpt_level text,
    vocabulary_json jsonb not null default '[]'::jsonb,
    kanji_json jsonb not null default '[]'::jsonb,
    grammar_json jsonb not null default '[]'::jsonb,
    questions_json jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now()
  )`,
  'create index if not exists idx_dokkai_user_created on dokkai_analyses(user_id, created_at desc)',
  `create table if not exists interview_practice (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references user_profiles(id) on delete cascade,
    topic text not null,
    user_answer text,
    ai_answer_jp text,
    romaji text,
    english_meaning text,
    feedback text,
    score integer,
    created_at timestamptz not null default now()
  )`,
  'create index if not exists idx_interview_user_created on interview_practice(user_id, created_at desc)',
  `create table if not exists review_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references user_profiles(id) on delete cascade,
    item_id uuid not null references discovered_items(id) on delete cascade,
    result text not null check (result in ('again', 'hard', 'good', 'easy')),
    previous_status text,
    new_status text,
    created_at timestamptz not null default now()
  )`,
  'create index if not exists idx_review_sessions_user_created on review_sessions(user_id, created_at desc)',
]

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured')
  }
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL })
  }
  return pool
}

async function ensureSchema() {
  if (process.env.SKIP_DB_BOOTSTRAP === '1') return
  if (schemaReadyPromise) {
    await schemaReadyPromise
    return
  }

  schemaReadyPromise = (async () => {
    const client = await getPool().connect()
    try {
      for (const statement of BOOTSTRAP_STATEMENTS) {
        await client.query(statement)
      }
    } finally {
      client.release()
    }
  })().catch((error) => {
    schemaReadyPromise = null
    throw error
  })

  await schemaReadyPromise
}

export async function query(text, values = []) {
  await ensureSchema()
  const client = await getPool().connect()
  try {
    return await client.query(text, values)
  } finally {
    client.release()
  }
}

export async function ensureUserProfile({
  authUserId,
  email = null,
  name = null,
  currentLevel = 'N5',
  targetExam = 'JLPT',
  targetLevel = 'N3',
}) {
  if (!authUserId) {
    throw new Error('authUserId is required')
  }

  const result = await query(
    `insert into user_profiles (auth_user_id, email, name, current_level, target_exam, target_level, updated_at)
     values ($1, $2, $3, $4, $5, $6, now())
     on conflict (auth_user_id) do update
     set email = coalesce(excluded.email, user_profiles.email),
         name = coalesce(excluded.name, user_profiles.name),
         updated_at = now()
     returning *`,
    [authUserId, email, name, currentLevel, targetExam, targetLevel]
  )

  return result.rows[0]
}
