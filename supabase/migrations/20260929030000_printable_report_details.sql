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
    where p_report_type not in ('borrowing_transactions', 'defect_reports')
    union all
    select p_report_type, 'analytics', coalesce(jsonb_agg(to_jsonb(metric_rows)), '[]'::jsonb)
    from public.get_usage_analytics(p_from, p_to, p_location_id, p_asset_id) metric_rows
    where p_report_type not in ('borrowing_transactions', 'defect_reports')
      and (p_report_type = 'asset_management_summary' or metric_rows.report_type = p_report_type)
    union all
    select p_report_type, 'transactions', coalesce(jsonb_agg(to_jsonb(transaction_rows) order by transaction_rows.date_borrowed), '[]'::jsonb)
    from (
      select
        'T' || upper(left(replace(b.id::text, '-', ''), 8)) as borrowing_id,
        p.full_name as borrower,
        coalesce(a.name, l.name || ' (Room)') as asset,
        b.requested_start_at as date_borrowed,
        b.requested_end_at as expected_return,
        b.status::text as status,
        b.purpose as purpose
      from public.bookings b
      join public.profiles p on p.id = b.instructor_id
      left join public.assets a on a.id = b.asset_id
      left join public.locations l on l.id = coalesce(b.location_id, a.location_id)
      where p_report_type = 'borrowing_transactions'
        and b.requested_start_at >= p_from
        and b.requested_start_at < p_to
        and (p_location_id is null or coalesce(b.location_id, a.location_id) = p_location_id)
        and (p_asset_id is null or b.asset_id = p_asset_id)
    ) transaction_rows
    having p_report_type = 'borrowing_transactions'
    union all
    select p_report_type, 'defects', coalesce(jsonb_agg(to_jsonb(defect_rows) order by defect_rows.date_reported), '[]'::jsonb)
    from (
      select
        'R' || upper(left(replace(dr.id::text, '-', ''), 8)) as report_id,
        a.name as asset,
        p.full_name as reported_by,
        dr.created_at as date_reported,
        concat_ws(': ', dr.title, nullif(dr.description, '')) as defect_description,
        dr.status::text as status
      from public.defect_reports dr
      join public.assets a on a.id = dr.asset_id
      join public.profiles p on p.id = dr.instructor_id
      where p_report_type = 'defect_reports'
        and dr.created_at >= p_from
        and dr.created_at < p_to
        and (p_location_id is null or a.location_id = p_location_id)
        and (p_asset_id is null or dr.asset_id = p_asset_id)
    ) defect_rows
    having p_report_type = 'defect_reports'
    union all
    select p_report_type, 'equipment', coalesce(jsonb_agg(to_jsonb(asset_rows) order by asset_rows.name), '[]'::jsonb)
    from (
      select
        a.name,
        a.property_number,
        a.serial_number,
        c.name as category,
        l.name as room_lab,
        a.status::text as status,
        a.condition::text as condition,
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
