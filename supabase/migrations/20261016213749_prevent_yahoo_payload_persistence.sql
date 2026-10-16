-- Applied after confirming both tables contained only Sleeper data.
alter table public.leagues add constraint no_persisted_yahoo_leagues check (provider <> 'yahoo');
alter table public.league_histories add constraint no_persisted_yahoo_history check (provider <> 'yahoo');
