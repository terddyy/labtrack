# LABTRACK Supabase Setup

This directory contains the database schema and security model for LABTRACK.
Start the server 
npm run dev:mobile:dev-client
## Apply locally

```bash
supabase start
supabase db reset
```

## Weekly keepalive cron

Migration `202605310002_weekly_keepalive_cron.sql` enables `pg_cron` and schedules `labtrack-weekly-keepalive` every Friday at 09:00 UTC:

```sql
select cron.schedule(
  'labtrack-weekly-keepalive',
  '0 9 * * 5',
  $$ insert into app_private.supabase_keepalive_events (note) values ('weekly Friday keepalive activity'); $$
);
```

Each run inserts one private audit row into `app_private.supabase_keepalive_events`.

## First Super Admin

Create the first user in Supabase Auth. New email-based Auth users are automatically bootstrapped into `public.profiles` with the default `instructor` role, so promote the first administrator after signup.

Registration is restricted to active rows in `public.university_email_domains` by default, so use an allowed school domain for self-signup or create the first user with Supabase admin tooling before the auth hook is enabled:

```sql
insert into public.profiles (id, email, full_name, role, department)
values (
  '<auth-user-id>',
  'superadmin@pampangastateu.edu.ph',
  'CCS Super Admin',
  'super_admin',
  'College of Computing Studies'
)
on conflict (id) do update set role = 'super_admin', is_active = true;
```

## Storage

The `defect-photos` bucket is created by migration as a private bucket. Store object names as `<defect_report_id>/<filename>` and persist the same relative object name in `defect_photos.storage_path`; Storage RLS and a table check constraint both rely on that convention.

## Phase 1 RPC and RLS model

Authenticated users must have an active `public.profiles` row for instructor-facing operational access. The hardening migration keeps self-profile reads available so the clients can show an inactive-account state, but participant reads for bookings, booking events, defect reports/photos, ticket threads/messages, notifications, device push tokens, and defect-photo storage objects are restricted to active profiles. Admin access also requires an active admin or super-admin profile.

Instructor asset lookup is QR-scoped. Instructors cannot directly enumerate `public.assets` or active rows in `public.asset_qr_codes`; authenticated clients should call `public.resolve_asset_by_qr_code(text)` with the PostgREST payload key `p_qr_code`, which returns only instructor-safe, non-retired asset details for an active QR code. Admins retain direct asset and QR management policies, but QR replacement should use `public.regenerate_asset_qr(uuid, text)` with `p_asset_id` and `p_qr_code` so the old active QR is invalidated, the new row is inserted atomically, and an audit log is written.

Booking lifecycle mutations are RPC-backed. Instructors should create requests with `public.create_booking(uuid, timestamptz, timestamptz, text)` using `p_asset_id`, `p_requested_start_at`, `p_requested_end_at`, and `p_purpose` so the booking event and ticket thread are created consistently. Cancellation and admin decisions/check-out/return should use `public.cancel_booking(uuid)`, `public.decide_booking(uuid, booking_status, text)`, `public.checkout_booking(uuid, text)`, and `public.return_booking(uuid, text)` with the `p_*` payload names from the migration. These functions validate status transitions, guard overlapping approved or checked-out bookings, write `booking_events`, update asset status, notify the instructor, and audit admin actions.

Defect workflow mutations are also RPC-backed. Use `public.create_defect_report(uuid, text, text)` with `p_asset_id`, `p_title`, and `p_description`, and `public.triage_defect_report(uuid, defect_status, text)` with `p_defect_report_id`, `p_status`, and `p_notes` instead of direct defect report inserts or admin status updates. Both functions keep asset status synchronized; both return the ensured ticket thread id with the defect report payload, and admin triage notifies the reporting instructor and writes an audit log.

Ticket and notification writes should use helpers. Use `public.ensure_ticket_thread(thread_subject_type, uuid, uuid)` to create or fetch the one thread for a booking or defect report; pass `p_subject_type`, `p_booking_id`, and `p_defect_report_id`. Use `public.send_ticket_message(uuid, text)` with `p_thread_id` and `p_body` to send participant-checked ticket messages with notifications, and `public.mark_notification_read(uuid)` with `p_notification_id` to mark only the caller's own notification read. Direct notification read updates are intentionally closed so clients cannot modify other notification columns.
