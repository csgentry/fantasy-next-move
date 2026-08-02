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

-- FantasyNextMove 1.3D Launch Candidate
-- Billing, subscriptions, entitlements, founding members, refunds, analytics,
-- and audit tracking. Safe to run after the existing 1.3C schema.

create extension if not exists "pgcrypto";

-- Stripe customer mapping. One Stripe customer per FantasyNextMove user.
create table if not exists public.billing_customers (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  stripe_customer_id text not null unique,
  billing_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Current and historical Stripe subscriptions.
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_subscription_id text not null unique,
  stripe_customer_id text not null,
  stripe_price_id text,
  plan text not null check (plan in ('trade_lab', 'all_access')),
  billing_interval text not null check (billing_interval in ('month', 'year')),
  status text not null,
  amount integer,
  currency text not null default 'usd',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  founding_member boolean not null default false,
  latest_invoice_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists subscriptions_user_updated_idx on public.subscriptions (user_id, updated_at desc);
create index if not exists subscriptions_status_idx on public.subscriptions (status, updated_at desc);

-- Application access is synchronized from Stripe or granted separately by admin.
create table if not exists public.entitlements (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  access_level text not null default 'none' check (access_level in ('none', 'trade_lab', 'all_access', 'admin')),
  access_source text not null default 'none' check (access_source in ('none', 'stripe', 'complimentary', 'beta', 'admin')),
  trade_lab_access boolean not null default false,
  all_access boolean not null default false,
  max_connected_leagues integer not null default 0 check (max_connected_leagues between 0 and 100),
  valid_until timestamptz,
  founding_member boolean not null default false,
  override_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Stripe events are stored before processing so webhook delivery is idempotent.
create table if not exists public.stripe_events (
  stripe_event_id text primary key,
  event_type text not null,
  processing_status text not null default 'processing' check (processing_status in ('processing', 'processed', 'failed', 'ignored')),
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);
create index if not exists stripe_events_status_idx on public.stripe_events (processing_status, received_at desc);

-- First-year launch offer tracking. The badge remains after the discount ends.
create table if not exists public.founding_members (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  plan text not null check (plan in ('trade_lab', 'all_access')),
  stripe_subscription_id text not null unique,
  discount_amount integer not null default 0,
  founding_number integer not null unique check (founding_number > 0),
  offer_version text not null default 'launch-2026',
  joined_at timestamptz not null default now()
);

-- A short reservation prevents two simultaneous checkouts from overselling the first 250 spots.
create table if not exists public.founding_reservations (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  plan text not null check (plan in ('trade_lab', 'all_access')),
  status text not null default 'reserved' check (status in ('reserved', 'completed', 'expired')),
  checkout_session_id text,
  reserved_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes')
);
create index if not exists founding_reservations_status_idx on public.founding_reservations (status, expires_at);

create or replace function public.reserve_founding_slot(requested_user_id uuid, requested_plan text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  used_slots integer;
begin
  if requested_plan not in ('trade_lab', 'all_access') then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtext('fnm-founding-launch-2026'));
  update public.founding_reservations
    set status = 'expired'
    where status = 'reserved' and expires_at <= now();

  if exists (select 1 from public.founding_members where user_id = requested_user_id) then
    return false;
  end if;

  if exists (
    select 1 from public.founding_reservations
    where user_id = requested_user_id and status = 'reserved' and expires_at > now()
  ) then
    update public.founding_reservations
      set plan = requested_plan, reserved_at = now(), expires_at = now() + interval '30 minutes'
      where user_id = requested_user_id;
    return true;
  end if;

  select
    (select count(*) from public.founding_members) +
    (select count(*) from public.founding_reservations where status = 'reserved' and expires_at > now())
  into used_slots;

  if used_slots >= 250 then
    return false;
  end if;

  insert into public.founding_reservations (user_id, plan, status, reserved_at, expires_at)
  values (requested_user_id, requested_plan, 'reserved', now(), now() + interval '30 minutes')
  on conflict (user_id) do update set
    plan = excluded.plan,
    status = 'reserved',
    checkout_session_id = null,
    reserved_at = now(),
    expires_at = now() + interval '30 minutes';
  return true;
end;
$$;
revoke all on function public.reserve_founding_slot(uuid, text) from public, anon, authenticated;
grant execute on function public.reserve_founding_slot(uuid, text) to service_role;

create or replace function public.claim_founding_member(
  requested_user_id uuid,
  requested_plan text,
  requested_subscription_id text,
  requested_discount_amount integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_number integer;
begin
  perform pg_advisory_xact_lock(hashtext('fnm-founding-launch-2026'));

  select founding_number into assigned_number
  from public.founding_members
  where user_id = requested_user_id;
  if assigned_number is not null then
    return assigned_number;
  end if;

  if (select count(*) from public.founding_members) >= 250 then
    return null;
  end if;

  select coalesce(max(founding_number), 0) + 1 into assigned_number
  from public.founding_members;

  insert into public.founding_members (
    user_id, plan, stripe_subscription_id, discount_amount, founding_number, offer_version
  ) values (
    requested_user_id, requested_plan, requested_subscription_id,
    requested_discount_amount, assigned_number, 'launch-2026'
  );

  update public.founding_reservations
    set status = 'completed', expires_at = now()
    where user_id = requested_user_id;

  return assigned_number;
end;
$$;
revoke all on function public.claim_founding_member(uuid, text, text, integer) from public, anon, authenticated;
grant execute on function public.claim_founding_member(uuid, text, text, integer) to service_role;

-- Seven-day guarantee requests are reviewed in FantasyNextMove Admin.
create table if not exists public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  stripe_invoice_id text,
  reason text not null,
  eligible boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  amount integer,
  stripe_refund_id text,
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolution_note text
);
create index if not exists refund_requests_status_idx on public.refund_requests (status, requested_at desc);
create unique index if not exists refund_requests_one_pending_per_user on public.refund_requests (user_id) where status = 'pending';

-- Immutable operational history for billing and access changes.
create table if not exists public.billing_audit_log (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  previous_value jsonb,
  new_value jsonb,
  stripe_event_id text,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists billing_audit_user_idx on public.billing_audit_log (user_id, created_at desc);

-- Lightweight product analytics. Do not put secrets or complete league payloads here.
create table if not exists public.product_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  event_name text not null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists product_events_name_date_idx on public.product_events (event_name, created_at desc);
create index if not exists product_events_user_date_idx on public.product_events (user_id, created_at desc);

-- Treat paid or complimentary access as approved access so the existing league
-- ownership policies continue to work without exposing billing tables to clients.
create or replace function public.current_user_has_beta_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.beta_access = true
  ) or exists (
    select 1
    from public.entitlements e
    where e.user_id = auth.uid()
      and (e.trade_lab_access = true or e.all_access = true or e.access_level = 'admin')
      and (e.valid_until is null or e.valid_until > now())
  );
$$;
revoke all on function public.current_user_has_beta_access() from public, anon;
grant execute on function public.current_user_has_beta_access() to authenticated;

create or replace function public.current_user_access_level()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1 from public.entitlements e
      where e.user_id = auth.uid()
        and e.access_level = 'admin'
        and (e.valid_until is null or e.valid_until > now())
    ) then 'admin'
    when exists (
      select 1 from public.entitlements e
      where e.user_id = auth.uid()
        and e.all_access = true
        and (e.valid_until is null or e.valid_until > now())
    ) then 'all_access'
    when exists (
      select 1 from public.entitlements e
      where e.user_id = auth.uid()
        and e.trade_lab_access = true
        and (e.valid_until is null or e.valid_until > now())
    ) then 'trade_lab'
    when exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.beta_access = true
    ) then 'all_access'
    else 'none'
  end;
$$;
revoke all on function public.current_user_access_level() from public, anon;
grant execute on function public.current_user_access_level() to authenticated;

-- Existing beta testers keep complimentary All Access while launch billing is tested.
insert into public.entitlements (
  user_id, access_level, access_source, trade_lab_access, all_access,
  max_connected_leagues, valid_until, founding_member, override_reason
)
select id, 'all_access', 'beta', true, true, 10, null, false, 'Existing approved beta tester'
from public.profiles
where beta_access = true
on conflict (user_id) do nothing;

alter table public.billing_customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.entitlements enable row level security;
alter table public.stripe_events enable row level security;
alter table public.founding_members enable row level security;
alter table public.founding_reservations enable row level security;
alter table public.refund_requests enable row level security;
alter table public.billing_audit_log enable row level security;
alter table public.product_events enable row level security;

-- Customers may read their own billing summary but cannot forge payment status.
drop policy if exists "billing customers are self readable" on public.billing_customers;
create policy "billing customers are self readable"
on public.billing_customers for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "subscriptions are self readable" on public.subscriptions;
create policy "subscriptions are self readable"
on public.subscriptions for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "entitlements are self readable" on public.entitlements;
create policy "entitlements are self readable"
on public.entitlements for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "founding membership is self readable" on public.founding_members;
create policy "founding membership is self readable"
on public.founding_members for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "refund requests are self readable" on public.refund_requests;
create policy "refund requests are self readable"
on public.refund_requests for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "refund requests are self insertable" on public.refund_requests;
create policy "refund requests are self insertable"
on public.refund_requests for insert to authenticated
with check (auth.uid() = user_id);

-- Audit logs are visible to the affected user. Writes remain service-role only.
drop policy if exists "billing audit is self readable" on public.billing_audit_log;
create policy "billing audit is self readable"
on public.billing_audit_log for select to authenticated
using (auth.uid() = user_id);

-- No authenticated policies are intentionally created for stripe_events.
-- Product events are written by server routes with the service role.

-- Explicit grants for Data API access; RLS still determines which rows are visible.
grant select on public.billing_customers to authenticated;
grant select on public.subscriptions to authenticated;
grant select on public.entitlements to authenticated;
grant select on public.founding_members to authenticated;
grant select, insert on public.refund_requests to authenticated;
grant select on public.billing_audit_log to authenticated;

grant all on public.billing_customers to service_role;
grant all on public.subscriptions to service_role;
grant all on public.entitlements to service_role;
grant all on public.stripe_events to service_role;
grant all on public.founding_members to service_role;
grant all on public.founding_reservations to service_role;
grant all on public.refund_requests to service_role;
grant all on public.billing_audit_log to service_role;
grant all on public.product_events to service_role;
grant usage, select on all sequences in schema public to service_role;

