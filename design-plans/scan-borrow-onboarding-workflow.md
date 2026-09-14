# Scan and borrow onboarding workflow

Written against: 2ac2938f2d158f91b84b2f38a12edbf4b8483831

## Evidence chain

- Surface: `apps/mobile/app/(protected)/(tabs)/scan.tsx`, `apps/mobile/app/(protected)/asset/[payload].tsx`, `apps/mobile/app/(protected)/(tabs)/borrow.tsx`
- Problem: QR scan and reservation flows work, but users see both transaction forms or schedule-before-select patterns that make the journey hard to follow; no guided step-by-step onboarding exists.
- Design evidence: `MOBILE-PAGES.md` Flow A/B/C and Asset Details progressive forms ("first choose action, then show one form"); user request for separate forms, same-day scan borrow (purpose only), browse-then-form reservation, and onboarding-style UX.
- Owner: Asset Details borrower branch; Borrow tab request panel; Scan tab overlay coach
- Scope and affected surfaces: Scan tab, Asset Details (borrower), Borrow tab; shared `WorkflowStepper` + `use-onboarding-flags`
- Uncertainty: Backend may still reject same-day start-at-now ranges if server-side future checks tighten later; client intentionally skips `isFutureBookingRange` for walk-up same-day borrow.

## Design decision

Guide borrowers with an inline `WorkflowStepper` and first-run coach, keep borrow vs defect as mutually exclusive forms after QR scan, simplify scan-path borrow to purpose-only same-day (90 minutes from now), and move the Borrow-tab schedule picker into the post-selection Request panel so catalog browsing comes first.

## Reuse

- `Card`, `SectionTitle`, `Button`, `Field`, `Notice`, `Badge` from `components/ui.tsx`
- `BookingSchedulePicker` (compact) on Borrow tab Request panel only
- `colors`, `spacing`, `typography`, `glass`, `shadows` from `constants/theme.ts`
- `expo-secure-store` already installed for onboarding flag persistence
- Exemplar: Asset Details `selectedQrTransaction` gate for progressive disclosure

## Changes

1. `apps/mobile/components/workflow-stepper.tsx`
   - Change: Add reusable horizontal step pills with optional Got it dismiss.
   - Preserve: Liquid-glass `Card` identity and system blue / muted tokens.
   - Verify: Step N of M label updates with `currentStep`.

2. `apps/mobile/lib/use-onboarding-flags.ts`
   - Change: Persist `onboarding_scan_flow_v1` and `onboarding_borrow_flow_v1` via SecureStore (web localStorage fallback); expose `hasSeen`, `markSeen`, `reset`.
   - Preserve: No new dependencies.
   - Verify: Dismissing coach does not reappear after app restart.

3. `apps/mobile/lib/use-asset-workflow.ts`
   - Change: Add `submitSameDayBorrowing` using `createBookingRange(new Date(), 90)` without `isFutureBookingRange`.
   - Preserve: Existing `submitBooking` / schedule path unused by scan UI but available.
   - Verify: Purpose-only submit creates pending borrowing.

4. `apps/mobile/app/(protected)/asset/[payload].tsx`
   - Change: Show `WorkflowStepper`; borrow form is purpose-only same-day; hide QR pickup until meaningful pickup state; keep choose-then-one-form gate.
   - Preserve: Custodian handoff; defect form; Change transaction.
   - Verify: Only one form visible; pickup appears when approved/ready.

5. `apps/mobile/app/(protected)/(tabs)/borrow.tsx`
   - Change: Remove top Schedule card; put `BookingSchedulePicker` inside selected-resource Request panel; add reservation `WorkflowStepper`.
   - Preserve: Catalog images, filters, search, history, submit API.
   - Verify: Browse first; schedule + purpose only after select.

6. `apps/mobile/app/(protected)/(tabs)/scan.tsx`
   - Change: First-run dismissible coach card ("Step 1 of 5…").
   - Preserve: Camera, reticle, permission states.
   - Verify: Coach dismiss persists; scanning still navigates to asset.

7. `apps/mobile/MOBILE-PAGES.md`
   - Change: Update Flow A (same-day purpose), Flow C (schedule after select), and Asset/Borrow layout notes for steppers.
   - Preserve: Global design system and other pages.
   - Verify: Docs match implemented UX.

## Scope

- Inherit: Borrower mobile Scan / Asset / Borrow surfaces
- Verify: Custodian asset handoff unchanged; defect path unchanged except stepper context
- Exclude: Instant checkout without approval; web app; new npm packages; full-screen tutorial library

## Validation

- Product: Scan → choose Borrow → purpose only → pending; Scan → defect only; Borrow tab browse → select → schedule+purpose → submit; coach dismiss persists; approved → scan → Confirm pickup.
- Interface: Borrower and custodian roles; empty/loading/error on asset; narrow phone width.
- System: Reuses `Card` / theme tokens; no parallel stepper library.
- Repository: `pnpm --filter mobile exec tsc --noEmit` → no type errors

## Stop conditions

- Stop if same-day `createBorrowing` is rejected by server future-start rules — then start range a few minutes ahead without reintroducing the full schedule picker on the scan path.
- Stop if SecureStore is unavailable on a platform and coach loops — fall back to in-memory seen for session only (already best-effort in hook).

## Design documentation

- After acceptance and validation: record in `MOBILE-PAGES.md` that scan-path borrow is same-day purpose-only (90 min), Borrow tab collects schedule after item selection, and both flows expose `WorkflowStepper` / first-run coach.
