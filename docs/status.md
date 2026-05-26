# LABTRACK Implementation Status

Last updated: 2026-05-22

## Implemented

- Shared QR parser now safely rejects malformed payloads, extra segments, blank decoded codes, and invalid percent encoding.
- Shared package exports backend DTO/input contracts plus planned RPC names and PostgREST `p_*` argument names.
- Supabase migration adds QR-gated asset lookup, atomic QR regeneration, guarded booking transitions, guarded defect triage, ticket message helpers, notification read RPC, audit logging, notification generation, and tighter asset/QR RLS.
- Participant read RLS now requires an active profile for instructor access to bookings, defects/photos, tickets/messages, notifications, push tokens, and defect-photo storage objects.
- Web admin dashboard has real section navigation, asset/QR operations, booking decisions, checkout/return/cancel actions, defect triage actions, ticket reading/replies, super-admin access management, and catalog creation.
- Mobile app has auth/config handling, route-level active-profile gates, live QR asset lookup, booking creation/cancellation, defect report creation, ticket thread/message screens, notification list/read flow, and Expo push token registration helper.
- Web and mobile sign-in screens expose public quick-login buttons for super admin, admin, and instructor demo accounts.
- CI workflow runs install, shared tests, typecheck, and build.
- Local ignored env files are configured for the provided Supabase project in `apps/web/.env.local` and `apps/mobile/.env`.

## Remaining Work

- Apply and verify Supabase migrations `202605180001`, `202605200001`, and `202605220001` against the hosted project. This environment only has the publishable key; it does not have Supabase CLI, `psql`, a DB password, or service-role/admin credentials.
- Promote or verify at least one active `super_admin` profile in the hosted project after migrations are applied.
- Add automated web and mobile component/E2E tests beyond the shared package tests.
- Add a real EAS project id in `apps/mobile/app.json` before production push notifications.
- Consider splitting the large web admin dashboard into smaller components after the functional surface stabilizes.

## Current Verification

```powershell
npm run test
npm run typecheck
npm run build
npx expo config --type public # from apps/mobile
```

These commands pass locally. Supabase auth settings also respond with HTTP 200 using the provided publishable key, and the local web dev server responds with HTTP 200 at `http://127.0.0.1:3000`.
