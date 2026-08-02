-- FantasyNextMove invite-only beta schema.
-- Run this entire file in the Supabase SQL Editor once.
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  beta_access boolean not null default false,
  plan text not null default 'free' check (plan in ('free', 'pro', 'commissioner')),
  stripe_customer_id text unique,
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists beta_access boolean not null default false;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create table if not exists public.beta_invites (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  email text,
  active boolean not null default true,
  max_uses int not null default 1 check (max_uses > 0),
  uses int not null default 0 check (uses >= 0),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.redeem_beta_invite(invite_hash text, invite_email text, invited_user_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare chosen public.beta_invites%rowtype;
begin
  select * into chosen from public.beta_invites
  where code_hash = invite_hash
    and active = true
    and uses < max_uses
    and (expires_at is null or expires_at > now())
    and (email is null or lower(email) = lower(invite_email))
  for update;

  if not found then return false; end if;

  update public.beta_invites
  set uses = uses + 1,
      active = case when uses + 1 >= max_uses then false else active end
  where id = chosen.id;

  insert into public.profiles (id, display_name, beta_access)
  values (invited_user_id, split_part(invite_email, '@', 1), true)
  on conflict (id) do update set beta_access = true;

  return true;
end;
$$;
revoke all on function public.redeem_beta_invite(text, text, uuid) from public, anon, authenticated;
grant execute on function public.redeem_beta_invite(text, text, uuid) to service_role;

create or replace function public.current_user_has_beta_access()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and beta_access = true
  );
$$;
revoke all on function public.current_user_has_beta_access() from public, anon;
grant execute on function public.current_user_has_beta_access() to authenticated;

create table if not exists public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('sleeper', 'yahoo', 'espn', 'nfl')),
  provider_user_id text,
  provider_username text,
  created_at timestamptz not null default now(),
  unique (user_id, provider, provider_user_id)
);

-- Provider tokens are encrypted by the server before storage. This table has no
-- authenticated-user policy and is accessed only with the server-only service role.
create table if not exists public.provider_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('yahoo')),
  encrypted_token text not null,
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  provider_league_id text not null,
  name text not null,
  season int not null,
  selected_roster_id int,
  is_active boolean not null default false,
  raw_data jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  unique (user_id, provider, provider_league_id, season)
);
alter table public.leagues add column if not exists selected_roster_id int;
alter table public.leagues add column if not exists is_active boolean not null default false;

-- Keep only the newest active row before enforcing one active league per user.
with ranked as (
  select id, row_number() over (partition by user_id order by synced_at desc, id desc) as row_number
  from public.leagues
  where is_active = true
)
update public.leagues set is_active = false
where id in (select id from ranked where row_number > 1);
create unique index if not exists leagues_one_active_per_user on public.leagues (user_id) where is_active = true;

create table if not exists public.league_histories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  current_league_id text not null,
  raw_data jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  unique (user_id, provider, current_league_id)
);

create table if not exists public.manager_identities (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  canonical_name text not null,
  provider_owner_id text,
  aliases text[] not null default '{}',
  unique (league_id, canonical_name)
);

alter table public.profiles enable row level security;
alter table public.beta_invites enable row level security;
alter table public.connected_accounts enable row level security;
alter table public.provider_credentials enable row level security;
alter table public.leagues enable row level security;
alter table public.league_histories enable row level security;
alter table public.manager_identities enable row level security;

drop policy if exists "profiles are self readable" on public.profiles;
create policy "profiles are self readable" on public.profiles for select to authenticated using (auth.uid() = id);
-- Intentionally no authenticated UPDATE policy on profiles. Beta access and plan
-- cannot be self-elevated from a browser client.
drop policy if exists "profiles are self editable" on public.profiles;

drop policy if exists "accounts are user owned" on public.connected_accounts;
drop policy if exists "accounts are approved-user owned" on public.connected_accounts;
create policy "accounts are approved-user owned" on public.connected_accounts for all to authenticated
using (auth.uid() = user_id and public.current_user_has_beta_access())
with check (auth.uid() = user_id and public.current_user_has_beta_access());

drop policy if exists "leagues are user owned" on public.leagues;
drop policy if exists "leagues are approved-user owned" on public.leagues;
create policy "leagues are approved-user owned" on public.leagues for all to authenticated
using (auth.uid() = user_id and public.current_user_has_beta_access())
with check (auth.uid() = user_id and public.current_user_has_beta_access());

drop policy if exists "histories are user owned" on public.league_histories;
drop policy if exists "histories are approved-user owned" on public.league_histories;
create policy "histories are approved-user owned" on public.league_histories for all to authenticated
using (auth.uid() = user_id and public.current_user_has_beta_access())
with check (auth.uid() = user_id and public.current_user_has_beta_access());

drop policy if exists "manager identities follow league owner" on public.manager_identities;
drop policy if exists "manager identities follow approved league owner" on public.manager_identities;
create policy "manager identities follow approved league owner" on public.manager_identities for all to authenticated using (
  public.current_user_has_beta_access() and exists (
    select 1 from public.leagues
    where leagues.id = manager_identities.league_id and leagues.user_id = auth.uid()
  )
) with check (
  public.current_user_has_beta_access() and exists (
    select 1 from public.leagues
    where leagues.id = manager_identities.league_id and leagues.user_id = auth.uid()
  )
);

-- No policies are created for beta_invites or provider_credentials. The public
-- and authenticated roles cannot read or change those rows; server-only service
-- role operations bypass RLS.

-- Create an invite in the SQL Editor. Replace the code and optional email:
-- insert into public.beta_invites (code_hash, email, max_uses, expires_at)
-- values (encode(digest('FNM-CHANGE-ME', 'sha256'), 'hex'), lower('tester@example.com'), 1, now() + interval '14 days');

-- Release 1.3C: league-specific Sleeper projections, actual statistics, and
-- projection accuracy snapshots. The table is user-owned and stores one row per
-- player, league, season, and week so FantasyNextMove can preserve weekly history.
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
