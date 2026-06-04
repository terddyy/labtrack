drop function if exists public.list_admin_assets(integer, integer);

create function public.list_admin_assets(p_limit integer default 100, p_offset integer default 0)
returns table (
  id uuid,
  property_number text,
  serial_number text,
  name text,
  category_id uuid,
  category_name text,
  location_id uuid,
  location_name text,
  condition public.asset_condition,
  status public.asset_status,
  notes text,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  active_qr_code_id uuid,
  active_qr_code text,
  active_qr_generated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  perform app_private.require_admin();

  return query
    select
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
      a.notes,
      a.created_by,
      a.created_at,
      a.updated_at,
      aq.id,
      aq.code,
      aq.generated_at
    from public.assets a
    join public.asset_categories ac on ac.id = a.category_id
    join public.locations l on l.id = a.location_id
    left join public.asset_qr_codes aq on aq.asset_id = a.id and aq.is_active = true
    order by a.created_at desc, a.id desc
    limit greatest(1, least(coalesce(p_limit, 100), 500))
    offset greatest(0, coalesce(p_offset, 0));
end;
$$;

revoke all on function public.list_admin_assets(integer, integer) from public, anon;
grant execute on function public.list_admin_assets(integer, integer) to authenticated;

notify pgrst, 'reload schema';
