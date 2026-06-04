# LABTRACK

LABTRACK is a hardware asset management system for the College of Computing Studies, Pampanga State University. This monorepo contains:

- `apps/web`: Next.js administrator and super admin dashboard.
- `apps/mobile`: Expo Android-first instructor app.
- `packages/shared`: shared TypeScript domain logic, schemas, QR helpers, and validation utilities.
- `supabase/migrations`: Supabase database schema, row-level security policies, storage setup, and RPCs.
- `docs`: architecture, status, and deployment notes.

## Requirements

- Node.js `20.9.0` or newer.
- npm, using the root `package-lock.json`.
- A Supabase project with the migrations in `supabase/migrations` applied.
- For the mobile app: Expo tooling and either Expo Go, an Android emulator, or a physical Android device.

## 1. Install dependencies

Run this from the repository root:

```bash
npm install
```

## 2. Configure environment variables

Create local env files from the examples:

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
```

On Windows PowerShell:

```powershell
Copy-Item apps/web/.env.example apps/web/.env.local
Copy-Item apps/mobile/.env.example apps/mobile/.env
```

Fill in the Supabase values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

The quick-login values are already included in the example files for local demo use.

## 3. Prepare the shared package

Build the shared workspace before running apps that import `@labtrack/shared`:

```bash
npm run build:shared
```

## 4. Run the web app

Start the Next.js dashboard:

```bash
npm run dev:web
```

Open:

```text
http://localhost:3000
```

For a production-style local run:

```bash
npm run build
npm run start -w @labtrack/web
```

## 5. Run the mobile app

Start Expo:

```bash
npm run dev:mobile
```

Then use the Expo terminal options to open the app on Android, Expo Go, or a connected device.

For a development client:

```bash
npm run dev:mobile:dev-client
```

To create an Android development build with EAS:

```bash
npm run build:mobile:android:development
```

## Supabase setup

For local Supabase development, see `supabase/README.md`.

For a hosted Supabase project, apply the migrations in `supabase/migrations` in filename order. After applying migrations, create or confirm at least one active `super_admin` profile in `public.profiles`.

## Demo login

The web and mobile sign-in screens expose one-click demo buttons for:

- `superadmin@gmail.com`
- `admin@gmail.com`
- `instructor@gmail.com`

The default password is:

```text
demo123
```

Create these users in Supabase Auth and make sure their `public.profiles` rows have matching active roles.

## Useful commands

```bash
npm run build:shared
npm run dev:web
npm run dev:mobile
npm run test
npm run typecheck
npm run build
```

## Troubleshooting

- If either app reports missing Supabase config, check the env file for that app and restart the dev server.
- If imports from `@labtrack/shared` fail, run `npm run build:shared` again.
- If the web app cannot sign in, confirm the Supabase Auth user exists and has an active `admin` or `super_admin` row in `public.profiles`.
- If the mobile app cannot access instructor workflows, confirm the signed-in user has an active `instructor` profile.
