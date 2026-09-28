-- Final feedback decisions: registration must carry an explicit borrower role,
-- app reset is local-only, and defect evidence is limited to safe private images.

create or replace function public.bootstrap_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_email text;
  profile_full_name text;
  requested_role text;
begin
  profile_email := lower(nullif(btrim(new.email), ''));

  if profile_email is null then
    return new;
  end if;

  profile_full_name := coalesce(
    nullif(btrim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data->>'name'), ''),
    nullif(btrim(new.raw_user_meta_data->>'display_name'), ''),
    nullif(btrim(split_part(profile_email, '@', 1)), ''),
    'New user'
  );
  requested_role := lower(nullif(btrim(new.raw_user_meta_data->>'requested_role'), ''));

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    profile_email,
    profile_full_name,
    case when requested_role = 'faculty' then 'faculty'::public.user_role else 'student'::public.user_role end
  )
  on conflict do nothing;

  return new;
end;
$$;

-- The product decision is that Reset this device never deletes institutional
-- activity. Keep the legacy function for migration compatibility, but make it
-- unavailable to application users.
revoke execute on function public.reset_my_activity_data() from authenticated;

create or replace function app_private.enforce_defect_photo_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  object_metadata jsonb;
  object_size bigint;
  object_mime_type text;
begin
  -- Serialize inserts per report so concurrent clients cannot exceed the limit.
  perform 1
  from public.defect_reports
  where id = new.defect_report_id
  for update;

  if (select count(*) from public.defect_photos where defect_report_id = new.defect_report_id) >= 3 then
    raise exception 'A defect report can have at most 3 photos' using errcode = '23514';
  end if;

  select metadata
  into object_metadata
  from storage.objects
  where bucket_id = 'defect-photos'
    and name = new.storage_path;

  if not found then
    raise exception 'Uploaded defect photo object was not found' using errcode = '23514';
  end if;

  object_size := coalesce((object_metadata->>'size')::bigint, 0);
  object_mime_type := lower(coalesce(object_metadata->>'mimetype', ''));

  if object_size > 5242880 then
    raise exception 'Each defect photo must be 5 MB or smaller' using errcode = '23514';
  end if;

  if object_mime_type not in ('image/jpeg', 'image/png', 'image/webp') then
    raise exception 'Defect photos must be JPEG, PNG, or WebP images' using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function app_private.enforce_defect_photo_rules() from public, anon, authenticated;

drop trigger if exists defect_photos_enforce_rules on public.defect_photos;
create trigger defect_photos_enforce_rules
before insert on public.defect_photos
for each row execute function app_private.enforce_defect_photo_rules();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'defect_photos'
  ) then
    alter publication supabase_realtime add table public.defect_photos;
  end if;
end $$;

notify pgrst, 'reload schema';
