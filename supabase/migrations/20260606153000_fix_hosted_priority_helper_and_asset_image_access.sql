create or replace function app_private.first_priority_borrowing_id(
  p_resource_type public.borrowing_resource_type,
  p_resource_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz
)
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select b.id
  from public.bookings b
  left join public.assets ba on ba.id = b.asset_id
  where p_resource_id is not null
    and b.status in ('pending'::public.booking_status, 'approved'::public.booking_status, 'checked_out'::public.booking_status)
    and tstzrange(b.requested_start_at, b.requested_end_at, '[)')
      && tstzrange(p_start_at, p_end_at, '[)')
    and (
      (
        p_resource_type = 'asset'::public.borrowing_resource_type
        and (
          b.asset_id = p_resource_id
          or (
            b.resource_type = 'room'::public.borrowing_resource_type
            and exists (
              select 1
              from public.assets a
              where a.id = p_resource_id
                and a.is_room_bound = true
                and a.location_id = b.location_id
            )
          )
        )
      )
      or
      (
        p_resource_type = 'room'::public.borrowing_resource_type
        and (
          (b.resource_type = 'room'::public.borrowing_resource_type and b.location_id = p_resource_id)
          or (
            b.resource_type = 'asset'::public.borrowing_resource_type
            and ba.location_id = p_resource_id
            and ba.is_room_bound = true
          )
        )
      )
    )
  order by b.created_at, b.id
  limit 1;
$$;

create or replace function app_private.can_read_asset_image_metadata(p_asset_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    exists (
      select 1
      from public.assets a
      where a.id = p_asset_id
        and a.is_active = true
        and a.archived_at is null
        and a.status <> 'retired'::public.asset_status
    ),
    false
  );
$$;

create or replace function app_private.can_read_asset_image_object(p_storage_path text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    exists (
      select 1
      from public.asset_images ai
      join public.assets a on a.id = ai.asset_id
      where ai.storage_path = p_storage_path
        and a.is_active = true
        and a.archived_at is null
        and a.status <> 'retired'::public.asset_status
    ),
    false
  );
$$;

drop policy if exists "Users read active asset image metadata" on public.asset_images;

create policy "Users read active asset image metadata"
  on public.asset_images
  for select
  to authenticated
  using (
    (select app_private.is_admin())
    or (
      (select app_private.is_active_user(auth.uid()))
      and app_private.can_read_asset_image_metadata(asset_images.asset_id)
    )
  );

drop policy if exists "Users read asset image objects" on storage.objects;

create policy "Users read asset image objects"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'asset-images'
    and (
      (select app_private.is_admin())
      or (
        (select app_private.is_active_user(auth.uid()))
        and app_private.can_read_asset_image_object(storage.objects.name)
      )
    )
  );
