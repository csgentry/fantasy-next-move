-- Applied to the existing project on 2026-10-16. Trigger execution itself is unaffected.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
