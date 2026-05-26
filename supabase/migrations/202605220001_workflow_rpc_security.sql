create or replace function app_private.is_admin_user(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    exists (
      select 1
      from public.profiles p
      where p.id = p_user_id
        and p.is_active = true
        and p.role in ('admin'::public.user_role, 'super_admin'::public.user_role)
    ),
    false
  )
$$;

create or replace function app_private.is_active_user(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    exists (
      select 1
      from public.profiles p
      where p.id = p_user_id
        and p.is_active = true
    ),
    false
  )
$$;

create or replace function app_private.require_active_user()
returns uuid
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_actor_id uuid;
begin
  v_actor_id := auth.uid();

  if v_actor_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if not app_private.is_active_user(v_actor_id) then
    raise exception 'Active profile required'
      using errcode = '42501';
  end if;

  return v_actor_id;
end;
$$;

create or replace function app_private.require_admin()
returns uuid
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_actor_id uuid;
begin
  v_actor_id := app_private.require_active_user();

  if not app_private.is_admin_user(v_actor_id) then
    raise exception 'Administrator privileges required'
      using errcode = '42501';
  end if;

  return v_actor_id;
end;
$$;

create or replace function app_private.audit_action(
  p_action text,
  p_entity_table text,
  p_entity_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
begin
  v_actor_id := app_private.require_active_user();

  insert into public.audit_logs (actor_id, action, entity_table, entity_id, metadata)
  values (
    v_actor_id,
    p_action,
    p_entity_table,
    p_entity_id,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

create or replace function app_private.create_notification(
  p_recipient_id uuid,
  p_type public.notification_type,
  p_title text,
  p_body text
)
returns public.notifications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_notification public.notifications%rowtype;
begin
  if p_recipient_id is null then
    return null;
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_recipient_id
      and p.is_active = true
  ) then
    return null;
  end if;

  insert into public.notifications (recipient_id, type, title, body)
  values (
    p_recipient_id,
    p_type,
    coalesce(nullif(btrim(p_title), ''), 'LABTRACK update'),
    coalesce(nullif(btrim(p_body), ''), 'A LABTRACK record was updated.')
  )
  returning * into v_notification;

  return v_notification;
end;
$$;

create or replace function app_private.has_booking_overlap(
  p_booking_id uuid,
  p_asset_id uuid,
  p_requested_start_at timestamptz,
  p_requested_end_at timestamptz
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    exists (
      select 1
      from public.bookings b
      where b.id <> p_booking_id
        and b.asset_id = p_asset_id
        and b.status in ('approved'::public.booking_status, 'checked_out'::public.booking_status)
        and tstzrange(b.requested_start_at, b.requested_end_at, '[)')
          && tstzrange(p_requested_start_at, p_requested_end_at, '[)')
    ),
    false
  )
$$;

create or replace function app_private.asset_has_open_defect(p_asset_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    exists (
      select 1
      from public.defect_reports dr
      where dr.asset_id = p_asset_id
        and dr.status in (
          'pending'::public.defect_status,
          'under_review'::public.defect_status,
          'sent_for_repair'::public.defect_status
        )
    ),
    false
  )
$$;

create or replace function app_private.sync_asset_status(p_asset_id uuid)
returns public.asset_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_status public.asset_status;
  v_next_status public.asset_status;
begin
  select a.status
  into v_current_status
  from public.assets a
  where a.id = p_asset_id
  for update;

  if not found then
    raise exception 'Asset not found'
      using errcode = 'P0002';
  end if;

  if v_current_status = 'retired'::public.asset_status then
    return v_current_status;
  end if;

  if exists (
    select 1
    from public.defect_reports dr
    where dr.asset_id = p_asset_id
      and dr.status = 'sent_for_repair'::public.defect_status
  ) then
    v_next_status := 'for_repair'::public.asset_status;
  elsif exists (
    select 1
    from public.defect_reports dr
    where dr.asset_id = p_asset_id
      and dr.status in ('pending'::public.defect_status, 'under_review'::public.defect_status)
  ) then
    v_next_status := 'under_review'::public.asset_status;
  elsif exists (
    select 1
    from public.bookings b
    where b.asset_id = p_asset_id
      and b.status = 'checked_out'::public.booking_status
  ) then
    v_next_status := 'checked_out'::public.asset_status;
  elsif exists (
    select 1
    from public.bookings b
    where b.asset_id = p_asset_id
      and b.status = 'approved'::public.booking_status
  ) then
    v_next_status := 'reserved'::public.asset_status;
  else
    v_next_status := 'available'::public.asset_status;
  end if;

  update public.assets
  set status = v_next_status
  where id = p_asset_id
    and status <> v_next_status
    and status <> 'retired'::public.asset_status;

  return v_next_status;
end;
$$;

create or replace function app_private.ticket_thread_instructor_id(p_thread_id uuid)
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(b.instructor_id, dr.instructor_id)
  from public.ticket_threads tt
  left join public.bookings b on b.id = tt.booking_id
  left join public.defect_reports dr on dr.id = tt.defect_report_id
  where tt.id = p_thread_id
$$;

create or replace function app_private.can_access_ticket_thread(
  p_thread_id uuid,
  p_user_id uuid
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    app_private.is_admin_user(p_user_id)
    or exists (
      select 1
      from public.ticket_threads tt
      left join public.bookings b on b.id = tt.booking_id
      left join public.defect_reports dr on dr.id = tt.defect_report_id
      where tt.id = p_thread_id
        and (b.instructor_id = p_user_id or dr.instructor_id = p_user_id)
    ),
    false
  )
$$;

create index if not exists bookings_asset_active_range_idx
  on public.bookings (asset_id, requested_start_at, requested_end_at)
  where status in ('approved'::public.booking_status, 'checked_out'::public.booking_status);

drop policy if exists "Authenticated users read active assets" on public.assets;
drop policy if exists "Admins read assets" on public.assets;
drop policy if exists "Admins manage assets" on public.assets;

create policy "Admins read assets" on public.assets
  for select
  to authenticated
  using ((select app_private.is_admin()));

create policy "Admins manage assets" on public.assets
  for all
  to authenticated
  using ((select app_private.is_admin()))
  with check ((select app_private.is_admin()));

drop policy if exists "Authenticated users resolve active QR codes" on public.asset_qr_codes;
drop policy if exists "Admins read QR codes" on public.asset_qr_codes;
drop policy if exists "Admins manage QR codes" on public.asset_qr_codes;

create policy "Admins read QR codes" on public.asset_qr_codes
  for select
  to authenticated
  using ((select app_private.is_admin()));

create policy "Admins manage QR codes" on public.asset_qr_codes
  for all
  to authenticated
  using ((select app_private.is_admin()))
  with check ((select app_private.is_admin()));

drop policy if exists "Booking participants read bookings" on public.bookings;
drop policy if exists "Booking participants read events" on public.booking_events;
drop policy if exists "Defect participants read reports" on public.defect_reports;
drop policy if exists "Defect participants read photos" on public.defect_photos;
drop policy if exists "Instructors upload own defect photos" on public.defect_photos;
drop policy if exists "Ticket participants read threads" on public.ticket_threads;
drop policy if exists "Ticket participants read messages" on public.ticket_messages;
drop policy if exists "Users read own notifications" on public.notifications;
drop policy if exists "Users mark own notifications read" on public.notifications;
drop policy if exists "Admins create notifications" on public.notifications;
drop policy if exists "Users manage own push tokens" on public.device_push_tokens;

create policy "Booking participants read bookings" on public.bookings
  for select
  to authenticated
  using (
    (select app_private.is_admin())
    or (
      instructor_id = (select auth.uid())
      and (select app_private.is_active_user(auth.uid()))
    )
  );

create policy "Booking participants read events" on public.booking_events
  for select
  to authenticated
  using (
    (select app_private.is_admin())
    or (
      (select app_private.is_active_user(auth.uid()))
      and exists (
        select 1
        from public.bookings b
        where b.id = booking_events.booking_id
          and b.instructor_id = (select auth.uid())
      )
    )
  );

create policy "Defect participants read reports" on public.defect_reports
  for select
  to authenticated
  using (
    (select app_private.is_admin())
    or (
      instructor_id = (select auth.uid())
      and (select app_private.is_active_user(auth.uid()))
    )
  );

create policy "Defect participants read photos" on public.defect_photos
  for select
  to authenticated
  using (
    (select app_private.is_admin())
    or (
      (select app_private.is_active_user(auth.uid()))
      and exists (
        select 1
        from public.defect_reports dr
        where dr.id = defect_photos.defect_report_id
          and dr.instructor_id = (select auth.uid())
      )
    )
  );

create policy "Instructors upload own defect photos" on public.defect_photos
  for insert
  to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and (select app_private.is_active_user(auth.uid()))
    and exists (
      select 1
      from public.defect_reports dr
      where dr.id = defect_photos.defect_report_id
        and dr.instructor_id = (select auth.uid())
    )
  );

create policy "Ticket participants read threads" on public.ticket_threads
  for select
  to authenticated
  using (
    (select app_private.is_admin())
    or (
      (select app_private.is_active_user(auth.uid()))
      and (
        exists (
          select 1
          from public.bookings b
          where b.id = ticket_threads.booking_id
            and b.instructor_id = (select auth.uid())
        )
        or exists (
          select 1
          from public.defect_reports dr
          where dr.id = ticket_threads.defect_report_id
            and dr.instructor_id = (select auth.uid())
        )
      )
    )
  );

create policy "Ticket participants read messages" on public.ticket_messages
  for select
  to authenticated
  using (
    (select app_private.is_admin())
    or (
      (select app_private.is_active_user(auth.uid()))
      and exists (
        select 1
        from public.ticket_threads tt
        left join public.bookings b on b.id = tt.booking_id
        left join public.defect_reports dr on dr.id = tt.defect_report_id
        where tt.id = ticket_messages.thread_id
          and (b.instructor_id = (select auth.uid()) or dr.instructor_id = (select auth.uid()))
      )
    )
  );

create policy "Users read own notifications" on public.notifications
  for select
  to authenticated
  using (
    (
      recipient_id = (select auth.uid())
      and (select app_private.is_active_user(auth.uid()))
    )
    or (select app_private.is_admin())
  );

create policy "Admins create notifications" on public.notifications
  for insert
  to authenticated
  with check ((select app_private.is_admin()));

create policy "Users manage own push tokens" on public.device_push_tokens
  for all
  to authenticated
  using (
    user_id = (select auth.uid())
    and (select app_private.is_active_user(auth.uid()))
  )
  with check (
    user_id = (select auth.uid())
    and (select app_private.is_active_user(auth.uid()))
  );

drop policy if exists "Defect photo participants can read objects" on storage.objects;
drop policy if exists "Defect photo participants can upload objects" on storage.objects;

create policy "Defect photo participants can read objects"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'defect-photos'
    and (
      (select app_private.is_admin())
      or (
        (select app_private.is_active_user(auth.uid()))
        and exists (
          select 1
          from public.defect_reports dr
          where dr.id = app_private.defect_photo_report_id(name)
            and dr.instructor_id = (select auth.uid())
        )
      )
    )
  );

create policy "Defect photo participants can upload objects"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'defect-photos'
    and (
      (select app_private.is_admin())
      or (
        (select app_private.is_active_user(auth.uid()))
        and exists (
          select 1
          from public.defect_reports dr
          where dr.id = app_private.defect_photo_report_id(name)
            and dr.instructor_id = (select auth.uid())
        )
      )
    )
  );

drop policy if exists "Instructors create own bookings" on public.bookings;
drop policy if exists "Instructors cancel own pending bookings" on public.bookings;
drop policy if exists "Admins manage bookings" on public.bookings;
drop policy if exists "Admins create bookings" on public.bookings;

drop policy if exists "Admins create booking events" on public.booking_events;

drop policy if exists "Instructors create own defect reports" on public.defect_reports;
drop policy if exists "Admins manage defect reports" on public.defect_reports;

drop policy if exists "Admins create threads" on public.ticket_threads;
drop policy if exists "Instructors create own booking threads" on public.ticket_threads;
drop policy if exists "Instructors create own defect threads" on public.ticket_threads;

drop policy if exists "Ticket participants send messages" on public.ticket_messages;

drop function if exists public.resolve_asset_by_qr_code(text);
create function public.resolve_asset_by_qr_code(p_qr_code text)
returns table (
  qr_code_id uuid,
  asset_id uuid,
  property_number text,
  serial_number text,
  name text,
  category_id uuid,
  category_name text,
  location_id uuid,
  location_name text,
  condition public.asset_condition,
  status public.asset_status,
  active_qr_code text,
  qr_generated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_qr_code text;
begin
  perform app_private.require_active_user();

  v_qr_code := nullif(btrim(p_qr_code), '');
  if v_qr_code is null then
    raise exception 'QR code is required'
      using errcode = '22023';
  end if;

  return query
    select
      aq.id,
      a.id,
      a.property_number,
      a.serial_number,
      a.name,
      ac.id,
      ac.name,
      l.id,
      l.name,
      a.condition,
      a.status,
      aq.code,
      aq.generated_at
    from public.asset_qr_codes aq
    join public.assets a on a.id = aq.asset_id
    join public.asset_categories ac on ac.id = a.category_id
    join public.locations l on l.id = a.location_id
    where aq.code = v_qr_code
      and aq.is_active = true
      and a.status <> 'retired'::public.asset_status
    limit 1;
end;
$$;

drop function if exists public.regenerate_asset_qr(uuid, text);
create function public.regenerate_asset_qr(p_asset_id uuid, p_qr_code text)
returns public.asset_qr_codes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_qr_code text;
  v_asset public.assets%rowtype;
  v_previous_qr public.asset_qr_codes%rowtype;
  v_new_qr public.asset_qr_codes%rowtype;
begin
  v_actor_id := app_private.require_admin();
  v_qr_code := nullif(btrim(p_qr_code), '');

  if v_qr_code is null then
    raise exception 'QR code is required'
      using errcode = '22023';
  end if;

  select *
  into v_asset
  from public.assets a
  where a.id = p_asset_id
  for update;

  if not found then
    raise exception 'Asset not found'
      using errcode = 'P0002';
  end if;

  if v_asset.status = 'retired'::public.asset_status then
    raise exception 'Cannot regenerate a QR code for a retired asset'
      using errcode = '23514';
  end if;

  select *
  into v_previous_qr
  from public.asset_qr_codes aq
  where aq.asset_id = p_asset_id
    and aq.is_active = true
  for update;

  if found then
    if v_previous_qr.code = v_qr_code then
      raise exception 'Replacement QR code must differ from the current active code'
        using errcode = '23505';
    end if;

    update public.asset_qr_codes
    set is_active = false,
        invalidated_at = now(),
        invalidated_by = v_actor_id
    where id = v_previous_qr.id;
  end if;

  insert into public.asset_qr_codes (asset_id, code, generated_by)
  values (p_asset_id, v_qr_code, v_actor_id)
  returning * into v_new_qr;

  perform app_private.audit_action(
    'asset_qr.regenerated',
    'asset_qr_codes',
    v_new_qr.id,
    jsonb_strip_nulls(jsonb_build_object(
      'asset_id', p_asset_id,
      'previous_qr_id', v_previous_qr.id
    ))
  );

  return v_new_qr;
end;
$$;

drop function if exists public.create_booking(uuid, timestamptz, timestamptz, text);
create function public.create_booking(
  p_asset_id uuid,
  p_requested_start_at timestamptz,
  p_requested_end_at timestamptz,
  p_purpose text
)
returns table (
  booking_id uuid,
  ticket_thread_id uuid,
  asset_id uuid,
  instructor_id uuid,
  requested_start_at timestamptz,
  requested_end_at timestamptz,
  purpose text,
  status public.booking_status,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_purpose text;
  v_asset public.assets%rowtype;
  v_booking public.bookings%rowtype;
  v_thread public.ticket_threads%rowtype;
begin
  v_actor_id := app_private.require_active_user();
  v_purpose := nullif(btrim(p_purpose), '');

  if p_requested_end_at <= p_requested_start_at then
    raise exception 'Booking end time must be after the start time'
      using errcode = '22023';
  end if;

  if v_purpose is null then
    raise exception 'Booking purpose is required'
      using errcode = '22023';
  end if;

  select *
  into v_asset
  from public.assets a
  where a.id = p_asset_id
  for update;

  if not found then
    raise exception 'Asset not found'
      using errcode = 'P0002';
  end if;

  if v_asset.status = 'retired'::public.asset_status then
    raise exception 'Cannot book a retired asset'
      using errcode = '23514';
  end if;

  if app_private.asset_has_open_defect(v_asset.id) then
    raise exception 'Cannot book an asset with an open defect report'
      using errcode = '23514';
  end if;

  insert into public.bookings (
    asset_id,
    instructor_id,
    requested_start_at,
    requested_end_at,
    purpose
  )
  values (
    p_asset_id,
    v_actor_id,
    p_requested_start_at,
    p_requested_end_at,
    v_purpose
  )
  returning * into v_booking;

  insert into public.booking_events (booking_id, actor_id, from_status, to_status, notes)
  values (v_booking.id, v_actor_id, null, 'pending'::public.booking_status, 'Booking requested');

  select *
  into v_thread
  from public.ensure_ticket_thread(
    'booking'::public.thread_subject_type,
    v_booking.id,
    null
  );

  return query
    select
      v_booking.id,
      v_thread.id,
      v_booking.asset_id,
      v_booking.instructor_id,
      v_booking.requested_start_at,
      v_booking.requested_end_at,
      v_booking.purpose,
      v_booking.status,
      v_booking.created_at,
      v_booking.updated_at;
end;
$$;

drop function if exists public.cancel_booking(uuid);
create function public.cancel_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_is_admin boolean;
  v_booking public.bookings%rowtype;
  v_from_status public.booking_status;
begin
  v_actor_id := app_private.require_active_user();
  v_is_admin := app_private.is_admin_user(v_actor_id);

  select *
  into v_booking
  from public.bookings b
  where b.id = p_booking_id
  for update;

  if not found then
    raise exception 'Booking not found'
      using errcode = 'P0002';
  end if;

  if not v_is_admin and v_booking.instructor_id <> v_actor_id then
    raise exception 'Cannot cancel another instructor''s booking'
      using errcode = '42501';
  end if;

  if not v_is_admin and v_booking.status <> 'pending'::public.booking_status then
    raise exception 'Only pending bookings can be cancelled by the instructor'
      using errcode = '23514';
  end if;

  if v_is_admin and v_booking.status not in (
    'pending'::public.booking_status,
    'approved'::public.booking_status
  ) then
    raise exception 'Only pending or approved bookings can be cancelled'
      using errcode = '23514';
  end if;

  perform 1
  from public.assets a
  where a.id = v_booking.asset_id
  for update;

  v_from_status := v_booking.status;

  update public.bookings
  set status = 'cancelled'::public.booking_status,
      decided_by = case when v_is_admin then v_actor_id else decided_by end,
      decided_at = case when v_is_admin then now() else decided_at end,
      decision_notes = case when v_is_admin then 'Cancelled by administrator' else decision_notes end
  where id = v_booking.id
  returning * into v_booking;

  insert into public.booking_events (booking_id, actor_id, from_status, to_status, notes)
  values (
    v_booking.id,
    v_actor_id,
    v_from_status,
    'cancelled'::public.booking_status,
    case when v_is_admin then 'Cancelled by administrator' else 'Cancelled by instructor' end
  );

  perform app_private.sync_asset_status(v_booking.asset_id);

  if v_is_admin then
    perform app_private.create_notification(
      v_booking.instructor_id,
      'booking_update'::public.notification_type,
      'Booking cancelled',
      'Your booking request was cancelled by an administrator.'
    );

    perform app_private.audit_action(
      'booking.cancelled',
      'bookings',
      v_booking.id,
      jsonb_build_object('from_status', v_from_status, 'to_status', v_booking.status)
    );
  end if;

  return v_booking;
end;
$$;

drop function if exists public.decide_booking(uuid, public.booking_status, text);
create function public.decide_booking(
  p_booking_id uuid,
  p_status public.booking_status,
  p_notes text
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_booking public.bookings%rowtype;
  v_asset public.assets%rowtype;
  v_notes text;
begin
  v_actor_id := app_private.require_admin();
  v_notes := nullif(btrim(p_notes), '');

  if p_status not in ('approved'::public.booking_status, 'rejected'::public.booking_status) then
    raise exception 'Booking decision must be approved or rejected'
      using errcode = '22023';
  end if;

  select *
  into v_booking
  from public.bookings b
  where b.id = p_booking_id
  for update;

  if not found then
    raise exception 'Booking not found'
      using errcode = 'P0002';
  end if;

  if v_booking.status <> 'pending'::public.booking_status then
    raise exception 'Only pending bookings can be decided'
      using errcode = '23514';
  end if;

  select *
  into v_asset
  from public.assets a
  where a.id = v_booking.asset_id
  for update;

  if not found then
    raise exception 'Asset not found'
      using errcode = 'P0002';
  end if;

  if p_status = 'approved'::public.booking_status then
    if v_asset.status = 'retired'::public.asset_status then
      raise exception 'Cannot approve a booking for a retired asset'
        using errcode = '23514';
    end if;

    if app_private.asset_has_open_defect(v_asset.id) then
      raise exception 'Cannot approve a booking while the asset has an open defect report'
        using errcode = '23514';
    end if;

    if app_private.has_booking_overlap(
      v_booking.id,
      v_booking.asset_id,
      v_booking.requested_start_at,
      v_booking.requested_end_at
    ) then
      raise exception 'Booking overlaps an approved or checked-out booking for this asset'
        using errcode = '23P01';
    end if;
  end if;

  update public.bookings
  set status = p_status,
      decided_by = v_actor_id,
      decided_at = now(),
      decision_notes = v_notes
  where id = v_booking.id
  returning * into v_booking;

  insert into public.booking_events (booking_id, actor_id, from_status, to_status, notes)
  values (v_booking.id, v_actor_id, 'pending'::public.booking_status, p_status, v_notes);

  perform app_private.sync_asset_status(v_booking.asset_id);

  perform app_private.create_notification(
    v_booking.instructor_id,
    'booking_update'::public.notification_type,
    case
      when p_status = 'approved'::public.booking_status then 'Booking approved'
      else 'Booking rejected'
    end,
    case
      when p_status = 'approved'::public.booking_status then 'Your booking request was approved.'
      else 'Your booking request was rejected.'
    end
  );

  perform app_private.audit_action(
    'booking.decided',
    'bookings',
    v_booking.id,
    jsonb_build_object('to_status', p_status, 'notes', v_notes)
  );

  return v_booking;
end;
$$;

drop function if exists public.checkout_booking(uuid, text);
create function public.checkout_booking(p_booking_id uuid, p_notes text)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_booking public.bookings%rowtype;
  v_asset public.assets%rowtype;
  v_notes text;
begin
  v_actor_id := app_private.require_admin();
  v_notes := nullif(btrim(p_notes), '');

  select *
  into v_booking
  from public.bookings b
  where b.id = p_booking_id
  for update;

  if not found then
    raise exception 'Booking not found'
      using errcode = 'P0002';
  end if;

  if v_booking.status <> 'approved'::public.booking_status then
    raise exception 'Only approved bookings can be checked out'
      using errcode = '23514';
  end if;

  select *
  into v_asset
  from public.assets a
  where a.id = v_booking.asset_id
  for update;

  if not found then
    raise exception 'Asset not found'
      using errcode = 'P0002';
  end if;

  if v_asset.status = 'retired'::public.asset_status then
    raise exception 'Cannot check out a retired asset'
      using errcode = '23514';
  end if;

  if app_private.asset_has_open_defect(v_asset.id) then
    raise exception 'Cannot check out an asset with an open defect report'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.bookings b
    where b.id <> v_booking.id
      and b.asset_id = v_booking.asset_id
      and b.status = 'checked_out'::public.booking_status
  ) then
    raise exception 'Asset is already checked out'
      using errcode = '23514';
  end if;

  if app_private.has_booking_overlap(
    v_booking.id,
    v_booking.asset_id,
    v_booking.requested_start_at,
    v_booking.requested_end_at
  ) then
    raise exception 'Booking overlaps another approved or checked-out booking for this asset'
      using errcode = '23P01';
  end if;

  update public.bookings
  set status = 'checked_out'::public.booking_status
  where id = v_booking.id
  returning * into v_booking;

  insert into public.booking_events (booking_id, actor_id, from_status, to_status, notes)
  values (
    v_booking.id,
    v_actor_id,
    'approved'::public.booking_status,
    'checked_out'::public.booking_status,
    v_notes
  );

  perform app_private.sync_asset_status(v_booking.asset_id);

  perform app_private.create_notification(
    v_booking.instructor_id,
    'booking_update'::public.notification_type,
    'Booking checked out',
    'Your booking was checked out by an administrator.'
  );

  perform app_private.audit_action(
    'booking.checked_out',
    'bookings',
    v_booking.id,
    jsonb_build_object('notes', v_notes)
  );

  return v_booking;
end;
$$;

drop function if exists public.return_booking(uuid, text);
create function public.return_booking(p_booking_id uuid, p_notes text)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_booking public.bookings%rowtype;
  v_notes text;
begin
  v_actor_id := app_private.require_admin();
  v_notes := nullif(btrim(p_notes), '');

  select *
  into v_booking
  from public.bookings b
  where b.id = p_booking_id
  for update;

  if not found then
    raise exception 'Booking not found'
      using errcode = 'P0002';
  end if;

  if v_booking.status <> 'checked_out'::public.booking_status then
    raise exception 'Only checked-out bookings can be returned'
      using errcode = '23514';
  end if;

  perform 1
  from public.assets a
  where a.id = v_booking.asset_id
  for update;

  update public.bookings
  set status = 'returned'::public.booking_status
  where id = v_booking.id
  returning * into v_booking;

  insert into public.booking_events (booking_id, actor_id, from_status, to_status, notes)
  values (
    v_booking.id,
    v_actor_id,
    'checked_out'::public.booking_status,
    'returned'::public.booking_status,
    v_notes
  );

  perform app_private.sync_asset_status(v_booking.asset_id);

  perform app_private.create_notification(
    v_booking.instructor_id,
    'booking_update'::public.notification_type,
    'Booking returned',
    'Your checked-out booking was marked as returned.'
  );

  perform app_private.audit_action(
    'booking.returned',
    'bookings',
    v_booking.id,
    jsonb_build_object('notes', v_notes)
  );

  return v_booking;
end;
$$;

drop function if exists public.ensure_ticket_thread(public.thread_subject_type, uuid, uuid);
create function public.ensure_ticket_thread(
  p_subject_type public.thread_subject_type,
  p_booking_id uuid,
  p_defect_report_id uuid
)
returns public.ticket_threads
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_is_admin boolean;
  v_booking public.bookings%rowtype;
  v_defect_report public.defect_reports%rowtype;
  v_thread public.ticket_threads%rowtype;
begin
  v_actor_id := app_private.require_active_user();
  v_is_admin := app_private.is_admin_user(v_actor_id);

  if p_subject_type = 'booking'::public.thread_subject_type then
    if p_booking_id is null or p_defect_report_id is not null then
      raise exception 'Booking ticket threads require only booking_id'
        using errcode = '22023';
    end if;

    select *
    into v_booking
    from public.bookings b
    where b.id = p_booking_id;

    if not found then
      raise exception 'Booking not found'
        using errcode = 'P0002';
    end if;

    if not v_is_admin and v_booking.instructor_id <> v_actor_id then
      raise exception 'Cannot access this booking ticket thread'
        using errcode = '42501';
    end if;

    insert into public.ticket_threads (subject_type, booking_id)
    values ('booking'::public.thread_subject_type, p_booking_id)
    on conflict do nothing;

    select *
    into v_thread
    from public.ticket_threads tt
    where tt.subject_type = 'booking'::public.thread_subject_type
      and tt.booking_id = p_booking_id;

    return v_thread;
  elsif p_subject_type = 'defect_report'::public.thread_subject_type then
    if p_defect_report_id is null or p_booking_id is not null then
      raise exception 'Defect ticket threads require only defect_report_id'
        using errcode = '22023';
    end if;

    select *
    into v_defect_report
    from public.defect_reports dr
    where dr.id = p_defect_report_id;

    if not found then
      raise exception 'Defect report not found'
        using errcode = 'P0002';
    end if;

    if not v_is_admin and v_defect_report.instructor_id <> v_actor_id then
      raise exception 'Cannot access this defect ticket thread'
        using errcode = '42501';
    end if;

    insert into public.ticket_threads (subject_type, defect_report_id)
    values ('defect_report'::public.thread_subject_type, p_defect_report_id)
    on conflict do nothing;

    select *
    into v_thread
    from public.ticket_threads tt
    where tt.subject_type = 'defect_report'::public.thread_subject_type
      and tt.defect_report_id = p_defect_report_id;

    return v_thread;
  end if;

  raise exception 'Unsupported ticket subject type'
    using errcode = '22023';
end;
$$;

drop function if exists public.send_ticket_message(uuid, text);
create function public.send_ticket_message(p_thread_id uuid, p_body text)
returns public.ticket_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_is_admin boolean;
  v_body text;
  v_thread public.ticket_threads%rowtype;
  v_message public.ticket_messages%rowtype;
  v_instructor_id uuid;
begin
  v_actor_id := app_private.require_active_user();
  v_is_admin := app_private.is_admin_user(v_actor_id);
  v_body := nullif(btrim(p_body), '');

  if v_body is null then
    raise exception 'Ticket message body is required'
      using errcode = '22023';
  end if;

  select *
  into v_thread
  from public.ticket_threads tt
  where tt.id = p_thread_id;

  if not found then
    raise exception 'Ticket thread not found'
      using errcode = 'P0002';
  end if;

  if not app_private.can_access_ticket_thread(p_thread_id, v_actor_id) then
    raise exception 'Cannot access this ticket thread'
      using errcode = '42501';
  end if;

  insert into public.ticket_messages (thread_id, sender_id, body)
  values (p_thread_id, v_actor_id, v_body)
  returning * into v_message;

  v_instructor_id := app_private.ticket_thread_instructor_id(p_thread_id);

  if v_is_admin and v_instructor_id is not null and v_instructor_id <> v_actor_id then
    perform app_private.create_notification(
      v_instructor_id,
      'ticket_message'::public.notification_type,
      'New ticket message',
      'An administrator sent a ticket message.'
    );
  elsif not v_is_admin then
    insert into public.notifications (recipient_id, type, title, body)
    select
      p.id,
      'ticket_message'::public.notification_type,
      'New ticket message',
      'An instructor sent a ticket message.'
    from public.profiles p
    where p.is_active = true
      and p.role in ('admin'::public.user_role, 'super_admin'::public.user_role);
  end if;

  return v_message;
end;
$$;

drop function if exists public.mark_notification_read(uuid);
create function public.mark_notification_read(p_notification_id uuid)
returns public.notifications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_notification public.notifications%rowtype;
begin
  v_actor_id := app_private.require_active_user();

  update public.notifications
  set read_at = coalesce(read_at, now())
  where id = p_notification_id
    and recipient_id = v_actor_id
  returning * into v_notification;

  if not found then
    raise exception 'Notification not found'
      using errcode = 'P0002';
  end if;

  return v_notification;
end;
$$;

drop function if exists public.create_defect_report(uuid, text, text);
create function public.create_defect_report(
  p_asset_id uuid,
  p_title text,
  p_description text
)
returns table (
  defect_report_id uuid,
  ticket_thread_id uuid,
  asset_id uuid,
  instructor_id uuid,
  title text,
  description text,
  status public.defect_status,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_is_admin boolean;
  v_title text;
  v_description text;
  v_asset public.assets%rowtype;
  v_report public.defect_reports%rowtype;
  v_thread public.ticket_threads%rowtype;
begin
  v_actor_id := app_private.require_active_user();
  v_is_admin := app_private.is_admin_user(v_actor_id);
  v_title := nullif(btrim(p_title), '');
  v_description := nullif(btrim(p_description), '');

  if v_title is null then
    raise exception 'Defect title is required'
      using errcode = '22023';
  end if;

  if v_description is null then
    raise exception 'Defect description is required'
      using errcode = '22023';
  end if;

  select *
  into v_asset
  from public.assets a
  where a.id = p_asset_id
  for update;

  if not found then
    raise exception 'Asset not found'
      using errcode = 'P0002';
  end if;

  if v_asset.status = 'retired'::public.asset_status then
    raise exception 'Cannot report a defect for a retired asset'
      using errcode = '23514';
  end if;

  insert into public.defect_reports (asset_id, instructor_id, title, description)
  values (p_asset_id, v_actor_id, v_title, v_description)
  returning * into v_report;

  perform app_private.sync_asset_status(p_asset_id);

  select *
  into v_thread
  from public.ensure_ticket_thread(
    'defect_report'::public.thread_subject_type,
    null,
    v_report.id
  );

  if v_is_admin then
    perform app_private.audit_action(
      'defect_report.created',
      'defect_reports',
      v_report.id,
      jsonb_build_object('asset_id', p_asset_id)
    );
  end if;

  return query
    select
      v_report.id,
      v_thread.id,
      v_report.asset_id,
      v_report.instructor_id,
      v_report.title,
      v_report.description,
      v_report.status,
      v_report.created_at,
      v_report.updated_at;
end;
$$;

drop function if exists public.triage_defect_report(uuid, public.defect_status, text);
create function public.triage_defect_report(
  p_defect_report_id uuid,
  p_status public.defect_status,
  p_notes text
)
returns table (
  defect_report_id uuid,
  ticket_thread_id uuid,
  asset_id uuid,
  instructor_id uuid,
  title text,
  description text,
  status public.defect_status,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_report public.defect_reports%rowtype;
  v_thread public.ticket_threads%rowtype;
  v_notes text;
  v_transition_allowed boolean;
begin
  v_actor_id := app_private.require_admin();
  v_notes := nullif(btrim(p_notes), '');

  if p_status = 'pending'::public.defect_status then
    raise exception 'Defect reports cannot be triaged back to pending'
      using errcode = '22023';
  end if;

  select *
  into v_report
  from public.defect_reports dr
  where dr.id = p_defect_report_id
  for update;

  if not found then
    raise exception 'Defect report not found'
      using errcode = 'P0002';
  end if;

  perform 1
  from public.assets a
  where a.id = v_report.asset_id
  for update;

  v_transition_allowed :=
    case v_report.status
      when 'pending'::public.defect_status then
        p_status in (
          'under_review'::public.defect_status,
          'sent_for_repair'::public.defect_status,
          'resolved'::public.defect_status,
          'rejected'::public.defect_status
        )
      when 'under_review'::public.defect_status then
        p_status in (
          'sent_for_repair'::public.defect_status,
          'resolved'::public.defect_status,
          'rejected'::public.defect_status
        )
      when 'sent_for_repair'::public.defect_status then
        p_status in (
          'resolved'::public.defect_status,
          'rejected'::public.defect_status
        )
      else false
    end;

  if not v_transition_allowed then
    raise exception 'Invalid defect report status transition'
      using errcode = '23514';
  end if;

  update public.defect_reports
  set status = p_status,
      triaged_by = v_actor_id,
      triaged_at = now(),
      resolution_notes = v_notes
  where id = v_report.id
  returning * into v_report;

  perform app_private.sync_asset_status(v_report.asset_id);

  select *
  into v_thread
  from public.ensure_ticket_thread(
    'defect_report'::public.thread_subject_type,
    null,
    v_report.id
  );

  perform app_private.create_notification(
    v_report.instructor_id,
    'defect_update'::public.notification_type,
    'Defect report updated',
    'Your defect report status was updated to ' || replace(p_status::text, '_', ' ') || '.'
  );

  perform app_private.audit_action(
    'defect_report.triaged',
    'defect_reports',
    v_report.id,
    jsonb_build_object('to_status', p_status, 'notes', v_notes)
  );

  return query
    select
      v_report.id,
      v_thread.id,
      v_report.asset_id,
      v_report.instructor_id,
      v_report.title,
      v_report.description,
      v_report.status,
      v_report.created_at,
      v_report.updated_at;
end;
$$;

revoke all on function public.resolve_asset_by_qr_code(text) from public, anon;
grant execute on function public.resolve_asset_by_qr_code(text) to authenticated;

revoke all on function public.regenerate_asset_qr(uuid, text) from public, anon;
grant execute on function public.regenerate_asset_qr(uuid, text) to authenticated;

revoke all on function public.create_booking(uuid, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.create_booking(uuid, timestamptz, timestamptz, text) to authenticated;

revoke all on function public.cancel_booking(uuid) from public, anon;
grant execute on function public.cancel_booking(uuid) to authenticated;

revoke all on function public.decide_booking(uuid, public.booking_status, text) from public, anon;
grant execute on function public.decide_booking(uuid, public.booking_status, text) to authenticated;

revoke all on function public.checkout_booking(uuid, text) from public, anon;
grant execute on function public.checkout_booking(uuid, text) to authenticated;

revoke all on function public.return_booking(uuid, text) from public, anon;
grant execute on function public.return_booking(uuid, text) to authenticated;

revoke all on function public.ensure_ticket_thread(public.thread_subject_type, uuid, uuid) from public, anon;
grant execute on function public.ensure_ticket_thread(public.thread_subject_type, uuid, uuid) to authenticated;

revoke all on function public.send_ticket_message(uuid, text) from public, anon;
grant execute on function public.send_ticket_message(uuid, text) to authenticated;

revoke all on function public.mark_notification_read(uuid) from public, anon;
grant execute on function public.mark_notification_read(uuid) to authenticated;

revoke all on function public.create_defect_report(uuid, text, text) from public, anon;
grant execute on function public.create_defect_report(uuid, text, text) to authenticated;

revoke all on function public.triage_defect_report(uuid, public.defect_status, text) from public, anon;
grant execute on function public.triage_defect_report(uuid, public.defect_status, text) to authenticated;
