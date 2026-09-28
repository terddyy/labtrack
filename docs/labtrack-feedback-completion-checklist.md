# LABTRACK Feedback Completion Checklist

This is the release-control checklist for [PRD: LABTRACK Feedback Completion and Release Readiness](./labtrack-feedback-completion-prd.md). Check an item only when its named evidence exists. Local code is not proof of hosted or live completion.

## Status at Creation

- [x] Repository baseline inspected at `acc9779f593347d151fa412d268ab73df8259096`.
- [x] Existing unrelated worktree changes identified and left untouched.
- [x] Broad local implementation identified for Rooms, Borrow/Messages, reminders, reports, access roles, and realtime refresh.
- [x] Product owner approved Q1–Q5 in the PRD.
- [x] Final local implementation passes 80 shared/contract tests, all workspace typechecks, the web production build, and an Android production bundle export.
- [ ] Hosted Supabase migrations verified.
- [ ] Web/mobile release verified.
- [ ] Final stakeholder UAT accepted.

## Gate 0 — Product Decisions

- [x] Reset app data is local/device-only and preserves server history.
- [x] Defect photos support camera/gallery, maximum 3, JPEG/PNG/WebP, 5 MB each.
- [x] Total assets/Asset availability stays on mobile Home with explanatory copy.
- [x] Faculty/Student self-selection does not require approval in this release.
- [x] Reminders are in-app only in this release.
- [x] Approved decisions are recorded in the PRD revision history.

Evidence: approved PRD revision or written product-owner decision.

## Gate 1 — Terminology and Navigation

- [x] Admin sidebar says Dashboard, Rooms, Borrowing, and Messages.
- [x] Dashboard panel says Messages, not Tickets & Messages.
- [x] Mobile navigation, screen titles, buttons, dialogs, empty states, alerts, accessibility labels, and notifications use Borrow/Message terminology.
- [x] Web equivalents use Borrow/Message terminology.
- [ ] Print output contains no unintended Ticket/Booking labels.
- [x] Automated visible-string scan passes with documented internal-identifier exclusions.
- [x] `apps/mobile/MOBILE-PAGES.md` is updated and does not contradict current product language.

Evidence: string-scan output and screenshots from web/mobile primary and empty/error states.

## Gate 2 — Rooms and Locations

- [ ] Room appears in admin navigation for authorized staff.
- [ ] A Catalog location starts as location-only.
- [ ] Admin can convert a location to a borrowable room.
- [ ] Admin can mark a room available or unavailable.
- [ ] Admin can return a room to location-only without deleting it.
- [ ] Location-only records do not appear in the borrower room list.
- [ ] Unavailable rooms cannot be selected/submitted.
- [ ] A stale/direct request for an unavailable room is rejected by the backend.
- [ ] Historical room borrowings remain intact after availability/classification changes.

Evidence: web screenshots, mobile list screenshots, direct negative test, and database row history.

## Gate 3 — Admin and Super Admin Workflows

### Dashboard

- [ ] “Hardware asset command center” is replaced by “Dashboard” everywhere visible.
- [ ] Messages panel has correct title and unread state.

### Borrowing

- [ ] Currently overdue borrowing shows Overdue.
- [ ] Returned-after-deadline borrowing shows Returned late.
- [ ] On-time return does not show a late indicator.
- [ ] Approved/checked-out/returned borrowing shows the approving custodian.
- [ ] Returned borrowing shows the receiving custodian when recorded.
- [ ] Manual reminder works only for overdue checked-out borrowing.
- [ ] Automatic job checks every 15 minutes.
- [ ] Automatic reminders do not repeat more than once per 24 hours per borrowing.
- [ ] Borrower receives the correct in-app reminder.

### Defects

- [ ] Resolved defect shows the custodian who resolved it.
- [ ] Deactivated historical custodian does not make attribution misleading.

### Messages

- [ ] New faculty/student message creates an unread indicator for authorized staff.
- [ ] Message sidebar badge/count is correct.
- [ ] Opening the conversation clears only the relevant current-user unread state.

### Calendar

- [ ] Overdue items use a distinct danger treatment and an Overdue text/status indicator.
- [ ] Approved, checked out, returned, and overdue states remain distinguishable without color alone.

Evidence: seeded scenario matrix with acting user IDs/names and screenshots.

## Gate 4 — Assets and QR

- [ ] Assets & QR has All categories and per-category filtering.
- [ ] Category filter composes with search and status filters.
- [ ] Available asset can be requested from browse flow.
- [ ] Available asset can be requested from QR flow.
- [ ] Unavailable/inactive/archived asset cannot be requested from browse flow.
- [ ] Unavailable/inactive/archived asset cannot be requested from QR flow.
- [ ] Direct or stale-client attempt is rejected at the database boundary.
- [ ] Existing historical borrowings remain readable after asset status changes.

Evidence: UI capture plus direct negative integration test.

## Gate 5 — Reports and Printing

- [ ] Every report type runs against the correct report-specific data.
- [ ] Empty result displays a clear state and disables Print.
- [ ] Single-page result prints cleanly.
- [ ] Multi-page result prints cleanly with no clipped/overlapping content.
- [ ] Navigation, Run, Print, filters, and other control panels are absent from print output.
- [ ] Errors are readable and retry preserves filter inputs.
- [ ] Chrome/Edge at 80% zoom passes.
- [ ] Chrome/Edge at 100% zoom passes.
- [ ] Chrome/Edge at 125% zoom passes.
- [ ] Chrome/Edge at 150% zoom passes.
- [ ] Chrome/Edge at 200% zoom passes.
- [ ] A4 print preview/PDF evidence is attached.

Evidence: report-type matrix, screenshots, and generated print PDF(s).

## Gate 6 — Access and Registration

- [ ] Register form requires Faculty or Student selection.
- [ ] Faculty selection creates a Faculty-equivalent borrower profile.
- [ ] Student selection creates a Student borrower profile.
- [ ] Missing/tampered requested role follows the approved safe fallback.
- [ ] No registration path can self-assign Admin, Custodian, or Super Admin.
- [ ] Admin/Super Admin can correct Faculty/Student roles.
- [ ] Existing Instructor records continue to display correctly as Faculty.

Evidence: new-account records and authorization test results.

## Gate 7 — Automatic Data Sync

- [ ] New borrowing appears to Admin without manual refresh.
- [ ] Admin borrowing decision appears to borrower without manual refresh.
- [ ] New reservation/resource change appears where relevant without manual refresh.
- [ ] New defect appears to Admin without manual refresh.
- [ ] Defect status update appears to borrower without manual refresh.
- [ ] New message and unread indicator appear without manual refresh.
- [ ] Message notification opens the correct conversation.
- [ ] Borrowing, defect, and system notifications mark read without opening a conversation.
- [ ] Duplicate Realtime events do not duplicate UI rows/notifications.
- [ ] Disconnect/reconnect behavior is graceful and manual Refresh remains available.
- [ ] Cross-user RLS test confirms no unauthorized rows are delivered.
- [ ] Observed p95 sync latency is at or below 5 seconds in the acceptance environment.

Evidence: two-session timestamped video/log plus RLS test results.

## Gate 8 — Student and Faculty Mobile Experience

### Home

- [x] Product decision for Total assets/Asset availability is implemented.
- [x] Total assets explains what is counted.
- [x] Asset Availability calculation uses active live inventory counts.
- [x] Zero-assets state does not display a misleading health percentage.

### Borrow

- [ ] Labels use approved capitalization.
- [ ] User can set both start time and end time.
- [ ] End time must be after start time.
- [ ] Allowed duration rules are explained before submission.
- [ ] Final start/end range is shown before submission.

### Alerts and Messages

- [ ] Tapping a message alert opens its exact conversation.
- [ ] Tapping a defect alert marks it read.
- [ ] Tapping a borrowing alert marks it read.
- [ ] Messages list and navigation show a new-message indicator.

### Profile and Reset

- [x] Profile does not show an unexplained Department not assigned state.
- [x] Reset behavior matches the approved Q1 decision.
- [x] Confirmation copy states exactly what will be cleared/deleted.
- [x] Success is shown only after the operation fully succeeds.
- [x] Failure is recoverable and does not claim success.

Evidence: Android screenshots/video for Student and Faculty accounts.

## Gate 9 — Defect Photo Attachment

- [x] Approved media dependency is added using the app’s supported Expo SDK version.
- [x] User can select the approved camera/gallery source(s).
- [x] Permission denial has a clear fallback and does not block text-only reporting.
- [x] Photo count/type/size validation matches the approved limits.
- [x] Selected images can be previewed and removed before submission.
- [x] Upload progress and retry are visible.
- [x] Photo metadata is linked to the created defect.
- [x] Failed metadata persistence triggers object cleanup.
- [x] Reporter photo viewing is implemented through signed URLs.
- [x] Authorized custodian/admin photo viewing is implemented through signed URLs.
- [ ] Unrelated borrower cannot view the photo or storage object.
- [ ] Reset/delete behavior for photos matches the approved data policy.

Evidence: Android test video, storage row/object evidence, and RLS negative test.

## Gate 10 — Local Release Candidate

- [x] Shared tests pass (80/80 on 2026-09-28).
- [x] Shared typecheck passes.
- [x] Web typecheck passes.
- [x] Mobile typecheck passes.
- [x] Web production build passes.
- [ ] Android release/preview build passes.
- [x] Android production JavaScript bundle export passes; APK/EAS release build remains required.
- [x] Migration/contract tests pass.
- [x] `git diff --check` passes for task-owned changes (line-ending warnings only).
- [x] No unrelated dirty file was staged or overwritten.
- [ ] Release commit SHA is recorded.

Evidence: command logs, APK/build reference, and Git status/diff.

## Gate 11 — Hosted Database and Deployment

- [ ] Exact hosted Supabase project is confirmed.
- [ ] Schema-only backup is taken and recovery location recorded.
- [ ] Existing migration state is recorded before changes.
- [ ] `202609250001_reports_by_type.sql` is applied successfully.
- [ ] `202609270001_feedback_workflows.sql` is applied successfully.
- [ ] `bookings.overdue_reminder_sent_at` exists.
- [ ] `notifications.related_thread_id` and `related_booking_id` exist.
- [ ] Room/location constraints and defaults are verified.
- [ ] Unavailable-asset trigger is active.
- [ ] Report and reminder RPC permissions are verified.
- [ ] `pg_cron` reminder job exists with the intended schedule.
- [ ] Required tables are in `supabase_realtime` publication.
- [ ] Storage/RLS policies pass positive and negative tests.
- [ ] Intended web commit is deployed and recorded.
- [ ] Intended mobile build/version is distributed and recorded.
- [ ] Live health and sign-in checks pass.

Evidence: redacted migration log, schema probes, cron/publication queries, deployment revision, and app version.

## Gate 12 — Final Role-Based UAT and Closure

- [ ] Super Admin completes authorized web scenarios.
- [ ] Admin/Custodian completes authorized web scenarios.
- [ ] Faculty completes mobile borrowing, defects, alerts, and messages.
- [ ] Student completes mobile borrowing, defects, alerts, and messages.
- [ ] Cross-role automatic sync scenario passes.
- [ ] Reports/print scenario passes.
- [ ] Room and unavailable-asset negative scenarios pass.
- [ ] Defect photo authorization scenario passes.
- [ ] No unresolved P0/P1 defect remains.
- [ ] Product owner confirms every original feedback item is accepted.
- [ ] Final release evidence bundle is linked.
- [ ] PRD revision history and implementation status are updated to Complete.

Evidence: signed UAT matrix and release evidence bundle.

## Final Completion Rule

Do not mark the initiative complete until every checkbox above is checked or an item is removed through an explicit, recorded product-owner scope decision. “Implemented locally,” “tests pass,” “migration applied,” “deployed,” and “works live” are separate facts and require separate evidence.
