drop policy "accounts are approved-user owned" on public.connected_accounts;
create policy "provider references are account owned" on public.connected_accounts for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
