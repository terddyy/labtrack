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
  qr_generated_at timestamptz,
  primary_image_url text
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
      aq.generated_at,
      ai.storage_path
    from public.asset_qr_codes aq
    join public.assets a on a.id = aq.asset_id
    join public.asset_categories ac on ac.id = a.category_id
    join public.locations l on l.id = a.location_id
    left join public.asset_images ai on ai.asset_id = a.id and ai.is_primary = true
    where aq.code = v_qr_code
      and aq.is_active = true
      and a.status <> 'retired'::public.asset_status
    limit 1;
end;
$$;

revoke all on function public.resolve_asset_by_qr_code(text) from public, anon;
grant execute on function public.resolve_asset_by_qr_code(text) to authenticated;

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
  active_qr_generated_at timestamptz,
  primary_image_url text
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
      aq.generated_at,
      ai.storage_path
    from public.assets a
    join public.asset_categories ac on ac.id = a.category_id
    join public.locations l on l.id = a.location_id
    left join public.asset_qr_codes aq on aq.asset_id = a.id and aq.is_active = true
    left join public.asset_images ai on ai.asset_id = a.id and ai.is_primary = true
    order by a.created_at desc, a.id desc
    limit greatest(1, least(coalesce(p_limit, 100), 500))
    offset greatest(0, coalesce(p_offset, 0));
end;
$$;

revoke all on function public.list_admin_assets(integer, integer) from public, anon;
grant execute on function public.list_admin_assets(integer, integer) to authenticated;

notify pgrst, 'reload schema';
