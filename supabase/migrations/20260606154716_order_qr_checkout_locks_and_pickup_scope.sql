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
    or v_booking.asset_id is null then
    raise exception 'Only asset borrowings can be checked out by QR scan' using errcode = '23514';
  end if;

  if v_booking.status <> 'approved'::public.booking_status then
    raise exception 'Only approved borrowings can be checked out by QR scan' using errcode = '23514';
  end if;

  perform app_private.lock_borrowing_scope('asset'::public.borrowing_resource_type, v_booking.asset_id);

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

  if v_booking.asset_id <> v_asset.id then
    raise exception 'Scanned QR code does not match this borrowing' using errcode = '23514';
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

create or replace function public.get_borrower_qr_pickup(p_qr_code text)
returns table (
  state text,
  borrowing_id uuid,
  asset_id uuid,
  borrower_id uuid,
  borrower_name text,
  borrower_email text,
  status public.booking_status,
  requested_start_at timestamptz,
  requested_end_at timestamptz,
  purpose text,
  message text
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_actor_id uuid;
  v_qr_code text;
  v_asset public.assets%rowtype;
  v_own_booking public.bookings%rowtype;
  v_priority_booking public.bookings%rowtype;
  v_priority_id uuid;
  v_blocking_booking public.bookings%rowtype;
  v_now timestamptz;
begin
  v_actor_id := app_private.require_active_user();
  v_qr_code := nullif(btrim(p_qr_code), '');
  v_now := now();

  if v_qr_code is null then
    return query select
      'unavailable'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::public.booking_status,
      null::timestamptz,
      null::timestamptz,
      null::text,
      'Scan a valid LABTRACK asset QR code.'::text;
    return;
  end if;

  select a.*
  into v_asset
  from public.asset_qr_codes aq
  join public.assets a on a.id = aq.asset_id
  where aq.code = v_qr_code
    and aq.is_active = true
    and aq.invalidated_at is null;

  if not found then
    return query select
      'unavailable'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::public.booking_status,
      null::timestamptz,
      null::timestamptz,
      null::text,
      'This QR code is inactive, regenerated, or outside the asset register.'::text;
    return;
  end if;

  if v_asset.is_active = false or v_asset.archived_at is not null or v_asset.status = 'retired'::public.asset_status then
    return query select
      'unavailable'::text,
      null::uuid,
      v_asset.id,
      null::uuid,
      null::text,
      null::text,
      null::public.booking_status,
      null::timestamptz,
      null::timestamptz,
      null::text,
      'This asset is not available for borrower pickup.'::text;
    return;
  end if;

  if app_private.asset_has_open_defect(v_asset.id) then
    return query select
      'unavailable'::text,
      null::uuid,
      v_asset.id,
      null::uuid,
      null::text,
      null::text,
      null::public.booking_status,
      null::timestamptz,
      null::timestamptz,
      null::text,
      'This asset has an open defect report and cannot be checked out.'::text;
    return;
  end if;

  select *
  into v_own_booking
  from public.bookings b
  where b.asset_id = v_asset.id
    and coalesce(b.resource_type, 'asset'::public.borrowing_resource_type) = 'asset'::public.borrowing_resource_type
    and b.instructor_id = v_actor_id
    and b.status in ('pending'::public.booking_status, 'approved'::public.booking_status, 'checked_out'::public.booking_status)
    and b.requested_end_at >= v_now
  order by
    case b.status
      when 'checked_out'::public.booking_status then 0
      when 'approved'::public.booking_status then 1
      else 2
    end,
    b.requested_start_at,
    b.created_at,
    b.id
  limit 1;

  if found then
    v_priority_id := app_private.first_priority_borrowing_id(
      coalesce(v_own_booking.resource_type, 'asset'::public.borrowing_resource_type),
      coalesce(v_own_booking.asset_id, v_own_booking.location_id),
      v_own_booking.requested_start_at,
      v_own_booking.requested_end_at
    );

    if v_priority_id is not null and v_priority_id <> v_own_booking.id then
      select * into v_priority_booking from public.bookings where id = v_priority_id;

      if found
        and coalesce(v_priority_booking.resource_type, 'asset'::public.borrowing_resource_type) = 'asset'::public.borrowing_resource_type
        and v_priority_booking.asset_id = v_asset.id
        and v_priority_booking.instructor_id = v_actor_id then
        v_own_booking := v_priority_booking;
      else
        return query select
          'reserved_by_other'::text,
          null::uuid,
          v_asset.id,
          null::uuid,
          null::text,
          null::text,
          v_priority_booking.status,
          v_priority_booking.requested_start_at,
          v_priority_booking.requested_end_at,
          'Reserved'::text,
          'This asset is reserved by an earlier request and cannot be checked out by QR scan.'::text;
        return;
      end if;
    end if;

    if v_own_booking.status = 'checked_out'::public.booking_status then
      return query
        select
          'already_checked_out'::text,
          v_own_booking.id,
          v_asset.id,
          p.id,
          p.full_name,
          p.email,
          v_own_booking.status,
          v_own_booking.requested_start_at,
          v_own_booking.requested_end_at,
          v_own_booking.purpose,
          'This borrowing is already checked out.'::text
        from public.profiles p
        where p.id = v_own_booking.instructor_id;
      return;
    end if;

    if v_own_booking.status = 'pending'::public.booking_status then
      return query
        select
          'waiting_approval'::text,
          v_own_booking.id,
          v_asset.id,
          p.id,
          p.full_name,
          p.email,
          v_own_booking.status,
          v_own_booking.requested_start_at,
          v_own_booking.requested_end_at,
          v_own_booking.purpose,
          'Your reservation is still waiting for custodian approval.'::text
        from public.profiles p
        where p.id = v_own_booking.instructor_id;
      return;
    end if;

    if v_now < v_own_booking.requested_start_at - interval '15 minutes' then
      return query
        select
          'not_ready'::text,
          v_own_booking.id,
          v_asset.id,
          p.id,
          p.full_name,
          p.email,
          v_own_booking.status,
          v_own_booking.requested_start_at,
          v_own_booking.requested_end_at,
          v_own_booking.purpose,
          'Pickup opens 15 minutes before your reserved start time.'::text
        from public.profiles p
        where p.id = v_own_booking.instructor_id;
      return;
    end if;

    if v_now > v_own_booking.requested_end_at then
      return query
        select
          'not_ready'::text,
          v_own_booking.id,
          v_asset.id,
          p.id,
          p.full_name,
          p.email,
          v_own_booking.status,
          v_own_booking.requested_start_at,
          v_own_booking.requested_end_at,
          v_own_booking.purpose,
          'The pickup window for this reservation has passed.'::text
        from public.profiles p
        where p.id = v_own_booking.instructor_id;
      return;
    end if;

    return query
      select
        'ready'::text,
        v_own_booking.id,
        v_asset.id,
        p.id,
        p.full_name,
        p.email,
        v_own_booking.status,
        v_own_booking.requested_start_at,
        v_own_booking.requested_end_at,
        v_own_booking.purpose,
        'Your approved reservation is ready for pickup.'::text
      from public.profiles p
      where p.id = v_own_booking.instructor_id;
    return;
  end if;

  select *
  into v_blocking_booking
  from public.bookings b
  where b.status in ('pending'::public.booking_status, 'approved'::public.booking_status, 'checked_out'::public.booking_status)
    and b.requested_end_at >= v_now
    and (
      (
        coalesce(b.resource_type, 'asset'::public.borrowing_resource_type) = 'asset'::public.borrowing_resource_type
        and b.asset_id = v_asset.id
      )
      or (
        v_asset.is_room_bound = true
        and b.resource_type = 'room'::public.borrowing_resource_type
        and b.location_id = v_asset.location_id
      )
    )
  order by b.requested_start_at, b.created_at, b.id
  limit 1;

  if found then
    return query select
      'reserved_by_other'::text,
      null::uuid,
      v_asset.id,
      null::uuid,
      null::text,
      null::text,
      v_blocking_booking.status,
      v_blocking_booking.requested_start_at,
      v_blocking_booking.requested_end_at,
      'Reserved'::text,
      'This asset is reserved and cannot be checked out by QR scan.'::text;
    return;
  end if;

  return query select
    'no_reservation'::text,
    null::uuid,
    v_asset.id,
    null::uuid,
    null::text,
    null::text,
    null::public.booking_status,
    null::timestamptz,
    null::timestamptz,
    null::text,
    'You do not have an approved reservation for this asset.'::text;
end;
$$;

revoke all on function public.get_borrower_qr_pickup(text) from public, anon;
grant execute on function public.get_borrower_qr_pickup(text) to authenticated;

notify pgrst, 'reload schema';
