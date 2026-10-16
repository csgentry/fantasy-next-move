create schema if not exists private;
create or replace function private.enforce_league_limit() returns trigger language plpgsql security definer set search_path = '' as $$
declare allowed integer := 1; existing_count integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id::text, 0));
  if exists(select 1 from public.profiles where id = new.user_id and beta_access = true) then allowed := 10; end if;
  select greatest(allowed, coalesce(max(max_connected_leagues),0)) into allowed from public.entitlements
    where user_id = new.user_id and (valid_until is null or valid_until > now())
    and (trade_lab_access or all_access or access_level = 'admin');
  select count(*) into existing_count from public.leagues where user_id = new.user_id and id <> new.id;
  if existing_count >= allowed then raise exception 'Connected league limit reached' using errcode = '23514'; end if;
  return new;
end; $$;
revoke all on function private.enforce_league_limit() from public, anon, authenticated;
create trigger enforce_connected_league_limit before insert or update on public.leagues for each row execute function private.enforce_league_limit();
drop policy "leagues are approved-user owned" on public.leagues;
create policy "leagues are account owned" on public.leagues for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
