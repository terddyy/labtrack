# LABTRACK Deployment Checklist

## Supabase

- Install Supabase CLI and `psql` on the deployment workstation.
- Link the hosted project with `supabase link --project-ref mpafbjqqgpcznycjjiqp`.
- Apply all migrations in `supabase/migrations` filename order.
- Verify the workflow RPCs exist and are executable by authenticated users: QR lookup/regeneration, booking create/cancel/decide/checkout/return, defect create/triage, ticket thread/message, and notification read.
- Verify the Supabase Auth Before User Created hook is configured to call `public.hook_restrict_signup_by_email_domain`.
- Confirm `public.registration_settings` is restricted by default and `public.university_email_domains` includes the allowed school domain.
- Create or confirm an active `super_admin` row in `public.profiles`.
- Smoke test with real accounts: instructor QR lookup, booking request, defect report, ticket message, notification read; admin asset/QR, booking, defect, ticket, catalog; super-admin profile management.

## Web

- Set Vercel environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Deploy after `npm run test`, `npm run typecheck`, and `npm run build` pass.
- Sign in with active admin and super-admin accounts and verify the dashboard sections load from hosted Supabase.
- If using quick-login buttons, create matching Supabase Auth users and active profile roles for `superadmin@pampangastateu.edu.ph`, `custodian@pampangastateu.edu.ph`, and `faculty@pampangastateu.edu.ph`, or override the public quick-login env variables.

## Mobile

- Set Expo/EAS environment variables:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Replace `apps/mobile/app.json` `extra.eas.projectId` with the real EAS project ID from `eas init` or the Expo dashboard.
- Follow `docs/mobile-apk-release.md` for production APK versioning and EAS cloud builds.
- Test on a physical Android device for camera scanning and Expo push-token registration.
