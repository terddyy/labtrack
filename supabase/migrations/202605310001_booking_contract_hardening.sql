create index if not exists idx_assets_created_at_id_desc
  on public.assets (created_at desc, id desc);

create or replace function public.create_booking(
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

  if p_requested_start_at <= now() then
    raise exception 'Booking start time must be later than now'
      using errcode = '22023';
  end if;

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

revoke all on function public.create_booking(uuid, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.create_booking(uuid, timestamptz, timestamptz, text) to authenticated;
