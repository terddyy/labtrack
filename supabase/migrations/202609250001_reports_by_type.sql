-- Keep report selectors meaningful: each report returns its own measures.
create or replace function public.get_usage_analytics(
  p_from timestamptz,
  p_to timestamptz,
  p_location_id uuid default null,
  p_asset_id uuid default null
)
returns table (
  report_type text,
  metric text,
  label text,
  value numeric,
  unit text
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  perform app_private.require_admin();

  if p_to <= p_from then
    raise exception 'Report end time must be after start time' using errcode = '22023';
  end if;

  return query
    select 'borrowing_transactions', 'total_borrowings', 'Borrowing transactions', count(*)::numeric, 'count'
    from public.bookings b
    left join public.assets a on a.id = b.asset_id
    where b.created_at between p_from and p_to
      and (p_location_id is null or b.location_id = p_location_id or a.location_id = p_location_id)
      and (p_asset_id is null or b.asset_id = p_asset_id)
    union all
    select 'equipment_utilization', 'checked_out_minutes', 'Checked-out minutes', coalesce(sum(extract(epoch from (least(b.requested_end_at, p_to) - greatest(b.requested_start_at, p_from))) / 60), 0)::numeric, 'minutes'
    from public.bookings b
    left join public.assets a on a.id = b.asset_id
    where b.status in ('checked_out'::public.booking_status, 'returned'::public.booking_status)
      and tstzrange(b.requested_start_at, b.requested_end_at, '[)') && tstzrange(p_from, p_to, '[)')
      and (p_location_id is null or b.location_id = p_location_id or a.location_id = p_location_id)
      and (p_asset_id is null or b.asset_id = p_asset_id)
    union all
    select 'asset_management_summary', 'active_assets', 'Active assets', count(*)::numeric, 'count'
    from public.assets a
    where a.is_active = true and a.archived_at is null
      and (p_location_id is null or a.location_id = p_location_id)
      and (p_asset_id is null or a.id = p_asset_id)
    union all
    select 'inventory', 'total_assets', 'Total equipment', count(*)::numeric, 'count'
    from public.assets a
    where a.archived_at is null
      and (p_location_id is null or a.location_id = p_location_id)
      and (p_asset_id is null or a.id = p_asset_id)
    union all
    select 'inventory', 'available_assets', 'Available equipment', count(*)::numeric, 'count'
    from public.assets a
    where a.is_active = true and a.archived_at is null and a.status = 'available'::public.asset_status
      and (p_location_id is null or a.location_id = p_location_id)
      and (p_asset_id is null or a.id = p_asset_id)
    union all
    select 'defect_reports', 'reported_defects', 'Reported issues', count(*)::numeric, 'count'
    from public.defect_reports dr
    join public.assets a on a.id = dr.asset_id
    where dr.created_at between p_from and p_to
      and (p_location_id is null or a.location_id = p_location_id)
      and (p_asset_id is null or dr.asset_id = p_asset_id)
    union all
    select 'defect_reports', 'unresolved_defects', 'Issues awaiting resolution', count(*)::numeric, 'count'
    from public.defect_reports dr
    join public.assets a on a.id = dr.asset_id
    where dr.created_at between p_from and p_to
      and dr.status not in ('resolved'::public.defect_status, 'rejected'::public.defect_status)
      and (p_location_id is null or a.location_id = p_location_id)
      and (p_asset_id is null or dr.asset_id = p_asset_id);
end;
$$;

revoke all on function public.get_usage_analytics(timestamptz, timestamptz, uuid, uuid) from public, anon;
grant execute on function public.get_usage_analytics(timestamptz, timestamptz, uuid, uuid) to authenticated;

create or replace function public.get_printable_report_data(
  p_report_type text,
  p_from timestamptz,
  p_to timestamptz,
  p_location_id uuid default null,
  p_asset_id uuid default null
)
returns table (
  report_type text,
  section text,
  payload jsonb
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  perform app_private.require_admin();

  if p_to <= p_from then
    raise exception 'Report end time must be after start time' using errcode = '22023';
  end if;

  if p_report_type not in ('asset_management_summary', 'borrowing_transactions', 'defect_reports', 'inventory', 'equipment_utilization') then
    raise exception 'Report type is invalid' using errcode = '22023';
  end if;

  return query
    select p_report_type, 'summary', jsonb_build_object(
      'from', p_from,
      'to', p_to,
      'location_id', p_location_id,
      'asset_id', p_asset_id,
      'generated_at', now(),
      'reporting_hours', '08:00-17:00 Monday-Friday Asia/Manila'
    )
    union all
    select p_report_type, 'analytics', coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb)
    from public.get_usage_analytics(p_from, p_to, p_location_id, p_asset_id) a
    where p_report_type = 'asset_management_summary' or a.report_type = p_report_type;
end;
$$;

revoke all on function public.get_printable_report_data(text, timestamptz, timestamptz, uuid, uuid) from public, anon;
grant execute on function public.get_printable_report_data(text, timestamptz, timestamptz, uuid, uuid) to authenticated;
