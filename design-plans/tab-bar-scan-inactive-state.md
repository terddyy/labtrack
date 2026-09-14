# Tab bar Scan inactive state

Written against: 2ac2938f2d158f91b84b2f38a12edbf4b8483831

## Evidence chain

- Surface: `apps/mobile/app/(protected)/(tabs)/_layout.tsx` → `FloatingGlassTabBar`
- Problem: When Borrow (or any non-Scan tab) is active, the Scan tab still shows a blue pill background, competing with the actually selected tab and making two tabs look active.
- Design evidence: `MOBILE-PAGES.md` Bottom tab bar — "Scan tab is visually special: larger blue pill behind the scan icon **when active**"; active tab elsewhere uses system blue icon + label only.
- Owner: `FloatingGlassTabBar` styles `scanShell`, `scanShellActive`, `iconShell`, `iconShellActive`
- Scope and affected surfaces: All five tabs in the protected tab layout
- Uncertainty: none

## Design decision

Reserve the filled blue Scan pill for the focused Scan tab only. When Scan is inactive, render it with the same neutral icon shell as other tabs (optionally keep slightly larger hit target via padding, but no `primaryMuted` fill).

## Reuse

- `colors.primaryMuted`, `colors.primary`, `colors.iconMuted` from `constants/theme.ts`
- `iconShell` / `iconShellActive` pattern already used for Home, Borrow, Alerts, Profile
- `shadows.accent` on `scanShellActive` only
- Exemplar: non-Scan tab focused state (`iconShellActive`)

## Changes

1. `apps/mobile/app/(protected)/(tabs)/_layout.tsx`
   - Change: Apply `styles.scanShell` only when `isScan && focused`. When `isScan && !focused`, use `styles.iconShell` (neutral, no blue fill). Keep `scanShellActive` when `isScan && focused`. Adjust `AppIcon` color logic so inactive Scan uses `colors.iconMuted` like other tabs.
   - Preserve: Scan tab slightly larger icon size (`size={22}`) and centered emphasis if desired; floating glass bar shell unchanged.
   - Verify: On Borrow tab, only Borrow shows blue active background; Scan icon is gray with no blue pill.

## Scope

- Inherit: All tab routes under `(tabs)`
- Verify: Each tab when selected shows exactly one blue active treatment; Scan when selected still gets distinct larger blue pill
- Exclude: Relabeling tabs, reordering tabs, changing `GlassBar` styling

## Validation

- Product: Switch Home → Borrow → Scan → Alerts → Profile; only the current tab reads as active.
- Interface: Borrow tab (screenshot scenario), Scan tab focused, narrow floating bar on iOS and Android.
- System: Single owner in `_layout.tsx`; no parallel tab style definitions.
- Repository: `pnpm --filter mobile exec tsc --noEmit` → no type errors

## Stop conditions

- Stop if product wants Scan always emphasized even when inactive; escalate for an explicit "persistent accent" exception before shipping neutral inactive Scan.

## Design documentation

- After acceptance and validation: none required (`MOBILE-PAGES.md` already states when-active behavior).
