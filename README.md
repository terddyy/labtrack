# LABTRACK

LABTRACK is a hardware asset management system for the College of Computing Studies, Pampanga State University. It includes a Next.js web app for administrators, an Expo Android app for instructors, shared TypeScript domain logic, and a Supabase backend schema.

## Workspace

- `apps/web`: administrator and super admin dashboard.
- `apps/mobile`: Android-first instructor app.
- `packages/shared`: roles, statuses, QR helpers, and validation utilities shared by both apps.
- `supabase/migrations`: database schema, RLS policies, storage setup, and seed hooks.
- `docs/architecture.md`: polished architecture document.

## Commands

```bash
npm install
npm run build:shared
npm run dev:web
npm run dev:mobile
npm run typecheck
```

Copy each app's `.env.example` to `.env.local` or `.env` and fill in Supabase values before connecting to a live project.
