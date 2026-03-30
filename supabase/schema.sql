-- ── Artificial Voices — Supabase Schema ──────────────────────────────────────
-- Run this in: Supabase dashboard → SQL Editor → New query → Run

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── Learner Profiles ──────────────────────────────────────────────────────────
create table if not exists public.learner_profiles (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  native_language         text not null default 'English',
  target_language         text not null default 'Spanish',
  target_language_flag    text not null default '🇪🇸',
  current_level           text not null default 'beginner' check (current_level in ('beginner','intermediate','advanced')),
  preferred_mode          text not null default 'guided' check (preferred_mode in ('guided','adaptive')),
  confidence_score        float not null default 0,
  weak_vocabulary         text[] not null default '{}',
  weak_grammar            text[] not null default '{}',
  pronunciation_issues    text[] not null default '{}',
  completed_scenarios     text[] not null default '{}',
  completed_story_chapters text[] not null default '{}',
  total_xp                integer not null default 0,
  streak_days             integer not null default 0,
  last_active_at          timestamptz not null default now(),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (user_id)
);

-- ── Sessions ──────────────────────────────────────────────────────────────────
create table if not exists public.sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  scenario_id      text not null,
  session_type     text not null default 'scenario' check (session_type in ('scenario','story','camera','lesson')),
  mode             text not null default 'guided' check (mode in ('guided','adaptive','free')),
  difficulty       text not null default 'beginner' check (difficulty in ('beginner','intermediate','advanced')),
  mission_completed boolean not null default false,
  xp_earned        integer not null default 0,
  started_at       timestamptz not null default now(),
  ended_at         timestamptz
);

-- ── Transcript Turns ──────────────────────────────────────────────────────────
create table if not exists public.transcript_turns (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.sessions(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  speaker      text not null check (speaker in ('user','ai')),
  text         text not null,
  text_english text,
  latency_ms   integer,
  corrections  text[] not null default '{}',
  created_at   timestamptz not null default now()
);

-- ── Session Scores ────────────────────────────────────────────────────────────
create table if not exists public.session_scores (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null references public.sessions(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  pronunciation     integer not null default 0,
  grammar           integer not null default 0,
  vocabulary        integer not null default 0,
  naturalness       integer not null default 0,
  mission_completed boolean not null default false,
  strengths         text[] not null default '{}',
  corrections       text[] not null default '{}',
  next_step         text not null default '',
  created_at        timestamptz not null default now(),
  unique (session_id)
);

-- ── Vocabulary Progress ───────────────────────────────────────────────────────
create table if not exists public.vocabulary_progress (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  word_en        text not null,
  word_native    text not null,
  language       text not null,
  times_seen     integer not null default 1,
  times_correct  integer not null default 0,
  last_seen_at   timestamptz not null default now(),
  unique (user_id, word_en, language)
);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- All tables: users can only read/write their own rows

alter table public.learner_profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.transcript_turns enable row level security;
alter table public.session_scores enable row level security;
alter table public.vocabulary_progress enable row level security;

-- learner_profiles
create policy "own profile" on public.learner_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- sessions
create policy "own sessions" on public.sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- transcript_turns
create policy "own turns" on public.transcript_turns
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- session_scores
create policy "own scores" on public.session_scores
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- vocabulary_progress
create policy "own vocab" on public.vocabulary_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Auto-update updated_at ────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_learner_profiles_updated_at
  before update on public.learner_profiles
  for each row execute function public.set_updated_at();

-- ── Auto-create learner profile on signup ─────────────────────────────────────
-- This fires when a new user is created in auth.users
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.learner_profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists idx_sessions_user_id on public.sessions(user_id);
create index if not exists idx_sessions_started_at on public.sessions(started_at desc);
create index if not exists idx_transcript_turns_session_id on public.transcript_turns(session_id);
create index if not exists idx_vocab_progress_user_id on public.vocabulary_progress(user_id);
