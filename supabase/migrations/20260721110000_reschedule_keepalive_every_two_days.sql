-- Reschedule Supabase keepalive from weekly to every 2 days.
-- Runs via pg_cron inside the database; not exposed to app users (app_private schema).

select cron.unschedule('labtrack-weekly-keepalive')
where exists (
  select 1
  from cron.job
  where jobname = 'labtrack-weekly-keepalive'
);

select cron.unschedule('labtrack-keepalive')
where exists (
  select 1
  from cron.job
  where jobname = 'labtrack-keepalive'
);

select cron.schedule(
  'labtrack-keepalive',
  '0 9 */2 * *',
  $$
    insert into app_private.supabase_keepalive_events (note)
    values ('scheduled keepalive activity');
  $$
);
