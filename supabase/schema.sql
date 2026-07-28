-- Production data model for FantasyNextMove.
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'commissioner')),
  stripe_customer_id text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('sleeper', 'yahoo', 'espn', 'nfl')),
  provider_user_id text,
  provider_username text,
  created_at timestamptz not null default now(),
  unique (user_id, provider, provider_user_id)
);

create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  provider_league_id text not null,
  name text not null,
  season int not null,
  raw_data jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  unique (user_id, provider, provider_league_id, season)
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
alter table public.connected_accounts enable row level security;
alter table public.leagues enable row level security;
alter table public.manager_identities enable row level security;

create policy "profiles are self readable" on public.profiles for select using (auth.uid() = id);
create policy "profiles are self editable" on public.profiles for update using (auth.uid() = id);
create policy "accounts are user owned" on public.connected_accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "leagues are user owned" on public.leagues for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "manager identities follow league owner" on public.manager_identities for all using (
  exists (select 1 from public.leagues where leagues.id = manager_identities.league_id and leagues.user_id = auth.uid())
) with check (
  exists (select 1 from public.leagues where leagues.id = manager_identities.league_id and leagues.user_id = auth.uid())
);
