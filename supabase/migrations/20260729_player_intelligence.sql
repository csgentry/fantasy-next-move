-- FantasyNextMove Release 1.3C migration.
-- Run once in Supabase SQL Editor after deploying the code update.
create table if not exists public.player_weekly_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  league_id uuid references public.leagues(id) on delete cascade,
  provider_league_id text not null,
  season int not null check (season between 2000 and 2100),
  week int not null check (week between 1 and 25),
  season_type text not null default 'regular',
  player_id text not null,
  player_name text not null,
  position text,
  nfl_team text,
  roster_id int,
  is_rostered boolean not null default false,
  is_starter boolean not null default false,
  projection_stats jsonb not null default '{}'::jsonb,
  actual_stats jsonb not null default '{}'::jsonb,
  projected_points numeric,
  actual_points numeric,
  projection_error numeric,
  absolute_error numeric,
  synced_at timestamptz not null default now(),
  unique (user_id, provider_league_id, season, week, player_id)
);

create index if not exists player_snapshots_league_week_idx
  on public.player_weekly_snapshots (user_id, provider_league_id, season, week desc);
create index if not exists player_snapshots_player_idx
  on public.player_weekly_snapshots (user_id, provider_league_id, player_id, season, week desc);

alter table public.player_weekly_snapshots enable row level security;
drop policy if exists "player snapshots are approved-user owned" on public.player_weekly_snapshots;
create policy "player snapshots are approved-user owned"
on public.player_weekly_snapshots for all to authenticated
using (auth.uid() = user_id and public.current_user_has_beta_access())
with check (auth.uid() = user_id and public.current_user_has_beta_access());
