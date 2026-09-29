-- Replace utilization/lifecycle report choices with actionable asset status reports.
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
    select 'defect_reports', 'reported_defects', 'Reported issues', count(*)::numeric, 'count'
    from public.defect_reports dr
    join public.assets a on a.id = dr.asset_id
    where dr.created_at between p_from and p_to
      and (p_location_id is null or a.location_id = p_location_id)
      and (p_asset_id is null or dr.asset_id = p_asset_id)
    union all
    select 'asset_reports', 'total_assets', 'Registered equipment', count(*)::numeric, 'count'
    from public.assets a
    where a.archived_at is null
      and (p_location_id is null or a.location_id = p_location_id)
      and (p_asset_id is null or a.id = p_asset_id)
    union all
    select 'repairing_equipment', 'repairing_assets', 'Equipment for repair', count(*)::numeric, 'count'
    from public.assets a
    where a.archived_at is null
      and (a.status = 'for_repair'::public.asset_status or a.condition = 'for_repair'::public.asset_condition)
      and (p_location_id is null or a.location_id = p_location_id)
      and (p_asset_id is null or a.id = p_asset_id)
    union all
    select 'retired_equipment', 'retired_assets', 'Retired equipment', count(*)::numeric, 'count'
    from public.assets a
    where a.archived_at is null
      and (a.status = 'retired'::public.asset_status or a.condition = 'retired'::public.asset_condition)
      and (p_location_id is null or a.location_id = p_location_id)
      and (p_asset_id is null or a.id = p_asset_id);
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

  if p_report_type not in (
    'asset_management_summary',
    'borrowing_transactions',
    'defect_reports',
    'asset_reports',
    'repairing_equipment',
    'retired_equipment'
  ) then
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
    select p_report_type, 'analytics', coalesce(jsonb_agg(to_jsonb(metric_rows)), '[]'::jsonb)
    from public.get_usage_analytics(p_from, p_to, p_location_id, p_asset_id) metric_rows
    where p_report_type = 'asset_management_summary' or metric_rows.report_type = p_report_type
    union all
    select p_report_type, 'equipment', coalesce(jsonb_agg(to_jsonb(asset_rows) order by asset_rows.name), '[]'::jsonb)
    from (
      select
        a.name,
        a.property_number,
        a.serial_number,
        c.name as category,
        l.name as room_lab,
        a.status::text,
        a.condition::text,
        a.created_at,
        a.updated_at
      from public.assets a
      join public.asset_categories c on c.id = a.category_id
      join public.locations l on l.id = a.location_id
      where a.archived_at is null
        and p_report_type in ('asset_reports', 'repairing_equipment', 'retired_equipment')
        and (p_location_id is null or a.location_id = p_location_id)
        and (p_asset_id is null or a.id = p_asset_id)
        and (
          p_report_type = 'asset_reports'
          or (p_report_type = 'repairing_equipment' and (a.status = 'for_repair'::public.asset_status or a.condition = 'for_repair'::public.asset_condition))
          or (p_report_type = 'retired_equipment' and (a.status = 'retired'::public.asset_status or a.condition = 'retired'::public.asset_condition))
        )
    ) asset_rows
    having p_report_type in ('asset_reports', 'repairing_equipment', 'retired_equipment');
end;
$$;

revoke all on function public.get_printable_report_data(text, timestamptz, timestamptz, uuid, uuid) from public, anon;
grant execute on function public.get_printable_report_data(text, timestamptz, timestamptz, uuid, uuid) to authenticated;
