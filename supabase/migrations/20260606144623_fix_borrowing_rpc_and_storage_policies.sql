create or replace function public.create_borrowing(
  p_resource_type public.borrowing_resource_type,
  p_resource_id uuid,
  p_requested_start_at timestamptz,
  p_requested_end_at timestamptz,
  p_purpose text
)
returns table (
  id uuid,
  resource_type public.borrowing_resource_type,
  asset_id uuid,
  room_id uuid,
  borrower_id uuid,
  borrower_name text,
  borrower_email text,
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
  v_booking public.bookings%rowtype;
  v_profile public.profiles%rowtype;
  v_conflict text;
begin
  v_actor_id := app_private.require_active_user();
  v_purpose := nullif(btrim(p_purpose), '');

  if p_requested_start_at <= now() then
    raise exception 'Borrow start time must be later than now' using errcode = '22023';
  end if;

  if p_requested_end_at <= p_requested_start_at then
    raise exception 'Borrow end time must be after the start time' using errcode = '22023';
  end if;

  if extract(epoch from (p_requested_end_at - p_requested_start_at)) / 60 not between 90 and 180 then
    raise exception 'Borrowing duration must be between 90 and 180 minutes' using errcode = '22023';
  end if;

  if v_purpose is null then
    raise exception 'Borrowing purpose is required' using errcode = '22023';
  end if;

  if p_resource_type = 'asset'::public.borrowing_resource_type then
    if not exists (
      select 1
      from public.assets a
      where a.id = p_resource_id
        and a.is_active = true
        and a.archived_at is null
        and a.status <> 'retired'::public.asset_status
    ) then
      raise exception 'Asset is not borrowable' using errcode = '23514';
    end if;
  else
    if not exists (
      select 1
      from public.locations l
      where l.id = p_resource_id
        and l.is_reservable = true
    ) then
      raise exception 'Room is not borrowable' using errcode = '23514';
    end if;
  end if;

  perform app_private.lock_borrowing_scope(p_resource_type, p_resource_id);

  v_conflict := app_private.borrowing_conflict_state(p_resource_type, p_resource_id, p_requested_start_at, p_requested_end_at, null);
  if v_conflict = 'busy' then
    raise exception 'Borrowing overlaps an approved or checked-out borrowing' using errcode = '23P01';
  end if;

  insert into public.bookings (
    resource_type,
    asset_id,
    location_id,
    instructor_id,
    requested_start_at,
    requested_end_at,
    purpose
  )
  values (
    p_resource_type,
    case when p_resource_type = 'asset'::public.borrowing_resource_type then p_resource_id else null end,
    case when p_resource_type = 'room'::public.borrowing_resource_type then p_resource_id else null end,
    v_actor_id,
    p_requested_start_at,
    p_requested_end_at,
    v_purpose
  )
  returning * into v_booking;

  insert into public.booking_events (booking_id, actor_id, from_status, to_status, notes)
  values (v_booking.id, v_actor_id, null, 'pending'::public.booking_status, 'Borrowing requested');

  perform public.ensure_ticket_thread('booking'::public.thread_subject_type, v_booking.id, null);

  select p.*
  into v_profile
  from public.profiles p
  where p.id = v_actor_id;

  return query
    select
      v_booking.id,
      v_booking.resource_type,
      v_booking.asset_id,
      v_booking.location_id,
      v_booking.instructor_id,
      v_profile.full_name,
      v_profile.email,
      v_booking.requested_start_at,
      v_booking.requested_end_at,
      v_booking.purpose,
      v_booking.status,
      v_booking.created_at,
      v_booking.updated_at;
end;
$$;

revoke all on function public.create_borrowing(public.borrowing_resource_type, uuid, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.create_borrowing(public.borrowing_resource_type, uuid, timestamptz, timestamptz, text) to authenticated;

create or replace function public.cancel_borrowing(p_borrowing_id uuid)
returns table (
  id uuid,
  resource_type public.borrowing_resource_type,
  asset_id uuid,
  room_id uuid,
  borrower_id uuid,
  borrower_name text,
  borrower_email text,
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
  v_is_admin boolean;
  v_booking public.bookings%rowtype;
  v_from_status public.booking_status;
begin
  v_actor_id := app_private.require_active_user();
  v_is_admin := app_private.is_admin_user(v_actor_id);

  select b.*
  into v_booking
  from public.bookings b
  where b.id = p_borrowing_id
  for update;

  if not found then
    raise exception 'Borrowing not found' using errcode = 'P0002';
  end if;

  if not v_is_admin and v_booking.instructor_id <> v_actor_id then
    raise exception 'Cannot cancel another borrower''s request' using errcode = '42501';
  end if;

  if not v_is_admin and v_booking.status <> 'pending'::public.booking_status then
    raise exception 'Only pending borrowing requests can be cancelled by the borrower' using errcode = '23514';
  end if;

  if v_is_admin and v_booking.status not in ('pending'::public.booking_status, 'approved'::public.booking_status) then
    raise exception 'Only pending or approved borrowing requests can be cancelled' using errcode = '23514';
  end if;

  perform app_private.lock_borrowing_scope(v_booking.resource_type, coalesce(v_booking.asset_id, v_booking.location_id));

  v_from_status := v_booking.status;

  update public.bookings b
  set status = 'cancelled'::public.booking_status,
      decided_by = case when v_is_admin then v_actor_id else b.decided_by end,
      decided_at = case when v_is_admin then now() else b.decided_at end,
      decision_notes = case when v_is_admin then 'Cancelled by custodian' else b.decision_notes end
  where b.id = v_booking.id
  returning b.* into v_booking;

  insert into public.booking_events (booking_id, actor_id, from_status, to_status, notes)
  values (
    v_booking.id,
    v_actor_id,
    v_from_status,
    'cancelled'::public.booking_status,
    case when v_is_admin then 'Cancelled by custodian' else 'Cancelled by borrower' end
  );

  if v_booking.asset_id is not null then
    perform app_private.sync_asset_status(v_booking.asset_id);
  end if;

  if v_is_admin then
    perform app_private.create_notification(
      v_booking.instructor_id,
      'booking_update'::public.notification_type,
      'Borrowing cancelled',
      'Your borrowing request was cancelled by a custodian.'
    );

    perform app_private.audit_action(
      'borrowing.cancelled',
      'bookings',
      v_booking.id,
      jsonb_build_object('from_status', v_from_status, 'to_status', v_booking.status)
    );
  end if;

  return query select * from app_private.return_borrowing_row(p_borrowing_id);
end;
$$;

revoke all on function public.cancel_borrowing(uuid) from public, anon;
grant execute on function public.cancel_borrowing(uuid) to authenticated;

create or replace function public.checkout_borrowing_by_qr(
  p_qr_code text,
  p_borrowing_id uuid,
  p_notes text
)
returns table (
  id uuid,
  resource_type public.borrowing_resource_type,
  asset_id uuid,
  room_id uuid,
  borrower_id uuid,
  borrower_name text,
  borrower_email text,
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
  v_qr_code text;
  v_asset public.assets%rowtype;
  v_booking public.bookings%rowtype;
  v_priority_id uuid;
  v_conflict text;
  v_notes text;
  v_now timestamptz;
begin
  v_actor_id := app_private.require_active_user();
  v_qr_code := nullif(btrim(p_qr_code), '');
  v_notes := nullif(btrim(p_notes), '');
  v_now := now();

  if v_qr_code is null then
    raise exception 'QR code is required' using errcode = '22023';
  end if;

  select a.*
  into v_asset
  from public.asset_qr_codes aq
  join public.assets a on a.id = aq.asset_id
  where aq.code = v_qr_code
    and aq.is_active = true
    and aq.invalidated_at is null
  for update of a;

  if not found then
    raise exception 'Asset QR code is inactive or invalid' using errcode = 'P0002';
  end if;

  select b.*
  into v_booking
  from public.bookings b
  where b.id = p_borrowing_id
  for update;

  if not found then
    raise exception 'Borrowing not found' using errcode = 'P0002';
  end if;

  if v_booking.instructor_id <> v_actor_id then
    raise exception 'Cannot check out another borrower''s reservation' using errcode = '42501';
  end if;

  if coalesce(v_booking.resource_type, 'asset'::public.borrowing_resource_type) <> 'asset'::public.borrowing_resource_type
    or v_booking.asset_id <> v_asset.id then
    raise exception 'Scanned QR code does not match this borrowing' using errcode = '23514';
  end if;

  if v_booking.status <> 'approved'::public.booking_status then
    raise exception 'Only approved borrowings can be checked out by QR scan' using errcode = '23514';
  end if;

  if v_asset.is_active = false or v_asset.archived_at is not null or v_asset.status = 'retired'::public.asset_status then
    raise exception 'This asset is not available for borrower pickup' using errcode = '23514';
  end if;

  if app_private.asset_has_open_defect(v_asset.id) then
    raise exception 'Cannot check out an asset with an open defect report' using errcode = '23514';
  end if;

  if v_now < v_booking.requested_start_at - interval '15 minutes' then
    raise exception 'Pickup opens 15 minutes before the reserved start time' using errcode = '23514';
  end if;

  if v_now > v_booking.requested_end_at then
    raise exception 'The pickup window for this reservation has passed' using errcode = '23514';
  end if;

  perform app_private.lock_borrowing_scope('asset'::public.borrowing_resource_type, v_asset.id);

  v_priority_id := app_private.first_priority_borrowing_id(
    'asset'::public.borrowing_resource_type,
    v_asset.id,
    v_booking.requested_start_at,
    v_booking.requested_end_at
  );

  if v_priority_id is not null and v_priority_id <> v_booking.id then
    raise exception 'This asset is reserved by an earlier borrowing request' using errcode = '23P01';
  end if;

  v_conflict := app_private.borrowing_conflict_state(
    'asset'::public.borrowing_resource_type,
    v_asset.id,
    v_booking.requested_start_at,
    v_booking.requested_end_at,
    v_booking.id
  );

  if v_conflict = 'busy' then
    raise exception 'Borrowing overlaps another approved or checked-out borrowing' using errcode = '23P01';
  end if;

  update public.bookings b
  set status = 'checked_out'::public.booking_status
  where b.id = v_booking.id
  returning b.* into v_booking;

  insert into public.booking_events (booking_id, actor_id, from_status, to_status, notes)
  values (
    v_booking.id,
    v_actor_id,
    'approved'::public.booking_status,
    'checked_out'::public.booking_status,
    coalesce(v_notes, 'Checked out by borrower QR scan.')
  );

  perform app_private.sync_asset_status(v_asset.id);

  perform app_private.create_notification(
    v_booking.instructor_id,
    'booking_update'::public.notification_type,
    'Borrowing checked out',
    'Your borrowing was checked out by QR scan.'
  );

  perform app_private.audit_action(
    'borrowing.checked_out_by_qr',
    'bookings',
    v_booking.id,
    jsonb_build_object('asset_id', v_asset.id, 'notes', v_notes)
  );

  return query select * from app_private.return_borrowing_row(v_booking.id);
end;
$$;

revoke all on function public.checkout_borrowing_by_qr(text, uuid, text) from public, anon;
grant execute on function public.checkout_borrowing_by_qr(text, uuid, text) to authenticated;

create or replace function public.checkout_borrowing(p_borrowing_id uuid, p_notes text)
returns table (
  id uuid,
  resource_type public.borrowing_resource_type,
  asset_id uuid,
  room_id uuid,
  borrower_id uuid,
  borrower_name text,
  borrower_email text,
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
  v_booking public.bookings%rowtype;
  v_actor_id uuid;
  v_notes text;
  v_resource_id uuid;
  v_priority_id uuid;
begin
  v_actor_id := app_private.require_admin();
  v_notes := nullif(btrim(p_notes), '');

  select b.*
  into v_booking
  from public.bookings b
  where b.id = p_borrowing_id
  for update;

  if not found then raise exception 'Borrowing not found' using errcode = 'P0002'; end if;
  if v_booking.status <> 'approved'::public.booking_status then raise exception 'Only approved borrowings can be checked out' using errcode = '23514'; end if;

  v_resource_id := coalesce(v_booking.asset_id, v_booking.location_id);
  perform app_private.lock_borrowing_scope(v_booking.resource_type, v_resource_id);

  v_priority_id := app_private.first_priority_borrowing_id(
    v_booking.resource_type,
    v_resource_id,
    v_booking.requested_start_at,
    v_booking.requested_end_at
  );

  if v_priority_id is not null and v_priority_id <> v_booking.id then
    raise exception 'An earlier reservation has priority for this resource' using errcode = '23P01';
  end if;

  if app_private.borrowing_conflict_state(v_booking.resource_type, v_resource_id, v_booking.requested_start_at, v_booking.requested_end_at, v_booking.id) = 'busy' then
    raise exception 'Borrowing overlaps another approved or checked-out borrowing' using errcode = '23P01';
  end if;

  update public.bookings b
  set status = 'checked_out'::public.booking_status
  where b.id = v_booking.id
  returning b.* into v_booking;

  insert into public.booking_events (booking_id, actor_id, from_status, to_status, notes)
  values (v_booking.id, v_actor_id, 'approved'::public.booking_status, 'checked_out'::public.booking_status, v_notes);

  if v_booking.asset_id is not null then
    perform app_private.sync_asset_status(v_booking.asset_id);
  end if;

  perform app_private.create_notification(v_booking.instructor_id, 'booking_update'::public.notification_type, 'Borrowing checked out', 'Your borrowing was checked out by a custodian.');
  perform app_private.audit_action('borrowing.checked_out', 'bookings', v_booking.id, jsonb_build_object('notes', v_notes));

  return query select * from app_private.return_borrowing_row(p_borrowing_id);
end;
$$;

revoke all on function public.checkout_borrowing(uuid, text) from public, anon;
grant execute on function public.checkout_borrowing(uuid, text) to authenticated;

create or replace function public.return_borrowing(p_borrowing_id uuid, p_notes text)
returns table (
  id uuid,
  resource_type public.borrowing_resource_type,
  asset_id uuid,
  room_id uuid,
  borrower_id uuid,
  borrower_name text,
  borrower_email text,
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
  v_booking public.bookings%rowtype;
  v_actor_id uuid;
  v_notes text;
begin
  v_actor_id := app_private.require_admin();
  v_notes := nullif(btrim(p_notes), '');

  select b.*
  into v_booking
  from public.bookings b
  where b.id = p_borrowing_id
  for update;

  if not found then raise exception 'Borrowing not found' using errcode = 'P0002'; end if;
  if v_booking.status <> 'checked_out'::public.booking_status then raise exception 'Only checked-out borrowings can be returned' using errcode = '23514'; end if;

  update public.bookings b
  set status = 'returned'::public.booking_status
  where b.id = v_booking.id
  returning b.* into v_booking;

  insert into public.booking_events (booking_id, actor_id, from_status, to_status, notes)
  values (v_booking.id, v_actor_id, 'checked_out'::public.booking_status, 'returned'::public.booking_status, v_notes);

  if v_booking.asset_id is not null then
    perform app_private.sync_asset_status(v_booking.asset_id);
  end if;

  perform app_private.create_notification(v_booking.instructor_id, 'booking_update'::public.notification_type, 'Borrowing returned', 'Your borrowing was marked returned by a custodian.');
  perform app_private.audit_action('borrowing.returned', 'bookings', v_booking.id, jsonb_build_object('notes', v_notes));

  return query select * from app_private.return_borrowing_row(p_borrowing_id);
end;
$$;

revoke all on function public.return_borrowing(uuid, text) from public, anon;
grant execute on function public.return_borrowing(uuid, text) to authenticated;

drop policy if exists "Users read asset image objects" on storage.objects;

create policy "Users read asset image objects"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'asset-images'
    and (
      (select app_private.is_admin())
      or exists (
        select 1
        from public.asset_images ai
        join public.assets a on a.id = ai.asset_id
        where ai.storage_path = storage.objects.name
          and a.is_active = true
          and a.archived_at is null
          and a.status <> 'retired'::public.asset_status
      )
    )
  );

drop policy if exists "Defect photo participants can read objects" on storage.objects;
drop policy if exists "Defect photo participants can delete objects" on storage.objects;
drop policy if exists "Defect photo owners and admins delete objects" on storage.objects;

create policy "Defect photo participants can read objects"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'defect-photos'
    and (
      (select app_private.is_admin())
      or owner_id = (select auth.uid())::text
      or (
        (select app_private.is_active_user(auth.uid()))
        and exists (
          select 1
          from public.defect_reports dr
          where dr.id = app_private.defect_photo_report_id(storage.objects.name)
            and dr.instructor_id = (select auth.uid())
        )
      )
    )
  );

create policy "Defect photo owners and admins delete objects"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'defect-photos'
    and (
      (select app_private.is_admin())
      or owner_id = (select auth.uid())::text
    )
  );

notify pgrst, 'reload schema';
