-- Keepalive ping that writes a row and deletes it again.
-- pg_cron runs inside Postgres and does not count as project activity for Supabase's
-- inactivity pause, so an external caller (.github/workflows/supabase-keepalive.yml)
-- hits this RPC through the REST API every 2 days. Only service_role may execute it.

create or replace function public.run_keepalive_ping()
returns timestamptz
language plpgsql
security definer
set search_path = app_private, public
as $$
declare
  v_event_id bigint;
  v_ran_at timestamptz;
begin
  insert into app_private.supabase_keepalive_events (note)
  values ('external keepalive ping')
  returning id, ran_at into v_event_id, v_ran_at;

  delete from app_private.supabase_keepalive_events
  where id = v_event_id;

  return v_ran_at;
end;
$$;

revoke all on function public.run_keepalive_ping() from public, anon, authenticated;
grant execute on function public.run_keepalive_ping() to service_role;

-- Keep the in-database job as a backup, but stop it from growing the table.
select cron.unschedule('labtrack-keepalive')
where exists (
  select 1
  from cron.job
  where jobname = 'labtrack-keepalive'
);

select cron.schedule(
  'labtrack-keepalive',
  '0 9 */2 * *',
  $$ select public.run_keepalive_ping(); $$
);
