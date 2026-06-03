-- Neon PostgreSQL schema for MyJapaneseJourney enterprise dashboard
-- Run this in your Neon SQL editor.

create extension if not exists "pgcrypto";

create table if not exists user_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id text not null unique,
  name text,
  email text,
  current_level text default 'N5',
  target_exam text default 'JLPT',
  target_level text default 'N3',
  target_exam_date date,
  daily_goal_minutes integer not null default 25,
  ui_theme text not null default 'system',
  ui_language text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists auth_users (
  id uuid primary key default gen_random_uuid(),
  login_id text not null unique,
  password_hash text not null,
  role text not null default 'student' check (role in ('student', 'employee', 'admin', 'guest')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists auth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_users_login on auth_users(login_id);
create index if not exists idx_auth_sessions_user_created on auth_sessions(user_id, created_at desc);

create table if not exists discovered_items (
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
  ai_tags text[] not null default '{}'::text[],
  cluster_category text,
  status text not null default 'new' check (status in ('new', 'learning', 'weak', 'mastered', 'favorite')),
  is_favorite boolean not null default false,
  review_count integer not null default 0,
  last_reviewed_at timestamptz,
  next_review_at timestamptz,
  ease_factor numeric(4,2) not null default 2.50,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_discovered_user_created
  on discovered_items(user_id, created_at desc);
create index if not exists idx_discovered_user_filters
  on discovered_items(user_id, type, status, jlpt_level);

create table if not exists learning_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  activity_type text not null,
  item_id uuid,
  score numeric(5,2),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_learning_activity_user_created
  on learning_activity(user_id, created_at desc);

create table if not exists ai_lookups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  query text not null,
  response jsonb not null,
  lookup_type text not null default 'word-intelligence',
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_lookups_user_created
  on ai_lookups(user_id, created_at desc);

create table if not exists dokkai_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  input_text text not null,
  romaji text,
  english_translation text,
  summary text,
  estimated_jlpt_level text,
  difficulty_score integer,
  reading_speed_wpm integer,
  summary_quality_score integer,
  vocabulary_json jsonb not null default '[]'::jsonb,
  kanji_json jsonb not null default '[]'::jsonb,
  grammar_json jsonb not null default '[]'::jsonb,
  questions_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_dokkai_user_created
  on dokkai_analyses(user_id, created_at desc);

create table if not exists interview_practice (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  topic text not null,
  user_answer text,
  ai_answer_jp text,
  romaji text,
  english_meaning text,
  simpler_version_jp text,
  professional_version_jp text,
  feedback text,
  score integer,
  vocabulary_score integer,
  grammar_score integer,
  fluency_score integer,
  business_score integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_interview_user_created
  on interview_practice(user_id, created_at desc);

create table if not exists study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  plan_date date not null default current_date,
  status text not null default 'pending' check (status in ('pending', 'completed', 'archived')),
  estimated_minutes integer not null default 25,
  plan_payload jsonb not null default '{}'::jsonb,
  generated_by text not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, plan_date)
);

create index if not exists idx_study_plans_user_date
  on study_plans(user_id, plan_date desc);

create table if not exists activity_timeline (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  activity_type text not null,
  title text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_timeline_user_time
  on activity_timeline(user_id, occurred_at desc);

create table if not exists knowledge_graph_relations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  source_term text not null,
  target_term text not null,
  relation_type text not null default 'related',
  weight numeric(5,2) not null default 1.00,
  created_at timestamptz not null default now(),
  unique(user_id, source_term, target_term, relation_type)
);

create index if not exists idx_knowledge_graph_user_source
  on knowledge_graph_relations(user_id, source_term);

create table if not exists review_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  item_id uuid not null references discovered_items(id) on delete cascade,
  result text not null check (result in ('again', 'hard', 'good', 'easy')),
  previous_status text,
  new_status text,
  created_at timestamptz not null default now()
);

create index if not exists idx_review_sessions_user_created
  on review_sessions(user_id, created_at desc);
