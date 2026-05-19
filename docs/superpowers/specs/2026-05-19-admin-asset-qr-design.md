# Admin Asset and QR Creation Design

## Context

LABTRACK currently has a polished admin dashboard prototype, but the web app reads static sample data and most admin buttons are placeholders. The Supabase migration already defines the core tables for profiles, asset categories, locations, assets, asset QR codes, bookings, defects, tickets, notifications, and RLS.

The next implementation slice will make the admin asset and QR workflow real before instructor booking and defect workflows are connected.

## Goals

- Require an authenticated admin or super admin profile before showing asset operations.
- Load real assets, categories, locations, and active QR codes from Supabase.
- Let admins create new asset records from the web dashboard.
- Let admins generate an active QR code for an asset.
- Let admins regenerate a QR code by invalidating the current active code and creating a replacement.
- Keep only one active QR code per asset, matching the existing database constraint.
- Let admins preview and download a QR label from the browser.

## Non-Goals

- Full sign-up, password reset, or account management.
- Super admin access-management screens.
- Booking approval, checkout, return, or conflict handling.
- Defect triage, photo review, ticket chat, or notifications.
- Category and location CRUD. This slice will use existing catalog rows.
- Server-side audit log completion unless the existing public-client permissions already support it safely.

## Recommended Approach

Use a minimal admin gate plus Supabase-backed asset and QR operations.

The app should first detect whether Supabase public configuration exists. If it does not, the dashboard should show a setup state rather than silently falling back to demo behavior. If configuration exists, it should load the current authenticated user, fetch their profile, and allow access only when `role` is `admin` or `super_admin` and `is_active` is true.

After access is verified, the dashboard should query:

- `asset_categories`
- `locations`
- `assets`
- active `asset_qr_codes`

The existing dashboard layout can remain, but sample data should be replaced by query-backed state.

## Components

### Admin Access Gate

Responsibilities:

- Create or retrieve the Supabase browser client.
- Load the current session.
- Fetch the current profile.
- Render one of four states: missing config, signed out, forbidden, or authorized.
- Pass the authorized client and profile into the admin dashboard.

The gate should be intentionally small. It is not a full authentication product; it only protects the first real admin workflow.

### Asset Register

Responsibilities:

- Display assets from Supabase with category name, location name, condition, status, property number, and active QR code state.
- Select an asset for QR preview.
- Refresh after asset creation, QR generation, and QR regeneration.
- Show empty, loading, and error states.

The asset register should use a typed local view model instead of leaking raw joined Supabase rows throughout the UI.

### New Asset Form

Responsibilities:

- Capture property number, serial number, name, category, location, condition, status, and optional notes.
- Validate required fields before insert.
- Prefer shared validation from `packages/shared/src/schemas.ts` where it fits the database write shape.
- Insert into `assets` with `created_by` set to the current admin profile id when available.
- Reset and refresh after success.

The form can be a compact panel or modal inside the current dashboard shell. It should not introduce a full routing overhaul for this slice.

### QR Actions

Responsibilities:

- Generate a QR code when an asset has no active QR code.
- Regenerate a QR code by marking the existing active code inactive with `invalidated_at` and `invalidated_by`, then inserting a replacement code.
- Build the rendered QR payload using existing shared QR helpers.
- Preview the selected asset QR in the existing QR label panel.
- Download the QR label as a browser-generated image.

QR regeneration should happen as a single user action with clear success and failure states. Because the database already enforces one active QR per asset, the UI should handle constraint failures gracefully and refresh the asset list if it detects stale state.

## Data Flow

1. Admin opens the web app.
2. The access gate checks Supabase config and session.
3. The gate fetches the admin profile.
4. Authorized admins see the dashboard.
5. The dashboard loads categories, locations, assets, and active QR codes.
6. Admin creates an asset.
7. The app inserts the asset and refreshes the register.
8. Admin generates or regenerates a QR code.
9. The app writes `asset_qr_codes`, refreshes the selected asset, and updates the QR preview.
10. Admin downloads the QR label for printing.

## Error Handling

- Missing Supabase config: show setup guidance and disable live actions.
- Signed out: show a sign-in-required state.
- Non-admin profile: show an access denied state.
- Missing profile: show a profile setup error.
- Query failure: show a non-destructive dashboard error with retry.
- Asset validation failure: show field-level messages where practical.
- QR generation conflict: refresh data and explain that the asset may already have an active QR.
- QR download failure: keep the QR visible and show a retryable browser error.

## Security

- Use only public anon/publishable Supabase keys in browser code.
- Do not use service-role credentials in the web client.
- Rely on Supabase RLS for admin-only writes.
- Fetch the current profile before enabling admin actions.
- Keep service-role or server-only operations out of this client-side slice.

## Testing

Minimum verification for this slice:

- Root typecheck still passes.
- Shared package build still passes.
- Web build or web typecheck still passes.
- Manual browser verification for missing config, authorized admin data load, asset creation, QR generation, QR regeneration, and QR preview/download.

If test tooling is added later, the first automated tests should cover QR payload creation/parsing and asset form validation.

## Implementation Choices

- QR code generation will use a prefixed random token.
- QR download will export a printable label containing the QR code, asset name, and property number.
- Asset creation will not automatically generate a QR code. QR generation remains an explicit admin action.

These choices are easy to explain, reduce accidental QR creation, and preserve flexibility.
