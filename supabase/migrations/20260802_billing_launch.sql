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
