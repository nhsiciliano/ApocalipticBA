-- Core schema for ApocalipticBA (docs/prompt-base.md section 5).
-- Row level security and grants live in the next migration; SQL functions in the one after.

-- citext gives case-insensitive uniqueness for waitlist emails.
create extension if not exists citext with schema extensions;

-- ---------------------------------------------------------------------------
-- Players
-- ---------------------------------------------------------------------------

-- One profile per auth user, created by the handle_new_user trigger below.
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Null until the player picks a name (anonymous guests start without one).
  display_name text check (display_name is null or char_length(display_name) between 2 and 24),
  -- ISO 3166-1 alpha-2, upper case.
  country char(2) check (country is null or country ~ '^[A-Z]{2}$'),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Catalog (read-only for clients, seeded)
-- ---------------------------------------------------------------------------

create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  "order" int not null unique check ("order" >= 1),
  is_active boolean not null default true
);

create table public.weapons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  base_stats jsonb not null default '{}'::jsonb
);

-- ---------------------------------------------------------------------------
-- Progress
-- ---------------------------------------------------------------------------

create table public.player_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  scenario_id uuid not null references public.scenarios (id) on delete cascade,
  best_time_ms int check (best_time_ms is null or best_time_ms > 0),
  completed boolean not null default false,
  notes_found jsonb not null default '[]'::jsonb check (jsonb_typeof(notes_found) = 'array'),
  updated_at timestamptz not null default now(),
  primary key (user_id, scenario_id)
);

create table public.player_unlocks (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_type text not null,
  item_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, item_type, item_id)
);

-- ---------------------------------------------------------------------------
-- Sessions and scores (written only by Edge Functions with the service role)
-- ---------------------------------------------------------------------------

create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  -- Kept when the account is deleted so the leaderboard history stays consistent.
  user_id uuid references auth.users (id) on delete set null,
  scenario_id uuid not null references public.scenarios (id),
  app_version text not null,
  platform text not null check (platform in ('ios', 'android')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  -- Hash of the signed session token handed to the client by start-session.
  token_hash text not null
);

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.game_sessions (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  scenario_id uuid not null references public.scenarios (id),
  score int not null check (score >= 0),
  duration_ms int not null check (duration_ms > 0),
  kills int not null default 0 check (kills >= 0),
  accuracy numeric(5, 4) not null default 0 check (accuracy between 0 and 1),
  headshots int not null default 0 check (headshots >= 0),
  -- Only validated scores (plausibility checked by submit-score) reach the leaderboard.
  validated boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Remote config
-- ---------------------------------------------------------------------------

create table public.remote_config (
  key text not null,
  value jsonb not null,
  platform text not null default 'all' check (platform in ('all', 'ios', 'android')),
  min_app_version text,
  primary key (key, platform)
);

-- ---------------------------------------------------------------------------
-- Landing waitlist (service role only)
-- ---------------------------------------------------------------------------

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email extensions.citext not null unique check (char_length(email) <= 254),
  locale text not null check (locale in ('es-AR', 'en')),
  source text check (source is null or char_length(source) <= 64),
  created_at timestamptz not null default now()
);

-- Fixed-window counters for waitlist-signup. Buckets are salted hashes, never raw IPs or emails.
create table public.waitlist_rate_limits (
  bucket text primary key,
  count int not null default 0,
  window_start timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Telemetry (anonymous, opt-out; written through an Edge Function in Fase 2)
-- ---------------------------------------------------------------------------

create table public.telemetry_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.game_sessions (id) on delete set null,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index scores_scenario_score_idx on public.scores (scenario_id, score desc);
create index scores_user_idx on public.scores (user_id);
create index game_sessions_user_idx on public.game_sessions (user_id);
create index telemetry_events_created_at_idx on public.telemetry_events (created_at);
create index player_progress_user_idx on public.player_progress (user_id);

-- ---------------------------------------------------------------------------
-- Profile bootstrap (Supabase "managing user data" pattern)
-- ---------------------------------------------------------------------------

-- Runs as the table owner so it can write profiles while RLS denies client inserts.
-- An empty search_path forces fully qualified names (no search_path hijacking).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
