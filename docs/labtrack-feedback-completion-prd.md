---
artifact: prd
version: "1.0"
created: 2026-09-28
status: implementation-in-progress
---

# PRD: LABTRACK Feedback Completion and Release Readiness

## Document Control

| Field | Value |
|---|---|
| Initiative | Feedback and Concern Completion Program |
| Product surfaces | Admin/Super Admin web, Faculty/Student Android app, Supabase backend |
| Source | Stakeholder feedback supplied on 2026-09-28 |
| Repository baseline | `main` at `acc9779f593347d151fa412d268ab73df8259096` |
| Current release state | Product decisions are implemented locally; hosted migrations, deployment, and production acceptance are not verified |
| Execution checklist | [LABTRACK Feedback Completion Checklist](./labtrack-feedback-completion-checklist.md) |

## Overview

### Problem Statement

LABTRACK has inconsistent user-facing terminology, incomplete room availability controls, weak overdue and custodian attribution, unreliable report presentation/printing, manual data refresh expectations, registration-role friction, and several unclear or incomplete mobile experiences. These gaps make the product harder to understand and can allow users to act on stale or invalid availability information.

The work crosses UI, database rules, notifications, realtime subscriptions, scheduled jobs, and deployment. It must therefore be completed as one dependency-aware release rather than as isolated label changes.

### Why Now

The feedback affects daily borrowing, defect reporting, messaging, and administrative decisions. A partial frontend release would be unsafe because the current local implementation depends on database columns and functions that were not present in the last hosted schema check.

### Solution Summary

Deliver a coordinated release that:

1. Uses **Borrow** and **Message** consistently in visible UI.
2. Separates physical locations from borrowable rooms and lets custodians control room availability.
3. Makes overdue, returned-late, approver, return receiver, and defect resolver information explicit.
4. Prevents unavailable assets and rooms from being requested at both UI and database layers.
5. Makes reports readable, printable, and stable across supported zoom levels.
6. Requires Faculty/Student selection during registration and retains admin override.
7. Refreshes user and admin data automatically through Supabase Realtime.
8. Clarifies the mobile dashboard, notification behavior, borrowing schedule, profile behavior, and defect photo flow.
9. Proves completion through automated checks, hosted migration verification, deployment evidence, and role-based live acceptance.

### Target Users

- Students and faculty who borrow equipment/rooms, report defects, receive alerts, and message custodians.
- Custodians/Admins who manage assets, rooms, borrowings, defects, messages, reports, and users.
- Super Admins who perform all admin functions and manage access.
- Evaluators and thesis stakeholders who need demonstrable end-to-end behavior.

## Goals and Success Metrics

### Goals

1. Eliminate user confusion caused by old terminology and unclear dashboard metrics.
2. Make availability and borrowing constraints accurate at every entry point.
3. Make operational events visible without manual refresh.
4. Make reports and audit attribution usable for real administrative review.
5. Create a release checklist where every checked item has objective evidence.

### Success Metrics

| Metric | Current baseline | Release target | Measurement |
|---|---|---|---|
| Visible terminology consistency | Mixed legacy wording was reported | 0 visible uses of “Ticket” or “Booking” where “Message” or “Borrow” is intended | Automated string scan plus UI walkthrough |
| Invalid borrowing requests | Unavailable items could be selected outside QR flow | 0 accepted requests for inactive, archived, non-available assets, or non-reservable rooms | UI, RPC, and direct database-boundary tests |
| Realtime update latency | Users report manual sync is required | p95 at or below 5 seconds for covered events on a healthy connection | Cross-device UAT timestamps |
| Overdue visibility | Overdue and late-return status not reliably visible | 100% of seeded overdue/late-return cases visibly identified | Admin list and calendar UAT |
| Reminder correctness | No reliable automatic reminder | Eligible overdue borrowing receives at most one reminder per 24 hours; scheduled job checks every 15 minutes | Database/job audit and notification UAT |
| Custodian attribution | Generic LABTRACK attribution | 100% of approved, returned, and resolved records show the acting account when available | Seeded role-based UAT |
| Message discovery | New replies can be missed | 100% of unread-message fixtures show indicators; tapping a message alert opens the correct conversation | Web/mobile UAT |
| Report reliability | Error, printing failure, and zoom leakage reported | All supported report types run and print without controls/panels in output at 80%, 100%, 125%, 150%, and 200% browser zoom | Browser matrix and print preview evidence |
| Registration role accuracy | Faculty default creates admin correction work | 100% of new signups require Faculty/Student choice and persist the choice | Auth/profile integration test |
| Defect photo completion | Upload API exists but mobile attachment UI is absent | 100% of supported photo fixtures attach, persist privately, and are authorized correctly | Android and storage-policy UAT |

### Non-Goals

- Renaming internal database tables, RPC names, route paths, or TypeScript symbols named `booking` or `ticket`. Visible product language changes; internal identifiers remain backward compatible.
- Changing Catalog behavior beyond supporting the Room/location distinction. The stakeholder reported no other Catalog request.
- Adding attachments to general Message conversations.
- Adding email or SMS overdue reminders in this release. In-app notifications are in scope; push delivery is a separate decision.
- Replacing Supabase, redesigning the whole UI, or rewriting the mobile app.
- Deleting historical institutional audit data under the label “Reset app data” unless explicitly approved.

## Current-State Audit

### Status Legend

- **Local implemented:** Code exists at the baseline commit, but the item is not complete until hosted and accepted.
- **Partial:** Some layers exist; more implementation or proof is required.
- **Decision required:** Product meaning must be confirmed before final implementation.
- **Release pending:** Implementation exists locally but depends on hosted migration/deployment/live verification.

| ID | Stakeholder request | Current repository evidence | Current status |
|---|---|---|---|
| NAV-01 | Change Tickets to Messages | Web/mobile visible navigation and headings use Messages; internal routes remain `/ticket` | Local implemented |
| NAV-02 | Add Room to asset management navigation | Admin sidebar and Room management panel exist | Local implemented |
| ROOM-01 | Mark rooms borrowable/unborrowable | Room panel toggles `location_type` and `is_reservable` | Release pending |
| ROOM-02 | Keep ordinary asset locations separate from rooms | Locations default to `location`; only `room` records enter room borrowing | Release pending |
| DASH-01 | Rename Hardware Asset Command Center to Dashboard | Admin section metadata uses Dashboard | Local implemented |
| DASH-02 | Rename Tickets & Messages panel to Messages | Dashboard inbox and navigation use Messages | Local implemented |
| BOR-01 | Show overdue and returned-late borrowings | Admin list detects overdue and returned-late; calendar has an overdue style | Local implemented |
| BOR-02 | Remind overdue borrowers | Manual reminder RPC/button and 15-minute scheduled reminder job exist | Release pending |
| BOR-03 | Show approving custodian | Admin list resolves `decided_by` to the custodian profile | Local implemented |
| BOR-04 | Show return-receiving custodian | Return event actor is shown when available | Local implemented |
| DEF-01 | Show resolving custodian | Resolved defects show the `triaged_by` profile | Local implemented |
| MSG-01 | Show new-message indicators | Admin/mobile unread dots and counts exist | Release pending |
| CAL-01 | Use a distinct overdue calendar color | Overdue items use a destructive/red treatment | Local implemented |
| AST-01 | Filter Assets & QR by category | Asset table category filter exists | Local implemented |
| AST-02 | Block reserving non-available assets | UI filters non-bookable resources; migration adds a database trigger | Release pending |
| REP-01 | Fix report errors and report-type data | Report-specific RPC migration and presentation changes exist | Release pending |
| REP-02 | Make reports printable | A4 print styles and Print control exist | Local browser proof exists; live UAT pending |
| REP-03 | Hide run/print panels during zoom/printing | Controls use `no-print`; responsive behavior was locally smoked | Live browser matrix pending |
| ACC-01 | Avoid Faculty default for Student signups | Registration now exposes Faculty/Student selection and persists requested role | Release pending |
| SYN-01 | Automatically sync borrowing, reserving, defects, and messages | Realtime subscriptions and publication migration exist | Release pending |
| MOB-01 | Explain or replace Tracked assets | Visible label is now Total assets | Partial; final copy decision required |
| MOB-02 | Make Inventory Health work | Replaced with Asset Availability computed from live counts | Partial; live-data UAT pending |
| MOB-03 | Correct capitalization | Visible labels use sentence/title capitalization helpers | Local implemented; full string audit pending |
| MOB-04 | Set explicit borrowing end time | Schedule picker captures start and end time | Local implemented |
| MOB-05 | Message alert opens conversation; other alerts mark read | Notification handler deep-links message alerts and marks other alerts read | Release pending |
| MOB-06 | Remove unclear Department not assigned state | Department row was removed from Profile | Local implemented |
| MOB-07 | Fix Reset app data | Reset is now device-only, clears local tips/session, and preserves server records | Local implemented; live UAT pending |
| MOB-08 | Attach images to defect reports | Camera/gallery selection, validation, preview/removal, upload retry, private storage, and reporter/custodian viewing are implemented | Local implemented; migration/live UAT pending |
| COPY-01 | Replace Booking with Borrow and Ticket with Message everywhere | Live UI and mobile page documentation use Borrow/Message; internal identifiers remain compatible | Local implemented; visual UAT pending |

## User Stories

| ID | User story | Priority |
|---|---|---|
| US-01 | As a custodian, I want locations and borrowable rooms separated so that a location is not automatically offered for borrowing. | P0 |
| US-02 | As a custodian, I want to disable room borrowing without deleting the room or its asset-location use. | P0 |
| US-03 | As a borrower, I want unavailable assets/rooms blocked before submission so that I do not create invalid requests. | P0 |
| US-04 | As a custodian, I want overdue and late returns clearly identified and attributable so that I can follow up correctly. | P0 |
| US-05 | As a borrower, I want timely overdue reminders so that I know when return action is required. | P0 |
| US-06 | As an administrator, I want the approving/receiving/resolving account shown so that decisions are auditable. | P0 |
| US-07 | As any user, I want new messages to appear automatically with an unread indicator so that I do not miss replies. | P0 |
| US-08 | As a borrower, I want a message alert to open its conversation while other alerts simply become read. | P0 |
| US-09 | As an administrator, I want reports to run and print cleanly at common browser zoom levels. | P0 |
| US-10 | As a new user, I want to choose Faculty or Student during registration so that an admin does not need to correct my role. | P0 |
| US-11 | As a borrower, I want to choose an exact end time so that the requested duration is unambiguous. | P0 |
| US-12 | As a defect reporter, I want to attach a camera or gallery image so that custodians can assess the issue. | P0 |
| US-13 | As a user, I want plain product language—Borrow and Message—so that labels match the actions I take. | P1 |
| US-14 | As a user, I want dashboard inventory numbers to explain what they measure and reflect live data. | P1 |

## Scope

### In Scope

- All feedback IDs in the current-state audit.
- Web and mobile visible terminology audit.
- Room/location classification and availability controls.
- Borrowing rules, overdue/late-return presentation, reminders, and actor attribution.
- Unread message indicators, alert deep links, and realtime refresh.
- Reports query, rendering, responsiveness, printing, and browser acceptance.
- Required Faculty/Student registration choice with admin override.
- Mobile dashboard copy/data behavior, end-time picker, profile behavior, and defect photo attachment.
- Supabase migration, RLS/storage verification, scheduled-job verification, deployment, and live UAT.

### Out of Scope

- Catalog enhancements not named in the feedback.
- Internal schema renames from bookings/tickets to borrow/messages.
- Message file attachments, read receipts, typing indicators, or group chat.
- External messaging channels.
- Historical data deletion or backfill beyond what is required for compatible defaults and constraints.

### Future Considerations

- Push-notification delivery for overdue reminders after the EAS project and production push service are verified.
- Verified institutional role assignment using student/employee records rather than self-selection.
- Report export to PDF/CSV beyond browser printing.
- Message attachments and richer conversation states.

## Solution Design and Functional Requirements

### A. Terminology and Navigation

- **FR-NAV-01:** Every user-visible occurrence of Ticket/Tickets must read Message/Messages when it represents conversation functionality.
- **FR-NAV-02:** Every user-visible occurrence of Booking/Booking request must read Borrow/Borrowing request when it represents the borrowing workflow.
- **FR-NAV-03:** Internal routes, tables, RPCs, analytics keys, and code symbols may retain legacy names for compatibility and must never be exposed as labels.
- **FR-NAV-04:** Admin navigation must include Dashboard, Assets & QR, Rooms, Borrowing, Calendar/Monitor, Defects, Messages, Reports, Access, and Catalog as authorized for the current role.

Acceptance criteria:

- A case-insensitive scan plus visual walkthrough finds no prohibited legacy label in live web/mobile UI.
- Screen-reader labels, empty states, dialogs, toasts, notification copy, and print output are included in the audit.
- Internal route names such as `/ticket` do not count as user-facing defects.

### B. Rooms and Locations

- **FR-ROOM-01:** A location must have a classification of `location` or `room`; the default for new Catalog locations is `location`.
- **FR-ROOM-02:** Only records classified as `room` may appear in the mobile room catalog.
- **FR-ROOM-03:** A custodian may mark a room available/unavailable for borrowing without deleting it.
- **FR-ROOM-04:** A room marked unavailable remains usable as an asset location but cannot be submitted in a new borrowing request.
- **FR-ROOM-05:** The backend must reject a request for a non-reservable room even if the UI is bypassed.
- **FR-ROOM-06:** Changing a room to location-only must not rewrite historical borrowings.

Acceptance criteria:

- Location-only records never appear as borrowable rooms.
- Unavailable rooms are either hidden from selectable results or displayed as unavailable and disabled.
- Concurrent or stale clients cannot create a request that violates current room availability.

### C. Admin Borrowing, Defects, Messages, and Calendar

- **FR-ADM-01:** Checked-out borrowings past `requested_end_at` display an Overdue state.
- **FR-ADM-02:** Returned borrowings with `returned_at > requested_end_at` display Returned late.
- **FR-ADM-03:** Admin list and calendar use a distinct danger color for overdue items without relying on color alone.
- **FR-ADM-04:** Approved/checked-out/returned records display “Approved by {full name}” when `decided_by` exists.
- **FR-ADM-05:** Returned records display the receiving custodian when the return event has an actor.
- **FR-ADM-06:** Resolved defect records display “Resolved by {full name}” when `triaged_by` exists.
- **FR-ADM-07:** Custodians may send an in-app return reminder only for an overdue, checked-out borrowing.
- **FR-ADM-08:** The scheduled job evaluates overdue borrowings every 15 minutes and does not repeat a reminder more often than once per 24 hours per borrowing.
- **FR-ADM-09:** New faculty/student messages create recipient notifications and unread indicators for authorized custodians.
- **FR-ADM-10:** Opening the relevant conversation marks its unread message notifications read for the current user.

Acceptance criteria:

- Seeded on-time, overdue, returned-on-time, and returned-late records render different correct states.
- The displayed approver/resolver/receiver matches the authenticated actor recorded by the backend, not a client-provided name.
- Reminder RPC rejects pending, approved, returned, cancelled, rejected, and not-yet-due records.
- Unread counts decrease only for the current user and correct conversation.

### D. Assets and QR

- **FR-AST-01:** Admin Assets & QR supports an All categories view and a view for each active category.
- **FR-AST-02:** Filters compose with search and other status filters without silently discarding either filter.
- **FR-AST-03:** Asset availability is enforced when resources are listed and again immediately before insert.
- **FR-AST-04:** Assets that are inactive, archived, or not `available` cannot receive new borrowing requests through browse, QR, direct RPC, or a stale client.
- **FR-AST-05:** An existing request retains its historical record if the asset later becomes unavailable.

### E. Reports and Printing

- **FR-REP-01:** Each report type returns data specific to that report rather than reusing a generic payload.
- **FR-REP-02:** Empty results show a clear empty state and do not enable Print.
- **FR-REP-03:** Run and Print controls remain usable at supported zoom levels and never overlay or become part of printed content.
- **FR-REP-04:** Browser print uses A4-friendly styles, readable text, repeatable table headers where applicable, sensible page breaks, and no application navigation/control chrome.
- **FR-REP-05:** Errors identify the failed operation and allow the user to retry without losing filter inputs.

Acceptance criteria:

- Every report type is tested with zero, one, and multi-page result sets.
- Chrome/Edge print preview shows report content only at portrait A4 unless the report explicitly requires landscape.
- At 80%, 100%, 125%, 150%, and 200% zoom, no control obscures content or becomes unreachable.

### F. Access and Registration

- **FR-ACC-01:** Registration mode requires the user to choose Faculty or Student before submission.
- **FR-ACC-02:** The selected role is sent as trusted signup metadata and normalized server-side to only Faculty or Student.
- **FR-ACC-03:** Missing or invalid metadata must follow an explicitly approved fallback policy; it must not silently create admin/custodian privileges.
- **FR-ACC-04:** Admin and Super Admin retain the ability to correct borrower roles.
- **FR-ACC-05:** Existing Instructor records continue to display as Faculty until a separate migration is approved.

### G. Automatic Syncing and Alerts

- **FR-SYN-01:** Web subscribes to assets, locations, borrowings, defects, message threads/messages, and notifications required by the active dashboard.
- **FR-SYN-02:** Mobile subscribes only to the tables needed by the current screen and cleans subscriptions up when the screen unmounts.
- **FR-SYN-03:** Realtime events trigger an idempotent refresh; duplicate events do not duplicate rows or notifications.
- **FR-SYN-04:** If Realtime disconnects, manual refresh remains available and reconnect restores updates.
- **FR-SYN-05:** Tapping a Message notification marks it read and opens its related conversation. Tapping borrowing, defect, and system notifications marks them read without opening a conversation.
- **FR-SYN-06:** Authorization/RLS remains the source of truth; subscribing must not expose other users’ private rows.

### H. Mobile Home, Borrow, Profile, and Defect Photo

- **FR-MOB-01:** Replace ambiguous “Tracked assets” copy with “Total assets” plus concise helper text explaining that it counts active equipment registered in LABTRACK.
- **FR-MOB-02:** Asset Availability is calculated as available active assets divided by all active tracked assets; zero total displays an empty state, not a misleading percentage.
- **FR-MOB-03:** Availability counts and borrowing/defect summaries refresh from live backend data.
- **FR-MOB-04:** Borrowing schedule requires an explicit start and end time, validates end after start, and shows the final range before submission.
- **FR-MOB-05:** Visible field names and status labels use consistent capitalization.
- **FR-MOB-06:** Profile must not show “Department not assigned.” Department may return only when there is a defined source and edit/assignment workflow.
- **FR-MOB-07:** Reset behavior must follow the approved product decision in Open Question Q1 and use copy that accurately describes its effect.
- **FR-MOB-08:** Defect reporting permits one or more product-approved images from camera and/or gallery before or immediately after report creation.
- **FR-MOB-09:** Photo upload validates type/size, shows progress/failure/retry, stores objects privately, and removes orphaned objects if persistence fails.
- **FR-MOB-10:** Authorized custodians can view attached defect photos through expiring signed URLs or an equivalent protected mechanism.

### Edge Cases

| Scenario | Expected behavior |
|---|---|
| Room changed to unavailable while a borrower is viewing it | Submission fails with a clear availability message; no borrowing row is created |
| Asset status changes after list load | Database boundary rejects the stale request |
| Realtime event is delivered twice | UI refreshes idempotently and shows one logical row/notification |
| Realtime is offline | Existing data remains usable with a stale/offline notice and manual Refresh |
| Approver/resolver profile is later deactivated | Historical actor name remains resolvable or displays a non-misleading archived-account label |
| Report has no data | Empty state displays; Print is disabled |
| Multi-page report | Headers/content do not overlap and controls are absent from print output |
| User denies camera/photo permission | Defect text can still be submitted; user sees permission guidance and can retry |
| Photo upload succeeds but metadata insert fails | Uploaded object is cleaned up or queued for safe cleanup |
| Signup metadata is absent/tampered | Server applies the approved safe fallback and never grants staff privileges |
| Reset operation partially fails | No false success message; recoverable retry guidance is shown |

## Technical Considerations

### Constraints

- LABTRACK is an npm-workspace TypeScript monorepo: Next.js web, Expo Android mobile, shared package, and Supabase backend.
- `202609250001_reports_by_type.sql` must be applied before report UI relying on the new RPC behavior.
- `202609270001_feedback_workflows.sql` must be applied before UI relying on `overdue_reminder_sent_at`, `related_thread_id`, room controls, registration role handling, reminder jobs, or realtime publication changes.
- The overdue scheduler depends on `pg_cron`, enabled by an earlier migration.
- Visible terminology can change without risky database renames.
- Defect-photo backend/storage support exists, but the mobile app does not currently include an image-picker dependency or form integration.

### Integration Points

- **Supabase Auth:** registration metadata and profile bootstrap.
- **Supabase Postgres/RPC:** borrowing, room, defect, message, reports, notifications, and reset behavior.
- **Supabase Realtime:** automatic UI refresh across web/mobile.
- **Supabase Storage:** private `defect-photos` objects and authorized metadata.
- **pg_cron:** scheduled overdue reminder processing.
- **Browser print engine:** A4 report output and zoom/responsiveness acceptance.
- **Android permissions/media APIs:** camera/gallery defect attachments.

### Data Requirements

- Additive migrations only; preserve historical borrowing, defect, message, and audit records.
- Actor attribution must store/use authenticated profile IDs, not display names supplied by clients.
- New notification foreign keys must use intentional delete behavior and be verified against history-retention requirements.
- Defect photos must remain private, scoped to the defect reporter and authorized staff through RLS/storage policies.
- No production data migration or destructive cleanup is authorized by this PRD alone.

### Required Automated Coverage

- Shared contract tests for schema/RPC names and database enforcement.
- Web component or E2E coverage for Room controls, category filtering, overdue/late states, actor attribution, unread indicators, and Reports.
- Mobile component/E2E coverage for role selection, start/end time, notification deep link, profile/reset behavior, realtime refresh, and defect photos.
- Direct negative tests that bypass UI and attempt unavailable asset/room borrowing.
- RLS tests for cross-user message, notification, and defect-photo access.

## Dependencies and Risks

### Dependencies

| Dependency | Owner | Current status | Impact if delayed |
|---|---|---|---|
| Product answers to Q1–Q5 | Product owner | Open | Blocks final reset, photo, dashboard copy, role, and notification scope |
| Supabase owner/CLI or equivalent migration access | Deployment owner | Previously unavailable | Blocks schema, cron, realtime, and live verification |
| Hosted project backup and migration window | Deployment owner | Not verified | Blocks safe migration |
| Admin, Super Admin, Faculty, and Student UAT accounts | Product/QA | To prepare | Blocks role-based acceptance |
| Android test device or emulator with media access | QA | To prepare | Blocks photo and notification acceptance |
| Supported Chrome/Edge environment and printer/PDF target | QA | To prepare | Blocks report acceptance |

### Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Frontend deployed before migrations | High | High | Migration-first release gate and schema probes |
| “Reset app data” deletes institutional history unexpectedly | Medium | High | Default to local-only reset; require explicit approval for server deletion |
| Self-selected Student/Faculty role is inaccurate | Medium | Medium | Limit to borrower privileges; retain admin correction; consider later institutional verification |
| Realtime publication/RLS mismatch leaks or hides data | Medium | High | Role-scoped RLS tests and cross-account UAT |
| Reminder job duplicates notifications | Medium | Medium | Row locking/idempotency window and cron audit |
| Report fix works only at one viewport/zoom | Medium | Medium | Fixed browser/zoom/print matrix before release |
| Defect image picker adds permission or build regressions | Medium | Medium | Use supported Expo module, permission denial tests, Android build verification |
| Legacy labels remain in accessibility copy or rare states | Medium | Low | Automated scan plus full-state walkthrough |
| Existing dependency audit findings include high/critical advisories | Confirmed locally | High | Review `npm audit` paths, upgrade narrowly, and rerun all release gates; do not apply a breaking bulk fix blindly |

## Timeline and Milestones

Dates are intentionally assigned only after production access and the release window are confirmed.

| Milestone | Exit condition | Sequence |
|---|---|---|
| M0 — Product decisions | Q1–Q5 answered and recorded | Complete locally |
| M1 — Local gap completion | Defect photos, reset semantics, copy audit, and missing automated tests completed | Complete locally |
| M2 — Local release candidate | Tests, typechecks, build, Android build, browser/report matrix, and migration lint pass | In progress: automated gates and Android bundle export pass; APK and manual matrices remain |
| M3 — Hosted backend readiness | Backup taken; migrations applied; schema, RLS, cron, and realtime verified | Before frontend/mobile release |
| M4 — Web and mobile release | Intended commit deployed; new Android build distributed where required | After M3 |
| M5 — Role-based UAT | Admin, Super Admin, Faculty, and Student scenarios pass with evidence | After M4 |
| M6 — Stakeholder closure | Every item in the execution checklist is checked or explicitly removed by approved scope change | Final |

## Release and Definition of Done

The initiative is complete only when all conditions below are true:

1. Every requirement has implementation evidence and an acceptance result.
2. Required migrations are recorded in the hosted database and schema probes pass.
3. Scheduled reminders and Realtime publication are verified live.
4. Web and mobile builds identify the intended commit/release version.
5. Role-based end-to-end UAT passes on production-like or production-approved data.
6. Report print/zoom evidence is attached.
7. No P0/P1 regression remains open.
8. The product owner checks every item in the linked completion checklist.

## Approved Product Decisions

- [x] **Q1 — Reset semantics:** Reset is local/device-only, clears saved tips and the sign-in session, and preserves server records.
- [x] **Q2 — Defect photo source:** Camera and gallery are supported, up to 3 images, 5 MB each, JPEG/PNG/WebP.
- [x] **Q3 — Home metric:** Keep Total assets and Asset availability with explanatory copy and a correct zero-assets state.
- [x] **Q4 — Registration trust:** Faculty/Student self-selection is sufficient for this release; staff roles cannot be self-assigned and Admin retains correction capability.
- [x] **Q5 — Reminder channel:** Overdue reminders are in-app only for this release.

## Appendix

### Repository Evidence

- Local implementation commit: `acc9779f593347d151fa412d268ab73df8259096`
- Report migration: `supabase/migrations/202609250001_reports_by_type.sql`
- Feedback workflow migration: `supabase/migrations/202609270001_feedback_workflows.sql`
- Room management: `apps/web/components/rooms/room-management-panel.tsx`
- Borrowing admin: `apps/web/components/bookings/booking-admin-panel.tsx`
- Calendar overdue styling: `apps/web/components/admin/borrowing-calendar.tsx`
- Reports UI/print: `apps/web/components/reports/reports-panel.tsx`, `apps/web/app/globals.css`
- Mobile notifications: `apps/mobile/app/(protected)/(tabs)/notifications.tsx`
- Mobile Realtime hooks: `apps/mobile/lib/use-realtime-refresh.ts`
- Mobile defect form gap: `apps/mobile/app/(protected)/asset/[payload].tsx`
- Existing photo API: `apps/mobile/lib/labtrack-api.ts`

### Known Release Blocker at Baseline

The last hosted checks reported missing `bookings.overdue_reminder_sent_at` and `notifications.related_thread_id`, and authenticated schema inspection lacked the required owner-level access. Therefore local implementation evidence must not be represented as a deployed release.

### Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-09-28 | Codex with repository audit | Initial complete PRD and release definition |
| 1.1 | 2026-09-28 | Product owner and Codex | Recommended decisions approved and implemented locally |
