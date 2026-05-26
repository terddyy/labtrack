# LABTRACK Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete LABTRACK from the current asset/QR prototype-plus-slice into a usable V1 with secured Supabase workflows, real admin operations, real instructor mobile flows, tests, and deployment readiness.

**Architecture:** Keep Supabase as the source of truth and move sensitive workflow transitions into database RPCs/triggers so web and mobile clients cannot bypass lifecycle rules. Split the current large admin dashboard and prototype mobile screens into focused data modules while preserving existing UI style and shared TypeScript validation.

**Tech Stack:** TypeScript monorepo, Next.js App Router web app, Expo Router Android app, Supabase Auth/Postgres/RLS/Storage/Realtime, shared Zod schemas, Node test runner, future Playwright/React Native test coverage.

---

## Audit Snapshot

### Currently Implemented

- Monorepo structure for `apps/web`, `apps/mobile`, `packages/shared`, and `supabase/migrations`.
- Supabase schema for profiles, catalogs, assets, QR codes, bookings, defects, photos, tickets, notifications, push tokens, and audit logs.
- Backend hardening migration for auth profile bootstrap, defect photo storage bucket/policies, uniqueness/indexes, and several constraints.
- Web admin auth gate for active `admin` and `super_admin` profiles.
- Web Supabase-backed asset list, asset creation, QR generation/regeneration, QR preview, and QR PNG download.
- Expo camera scan screen with camera permission handling, QR-only scanner, parse gate, invalid-code feedback, and navigation lock.
- Shared QR helpers, status constants, schemas, types, and a small shared test suite.
- Root typecheck passes.

### Not Implemented Yet

- Backend QR-gated instructor asset lookup. Current RLS lets any authenticated user enumerate all non-retired assets and active QR codes.
- Backend lifecycle RPCs/triggers for booking approval, rejection, checkout, return, cancellation integrity, defect triage, ticket bootstrap, notifications, audit logs, and asset status synchronization.
- Atomic QR regeneration. Current web flow invalidates then inserts in separate client calls.
- Column-safe notification read updates and booking cancellation. Current RLS permits too much row mutation.
- Shared backend-aligned DTO/database types. Current shared `Asset` is a view model, not a database-facing type.
- Web admin navigation. Sidebar buttons are inert.
- Web booking queue actions, checkout/return flow, defect triage, defect photo review, ticket chat, notifications, audit log view, catalog management, and super-admin account management.
- Web recovery from forbidden auth state and explicit QR download failure notices.
- Mobile authentication/session gate.
- Mobile Supabase data layer and all live reads/writes.
- Mobile QR asset lookup against active backend QR codes.
- Mobile booking form state, validation, date/time entry, submission, cancellation, and status tracking.
- Mobile defect form state, validation, optional photo upload, submission, status tracking, and detail view.
- Mobile ticket thread selection, message list, composer, send action, timestamps, and realtime/polling.
- Mobile notification permission registration, Expo push token persistence, in-app notification list, and notification handlers.
- Mobile primary navigation to bookings/reports/tickets; current screens are mostly dead-end mock views.
- App-level tests for web/mobile and migration/RLS behavior.
- CI workflow, lint/static-quality gate, deployment docs, Supabase local config docs, real EAS project configuration, and status matrix docs.

## Execution Strategy

Work in parallel only where write scopes do not overlap. Backend schema and shared client contracts are the dependency root, so implement those first. After backend RPC names and DTOs are stable, web and mobile agents can work concurrently against the same contracts.

### Parallel Workstreams

- **Backend Agent:** Owns `supabase/migrations/**` and backend behavior docs only.
- **Shared Contracts Agent:** Owns `packages/shared/src/**`, `packages/shared/test/**`, and generated/handwritten DTO helpers.
- **Web Agent:** Owns `apps/web/**` except global dependency/config changes.
- **Mobile Agent:** Owns `apps/mobile/**` except global dependency/config changes.
- **QA/Docs Agent:** Owns `.github/**`, root docs, README files, and test harness config after backend/shared contracts are settled.

Do not run implementation agents in parallel against the same file. Do not let any agent revert existing uncommitted edits. Before editing a file, each agent must inspect its current state and adapt to it.

## Phase 0: Stabilize Contracts And Safety

### Task 0.1: Preserve Current Worktree State

**Files:**
- Read: `git status --short --branch`
- Read: all files before editing them

- [ ] Confirm the branch and dirty files before implementation.

Run:

```powershell
git status --short --branch
```

Expected: current dirty worktree is visible. Do not revert unrelated changes.

- [ ] If implementation starts, create or switch to a prefixed branch before code edits.

Run:

```powershell
git switch -c codex/labtrack-completion
```

Expected: branch creation succeeds, unless already on a feature branch.

### Task 0.2: Harden QR Parsing

**Files:**
- Modify: `packages/shared/src/qr.ts`
- Modify: `packages/shared/test/qr-schema.test.mjs`

- [ ] Add tests for malformed percent encoding, extra separators, blank decoded code, and valid encoded code with spaces/symbols.

Expected behaviors:

```ts
parseQrPayload("LABTRACK:v1:%E0%A4%A") === null
parseQrPayload("LABTRACK:v1:ASSET-123:EXTRA") === null
parseQrPayload("LABTRACK:v1:%20%20") === null
parseQrPayload(createQrPayload("ASSET LT/001")).code === "ASSET LT/001"
```

- [ ] Update `parseQrPayload` so it requires exactly three colon-separated segments and catches `decodeURIComponent` errors.
- [ ] Run shared tests.

Run:

```powershell
npm run test -w @labtrack/shared
```

Expected: all shared tests pass.

### Task 0.3: Define Backend DTOs And RPC Names

**Files:**
- Modify: `packages/shared/src/types.ts`
- Modify: `packages/shared/src/schemas.ts`
- Modify: `packages/shared/src/index.ts`
- Create: `packages/shared/src/backend.ts`
- Modify: `packages/shared/test/qr-schema.test.mjs` or add focused tests

- [ ] Add shared DTOs for instructor asset lookup, admin asset row, booking row, defect row, ticket thread row, ticket message row, notification row, and profile row.
- [ ] Keep existing app-facing types if current UI imports them, but label database DTOs distinctly.
- [ ] Add schemas for booking decision input, checkout input, return input, cancellation input, defect triage input, ticket message input, notification read input, and QR regeneration input.
- [ ] Export all new DTOs/schemas through `index.ts`.
- [ ] Add schema tests for valid and invalid lifecycle inputs.
- [ ] Run:

```powershell
npm run test -w @labtrack/shared
npm run typecheck -w @labtrack/shared
```

Expected: tests and typecheck pass.

## Phase 1: Backend Completion

### Task 1.1: Add Secure QR Asset Resolution

**Files:**
- Create: `supabase/migrations/202605220001_workflow_rpc_security.sql`
- Modify: `supabase/README.md`

- [ ] Add a `public.resolve_asset_by_qr_code(qr_code text)` RPC callable by authenticated users.
- [ ] Return only instructor-safe fields: asset id, property number, serial number, name, category name, location name, condition, status, active QR code, and generated timestamp.
- [ ] Require `asset_qr_codes.is_active = true` and `assets.status <> 'retired'`.
- [ ] Replace broad instructor read policies with admin-only direct table reads plus QR RPC access.
- [ ] Keep admins able to manage assets and QR codes.
- [ ] Document the mobile lookup path in `supabase/README.md`.

Verification:

```powershell
npm run typecheck
```

Expected: app typecheck still passes after shared contract updates.

Manual Supabase-local verification after config exists:

```powershell
supabase db reset
```

Expected: migrations apply cleanly and an authenticated instructor can resolve only an active QR code.

### Task 1.2: Add Atomic QR Regeneration RPC

**Files:**
- Modify: `supabase/migrations/202605220001_workflow_rpc_security.sql`
- Modify: `packages/shared/src/schemas.ts`

- [ ] Add `public.regenerate_asset_qr(asset_id uuid, qr_code text)` for admins only.
- [ ] In one transaction, lock the asset QR rows, invalidate the current active QR, insert the replacement QR, and return the new QR row.
- [ ] Write an audit log row with action `asset_qr.regenerate`.
- [ ] Ensure duplicate QR code violations return a useful error to clients.

Acceptance:

- Regeneration cannot leave an asset without an active QR if insert fails.
- The unique active QR constraint remains in place.

### Task 1.3: Guard Booking Mutations

**Files:**
- Modify: `supabase/migrations/202605220001_workflow_rpc_security.sql`
- Modify: `packages/shared/src/schemas.ts`

- [ ] Replace direct instructor booking cancellation updates with `public.cancel_booking(booking_id uuid)`.
- [ ] Add `public.decide_booking(booking_id uuid, next_status public.booking_status, decision_notes text)` for admin approval/rejection.
- [ ] Add `public.checkout_booking(booking_id uuid, notes text)` for admin checkout.
- [ ] Add `public.return_booking(booking_id uuid, notes text)` for admin return.
- [ ] Each transition must validate the current status before changing it:
  - pending -> approved
  - pending -> rejected
  - pending -> cancelled by owner
  - approved -> checked_out
  - checked_out -> returned
- [ ] Each transition must insert `booking_events`.
- [ ] Each admin transition must notify the instructor.
- [ ] Checkout/return must update the asset status consistently.
- [ ] Add overlap protection for approved/checked-out bookings on the same asset and overlapping time range.

Acceptance:

- Instructors cannot alter `asset_id`, purpose, requested times, or status except through cancellation.
- Admins cannot checkout rejected/cancelled/returned bookings.
- Asset status changes are deterministic.

### Task 1.4: Guard Defect Lifecycle

**Files:**
- Modify: `supabase/migrations/202605220001_workflow_rpc_security.sql`
- Modify: `packages/shared/src/schemas.ts`

- [ ] Add `public.create_defect_report(asset_id uuid, title text, description text)` for instructors.
- [ ] Add `public.triage_defect_report(defect_report_id uuid, next_status public.defect_status, resolution_notes text)` for admins.
- [ ] On creation, create or ensure a defect ticket thread.
- [ ] On admin status changes, notify the instructor and write audit logs.
- [ ] Define asset status side effects:
  - pending/under_review -> `under_review`
  - sent_for_repair -> `for_repair`
  - resolved -> restore to `available` unless another active defect exists
  - rejected -> leave or restore according to active defects
- [ ] Keep photo table/storage policy convention: `<defect_report_id>/<filename>`.

Acceptance:

- Defect reports generate consistent tickets and notifications.
- Asset condition/status updates are not left to clients.

### Task 1.5: Add Ticket And Notification Helpers

**Files:**
- Modify: `supabase/migrations/202605220001_workflow_rpc_security.sql`
- Modify: `packages/shared/src/schemas.ts`

- [ ] Add `public.ensure_ticket_thread(subject_type, booking_id, defect_report_id)` with participant checks.
- [ ] Add `public.send_ticket_message(thread_id uuid, body text)` with participant checks.
- [ ] Add `public.mark_notification_read(notification_id uuid)` so users can only change `read_at`.
- [ ] Add private helper functions for notification insertion and audit logging.
- [ ] Keep direct table policies restrictive enough that clients prefer RPCs.

Acceptance:

- A ticket has exactly one thread per booking/defect, enforced by existing unique indexes.
- Ticket messages create `ticket_message` notifications for the opposite participant group where possible.

## Phase 2: Web Admin Completion

### Task 2.1: Split Admin Dashboard Into Views

**Files:**
- Modify: `apps/web/components/admin-dashboard.tsx`
- Create: `apps/web/components/admin/types.ts`
- Create: `apps/web/components/admin/shell.tsx`
- Create: `apps/web/components/admin/asset-register.tsx`
- Create: `apps/web/components/admin/booking-queue.tsx`
- Create: `apps/web/components/admin/defect-triage.tsx`
- Create: `apps/web/components/admin/ticket-center.tsx`
- Create: `apps/web/components/admin/access-management.tsx`
- Create: `apps/web/components/admin/catalog-management.tsx`

- [ ] Introduce local view state for `dashboard`, `assets`, `qr`, `bookings`, `defects`, `tickets`, `access`, and `catalog`.
- [ ] Move existing asset and QR UI into `asset-register.tsx`.
- [ ] Make sidebar buttons switch views and show active state.
- [ ] Keep the access gate in the top-level component.
- [ ] Preserve existing visual style and CSS classes where possible.

Verification:

```powershell
npm run typecheck -w @labtrack/web
```

Expected: web typecheck passes.

### Task 2.2: Use Atomic QR RPC In Web

**Files:**
- Modify: `apps/web/components/admin/asset-register.tsx`
- Modify: `apps/web/components/admin-dashboard.tsx` if QR functions remain there

- [ ] Replace client-side invalidate-then-insert with `regenerate_asset_qr`.
- [ ] Keep single-action QR generation for assets without active QR.
- [ ] Show errors for duplicate code, permission denial, and missing asset.
- [ ] Make QR download failures visible in the dashboard notice state.
- [ ] Add switch-account/sign-out action in forbidden auth state.

Acceptance:

- QR regeneration cannot leave the UI showing stale state.
- Forbidden users can sign out without clearing site data manually.

### Task 2.3: Implement Booking Admin Workflow

**Files:**
- Modify/Create: `apps/web/components/admin/booking-queue.tsx`
- Modify: `apps/web/components/admin/types.ts`

- [ ] Query bookings with asset and instructor display fields.
- [ ] Show pending, approved, checked-out, returned, rejected, and cancelled groups.
- [ ] Add approve/reject actions using `decide_booking`.
- [ ] Add checkout action using `checkout_booking`.
- [ ] Add return action using `return_booking`.
- [ ] Show latest booking event history.
- [ ] Refresh data after every mutation.

Acceptance:

- Admins can complete pending -> approved -> checked_out -> returned.
- Rejected/cancelled/returned bookings do not show invalid actions.

### Task 2.4: Implement Defect Admin Workflow

**Files:**
- Modify/Create: `apps/web/components/admin/defect-triage.tsx`

- [ ] Query defect reports with asset and instructor display fields.
- [ ] Show defect photos when present.
- [ ] Add status transitions using `triage_defect_report`.
- [ ] Capture resolution notes.
- [ ] Link to the related ticket thread.
- [ ] Refresh asset status after triage.

Acceptance:

- Admins can move reports through under review, sent for repair, resolved, and rejected.
- The UI exposes photo evidence without public storage URLs.

### Task 2.5: Implement Ticket Center

**Files:**
- Modify/Create: `apps/web/components/admin/ticket-center.tsx`

- [ ] List ticket threads by recent activity.
- [ ] Filter by booking and defect threads.
- [ ] Load messages for selected thread.
- [ ] Add a message composer using `send_ticket_message`.
- [ ] Subscribe to message inserts when Realtime is enabled; otherwise add manual refresh.

Acceptance:

- Admin can read and reply to any booking/defect thread.

### Task 2.6: Implement Super-Admin Access Management

**Files:**
- Modify/Create: `apps/web/components/admin/access-management.tsx`

- [ ] Show profiles for super admins only.
- [ ] Allow role changes between `instructor`, `admin`, and `super_admin`.
- [ ] Allow activate/deactivate.
- [ ] Prevent the current super admin from deactivating or demoting their own last active super-admin access.
- [ ] Show read-only access-denied state for normal admins.

Acceptance:

- Super admins can manage admin access from the web app.

### Task 2.7: Implement Catalog Management

**Files:**
- Modify/Create: `apps/web/components/admin/catalog-management.tsx`

- [ ] Add CRUD for `asset_categories`.
- [ ] Add CRUD for `locations`.
- [ ] Show setup guidance when either catalog is empty.
- [ ] Prevent deleting catalogs that are referenced by assets, or surface the Supabase FK error clearly.

Acceptance:

- Admins can create the catalog rows required by asset creation.

## Phase 3: Mobile Instructor Completion

### Task 3.1: Add Mobile Auth And Config Gate

**Files:**
- Modify: `apps/mobile/lib/supabase.ts`
- Create: `apps/mobile/lib/auth.ts`
- Modify: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/app/sign-in.tsx`
- Modify: `apps/mobile/app/index.tsx`

- [ ] Show a missing-config state when env vars are absent.
- [ ] Add email/password sign-in and sign-out.
- [ ] Load the current profile and require active `instructor`, `admin`, or `super_admin` where appropriate; for V1 mobile, show instructor workspace for instructor accounts.
- [ ] Persist sessions using the existing SecureStore-backed Supabase auth storage.

Acceptance:

- No mobile live screen silently falls back to sample data when Supabase config is missing.

### Task 3.2: Add Mobile Data Layer

**Files:**
- Create: `apps/mobile/lib/labtrack-api.ts`
- Create: `apps/mobile/lib/async-state.ts`
- Modify: `apps/mobile/lib/sample-data.ts` or remove runtime imports

- [ ] Add functions for:
  - `resolveAssetByQrCode(code)`
  - `listMyBookings()`
  - `createBooking(input)`
  - `cancelBooking(id)`
  - `listMyDefectReports()`
  - `createDefectReport(input)`
  - `uploadDefectPhoto(reportId, uri)`
  - `listTicketThreads()`
  - `listTicketMessages(threadId)`
  - `sendTicketMessage(threadId, body)`
  - `listNotifications()`
  - `markNotificationRead(id)`
  - `upsertPushToken(token)`
- [ ] Normalize Supabase errors into user-facing error strings.
- [ ] Keep sample data only as non-runtime fixtures, or delete it once screens are live.

Acceptance:

- Mobile screens call one API layer rather than embedding Supabase queries in components.

### Task 3.3: Wire QR Asset Lookup And Asset Actions

**Files:**
- Modify: `apps/mobile/app/scan.tsx`
- Modify: `apps/mobile/app/asset/[payload].tsx`

- [ ] Keep local QR syntax validation in scanner.
- [ ] On asset screen, resolve parsed code through backend RPC.
- [ ] Show loading, invalid QR, unknown/inactive QR, permission denied, and network retry states separately.
- [ ] Replace sample asset matching with live lookup.
- [ ] Add controlled booking form with purpose, start date/time, and end date/time.
- [ ] Add controlled defect form with title, description, and optional photo attach flow.
- [ ] Disable submit buttons while mutations are pending.
- [ ] Navigate to the created booking/report or show a confirmation card.

Acceptance:

- Scanning a real active QR opens live asset details.
- Booking and defect buttons create real backend rows.

### Task 3.4: Wire Mobile Bookings And Reports

**Files:**
- Modify: `apps/mobile/app/bookings.tsx`
- Modify: `apps/mobile/app/reports.tsx`
- Create: `apps/mobile/app/booking/[id].tsx`
- Create: `apps/mobile/app/report/[id].tsx`

- [ ] Replace local arrays with live lists.
- [ ] Add loading, empty, error, and pull-to-refresh states.
- [ ] Add detail screens with status history and related ticket link.
- [ ] Allow cancelling pending bookings through `cancelBooking`.
- [ ] Show defect photo upload status and triage status.

Acceptance:

- Instructor can track live booking and defect records without sample data.

### Task 3.5: Wire Mobile Ticket Chat

**Files:**
- Modify: `apps/mobile/app/ticket.tsx`
- Create: `apps/mobile/app/ticket/[threadId].tsx`

- [ ] Replace hardcoded messages with live thread list and message detail route.
- [ ] Add message composer state and `sendTicketMessage`.
- [ ] Show sender, timestamp, and delivery/error state.
- [ ] Add manual refresh or Realtime subscription.

Acceptance:

- Instructor can continue a booking or defect conversation with admins.

### Task 3.6: Add Mobile Notifications

**Files:**
- Create: `apps/mobile/lib/notifications.ts`
- Create: `apps/mobile/app/notifications.tsx`
- Modify: `apps/mobile/app/_layout.tsx`
- Modify: `apps/mobile/app/index.tsx`
- Modify: `apps/mobile/app.json` if needed

- [ ] Request notification permission at an appropriate moment after sign-in.
- [ ] Register Expo push token and persist it with `upsertPushToken`.
- [ ] Add notification list and unread count.
- [ ] Mark notifications read via RPC.
- [ ] Handle tap-through to related booking, defect, or ticket when metadata is available.

Acceptance:

- Device tokens are stored and users can see in-app notification history.

### Task 3.7: Add Mobile Primary Navigation

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`
- Modify: `apps/mobile/app/index.tsx`

- [ ] Add clear entry points to scan, bookings, reports, tickets, and notifications.
- [ ] Remove or hide demo asset and hardcoded ticket shortcuts from production runtime.
- [ ] Keep navigation Android-first and task-focused.

Acceptance:

- A real instructor can complete all V1 workflows from the first screen.

## Phase 4: Quality, CI, And Deployment Readiness

### Task 4.1: Add Web Tests

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/tests/**`
- Create: `apps/web/playwright.config.ts` or equivalent

- [ ] Add tests for missing Supabase config state.
- [ ] Add tests for sign-in form rendering.
- [ ] Add mocked Supabase tests for asset creation, QR generation/regeneration, booking action buttons, and defect triage controls.
- [ ] Add a browser test for QR label download behavior if feasible.

Acceptance:

- Web tests run from a package script and can be added to CI.

### Task 4.2: Add Mobile Tests

**Files:**
- Modify: `apps/mobile/package.json`
- Create: `apps/mobile/tests/**`

- [ ] Add tests for QR scanner parse handling.
- [ ] Add tests for asset screen invalid/unknown/loading states.
- [ ] Add tests for booking/defect form validation.
- [ ] Add tests for API error normalization.

Acceptance:

- Mobile tests run without requiring a physical Android device.

### Task 4.3: Add Migration/RLS Verification

**Files:**
- Create: `supabase/tests/**` or `scripts/verify-supabase.mjs`
- Modify: `package.json`

- [ ] Add a documented local Supabase verification command.
- [ ] Verify migrations apply from scratch.
- [ ] Verify instructor cannot enumerate all assets/QR codes directly.
- [ ] Verify instructor can resolve an active QR through RPC.
- [ ] Verify guarded booking/notification updates cannot mutate forbidden columns.

Acceptance:

- Backend security regressions are testable locally before deployment.

### Task 4.4: Add CI

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `package.json` if scripts are added

- [ ] Run `npm ci`.
- [ ] Run `npm run test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Add web/mobile test jobs when scripts exist.

Acceptance:

- PRs get automated validation for the app’s current test surface.

### Task 4.5: Add Lint/Formatting Gate

**Files:**
- Modify: `package.json`
- Modify: workspace package files as needed
- Create: lint config if chosen

- [ ] Choose ESLint or Biome for the monorepo.
- [ ] Add root `lint` script.
- [ ] Wire lint into CI after initial cleanup.

Acceptance:

- Static quality checks are repeatable and documented.

### Task 4.6: Update Docs And Deployment Config

**Files:**
- Modify: `README.md`
- Modify: `supabase/README.md`
- Modify: `docs/architecture.md`
- Create: `docs/status.md`
- Modify: `apps/mobile/app.json`
- Modify: `apps/mobile/eas.json`
- Optionally create: `vercel.json`

- [ ] Add prerequisites: Node, npm, Supabase CLI, Expo CLI/EAS, Android tooling.
- [ ] Add local startup order for Supabase, shared build, web, and mobile.
- [ ] Add first-super-admin bootstrap steps.
- [ ] Add env var matrix for web/mobile/Vercel/EAS.
- [ ] Add current implementation status matrix.
- [ ] Replace `replace-with-eas-project-id` with the real EAS project id when available, or document the bootstrap command.
- [ ] Add deployment checklist for Supabase migrations, Vercel, and EAS Android builds.

Acceptance:

- A new contributor can start the app and understand what is complete.

## Recommended Subagent Dispatch Order

### Wave 1: Contract And Backend Foundation

Run sequentially where needed, because these files are shared roots.

1. **Shared Contracts Agent:** Task 0.2 and Task 0.3.
2. **Backend Agent:** Task 1.1 and Task 1.2.
3. **Backend Agent:** Task 1.3.
4. **Backend Agent:** Task 1.4 and Task 1.5.
5. **Reviewer Agent:** Review backend security, RLS, and shared contract consistency.

### Wave 2: App Surfaces In Parallel

Start after RPC names, DTOs, and policies are stable.

1. **Web Agent:** Task 2.1 and Task 2.2.
2. **Web Agent:** Task 2.3 and Task 2.4.
3. **Web Agent:** Task 2.5, Task 2.6, Task 2.7.
4. **Mobile Agent:** Task 3.1 and Task 3.2.
5. **Mobile Agent:** Task 3.3 and Task 3.4.
6. **Mobile Agent:** Task 3.5, Task 3.6, Task 3.7.

### Wave 3: Verification And Release

Run after web/mobile flows compile.

1. **QA/Docs Agent:** Task 4.1 and Task 4.2.
2. **Backend QA Agent:** Task 4.3.
3. **QA/Docs Agent:** Task 4.4 and Task 4.5.
4. **Docs/Release Agent:** Task 4.6.
5. **Reviewer Agent:** Final code review across backend, web, mobile, and docs.

## Verification Gates

Run these after every completed wave:

```powershell
npm run test
npm run typecheck
npm run build
```

Run these before marking V1 ready:

```powershell
npm run test
npm run typecheck
npm run build
```

Manual V1 smoke tests:

- Web: missing config state.
- Web: admin sign-in.
- Web: create asset.
- Web: generate QR.
- Web: regenerate QR.
- Web: approve booking.
- Web: checkout booking.
- Web: return booking.
- Web: triage defect.
- Web: reply to ticket.
- Web: super admin changes an admin profile.
- Mobile: sign in.
- Mobile: scan active QR.
- Mobile: submit booking.
- Mobile: cancel pending booking.
- Mobile: submit defect with and without photo.
- Mobile: send ticket message.
- Mobile: receive/read notification.
- Backend: instructor cannot directly enumerate all assets or active QR codes.
- Backend: inactive/regenerated QR no longer resolves.

## Current Risk Register

- The current worktree is dirty on `main`; implementation must preserve those changes.
- Web admin dashboard is a large single file. Splitting it reduces conflict risk before feature work.
- Backend RPC design must settle before mobile and web agents implement calls.
- Supabase local config is incomplete, so migration/RLS tests may need setup before they can run.
- Push notifications require an EAS project and real device/build validation; Expo Go behavior may not represent production.
- Realtime may need Supabase project configuration outside code; provide manual refresh fallback.

