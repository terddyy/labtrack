create or replace function public.bootstrap_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_email text;
  profile_full_name text;
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

  insert into public.profiles (id, email, full_name)
  values (new.id, profile_email, profile_full_name)
  on conflict do nothing;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'on_auth_user_created_bootstrap_profile'
      and tgrelid = 'auth.users'::regclass
  ) then
    create trigger on_auth_user_created_bootstrap_profile
      after insert on auth.users
      for each row execute function public.bootstrap_profile_from_auth_user();
  end if;
end;
$$;

create or replace function app_private.defect_photo_report_id(object_name text)
returns uuid
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  report_id_text text;
begin
  report_id_text := (storage.foldername(object_name))[1];

  if report_id_text is null then
    return null;
  end if;

  return report_id_text::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

insert into storage.buckets (id, name, public)
values ('defect-photos', 'defect-photos', false)
on conflict (id) do update
set public = false;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Defect photo participants can read objects'
  ) then
    create policy "Defect photo participants can read objects"
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'defect-photos'
        and (
          app_private.is_admin()
          or exists (
            select 1
            from public.defect_reports dr
            where dr.id = app_private.defect_photo_report_id(name)
              and dr.instructor_id = (select auth.uid())
          )
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Defect photo participants can upload objects'
  ) then
    create policy "Defect photo participants can upload objects"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'defect-photos'
        and (
          app_private.is_admin()
          or exists (
            select 1
            from public.defect_reports dr
            where dr.id = app_private.defect_photo_report_id(name)
              and dr.instructor_id = (select auth.uid())
          )
        )
      );
  end if;
end;
$$;

create unique index if not exists ticket_threads_one_booking_thread
  on public.ticket_threads (booking_id)
  where subject_type = 'booking' and booking_id is not null;

create unique index if not exists ticket_threads_one_defect_report_thread
  on public.ticket_threads (defect_report_id)
  where subject_type = 'defect_report' and defect_report_id is not null;

create unique index if not exists defect_photos_storage_path_key
  on public.defect_photos (storage_path);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_email_not_blank'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_email_not_blank
      check (btrim(email) <> '') not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_full_name_not_blank'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_full_name_not_blank
      check (btrim(full_name) <> '') not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'defect_photos_storage_path_not_blank'
      and conrelid = 'public.defect_photos'::regclass
  ) then
    alter table public.defect_photos
      add constraint defect_photos_storage_path_not_blank
      check (btrim(storage_path) <> '') not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'defect_photos_storage_path_matches_report'
      and conrelid = 'public.defect_photos'::regclass
  ) then
    alter table public.defect_photos
      add constraint defect_photos_storage_path_matches_report
      check (
        app_private.defect_photo_report_id(storage_path) is not null
        and app_private.defect_photo_report_id(storage_path) = defect_report_id
      ) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ticket_messages_body_not_blank'
      and conrelid = 'public.ticket_messages'::regclass
  ) then
    alter table public.ticket_messages
      add constraint ticket_messages_body_not_blank
      check (btrim(body) <> '') not valid;
  end if;
end;
$$;

create index if not exists assets_category_id_idx
  on public.assets (category_id);
create index if not exists assets_location_id_idx
  on public.assets (location_id);
create index if not exists assets_created_by_idx
  on public.assets (created_by);
create index if not exists assets_active_status_idx
  on public.assets (status)
  where status <> 'retired';

create index if not exists asset_qr_codes_asset_id_idx
  on public.asset_qr_codes (asset_id);
create index if not exists asset_qr_codes_generated_by_idx
  on public.asset_qr_codes (generated_by);
create index if not exists asset_qr_codes_invalidated_by_idx
  on public.asset_qr_codes (invalidated_by);

create index if not exists bookings_asset_id_idx
  on public.bookings (asset_id);
create index if not exists bookings_instructor_status_created_idx
  on public.bookings (instructor_id, status, created_at desc);
create index if not exists bookings_decided_by_idx
  on public.bookings (decided_by);
create index if not exists bookings_status_start_idx
  on public.bookings (status, requested_start_at);

create index if not exists booking_events_booking_created_idx
  on public.booking_events (booking_id, created_at desc);
create index if not exists booking_events_actor_id_idx
  on public.booking_events (actor_id);

create index if not exists defect_reports_asset_id_idx
  on public.defect_reports (asset_id);
create index if not exists defect_reports_instructor_status_created_idx
  on public.defect_reports (instructor_id, status, created_at desc);
create index if not exists defect_reports_triaged_by_idx
  on public.defect_reports (triaged_by);

create index if not exists defect_photos_report_created_idx
  on public.defect_photos (defect_report_id, created_at desc);
create index if not exists defect_photos_uploaded_by_idx
  on public.defect_photos (uploaded_by);

create index if not exists ticket_messages_thread_created_idx
  on public.ticket_messages (thread_id, created_at);
create index if not exists ticket_messages_sender_id_idx
  on public.ticket_messages (sender_id);

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);
create index if not exists notifications_unread_recipient_idx
  on public.notifications (recipient_id, created_at desc)
  where read_at is null;

create index if not exists device_push_tokens_user_id_idx
  on public.device_push_tokens (user_id);

create index if not exists audit_logs_actor_created_idx
  on public.audit_logs (actor_id, created_at desc);
create index if not exists audit_logs_entity_idx
  on public.audit_logs (entity_table, entity_id);
