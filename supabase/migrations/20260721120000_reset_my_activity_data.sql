-- Per-user activity reset for mobile testing.
-- Deletes the caller's borrowings, defect reports (and cascaded tickets/photos),
-- notifications, and push tokens. Does not delete profiles or auth accounts.
-- Syncs affected asset statuses after hard deletes.

drop function if exists public.reset_my_activity_data();
create function public.reset_my_activity_data()
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
  v_asset_ids uuid[];
  v_asset_id uuid;
begin
  v_actor_id := app_private.require_active_user();

  select coalesce(array_agg(distinct asset_id), '{}'::uuid[])
  into v_asset_ids
  from (
    select b.asset_id
    from public.bookings b
    where b.instructor_id = v_actor_id
      and b.asset_id is not null
    union
    select dr.asset_id
    from public.defect_reports dr
    where dr.instructor_id = v_actor_id
      and dr.asset_id is not null
  ) owned_assets;

  delete from storage.objects
  where bucket_id = 'defect-photos'
    and app_private.defect_photo_report_id(name) in (
      select dr.id
      from public.defect_reports dr
      where dr.instructor_id = v_actor_id
    );

  delete from public.notifications
  where recipient_id = v_actor_id;
  get diagnostics v_notifications_deleted = row_count;

  delete from public.device_push_tokens
  where user_id = v_actor_id;
  get diagnostics v_push_tokens_deleted = row_count;

  delete from public.defect_reports
  where instructor_id = v_actor_id;
  get diagnostics v_defect_reports_deleted = row_count;

  delete from public.bookings
  where instructor_id = v_actor_id;
  get diagnostics v_bookings_deleted = row_count;

  foreach v_asset_id in array v_asset_ids
  loop
    perform app_private.sync_asset_status(v_asset_id);
  end loop;

  return jsonb_build_object(
    'bookings_deleted', v_bookings_deleted,
    'defect_reports_deleted', v_defect_reports_deleted,
    'notifications_deleted', v_notifications_deleted,
    'push_tokens_deleted', v_push_tokens_deleted
  );
end;
$$;

revoke all on function public.reset_my_activity_data() from public, anon;
grant execute on function public.reset_my_activity_data() to authenticated;
