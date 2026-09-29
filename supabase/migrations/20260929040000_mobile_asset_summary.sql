create or replace function public.get_mobile_asset_summary()
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  perform app_private.require_active_user();

  return (
    select jsonb_build_object(
      'total_assets', count(*) filter (where a.status <> 'retired'::public.asset_status),
      'available_assets', count(*) filter (where a.status = 'available'::public.asset_status),
      'checked_out_assets', count(*) filter (where a.status = 'checked_out'::public.asset_status),
      'repair_assets', count(*) filter (
        where a.status = 'for_repair'::public.asset_status
          or a.condition in ('defective'::public.asset_condition, 'for_repair'::public.asset_condition)
      ),
      'lab_count', (select count(*) from public.locations)
    )
    from public.assets a
    where a.archived_at is null
      and a.is_active = true
  );
end;
$$;

revoke all on function public.get_mobile_asset_summary() from public, anon;
grant execute on function public.get_mobile_asset_summary() to authenticated;
