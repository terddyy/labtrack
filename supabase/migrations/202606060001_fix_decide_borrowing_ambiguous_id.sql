create or replace function public.decide_borrowing(p_borrowing_id uuid, p_status public.booking_status, p_notes text)
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
  if v_booking.status <> 'pending'::public.booking_status then raise exception 'Only pending borrowings can be decided' using errcode = '23514'; end if;
  if p_status not in ('approved'::public.booking_status, 'rejected'::public.booking_status) then raise exception 'Borrowing decision must be approved or rejected' using errcode = '22023'; end if;

  v_resource_id := coalesce(v_booking.asset_id, v_booking.location_id);
  perform app_private.lock_borrowing_scope(v_booking.resource_type, v_resource_id);

  if p_status = 'approved'::public.booking_status then
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
      raise exception 'Borrowing overlaps an approved or checked-out borrowing' using errcode = '23P01';
    end if;
  end if;

  update public.bookings b
  set status = p_status,
      decided_by = v_actor_id,
      decided_at = now(),
      decision_notes = v_notes
  where b.id = v_booking.id;

  insert into public.booking_events (booking_id, actor_id, from_status, to_status, notes)
  values (v_booking.id, v_actor_id, 'pending'::public.booking_status, p_status, v_notes);

  if v_booking.asset_id is not null then
    perform app_private.sync_asset_status(v_booking.asset_id);
  end if;

  perform app_private.create_notification(
    v_booking.instructor_id,
    'booking_update'::public.notification_type,
    case when p_status = 'approved'::public.booking_status then 'Borrowing approved' else 'Borrowing rejected' end,
    case when p_status = 'approved'::public.booking_status then 'Your borrowing request was approved.' else 'Your borrowing request was rejected.' end
  );

  perform app_private.audit_action('borrowing.decided', 'bookings', v_booking.id, jsonb_build_object('status', p_status, 'notes', v_notes));

  return query select * from app_private.return_borrowing_row(p_borrowing_id);
end;
$$;

revoke all on function public.decide_borrowing(uuid, public.booking_status, text) from public, anon;
grant execute on function public.decide_borrowing(uuid, public.booking_status, text) to authenticated;
