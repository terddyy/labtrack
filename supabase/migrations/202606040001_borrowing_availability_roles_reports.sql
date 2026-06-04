do $$
begin
  alter type public.user_role add value if not exists 'custodian';
  alter type public.user_role add value if not exists 'faculty';
  alter type public.user_role add value if not exists 'student';
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.borrowing_resource_type as enum ('asset', 'room');
exception
  when duplicate_object then null;
end $$;

create or replace function app_private.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(app_private.current_user_role()::text in ('admin', 'custodian', 'super_admin'), false)
$$;

create or replace function app_private.is_admin_user(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    exists (
      select 1
      from public.profiles p
      where p.id = p_user_id
        and p.is_active = true
        and p.role::text in ('admin', 'custodian', 'super_admin')
    ),
    false
  )
$$;

create or replace function app_private.require_admin()
returns uuid
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_actor_id uuid;
begin
  v_actor_id := app_private.require_active_user();

  if not app_private.is_admin_user(v_actor_id) then
    raise exception 'Custodian privileges required'
      using errcode = '42501';
  end if;

  return v_actor_id;
end;
$$;

alter table public.locations
  add column if not exists location_type text not null default 'room',
  add column if not exists capacity integer,
  add column if not exists is_reservable boolean not null default true,
  add column if not exists display_order integer not null default 0;

alter table public.assets
  add column if not exists is_room_bound boolean not null default false,
  add column if not exists is_active boolean not null default true,
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public.profiles(id),
  add column if not exists archive_reason text,
  add column if not exists lifecycle_state text not null default 'active';

alter table public.bookings
  add column if not exists resource_type public.borrowing_resource_type not null default 'asset',
  add column if not exists location_id uuid references public.locations(id);

alter table public.bookings alter column asset_id drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bookings_exactly_one_resource'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_exactly_one_resource check (
        (resource_type = 'asset'::public.borrowing_resource_type and asset_id is not null and location_id is null)
        or
        (resource_type = 'room'::public.borrowing_resource_type and asset_id is null and location_id is not null)
      ) not valid;
  end if;
end $$;

update public.bookings
set resource_type = 'asset'::public.borrowing_resource_type
where resource_type is null;

create table if not exists public.asset_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  event_type text not null,
  from_status public.asset_status,
  to_status public.asset_status,
  from_condition public.asset_condition,
  to_condition public.asset_condition,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists asset_lifecycle_events_asset_created_idx
  on public.asset_lifecycle_events (asset_id, created_at desc);

create table if not exists public.asset_images (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  storage_path text not null unique,
  alt_text text,
  is_primary boolean not null default false,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create unique index if not exists asset_images_one_primary_per_asset
  on public.asset_images (asset_id)
  where is_primary = true;

insert into storage.buckets (id, name, public)
values ('asset-images', 'asset-images', false)
on conflict (id) do nothing;

create table if not exists public.university_email_domains (
  id uuid primary key default gen_random_uuid(),
  domain text not null unique,
  is_allowed boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

insert into public.university_email_domains (domain, is_allowed, notes)
values ('pampangastateu.edu.ph', true, 'Default LABTRACK university domain placeholder')
on conflict (domain) do nothing;

alter table public.asset_lifecycle_events enable row level security;
alter table public.asset_images enable row level security;
alter table public.university_email_domains enable row level security;

drop policy if exists "Custodians read asset lifecycle events" on public.asset_lifecycle_events;
drop policy if exists "Custodians create asset lifecycle events" on public.asset_lifecycle_events;
drop policy if exists "Users read active asset image metadata" on public.asset_images;
drop policy if exists "Custodians manage asset image metadata" on public.asset_images;
drop policy if exists "Custodians read university email domains" on public.university_email_domains;
drop policy if exists "Super admins manage university email domains" on public.university_email_domains;

create policy "Custodians read asset lifecycle events" on public.asset_lifecycle_events
  for select to authenticated
  using ((select app_private.is_admin()));

create policy "Custodians create asset lifecycle events" on public.asset_lifecycle_events
  for insert to authenticated
  with check ((select app_private.is_admin()));

create policy "Users read active asset image metadata" on public.asset_images
  for select to authenticated
  using (
    (select app_private.is_admin())
    or exists (
      select 1
      from public.assets a
      where a.id = asset_images.asset_id
        and a.is_active = true
        and a.archived_at is null
        and a.status <> 'retired'::public.asset_status
    )
  );

create policy "Custodians manage asset image metadata" on public.asset_images
  for all to authenticated
  using ((select app_private.is_admin()))
  with check ((select app_private.is_admin()));

create policy "Custodians read university email domains" on public.university_email_domains
  for select to authenticated
  using ((select app_private.is_admin()));

create policy "Super admins manage university email domains" on public.university_email_domains
  for all to authenticated
  using ((select app_private.is_super_admin()))
  with check ((select app_private.is_super_admin()));

drop policy if exists "Users read asset image objects" on storage.objects;
drop policy if exists "Custodians upload asset image objects" on storage.objects;
drop policy if exists "Custodians update asset image objects" on storage.objects;
drop policy if exists "Custodians delete asset image objects" on storage.objects;

create policy "Users read asset image objects"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'asset-images'
    and (
      (select app_private.is_admin())
      or exists (
        select 1
        from public.asset_images ai
        join public.assets a on a.id = ai.asset_id
        where ai.storage_path = name
          and a.is_active = true
          and a.archived_at is null
          and a.status <> 'retired'::public.asset_status
      )
    )
  );

create policy "Custodians upload asset image objects"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'asset-images' and (select app_private.is_admin()));

create policy "Custodians update asset image objects"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'asset-images' and (select app_private.is_admin()))
  with check (bucket_id = 'asset-images' and (select app_private.is_admin()));

create policy "Custodians delete asset image objects"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'asset-images' and (select app_private.is_admin()));

create or replace function app_private.is_university_email_allowed(p_email text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  with normalized as (
    select lower(split_part(coalesce(p_email, ''), '@', 2)) as email_domain
  ),
  configured as (
    select count(*) filter (where is_allowed) as allowed_count
    from public.university_email_domains
  )
  select case
    when (select email_domain from normalized) = '' then false
    when (select allowed_count from configured) = 0 then false
    else exists (
      select 1
      from public.university_email_domains d, normalized n
      where d.is_allowed = true
        and lower(d.domain) = n.email_domain
    )
  end;
$$;

create or replace function public.hook_restrict_signup_by_email_domain(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
begin
  v_email := event->'user'->>'email';

  if app_private.is_university_email_allowed(v_email) then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error',
    jsonb_build_object(
      'http_code', 403,
      'message', 'Use a university email account to access LABTRACK.'
    )
  );
end;
$$;

grant execute on function public.hook_restrict_signup_by_email_domain(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_restrict_signup_by_email_domain(jsonb) from authenticated, anon, public;

create or replace function app_private.borrowing_conflict_state(
  p_resource_type public.borrowing_resource_type,
  p_resource_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_exclude_booking_id uuid default null
)
returns text
language sql
security definer
set search_path = ''
stable
as $$
  with candidate_bookings as (
    select b.status
    from public.bookings b
    left join public.assets ba on ba.id = b.asset_id
    where (p_exclude_booking_id is null or b.id <> p_exclude_booking_id)
      and b.status in ('pending'::public.booking_status, 'approved'::public.booking_status, 'checked_out'::public.booking_status)
      and tstzrange(b.requested_start_at, b.requested_end_at, '[)')
        && tstzrange(p_start_at, p_end_at, '[)')
      and (
        (p_resource_type = 'asset'::public.borrowing_resource_type and (
          b.asset_id = p_resource_id
          or (
            b.resource_type = 'room'::public.borrowing_resource_type
            and ba.id is null
            and exists (
              select 1
              from public.assets a
              where a.id = p_resource_id
                and a.is_room_bound = true
                and a.location_id = b.location_id
            )
          )
        ))
        or
        (p_resource_type = 'room'::public.borrowing_resource_type and (
          (b.resource_type = 'room'::public.borrowing_resource_type and b.location_id = p_resource_id)
          or (
            b.resource_type = 'asset'::public.borrowing_resource_type
            and ba.location_id = p_resource_id
            and ba.is_room_bound = true
          )
        ))
      )
  )
  select case
    when exists (select 1 from candidate_bookings where status in ('approved'::public.booking_status, 'checked_out'::public.booking_status)) then 'busy'
    when exists (select 1 from candidate_bookings where status = 'pending'::public.booking_status) then 'tentative'
    else 'available'
  end;
$$;

create or replace function app_private.next_resource_available_at(
  p_resource_type public.borrowing_resource_type,
  p_resource_id uuid,
  p_start_at timestamptz
)
returns timestamptz
language sql
security definer
set search_path = ''
stable
as $$
  select max(b.requested_end_at)
  from public.bookings b
  left join public.assets ba on ba.id = b.asset_id
  where b.status in ('approved'::public.booking_status, 'checked_out'::public.booking_status)
    and b.requested_end_at >= p_start_at
    and (
      (p_resource_type = 'asset'::public.borrowing_resource_type and b.asset_id = p_resource_id)
      or
      (p_resource_type = 'room'::public.borrowing_resource_type and (
        (b.resource_type = 'room'::public.borrowing_resource_type and b.location_id = p_resource_id)
        or (b.resource_type = 'asset'::public.borrowing_resource_type and ba.location_id = p_resource_id and ba.is_room_bound = true)
      ))
    );
$$;

create or replace function app_private.lock_borrowing_scope(
  p_resource_type public.borrowing_resource_type,
  p_resource_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_asset public.assets%rowtype;
  v_lock_key text;
begin
  if p_resource_type = 'asset'::public.borrowing_resource_type then
    select *
    into v_asset
    from public.assets
    where id = p_resource_id;

    v_lock_key := 'asset:' || p_resource_id::text;
    perform pg_advisory_xact_lock(hashtextextended(v_lock_key, 0));

    if v_asset.is_room_bound and v_asset.location_id is not null then
      perform pg_advisory_xact_lock(hashtextextended('room:' || v_asset.location_id::text, 0));
    end if;
  else
    perform pg_advisory_xact_lock(hashtextextended('room:' || p_resource_id::text, 0));
  end if;
end;
$$;

drop function if exists public.list_borrowable_resources(timestamptz, timestamptz, public.borrowing_resource_type, uuid, text);
create function public.list_borrowable_resources(
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_resource_type public.borrowing_resource_type default null,
  p_location_id uuid default null,
  p_query text default null
)
returns table (
  id uuid,
  resource_type public.borrowing_resource_type,
  name text,
  category_name text,
  location_id uuid,
  location_name text,
  status public.asset_status,
  condition public.asset_condition,
  availability text,
  next_available_at timestamptz,
  primary_image_url text,
  is_active boolean,
  is_archived boolean
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  perform app_private.require_active_user();

  if p_start_at <= now() then
    raise exception 'Borrow start time must be later than now' using errcode = '22023';
  end if;

  if p_end_at <= p_start_at then
    raise exception 'Borrow end time must be after the start time' using errcode = '22023';
  end if;

  if extract(epoch from (p_end_at - p_start_at)) / 60 not between 90 and 180 then
    raise exception 'Borrowing duration must be between 90 and 180 minutes' using errcode = '22023';
  end if;

  return query
    select
      a.id,
      'asset'::public.borrowing_resource_type,
      a.name,
      ac.name,
      l.id,
      l.name,
      a.status,
      a.condition,
      case
        when a.is_active = false or a.archived_at is not null or a.status = 'retired'::public.asset_status then 'unavailable'
        else app_private.borrowing_conflict_state('asset'::public.borrowing_resource_type, a.id, p_start_at, p_end_at, null)
      end,
      app_private.next_resource_available_at('asset'::public.borrowing_resource_type, a.id, p_start_at),
      ai.storage_path,
      a.is_active,
      a.archived_at is not null
    from public.assets a
    join public.asset_categories ac on ac.id = a.category_id
    join public.locations l on l.id = a.location_id
    left join public.asset_images ai on ai.asset_id = a.id and ai.is_primary = true
    where (p_resource_type is null or p_resource_type = 'asset'::public.borrowing_resource_type)
      and (p_location_id is null or a.location_id = p_location_id)
      and a.is_active = true
      and a.archived_at is null
      and a.status <> 'retired'::public.asset_status
      and (p_query is null or a.name ilike '%' || p_query || '%' or a.property_number ilike '%' || p_query || '%')
    union all
    select
      l.id,
      'room'::public.borrowing_resource_type,
      l.name,
      l.location_type,
      l.id,
      l.name,
      null::public.asset_status,
      null::public.asset_condition,
      case
        when l.is_reservable = false then 'unavailable'
        else app_private.borrowing_conflict_state('room'::public.borrowing_resource_type, l.id, p_start_at, p_end_at, null)
      end,
      app_private.next_resource_available_at('room'::public.borrowing_resource_type, l.id, p_start_at),
      null::text,
      l.is_reservable,
      false
    from public.locations l
    where (p_resource_type is null or p_resource_type = 'room'::public.borrowing_resource_type)
      and (p_location_id is null or l.id = p_location_id)
      and (p_query is null or l.name ilike '%' || p_query || '%')
    order by 2, 3;
end;
$$;

revoke all on function public.list_borrowable_resources(timestamptz, timestamptz, public.borrowing_resource_type, uuid, text) from public, anon;
grant execute on function public.list_borrowable_resources(timestamptz, timestamptz, public.borrowing_resource_type, uuid, text) to authenticated;

drop function if exists public.list_resource_schedule(public.borrowing_resource_type, uuid, timestamptz, timestamptz);
create function public.list_resource_schedule(
  p_resource_type public.borrowing_resource_type,
  p_resource_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  id uuid,
  resource_type public.borrowing_resource_type,
  resource_id uuid,
  borrower_id uuid,
  borrower_name text,
  borrower_email text,
  requested_start_at timestamptz,
  requested_end_at timestamptz,
  status public.booking_status,
  purpose text,
  availability text
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_actor_id uuid;
  v_is_admin boolean;
begin
  v_actor_id := app_private.require_active_user();
  v_is_admin := app_private.is_admin_user(v_actor_id);

  if p_to <= p_from then
    raise exception 'Schedule end time must be after start time' using errcode = '22023';
  end if;

  return query
    select
      b.id,
      coalesce(b.resource_type, 'asset'::public.borrowing_resource_type),
      case when coalesce(b.resource_type, 'asset'::public.borrowing_resource_type) = 'room'::public.borrowing_resource_type then b.location_id else b.asset_id end,
      b.instructor_id,
      case when v_is_admin or b.instructor_id = v_actor_id then p.full_name else null::text end,
      case when v_is_admin or b.instructor_id = v_actor_id then p.email else null::text end,
      b.requested_start_at,
      b.requested_end_at,
      b.status,
      case when v_is_admin or b.instructor_id = v_actor_id then b.purpose else 'Unavailable'::text end,
      case when b.status = 'pending'::public.booking_status then 'tentative' else 'busy' end
    from public.bookings b
    join public.profiles p on p.id = b.instructor_id
    left join public.assets a on a.id = b.asset_id
    where b.status in ('pending'::public.booking_status, 'approved'::public.booking_status, 'checked_out'::public.booking_status)
      and tstzrange(b.requested_start_at, b.requested_end_at, '[)')
        && tstzrange(p_from, p_to, '[)')
      and (
        (p_resource_type = 'asset'::public.borrowing_resource_type and b.asset_id = p_resource_id)
        or
        (p_resource_type = 'room'::public.borrowing_resource_type and (
          (b.resource_type = 'room'::public.borrowing_resource_type and b.location_id = p_resource_id)
          or (b.resource_type = 'asset'::public.borrowing_resource_type and a.location_id = p_resource_id and a.is_room_bound = true)
        ))
      )
    order by b.requested_start_at;
end;
$$;

revoke all on function public.list_resource_schedule(public.borrowing_resource_type, uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.list_resource_schedule(public.borrowing_resource_type, uuid, timestamptz, timestamptz) to authenticated;

drop function if exists public.create_borrowing(public.borrowing_resource_type, uuid, timestamptz, timestamptz, text);
create function public.create_borrowing(
  p_resource_type public.borrowing_resource_type,
  p_resource_id uuid,
  p_requested_start_at timestamptz,
  p_requested_end_at timestamptz,
  p_purpose text
)
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
  v_actor_id uuid;
  v_purpose text;
  v_booking public.bookings%rowtype;
  v_profile public.profiles%rowtype;
  v_conflict text;
begin
  v_actor_id := app_private.require_active_user();
  v_purpose := nullif(btrim(p_purpose), '');

  if p_requested_start_at <= now() then
    raise exception 'Borrow start time must be later than now' using errcode = '22023';
  end if;

  if p_requested_end_at <= p_requested_start_at then
    raise exception 'Borrow end time must be after the start time' using errcode = '22023';
  end if;

  if extract(epoch from (p_requested_end_at - p_requested_start_at)) / 60 not between 90 and 180 then
    raise exception 'Borrowing duration must be between 90 and 180 minutes' using errcode = '22023';
  end if;

  if v_purpose is null then
    raise exception 'Borrowing purpose is required' using errcode = '22023';
  end if;

  if p_resource_type = 'asset'::public.borrowing_resource_type then
    if not exists (
      select 1
      from public.assets a
      where a.id = p_resource_id
        and a.is_active = true
        and a.archived_at is null
        and a.status <> 'retired'::public.asset_status
    ) then
      raise exception 'Asset is not borrowable' using errcode = '23514';
    end if;
  else
    if not exists (
      select 1
      from public.locations l
      where l.id = p_resource_id
        and l.is_reservable = true
    ) then
      raise exception 'Room is not borrowable' using errcode = '23514';
    end if;
  end if;

  perform app_private.lock_borrowing_scope(p_resource_type, p_resource_id);

  v_conflict := app_private.borrowing_conflict_state(p_resource_type, p_resource_id, p_requested_start_at, p_requested_end_at, null);
  if v_conflict = 'busy' then
    raise exception 'Borrowing overlaps an approved or checked-out borrowing' using errcode = '23P01';
  end if;

  insert into public.bookings (
    resource_type,
    asset_id,
    location_id,
    instructor_id,
    requested_start_at,
    requested_end_at,
    purpose
  )
  values (
    p_resource_type,
    case when p_resource_type = 'asset'::public.borrowing_resource_type then p_resource_id else null end,
    case when p_resource_type = 'room'::public.borrowing_resource_type then p_resource_id else null end,
    v_actor_id,
    p_requested_start_at,
    p_requested_end_at,
    v_purpose
  )
  returning * into v_booking;

  insert into public.booking_events (booking_id, actor_id, from_status, to_status, notes)
  values (v_booking.id, v_actor_id, null, 'pending'::public.booking_status, 'Borrowing requested');

  perform public.ensure_ticket_thread('booking'::public.thread_subject_type, v_booking.id, null);

  select * into v_profile from public.profiles where id = v_actor_id;

  return query
    select
      v_booking.id,
      v_booking.resource_type,
      v_booking.asset_id,
      v_booking.location_id,
      v_booking.instructor_id,
      v_profile.full_name,
      v_profile.email,
      v_booking.requested_start_at,
      v_booking.requested_end_at,
      v_booking.purpose,
      v_booking.status,
      v_booking.created_at,
      v_booking.updated_at;
end;
$$;

revoke all on function public.create_borrowing(public.borrowing_resource_type, uuid, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.create_borrowing(public.borrowing_resource_type, uuid, timestamptz, timestamptz, text) to authenticated;

create or replace function app_private.return_borrowing_row(p_booking_id uuid)
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
language sql
security definer
set search_path = ''
stable
as $$
  select
    b.id,
    coalesce(b.resource_type, 'asset'::public.borrowing_resource_type),
    b.asset_id,
    b.location_id,
    b.instructor_id,
    p.full_name,
    p.email,
    b.requested_start_at,
    b.requested_end_at,
    b.purpose,
    b.status,
    b.created_at,
    b.updated_at
  from public.bookings b
  join public.profiles p on p.id = b.instructor_id
  where b.id = p_booking_id;
$$;

drop function if exists public.cancel_borrowing(uuid);
create function public.cancel_borrowing(p_borrowing_id uuid)
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
  v_actor_id uuid;
  v_is_admin boolean;
  v_booking public.bookings%rowtype;
  v_from_status public.booking_status;
begin
  v_actor_id := app_private.require_active_user();
  v_is_admin := app_private.is_admin_user(v_actor_id);

  select *
  into v_booking
  from public.bookings b
  where b.id = p_borrowing_id
  for update;

  if not found then
    raise exception 'Borrowing not found' using errcode = 'P0002';
  end if;

  if not v_is_admin and v_booking.instructor_id <> v_actor_id then
    raise exception 'Cannot cancel another borrower''s request' using errcode = '42501';
  end if;

  if not v_is_admin and v_booking.status <> 'pending'::public.booking_status then
    raise exception 'Only pending borrowing requests can be cancelled by the borrower' using errcode = '23514';
  end if;

  if v_is_admin and v_booking.status not in ('pending'::public.booking_status, 'approved'::public.booking_status) then
    raise exception 'Only pending or approved borrowing requests can be cancelled' using errcode = '23514';
  end if;

  perform app_private.lock_borrowing_scope(v_booking.resource_type, coalesce(v_booking.asset_id, v_booking.location_id));

  v_from_status := v_booking.status;

  update public.bookings
  set status = 'cancelled'::public.booking_status,
      decided_by = case when v_is_admin then v_actor_id else decided_by end,
      decided_at = case when v_is_admin then now() else decided_at end,
      decision_notes = case when v_is_admin then 'Cancelled by custodian' else decision_notes end
  where id = v_booking.id
  returning * into v_booking;

  insert into public.booking_events (booking_id, actor_id, from_status, to_status, notes)
  values (
    v_booking.id,
    v_actor_id,
    v_from_status,
    'cancelled'::public.booking_status,
    case when v_is_admin then 'Cancelled by custodian' else 'Cancelled by borrower' end
  );

  if v_booking.asset_id is not null then
    perform app_private.sync_asset_status(v_booking.asset_id);
  end if;

  if v_is_admin then
    perform app_private.create_notification(
      v_booking.instructor_id,
      'booking_update'::public.notification_type,
      'Borrowing cancelled',
      'Your borrowing request was cancelled by a custodian.'
    );

    perform app_private.audit_action(
      'borrowing.cancelled',
      'bookings',
      v_booking.id,
      jsonb_build_object('from_status', v_from_status, 'to_status', v_booking.status)
    );
  end if;

  return query select * from app_private.return_borrowing_row(p_borrowing_id);
end;
$$;

revoke all on function public.cancel_borrowing(uuid) from public, anon;
grant execute on function public.cancel_borrowing(uuid) to authenticated;

drop function if exists public.decide_borrowing(uuid, public.booking_status, text);
create function public.decide_borrowing(p_borrowing_id uuid, p_status public.booking_status, p_notes text)
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
begin
  v_actor_id := app_private.require_admin();
  v_notes := nullif(btrim(p_notes), '');

  select * into v_booking from public.bookings where id = p_borrowing_id for update;
  if not found then raise exception 'Borrowing not found' using errcode = 'P0002'; end if;
  if v_booking.status <> 'pending'::public.booking_status then raise exception 'Only pending borrowings can be decided' using errcode = '23514'; end if;
  if p_status not in ('approved'::public.booking_status, 'rejected'::public.booking_status) then raise exception 'Borrowing decision must be approved or rejected' using errcode = '22023'; end if;

  perform app_private.lock_borrowing_scope(v_booking.resource_type, coalesce(v_booking.asset_id, v_booking.location_id));

  if p_status = 'approved'::public.booking_status
    and app_private.borrowing_conflict_state(v_booking.resource_type, coalesce(v_booking.asset_id, v_booking.location_id), v_booking.requested_start_at, v_booking.requested_end_at, v_booking.id) = 'busy' then
    raise exception 'Borrowing overlaps an approved or checked-out borrowing' using errcode = '23P01';
  end if;

  update public.bookings
  set status = p_status,
      decided_by = v_actor_id,
      decided_at = now(),
      decision_notes = v_notes
  where id = v_booking.id;

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

drop function if exists public.checkout_borrowing(uuid, text);
create function public.checkout_borrowing(p_borrowing_id uuid, p_notes text)
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
begin
  v_actor_id := app_private.require_admin();
  v_notes := nullif(btrim(p_notes), '');

  select * into v_booking from public.bookings where id = p_borrowing_id for update;
  if not found then raise exception 'Borrowing not found' using errcode = 'P0002'; end if;
  if v_booking.status <> 'approved'::public.booking_status then raise exception 'Only approved borrowings can be checked out' using errcode = '23514'; end if;

  update public.bookings set status = 'checked_out'::public.booking_status where id = v_booking.id;
  insert into public.booking_events (booking_id, actor_id, from_status, to_status, notes)
  values (v_booking.id, v_actor_id, 'approved'::public.booking_status, 'checked_out'::public.booking_status, v_notes);

  if v_booking.asset_id is not null then
    perform app_private.sync_asset_status(v_booking.asset_id);
  end if;

  perform app_private.create_notification(v_booking.instructor_id, 'booking_update'::public.notification_type, 'Borrowing checked out', 'Your borrowing was checked out by a custodian.');
  perform app_private.audit_action('borrowing.checked_out', 'bookings', v_booking.id, jsonb_build_object('notes', v_notes));

  return query select * from app_private.return_borrowing_row(p_borrowing_id);
end;
$$;

revoke all on function public.checkout_borrowing(uuid, text) from public, anon;
grant execute on function public.checkout_borrowing(uuid, text) to authenticated;

drop function if exists public.return_borrowing(uuid, text);
create function public.return_borrowing(p_borrowing_id uuid, p_notes text)
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
begin
  v_actor_id := app_private.require_admin();
  v_notes := nullif(btrim(p_notes), '');

  select * into v_booking from public.bookings where id = p_borrowing_id for update;
  if not found then raise exception 'Borrowing not found' using errcode = 'P0002'; end if;
  if v_booking.status <> 'checked_out'::public.booking_status then raise exception 'Only checked-out borrowings can be returned' using errcode = '23514'; end if;

  update public.bookings set status = 'returned'::public.booking_status where id = v_booking.id;
  insert into public.booking_events (booking_id, actor_id, from_status, to_status, notes)
  values (v_booking.id, v_actor_id, 'checked_out'::public.booking_status, 'returned'::public.booking_status, v_notes);

  if v_booking.asset_id is not null then
    perform app_private.sync_asset_status(v_booking.asset_id);
  end if;

  perform app_private.create_notification(v_booking.instructor_id, 'booking_update'::public.notification_type, 'Borrowing returned', 'Your borrowing was marked returned by a custodian.');
  perform app_private.audit_action('borrowing.returned', 'bookings', v_booking.id, jsonb_build_object('notes', v_notes));

  return query select * from app_private.return_borrowing_row(p_borrowing_id);
end;
$$;

revoke all on function public.return_borrowing(uuid, text) from public, anon;
grant execute on function public.return_borrowing(uuid, text) to authenticated;

drop function if exists public.get_borrowing_monitor(timestamptz, timestamptz, uuid, uuid, public.booking_status[]);
create function public.get_borrowing_monitor(
  p_from timestamptz,
  p_to timestamptz,
  p_location_id uuid default null,
  p_resource_id uuid default null,
  p_statuses public.booking_status[] default null
)
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
stable
as $$
begin
  perform app_private.require_admin();

  if p_to <= p_from then
    raise exception 'Monitor end time must be after start time' using errcode = '22023';
  end if;

  return query
    select
      b.id,
      coalesce(b.resource_type, 'asset'::public.borrowing_resource_type),
      b.asset_id,
      b.location_id,
      b.instructor_id,
      p.full_name,
      p.email,
      b.requested_start_at,
      b.requested_end_at,
      b.purpose,
      b.status,
      b.created_at,
      b.updated_at
    from public.bookings b
    join public.profiles p on p.id = b.instructor_id
    left join public.assets a on a.id = b.asset_id
    where tstzrange(b.requested_start_at, b.requested_end_at, '[)') && tstzrange(p_from, p_to, '[)')
      and (p_statuses is null or b.status = any(p_statuses))
      and (p_resource_id is null or b.asset_id = p_resource_id or b.location_id = p_resource_id)
      and (p_location_id is null or b.location_id = p_location_id or a.location_id = p_location_id)
    order by b.requested_start_at;
end;
$$;

revoke all on function public.get_borrowing_monitor(timestamptz, timestamptz, uuid, uuid, public.booking_status[]) from public, anon;
grant execute on function public.get_borrowing_monitor(timestamptz, timestamptz, uuid, uuid, public.booking_status[]) to authenticated;

drop function if exists public.get_usage_analytics(timestamptz, timestamptz, uuid, uuid);
create function public.get_usage_analytics(
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
      and (p_asset_id is null or a.id = p_asset_id);
end;
$$;

revoke all on function public.get_usage_analytics(timestamptz, timestamptz, uuid, uuid) from public, anon;
grant execute on function public.get_usage_analytics(timestamptz, timestamptz, uuid, uuid) to authenticated;

drop function if exists public.list_activity_logs(timestamptz, timestamptz, integer, integer);
create function public.list_activity_logs(
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  id uuid,
  actor_id uuid,
  actor_name text,
  actor_email text,
  action text,
  entity_table text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  perform app_private.require_admin();

  if p_from is not null and p_to is not null and p_to <= p_from then
    raise exception 'Activity log end time must be after start time' using errcode = '22023';
  end if;

  return query
    select
      al.id,
      al.actor_id,
      p.full_name,
      p.email,
      al.action,
      al.entity_table,
      al.entity_id,
      al.metadata,
      al.created_at
    from public.audit_logs al
    left join public.profiles p on p.id = al.actor_id
    where (p_from is null or al.created_at >= p_from)
      and (p_to is null or al.created_at <= p_to)
    order by al.created_at desc
    limit greatest(1, least(coalesce(p_limit, 100), 500))
    offset greatest(0, coalesce(p_offset, 0));
end;
$$;

revoke all on function public.list_activity_logs(timestamptz, timestamptz, integer, integer) from public, anon;
grant execute on function public.list_activity_logs(timestamptz, timestamptz, integer, integer) to authenticated;

drop function if exists public.get_printable_report_data(text, timestamptz, timestamptz, uuid, uuid);
create function public.get_printable_report_data(
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
    'inventory',
    'equipment_utilization'
  ) then
    raise exception 'Report type is invalid' using errcode = '22023';
  end if;

  return query
    select
      p_report_type,
      'summary',
      jsonb_build_object(
        'from', p_from,
        'to', p_to,
        'location_id', p_location_id,
        'asset_id', p_asset_id,
        'generated_at', now(),
        'reporting_hours', '08:00-17:00 Monday-Friday Asia/Manila'
      )
    union all
    select
      p_report_type,
      'analytics',
      coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb)
    from public.get_usage_analytics(p_from, p_to, p_location_id, p_asset_id) a;
end;
$$;

revoke all on function public.get_printable_report_data(text, timestamptz, timestamptz, uuid, uuid) from public, anon;
grant execute on function public.get_printable_report_data(text, timestamptz, timestamptz, uuid, uuid) to authenticated;

create or replace function public.send_ticket_message(p_thread_id uuid, p_body text)
returns public.ticket_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_is_admin boolean;
  v_body text;
  v_thread public.ticket_threads%rowtype;
  v_message public.ticket_messages%rowtype;
  v_instructor_id uuid;
begin
  v_actor_id := app_private.require_active_user();
  v_is_admin := app_private.is_admin_user(v_actor_id);
  v_body := nullif(btrim(p_body), '');

  if v_body is null then
    raise exception 'Ticket message body is required'
      using errcode = '22023';
  end if;

  select *
  into v_thread
  from public.ticket_threads tt
  where tt.id = p_thread_id;

  if not found then
    raise exception 'Ticket thread not found'
      using errcode = 'P0002';
  end if;

  if not app_private.can_access_ticket_thread(p_thread_id, v_actor_id) then
    raise exception 'Cannot access this ticket thread'
      using errcode = '42501';
  end if;

  insert into public.ticket_messages (thread_id, sender_id, body)
  values (p_thread_id, v_actor_id, v_body)
  returning * into v_message;

  v_instructor_id := app_private.ticket_thread_instructor_id(p_thread_id);

  if v_is_admin and v_instructor_id is not null and v_instructor_id <> v_actor_id then
    perform app_private.create_notification(
      v_instructor_id,
      'ticket_message'::public.notification_type,
      'New ticket message',
      'A custodian sent a ticket message.'
    );
  elsif not v_is_admin then
    insert into public.notifications (recipient_id, type, title, body)
    select
      p.id,
      'ticket_message'::public.notification_type,
      'New ticket message',
      'A borrower sent a ticket message.'
    from public.profiles p
    where p.is_active = true
      and p.role::text in ('admin', 'custodian', 'super_admin');
  end if;

  return v_message;
end;
$$;

revoke all on function public.send_ticket_message(uuid, text) from public, anon;
grant execute on function public.send_ticket_message(uuid, text) to authenticated;
