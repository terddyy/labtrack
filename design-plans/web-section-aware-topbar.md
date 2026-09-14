# Web section-aware topbar

Written against: 2ac2938f2d158f91b84b2f38a12edbf4b8483831

## Evidence chain

- Surface: `apps/web` Custodian dashboard authorized shell → topbar in `admin-dashboard.tsx`
- Problem: Global shell does not reflect the active section. `h1` stays “Hardware asset command center” and the asset-specific “Generate QR” primary action remains visible on Borrowing, Calendar, Defects, Tickets, Reports, Access, and Catalog.
- Design evidence: `navigation` array defines nine distinct section labels; nav buttons set `aria-current="page"` on the active item, establishing section identity in the chrome.
- Owner: Topbar block in `apps/web/components/admin-dashboard.tsx` (outside section conditionals)
- Scope and affected surfaces: Authorized shell topbar title/subtitle and primary QR action visibility
- Uncertainty: Whether Generate QR should appear on Dashboard as well as Assets; plan keeps it on `dashboard` and `assets` only

## Design decision

Derive topbar title (and a short section subtitle) from `activeSection` via the existing `navigation` labels, and show the Generate QR action only on sections where QR generation is part of the task (`dashboard`, `assets`).

## Reuse

- `navigation` array labels and keys already driving the sidebar
- Existing topbar layout classes (`.topbar`, `.eyebrow`, `.actions`, `.button`)
- Exemplar: Calendar panel header already uses section-specific eyebrow/title (`BorrowingCalendar` toolbar)

## Changes

1. `apps/web/components/admin-dashboard.tsx` topbar
   - Change: Resolve `activeSection` to a title/subtitle map (Dashboard keeps command-center framing; other sections use their nav label as `h1` with a one-line muted description). Conditionally render Generate QR when `activeSection === "dashboard" || activeSection === "assets"`.
   - Preserve: Eyebrow “Pampanga State University”, Sync and Sign out actions, Generate QR behavior when shown.
   - Verify: Switching to Tickets shows a Tickets-oriented title and no Generate QR; Assets still shows Generate QR.

## Scope

- Inherit: All `?section=` authorized views
- Verify: Deep links with `?section=bookings` etc. update title without reload quirks
- Exclude: Moving Generate QR into the Assets panel header; metrics strip changes; sidebar label edits

## Validation

- Product: Navigate each sidebar section; title matches the active task and QR CTA only appears where relevant.
- Interface: Desktop and ≤980px stacked shell; all nine sections.
- System: Single title owner in the topbar; no duplicated section title chrome inside every panel.
- Repository: `pnpm --filter web exec tsc --noEmit` → no type errors

## Stop conditions

- Stop if product requires a fixed brand headline on every section; then limit the change to Generate QR visibility only.

## Design documentation

- After acceptance and validation: none.
