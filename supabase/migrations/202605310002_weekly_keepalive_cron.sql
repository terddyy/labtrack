create extension if not exists pg_cron;

create table if not exists app_private.supabase_keepalive_events (
  id bigint generated always as identity primary key,
  ran_at timestamptz not null default now(),
  note text not null default 'weekly Supabase keepalive activity'
);

alter table app_private.supabase_keepalive_events enable row level security;

select cron.unschedule('labtrack-weekly-keepalive')
where exists (
  select 1
  from cron.job
  where jobname = 'labtrack-weekly-keepalive'
);

select cron.schedule(
  'labtrack-weekly-keepalive',
  '0 9 * * 5',
  $$
    insert into app_private.supabase_keepalive_events (note)
    values ('weekly Friday keepalive activity');
  $$
);
