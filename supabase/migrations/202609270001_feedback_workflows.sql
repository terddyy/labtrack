-- Feedback workflow completion: room controls, borrower roles, message deep links,
-- unavailable-asset enforcement, and automatic overdue reminders.

alter table public.locations
  alter column location_type set default 'location';

alter table public.locations
  drop constraint if exists locations_location_type_check;

alter table public.locations
  add constraint locations_location_type_check
  check (location_type in ('location', 'room')) not valid;

alter table public.notifications
  add column if not exists related_thread_id uuid references public.ticket_threads(id) on delete cascade,
  add column if not exists related_booking_id uuid references public.bookings(id) on delete cascade;

alter table public.bookings
  add column if not exists overdue_reminder_sent_at timestamptz;

create or replace function app_private.enforce_borrowable_asset_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.resource_type = 'asset'::public.borrowing_resource_type
    and not exists (
      select 1 from public.assets a
      where a.id = new.asset_id
        and a.status = 'available'::public.asset_status
        and a.is_active = true
        and a.archived_at is null
    ) then
    raise exception 'Asset is not available for borrowing' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_enforce_borrowable_asset_status on public.bookings;
create trigger bookings_enforce_borrowable_asset_status
before insert on public.bookings
for each row execute function app_private.enforce_borrowable_asset_status();

create index if not exists notifications_recipient_thread_unread_idx
  on public.notifications (recipient_id, related_thread_id, created_at desc)
  where read_at is null and related_thread_id is not null;

create or replace function public.bootstrap_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_email text;
  profile_full_name text;
  requested_role text;
begin
  profile_email := lower(nullif(btrim(new.email), ''));

  if profile_email is null then
    return new;
  end if;

  profile_full_name := coalesce(
    nullif(btrim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data->>'name'), ''),
    nullif(btrim(new.raw_user_meta_data->>'display_name'), ''),
    nullif(btrim(split_part(profile_email, '@', 1)), ''),
    'New user'
  );
  requested_role := lower(coalesce(new.raw_user_meta_data->>'requested_role', 'faculty'));

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    profile_email,
    profile_full_name,
    case when requested_role = 'student' then 'student'::public.user_role else 'faculty'::public.user_role end
  )
  on conflict do nothing;

  return new;
end;
$$;

create or replace function public.list_borrowable_resources(
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_resource_type public.borrowing_resource_type default null,
  p_location_id uuid default null,
  p_query text default null
)
returns table (
  id uuid,
  resource_type public.borrowing_resource_type,
  name text,
  category_name text,
  location_id uuid,
  location_name text,
  status public.asset_status,
  condition public.asset_condition,
  availability text,
  next_available_at timestamptz,
  primary_image_url text,
  is_active boolean,
  is_archived boolean
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  perform app_private.require_active_user();

  if p_start_at <= now() then
    raise exception 'Borrow start time must be later than now' using errcode = '22023';
  end if;
  if p_end_at <= p_start_at then
    raise exception 'Borrow end time must be after the start time' using errcode = '22023';
  end if;
  if extract(epoch from (p_end_at - p_start_at)) / 60 not between 90 and 180 then
    raise exception 'Borrowing duration must be between 90 and 180 minutes' using errcode = '22023';
  end if;

  return query
    select
      a.id,
      'asset'::public.borrowing_resource_type,
      a.name,
      ac.name,
      l.id,
      l.name,
      a.status,
      a.condition,
      case
        when a.is_active = false or a.archived_at is not null or a.status <> 'available'::public.asset_status then 'unavailable'
        else app_private.borrowing_conflict_state('asset'::public.borrowing_resource_type, a.id, p_start_at, p_end_at, null)
      end,
      app_private.next_resource_available_at('asset'::public.borrowing_resource_type, a.id, p_start_at),
      ai.storage_path,
      a.is_active,
      a.archived_at is not null
    from public.assets a
    join public.asset_categories ac on ac.id = a.category_id
    join public.locations l on l.id = a.location_id
    left join public.asset_images ai on ai.asset_id = a.id and ai.is_primary = true
    where (p_resource_type is null or p_resource_type = 'asset'::public.borrowing_resource_type)
      and (p_location_id is null or a.location_id = p_location_id)
      and a.is_active = true
      and a.archived_at is null
      and (p_query is null or a.name ilike '%' || p_query || '%' or a.property_number ilike '%' || p_query || '%')
    union all
    select
      l.id,
      'room'::public.borrowing_resource_type,
      l.name,
      'Room'::text,
      l.id,
      l.name,
      null::public.asset_status,
      null::public.asset_condition,
      case
        when l.is_reservable = false then 'unavailable'
        else app_private.borrowing_conflict_state('room'::public.borrowing_resource_type, l.id, p_start_at, p_end_at, null)
      end,
      app_private.next_resource_available_at('room'::public.borrowing_resource_type, l.id, p_start_at),
      null::text,
      l.is_reservable,
      false
    from public.locations l
    where l.location_type = 'room'
      and (p_resource_type is null or p_resource_type = 'room'::public.borrowing_resource_type)
      and (p_location_id is null or l.id = p_location_id)
      and (p_query is null or l.name ilike '%' || p_query || '%')
    order by 2, 3;
end;
$$;

revoke all on function public.list_borrowable_resources(timestamptz, timestamptz, public.borrowing_resource_type, uuid, text) from public, anon;
grant execute on function public.list_borrowable_resources(timestamptz, timestamptz, public.borrowing_resource_type, uuid, text) to authenticated;

create or replace function public.send_ticket_message(p_thread_id uuid, p_body text)
returns public.ticket_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_is_admin boolean;
  v_body text;
  v_message public.ticket_messages%rowtype;
  v_borrower_id uuid;
begin
  v_actor_id := app_private.require_active_user();
  v_is_admin := app_private.is_admin_user(v_actor_id);
  v_body := nullif(btrim(p_body), '');

  if v_body is null then
    raise exception 'Message body is required' using errcode = '22023';
  end if;
  if not app_private.can_access_ticket_thread(p_thread_id, v_actor_id) then
    raise exception 'Cannot access this message thread' using errcode = '42501';
  end if;

  insert into public.ticket_messages (thread_id, sender_id, body)
  values (p_thread_id, v_actor_id, v_body)
  returning * into v_message;

  v_borrower_id := app_private.ticket_thread_instructor_id(p_thread_id);

  if v_is_admin and v_borrower_id is not null and v_borrower_id <> v_actor_id then
    insert into public.notifications (recipient_id, type, title, body, related_thread_id)
    values (v_borrower_id, 'ticket_message', 'New message', 'A custodian sent you a message.', p_thread_id);
  elsif not v_is_admin then
    insert into public.notifications (recipient_id, type, title, body, related_thread_id)
    select p.id, 'ticket_message', 'New message', 'A borrower sent a message.', p_thread_id
    from public.profiles p
    where p.is_active = true and p.role::text in ('admin', 'custodian', 'super_admin');
  end if;

  return v_message;
end;
$$;

revoke all on function public.send_ticket_message(uuid, text) from public, anon;
grant execute on function public.send_ticket_message(uuid, text) to authenticated;

drop function if exists public.send_borrowing_return_reminder(uuid);
create function public.send_borrowing_return_reminder(p_borrowing_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_booking public.bookings%rowtype;
begin
  v_actor_id := app_private.require_admin();
  select * into v_booking from public.bookings where id = p_borrowing_id for update;

  if not found then
    raise exception 'Borrowing not found' using errcode = 'P0002';
  end if;
  if v_booking.status <> 'checked_out' or v_booking.requested_end_at >= now() then
    raise exception 'Only overdue checked-out borrowings can be reminded' using errcode = '23514';
  end if;

  insert into public.notifications (recipient_id, type, title, body, related_booking_id)
  values (
    v_booking.instructor_id,
    'booking_update',
    'Borrowing overdue',
    'Please return the borrowed item or room access to the LABTRACK custodian as soon as possible.',
    v_booking.id
  );

  update public.bookings set overdue_reminder_sent_at = now() where id = v_booking.id;
  perform app_private.audit_action('borrowing.return_reminder_sent', 'bookings', v_booking.id, jsonb_build_object('actor_id', v_actor_id));
end;
$$;

revoke all on function public.send_borrowing_return_reminder(uuid) from public, anon;
grant execute on function public.send_borrowing_return_reminder(uuid) to authenticated;

-- Keep the mobile reset action complete after standalone message conversations
-- were introduced. Related booking/defect conversations still cascade with
-- their parent records.
create or replace function public.reset_my_activity_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_bookings_deleted integer := 0;
  v_defect_reports_deleted integer := 0;
  v_notifications_deleted integer := 0;
  v_push_tokens_deleted integer := 0;
  v_messages_deleted integer := 0;
  v_asset_ids uuid[];
  v_asset_id uuid;
begin
  v_actor_id := app_private.require_active_user();

  select coalesce(array_agg(distinct asset_id), '{}'::uuid[])
  into v_asset_ids
  from (
    select b.asset_id
    from public.bookings b
    where b.instructor_id = v_actor_id and b.asset_id is not null
    union
    select dr.asset_id
    from public.defect_reports dr
    where dr.instructor_id = v_actor_id and dr.asset_id is not null
  ) owned_assets;

  delete from storage.objects
  where bucket_id = 'defect-photos'
    and app_private.defect_photo_report_id(name) in (
      select dr.id from public.defect_reports dr where dr.instructor_id = v_actor_id
    );

  delete from public.ticket_threads
  where requester_id = v_actor_id
    and booking_id is null
    and defect_report_id is null;
  get diagnostics v_messages_deleted = row_count;

  delete from public.notifications where recipient_id = v_actor_id;
  get diagnostics v_notifications_deleted = row_count;

  delete from public.device_push_tokens where user_id = v_actor_id;
  get diagnostics v_push_tokens_deleted = row_count;

  delete from public.defect_reports where instructor_id = v_actor_id;
  get diagnostics v_defect_reports_deleted = row_count;

  delete from public.bookings where instructor_id = v_actor_id;
  get diagnostics v_bookings_deleted = row_count;

  foreach v_asset_id in array v_asset_ids
  loop
    perform app_private.sync_asset_status(v_asset_id);
  end loop;

  return jsonb_build_object(
    'bookings_deleted', v_bookings_deleted,
    'defect_reports_deleted', v_defect_reports_deleted,
    'notifications_deleted', v_notifications_deleted,
    'push_tokens_deleted', v_push_tokens_deleted,
    'messages_deleted', v_messages_deleted
  );
end;
$$;

revoke all on function public.reset_my_activity_data() from public, anon;
grant execute on function public.reset_my_activity_data() to authenticated;

create or replace function app_private.process_overdue_borrowing_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
begin
  with overdue as (
    update public.bookings b
    set overdue_reminder_sent_at = now()
    where b.status = 'checked_out'
      and b.requested_end_at < now()
      and (b.overdue_reminder_sent_at is null or b.overdue_reminder_sent_at < now() - interval '24 hours')
    returning b.id, b.instructor_id
  ), inserted as (
    insert into public.notifications (recipient_id, type, title, body, related_booking_id)
    select
      o.instructor_id,
      'booking_update',
      'Borrowing overdue',
      'Please return the borrowed item or room access to the LABTRACK custodian as soon as possible.',
      o.id
    from overdue o
    returning 1
  )
  select count(*) into v_count from inserted;

  return v_count;
end;
$$;

revoke all on function app_private.process_overdue_borrowing_reminders() from public, anon, authenticated;

select cron.unschedule('labtrack-overdue-borrowing-reminders')
where exists (select 1 from cron.job where jobname = 'labtrack-overdue-borrowing-reminders');

select cron.schedule(
  'labtrack-overdue-borrowing-reminders',
  '*/15 * * * *',
  $$select app_private.process_overdue_borrowing_reminders();$$
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array['assets', 'locations', 'bookings', 'defect_reports', 'ticket_threads', 'ticket_messages', 'notifications']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;
