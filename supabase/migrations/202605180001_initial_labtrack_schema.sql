create extension if not exists "pgcrypto";

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;

create type public.user_role as enum ('super_admin', 'admin', 'instructor');
create type public.asset_status as enum ('available', 'reserved', 'checked_out', 'under_review', 'for_repair', 'retired');
create type public.asset_condition as enum ('excellent', 'good', 'fair', 'defective', 'for_repair', 'retired');
create type public.booking_status as enum ('pending', 'approved', 'rejected', 'cancelled', 'checked_out', 'returned');
create type public.defect_status as enum ('pending', 'under_review', 'sent_for_repair', 'resolved', 'rejected');
create type public.thread_subject_type as enum ('booking', 'defect_report');
create type public.notification_type as enum ('booking_update', 'defect_update', 'ticket_message', 'system');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role public.user_role not null default 'instructor',
  department text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.asset_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  property_number text not null unique,
  serial_number text,
  name text not null,
  category_id uuid not null references public.asset_categories(id),
  location_id uuid not null references public.locations(id),
  condition public.asset_condition not null default 'good',
  status public.asset_status not null default 'available',
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.asset_qr_codes (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  code text not null unique,
  is_active boolean not null default true,
  generated_by uuid references public.profiles(id),
  generated_at timestamptz not null default now(),
  invalidated_at timestamptz,
  invalidated_by uuid references public.profiles(id),
  constraint asset_qr_active_invalidation check (
    (is_active = true and invalidated_at is null) or (is_active = false)
  )
);

create unique index asset_qr_codes_one_active_per_asset
  on public.asset_qr_codes(asset_id)
  where is_active;

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id),
  instructor_id uuid not null references public.profiles(id),
  requested_start_at timestamptz not null,
  requested_end_at timestamptz not null,
  purpose text not null,
  status public.booking_status not null default 'pending',
  decided_by uuid references public.profiles(id),
  decided_at timestamptz,
  decision_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_valid_range check (requested_end_at > requested_start_at)
);

create table public.booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  from_status public.booking_status,
  to_status public.booking_status not null,
  notes text,
  created_at timestamptz not null default now()
);

create table public.defect_reports (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id),
  instructor_id uuid not null references public.profiles(id),
  title text not null,
  description text not null,
  status public.defect_status not null default 'pending',
  triaged_by uuid references public.profiles(id),
  triaged_at timestamptz,
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.defect_photos (
  id uuid primary key default gen_random_uuid(),
  defect_report_id uuid not null references public.defect_reports(id) on delete cascade,
  storage_path text not null,
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.ticket_threads (
  id uuid primary key default gen_random_uuid(),
  subject_type public.thread_subject_type not null,
  booking_id uuid references public.bookings(id) on delete cascade,
  defect_report_id uuid references public.defect_reports(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint ticket_thread_exact_subject check (
    (subject_type = 'booking' and booking_id is not null and defect_report_id is null)
    or
    (subject_type = 'defect_report' and defect_report_id is not null and booking_id is null)
  )
);

create table public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.ticket_threads(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null default 'android',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_table text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function app_private.current_user_role()
returns public.user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid() and is_active = true
$$;

create or replace function app_private.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(app_private.current_user_role() in ('admin', 'super_admin'), false)
$$;

create or replace function app_private.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(app_private.current_user_role() = 'super_admin', false)
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger assets_touch_updated_at before update on public.assets
  for each row execute function public.touch_updated_at();
create trigger bookings_touch_updated_at before update on public.bookings
  for each row execute function public.touch_updated_at();
create trigger defect_reports_touch_updated_at before update on public.defect_reports
  for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.asset_categories enable row level security;
alter table public.locations enable row level security;
alter table public.assets enable row level security;
alter table public.asset_qr_codes enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_events enable row level security;
alter table public.defect_reports enable row level security;
alter table public.defect_photos enable row level security;
alter table public.ticket_threads enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.device_push_tokens enable row level security;
alter table public.audit_logs enable row level security;

create policy "Profiles can read self" on public.profiles
  for select using (id = auth.uid() or app_private.is_admin());

create policy "Super admins manage profiles" on public.profiles
  for all using (app_private.is_super_admin()) with check (app_private.is_super_admin());

create policy "Admins read catalog tables" on public.asset_categories
  for select using (app_private.is_admin());
create policy "Admins manage catalog tables" on public.asset_categories
  for all using (app_private.is_admin()) with check (app_private.is_admin());

create policy "Admins read locations" on public.locations
  for select using (app_private.is_admin());
create policy "Admins manage locations" on public.locations
  for all using (app_private.is_admin()) with check (app_private.is_admin());

create policy "Authenticated users read active assets" on public.assets
  for select using (auth.role() = 'authenticated' and status <> 'retired');
create policy "Admins manage assets" on public.assets
  for all using (app_private.is_admin()) with check (app_private.is_admin());

create policy "Authenticated users resolve active QR codes" on public.asset_qr_codes
  for select using (auth.role() = 'authenticated' and is_active = true);
create policy "Admins manage QR codes" on public.asset_qr_codes
  for all using (app_private.is_admin()) with check (app_private.is_admin());

create policy "Instructors create own bookings" on public.bookings
  for insert with check (instructor_id = auth.uid());
create policy "Booking participants read bookings" on public.bookings
  for select using (instructor_id = auth.uid() or app_private.is_admin());
create policy "Instructors cancel own pending bookings" on public.bookings
  for update using (instructor_id = auth.uid() and status = 'pending')
  with check (instructor_id = auth.uid() and status = 'cancelled');
create policy "Admins manage bookings" on public.bookings
  for all using (app_private.is_admin()) with check (app_private.is_admin());

create policy "Booking participants read events" on public.booking_events
  for select using (
    app_private.is_admin()
    or exists (
      select 1 from public.bookings b
      where b.id = booking_events.booking_id and b.instructor_id = auth.uid()
    )
  );
create policy "Admins create booking events" on public.booking_events
  for insert with check (app_private.is_admin());

create policy "Instructors create own defect reports" on public.defect_reports
  for insert with check (instructor_id = auth.uid());
create policy "Defect participants read reports" on public.defect_reports
  for select using (instructor_id = auth.uid() or app_private.is_admin());
create policy "Admins manage defect reports" on public.defect_reports
  for all using (app_private.is_admin()) with check (app_private.is_admin());

create policy "Defect participants read photos" on public.defect_photos
  for select using (
    app_private.is_admin()
    or exists (
      select 1 from public.defect_reports dr
      where dr.id = defect_photos.defect_report_id and dr.instructor_id = auth.uid()
    )
  );
create policy "Instructors upload own defect photos" on public.defect_photos
  for insert with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.defect_reports dr
      where dr.id = defect_photos.defect_report_id and dr.instructor_id = auth.uid()
    )
  );
create policy "Admins manage defect photos" on public.defect_photos
  for all using (app_private.is_admin()) with check (app_private.is_admin());

create policy "Ticket participants read threads" on public.ticket_threads
  for select using (
    app_private.is_admin()
    or exists (
      select 1 from public.bookings b
      where b.id = ticket_threads.booking_id and b.instructor_id = auth.uid()
    )
    or exists (
      select 1 from public.defect_reports dr
      where dr.id = ticket_threads.defect_report_id and dr.instructor_id = auth.uid()
    )
  );
create policy "Admins create threads" on public.ticket_threads
  for insert with check (app_private.is_admin());
create policy "Instructors create own booking threads" on public.ticket_threads
  for insert with check (
    subject_type = 'booking'
    and exists (select 1 from public.bookings b where b.id = booking_id and b.instructor_id = auth.uid())
  );
create policy "Instructors create own defect threads" on public.ticket_threads
  for insert with check (
    subject_type = 'defect_report'
    and exists (select 1 from public.defect_reports dr where dr.id = defect_report_id and dr.instructor_id = auth.uid())
  );

create policy "Ticket participants read messages" on public.ticket_messages
  for select using (
    app_private.is_admin()
    or exists (
      select 1
      from public.ticket_threads tt
      left join public.bookings b on b.id = tt.booking_id
      left join public.defect_reports dr on dr.id = tt.defect_report_id
      where tt.id = ticket_messages.thread_id
      and (b.instructor_id = auth.uid() or dr.instructor_id = auth.uid())
    )
  );
create policy "Ticket participants send messages" on public.ticket_messages
  for insert with check (
    sender_id = auth.uid()
    and (
      app_private.is_admin()
      or exists (
        select 1
        from public.ticket_threads tt
        left join public.bookings b on b.id = tt.booking_id
        left join public.defect_reports dr on dr.id = tt.defect_report_id
        where tt.id = ticket_messages.thread_id
        and (b.instructor_id = auth.uid() or dr.instructor_id = auth.uid())
      )
    )
  );

create policy "Users read own notifications" on public.notifications
  for select using (recipient_id = auth.uid() or app_private.is_admin());
create policy "Users mark own notifications read" on public.notifications
  for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy "Admins create notifications" on public.notifications
  for insert with check (app_private.is_admin());

create policy "Users manage own push tokens" on public.device_push_tokens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Admins read push tokens" on public.device_push_tokens
  for select using (app_private.is_admin());

create policy "Admins read audit logs" on public.audit_logs
  for select using (app_private.is_admin());
create policy "Admins create audit logs" on public.audit_logs
  for insert with check (app_private.is_admin());

insert into public.asset_categories (name, description) values
  ('Laptop', 'Portable computers used in laboratory and classroom activities'),
  ('Projector', 'Display equipment used for instruction'),
  ('Networking', 'Routers, switches, and networking laboratory devices')
on conflict (name) do nothing;

insert into public.locations (name, description) values
  ('CCS Laboratory 1', 'Primary computing laboratory'),
  ('Multimedia Room', 'Room for presentations and demonstrations'),
  ('Network Laboratory', 'Networking and systems laboratory')
on conflict (name) do nothing;
