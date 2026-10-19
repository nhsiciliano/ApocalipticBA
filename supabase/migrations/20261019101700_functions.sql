-- SQL functions: leaderboard, updated_at maintenance and the waitlist rate limiter.

-- ---------------------------------------------------------------------------
-- Display names for the leaderboard
-- ---------------------------------------------------------------------------

-- profiles only exposes the caller's own row. The leaderboard needs other players' names, so
-- this narrow security definer function returns just display_name and nothing else.
create function public.player_display_name(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.display_name from public.profiles p where p.user_id = p_user_id;
$$;

revoke execute on function public.player_display_name(uuid) from public;
grant execute on function public.player_display_name(uuid) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- top_scores: top N validated scores of a scenario
-- ---------------------------------------------------------------------------

-- security invoker: runs with the caller's privileges, so the "validated" RLS policy on scores
-- applies on top of the explicit filter. Ties break by shorter run, then by earlier submission.
create function public.top_scores(p_scenario_slug text, p_limit int default 10)
returns table (
  rank bigint,
  display_name text,
  score int,
  duration_ms int,
  accuracy numeric,
  headshots int,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    row_number() over (order by s.score desc, s.duration_ms asc, s.created_at asc) as rank,
    public.player_display_name(s.user_id) as display_name,
    s.score,
    s.duration_ms,
    s.accuracy,
    s.headshots,
    s.created_at
  from public.scores s
  join public.scenarios sc on sc.id = s.scenario_id
  where sc.slug = p_scenario_slug
    and s.validated
  order by s.score desc, s.duration_ms asc, s.created_at asc
  limit least(greatest(coalesce(p_limit, 10), 1), 100);
$$;

revoke execute on function public.top_scores(text, int) from public;
grant execute on function public.top_scores(text, int) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger player_progress_touch_updated_at
  before update on public.player_progress
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- bump_rate_limit: atomic fixed-window counter for waitlist-signup
-- ---------------------------------------------------------------------------

-- Increments the bucket inside a single upsert (no read-modify-write race) and returns true
-- while the count stays within p_max. A window older than p_window_seconds restarts at 1.
-- p_now is a parameter so the caller (and tests) control the clock.
create function public.bump_rate_limit(
  p_bucket text,
  p_max int,
  p_window_seconds int,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_count int;
begin
  insert into public.waitlist_rate_limits as r (bucket, count, window_start)
  values (p_bucket, 1, p_now)
  on conflict (bucket) do update
    set count = case
          when r.window_start <= p_now - make_interval(secs => p_window_seconds) then 1
          else r.count + 1
        end,
        window_start = case
          when r.window_start <= p_now - make_interval(secs => p_window_seconds) then p_now
          else r.window_start
        end
  returning r.count into v_count;
  return v_count <= p_max;
end;
$$;

-- Only Edge Functions (service role) may touch the limiter.
revoke execute on function public.bump_rate_limit(text, int, int, timestamptz) from public, anon, authenticated;
grant execute on function public.bump_rate_limit(text, int, int, timestamptz) to service_role;
