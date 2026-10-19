-- Row level security for every public table, plus explicit grants.
-- Supabase grants table privileges to anon/authenticated by default; we reset them to the
-- minimum each table needs so a missing policy and a missing grant both have to fail.
-- The service role bypasses RLS and keeps its privileges (Edge Functions use it).

alter table public.profiles enable row level security;
alter table public.scenarios enable row level security;
alter table public.weapons enable row level security;
alter table public.player_progress enable row level security;
alter table public.player_unlocks enable row level security;
alter table public.game_sessions enable row level security;
alter table public.scores enable row level security;
alter table public.remote_config enable row level security;
alter table public.waitlist enable row level security;
alter table public.waitlist_rate_limits enable row level security;
alter table public.telemetry_events enable row level security;

revoke all on
  public.profiles,
  public.scenarios,
  public.weapons,
  public.player_progress,
  public.player_unlocks,
  public.game_sessions,
  public.scores,
  public.remote_config,
  public.waitlist,
  public.waitlist_rate_limits,
  public.telemetry_events
from anon, authenticated;

-- ---------------------------------------------------------------------------
-- profiles: own row only. Inserts happen through handle_new_user (security definer).
-- ---------------------------------------------------------------------------

grant select, update on public.profiles to authenticated;

create policy "profiles: read own"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "profiles: update own"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Catalog: public read, no client writes.
-- ---------------------------------------------------------------------------

grant select on public.scenarios, public.weapons, public.remote_config to anon, authenticated;

create policy "scenarios: public read"
  on public.scenarios for select to anon, authenticated
  using (true);

create policy "weapons: public read"
  on public.weapons for select to anon, authenticated
  using (true);

create policy "remote_config: public read"
  on public.remote_config for select to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Progress: each player reads and writes only their own rows.
-- Anonymous guests use the authenticated role (with is_anonymous in the JWT).
-- ---------------------------------------------------------------------------

grant select, insert, update on public.player_progress, public.player_unlocks to authenticated;

create policy "player_progress: read own"
  on public.player_progress for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "player_progress: insert own"
  on public.player_progress for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "player_progress: update own"
  on public.player_progress for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "player_unlocks: read own"
  on public.player_unlocks for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "player_unlocks: insert own"
  on public.player_unlocks for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "player_unlocks: update own"
  on public.player_unlocks for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Sessions and scores: read only. Writes go exclusively through Edge Functions
-- (service role), so there are no insert/update/delete grants or policies.
-- ---------------------------------------------------------------------------

grant select on public.game_sessions to authenticated;
grant select on public.scores to anon, authenticated;

create policy "game_sessions: read own"
  on public.game_sessions for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "scores: read own"
  on public.scores for select to authenticated
  using ((select auth.uid()) = user_id);

-- The leaderboard is public, but only for validated scores.
create policy "scores: public read validated"
  on public.scores for select to anon, authenticated
  using (validated);

-- Redundant with the revoke above; kept explicit because this is the rule the ranking relies on.
revoke insert, update, delete on public.scores, public.game_sessions from anon, authenticated;

-- ---------------------------------------------------------------------------
-- waitlist, waitlist_rate_limits, telemetry_events: no grants and no policies for clients.
-- Only the service role (Edge Functions) touches them.
-- ---------------------------------------------------------------------------
